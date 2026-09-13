/* Login form validation and asynchronous credential submission. */
(function () {
  const form = document.getElementById("loginForm");
  const email = document.getElementById("loginEmail");
  const password = document.getElementById("loginPassword");
  const passwordHint = document.getElementById("passwordHint");
  const submitBtn = form.querySelector(".submit-btn");
  let loginComplete = false;

  [email, password].forEach((field) => {
    field.addEventListener("input", () => {
      SmartCareFormHelpers.showError(field, false);
      NotificationCenter.publish("login:editing");
    });
  });

  password.addEventListener("focus", () => {
    if (passwordHint) passwordHint.style.display = "block";
  });

  password.addEventListener("blur", () => {
    if (passwordHint) passwordHint.style.display = "none";
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (submitBtn.classList.contains("loading") || loginComplete) return;

    let valid = true;

    if (email.value.trim() === "") {
      SmartCareFormHelpers.showError(email, true, "Enter your email address.");
      valid = false;
    } else if (!SmartCareValidators.isValidEmail(email.value.trim())) {
      SmartCareFormHelpers.showError(
        email,
        true,
        "Enter a valid email address.",
      );
      valid = false;
    }

    if (password.value.trim() === "") {
      SmartCareFormHelpers.showError(password, true, "Enter your password.");
      valid = false;
    }

    if (!valid) return;

    NotificationCenter.publish("login:attempt", { email: email.value.trim() });
    submitBtn.classList.add("loading");
    submitBtn.disabled = true;

    const loadingStartedAt = SmartCareLoading.show({
      title: "Checking credentials...",
      message: "Please wait while we securely verify your account.",
    });

    submitLogin(new FormData(form), loadingStartedAt);
  });

  async function submitLogin(body, loadingStartedAt) {
    try {
      const response = await fetch(form.action, {
        method: form.method,
        body,
      });
      const data = await response.json();

      await SmartCareLoading.wait(loadingStartedAt);
      SmartCareLoading.hide();
      finishSubmit();
      handleLoginResponse(data);
    } catch (error) {
      await SmartCareLoading.wait(loadingStartedAt);
      SmartCareLoading.hide();
      finishSubmit();
      NotificationCenter.publish("login:failed", {
        message: "Couldn't reach the server. Please try again.",
      });
    }
  }

  function finishSubmit() {
    submitBtn.classList.remove("loading");
    submitBtn.disabled = false;
  }

  function handleLoginResponse(data) {
    if (data.success) {
      loginComplete = true;
      submitBtn.disabled = true;
      form.reset();
      SmartCareFormHelpers.clearFieldStates([email, password]);
      NotificationCenter.publish("login:success", {
        message: data.message,
        redirect: data.redirect,
      });
      return;
    }

    if (data.errors) {
      Object.keys(data.errors).forEach((id) => {
        const field = document.getElementById(id);
        if (field) SmartCareFormHelpers.showError(field, true, data.errors[id]);
      });
    }

    password.value = "";
    password.focus();
    NotificationCenter.publish("login:failed", { message: data.message });
  }
})();
