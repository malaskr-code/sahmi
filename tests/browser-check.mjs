// Optional browser smoke test: run Chromium with --remote-debugging-port=9222 first.
import assert from "node:assert/strict";
const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const tab = await (await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener("open", resolve, { once: true }));
let nextId = 0;
const pending = new Map();
const errors = [];
const network = [];
ws.addEventListener("message", ({ data }) => {
  const event = JSON.parse(data);
  if (event.id) {
    const task = pending.get(event.id);
    pending.delete(event.id);
    event.error ? task.reject(event.error) : task.resolve(event.result);
  }
  if (event.method === "Runtime.exceptionThrown") errors.push(event.params.exceptionDetails);
  if (event.method === "Network.requestWillBeSent") network.push(event.params.request.url);
});
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(expression, message) {
  for (let i = 0; i < 100; i++) {
    if (await evaluate(expression)) return;
    await sleep(100);
  }
  throw new Error(`Timed out: ${message}; ${await evaluate('JSON.stringify({url:location.href,dir:document.body?.dir,text:document.body?.innerText.slice(0,700)})')}; exceptions=${JSON.stringify(errors)}`);
}
await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
let setupId;
async function setup(lang, dark, gift = null, fail = false) {
  if (setupId) await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: setupId });
  ({ identifier: setupId } = await send("Page.addScriptToEvaluateOnNewDocument", { source: `
    localStorage.setItem("sahmi-lang", ${JSON.stringify(lang)});
    localStorage.setItem("sahmi-theme", ${JSON.stringify(dark ? "dark" : "light")});
    ${gift ? `localStorage.setItem("sahmi-gift",${JSON.stringify(JSON.stringify(gift))});` : 'localStorage.removeItem("sahmi-gift");'}
    window.__failProducts=${fail};
    const originalFetch=window.fetch;
    window.fetch=async function(input,options){
      if(String(input).startsWith("/api/products")&&window.__failProducts){
        await new Promise(resolve=>setTimeout(resolve,600));
        return new Response(JSON.stringify({error:"Database unavailable"}),{status:500,headers:{"Content-Type":"application/json"}});
      }
      return originalFetch.call(this,input,options);
    };
  ` }));
}
async function navigate(path, lang) {
  await send("Page.navigate", { url: base + path });
  await waitFor(`document.body?.dir===${JSON.stringify(lang === "ar" ? "rtl" : "ltr")}`, "hydration");
}
const products = await (await fetch(base + "/api/products")).json();
const gift = { product: { ...products[0], price: 999 }, shares: 10, theme: "birthday" };
let checks = 0;
try {
  for (const lang of ["en", "ar"]) for (const dark of [false, true]) for (const width of [390, 1280]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
    await setup(lang, dark, gift);
    for (const path of ["/", "/products", "/products/kfh", "/cart"]) {
      await navigate(path, lang);
      const ready = path === "/" ? 'document.querySelectorAll("a[href^=\\"/products?sector=\\"]").length===5'
        : path === "/products" ? 'document.querySelectorAll("a[href^=\\"/products/\\"]").length===12'
        : path === "/cart" ? '!!document.querySelector("a[href*=\\"gift-builder\\"]")'
        : '!!document.querySelector("#gift-builder")';
      await waitFor(ready, path);
      assert.equal(await evaluate("document.documentElement.scrollWidth<=window.innerWidth"), true, `Overflow ${lang}/${dark}/${width}/${path}`);
      assert.equal(await evaluate('document.body.classList.contains("dark")'), dark);
      if (path.startsWith("/products")) {
        assert.equal(await evaluate('!!document.querySelector("time[datetime]")'), true);
        assert.equal(await evaluate(`document.body.innerText.includes(${JSON.stringify(lang === "ar" ? "الأسعار كما في" : "Prices as of")})`), true);
      }
      if (path === "/cart") {
        assert.equal(await evaluate('document.body.innerText.includes("999")'), false, "Cart must use database price");
        assert.equal(await evaluate('document.body.innerText.includes("Birthday")||document.body.innerText.includes("عيد الميلاد")'), true);
      }
      checks++;
    }
  }
  // A failed product request must show loading first, then a localized retry that recovers.
  for (const lang of ["en", "ar"]) {
    await setup(lang, true, gift, true);
    await navigate("/products", lang);
    await waitFor('!!document.querySelector("[role=status]")', "loading state");
    await waitFor('!!document.querySelector("[role=alert] button")', "retry state");
    assert.equal(await evaluate(`document.querySelector("[role=alert]").innerText.includes(${JSON.stringify(lang === "ar" ? "تعذر تحميل المتجر." : "We couldn’t load the store.")})`), true);
    await evaluate('window.__failProducts=false;document.querySelector("[role=alert] button").click()');
    await waitFor('document.querySelectorAll("a[href^=\\"/products/\\"]").length===12', "retry recovery");
  }
  // New gifts still require quantity and card theme.
  await setup("en", false);
  await navigate("/products/kfh", "en");
  await waitFor('!!document.querySelector("#gift-builder")', "builder");
  assert.equal(await evaluate('document.querySelectorAll("button[aria-pressed]").length'), 0);
  await evaluate('[...document.querySelectorAll("#gift-builder button")].find(b=>b.textContent.trim()==="50").click()');
  await waitFor('document.querySelectorAll("button[aria-pressed]").length===6', "themes");
  assert.equal(await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="Add to cart").disabled'), true);
  await evaluate('document.querySelectorAll("button[aria-pressed]")[2].click()');
  await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="Add to cart").click()');
  await waitFor('JSON.parse(localStorage.getItem("sahmi-gift")||"null")?.shares===50', "saved gift");
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("sahmi-gift")).theme'), "birthday");
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("sahmi-gift")).product.price'), products[0].price);
  assert.equal(network.some(url => url.includes("api.oanor.com")), false, "Stock API must not be called by browser");
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log(`PASS: ${checks} language/theme/viewport/page checks; bilingual loading/error/retry; live cart pricing; gift themes; no browser stock calls or runtime exceptions.`);
} finally {
  await send("Page.close");
  ws.close();
}
