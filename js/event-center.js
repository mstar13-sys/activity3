/* A small JavaScript multicast pattern: one event calls several handlers.
   Use synchronous handlers here. Finish asynchronous requests before publishing
   their results. Never put passwords, tokens, or full records in console logs. */
const SmartCareEventCenter = {
  fieldLabel: function (name) {
    if (/token/i.test(name)) return "token";
    if (/password/i.test(name)) return "password";
    return name.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  },

  describeData: function (data, eventName = "") {
    const labels = [];
    if (data.password !== undefined || data.checks) labels.push("password");
    if (data.email !== undefined) labels.push("email");
    if (data.message) {
      const label = data.success === false || eventName.includes("failed") ? "error message" : "message";
      labels.push(`${label}: ${data.message}`);
    }
    if (data.errors) {
      Object.keys(data.errors).forEach((field) => {
        labels.push(`error message (${field}): ${data.errors[field]}`);
      });
    }
    if (data.redirect) labels.push(`redirect: ${data.redirect}`);
    if (data.view) labels.push(`view: ${data.view}`);
    if (data.form) {
      labels.push("form");
      const fields = [];
      Array.from(data.form.elements || []).forEach((field) => {
        if (!field.name) return;
        const label = SmartCareEventCenter.fieldLabel(field.name);
        if (!fields.includes(label)) fields.push(label);
      });
      if (fields.length) labels.push(`form fields: ${fields.join(", ")}`);
    }
    if (data.data) labels.push("dashboard records");
    if (data.logoutUrl) labels.push("logout link");
    if (data.loadingStartedAt !== undefined) labels.push("loading start time");
    // Show every other event field by name, including new fields added later.
    // Only the message, redirect, and view above print their values.
    const described = ["password", "checks", "email", "message", "errors", "redirect",
      "view", "form", "data", "logoutUrl", "loadingStartedAt"];
    Object.keys(data).forEach((field) => {
      if (!described.includes(field)) {
        const label = SmartCareEventCenter.fieldLabel(field);
        if (!labels.includes(label)) labels.push(label);
      }
    });
    return labels.length ? labels.join(" | ") : "none";
  },

  create: function () {
    const subscribers = {};

    function subscribe(eventName, handler, label = "Anonymous handler") {
      if (!subscribers[eventName]) subscribers[eventName] = [];
      subscribers[eventName].push({ handler, label });
    }

    function publish(eventName, data = {}) {
      const handlers = subscribers[eventName] || [];
      console.log(`[${eventName}] Event published - ${handlers.length} handlers`);
      console.log(`[${eventName}] Event data: ${SmartCareEventCenter.describeData(data, eventName)}`);
      handlers.forEach((entry) => {
        try {
          entry.handler(data);
          console.log(`[${eventName}] Completed: ${entry.label}\n`,
            `Event data: ${SmartCareEventCenter.describeData(data, eventName)}\n\n`);
        } catch (error) {
          console.error(`[${eventName}] Failed: ${entry.label}`, error);
        }
      });
    }

    return { subscribe, publish };
  },
};

const NotificationCenter = SmartCareEventCenter.create();
