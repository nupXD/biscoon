(function() {
  const BASE = window.location.origin.startsWith("file://") ? "http://localhost:4000" : window.location.origin;
  function fmtPrice(p) {
    if (p == null) return "\u2014";
    if (p < 1) return p.toFixed(4);
    return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtRate(r) {
    if (r == null) return "\u2014";
    if (r < 1) return r.toFixed(3);
    return r.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function cls(chg) {
    return chg != null && chg > 0 ? "up" : chg != null && chg < 0 ? "down" : "neutral";
  }
  function chgSpan(chg) {
    if (!chg) return "";
    const arrow = chg > 0 ? "\u25B2+" : "\u25BC";
    return ` <span class="chg ${cls(chg)}">${arrow}${Math.abs(chg).toFixed(2)}%</span>`;
  }
  function buildStockItems(stocks) {
    return stocks.map((s) => {
      const prefix = s.isIndex ? "" : "$";
      return `<span class="ticker-item"><span class="sym">${s.sym}</span><span class="val ${cls(s.change)}">${prefix}${fmtPrice(s.price)}</span>${chgSpan(s.change)}</span>`;
    }).join("");
  }
  function buildCryptoItems(coins) {
    return coins.map(
      (c) => `<span class="ticker-item"><span class="sym">${c.sym}</span><span class="val ${cls(c.change)}">$${fmtPrice(c.price)}</span>${chgSpan(c.change)}</span>`
    ).join("");
  }
  function buildForexItems(forex) {
    return forex.map(
      (f) => `<span class="ticker-item"><span class="sym">${f.sym}</span><span class="val">${fmtRate(f.rate)}</span></span>`
    ).join("");
  }
  function updateTrack(id, html) {
    const el = document.getElementById(id);
    if (!el || !html) return;
    el.innerHTML = html + html;
  }
  function showUpdatedAt(ts) {
    const el = document.getElementById("tickerUpdatedAt");
    if (!el || !ts) return;
    const d = new Date(ts);
    el.textContent = `Updated ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
  }
  async function fetchAndUpdate() {
    try {
      const res = await fetch(BASE + "/api/market", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.stocks?.length) updateTrack("tickerMarkets", buildStockItems(data.stocks));
      if (data.crypto?.length) updateTrack("tickerCrypto", buildCryptoItems(data.crypto));
      if (data.forex?.length) updateTrack("tickerNpr", buildForexItems(data.forex));
      showUpdatedAt(data.updatedAt);
    } catch {
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fetchAndUpdate);
  } else {
    fetchAndUpdate();
  }
  setInterval(fetchAndUpdate, 6e4);
})();
