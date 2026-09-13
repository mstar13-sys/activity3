let logoutPending = false;

NotificationCenter.subscribe("logout:confirmed", () => {
  logoutPending = true;
  document.querySelectorAll("[data-logout-confirmation]").forEach((link) => {
    link.setAttribute("aria-disabled", "true");
  });
}, "Prevent repeated logout requests");

NotificationCenter.subscribe("logout:confirmed", (data) => {
  data.loadingStartedAt = SmartCareLoading.show({
    title: "Logging out...",
    message: "Please wait while we securely end your session.",
  });
}, "Show logout loading feedback");

NotificationCenter.subscribe("logout:confirmed", (data) => {
  SmartCareLoading.wait(data.loadingStartedAt).then(() => {
    console.log("[logout:confirmed] Loading finished - opening logout endpoint");
    window.location.assign(data.logoutUrl);
  });
}, "Schedule logout navigation after loading");

document.querySelectorAll("[data-logout-confirmation]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    if (logoutPending) return;

    const logoutUrl = link.href;

    if (!window.Swal) {
      if (window.confirm("Are you sure you want to log out?")) {
        beginLogout(logoutUrl);
      }
      return;
    }

    const primaryColor =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim() || "#003f87";

    Swal.fire({
      icon: "warning",
      title: "Log out?",
      text: "Are you sure you want to log out of SmartCare?",
      showCancelButton: true,
      confirmButtonText: "Yes, log out",
      cancelButtonText: "Stay logged in",
      confirmButtonColor: primaryColor,
      reverseButtons: true,
      focusCancel: true,
    }).then((result) => {
      if (result.isConfirmed) {
        beginLogout(logoutUrl);
      }
    });
  });
});

function beginLogout(logoutUrl) {
  if (logoutPending) return;
  NotificationCenter.publish("logout:confirmed", { logoutUrl, loadingStartedAt: 0 });
}
