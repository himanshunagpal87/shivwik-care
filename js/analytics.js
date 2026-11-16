/* Measurement for shivwikholisticcare.com.
   - Nothing loads until an ID is set in CONFIG.
   - Cloudflare Web Analytics sets no cookie and counts every visit.
   - Google Analytics loads only after the visitor presses Accept. With Decline: no request, no cookie.
   - Events carry the page type and page title only. Never a name, a phone number or anything typed in a form. */
(function () {
  const CONFIG = {
    ga4: "",        // Google Analytics 4 measurement ID, e.g. "G-XXXXXXXXXX"
    cloudflare: "", // Cloudflare Web Analytics token
  };
  const CHOICE = "shc-consent";
  const here = document.currentScript ? document.currentScript.src : location.href;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) { /* private mode */ } },
  };

  // Clinic staff: open any page once with ?shc-internal=1 and this browser is never counted (=0 undoes it).
  const flag = new URLSearchParams(location.search).get("shc-internal");
  if (flag !== null) store.set("shc-internal", flag === "1" ? "1" : "");
  const internal = store.get("shc-internal") === "1";

  // How this visit reached the site, kept for the tab's lifetime and sent with a booking request by booking.js.
  try {
    if (!sessionStorage.getItem("shc-source")) {
      const q = new URLSearchParams(location.search);
      const from = document.referrer ? new URL(document.referrer).hostname : "";
      const ref = from && from !== location.hostname ? from : "";
      sessionStorage.setItem("shc-source", JSON.stringify({
        source: (q.get("utm_source") || ref || "direct").slice(0, 80),
        medium: (q.get("utm_medium") || (ref ? "referral" : "none")).slice(0, 40),
        campaign: (q.get("utm_campaign") || "").slice(0, 80),
        referrer: ref.slice(0, 120),
        landing_page: location.pathname.slice(0, 200),
      }));
    }
  } catch (e) { /* storage unavailable: the booking is simply sent without a source */ }

  const canonical = document.querySelector('link[rel="canonical"]');
  const path = canonical ? new URL(canonical.href).pathname : location.pathname;
  const pageType = path === "/" ? "home"
    : path.startsWith("/articles/") || path.startsWith("/article") ? "article"
    : path.startsWith("/services/") ? "service"
    : path.startsWith("/conditions/") ? "condition"
    : path.replace(/^\/|\.html$|\/$/g, "") || "page";

  window.shcTrack = function (name, params) {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", name, Object.assign({ page_type: pageType, page_name: document.title.split(" | ")[0] }, params || {}));
  };

  function loadGoogle() {
    if (!CONFIG.ga4 || internal || window.gtag) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    window.gtag("js", new Date());
    window.gtag("config", CONFIG.ga4, { allow_google_signals: false, allow_ad_personalization_signals: false });
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(CONFIG.ga4);
    document.head.appendChild(s);
  }

  function askChoice() {
    if (document.querySelector(".consent-banner")) return;
    const el = document.createElement("div");
    el.className = "consent-banner";
    el.setAttribute("role", "region");
    el.setAttribute("aria-label", "Analytics choice");
    el.innerHTML = '<p>May we count your visit with Google Analytics? It shows us which pages help people. We never send your name, phone number or anything you type. <a href="' + new URL("../privacy.html#cookies", here).href + '">Details</a></p>' +
      '<div><button type="button" class="btn btn-primary" data-choice="granted">Accept</button><button type="button" class="btn btn-outline-dark" data-choice="denied">Decline</button></div>';
    el.addEventListener("click", (e) => {
      const choice = e.target.getAttribute && e.target.getAttribute("data-choice");
      if (!choice) return;
      store.set(CHOICE, choice);
      el.remove();
      if (choice === "granted") loadGoogle();
    });
    document.body.appendChild(el);
  }

  if (CONFIG.cloudflare && !internal) {
    const s = document.createElement("script");
    s.defer = true;
    s.src = "https://static.cloudflareinsights.com/beacon.min.js";
    s.setAttribute("data-cf-beacon", JSON.stringify({ token: CONFIG.cloudflare }));
    document.head.appendChild(s);
  }
  if (CONFIG.ga4 && !internal) {
    const choice = store.get(CHOICE);
    if (choice === "granted") loadGoogle();
    else if (choice !== "denied") askChoice();
  }
  const reset = document.getElementById("consentReset");
  if (reset) {
    if (!CONFIG.ga4) reset.hidden = true;
    reset.addEventListener("click", () => { store.set(CHOICE, ""); askChoice(); });
  }

  // Events. booking.js reports otp_requested, booking_submitted and contact_form_submitted itself.
  document.addEventListener("click", (e) => {
    const a = e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    const href = a.getAttribute("href");
    if (href.startsWith("tel:")) window.shcTrack("click_call");
    else if (href.includes("wa.me/")) window.shcTrack("click_whatsapp");
    else if (href.includes("maps.app.goo.gl") || href.includes("google.com/maps")) window.shcTrack("click_directions");
  });
  const booking = document.getElementById("bookingForm");
  if (booking) booking.addEventListener("focusin", () => window.shcTrack("booking_started"), { once: true });
  document.addEventListener("toggle", (e) => {
    if (e.target.matches && e.target.matches("details.faq-item") && e.target.open) {
      window.shcTrack("faq_opened", { question: e.target.querySelector("summary").textContent.trim().slice(0, 100) });
    }
  }, true);
  const article = document.querySelector(".article-body");
  if (article) {
    let sent = false;
    addEventListener("scroll", () => {
      if (!sent && scrollY + innerHeight >= article.offsetTop + article.offsetHeight * 0.75) { sent = true; window.shcTrack("article_read"); }
    }, { passive: true });
  }
})();
