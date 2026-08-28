/* ============================================================
   Reveal Window Cleaning — form submission config
   ============================================================
   WHY THIS FILE EXISTS
   Squeegee (the booking/round-management system used for Direct
   Debit and round scheduling) does not publish an inbound API or
   webhook that a website can post new customers/bookings into —
   only a hosted Customer Portal on the Advanced plan and above.
   So every form on this site posts to a plain form-backend
   instead, which emails the submission straight to the business
   inbox. The visit/booking then gets keyed into Squeegee by hand
   (or via a CSV import) rather than created automatically.

   HOW TO ACTIVATE
   1. Create a free form at https://formspree.io (or swap in
      Netlify Forms / another backend of your choice — any
      endpoint that accepts a JSON POST and email address works).
   2. Paste the endpoint URL(s) below.
   3. That's it — quote-form.js and calculator.js already know how
      to use them. Until an endpoint is filled in, the affected
      form shows an inline message asking the customer to call or
      email directly, instead of silently pretending to succeed.
   ============================================================ */
const REVEAL_CONFIG = {
  // Step-5 booking form on the homepage quote calculator (name, address,
  // chosen price, payment preference, 14-day consent, etc).
  bookingFormEndpoint: "",

  // "Notify me" email capture when a postcode is out of area.
  notifyFormEndpoint: "",

  // Generic quote-request forms: commercial.html and every services/*.html
  // page (driveway-patio, conservatory-roof, gutter-clearing, interior-windows,
  // solar-panels). One endpoint covers all of them — Formspree emails will
  // include every field name/value regardless of which page it came from.
  quoteRequestEndpoint: "",
};
