document.querySelectorAll('#loginForm, #signupForm').forEach((form) => {
  form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="password"]').forEach((field) => {
    field.value = '';
    field.setAttribute('autocomplete', field.type === 'password' ? 'new-password' : 'off');
  });
});