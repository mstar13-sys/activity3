
const SmartCareFormHelpers = (() => {
  // Where to hang the field-level message for a given input: the closest
  // `.field` wrapper for normal inputs, or the checkbox row's parent div
  // for the terms checkbox (which isn't wrapped in `.field`).
  function messageContainerFor(inputEl) {
    return (
      inputEl.closest(".field") ||
      (inputEl.closest(".check-row") &&
        inputEl.closest(".check-row").parentElement) ||
      null
    );
  }

  function showError(inputEl, show, message = "") {
    // Invalid fields get a red border/background right on the input
    // itself, plus — when a message is provided — a short line of text
    // underneath explaining exactly what's wrong (e.g. "This email is
    // already registered"), instead of leaving the person to guess why
    // the field turned red. aria-invalid keeps the state available to
    // assistive tech even when there's no message.
    inputEl.classList.toggle("error", show);
    if (inputEl.type !== "checkbox") {
      inputEl.classList.toggle("valid", !show && inputEl.value.trim() !== "");
    }
    inputEl.setAttribute("aria-invalid", show ? "true" : "false");

    const container = messageContainerFor(inputEl);
    if (!container) return;

    let msgEl = container.querySelector(".field-error");

    if (show && message) {
      if (!msgEl) {
        msgEl = document.createElement("p");
        msgEl.className = "field-error";
        msgEl.setAttribute("role", "alert");
        container.appendChild(msgEl);
      }
      msgEl.textContent = message;
      msgEl.style.display = "";
    } else if (msgEl) {
      msgEl.textContent = "";
      msgEl.style.display = "none";
    }
  }

  function clearFieldStates(fields) {
    fields.forEach((el) => {
      el.classList.remove("valid", "error");
      const container = messageContainerFor(el);
      const msgEl = container && container.querySelector(".field-error");
      if (msgEl) {
        msgEl.textContent = "";
        msgEl.style.display = "none";
      }
    });
  }

  return { showError, clearFieldStates };
})();
