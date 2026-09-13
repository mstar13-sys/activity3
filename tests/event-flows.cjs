// Run with: node tests/event-flows.cjs
// Isolated behavior checks: no database writes or real redirects.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function element() {
  const classes = new Set();
  return {
    value: '', textContent: '', checked: false, disabled: false, dataset: {},
    listeners: {}, style: { setProperty() {}, removeProperty() {} },
    classList: {
      add: (name) => classes.add(name), remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
      toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
    },
    addEventListener(name, handler) { this.listeners[name] = handler; },
    setAttribute(name, value) { this[name] = value; },
    querySelectorAll() { return []; }, querySelector() { return null; },
    reset() { this.resetCount = (this.resetCount || 0) + 1; }, focus() {},
  };
}

function setup() {
  const nodes = {}, logs = [], errors = [], toasts = [], timers = [], requests = [];
  const context = vm.createContext({
    console: { log: (...args) => logs.push(args), error: (...args) => errors.push(args) },
    document: {
      getElementById: (id) => nodes[id] || null,
      querySelectorAll: () => [],
    },
    setTimeout: (fn) => { timers.push(fn); return timers.length; }, clearTimeout() {},
    location: { href: '', assign(url) { this.href = url; } },
    SmartCareFormHelpers: { showError(field, invalid) { field.invalid = invalid; }, clearFieldStates() {} },
    SmartCareLoading: { show: () => 123, wait: () => Promise.resolve(), hide() {} },
    SmartCarePasswordStrength: { reset() {}, evaluate: () => ({ valid: true }) },
    showToast: (data) => toasts.push(data),
    FormData: function (form) { this.source = form; },
    fetch: async (url, options) => {
      requests.push({ url, options });
      return { json: async () => context.response };
    },
  });
  context.window = context;
  function load(file) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8'), context);
  }
  function run(code) { return vm.runInContext(code, context); }
  function form(id, fields) {
    nodes[id] = element();
    const button = element();
    nodes[id].querySelector = () => button;
    nodes[id].action = '/test-endpoint'; nodes[id].method = 'post';
    fields.forEach((name) => { nodes[name] = element(); });
    return button;
  }
  load('event-center.js'); load('validators.js');
  return { nodes, logs, errors, toasts, timers, requests, context, load, run, form };
}

async function settle() { for (let i = 0; i < 15; i++) await Promise.resolve(); }

async function main() {
  const hub = setup();
  hub.run(`
    const calls = [];
    NotificationCenter.subscribe('test', data => calls.push(data.message), 'first');
    NotificationCenter.subscribe('test', () => { throw new Error('Expected test error'); }, 'broken');
    NotificationCenter.subscribe('test', data => calls.push(data.redirect), 'last');
    NotificationCenter.publish('test', { message: 'hello', redirect: '/next' });
  `);
  assert.equal(hub.run('calls.join(",")'), 'hello,/next');
  assert.equal(hub.errors.length, 1);
  assert.ok(!hub.logs.some(entry => String(entry[0]).includes('Completed: broken')));
  const summary = hub.run(`SmartCareEventCenter.describeData({
    message: 'Saved', redirect: '/next', password: 'hidden', csrf_token: 'hidden',
    credential: 'hidden', data: [{email:'private@example.com'}]
  })`);
  assert.equal(summary, 'password | message: Saved | redirect: /next | dashboard records | token | credential');
  assert.equal(hub.run(`SmartCareEventCenter.describeData({
    form: {elements: [{name:'csrf_token',value:'secret-token'}, {name:'password',value:'secret-password'}, {name:'job_title',value:'Nurse'}]},
    requestId: 123
  })`), 'form | form fields: token, password, job title | request id');
  assert.equal(hub.run(`SmartCareEventCenter.describeData({message:'Invalid email'}, 'login:failed')`), 'error message: Invalid email');
  assert.ok(hub.logs.some(entry => String(entry[0]).includes('Event data:')));
  assert.ok(hub.logs.some(entry => String(entry[1]).includes('message: hello')));

  const login = setup();
  login.form('loginForm', ['loginEmail', 'loginPassword', 'loginMessage']);
  login.load('login-notification-events.js'); login.load('login-form.js');
  login.nodes.loginForm.listeners.submit({ preventDefault() {} });
  assert.equal(login.requests.length, 0, 'invalid login must not request authentication');
  login.nodes.loginEmail.value = 'test@example.com'; login.nodes.loginPassword.value = 'Example123!';
  login.context.response = { success: true, message: 'Welcome', redirect: '/patient' };
  login.nodes.loginForm.listeners.submit({ preventDefault() {} }); await settle();
  assert.equal(login.requests[0].options.method, 'post');
  assert.equal(login.requests[0].options.body.source, login.nodes.loginForm);
  assert.equal(login.nodes.loginMessage.textContent, 'Welcome');
  assert.equal(login.toasts.length, 1); assert.equal(login.context.location.href, '');
  login.toasts[0].onClose(); assert.equal(login.context.location.href, '/patient');
  assert.equal(login.errors.length, 0);

  const signup = setup();
  const signupButton = signup.form('signupForm', ['fullName', 'signupEmail', 'phone', 'signupPassword', 'confirmPassword', 'terms']);
  signup.load('signup-form.js');
  signup.nodes.signupForm.listeners.submit({ preventDefault() {} });
  assert.equal(signup.requests.length, 0);
  signup.run(`NotificationCenter.publish('signup:failed', {message:'Try again', errors:{signupEmail:'Already used'}})`);
  assert.equal(signup.nodes.signupEmail.invalid, true); assert.equal(signupButton.disabled, false);
  signup.run(`NotificationCenter.publish('signup:success', {message:'Created', redirect:'login.php'})`);
  assert.equal(signup.nodes.signupForm.resetCount, 1); assert.equal(signupButton.disabled, true);
  assert.equal(signup.context.location.href, ''); signup.toasts[1].onClose();
  assert.equal(signup.context.location.href, 'login.php'); assert.equal(signup.errors.length, 0);

  const google = setup();
  google.context.SMARTCARE_GOOGLE_CLIENT_ID = 'test-client';
  google.context.SMARTCARE_GOOGLE_CONFIGURED = true;
  google.context.document.querySelectorAll = () => [element()];
  google.context.setInterval = () => 1;
  google.load('google-auth.js');
  google.run(`NotificationCenter.publish('google:success', {message:'Welcome',redirect:'/google-dashboard'})`);
  assert.equal(google.toasts[0].body, 'Welcome');
  assert.equal(google.context.location.href, ''); google.timers[0]();
  assert.equal(google.context.location.href, '/google-dashboard'); assert.equal(google.errors.length, 0);

  const password = setup(); password.load('password-strength.js');
  function indicator() {
    const input = element(), block = element(), label = element();
    const bars = Array.from({ length: 5 }, element);
    const rules = {};
    ['len','upper','lower','num','special'].forEach(name => { rules[name] = element(); });
    block.querySelector = (selector) => selector === '.label' ? label : rules[selector.match(/data-rule="(.*?)"/)[1]];
    block.querySelectorAll = selector => selector === '.bars i' ? bars : Object.values(rules);
    const instance = password.context.SmartCarePasswordStrengthFactory.create(input, block);
    return { input, label, bars, rules, instance };
  }
  const first = indicator(), second = indicator();
  first.instance.evaluate('Example123!');
  assert.equal(first.label.textContent, 'Very Strong');
  assert.ok(first.bars.every(bar => bar.classList.contains('filled')));
  assert.equal(second.label.textContent, '', 'another indicator must not be updated');
  first.instance.evaluate(''); assert.equal(first.label.textContent, 'Password strength');
  assert.ok(first.bars.every(bar => !bar.classList.contains('filled')));
  first.instance.evaluate('Example123!'); first.instance.reset();
  assert.ok(Object.values(first.rules).every(rule => !rule.classList.contains('met')));
  assert.equal(password.errors.length, 0);

  const forgot = setup(); const resetButton = forgot.form('forgotForm', ['forgotEmail', 'forgotMessage']);
  forgot.load('forgot-password-form.js'); forgot.nodes.forgotEmail.value = 'test@example.com';
  forgot.context.response = { success: true, message: 'Request processed' };
  forgot.nodes.forgotForm.listeners.submit({ preventDefault() {} }); await settle();
  assert.equal(resetButton.disabled, false); assert.equal(forgot.nodes.forgotForm.resetCount, 1);
  assert.equal(forgot.nodes.forgotMessage.textContent, 'Request processed'); assert.equal(forgot.toasts.length, 1);
  forgot.context.fetch = async () => { throw new Error('offline'); };
  forgot.nodes.forgotForm.listeners.submit({ preventDefault() {} }); await settle();
  assert.equal(resetButton.disabled, false); assert.equal(forgot.toasts[1].type, 'error');
  assert.equal(forgot.errors.length, 0);

  const logout = setup(); logout.load('logout-confirmation.js');
  logout.run(`beginLogout('/logout'); beginLogout('/logout');`);
  assert.equal(logout.logs.filter(entry => String(entry[0]).includes('Event published')).length, 1);
  assert.equal(logout.context.location.href, ''); await settle();
  assert.equal(logout.context.location.href, '/logout'); assert.equal(logout.errors.length, 0);

  // Exercise the actual dashboard result subscribers without database/DOM rendering.
  const admin = setup();
  admin.run(`
    const state = {cache:{services:[],overview:{}},view:'services'};
    const renders = [], loads = [], notices = [];
    function render(view, data) { renders.push(view); }
    function closeModal() {}
    function notify(type, title, message) { notices.push(message); }
    function loadView(view) { loads.push(view); }
  `);
  const adminSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'superadmin-dashboard.js'), 'utf8');
  const start = adminSource.indexOf('  NotificationCenter.subscribe("admin:data-ready"');
  const end = adminSource.indexOf('  document.addEventListener("admin:data-failed"', start);
  assert.ok(start > 0 && end > start);
  admin.run(adminSource.slice(start, end));
  admin.run(`NotificationCenter.publish('admin:data-ready',{view:'services',data:[{name:'Test'}]});`);
  assert.equal(admin.run('state.cache.services[0].name'), 'Test');
  assert.equal(admin.run('renders.join()'), 'services');
  admin.run(`NotificationCenter.publish('admin:mutation-succeeded',{view:'services',message:'Saved'});`);
  assert.equal(admin.run('state.cache.services'), undefined);
  assert.equal(admin.run('loads.join()'), 'services,overview');
  assert.equal(admin.run('notices.join()'), 'Saved'); assert.equal(admin.errors.length, 0);
  console.log('PASS: multicast order/failure isolation, login, signup, Google result, independent password indicators, reset success/network failure, logout guard, dashboard result handlers.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
