/* =========================================================================
   Forgot Password Form
   -------------------------------------------------------------------------
   Mirrors js/signup-form.js: validates the email client-side for instant
   feedback, then POSTs the form (including the hidden csrf_token field)
   to php/forgot-password.php with fetch() and shows whatever that endpoint
   decides — the same server-validates-again pattern used by login and
   sign-up, since a request can always skip the browser entirely.

   Event source  -> the submit button (.submit-btn) inside #forgotForm
   Event listener -> the form's 'submit' event, below
   Processing mode: ASYNCHRONOUS (fetch()), same as sign-up -- the page
   stays responsive while php/forgot-password.php runs.
   ========================================================================= */
(function () {
  const form = document.getElementById("forgotForm");
  if (!form) return;

  const email = document.getElementById("forgotEmail");
  const message = document.getElementById("forgotMessage");
  const btn = form.querySelector(".submit-btn");

  const setMessage = (text, type) => {
    message.textContent = text;
    message.className = "message-area" + (type ? " " + type : "");
  };

  NotificationCenter.subscribe("password-reset:result", (data) => {
    btn.classList.remove("loading");
    btn.disabled = false;
    if (data.success) {
      form.reset();
      SmartCareFormHelpers.clearFieldStates([email]);
    } else {
      Object.keys(data.errors || {}).forEach((id) => {
        const field = document.getElementById(id);
        if (field) SmartCareFormHelpers.showError(field, true, data.errors[id]);
      });
    }
  }, "Restore reset form and apply field feedback");

  NotificationCenter.subscribe("password-reset:result", (data) => {
    setMessage(data.message, data.success ? "success" : "error");
  }, "Update reset result message");

  NotificationCenter.subscribe("password-reset:result", (data) => {
    showToast({
      type: data.success ? "success" : "error",
      title: data.success ? "Request processed" : "Reset request failed",
      body: data.message,
    });
  }, "Request reset result toast");

  // ---- Clear inline error / message as the user types ----
  email.addEventListener("input", () => {
    SmartCareFormHelpers.showError(email, false);
    setMessage("", "");
  });

  // ---- Form submission ----
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    if (btn.classList.contains("loading")) return; // guard against double submits

    const value = email.value.trim();
    if (!SmartCareValidators.isValidEmail(value)) {
      SmartCareFormHelpers.showError(
        email,
        true,
        "Enter a valid email address.",
      );
      return;
    }
    SmartCareFormHelpers.showError(email, false);

    btn.classList.add("loading");
    btn.disabled = true;
    setMessage("Sending your reset link...", "info");

    const body = new FormData(form); // includes the hidden csrf_token field automatically

    fetch(form.action, { method: "POST", body })
      .then((res) => res.json())
      .then((data) => {
        NotificationCenter.publish("password-reset:result", data);
      })
      .catch(() => {
        NotificationCenter.publish("password-reset:result", {
          success: false,
          message: "Couldn't reach the server. Please try again.",
        });
      });
  });
})();
