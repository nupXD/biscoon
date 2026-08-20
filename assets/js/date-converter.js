(function () {
  // Month lengths (Baisakh–Chaitra) for BS 2070–2090.
  // Epoch: BS 2070-01-01 = AD 2013-04-14.
  const MONTHS = {
    2070: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2071: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2072: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2073: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2074: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2075: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
    2077: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2078: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2079: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
    2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2082: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2083: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2084: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30],
    2085: [31, 32, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
    2086: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2087: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2088: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2089: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2090: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  };
  const MONTH_NAMES = ['Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
  const EPOCH_AD = Date.UTC(2013, 3, 14);

  function daysInYear(y) {
    return MONTHS[y].reduce((sum, n) => sum + n, 0);
  }

  function bsToUtc(y, m, d) {
    if (!MONTHS[y] || m < 1 || m > 12) throw new Error('Year out of range (2070–2090 BS).');
    const max = MONTHS[y][m - 1];
    if (d < 1 || d > max) throw new Error('That BS day is not valid for this month.');
    let days = 0;
    for (let year = 2070; year < y; year += 1) days += daysInYear(year);
    for (let month = 1; month < m; month += 1) days += MONTHS[y][month - 1];
    days += d - 1;
    return new Date(EPOCH_AD + days * 86400000);
  }

  function utcToBs(date) {
    const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    let remaining = Math.round((utc - EPOCH_AD) / 86400000);
    if (remaining < 0) throw new Error('Date is before BS 2070.');
    let year = 2070;
    while (MONTHS[year] && remaining >= daysInYear(year)) {
      remaining -= daysInYear(year);
      year += 1;
    }
    if (!MONTHS[year]) throw new Error('Date is after BS 2090.');
    let month = 1;
    while (remaining >= MONTHS[year][month - 1]) {
      remaining -= MONTHS[year][month - 1];
      month += 1;
    }
    return { y: year, m: month, d: remaining + 1 };
  }

  function fmtAd(date) {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function fmtBs(bs) {
    return `${MONTH_NAMES[bs.m - 1]} ${bs.d}, ${bs.y} BS`;
  }

  const adInput = document.getElementById('adDate');
  const bsYear = document.getElementById('bsYear');
  const bsMonth = document.getElementById('bsMonth');
  const bsDay = document.getElementById('bsDay');
  const out = document.getElementById('convertOut');
  if (!adInput || !bsYear || !bsMonth || !bsDay || !out) return;

  function show(text) {
    out.textContent = text;
  }

  function syncFromAd() {
    const value = adInput.value;
    if (!value) return;
    const [y, m, d] = value.split('-').map(Number);
    try {
      const bs = utcToBs(new Date(y, m - 1, d));
      bsYear.value = String(bs.y);
      bsMonth.value = String(bs.m);
      bsDay.value = String(bs.d);
      show(`${fmtAd(new Date(y, m - 1, d))}  →  ${fmtBs(bs)}`);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Could not convert.');
    }
  }

  function syncFromBs() {
    try {
      const date = bsToUtc(Number(bsYear.value), Number(bsMonth.value), Number(bsDay.value));
      const iso = date.toISOString().slice(0, 10);
      adInput.value = iso;
      show(`${fmtBs({ y: Number(bsYear.value), m: Number(bsMonth.value), d: Number(bsDay.value) })}  →  ${fmtAd(date)}`);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Could not convert.');
    }
  }

  document.getElementById('adToBs')?.addEventListener('click', syncFromAd);
  document.getElementById('bsToAd')?.addEventListener('click', syncFromBs);

  const today = new Date();
  adInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  syncFromAd();
})();
