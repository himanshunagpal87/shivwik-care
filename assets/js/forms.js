/* Booking + Contact form handling — FormSubmit.co relay, no backend needed.
   Both forms email straight to drsonal@shivwikholisticcare.com.
   One-time setup: the first live submission triggers a confirmation
   email from FormSubmit — click "Activate Form" once, then every
   future submission delivers automatically. */

const FORM_ENDPOINT = 'https://formsubmit.co/ajax/drsonal@shivwikholisticcare.com';

function setMsg(el, type, text) {
  el.textContent = text;
  el.className = 'form-msg show ' + type;
}

function serialize(form) {
  const data = {};
  new FormData(form).forEach((v, k) => { data[k] = v; });
  return data;
}

async function handleFormSubmit(form, kind) {
  const btn = form.querySelector('button[type="submit"]');
  const msg = form.querySelector('.form-msg');
  const original = btn.textContent;

  if (form.querySelector('input[name="_honey"]')?.value) return; // spam trap

  const data = serialize(form);
  btn.disabled = true;
  btn.textContent = 'Sending…';

  const payload = {
    ...data,
    _subject: kind === 'booking'
      ? `New Appointment Request — ${data.name || 'Website visitor'}`
      : `New Contact Form Message — ${data.name || 'Website visitor'}`,
    _template: 'table',
    _captcha: 'false',
  };

  try {
    const res = await fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Network response was not ok');

    form.reset();
    setMsg(msg, 'ok', kind === 'booking'
      ? "Thank you! Your appointment request has been sent to Dr. Sonal's team. We'll call you shortly to confirm your slot at the new clinic."
      : "Thanks for reaching out — we've received your message and will reply within one business day.");
  } catch (err) {
    setMsg(msg, 'err', 'Something went wrong sending your request. Please call/WhatsApp us directly at +91 8340006000, or try again in a moment.');
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const bookingForm = document.getElementById('booking-form');
  const contactForm = document.getElementById('contact-form');

  if (bookingForm) {
    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleFormSubmit(bookingForm, 'booking');
    });
    const dateInput = bookingForm.querySelector('input[name="preferred_date"]');
    if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];
  }

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleFormSubmit(contactForm, 'contact');
    });
  }
});
