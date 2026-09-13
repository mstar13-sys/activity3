document.querySelectorAll('[data-dashboard-action]').forEach((button) => {
  button.addEventListener('click', () => {
    const action = button.dataset.dashboardAction;
    if (window.Swal) {
      Swal.fire({
        icon: 'info',
        title: action,
        text: 'This demo action is ready to connect to your clinic workflow.',
        confirmButtonColor: '#003f87',
        position: 'center'
      });
    }
  });
});