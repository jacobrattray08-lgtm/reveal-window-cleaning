/* ============================================================
   Reveal Window Cleaning — quote calculator
   Depends on pricing-data.js and site-config.js being loaded first.
   ============================================================ */
(function () {
  "use strict";

  const state = {
    zone: null,
    outward: null,
    postcodeInput: "",
    bedrooms: null,
    frequency: "w4",
    hasConservatory: false,
    conservatorySize: null,
  };

  const el = (id) => document.getElementById(id);

  const postcodeField = el("postcode");
  const checkBtn = el("checkPostcode");
  const pcResult = el("pcResult");
  const outOfAreaBox = el("outOfAreaNotify");
  const notifyBtn = el("notifyBtn");
  const notifyEmail = el("notifyEmail");
  const notifyResult = el("notifyResult");

  const step2 = el("step2");
  const step3 = el("step3");
  const step4 = el("step4");
  const step5 = el("step5");

  const bedroomInputs = () => Array.from(document.querySelectorAll('input[name="bedrooms"]'));
  const freqList = el("freqList");
  const hasConservatoryBox = el("hasConservatory");
  const conservatoryDetail = el("conservatoryDetail");
  const consSizeList = el("consSizeList");
  const lineItems = el("lineItems");

  const bookingPostcodeOut = el("bookingPostcode");

  function revealStep(stepEl) {
    if (stepEl && stepEl.hidden) stepEl.hidden = false;
  }

  function hideStep(stepEl) {
    if (stepEl) stepEl.hidden = true;
  }

  // ---------- Step 1: postcode ----------
  function checkPostcode() {
    const raw = postcodeField.value;
    const result = parsePostcode(raw);

    pcResult.classList.remove("show", "yes", "no", "err");
    outOfAreaBox.hidden = true;

    if (!result.valid) {
      pcResult.textContent =
        "That doesn't look like a full UK postcode. Please check it and try again.";
      pcResult.classList.add("show", "err");
      hideStep(step2);
      hideStep(step3);
      hideStep(step4);
      hideStep(step5);
      return;
    }

    state.outward = result.outward;
    state.postcodeInput = raw.trim();

    if (!result.zone) {
      pcResult.textContent =
        "We don't cover that postcode yet. Leave your email below and we'll let you know when we do.";
      pcResult.classList.add("show", "no");
      outOfAreaBox.hidden = false;
      state.zone = null;
      hideStep(step2);
      hideStep(step3);
      hideStep(step4);
      hideStep(step5);
      return;
    }

    state.zone = result.zone;
    pcResult.innerHTML =
      "✓ We cover " +
      result.outward +
      ". Get your price now — we'll confirm your first visit date within 24 hours.";
    pcResult.classList.add("show", "yes");
    if (bookingPostcodeOut) bookingPostcodeOut.value = state.postcodeInput;
    revealStep(step2);
  }

  checkBtn.addEventListener("click", checkPostcode);
  postcodeField.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      checkPostcode();
    }
  });

  notifyBtn.addEventListener("click", () => {
    const email = (notifyEmail.value || "").trim();
    notifyResult.classList.remove("show", "yes", "err");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      notifyResult.textContent = "Please enter a valid email address.";
      notifyResult.classList.add("show", "err");
      return;
    }
    const endpoint =
      typeof REVEAL_CONFIG !== "undefined" ? REVEAL_CONFIG.notifyFormEndpoint : "";

    if (!endpoint) {
      // Not configured yet (see js/site-config.js) — never claim we've
      // saved the email when we haven't gone anywhere with it.
      // eslint-disable-next-line no-console
      console.warn(
        "Reveal Window Cleaning — notifyFormEndpoint is not set in js/site-config.js. " +
          "This email was NOT saved anywhere:",
        email
      );
      notifyResult.textContent =
        "Sorry, that's not switched on yet — please email Revealwindowcleaning@hotmail.com and we'll add you to the list.";
      notifyResult.classList.add("show", "err");
      return;
    }

    notifyBtn.disabled = true;
    const notifyBtnDefaultText = notifyBtn.textContent;
    notifyBtn.textContent = "Sending…";

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        email: email,
        postcode: state.postcodeInput,
        outward: state.outward,
        _form: "out-of-area-notify",
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Submission failed with status " + res.status);
        notifyResult.textContent =
          "Thank you — we'll email you as soon as we cover your area.";
        notifyResult.classList.add("show", "yes");
        notifyEmail.value = "";
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("Reveal Window Cleaning — notify-me signup failed to send:", err);
        notifyResult.textContent =
          "Sorry, that didn't send — please email Revealwindowcleaning@hotmail.com instead.";
        notifyResult.classList.add("show", "err");
      })
      .finally(() => {
        notifyBtn.disabled = false;
        notifyBtn.textContent = notifyBtnDefaultText;
      });
  });

  // ---------- Step 2: bedrooms ----------
  bedroomInputs().forEach((input) => {
    input.addEventListener("change", () => {
      state.bedrooms = input.value;
      buildFrequencyOptions();
      revealStep(step3);
    });
  });

  // ---------- Step 3: frequency (built dynamically on zone+bedrooms) ----------
  function buildFrequencyOptions() {
    if (!state.zone || !state.bedrooms) return;
    const prices = PRICING[state.zone][state.bedrooms];
    freqList.innerHTML = "";
    FREQUENCIES.forEach((f, i) => {
      const price = prices[f.key];
      const priceText = (prices.from ? "from " : "") + money(price) + " per visit";
      const row = document.createElement("div");
      row.className = "radio-row";
      const checked = f.key === state.frequency ? "checked" : "";
      row.innerHTML =
        '<label><input type="radio" name="frequency" value="' +
        f.key +
        '" ' +
        checked +
        '><span class="txt"><b>' +
        f.label +
        f.tag +
        "</b></span><span class=\"price\">" +
        priceText +
        "</span></label>";
      freqList.appendChild(row);
    });
    Array.from(freqList.querySelectorAll('input[name="frequency"]')).forEach((input) => {
      input.addEventListener("change", () => {
        state.frequency = input.value;
        updatePrice();
      });
    });
    updatePrice();
  }

  // ---------- Step 3b: conservatory ----------
  hasConservatoryBox.addEventListener("change", () => {
    state.hasConservatory = hasConservatoryBox.checked;
    hasConservatoryBox.setAttribute("aria-expanded", String(state.hasConservatory));
    conservatoryDetail.hidden = !state.hasConservatory;
    if (state.hasConservatory) {
      buildConservatorySizes();
      if (!state.conservatorySize) state.conservatorySize = "small";
    } else {
      state.conservatorySize = null;
    }
    updatePrice();
  });

  function buildConservatorySizes() {
    if (!state.zone || !state.bedrooms) return;
    const housePrice = PRICING[state.zone][state.bedrooms][state.frequency];
    consSizeList.innerHTML = "";
    Object.keys(CONSERVATORY_UPLIFT).forEach((key) => {
      const amount = conservatoryAmount(housePrice, key);
      const checked = key === state.conservatorySize ? "checked" : "";
      const row = document.createElement("div");
      row.className = "radio-row";
      row.innerHTML =
        '<label><input type="radio" name="consSize" value="' +
        key +
        '" ' +
        checked +
        '><span class="txt"><b>' +
        CONSERVATORY_UPLIFT[key].label +
        "</b></span><span class=\"price\">+" +
        money(amount) +
        "</span></label>";
      consSizeList.appendChild(row);
    });
    Array.from(consSizeList.querySelectorAll('input[name="consSize"]')).forEach((input) => {
      input.addEventListener("change", () => {
        state.conservatorySize = input.value;
        updatePrice();
      });
    });
  }

  // ---------- Step 4: price ----------
  function updatePrice() {
    if (!state.zone || !state.bedrooms || !state.frequency) return;
    const pricing = PRICING[state.zone][state.bedrooms];
    const housePrice = pricing[state.frequency];
    const prefix = pricing.from ? "from " : "";

    let total = housePrice;
    let consAmount = 0;
    if (state.hasConservatory && state.conservatorySize) {
      // Refresh conservatory amounts in case frequency changed since they were built.
      buildConservatorySizes();
      consAmount = conservatoryAmount(housePrice, state.conservatorySize);
      total = housePrice + consAmount;
    }

    const freqLabel = FREQUENCIES.find((f) => f.key === state.frequency).label;
    const bedLabel = state.bedrooms === "5" ? "5+ bed" : state.bedrooms + " bed";

    let html = "";
    html +=
      '<div><span>' +
      bedLabel +
      ", " +
      freqLabel.toLowerCase() +
      "</span><span>" +
      prefix +
      money(housePrice) +
      "</span></div>";
    if (state.hasConservatory && state.conservatorySize) {
      html +=
        '<div><span>Conservatory windows (' +
        state.conservatorySize +
        ")</span><span>" +
        prefix +
        money(consAmount) +
        "</span></div>";
    }
    html +=
      '<div class="grand"><span>Total per visit</span><span class="price-big">' +
      prefix +
      money(total) +
      "</span></div>";

    lineItems.innerHTML = html;
    revealStep(step4);
    revealStep(step5);
  }

  // ---------- Step 5: booking form ----------
  const bookingForm = el("bookingForm");
  const errorSummary = el("bookingErrors");
  const confirmPanel = el("bookingConfirm");

  if (bookingForm) {
    bookingForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const errors = [];

      const requiredFields = [
        ["bookName", "your name"],
        ["bookPhone", "your phone number"],
        ["bookEmail", "your email address"],
        ["bookAddress", "your address"],
      ];
      requiredFields.forEach(([id, label]) => {
        const field = el(id);
        if (field && !field.value.trim()) errors.push({ id, msg: "Please enter " + label + "." });
      });

      const emailField = el("bookEmail");
      if (emailField && emailField.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value)) {
        errors.push({ id: "bookEmail", msg: "Please enter a valid email address." });
      }

      const payment = document.querySelector('input[name="payment"]:checked');
      if (!payment) errors.push({ id: "payDirectDebit", msg: "Please choose how you'd like to pay." });

      const consent = el("consent14");
      if (!consent || !consent.checked) {
        errors.push({
          id: "consent14",
          msg: "Please confirm you'd like your first clean as soon as possible, or call us instead.",
        });
      }

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
            const target = el(err.id);
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

      // Squeegee has no public inbound API/webhook to create a customer or
      // appointment automatically (only a hosted Customer Portal on their
      // Advanced plan+, whose embed/pre-population behaviour isn't publicly
      // documented — confirm with Squeegee support before building toward
      // that). So this booking is emailed to the business inbox via the
      // form backend configured in site-config.js, and gets keyed into
      // Squeegee by hand (or a CSV import) rather than created automatically.
      const payload = {
        zone: state.zone,
        postcode: state.postcodeInput,
        bedrooms: state.bedrooms,
        frequency: state.frequency,
        conservatory: state.hasConservatory ? state.conservatorySize : null,
        name: el("bookName").value,
        phone: el("bookPhone").value,
        email: el("bookEmail").value,
        address: el("bookAddress").value,
        notes: el("bookNotes").value,
        payment: payment.value,
        fourteenDayConsent: true,
        consentTimestamp: new Date().toISOString(),
      };

      const endpoint =
        typeof REVEAL_CONFIG !== "undefined" ? REVEAL_CONFIG.bookingFormEndpoint : "";
      const submitBtn = bookingForm.querySelector('button[type="submit"]');
      const submitBtnDefaultText = submitBtn ? submitBtn.textContent : "";

      function showBookingError(msg) {
        errorSummary.innerHTML = "";
        const list = document.createElement("ul");
        const li = document.createElement("li");
        li.textContent = msg;
        list.appendChild(li);
        errorSummary.appendChild(list);
        errorSummary.hidden = false;
        errorSummary.focus();
      }

      if (!endpoint) {
        // Not configured yet — never show "thank you" when nothing was
        // actually sent anywhere.
        // eslint-disable-next-line no-console
        console.warn(
          "Reveal Window Cleaning — bookingFormEndpoint is not set in js/site-config.js. " +
            "This booking was NOT sent anywhere:",
          payload
        );
        showBookingError(
          "Sorry, online booking isn't switched on yet — please call 07727 864273 or email Revealwindowcleaning@hotmail.com with your details and we'll get you booked in."
        );
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending…";
      }

      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      })
        .then((res) => {
          if (!res.ok) throw new Error("Submission failed with status " + res.status);
          bookingForm.hidden = true;
          confirmPanel.hidden = false;
          confirmPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error("Reveal Window Cleaning — booking failed to send:", err, payload);
          showBookingError(
            "Sorry, that didn't send — please call 07727 864273 or email Revealwindowcleaning@hotmail.com instead so we don't lose your booking."
          );
        })
        .finally(() => {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = submitBtnDefaultText;
          }
        });
    });
  }
})();
