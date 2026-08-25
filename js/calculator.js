/* ============================================================
   Reveal Window Cleaning — quote calculator
   Depends on pricing-data.js being loaded first.
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
    // No backend wired up yet — replace with a real submission
    // (Formspree / Netlify Forms / a Squeegee webhook) before launch.
    notifyResult.textContent =
      "Thank you — we'll email you as soon as we cover your area.";
    notifyResult.classList.add("show", "yes");
    notifyEmail.value = "";
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

      // No backend wired up yet. Before launch: point this at the
      // confirmed Squeegee automatic-lead webhook (see build spec §6),
      // and also email a copy of the payload below to the business
      // inbox as a safety net.
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
      // eslint-disable-next-line no-console
      console.log("Reveal Window Cleaning — booking submitted (demo only):", payload);

      bookingForm.hidden = true;
      confirmPanel.hidden = false;
      confirmPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
})();
