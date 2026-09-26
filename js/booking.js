const SUPABASE_URL = "https://ycxuipirpyjadkavkcrf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_kOEXCSZkqQMV0MJ8kaa1Gw_v_QaPTdm";

const SERVICES = [
  { id: 1, name: "Manual Therapy" },
  { id: 2, name: "Sports Injury Rehabilitation" },
  { id: 3, name: "Pain Management" },
  { id: 4, name: "Post Injury Rehabilitation" },
  { id: 5, name: "Geriatric Care" },
  { id: 6, name: "Antenatal & Garbhsanskar" },
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
  initArticleFilters();
});
