const SmartCareLoading = (() => {
  let fallbackOverlay;

  function show({ title = "Please wait...", message = "" } = {}) {
    const startedAt = Date.now();

    if (window.Swal) {
      Swal.fire({
        title,
        text: message,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });
      return startedAt;
    }

    fallbackOverlay?.remove();
    fallbackOverlay = document.createElement("div");
    fallbackOverlay.className = "loading-overlay";
    fallbackOverlay.setAttribute("role", "status");
    fallbackOverlay.setAttribute("aria-live", "polite");

    const card = document.createElement("div");
    card.className = "loading-overlay-card";

    const spinner = document.createElement("span");
    spinner.className = "loading-overlay-spinner";
    spinner.setAttribute("aria-hidden", "true");

    const heading = document.createElement("p");
    heading.className = "loading-overlay-title";
    heading.textContent = title;

    const description = document.createElement("p");
    description.className = "loading-overlay-message";
    description.textContent = message;

    card.append(spinner, heading);
    if (message) card.appendChild(description);
    fallbackOverlay.appendChild(card);
    document.body.appendChild(fallbackOverlay);

    return startedAt;
  }

  function wait(startedAt, minimumDuration = 1200) {
    const remaining = Math.max(0, minimumDuration - (Date.now() - startedAt));
    return new Promise((resolve) => window.setTimeout(resolve, remaining));
  }

  function hide() {
    if (window.Swal && Swal.isVisible()) {
      Swal.close();
    }

    fallbackOverlay?.remove();
    fallbackOverlay = undefined;
  }

  return { show, wait, hide };
})();
