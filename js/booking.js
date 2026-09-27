const SUPABASE_URL = "https://ycxuipirpyjadkavkcrf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_kOEXCSZkqQMV0MJ8kaa1Gw_v_QaPTdm";

const SERVICES = [
  { id: 1, name: "Manual Therapy" },
  { id: 2, name: "Sports Injury Rehabilitation" },
  { id: 3, name: "Pain Management" },
  { id: 4, name: "Post Injury Rehabilitation" },
  { id: 5, name: "Geriatric Care" },
  { id: 6, name: "Antenatal & Garbhsanskar" },
  { id: 13, name: "Cardiopulmonary Rehabilitation" },
  { id: 7, name: "Other" },
];

function normalizePhone(raw) {
  let digits = String(raw).replace(/\D/g, "");
  if (digits.length === 10) return "91" + digits;
  if (digits.length === 11 && digits.startsWith("0")) return "91" + digits.slice(1);
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
}

async function callRpc(fn, payload) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json) return { success: false, error: "Something went wrong. Please try again." };
  return json;
}

function initBookingForm() {
  const form = document.getElementById("bookingForm");
  if (!form) return;

  const serviceSelect = form.querySelector("#service_id");
  SERVICES.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.name;
    serviceSelect.appendChild(opt);
  });

  const dateInput = form.querySelector("#preferred_date");
  const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  dateInput.min = todayIST;
  dateInput.addEventListener("change", async () => {
    const c = closureOn(await getClosures(), dateInput.value);
    dateInput.setCustomValidity(c ? `The clinic is closed on ${fmtClosureDates(c)} (${c.note}). Please pick another day.` : "");
    if (c) dateInput.reportValidity();
  });

  const phoneInput = document.getElementById("phone");
  const sendCodeBtn = document.getElementById("sendCodeBtn");
  const otpSection = document.getElementById("otpSection");
  const otpCodeInput = document.getElementById("otpCode");
  const verifyCodeBtn = document.getElementById("verifyCodeBtn");
  const otpStatus = document.getElementById("otpStatus");
  const submitBtn = document.getElementById("submitBookingBtn");

  let verifiedPhone = null;

  function resetVerification() {
    verifiedPhone = null;
    otpSection.style.display = "none";
    otpCodeInput.value = "";
    otpStatus.textContent = "";
    phoneInput.readOnly = false;
    submitBtn.disabled = true;
    submitBtn.style.opacity = "0.5";
    submitBtn.style.cursor = "not-allowed";
    submitBtn.textContent = "Verify your number to continue";
    sendCodeBtn.disabled = false;
    sendCodeBtn.textContent = "Send Code";
  }

  phoneInput.addEventListener("input", () => {
    if (verifiedPhone && verifiedPhone !== normalizePhone(phoneInput.value)) {
      resetVerification();
    }
  });

  sendCodeBtn.addEventListener("click", async () => {
    const rawDigits = phoneInput.value.replace(/\D/g, "");
    if (rawDigits.length < 10) {
      otpStatus.textContent = "Please enter a valid 10-digit phone number.";
      otpStatus.style.color = "#a3312c";
      return;
    }
    const cleanPhone = normalizePhone(phoneInput.value);
    sendCodeBtn.disabled = true;
    sendCodeBtn.textContent = "Sending...";
    const result = await callRpc("request_phone_otp", { p_phone: cleanPhone });
    if (result.success) {
      otpSection.style.display = "flex";
      otpStatus.textContent = "Code sent! It can take up to a minute to arrive on WhatsApp.";
      otpStatus.style.color = "";
      otpCodeInput.focus();
      let seconds = 60;
      sendCodeBtn.textContent = `Resend in ${seconds}s`;
      const timer = setInterval(() => {
        seconds -= 1;
        if (seconds <= 0) {
          clearInterval(timer);
          sendCodeBtn.disabled = false;
          sendCodeBtn.textContent = "Resend Code";
        } else {
          sendCodeBtn.textContent = `Resend in ${seconds}s`;
        }
      }, 1000);
    } else {
      otpStatus.textContent = result.error || "Could not send code. Please try again.";
      otpStatus.style.color = "#a3312c";
      sendCodeBtn.disabled = false;
      sendCodeBtn.textContent = "Send Code";
    }
  });

  verifyCodeBtn.addEventListener("click", async () => {
    const cleanPhone = normalizePhone(phoneInput.value);
    const code = otpCodeInput.value.trim();
    if (code.length !== 6) {
      otpStatus.textContent = "Enter the 6-digit code.";
      otpStatus.style.color = "#a3312c";
      return;
    }
    verifyCodeBtn.disabled = true;
    verifyCodeBtn.textContent = "Checking...";
    const result = await callRpc("verify_phone_otp", { p_phone: cleanPhone, p_code: code });
    verifyCodeBtn.disabled = false;
    verifyCodeBtn.textContent = "Verify";
    if (result.success) {
      verifiedPhone = cleanPhone;
      otpStatus.textContent = "Number verified.";
      otpStatus.style.color = "#1c6b45";
      phoneInput.readOnly = true;
      submitBtn.disabled = false;
      submitBtn.style.opacity = "1";
      submitBtn.style.cursor = "pointer";
      submitBtn.textContent = "Request Appointment";
    } else {
      otpStatus.textContent = result.error || "Incorrect code.";
      otpStatus.style.color = "#a3312c";
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgEl = document.getElementById("bookingFormMsg");
    msgEl.className = "form-msg";
    msgEl.textContent = "";

    const data = Object.fromEntries(new FormData(form).entries());

    if (data.honeypot) return; // silently drop bot submissions

    const cleanPhone = normalizePhone(data.phone);
    if (!verifiedPhone || verifiedPhone !== cleanPhone) {
      msgEl.textContent = "Please verify your WhatsApp number before submitting.";
      msgEl.className = "form-msg error";
      return;
    }

    const slotDateTime = `${data.preferred_date}T${data.preferred_time}:00+05:30`;
    if (new Date(slotDateTime).getTime() <= Date.now()) {
      msgEl.textContent = "Please choose a future date and time.";
      msgEl.className = "form-msg error";
      return;
    }
    const closed = closureOn(await getClosures(), data.preferred_date);
    if (closed) {
      msgEl.textContent = `The clinic is closed on ${fmtClosureDates(closed)} (${closed.note}). Please pick another day.`;
      msgEl.className = "form-msg error";
      return;
    }

    const payload = {
      name: data.name.trim(),
      phone: cleanPhone,
      email: data.email ? data.email.trim() : null,
      service_id: Number(data.service_id),
      requested_slot_time: slotDateTime,
      notes: data.notes ? data.notes.trim() : null,
      honeypot: data.honeypot || null,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/website_booking_requests`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Request failed");

      msgEl.textContent = "Thank you! Your booking request has been received — you'll get a WhatsApp confirmation within a few minutes.";
      msgEl.className = "form-msg success";
      form.reset();
      resetVerification();
    } catch (err) {
      msgEl.textContent = "Something went wrong. Please call us at +91 74074 46000 to book directly.";
      msgEl.className = "form-msg error";
      submitBtn.disabled = false;
      submitBtn.textContent = "Request Appointment";
    }
  });
}

function initGeneralContactForm() {
  const form = document.getElementById("generalContactForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgEl = document.getElementById("generalContactMsg");
    const btn = form.querySelector("button[type=submit]");
    msgEl.className = "form-msg";
    msgEl.textContent = "";

    const data = Object.fromEntries(new FormData(form).entries());
    if (data._honey) return; // silently drop bot submissions

    btn.disabled = true;
    btn.textContent = "Sending...";

    try {
      const res = await fetch("https://formsubmit.co/ajax/info@shivwikholisticcare.com", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone || "(not provided)",
          message: data.message,
          _subject: "New general inquiry - Shivwik Holistic Care website",
        }),
      });
      if (!res.ok) throw new Error("Request failed");

      msgEl.textContent = "Thank you! We've received your message and will get back to you soon.";
      msgEl.className = "form-msg success";
      form.reset();
    } catch (err) {
      msgEl.textContent = "Something went wrong. Please email info@shivwikholisticcare.com directly.";
      msgEl.className = "form-msg error";
    } finally {
      btn.disabled = false;
      btn.textContent = "Send Message";
    }
  });
}

const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_LONG = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" };

function fmtTime(t) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function formatDays(days, long) {
  const sorted = DAY_ORDER.filter((d) => days.includes(d));
  if (sorted.length === 1) return long ? DAY_LONG[sorted[0]] : sorted[0];
  const contiguous = sorted.every((d, i) => i === 0 || DAY_ORDER.indexOf(d) === DAY_ORDER.indexOf(sorted[i - 1]) + 1);
  if (contiguous && sorted.length > 2) return `${sorted[0]}–${sorted[sorted.length - 1]}`;
  return sorted.map((d) => (long ? DAY_LONG[d] : d)).join(", ");
}

// Hours come from the same doctors row the WhatsApp bot uses for booking,
// so the site can never disagree with what the bot will actually accept.
async function initLiveHours() {
  const fullEls = document.querySelectorAll("[data-live-hours]");
  const shortEls = document.querySelectorAll("[data-live-hours-short]");
  if (!fullEls.length && !shortEls.length) return;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/doctors?id=eq.1&select=available_days,start_time,end_time,saturday_start_time,saturday_end_time`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    if (!res.ok) return;
    const [d] = await res.json();
    if (!d || !d.start_time || !Array.isArray(d.available_days)) return;

    const weekdays = d.available_days.filter((x) => x !== "Sat" && x !== "Sun");
    const hasSat = d.available_days.includes("Sat") && d.saturday_start_time;
    const closed = DAY_ORDER.filter((x) => !d.available_days.includes(x));

    const line1 = `${formatDays(weekdays)}: ${fmtTime(d.start_time)}–${fmtTime(d.end_time)} (evenings by appointment)`;
    const line2Parts = [];
    if (hasSat) line2Parts.push(`Saturday: ${fmtTime(d.saturday_start_time)}–${fmtTime(d.saturday_end_time)}`);
    if (closed.length) line2Parts.push(`${formatDays(closed, true)}: Closed`);

    fullEls.forEach((el) => {
      el.textContent = "";
      el.appendChild(document.createTextNode(line1));
      if (line2Parts.length) {
        el.appendChild(document.createElement("br"));
        el.appendChild(document.createTextNode(line2Parts.join(" · ")));
      }
    });

    let short = `Regular hours: ${formatDays(weekdays)} ${fmtTime(d.start_time)}–${fmtTime(d.end_time)}`;
    if (hasSat) short += `, Sat ${fmtTime(d.saturday_start_time)}–${fmtTime(d.saturday_end_time)}`;
    short += ". Evening slots by request.";
    shortEls.forEach((el) => { el.textContent = short; });
  } catch (err) {
    // keep the static fallback text already in the page
  }
}

function initMobileNav() {
  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("siteNav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => nav.classList.toggle("open"));
}

/* ---------------------------------------------------------------------
   Content from the staff dashboard (articles, ratings, specialists).
   Every block degrades to "nothing shown" if Supabase is unreachable.
   --------------------------------------------------------------------- */
const ARTICLE_TYPE_LABELS = { article: "Article", news: "News", workshop: "Workshop", event: "Event" };

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Same minimal format as the dashboard editor: "## Heading", "- bullet",
// **bold**, blank line = new paragraph. Everything else is escaped.
function renderArticleBody(md) {
  const inline = (s) => escapeHtml(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const out = [];
  let para = [], list = [];
  const flushPara = () => { if (para.length) { out.push("<p>" + para.map(inline).join("<br>") + "</p>"); para = []; } };
  const flushList = () => { if (list.length) { out.push("<ul>" + list.map((l) => "<li>" + inline(l) + "</li>").join("") + "</ul>"); list = []; } };
  for (const raw of String(md || "").replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    let m;
    if (!line) { flushPara(); flushList(); continue; }
    if ((m = line.match(/^#{1,3}\s+(.*)$/))) { flushPara(); flushList(); out.push("<h2>" + inline(m[1]) + "</h2>"); continue; }
    if ((m = line.match(/^[-*•]\s+(.*)$/))) { flushPara(); list.push(m[1]); continue; }
    flushList();
    para.push(line);
  }
  flushPara(); flushList();
  return out.join("");
}

function fmtMonthYear(d) {
  return new Date(d).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
}

function readMinutes(body) {
  return Math.max(2, Math.round(String(body || "").split(/\s+/).length / 200));
}

async function initArticles() {
  const grid = document.getElementById("articlesGrid");
  if (!grid) return;
  try {
    const rows = await sbGet("articles?select=slug,title,summary,type,body,publish_at,event_date&order=publish_at.desc&limit=60");
    const frag = document.createDocumentFragment();
    rows.forEach((a) => {
      const card = document.createElement("a");
      card.className = "article-card";
      card.href = `article.html?slug=${encodeURIComponent(a.slug)}`;
      card.dataset.type = a.type;
      const when = a.event_date && (a.type === "workshop" || a.type === "event")
        ? new Date(a.event_date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })
        : `${fmtMonthYear(a.publish_at)} · ${readMinutes(a.body)} min read`;
      card.innerHTML = `<span class="article-type">${escapeHtml(ARTICLE_TYPE_LABELS[a.type] || a.type)}</span>
        <h3>${escapeHtml(a.title)}</h3><p>${escapeHtml(a.summary || "")}</p>
        <span class="article-meta">${escapeHtml(when)}</span>`;
      frag.appendChild(card);
    });
    grid.insertBefore(frag, grid.firstChild);
  } catch (err) {
    // static articles already in the page still show
  }
  initArticleFilters();
}

async function initArticlePage() {
  const root = document.getElementById("articleRoot");
  if (!root) return;
  const slug = new URLSearchParams(location.search).get("slug") || "";
  const notFound = () => {
    root.innerHTML = `<p>Sorry, we couldn't find that article. It may have been moved or unpublished.</p>
      <p><a href="articles.html">&larr; See all articles</a></p>`;
    document.getElementById("articleTitle").textContent = "Article not found";
  };
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return notFound();
  try {
    const [a] = await sbGet(`articles?slug=eq.${slug}&select=slug,title,summary,type,body,publish_at,event_date,author_name&limit=1`);
    if (!a) return notFound();
    const typeLabel = ARTICLE_TYPE_LABELS[a.type] || "Article";
    document.title = `${a.title} | Shivwik Holistic Care`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc && a.summary) desc.setAttribute("content", a.summary);
    document.getElementById("articleEyebrow").textContent = typeLabel;
    document.getElementById("articleTitle").textContent = a.title;
    document.getElementById("articleSummary").textContent = a.summary || "";
    document.getElementById("articleMeta").textContent =
      `Shivwik Holistic Care team · ${fmtMonthYear(a.publish_at)} · ${readMinutes(a.body)} min read`;
    const eventLine = a.event_date && (a.type === "workshop" || a.type === "event")
      ? `<p class="article-note" style="margin-top:0"><strong>When:</strong> ${escapeHtml(new Date(a.event_date).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Kolkata" }))} &middot; Shivwik Holistic Care, 182 Ambica Vihar, Paschim Vihar</p>`
      : "";
    root.innerHTML = eventLine + renderArticleBody(a.body) + `
      <div class="hero-actions" style="margin-top: 24px;">
        <a href="contact.html" class="btn btn-primary">Book an Appointment</a>
        <a href="https://wa.me/917407446000?text=${encodeURIComponent("Hi, I read your article \"" + a.title + "\" and have a question")}" class="btn btn-outline-dark" target="_blank" rel="noopener">Ask on WhatsApp</a>
      </div>
      <p class="article-note">This article is for general information only and is not a substitute for a professional medical assessment. Please consult a qualified professional about your own condition.</p>
      <p style="margin-top: 24px;"><a href="articles.html">&larr; Back to all articles</a></p>`;
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org", "@type": a.type === "news" ? "NewsArticle" : "Article",
      headline: a.title, description: a.summary || undefined, datePublished: a.publish_at,
      author: { "@type": "Organization", name: "Shivwik Holistic Care" },
      publisher: { "@type": "Organization", name: "Shivwik Holistic Care", logo: { "@type": "ImageObject", url: "https://www.shivwikholisticcare.com/assets/logo.png" } },
      mainEntityOfPage: `https://www.shivwikholisticcare.com/article.html?slug=${a.slug}`,
      image: "https://www.shivwikholisticcare.com/assets/og-image.jpg",
    });
    document.head.appendChild(ld);
  } catch (err) {
    notFound();
  }
}

// Shown only once there are enough ratings for the average to mean something.
const MIN_RATINGS_TO_SHOW = 5;
// Testing-phase ratings were cleared on 27 Sep 2026; the section appears once
// real patients have given MIN_RATINGS_TO_SHOW ratings.
const RATINGS_SECTION_ENABLED = true;

async function initTestimonials() {
  const section = document.getElementById("testimonials");
  if (!section || !RATINGS_SECTION_ENABLED) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/public_ratings_summary`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
      body: "{}",
    });
    if (!res.ok) return;
    const s = await res.json();
    if (!s || !s.count || s.count < MIN_RATINGS_TO_SHOW) return;
    const stars = (n) => "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));
    document.getElementById("ratingAverage").textContent = Number(s.average).toFixed(1);
    document.getElementById("ratingStars").textContent = stars(s.average);
    document.getElementById("ratingCount").textContent = `from ${s.count} patient rating${s.count === 1 ? "" : "s"} on WhatsApp`;
    const grid = document.getElementById("testimonialsGrid");
    grid.innerHTML = (s.testimonials || []).slice(0, 8).map((t) => `
      <div class="testimonial-card">
        <span class="rating-stars" aria-label="${t.rating} out of 5 stars">${stars(t.rating)}</span>
        <span class="testimonial-who">${escapeHtml(t.initials)}</span>
        <span class="testimonial-when">Verified patient &middot; ${escapeHtml(t.month)}</span>
      </div>`).join("");
    section.hidden = false;
  } catch (err) {
    // section stays hidden
  }
}

async function initSpecialists() {
  const section = document.getElementById("specialists");
  if (!section) return;
  try {
    // Doctor #1 is the founder, featured separately on the page.
    const rows = await sbGet("doctors?select=id,name,qualification,department,bio,available_days,start_time,end_time,saturday_start_time,saturday_end_time" +
      "&is_active=eq.true&show_on_website=eq.true&id=neq.1&order=department,name");
    if (!rows.length) return;
    document.getElementById("specialistsGrid").innerHTML = rows.map((d) => {
      const days = Array.isArray(d.available_days) ? d.available_days : [];
      const weekdays = days.filter((x) => x !== "Sat" && x !== "Sun");
      const parts = [];
      if (weekdays.length && d.start_time) parts.push(`${formatDays(weekdays)}: ${fmtTime(d.start_time)}–${fmtTime(d.end_time)}`);
      if (days.includes("Sat") && d.saturday_start_time) parts.push(`Sat: ${fmtTime(d.saturday_start_time)}–${fmtTime(d.saturday_end_time)}`);
      return `<div class="service-card specialist-card">
        <span class="specialist-dept">${escapeHtml(d.department || "Specialist")}</span>
        <h3>${escapeHtml(d.name)}</h3>
        ${d.qualification ? `<span class="specialist-quals">${escapeHtml(d.qualification)}</span>` : ""}
        ${d.bio ? `<p>${escapeHtml(d.bio)}</p>` : ""}
        <div class="specialist-hours">${parts.length ? escapeHtml(parts.join(" · ")) : "By appointment"}</div>
      </div>`;
    }).join("");
    section.hidden = false;
  } catch (err) {
    // section stays hidden
  }
}

/* ---------------------------------------------------------------------
   Clinic closures (managed in the dashboard). The website books with the
   founder (doctor 1), so whole-clinic closures and her leave both apply.
   --------------------------------------------------------------------- */
const MAIN_DOCTOR_ID = 1;
const BANNER_LOOKAHEAD_DAYS = 21;
let closuresPromise = null;

function getClosures() {
  if (!closuresPromise) {
    closuresPromise = sbGet("clinic_closures?select=start_date,end_date,doctor_id,note&order=start_date")
      .then((rows) => rows.filter((c) => c.doctor_id == null || c.doctor_id === MAIN_DOCTOR_ID))
      .catch(() => []);
  }
  return closuresPromise;
}

function closureOn(closures, isoDate) {
  return closures.find((c) => isoDate >= c.start_date && isoDate <= c.end_date) || null;
}

function fmtClosureDates(c) {
  const f = (s) => new Date(s + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  return c.start_date === c.end_date ? f(c.start_date) : `${f(c.start_date)} – ${f(c.end_date)}`;
}

async function initClosureBanner() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const closures = await getClosures();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const horizon = new Date(Date.now() + BANNER_LOOKAHEAD_DAYS * 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const soon = closures.filter((c) => c.end_date >= today && c.start_date <= horizon);
  if (!soon.length) return;
  const banner = document.createElement("div");
  banner.className = "closure-banner";
  banner.setAttribute("role", "status");
  banner.textContent = soon
    .map((c) => `${c.start_date <= today ? "Clinic closed today" + (c.end_date > today ? ` until ${fmtClosureDates({ start_date: c.end_date, end_date: c.end_date })}` : "") : "Clinic closed " + fmtClosureDates(c)}: ${c.note}`)
    .join(" · ");
  header.insertAdjacentElement("beforebegin", banner);
}

/* ---------------------------------------------------------------------
   Secure report page (report.html?t=<token>). The report-access Edge
   Function checks the token and the last 4 phone digits, then returns a
   short-lived download link.
   --------------------------------------------------------------------- */
async function initReportPage() {
  const form = document.getElementById("reportForm");
  if (!form) return;
  const token = (new URLSearchParams(location.search).get("t") || "").trim();
  const msg = document.getElementById("reportMsg");
  const btn = document.getElementById("reportBtn");
  const input = document.getElementById("phoneLast4");
  const showMsg = (text, isError) => { msg.textContent = text; msg.className = "form-msg" + (isError ? " error" : " success"); };

  if (!/^[a-f0-9]{32,64}$/i.test(token)) {
    input.disabled = true; btn.disabled = true;
    showMsg("This report link is incomplete. Please open it exactly as received on WhatsApp, or ask the clinic to send it again.", true);
    return;
  }
  input.addEventListener("input", () => { input.value = input.value.replace(/\D/g, "").slice(0, 4); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(input.value)) return showMsg("Please enter the last 4 digits of your mobile number.", true);
    btn.disabled = true; btn.textContent = "Checking…"; msg.textContent = ""; msg.className = "form-msg";
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/report-access`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ token, phone_last4: input.value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        showMsg(data.message || "We couldn't open this report. Please contact the clinic.", true);
        if (res.status === 423 || res.status === 410) input.disabled = true;
        return;
      }
      form.hidden = true;
      document.getElementById("reportHello").textContent = data.first_name ? `Hello ${data.first_name},` : "Hello,";
      const when = data.created_at ? new Date(data.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }) : "";
      document.getElementById("reportDetails").textContent = `Your ${data.report_type || "report"}${when ? " from " + when : ""} is ready.`;
      document.getElementById("reportOpen").href = data.url;
      document.getElementById("reportExpiry").textContent = data.url_valid_seconds
        ? `For your privacy, this button works for ${Math.round(data.url_valid_seconds / 60)} minutes. If it stops working, simply reload this page and confirm your digits again.`
        : "";
      document.getElementById("reportResult").hidden = false;
    } catch (err) {
      showMsg("Connection problem. Please check your internet and try again.", true);
    } finally {
      btn.disabled = false; btn.textContent = "Open My Report";
    }
  });
}

function initArticleFilters() {
  const chips = document.querySelectorAll(".filter-chips .chip");
  const cards = document.querySelectorAll("#articlesGrid .article-card");
  const empty = document.getElementById("articlesEmpty");
  if (!chips.length) return;

  function apply(filter) {
    let shown = 0;
    cards.forEach((card) => {
      const match = filter === "all" || card.dataset.type === filter;
      card.hidden = !match;
      if (match) shown++;
    });
    if (empty) empty.style.display = shown ? "none" : "block";
  }

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.setAttribute("aria-pressed", c === chip ? "true" : "false"));
      apply(chip.dataset.filter);
    });
  });
  apply("all");
}

document.addEventListener("DOMContentLoaded", () => {
  initBookingForm();
  initGeneralContactForm();
  initLiveHours();
  initMobileNav();
  initArticles();
  initArticlePage();
  initTestimonials();
  initSpecialists();
  initClosureBanner();
  initReportPage();
});
