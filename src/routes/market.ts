import { Router, Request, Response } from 'express';
import https from 'https';

const router = Router();

let _cache: any = null;
let _cacheTime = 0;
const CACHE_MS = 60_000;

function get(url: string, extraHeaders: Record<string, string> = {}, maxRedirects = 3): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.get({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        ...extraHeaders,
      },
    }, res => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && maxRedirects > 0) {
        return resolve(get(res.headers.location, extraHeaders, maxRedirects - 1));
      }
      let body = '';
      res.on('data', (d: Buffer) => body += d);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { reject(new Error('JSON parse failed')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function fetchCrypto(): Promise<any[]> {
  const ids = 'bitcoin,ethereum,ripple,solana,binancecoin,dogecoin,cardano,avalanche-2,chainlink,polkadot,tether';
  const d = await get(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`
  );
  const map: [string, string][] = [
    ['bitcoin', 'BTC'], ['ethereum', 'ETH'], ['ripple', 'XRP'], ['solana', 'SOL'],
    ['binancecoin', 'BNB'], ['dogecoin', 'DOGE'], ['cardano', 'ADA'], ['avalanche-2', 'AVAX'],
    ['chainlink', 'LINK'], ['polkadot', 'DOT'], ['tether', 'USDT'],
  ];
  return map.map(([id, sym]) => {
    const c = d[id];
    if (!c) return null;
    return { sym, price: c.usd, change: +(c.usd_24h_change || 0).toFixed(2) };
  }).filter(Boolean);
}

async function fetchStocks(): Promise<any[]> {
  const nameMap: Record<string, string> = { '^NDX': 'NASDAQ', '^SPX': 'S&P 500', '^DJI': 'Dow Jones' };
  const stooqSyms = ['^ndx', '^spx', '^dji', 'nvda.us', 'amd.us', 'aapl.us', 'mu.us', 'csco.us', 'akam.us'];
  const d = await get(`https://stooq.com/q/l/?s=${stooqSyms.join('+')}&f=sd2t2ohlcvp&e=json`, {
    'User-Agent': 'Mozilla/5.0',
    'Accept': '*/*',
  });
  return (d.symbols || [])
    .filter((s: any) => s.close != null)
    .map((s: any) => {
      const upper = s.symbol.toUpperCase().replace('.US', '');
      const sym = nameMap[upper] || upper;
      const change = s.previous ? +((s.close - s.previous) / s.previous * 100).toFixed(2) : 0;
      return { sym, price: s.close, change, isIndex: s.symbol.startsWith('^') };
    });
}

async function fetchForex(): Promise<any[]> {
  const d = await get('https://open.er-api.com/v6/latest/USD');
  if (!d.rates?.NPR) throw new Error('no NPR rate');
  const nprPerUsd = d.rates.NPR;
  const syms = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'CHF', 'CNY', 'JPY', 'SAR', 'QAR', 'AED', 'SGD', 'HKD', 'KRW', 'MYR'];
  return syms.map(sym => {
    const r = d.rates[sym];
    if (!r) return null;
    return { sym, rate: +(nprPerUsd / r).toFixed(2) };
  }).filter(Boolean);
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  if (_cache && Date.now() - _cacheTime < CACHE_MS) { res.json(_cache); return; }

  const [crypto, stocks, forex] = await Promise.allSettled([
    fetchCrypto(), fetchStocks(), fetchForex(),
  ]);

  _cache = {
    crypto: crypto.status === 'fulfilled' ? crypto.value : null,
    stocks: stocks.status === 'fulfilled' ? stocks.value : null,
    forex:  forex.status  === 'fulfilled' ? forex.value  : null,
    updatedAt: Date.now(),
  };
  _cacheTime = Date.now();
  res.json(_cache);
});

export default router;
