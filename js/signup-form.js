/* Sign-up form validation and asynchronous account creation. */
(function () {
  const form = document.getElementById("signupForm");
  const fullName = document.getElementById("fullName");
  const email = document.getElementById("signupEmail");
  const phone = document.getElementById("phone");
  const password = document.getElementById("signupPassword");
  const confirmPassword = document.getElementById("confirmPassword");
  const terms = document.getElementById("terms");
  const submitBtn = form.querySelector(".submit-btn");
  let signupComplete = false;

  function resetSignupAfterSuccess() {
    signupComplete = true;
    submitBtn.classList.remove("loading");
    submitBtn.disabled = true;
    form.reset();
    SmartCareFormHelpers.clearFieldStates(form.querySelectorAll("input"));
    SmartCarePasswordStrength.reset();
  }

  function notifySignupSuccess(data) {
    showToast({
      type: "success",
      title: "Account created!",
      body: data.message,
      onClose: () => {
        window.location.href = data.redirect;
      },
    });
  }

  // One success event invokes three subscribers, including an anonymous handler.
  NotificationCenter.subscribe("signup:success", resetSignupAfterSuccess, "Reset signup form and strength indicator");
  NotificationCenter.subscribe("signup:success", notifySignupSuccess, "Request signup success toast");
  NotificationCenter.subscribe("signup:success", (data) => {
    console.log("Registration result", {
      message: data.message,
      redirect: data.redirect,
    });
    console.log("[signup:success] This is a lambda or anonymous function - registration result reported.");
  }, "Report registration result");

  NotificationCenter.subscribe("signup:failed", finishSubmit, "Restore signup button");
  NotificationCenter.subscribe("signup:failed", (data) => {
    Object.keys(data.errors || {}).forEach((id) => {
      const field = document.getElementById(id);
      if (field) SmartCareFormHelpers.showError(field, true, data.errors[id]);
    });
  }, "Apply signup field errors");
  NotificationCenter.subscribe("signup:failed", (data) => {
    showToast({ type: "error", title: data.title || "Sign up failed", body: data.message });
  }, "Request signup error toast");

  [fullName, email, phone].forEach((field) => {
    field.addEventListener("input", () =>
      SmartCareFormHelpers.showError(field, false),
    );
  });

  terms.addEventListener("change", () =>
    SmartCareFormHelpers.showError(terms, false),
  );

  confirmPassword.addEventListener("input", () => {
    if (confirmPassword.value === "") {
      SmartCareFormHelpers.showError(confirmPassword, false);
      return;
    }

    const mismatch = confirmPassword.value !== password.value;
    SmartCareFormHelpers.showError(
      confirmPassword,
      mismatch,
      mismatch ? "Passwords don't match." : "",
    );
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (submitBtn.classList.contains("loading") || signupComplete) return;
    if (!validateSignup()) return;

    submitBtn.classList.add("loading");
    submitBtn.disabled = true;

    const loadingStartedAt = SmartCareLoading.show({
      title: "Creating your account...",
      message: "Please wait while we securely save your information.",
    });

    submitSignup(new FormData(form), loadingStartedAt);
  });

  function validateSignup() {
    let valid = true;

    if (fullName.value.trim().length < 2) {
      SmartCareFormHelpers.showError(
        fullName,
        true,
        "Enter your full name (at least 2 characters).",
      );
      valid = false;
    }

    if (!SmartCareValidators.isValidEmail(email.value.trim())) {
      SmartCareFormHelpers.showError(
        email,
        true,
        "Enter a valid email address.",
      );
      valid = false;
    }

    if (!SmartCareValidators.isValidPhone(phone.value.trim())) {
      SmartCareFormHelpers.showError(
        phone,
        true,
        "Enter a valid phone number (11 digits).",
      );
      valid = false;
    }

    const checks = SmartCarePasswordStrength.evaluate(password.value);
    if (!SmartCareValidators.passwordRulesPassed(checks)) {
      SmartCareFormHelpers.showError(
        password,
        true,
        "Password doesn't meet all the requirements above.",
      );
      valid = false;
    }

    const passwordsMatch =
      confirmPassword.value !== "" && confirmPassword.value === password.value;
    if (!passwordsMatch) {
      SmartCareFormHelpers.showError(
        confirmPassword,
        true,
        confirmPassword.value === ""
          ? "Re-enter your password to confirm it."
          : "Passwords don't match.",
      );
      valid = false;
    }

    if (!terms.checked) {
      SmartCareFormHelpers.showError(
        terms,
        true,
        "Please accept the Terms and Privacy Policy to continue.",
      );
      valid = false;
    }

    return valid;
  }

  async function submitSignup(body, loadingStartedAt) {
    try {
      const response = await fetch(form.action, {
        method: form.method,
        body,
      });
      const data = await response.json();

      await SmartCareLoading.wait(loadingStartedAt);
      SmartCareLoading.hide();

      if (data.success) {
        NotificationCenter.publish("signup:success", {
          message: data.message,
          redirect: "login.php",
        });
        return;
      }

      NotificationCenter.publish("signup:failed", data);
    } catch (error) {
      await SmartCareLoading.wait(loadingStartedAt);
      SmartCareLoading.hide();
      NotificationCenter.publish("signup:failed", {
        title: "Connection problem",
        message: "Couldn't reach the server. Please try again.",
      });
    }
  }

  function finishSubmit() {
    submitBtn.classList.remove("loading");
    submitBtn.disabled = false;
  }
})();
