const SUCCESS_ICON =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="m8.5 12.3 2.4 2.4 4.6-5.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const ERROR_ICON =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 8v5M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

const INFO_ICON =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 11v5M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

function showToast({
  type = "success",
  title,
  body,
  duration = 3200,
  onClose,
}) {
  if (window.Swal) {
    Swal.fire({
      toast: true,
      icon: ["success", "error", "info", "warning"].includes(type)
        ? type
        : "info",
      title,
      text: body,
      timer: duration,
      timerProgressBar: true,
      showConfirmButton: false,
      position: "top-end",
      didOpen: (toast) => {
        toast.addEventListener("mouseenter", () => Swal.stopTimer());
        toast.addEventListener("mouseleave", () => Swal.resumeTimer());
      },
    }).then(() => {
      if (onClose) onClose();
    });
    return;
  }

  const stack = document.getElementById("toastStack");
  if (!stack) {
    if (onClose) onClose();
    return;
  }

  const el = document.createElement("div");
  el.className = `toast ${type}`;

  const icon = document.createElement("span");
  icon.className = "ic";
  icon.innerHTML =
    type === "error" ? ERROR_ICON : type === "info" ? INFO_ICON : SUCCESS_ICON;

  const content = document.createElement("div");
  const heading = document.createElement("p");
  const message = document.createElement("p");
  heading.className = "tt";
  message.className = "tb";
  heading.textContent = title;
  message.textContent = body;
  content.append(heading, message);
  el.append(icon, content);

  stack.appendChild(el);

  setTimeout(() => {
    el.classList.add("leaving");
    setTimeout(() => {
      el.remove();
      if (onClose) onClose();
    }, 320);
  }, duration);
}
