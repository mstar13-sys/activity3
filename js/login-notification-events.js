/* Login notification handlers. The shared hub is in event-center.js.
   login-form.js publishes status events; the subscribers below update the
   inline message and display the appropriate toast notification. */

let loginMessageTimer;

function clearLoginMessage() {
  window.clearTimeout(loginMessageTimer);
  loginMessageTimer = undefined;

  const area = document.getElementById("loginMessage");
  if (!area) return;
  area.textContent = "";
  area.className = "message-area";
}

function writeLoginMessage(text, type = "info") {
  const area = document.getElementById("loginMessage");
  if (!area) return;

  window.clearTimeout(loginMessageTimer);
  area.textContent = text;
  area.className = `message-area ${type}`;

  if (type === "error") {
    loginMessageTimer = window.setTimeout(clearLoginMessage, 5000);
  }
}

NotificationCenter.subscribe("login:attempt", (data) => {
  writeLoginMessage("Validating credentials...", "info");
}, "Show credential validation message");

// One success event invokes three independent subscribers in registration order.
function updateLoginSuccessMessage(data) {
  writeLoginMessage(data.message, "success");
}

function notifyLoginSuccess(data) {
  showToast({
    type: "success",
    title: "Logged in!",
    body: data.message,
    onClose: () => {
      window.location.href = data.redirect || "../index.php";
    },
  });
}

NotificationCenter.subscribe("login:success", updateLoginSuccessMessage, "Update inline success message");
NotificationCenter.subscribe("login:success", notifyLoginSuccess, "Request success toast");
// Anonymous handler: report the result using both pieces of event data.
NotificationCenter.subscribe("login:success", (data) => {
  console.log("Login result", {
    message: data.message,
    redirect: data.redirect,
  });
  console.log("[login:success] This is a lambda or anonymous function - login result reported.");
}, "Report login result");

NotificationCenter.subscribe("login:failed", (data) => {
  writeLoginMessage(data.message, "error");
}, "Update inline login error");
NotificationCenter.subscribe("login:failed", (data) => {
  showToast({ type: "error", title: "Login failed", body: data.message });
}, "Request login error toast");

NotificationCenter.subscribe("login:editing", clearLoginMessage, "Clear previous login message");
