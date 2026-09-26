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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgEl = document.getElementById("bookingFormMsg");
    const submitBtn = form.querySelector("button[type=submit]");
    msgEl.className = "form-msg";
    msgEl.textContent = "";

    const data = Object.fromEntries(new FormData(form).entries());

    if (data.honeypot) return; // silently drop bot submissions

    const slotDateTime = `${data.preferred_date}T${data.preferred_time}:00+05:30`;
    if (new Date(slotDateTime).getTime() <= Date.now()) {
      msgEl.textContent = "Please choose a future date and time.";
      msgEl.className = "form-msg error";
      return;
    }

    const payload = {
      name: data.name.trim(),
      phone: data.phone.replace(/\D/g, ""),
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
    } catch (err) {
      msgEl.textContent = "Something went wrong. Please call us at +91 74074 46000 to book directly.";
      msgEl.className = "form-msg error";
    } finally {
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
