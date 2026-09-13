const fs = require('node:fs');
const path = require('node:path');
const out = __dirname;
const root = path.dirname(out);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const escape = text => String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');

async function main() {
  const targets = await (await fetch('http://127.0.0.1:9227/json')).json();
  const socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, {once:true}));
  let id = 0;
  const pending = new Map(), logs = [], exceptions = [];
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const handler = pending.get(message.id); pending.delete(message.id);
      if (message.error) handler.reject(new Error(JSON.stringify(message.error)));
      else handler.resolve(message.result);
    }
    if (message.method === 'Runtime.consoleAPICalled') {
      logs.push(message.params.args.map(arg => arg.value ?? arg.description ?? '').join(' '));
    }
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
  });
  function call(method, params = {}) {
    return new Promise((resolve,reject) => {
      const next = ++id; pending.set(next,{resolve,reject});
      socket.send(JSON.stringify({id:next,method,params}));
    });
  }
  async function evaluate(expression) {
    const response = await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
    return response.result.value;
  }
  async function shot(name) {
    const result = await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync(path.join(out,name),Buffer.from(result.data,'base64'));
  }
  async function display(html,width,height,name) {
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    await call('Page.navigate',{url:'about:blank'}); await pause(200);
    await evaluate(`document.open(); document.write(${JSON.stringify(html)}); document.close();`);
    await pause(250); await shot(name);
  }
  await call('Page.enable'); await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride',{width:1100,height:1100,deviceScaleFactor:1,mobile:false});
  await call('Page.navigate',{url:'http://127.0.0.1:8123/auth/login.php?mode=signup'});
  for (let n=0;n<40;n++) {
    if (await evaluate(`!!document.getElementById('signupPassword') && typeof SmartCarePasswordStrength !== 'undefined'`)) break;
    await pause(250);
  }
  await pause(800);
  logs.length = 0;
  // Browser input commands trigger the real input listener. No direct publish call.
  await evaluate(`document.getElementById('signupPassword').focus()`);
  await call('Input.insertText',{text:'ClassDemo2026!'});
  await pause(250);
  const evidence = await evaluate(`({label:document.querySelector('#strengthBlock .label').textContent, bars:document.querySelectorAll('#strengthBlock .bars .filled').length, requirements:document.querySelectorAll('#strengthBlock .req-list .met').length})`);
  if (evidence.label !== 'Very Strong' || evidence.bars !== 5 || evidence.requirements !== 5) throw new Error(JSON.stringify(evidence));
  await evaluate('window.scrollTo(0,0)'); await pause(150);
  await shot('01-system.png');
  const flow = logs.filter(line => line.includes('[password:evaluated]'));
  if (flow.filter(line => line.includes('Completed:')).length !== 3) throw new Error('Expected three handlers: '+flow.join('\n'));
  fs.writeFileSync(path.join(out,'console-output.txt'),flow.join('\n'));
  fs.writeFileSync(path.join(out,'capture-results.json'),JSON.stringify({url:'http://127.0.0.1:8123/auth/login.php?mode=signup',evidence,exceptions,flow},null,2));
  const style = `<style>body{margin:0;padding:32px;background:#101927;color:#e9eff8;font-family:Consolas,monospace}h2{font:600 25px Arial;color:#7edcd0;margin:0 0 26px}pre{font:21px/1.65 Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;margin:0} .note{color:#acb8c9;font:18px Arial;margin:0 0 25px}</style>`;
  await display(`${style}<h2>Actual browser console output</h2><p class="note">Captured from Runtime.consoleAPICalled after typing in the signup password field.</p><pre>${escape(flow.join('\n').trim())}</pre>`,1100,680,'02-console.png');
  const source = fs.readFileSync(path.join(root,'js/password-strength.js'),'utf8').split(/\r?\n/);
  function numbered(start,end) { return source.slice(start-1,end).map((line,i)=>String(start+i).padStart(2)+'  '+line).join('\n'); }
  const publishStart = source.findIndex(line=>line.includes('function evaluate(value)'))+1;
  const inputStart = source.findIndex(line=>line.includes('passwordInput.addEventListener'))+1;
  await display(`${style}<h2>js/password-strength.js — action and event data</h2><pre>${escape(numbered(publishStart,publishStart+6)+'\n\n'+numbered(inputStart,inputStart+8))}</pre>`,1100,650,'03-event-source.png');
  const handlerStart = source.findIndex(line=>line.includes('events.subscribe'))+1;
  await display(`${style}<h2>js/password-strength.js — three anonymous handlers</h2><pre style="font-size:19px">${escape(numbered(handlerStart,publishStart-2))}</pre>`,1250,820,'04-handlers.png');
  const hub = fs.readFileSync(path.join(root,'js/event-center.js'),'utf8').split(/\r?\n/);
  const hubStart = hub.findIndex(line=>line.includes('function publish('));
  await display(`${style}<h2>js/event-center.js — invoking the registered handlers</h2><pre style="font-size:20px">${escape(hub.slice(hubStart,hubStart+15).map((line,i)=>String(hubStart+i+1).padStart(2)+'  '+line).join('\n'))}</pre>`,1250,630,'05-dispatch.png');
  function img(name) { return 'data:image/png;base64,'+fs.readFileSync(path.join(out,name)).toString('base64'); }
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>SmartCare — Event-driven implementation</title><style>
    @page{size:A4;margin:15mm}*{box-sizing:border-box}body{font:14px/1.5 Arial,sans-serif;color:#182638;margin:0}section{break-after:page}section:last-child{break-after:auto}h1{font-size:25px;line-height:1.2;margin:6px 0 12px}h2{font-size:19px;margin:0 0 12px}.tag{color:#087b70;font-weight:bold;font-size:12px;letter-spacing:1px}p{margin:10px 0 14px}img{width:100%;height:auto;display:block;border:1px solid #c8d3dc}code{background:#edf3f7;padding:1px 4px}.footer{font-size:11px;color:#596775;margin-top:12px}.caption{border-left:3px solid #008a7c;padding-left:10px}
  </style></head><body>
  <section><div class="tag">SMARTCARE / IMPLEMENTATION EVIDENCE / 1 OF 4</div><h1>One password input, three useful responses</h1><p><b>Meaningful action:</b> entering a signup password gives immediate feedback before account creation. The screenshot shows the actual PHP page served locally.</p><img src="${img('01-system.png')}"><p class="caption">The password remains masked. Its input event causes the requirements checklist, five strength bars, and strength label to update. This capture reached <b>Very Strong</b>, with all five requirements satisfied.</p></section>
  <section><div class="tag">EVENT FLOW AND OUTPUT / 2 OF 4</div><h1>One event invokes three handlers</h1><img src="${img('02-console.png')}"><p class="caption">Actual browser console messages captured after typing in the real password field, presented in a readable transcript view. <code>password:evaluated</code> reports three handlers, then confirms each callback returned: requirements, bars, and label.</p><h2>What information travels with the event?</h2><p>The event carries <b>checks</b> (rule results), <b>metCount</b> (number passed), and <b>empty</b> (whether the input is empty). In this run, five rules passed and the field was not empty.</p><p>The console's short label <code>password</code> refers to password checks; the raw password is not in this event payload. The next page shows the exact object that is passed.</p><p class="footer">Capture method: Chrome DevTools Protocol console events. These are captured program messages, not a screenshot of the DevTools interface. No database account was created for this demonstration.</p></section>
  <section><div class="tag">EVENT SOURCE AND MULTICAST CALL / 3 OF 4</div><h1>The event carries data to its subscribers</h1><img src="${img('03-event-source.png')}"><p class="caption">Screenshot of the current source displayed with line numbers. The input listener calls <code>evaluate</code>, which calculates validation results and publishes <code>{ checks, metCount, empty }</code>. This provides three pieces of event data.</p><img src="${img('05-dispatch.png')}"><p class="caption">The shared event center invokes every registered handler with <code>entry.handler(data)</code>. A completion message is printed after that callback returns.</p></section>
  <section><div class="tag">HANDLERS AND ANONYMOUS FUNCTIONS / 4 OF 4</div><h1>Three separately registered anonymous handlers</h1><img src="${img('04-handlers.png')}"><p class="caption">Each <code>events.subscribe</code> registers an arrow function for the same event. The <code>=&gt;</code> syntax identifies the anonymous/lambda handlers. They update the checklist, strength bars, and label respectively.</p><h2>Requirements demonstrated</h2><p><b>Action:</b> entering a signup password.<br><b>Handlers:</b> three separate subscribers.<br><b>Event data:</b> checks, metCount, empty.<br><b>Anonymous/lambda:</b> all three subscribers use arrow functions.<br><b>Output:</b> captured event publication and handler-completion messages on page 2.</p><p class="footer">Source screenshots show the existing implementation, rendered for legibility. This demonstrates the JavaScript multicast pattern rather than a C# delegate type.</p></section>
  </body></html>`;
  fs.writeFileSync(path.join(out,'submission.html'),html);
  await call('Page.navigate',{url:'file:///'+path.join(out,'submission.html').replaceAll('\\','/')});
  await pause(800);
  await evaluate(`Promise.all(Array.from(document.images).map(img => img.decode()))`);
  const pdf = await call('Page.printToPDF',{printBackground:true,preferCSSPageSize:true});
  const pdfPath = path.join(out,'SmartCare_Event_Implementation.pdf');
  fs.writeFileSync(pdfPath,Buffer.from(pdf.data,'base64'));
  console.log(JSON.stringify({pdf:pdfPath,bytes:fs.statSync(pdfPath).size,evidence,exceptions,handlers:3}));
  socket.close();
}
main().catch(error=>{console.error(error);process.exit(1)});
