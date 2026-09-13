
const SUCCESS_ICON =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="m8.5 12.3 2.4 2.4 4.6-5.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const ERROR_ICON =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 8v5M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

function showToast({ type = "success", title, body }) {
  if (window.Swal) {
    // Centered, self-dismissing alert — same "center" position as
    // showSuccessDialog() below, so every SweetAlert in the app appears
    // in the same spot instead of some in a corner and some centered.
    Swal.fire({
      icon: type === "error" ? "error" : "success",
      title,
      text: body,
      timer: 3200,
      timerProgressBar: true,
      showConfirmButton: false,
      position: "center",
    });
    return;
  }

  const stack = document.getElementById("toastStack");

  const el = document.createElement("div");
  el.className = "toast" + (type === "error" ? " error" : "");
  el.innerHTML =
    `<span class="ic">${type === "error" ? ERROR_ICON : SUCCESS_ICON}</span>` +
    `<div><p class="tt">${title}</p><p class="tb">${body}</p></div>`;

  stack.appendChild(el);

  // Auto-dismiss after a few seconds.
  setTimeout(() => {
    el.classList.add("leaving");
    setTimeout(() => el.remove(), 320);
  }, 4200);
}

function showSuccessDialog({
  title,
  text,
  confirmButtonText = "OK",
  onConfirm,
}) {
  const primaryColor =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--primary")
      .trim() || "#003f87";

  if (window.Swal) {
    Swal.fire({
      icon: "success",
      title,
      text,
      confirmButtonText,
      confirmButtonColor: primaryColor,
      position: "center",
      allowOutsideClick: false,
      allowEscapeKey: false,
    }).then(() => {
      if (onConfirm) onConfirm();
    });
    return;
  }

  // Fallback if SweetAlert2 didn't load for some reason — still gate the
  // redirect behind an acknowledgment instead of skipping it silently.
  window.alert(text ? `${title}\n\n${text}` : title);
  if (onConfirm) onConfirm();
}
