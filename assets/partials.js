// Shared header & footer rendering
(function () {
  const HEADER = `<header class="site-header"><div class="container nav">
    <a class="brand" href="index.html">
      <span class="mark">The Jewellery Edit</span>
      <span class="tag">Hand-picked · Amazon Curated</span>
    </a>
    <nav class="nav-links">
      <a href="index.html" data-nav="home">Home</a>
      <a href="shop.html" data-nav="shop">Shop</a>
      <a href="shop.html?c=rings" data-nav="rings">Rings</a>
      <a href="shop.html?c=earrings" data-nav="earrings">Earrings</a>
      <a href="shop.html?c=necklaces" data-nav="necklaces">Necklaces</a>
      <a href="about.html" data-nav="about">About</a>
    </nav>
    <a class="btn btn-gold" data-storefront target="_blank" rel="sponsored nofollow noopener">Storefront ↗</a>
  </div></header>`;

  const FOOTER = `<footer class="site-footer"><div class="container">
    <div class="foot-grid">
      <div>
        <h4>The Jewellery Edit</h4>
        <p>An independent edit of jewellery finds we love — sourced via Amazon, hand-picked for craft and everyday wearability.</p>
      </div>
      <div>
        <h4>Browse</h4>
        <p><a href="shop.html">Shop all</a><br>
        <a href="shop.html?c=rings">Rings</a><br>
        <a href="shop.html?c=earrings">Earrings</a><br>
        <a href="shop.html?c=necklaces">Necklaces</a></p>
      </div>
      <div>
        <h4>About</h4>
        <p><a href="about.html">Our edit</a><br>
        <a href="disclosure.html">Affiliate disclosure</a><br>
        <a data-storefront target="_blank" rel="sponsored nofollow noopener">Amazon storefront</a></p>
      </div>
      <div>
        <h4>Disclosure</h4>
        <p style="font-size:.85rem">As an Amazon Associate we earn from qualifying purchases. We are not affiliated with any brand featured.</p>
      </div>
    </div>
    <div class="foot-bottom">© <span id="year"></span> The Jewellery Edit · Independent affiliate publication</div>
  </div></footer>`;

  document.addEventListener("DOMContentLoaded", () => {
    const h = document.getElementById("site-header"); if (h) h.outerHTML = HEADER;
    const f = document.getElementById("site-footer"); if (f) f.outerHTML = FOOTER;
    const active = document.body.dataset.nav;
    if (active) document.querySelectorAll(`[data-nav="${active}"]`).forEach(a => a.classList.add("active"));
  });
})();
