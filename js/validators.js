
const SmartCareValidators = (() => {

  function isValidEmail(value) {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/.test(
      value,
    );
  }

  function isValidPhone(value) {
    if (!/^[+()\-.\s0-9]+$/.test(value)) return false;
    const digitCount = (value.match(/[0-9]/g) || []).length;
    return digitCount == 11;
  }

  function checkPasswordRules(value) {
    return {
      len: value.length >= 8,
      upper: /[A-Z]/.test(value),
      lower: /[a-z]/.test(value),
      num: /[0-9]/.test(value),
      special: /[^A-Za-z0-9]/.test(value),
    };
  }

  function passwordRulesPassed(checks) {
    return Object.values(checks).every(Boolean);
  }

  return {
    isValidEmail,
    isValidPhone,
    checkPasswordRules,
    passwordRulesPassed,
  };
})();
