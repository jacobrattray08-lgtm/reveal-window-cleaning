/* ============================================================
   Reveal Window Cleaning — generic quote-request form handler
   Used on the secondary-service pages and the commercial page.
   Validates required fields, shows an accessible error summary,
   submits to the endpoint configured in site-config.js, then
   swaps the form for a confirmation panel.

   Submission architecture: Squeegee has no public inbound API/
   webhook, so this posts to a plain form backend (Formspree by
   default — see site-config.js) which emails the enquiry to the
   business inbox. It is then keyed into Squeegee by hand. If
   REVEAL_CONFIG.quoteRequestEndpoint is left blank, the form
   tells the customer to call/email directly instead of silently
   losing their enquiry.
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
    const submitBtn = form.querySelector('button[type="submit"]');
    const submitBtnDefaultText = submitBtn ? submitBtn.textContent : "";

    function showErrors(errors) {
      if (!errorSummary) return false;
      errorSummary.innerHTML = "";
      if (!errors.length) {
        errorSummary.hidden = true;
        return false;
      }
      const list = document.createElement("ul");
      errors.forEach((err) => {
        const li = document.createElement("li");
        if (err.id) {
          const a = document.createElement("a");
          a.href = "#" + err.id;
          a.textContent = err.msg;
          a.addEventListener("click", (ev) => {
            ev.preventDefault();
            const target = document.getElementById(err.id);
            if (target) target.focus();
          });
          li.appendChild(a);
        } else {
          li.textContent = err.msg;
        }
        list.appendChild(li);
      });
      errorSummary.appendChild(list);
      errorSummary.hidden = false;
      errorSummary.focus();
      return true;
    }

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

      if (showErrors(errors)) return;
      if (!errorSummary && errors.length) return;

      const endpoint =
        typeof REVEAL_CONFIG !== "undefined" ? REVEAL_CONFIG.quoteRequestEndpoint : "";
      const data = Object.fromEntries(new FormData(form).entries());
      data._page = window.location.pathname;

      if (!endpoint) {
        // Not configured yet — never pretend this succeeded. Tell the
        // customer how to reach us directly instead of losing the enquiry.
        // eslint-disable-next-line no-console
        console.warn(
          "Reveal Window Cleaning — quoteRequestEndpoint is not set in js/site-config.js. " +
            "Enquiry was NOT sent anywhere:",
          data
        );
        showErrors([
          {
            id: submitBtn ? submitBtn.id || "" : "",
            msg:
              "Sorry, online enquiries aren't switched on yet — please call 07727 864273 or email Revealwindowcleaning@hotmail.com and we'll help directly.",
          },
        ]);
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending…";
      }

      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
      })
        .then((res) => {
          if (!res.ok) throw new Error("Submission failed with status " + res.status);
          if (confirmPanel) {
            form.hidden = true;
            confirmPanel.hidden = false;
            confirmPanel.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error("Reveal Window Cleaning — quote request failed to send:", err, data);
          showErrors([
            {
              id: "",
              msg:
                "Sorry, that didn't send — please call 07727 864273 or email Revealwindowcleaning@hotmail.com instead.",
            },
          ]);
        })
        .finally(() => {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = submitBtnDefaultText;
          }
        });
    });
  });
})();
