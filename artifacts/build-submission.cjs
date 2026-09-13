const fs = require('node:fs');
const path = require('node:path');
const folder = __dirname;
const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const name = process.argv[2] || '________________________________';
const section = process.argv[3] || '________________________________';
const surname = process.argv[4] || 'Surname';
const image = file => 'data:image/png;base64,' + fs.readFileSync(path.join(folder,file)).toString('base64');
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Activity 3 - SmartCare</title><style>
@page{size:A4;margin:15mm}*{box-sizing:border-box}body{margin:0;color:#182938;font:14px/1.45 Arial,sans-serif}section{break-after:page}section:last-child{break-after:auto}.top{font-size:11px;color:#136c64;font-weight:bold;letter-spacing:1px}h1{font-size:25px;line-height:1.2;margin:7px 0 12px}h2{font-size:18px;margin:15px 0 8px}p{margin:8px 0 12px}img{width:100%;display:block;border:1px solid #ccd6dd}.caption{font-size:13px;color:#344b5b;margin:8px 0 14px}.info{background:#f0f5f7;padding:10px 14px;margin-bottom:12px}.info p{margin:2px 0}table{width:100%;border-collapse:collapse;font-size:13px;margin:12px 0}td,th{border:1px solid #cbd6dc;padding:8px;text-align:left}th{background:#edf5f3}code{font:12px Consolas,monospace;background:#f0f3f5;padding:2px 3px}.small{font-size:11px;color:#546674}.system{width:89%;margin:auto}
</style></head><body>
<section><div class="top">ACTIVITY 3 - DELEGATES AND EVENTS | PAGE 1 OF 4</div><h1>SmartCare: One Event, Three Responses</h1>
<div class="info"><p><b>Student name:</b> ${escape(name)}</p><p><b>Section:</b> ${escape(section)}</p><p><b>System name:</b> SmartCare</p></div>
<p><b>Selected action:</b> typing a password on the Sign Up page.<br><b>Event:</b> <code>password:evaluated</code></p>
<img class="system" src="${image('01-system.png')}">
<p class="caption"><b>Figure 1.</b> When the user types a password, SmartCare checks it and updates the checklist, strength bars, and strength label. This helps the user see which password rules they have passed before creating an account.</p></section>

<section><div class="top">MULTIPLE HANDLERS AND ANONYMOUS FUNCTIONS | PAGE 2 OF 4</div><h1>Three handlers respond to the same event</h1>
<p>Each handler has a different job. All three listen to <code>password:evaluated</code>.</p>
<table><tr><th>Handler</th><th>What it does</th><th>Data it uses</th></tr>
<tr><td><b>Handler 1</b></td><td>Marks the password rules that passed.</td><td><code>checks</code></td></tr>
<tr><td><b>Handler 2</b></td><td>Fills the strength bars.</td><td><code>metCount</code>, <code>empty</code></td></tr>
<tr><td><b>Handler 3</b></td><td>Changes the strength label and its color.</td><td><code>metCount</code>, <code>empty</code></td></tr></table>
<img src="${image('04-handlers.png')}">
<p class="caption"><b>Figure 2.</b> The three <code>events.subscribe</code> calls in <code>js/password-strength.js</code> register Handler 1, Handler 2, and Handler 3, from top to bottom.</p>
<h2>Where is the anonymous or lambda function?</h2>
<p>Each handler uses an arrow function with the <code>=&gt;</code> symbol. For example, Handler 1 starts with <code>({ checks }) =&gt; {</code>. It has no function name. It runs when the event is published and updates the checklist.</p>
<p class="small">The labels such as “Update password requirements” describe the handlers in the console. They are not function names. The screenshot shows the current source code displayed with line numbers.</p></section>

<section><div class="top">EVENT DATA AND EVENT FLOW | PAGE 3 OF 4</div><h1>What data is passed with the event?</h1>
<table><tr><th>Event data</th><th>Meaning</th></tr><tr><td><code>checks</code></td><td>The pass or fail result for each password rule.</td></tr><tr><td><code>metCount</code></td><td>The number of rules passed.</td></tr><tr><td><code>empty</code></td><td>Whether the password field is empty.</td></tr></table>
<img style="width:84%;margin:auto" src="${image('03-event-source.png')}">
<p class="caption"><b>Figure 3.</b> The input listener calls <code>evaluate</code>. This function checks the password and passes <code>{ checks, metCount, empty }</code> with the event. The raw password is not passed in this event.</p>
<img style="width:84%;margin:auto" src="${image('05-dispatch.png')}">
<p class="caption"><b>Figure 4.</b> The event center calls each registered handler using <code>entry.handler(data)</code>. After the handler returns, it prints a completion message. This shows that one event can call several functions.</p></section>

<section><div class="top">CONSOLE OUTPUT AND REFLECTION | PAGE 4 OF 4</div><h1>The console shows the handlers running</h1>
<p>I opened the browser Console, cleared the old messages, and entered a password in the Sign Up form. The screenshot below shows the result.</p>
<img src="${image('06-browser-console.png')}">
<p class="caption"><b>Figure 5.</b> The actual browser Console shows one <code>password:evaluated</code> event and three completed handlers. “Update password requirements” is Handler 1, “Update strength bars” is Handler 2, and “Update strength label” is Handler 3.</p>
<p>The console uses short labels for the data. Here, <code>password</code> means the password checks, <code>met count</code> means the number of passed rules, and <code>empty</code> means whether the field is empty. The exact field names and their use are shown on pages 2 and 3.</p>
<h2>Short reflection</h2>
<p>This feature shows how one action can cause several useful responses. When a password is entered, one event passes the check results to three handlers, and each handler updates a different part of the page. Using separate handlers makes the code easier to follow and lets the same password indicator be used in other forms.</p>
<p class="small">This demonstration uses the existing SmartCare system. No test account was created. The system and Console images are browser screenshots; the code images show the existing source displayed for reading.</p></section>
</body></html>`;
fs.writeFileSync(path.join(folder,'submission.html'),html);

async function main() {
  const target = await (await fetch('http://127.0.0.1:9227/json/new?about:blank',{method:'PUT'})).json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
  let id=0; const pending=new Map();
  socket.addEventListener('message',event=>{
    const m=JSON.parse(event.data); if(!m.id)return;
    const p=pending.get(m.id);pending.delete(m.id);
    if(m.error)p.reject(new Error(JSON.stringify(m.error)));else p.resolve(m.result);
  });
  const call=(method,params={})=>new Promise((resolve,reject)=>{const next=++id;pending.set(next,{resolve,reject});socket.send(JSON.stringify({id:next,method,params}));});
  await call('Page.enable');
  await call('Page.navigate',{url:'file:///'+path.join(folder,'submission.html').replaceAll('\\','/')});
  await new Promise(r=>setTimeout(r,700));
  await call('Runtime.evaluate',{expression:'Promise.all(Array.from(document.images).map(img=>img.decode()))',awaitPromise:true});
  const result=await call('Page.printToPDF',{printBackground:true,preferCSSPageSize:true});
  const pdf=Buffer.from(result.data,'base64');
  const filename = surname.replace(/[^a-zA-Z0-9_-]/g,'')+'_Act3.pdf';
  fs.writeFileSync(path.join(folder,filename),pdf);
  fs.writeFileSync(path.join(folder,'SmartCare_Event_Implementation.pdf'),pdf);
  console.log(JSON.stringify({filename,bytes:pdf.length,pages:(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length}));
  socket.close();
}
main().catch(error=>{console.error(error);process.exit(1)});

