document.querySelectorAll("[data-dashboard-action]").forEach((button) => {
  button.addEventListener("click", () => {
    showToast({
      type: "info",
      title: button.dataset.dashboardAction,
      body: "This demo action is ready to connect to your clinic workflow.",
    });
  });
});
