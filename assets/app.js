// Configuration
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTcdQSpJa4-BPumnib8PsS3h9qIrbgZm0JJ_UN0ASWGDt3gfKkYsPH1z5P4ZK795g0aCpqSy-8F8QbJ/pub?output=csv";
const STOREFRONT_URL = "https://www.amazon.in/shop/bhooklagihaiii?ref=ac_inf_tb_vh";

const CATEGORIES = [
  { slug: "rings", name: "Rings", keywords: ["ring"] },
  { slug: "earrings", name: "Earrings", keywords: ["earring", "stud", "jhumka", "jhumki"] },
  { slug: "necklaces", name: "Necklaces", keywords: ["necklace", "chain", "pendant", "choker", "mangalsutra"] },
  { slug: "bracelets", name: "Bracelets", keywords: ["bracelet", "bangle", "kada", "kara"] },
  { slug: "anklets", name: "Anklets", keywords: ["anklet", "payal"] },
  { slug: "sets", name: "Jewellery Sets", keywords: ["set", "combo"] },
  { slug: "everyday", name: "Everyday Edit", keywords: [] },
];

// ---- CSV parsing (minimal, handles quoted fields) ----
function parseCSV(text) {
  const rows = [];
  let cur = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (c === "\r") {}
      else field += c;
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  return rows.filter(r => r.length && r.some(v => v.trim().length));
}

// ---- ASIN & slug helpers ----
function extractASIN(url) {
  if (!url) return null;
  const m = url.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i);
  return m ? m[1].toUpperCase() : null;
}
function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function titleFromUrl(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex(p => /^(dp|gp)$/.test(p));
    let titlePart = idx > 0 ? parts[idx - 1] : parts[0] || "";
    titlePart = decodeURIComponent(titlePart).replace(/-/g, " ");
    titlePart = titlePart.replace(/\b\w/g, c => c.toUpperCase());
    if (titlePart.length > 4 && !/^[A-Z0-9]{10}$/.test(titlePart)) return titlePart.slice(0, 90);
  } catch (e) {}
  return "Curated Jewellery Find";
}
function detectCategory(title) {
  const t = (title || "").toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.keywords.some(k => t.includes(k))) return cat;
  }
  return CATEGORIES[CATEGORIES.length - 1];
}
function placeholderImage(seed) {
  const palette = ["f6e6c0", "e6d3a3", "f1ddb2", "ecd9a9", "e8cf94"];
  const c = palette[Math.abs(hashCode(seed)) % palette.length];
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'><rect width='400' height='400' fill='%23${c}'/><text x='50%' y='52%' font-family='Georgia,serif' font-size='38' fill='%230a3527' text-anchor='middle' font-style='italic'>The Jewellery Edit</text></svg>`
  )}`;
}
function hashCode(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i) | 0; return h; }

// ---- Data layer ----
let _cache = null;
async function fetchCSV(url) {
  // Try direct first (works on real hosts)
  try {
    const r = await fetch(url);
    if (r.ok) return await r.text();
    throw new Error("status " + r.status);
  } catch (e) {
    // Fallback for file:// / null-origin / blocked CORS — use a public proxy
    const proxied = "https://corsproxy.io/?" + encodeURIComponent(url);
    const r2 = await fetch(proxied);
    return await r2.text();
  }
}
async function loadProducts() {
  if (_cache) return _cache;
  const text = await fetchCSV(SHEET_CSV_URL);
  const rows = parseCSV(text);
  if (!rows.length) return (_cache = []);
  const header = rows[0].map(h => h.trim().toLowerCase());
  const linkIdx = header.findIndex(h => h.includes("link") || h.includes("url"));
  const titleIdx = header.findIndex(h => h === "title" || h === "name");
  const catIdx = header.findIndex(h => h === "category");
  const descIdx = header.findIndex(h => h === "description" || h === "desc");
  const imgIdx = header.findIndex(h => h === "image" || h === "img" || h === "image url");
  const products = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const url = (r[linkIdx >= 0 ? linkIdx : 0] || "").trim();
    if (!url || !/^https?:/i.test(url)) continue;
    const asin = extractASIN(url) || "P" + (i);
    const rawTitle = (titleIdx >= 0 ? r[titleIdx] : "") || titleFromUrl(url);
    const title = rawTitle.trim();
    const category = catIdx >= 0 && r[catIdx] ? r[catIdx].trim() : detectCategory(title).name;
    const catSlug = slugify(category);
    const description = (descIdx >= 0 ? r[descIdx] : "") || `A hand-picked ${category.toLowerCase()} from our curated edit — discovered for its craft, finish and everyday wearability.`;
    const image = (imgIdx >= 0 ? r[imgIdx] : "") || placeholderImage(asin);
    products.push({
      asin, title, category, catSlug,
      description: description.trim(),
      image: image.trim(),
      url, slug: slugify(title).slice(0, 60) + "-" + asin.toLowerCase(),
    });
  }
  _cache = products;
  return products;
}

function qs(name) { return new URLSearchParams(location.search).get(name); }

function cardHTML(p) {
  const isImg = /^https?:|^data:/.test(p.image);
  return `<a class="card" href="post.html?p=${encodeURIComponent(p.slug)}">
    <div class="img">${isImg ? `<img src="${p.image}" alt="${escapeHtml(p.title)}" loading="lazy">` : `<span>${escapeHtml(p.category)}</span>`}</div>
    <div class="body">
      <span class="cat">${escapeHtml(p.category)}</span>
      <h3>${escapeHtml(p.title)}</h3>
      <p class="desc">${escapeHtml(p.description.slice(0, 110))}${p.description.length > 110 ? "…" : ""}</p>
      <div class="row"><span class="more">Read & Shop →</span></div>
    </div>
  </a>`;
}
function escapeHtml(s) { return (s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

// ---- Page renderers ----
async function renderHome() {
  const el = document.getElementById("featured");
  if (!el) return;
  try {
    const products = await loadProducts();
    if (!products.length) { el.innerHTML = `<div class="empty">No pieces yet — check back soon.</div>`; return; }
    const featured = products.slice(0, 8);
    el.innerHTML = featured.map(cardHTML).join("");
  } catch (e) { el.innerHTML = `<div class="empty">Unable to load the edit right now.</div>`; }
}

async function renderShop() {
  const el = document.getElementById("shop-grid");
  const chipsEl = document.getElementById("chips");
  if (!el) return;
  try {
    const products = await loadProducts();
    const cats = Array.from(new Set(products.map(p => p.category)));
    const active = qs("c");
    if (chipsEl) {
      chipsEl.innerHTML = [`<a class="chip ${!active ? "active" : ""}" href="shop.html">All</a>`]
        .concat(cats.map(c => `<a class="chip ${active === slugify(c) ? "active" : ""}" href="shop.html?c=${slugify(c)}">${escapeHtml(c)}</a>`)).join("");
    }
    const list = active ? products.filter(p => slugify(p.category) === active) : products;
    el.innerHTML = list.length ? list.map(cardHTML).join("") : `<div class="empty">Nothing here yet.</div>`;
  } catch (e) { el.innerHTML = `<div class="empty">Unable to load.</div>`; }
}

async function renderPost() {
  const el = document.getElementById("post");
  if (!el) return;
  const slug = qs("p");
  try {
    const products = await loadProducts();
    const p = products.find(x => x.slug === slug) || products[0];
    if (!p) { el.innerHTML = `<div class="empty">Piece not found.</div>`; return; }
    document.title = `${p.title} — The Jewellery Edit`;
    setMeta("description", p.description.slice(0, 155));
    const isImg = /^https?:|^data:/.test(p.image);
    el.innerHTML = `
      <p class="meta">${escapeHtml(p.category)} · Editor's Pick</p>
      <h1>${escapeHtml(p.title)}</h1>
      <div class="hero-img">${isImg ? `<img src="${p.image}" alt="${escapeHtml(p.title)}">` : ""}</div>
      <p>${escapeHtml(p.description)}</p>
      <p>What we love: balanced proportions, a finish that catches light beautifully, and a price point that makes it easy to layer with what you already own. It pairs equally with weekday workwear and softer occasion edits.</p>
      <div class="cta-wrap">
        <a class="btn btn-primary" href="${p.url}" target="_blank" rel="sponsored nofollow noopener">View on Amazon →</a>
      </div>
      <div class="disclosure"><strong>Affiliate disclosure:</strong> We're an Amazon Associate. Links above may earn us a small commission at no extra cost to you. Prices, availability and seller details are managed by Amazon.</div>
      <p><a href="shop.html?c=${p.catSlug}">← More in ${escapeHtml(p.category)}</a></p>
    `;
  } catch (e) { el.innerHTML = `<div class="empty">Unable to load this piece.</div>`; }
}

function setMeta(name, content) {
  let m = document.querySelector(`meta[name="${name}"]`);
  if (!m) { m = document.createElement("meta"); m.setAttribute("name", name); document.head.appendChild(m); }
  m.setAttribute("content", content);
}

// Boot
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-storefront]").forEach(a => a.setAttribute("href", STOREFRONT_URL));
  const page = document.body.dataset.page;
  if (page === "home") renderHome();
  if (page === "shop") renderShop();
  if (page === "post") renderPost();
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
});
