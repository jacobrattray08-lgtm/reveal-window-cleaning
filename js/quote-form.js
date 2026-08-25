/* ============================================================
   Reveal Window Cleaning — generic quote-request form handler
   Used on the secondary-service pages and the commercial page.
   Validates required fields, shows an accessible error summary,
   then swaps the form for a confirmation panel.

   No backend is wired up yet: before launch, point each form's
   `data-endpoint` at a real destination (Formspree, Netlify Forms,
   or a Squeegee webhook) and submit the payload there instead of
   only logging it.
   ============================================================ */
(function () {
  "use strict";

  function labelFor(field) {
    if (field.labels && field.labels.length) return field.labels[0].textContent.trim();
    return field.getAttribute("aria-label") || field.name || "This field";
  }

  document.querySelectorAll("form.quote-request-form").forEach((form) => {
    const errorSummary =
      form.querySelector(".form-errors") ||
      (form.closest(".q-step") && form.closest(".q-step").querySelector(".form-errors"));
    const confirmPanel = document.getElementById(form.dataset.confirmId);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const errors = [];
      const seenRadioGroups = new Set();

      form.querySelectorAll("[required]").forEach((field) => {
        if (field.type === "radio") {
          if (seenRadioGroups.has(field.name)) return;
          seenRadioGroups.add(field.name);
          const checked = form.querySelector('input[name="' + field.name + '"]:checked');
          if (!checked) {
            const fieldset = field.closest("fieldset");
            const legend = fieldset && fieldset.querySelector("legend");
            const groupLabel = legend ? legend.textContent.trim() : labelFor(field);
            errors.push({ id: field.id, msg: "Please choose an option for: " + groupLabel + "." });
          }
          return;
        }

        const value = field.type === "checkbox" ? field.checked : field.value.trim();
        if (!value) {
          errors.push({ id: field.id, msg: "Please complete: " + labelFor(field) + "." });
          return;
        }
        if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
          errors.push({ id: field.id, msg: "Please enter a valid email address." });
        }
      });

      if (errorSummary) {
        errorSummary.innerHTML = "";
        if (errors.length) {
          const list = document.createElement("ul");
          errors.forEach((err) => {
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.href = "#" + err.id;
            a.textContent = err.msg;
            a.addEventListener("click", (ev) => {
              ev.preventDefault();
              const target = document.getElementById(err.id);
              if (target) target.focus();
            });
            li.appendChild(a);
            list.appendChild(li);
          });
          errorSummary.appendChild(list);
          errorSummary.hidden = false;
          errorSummary.focus();
          return;
        }
        errorSummary.hidden = true;
      } else if (errors.length) {
        return;
      }

      const data = Object.fromEntries(new FormData(form).entries());
      // eslint-disable-next-line no-console
      console.log("Reveal Window Cleaning — quote request submitted (demo only):", data);

      if (confirmPanel) {
        form.hidden = true;
        confirmPanel.hidden = false;
        confirmPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
})();
