(() => {
  const clientId = window.SMARTCARE_GOOGLE_CLIENT_ID || "";
  const configured = Boolean(window.SMARTCARE_GOOGLE_CONFIGURED && clientId);
  const csrfToken = window.SMARTCARE_CSRF_TOKEN || "";
  const containers = Array.from(document.querySelectorAll("[data-google-button]"));

  if (!containers.length) return;

  function toast(type, title, body) {
    if (typeof showToast === "function") {
      showToast({ type, title, body });
    } else {
      window.alert(body);
    }
  }

  function renderSetupButton(container) {
    const label = container.dataset.googleLabel || "Continue with Google";
    container.innerHTML = `
      <button type="button" class="google-setup-button" aria-label="${label}">
        <span class="google-g" aria-hidden="true">G</span>
        <span>${label}</span>
      </button>`;

    container.querySelector("button")?.addEventListener("click", () => {
      toast(
        "info",
        "Google Sign-In needs your Client ID",
        "Open php/google-config.php and replace PASTE_YOUR_GOOGLE_CLIENT_ID_HERE with the OAuth Web Client ID from Google Cloud Console."
      );
    });
  }

  if (!configured) {
    containers.forEach(renderSetupButton);
    return;
  }

  NotificationCenter.subscribe("google:success", (data) => {
    toast("success", "Welcome to SmartCare", data.message);
  }, "Request Google sign-in success toast");
  NotificationCenter.subscribe("google:success", (data) => {
    window.setTimeout(() => {
      window.location.href = data.redirect;
    }, 450);
  }, "Schedule Google sign-in redirect");

  async function handleCredentialResponse(response) {
    if (!response?.credential) {
      toast("error", "Google Sign-In failed", "Google did not return a credential. Please try again.");
      return;
    }

    const startedAt = window.SmartCareLoading
      ? SmartCareLoading.show({
          title: "Signing you in...",
          message: "Securely verifying your Google account with SmartCare.",
        })
      : Date.now();

    try {
      const request = await fetch("../php/google-login.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          credential: response.credential,
          csrf_token: csrfToken,
        }),
      });

      let data;
      try {
        data = await request.json();
      } catch (_) {
        throw new Error("SmartCare returned an invalid server response.");
      }

      if (window.SmartCareLoading) {
        await SmartCareLoading.wait(startedAt, 650);
        SmartCareLoading.hide();
      }

      if (!request.ok || !data.success) {
        toast("error", "Google Sign-In failed", data.message || "Unable to sign in with Google.");
        return;
      }

      NotificationCenter.publish("google:success", {
        message: data.message || "Google Sign-In successful.",
        redirect: data.redirect,
      });
    } catch (error) {
      if (window.SmartCareLoading) SmartCareLoading.hide();
      console.error("Google Sign-In error:", error);
      toast("error", "Connection problem", "Couldn't complete Google Sign-In. Check your connection and try again.");
    }
  }

  function renderGoogleButtons() {
    if (!window.google?.accounts?.id) return;

    google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    containers.forEach((container) => {
      container.innerHTML = "";
      const width = Math.max(220, Math.min(400, Math.floor(container.getBoundingClientRect().width || 360)));
      google.accounts.id.renderButton(container, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: container.dataset.googleText || "continue_with",
        shape: "rectangular",
        logo_alignment: "left",
        width,
      });
    });
  }

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (window.google?.accounts?.id) {
      window.clearInterval(timer);
      renderGoogleButtons();
    } else if (attempts >= 50) {
      window.clearInterval(timer);
      containers.forEach((container) => {
        container.innerHTML = '<p class="google-unavailable">Google Sign-In could not load. Check your internet connection.</p>';
      });
    }
  }, 100);
})();
