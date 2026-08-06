import { Router, Request, Response } from 'express';
import https from 'https';

const router = Router();

type WeatherPayload = {
  city: string;
  lat: number;
  lon: number;
  icon: string;
  temp: string;
  condition: string;
  humidity: string;
  wind: string;
  high: string;
  low: string;
};

const WMO_CODES: Record<number, { label: string; emoji: string }> = {
  0: { label: 'Clear', emoji: '☀️' },
  1: { label: 'Mostly clear', emoji: '🌤' },
  2: { label: 'Partly cloudy', emoji: '⛅' },
  3: { label: 'Overcast', emoji: '☁️' },
  45: { label: 'Fog', emoji: '🌫️' },
  48: { label: 'Icy fog', emoji: '🌫️' },
  51: { label: 'Light drizzle', emoji: '🌦' },
  53: { label: 'Drizzle', emoji: '🌦' },
  55: { label: 'Heavy drizzle', emoji: '🌧' },
  61: { label: 'Light rain', emoji: '🌧' },
  63: { label: 'Rain', emoji: '🌧' },
  65: { label: 'Heavy rain', emoji: '🌧' },
  71: { label: 'Light snow', emoji: '❄️' },
  73: { label: 'Snow', emoji: '❄️' },
  75: { label: 'Heavy snow', emoji: '❄️' },
  80: { label: 'Rain showers', emoji: '🌦' },
  81: { label: 'Showers', emoji: '🌧' },
  82: { label: 'Heavy showers', emoji: '⛈' },
  95: { label: 'Thunderstorm', emoji: '⛈' },
  96: { label: 'Storm + hail', emoji: '⛈' },
  99: { label: 'Severe storm', emoji: '⛈' },
};

function windDegreesToCardinal(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function getJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'Biscoon/1.0' },
    }, res => {
      let body = '';
      res.on('data', (d: Buffer) => { body += d; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (err) { reject(err); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function fetchOpenMeteo(lat: number, lon: number, city: string): Promise<WeatherPayload> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('current', 'temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m');
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min');
  url.searchParams.set('temperature_unit', 'fahrenheit');
  url.searchParams.set('wind_speed_unit', 'mph');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '1');

  const data = await getJson(url.toString());
  const cur = data.current || {};
  const daily = data.daily || {};
  const code = Number(cur.weather_code ?? cur.weathercode ?? 0);
  const meta = WMO_CODES[code] || { label: 'Unknown', emoji: '🌡️' };
  const windSpeed = Number(cur.wind_speed_10m ?? cur.windspeed_10m ?? 0);
  const windDir = Number(cur.wind_direction_10m ?? cur.winddirection_10m ?? 0);
  const humidity = Number(cur.relative_humidity_2m ?? cur.relativehumidity_2m ?? 0);

  return {
    city,
    lat,
    lon,
    icon: meta.emoji,
    temp: `${Math.round(Number(cur.temperature_2m))}°F`,
    condition: meta.label,
    humidity: `${humidity}%`,
    wind: `${Math.round(windSpeed)} mph ${windDegreesToCardinal(windDir)}`,
    high: `${Math.round(Number(daily.temperature_2m_max?.[0] ?? cur.temperature_2m))}°`,
    low: `${Math.round(Number(daily.temperature_2m_min?.[0] ?? cur.temperature_2m))}°`,
  };
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  const city = String(req.query.city || 'Unknown').slice(0, 80);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    res.status(400).json({ error: 'lat and lon are required.' });
    return;
  }
  try {
    const weather = await fetchOpenMeteo(lat, lon, city);
    res.json({ weather });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Weather unavailable';
    res.status(502).json({ error: message });
  }
});

export default router;
