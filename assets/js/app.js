(function () {
  "use strict";
  var C = window.MDK;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  };
  var money = function (n) {
    return C.currency + "\u00A0" + Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  var page = document.body.getAttribute("data-page");

  /* ---------- Quote cart (kept in the browser) ---------- */
  var KEY = "mdk-quote-cart-v1", mem = [];
  var Cart = {
    items: function () {
      try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return mem; }
    },
    save: function (items) {
      mem = items;
      try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
      updateCount();
    },
    add: function (p) {
      var items = Cart.items(), f = items.filter(function (i) { return i.id === p.id; })[0];
      if (f) f.qty += 1; else items.push({ id: p.id, name: p.name, category: p.category, price: p.price, qty: 1 });
      Cart.save(items);
    },
    setQty: function (id, qty) {
      var items = Cart.items().map(function (i) { if (i.id === id) i.qty = qty; return i; })
        .filter(function (i) { return i.qty > 0; });
      Cart.save(items);
    },
    clear: function () { Cart.save([]); },
    count: function () { return Cart.items().reduce(function (n, i) { return n + i.qty; }, 0); },
    total: function () { return Cart.items().reduce(function (n, i) { return n + i.qty * i.price; }, 0); }
  };
  function updateCount() {
    var n = Cart.count();
    $$("[data-cart-count]").forEach(function (el) { el.textContent = n; el.hidden = n === 0; });
  }

  /* ---------- Toast ---------- */
  var toastTimer;
  function toast(msg) {
    var t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }

  /* ---------- Product data (Google Sheet or sample) ---------- */
  var CATS = ["Tech Gadgets", "Grocery Hampers", "Solar Products"];
  var CAT_CLASS = { "Tech Gadgets": "tech", "Grocery Hampers": "hamper", "Solar Products": "solar" };
  var ICONS = {
    "Tech Gadgets": '<rect x="34" y="16" width="32" height="62" rx="7"/><circle cx="50" cy="68" r="2.5" fill="currentColor"/><path d="M72 26a16 16 0 0 1 10 10M72 16a26 26 0 0 1 20 20"/>',
    "Grocery Hampers": '<path d="M20 46h60l-7 36H27z"/><path d="M33 46a17 17 0 0 1 34 0M38 58v16M50 58v16M62 58v16"/>',
    "Solar Products": '<path d="M24 46h52l9 32H15z"/><path d="M41 46l-4 32M59 46l4 32M20 62h60"/><circle cx="50" cy="26" r="7"/><path d="M50 10v5M34 26h5M61 26h5M39 15l3 3M61 15l-3 3"/>'
  };
  var COLORS = {
    "Tech Gadgets": ["#D6EDF1", "#8CCAD5", "#1F7A8C"],
    "Grocery Hampers": ["#DCEFD9", "#A5D49E", "#2F7D32"],
    "Solar Products": ["#FBEBC2", "#F4CC62", "#8A5A00"]
  };
  function placeholder(cat) {
    var c = COLORS[cat] || ["#F3DDEE", "#E0A9D5", "#7E2F74"];
    var icon = ICONS[cat] || ICONS["Tech Gadgets"];
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c[0] + '"/><stop offset="1" stop-color="' + c[1] + '"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><g transform="translate(110 55) scale(1.8)" fill="none" stroke="' + c[2] + '" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" color="' + c[2] + '">' + icon + '</g></svg>';
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
  function parseCSV(text) {
    var rows = [], row = [], f = "", q = false, i, c;
    for (i = 0; i < text.length; i++) {
      c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(f); f = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
      else f += c;
    }
    if (f !== "" || row.length) { row.push(f); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return x.trim() !== ""; }); });
  }
  function driveImage(u) {
    var m = /drive\.google\.com\/file\/d\/([^/]+)/.exec(u) || /drive\.google\.com\/open\?id=([^&]+)/.exec(u);
    return m ? "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w800" : u;
  }
  function yes(v) { return /^(y|yes|true|1|x|featured)$/i.test(String(v || "").trim()); }
  function normaliseRows(rows) {
    var head = rows[0].map(function (h) { return h.trim().toLowerCase().replace(/\s+/g, "_"); });
    return rows.slice(1).map(function (r, n) {
      var o = {};
      head.forEach(function (h, i) { o[h] = (r[i] || "").trim(); });
      var name = o.name || o.product || "";
      if (!name) return null;
      var cat = CATS.filter(function (c) { return c.toLowerCase() === (o.category || "").toLowerCase(); })[0] || o.category || "Other";
      var price = parseFloat(String(o.price || "").replace(/[^0-9.,-]/g, "").replace(/,(?=\d{3}\b)/g, "").replace(",", "."));
      var stock = String(o.stock || o.in_stock || "").toLowerCase();
      return {
        id: o.id || ("P" + (n + 1)),
        category: cat,
        subcategory: o.subcategory || o.sub_category || "",
        name: name,
        price: isNaN(price) ? 0 : price,
        description: o.description || "",
        image: o.image ? driveImage(o.image) : (o.image_url ? driveImage(o.image_url) : ""),
        featured: yes(o.featured),
        out: /^(no|n|0|out|out of stock|sold out|false)$/.test(stock)
      };
    }).filter(Boolean);
  }
  var productsPromise;
  function loadProducts() {
    if (productsPromise) return productsPromise;
    var sample = function (err) {
      return { products: normaliseRows(toRows(window.MDK_SAMPLE_PRODUCTS || [])), source: "sample", error: err };
    };
    if (!C.sheetCsvUrl) { productsPromise = Promise.resolve(sample()); return productsPromise; }
    productsPromise = fetch(C.sheetCsvUrl, { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
      .then(function (t) {
        var list = normaliseRows(parseCSV(t));
        if (!list.length) throw new Error("The sheet has no products");
        return { products: list, source: "sheet" };
      })
      .catch(function (e) { return sample(e); });
    return productsPromise;
  }
  function toRows(arr) {
    var keys = ["id", "category", "subcategory", "name", "price", "description", "image", "featured"];
    var rows = [keys];
    arr.forEach(function (p) { rows.push(keys.map(function (k) { return k === "featured" ? (p[k] ? "yes" : "no") : (p[k] == null ? "" : String(p[k])); })); });
    return rows;
  }
  var byId = {};
  function remember(list) { list.forEach(function (p) { byId[p.id] = p; }); }

  function waLink(text) { return "https://wa.me/" + C.business.whatsapp + "?text=" + encodeURIComponent(text); }
  function productCard(p) {
    var ph = placeholder(p.category);
    var sub = p.subcategory || p.category;
    var foot;
    if (p.out) foot = '<span class="price">' + (p.price ? money(p.price) : "") + '</span><button class="btn btn-sm" disabled>Out of stock</button>';
    else if (!p.price) foot = '<span class="price price-ask">Price on request</span><a class="btn btn-sm btn-ghost" target="_blank" rel="noopener" href="' + esc(waLink("Hi MDK Smart Shop, what is the price of: " + p.name + "?")) + '">Ask on WhatsApp</a>';
    else foot = '<span class="price">' + money(p.price) + '</span><button class="btn btn-sm" data-add="' + esc(p.id) + '">Add to quote</button>';
    return '<article class="product ' + (CAT_CLASS[p.category] || "") + '">' +
      '<div class="product-media"><img loading="lazy" width="400" height="300" alt="" src="' + esc(p.image || ph) + '" data-ph="' + esc(ph) + '"></div>' +
      '<div class="product-body"><p class="product-sub">' + esc(sub) + '</p><h3>' + esc(p.name) + '</h3>' +
      (p.description ? '<p class="product-desc">' + esc(p.description) + '</p>' : "") +
      '<div class="product-foot">' + foot + '</div></div></article>';
  }
  document.addEventListener("error", function (e) {
    var t = e.target;
    if (t && t.tagName === "IMG" && t.getAttribute("data-ph") && t.src !== t.getAttribute("data-ph")) t.src = t.getAttribute("data-ph");
  }, true);
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-add]");
    if (!b) return;
    var p = byId[b.getAttribute("data-add")];
    if (!p) return;
    Cart.add(p);
    toast(p.name + " added to your quote");
  });

  /* ---------- Shared chrome ---------- */
  function initChrome() {
    updateCount();
    var tg = $(".nav-toggle"), nav = $("#nav");
    if (tg && nav) tg.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      tg.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $$("#nav a[data-nav]").forEach(function (a) { if (a.getAttribute("data-nav") === page) a.setAttribute("aria-current", "page"); });
    var y = $("[data-year]"); if (y) y.textContent = new Date().getFullYear();
    $$("[data-wa]").forEach(function (a) { a.href = waLink(a.getAttribute("data-wa") || "Hi MDK Smart Shop"); });
    var b = C.banking, bad = Object.keys(b).some(function (k) { return /^\[/.test(b[k]); });
    if (bad && window.console) console.warn("MDK Smart Shop: banking details in assets/js/config.js still contain placeholders.");
  }

  /* ---------- Home ---------- */
  function initHome() {
    var p = C.promo;
    if (p && $("#promo")) {
      $("#promo-title").textContent = p.title;
      $("#promo-text").textContent = p.text;
      var a = $("#promo-cta"); a.textContent = p.cta; a.href = p.href;
    }
    loadProducts().then(function (res) {
      remember(res.products);
      var list = res.products.filter(function (x) { return x.featured; });
      if (!list.length) list = res.products;
      $("#featured-grid").innerHTML = list.slice(0, 8).map(productCard).join("");
    });
  }

  /* ---------- Catalogue ---------- */
  function initCatalogue() {
    var state = { cat: "", sub: "", q: "", sort: "featured" };
    var qs = new URLSearchParams(location.search);
    if (qs.get("cat")) state.cat = qs.get("cat");
    var grid = $("#grid"), count = $("#result-count"), subs = $("#subs"), all = [];

    function render() {
      var list = all.filter(function (p) {
        return (!state.cat || p.category === state.cat) && (!state.sub || p.subcategory === state.sub) &&
          (!state.q || (p.name + " " + p.description + " " + p.subcategory).toLowerCase().indexOf(state.q) > -1);
      });
      if (state.sort === "name") list.sort(function (a, b) { return a.name.localeCompare(b.name); });
      if (state.sort === "low") list.sort(function (a, b) { return a.price - b.price; });
      if (state.sort === "high") list.sort(function (a, b) { return b.price - a.price; });
      if (state.sort === "featured") list.sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0); });
      count.textContent = list.length + (list.length === 1 ? " product" : " products");
      grid.innerHTML = list.length ? list.map(productCard).join("") :
        '<div class="empty"><h3>Nothing matches those filters</h3><p>Clear the filters to see every product, or tell us what you need and we will source it.</p><p><button class="btn" data-clear>Clear filters</button> <a class="btn btn-ghost" href="contact.html#special">Request a special order</a></p></div>';
      $$("[data-cat]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-cat") === state.cat)); });
      var sset = [];
      all.forEach(function (p) { if ((!state.cat || p.category === state.cat) && p.subcategory && sset.indexOf(p.subcategory) < 0) sset.push(p.subcategory); });
      subs.innerHTML = state.cat && sset.length ? sset.map(function (s) {
        return '<button class="chip" data-sub="' + esc(s) + '" aria-pressed="' + (s === state.sub) + '">' + esc(s) + '</button>';
      }).join("") : "";
    }
    document.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target : null; if (!t) return;
      var c = t.closest("[data-cat]"), s = t.closest("[data-sub]");
      if (c) { var v = c.getAttribute("data-cat"); state.cat = state.cat === v ? "" : v; state.sub = ""; render(); }
      else if (s) { var w = s.getAttribute("data-sub"); state.sub = state.sub === w ? "" : w; render(); }
      else if (t.closest("[data-clear]")) { state = { cat: "", sub: "", q: "", sort: "featured" }; $("#q").value = ""; $("#sort").value = "featured"; render(); }
    });
    $("#q").addEventListener("input", function (e) { state.q = e.target.value.trim().toLowerCase(); render(); });
    $("#sort").addEventListener("change", function (e) { state.sort = e.target.value; render(); });

    loadProducts().then(function (res) {
      all = res.products; remember(all);
      if (res.source === "sample") $("#sample-note").hidden = false;
      if (res.error && C.sheetCsvUrl) { var n = $("#load-note"); n.hidden = false; }
      render();
    });
  }

  /* ---------- Sending forms ---------- */
  function sendToBackend(type, data) {
    if (!C.formEndpoint) return Promise.resolve(false);
    var body = JSON.stringify(Object.assign({ type: type, site: C.business.name }, data));
    return fetch(C.formEndpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: body })
      .then(function () { return true; }, function () { return false; });
  }
  function mailtoFallback(subject, lines) {
    location.href = "mailto:" + C.business.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n"));
  }

  /* ---------- Contact ---------- */
  function initContact() {
    var tabs = $$("[data-tab]"), panels = $$("[data-panel]");
    function show(name) {
      tabs.forEach(function (t) { var on = t.getAttribute("data-tab") === name; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; });
      panels.forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== name; });
    }
    tabs.forEach(function (t) { t.addEventListener("click", function () { show(t.getAttribute("data-tab")); }); });
    show(location.hash === "#special" ? "special" : "enquiry");

    $$("form[data-form]").forEach(function (f) {
      f.addEventListener("submit", function (e) {
        e.preventDefault();
        if (f.elements.website && f.elements.website.value) return;  // honeypot
        var data = {}, type = f.getAttribute("data-form");
        $$("input,select,textarea", f).forEach(function (el) { if (el.name && el.name !== "website") data[el.name] = el.value.trim(); });
        var btn = $("button[type=submit]", f), msg = $(".form-msg", f);
        btn.disabled = true; btn.textContent = "Sending…";
        sendToBackend(type, data).then(function (ok) {
          btn.disabled = false; btn.textContent = btn.getAttribute("data-label");
          msg.hidden = false;
          if (ok) {
            msg.className = "form-msg ok";
            msg.textContent = "Thanks, " + data.name + ". We have emailed a confirmation to " + data.email + " and will reply soon.";
            f.reset();
          } else {
            msg.className = "form-msg info";
            msg.textContent = "Your email app should open with your message ready to send. If it does not, WhatsApp us on " + C.business.phone + ".";
            var label = type === "special_order" ? "Special order" : "Enquiry";
            var lines = Object.keys(data).map(function (k) { return k.replace(/_/g, " ") + ": " + data[k]; });
            mailtoFallback(label + " from " + data.name, lines);
          }
        });
      });
    });
  }

  /* ---------- Cart + quotation ---------- */
  function fmtDate(d) { return d.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }); }
  function initCart() {
    var list = $("#cart-list"), empty = $("#cart-empty"), builder = $("#builder"), sheet = $("#quote-sheet"), totalEl = $("#cart-total");
    var lastQuote = null;

    function render() {
      var items = Cart.items();
      empty.hidden = items.length > 0;
      builder.hidden = items.length === 0;
      list.innerHTML = items.map(function (i) {
        return '<li class="line"><div class="line-name"><strong>' + esc(i.name) + '</strong><span>' + money(i.price) + ' each</span></div>' +
          '<div class="qty" role="group" aria-label="Quantity for ' + esc(i.name) + '"><button type="button" data-dec="' + esc(i.id) + '" aria-label="Decrease">−</button><output>' + i.qty + '</output><button type="button" data-inc="' + esc(i.id) + '" aria-label="Increase">+</button></div>' +
          '<div class="line-total">' + money(i.qty * i.price) + '</div>' +
          '<button type="button" class="link-btn" data-rm="' + esc(i.id) + '">Remove</button></li>';
      }).join("");
      totalEl.textContent = money(Cart.total());
    }
    list.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var items = Cart.items(), id;
      if ((id = b.getAttribute("data-inc"))) Cart.setQty(id, items.filter(function (i) { return i.id === id; })[0].qty + 1);
      else if ((id = b.getAttribute("data-dec"))) Cart.setQty(id, items.filter(function (i) { return i.id === id; })[0].qty - 1);
      else if ((id = b.getAttribute("data-rm"))) Cart.setQty(id, 0);
      render();
    });

    function quoteHTML(q) {
      var b = C.banking, bn = C.business;
      var rows = q.items.map(function (i) {
        return "<tr><td>" + esc(i.name) + "</td><td class='num'>" + i.qty + "</td><td class='num'>" + money(i.price) + "</td><td class='num'>" + money(i.line) + "</td></tr>";
      }).join("");
      var pay = q.payment === "eft"
        ? "<h4>Pay by EFT</h4><dl class='bank'><dt>Bank</dt><dd>" + esc(b.bank) + "</dd><dt>Account holder</dt><dd>" + esc(b.accountName) + "</dd><dt>Account number</dt><dd>" + esc(b.accountNumber) + "</dd><dt>Account type</dt><dd>" + esc(b.accountType) + "</dd><dt>Branch code</dt><dd>" + esc(b.branchCode) + "</dd><dt>Reference</dt><dd><strong>" + esc(q.no) + "</strong></dd></dl><p>Send proof of payment to " + esc(bn.email) + " or on WhatsApp to " + esc(bn.phone) + ". We prepare your order once payment reflects.</p>"
        : "<h4>Pay cash at our location</h4><p>" + bn.addressLines.map(esc).join("<br>") + "</p><p>Bring this quotation (" + esc(q.no) + ") when you collect and pay.</p>";
      return '<div class="q-head"><img src="assets/img/logo.png" alt="MDK Smart Shop" width="220"><div class="q-meta"><h2 tabindex="-1" id="quote-title">Quotation</h2><p><strong>' + esc(q.no) + '</strong></p><p>Date: ' + fmtDate(new Date(q.date)) + '</p><p>Valid until: ' + fmtDate(new Date(q.valid)) + '</p></div></div>' +
        '<div class="q-parties"><div><h4>From</h4><p><strong>' + esc(bn.name) + '</strong><br>' + bn.addressLines.map(esc).join("<br>") + '<br>' + esc(bn.phone) + '<br>' + esc(bn.email) + '</p></div>' +
        '<div><h4>Prepared for</h4><p><strong>' + esc(q.customer.name) + '</strong><br>' + esc(q.customer.phone) + '<br>' + esc(q.customer.email) + '<br>' + (q.delivery === "delivery" ? "Delivery requested" + (q.customer.address ? ":<br>" + esc(q.customer.address) : "") : "Collect from our location") + '</p></div></div>' +
        '<div class="table-wrap"><table class="q-table"><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead><tbody>' + rows + '</tbody><tfoot><tr><td colspan="3">Total</td><td class="num">' + money(q.total) + '</td></tr></tfoot></table></div>' +
        (q.notes ? '<p class="q-notes"><strong>Your notes:</strong> ' + esc(q.notes) + '</p>' : "") +
        '<div class="q-pay">' + pay + '</div>' +
        '<p class="q-terms">This quotation is valid for ' + C.quoteValidDays + ' days. Stock is confirmed when payment is made. Delivery, if requested, is confirmed and priced separately.</p>';
    }

    $("#quote-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target, items = Cart.items();
      if (!items.length) return;
      var d = new Date(), valid = new Date(d.getTime() + C.quoteValidDays * 864e5);
      var no = "MDK-" + d.getFullYear() + ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + d.getDate()).slice(-2) + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
      var q = {
        no: no, date: d.toISOString(), valid: valid.toISOString(),
        customer: { name: f.cname.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), address: f.address.value.trim() },
        delivery: f.delivery.value, payment: f.payment.value, notes: f.notes.value.trim(),
        items: items.map(function (i) { return { id: i.id, name: i.name, qty: i.qty, price: i.price, line: i.qty * i.price }; }),
        total: Cart.total()
      };
      lastQuote = q;
      sheet.innerHTML = quoteHTML(q);
      $("#quote-wrap").hidden = false;
      var s = $("#send-status"); s.textContent = "Sending a copy to " + q.customer.email + "…"; s.className = "form-msg info"; s.hidden = false;
      sendToBackend("quote", { name: q.customer.name, email: q.customer.email, phone: q.customer.phone, quote: q }).then(function (ok) {
        if (ok) { s.className = "form-msg ok"; s.textContent = "Quotation " + q.no + " is ready. We have emailed a copy to " + q.customer.email + "."; }
        else { s.className = "form-msg info"; s.textContent = "Quotation " + q.no + " is ready. Print or save it as a PDF, or send it to us on WhatsApp."; }
      });
      $("#quote-wrap").scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      $("#quote-title").focus({ preventScroll: true });
    });
    $("#print-quote").addEventListener("click", function () { window.print(); });
    $("#wa-quote").addEventListener("click", function () {
      if (!lastQuote) return;
      var q = lastQuote;
      var lines = ["Hi MDK Smart Shop, here is my quotation " + q.no + ":"].concat(q.items.map(function (i) { return "- " + i.qty + " x " + i.name + " (" + money(i.line) + ")"; }));
      lines.push("Total: " + money(q.total), "Payment: " + (q.payment === "eft" ? "EFT" : "Cash at your location"), "Name: " + q.customer.name);
      window.open(waLink(lines.join("\n")), "_blank", "noopener");
    });
    $("#new-quote").addEventListener("click", function () {
      Cart.clear(); lastQuote = null; $("#quote-wrap").hidden = true; $("#quote-form").reset(); render();
      window.scrollTo(0, 0);
    });
    $("#quote-form").delivery.forEach && Array.prototype.forEach.call($("#quote-form").delivery, function (r) {
      r.addEventListener("change", function () { $("#address-field").hidden = r.value !== "delivery" || !r.checked; });
    });
    render();
  }

  initChrome();
  if (page === "home") initHome();
  if (page === "catalogue") initCatalogue();
  if (page === "contact") initContact();
  if (page === "cart") initCart();
})();
