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
    if (verifiedPhone && verifiedPhone !== phoneInput.value.replace(/\D/g, "")) {
      resetVerification();
    }
  });

  sendCodeBtn.addEventListener("click", async () => {
    const cleanPhone = phoneInput.value.replace(/\D/g, "");
    if (cleanPhone.length < 8) {
      otpStatus.textContent = "Please enter a valid phone number first.";
      otpStatus.style.color = "#a3312c";
      return;
    }
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
    const cleanPhone = phoneInput.value.replace(/\D/g, "");
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

    const cleanPhone = data.phone.replace(/\D/g, "");
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

function initMobileNav() {
  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("siteNav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => nav.classList.toggle("open"));
}

document.addEventListener("DOMContentLoaded", () => {
  initBookingForm();
  initMobileNav();
});
