const fs = require('node:fs');
const path = require('node:path');
const pause = ms => new Promise(r => setTimeout(r,ms));
async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise(r => socket.addEventListener('open',r,{once:true}));
  let id = 0; const requests = new Map();
  socket.addEventListener('message', e => {
    const message = JSON.parse(e.data);
    if (!message.id) return;
    const request = requests.get(message.id); requests.delete(message.id);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
  });
  const call = (method,params={}) => new Promise((resolve,reject)=>{
    const next=++id; requests.set(next,{resolve,reject});
    socket.send(JSON.stringify({id:next,method,params}));
  });
  const evaluate = async expression => {
    const r = await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  return {socket,call,evaluate};
}
async function main() {
  const targets = await (await fetch('http://127.0.0.1:9227/json')).json();
  const target = targets.find(t=>t.type==='page' && !t.url.startsWith('devtools:'));
  const app = await connect(target.webSocketDebuggerUrl);
  await app.call('Page.enable');
  await app.call('Page.navigate',{url:'http://127.0.0.1:8123/auth/login.php?mode=signup'});
  for(let n=0;n<40;n++) {
    if(await app.evaluate(`typeof SmartCarePasswordStrength !== 'undefined'`)) break;
    await pause(250);
  }
  const newTarget = await (await fetch('http://127.0.0.1:9227/json/new?about:blank',{method:'PUT'})).json();
  const dev = await connect(newTarget.webSocketDebuggerUrl);
  await dev.call('Page.enable');
  await dev.call('Emulation.setDeviceMetricsOverride',{width:900,height:620,deviceScaleFactor:2,mobile:false});
  await dev.call('Page.navigate',{url:`devtools://devtools/bundled/devtools_app.html?panel=console&ws=127.0.0.1:9227/devtools/page/${target.id}`});
  await pause(2500);
  console.log(await dev.evaluate(`document.body.innerText.slice(0,1500)`));
  // Select the real Console tab even if DevTools restored another panel.
  await dev.evaluate(`(() => {
    function find(root) {
      for(const el of root.querySelectorAll('*')) {
        if(el.getAttribute('role') === 'tab' && el.textContent.trim() === 'Console') {el.click(); return true;}
        if(el.shadowRoot && find(el.shadowRoot)) return true;
      }
      return false;
    }
    find(document);
  })()`);
  await app.evaluate(`console.clear(); document.getElementById('signupPassword').focus()`);
  await app.call('Input.insertText',{text:'ClassDemo2026!'});
  await pause(700);
  await dev.evaluate(`(() => {
    function filter(root) {
      for(const el of root.querySelectorAll('*')) {
        if(el.tagName === 'INPUT' && (el.getAttribute('placeholder') === 'Filter' || el.getAttribute('aria-label') === 'Filter')) {
          el.value = 'password:evaluated'; el.dispatchEvent(new Event('input',{bubbles:true})); return true;
        }
        if(el.shadowRoot && filter(el.shadowRoot)) return true;
      }
      return false;
    }
    return filter(document);
  })()`);
  await pause(300);
  const image = await dev.call('Page.captureScreenshot',{format:'png'});
  fs.writeFileSync(path.join(__dirname,'06-browser-console.png'),Buffer.from(image.data,'base64'));
  console.log(await dev.evaluate(`document.body.innerText.slice(0,2000)`));
  app.socket.close(); dev.socket.close();
}
main().catch(e=>{console.error(e);process.exit(1)});

