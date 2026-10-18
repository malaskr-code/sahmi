// Run npm run dev, start Chromium with remote-debugging-port=9222, then npm run test:auth-browser.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const suffix = randomUUID();
const email = `sahmi-ui-${suffix}@example.invalid`;
const password = randomUUID() + "!";
const phone = "00000000";
const accountName = "Sahmi Account Check";
const tab = await (await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener("open", resolve, { once: true }));
const pending = new Map();
let commandId = 0;
let stage = "startup";
let setupScriptId;
const themeErrors = [];
ws.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (!message.id) {
    const details = message.method === "Runtime.exceptionThrown"
      ? message.params.exceptionDetails.text
      : message.method === "Log.entryAdded" && message.params.entry.level === "error"
        ? message.params.entry.text
        : "";
    if (/script tag while rendering|hydration|server rendered HTML|did not match/i.test(details)) themeErrors.push(details);
    return;
  }
  const task = pending.get(message.id);
  pending.delete(message.id);
  message.error ? task.reject(message.error) : task.resolve(message.result);
});
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++commandId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  let response;
  try { response = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); }
  catch (error) { throw new Error(`Browser stage "${stage}" failed: ${error instanceof Error ? error.message : "evaluation failed"}`); }
  const { result, exceptionDetails } = response;
  if (exceptionDetails) throw new Error(JSON.stringify(exceptionDetails));
  return result.value;
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(expression, label) {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (await evaluate(expression)) return;
    await pause(100);
  }
  throw new Error(`Timed out waiting for ${label}: ${await evaluate("JSON.stringify({url:location.href,dir:document.body?.dir,lang:document.documentElement.lang,stored:localStorage.getItem('sahmi-lang'),text:document.body?.innerText.slice(0,350)})")}`);
}
async function setup(lang, dark, width) {
  if (setupScriptId) await cdp("Page.removeScriptToEvaluateOnNewDocument", { identifier: setupScriptId });
  await cdp("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
  ({ identifier: setupScriptId } = await cdp("Page.addScriptToEvaluateOnNewDocument", { source: `
    localStorage.setItem("sahmi-lang",${JSON.stringify(lang)});
    localStorage.setItem("sahmi-theme",${JSON.stringify(dark ? "dark" : "light")});
    localStorage.removeItem("sahmi-gift");
  ` }));
}
async function navigate(path) {
  await cdp("Page.navigate", { url: base + path });
  if (setupScriptId) {
    await cdp("Page.removeScriptToEvaluateOnNewDocument", { identifier: setupScriptId });
    setupScriptId = undefined;
  }
  await waitFor("document.body?.dir === " + JSON.stringify(lang === "ar" ? "rtl" : "ltr"), `document navigation ${path}`);
}
async function setLanguage(target) {
  const direction = target === "ar" ? "rtl" : "ltr";
  if (await evaluate("document.body.dir") !== direction) {
    await evaluate('document.querySelector(`button[aria-label="${document.body.dir==="rtl"?"English":"العربية"}"]`).click()');
    await waitFor(`document.body.dir===${JSON.stringify(direction)}`, `switch to ${target}`);
  }
  lang = target;
}
async function setTheme(dark) {
  if (await evaluate("document.body.classList.contains('dark')") !== dark) {
    await evaluate(`document.querySelector(\`button[aria-label="\${document.body.dir==="rtl"?(${dark}?"الوضع الداكن":"الوضع الفاتح"):(${dark}?"Dark theme":"Light theme")}"]\`).click()`);
    await waitFor(`document.body.classList.contains('dark')===${dark}`, `switch to ${dark ? "dark" : "light"}`);
  }
}
async function fill(id, value) {
  await evaluate(`(()=>{
    const input=document.getElementById(${JSON.stringify(id)});
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;
    setter.call(input,${JSON.stringify(value)});
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  })()`);
}

await cdp("Page.enable");
await cdp("Runtime.enable");
await cdp("Log.enable");
let lang = "en";
let created = false;
try {
  // Both signup and login pages at both supported viewport sizes and appearances.
  for (lang of ["en", "ar"]) for (const dark of [false, true]) for (const width of [390, 1280]) {
    await setup(lang, dark, width);
    for (const path of ["/signup", "/login"]) {
      await navigate(path);
      assert.equal(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), true, `${path} overflows at ${width}px (${lang}, dark=${dark})`);
      await waitFor(`document.body.classList.contains('dark')===${dark}`, "theme initialization");
      assert.equal(await evaluate("document.body.classList.contains('dark')"), dark);
      assert.equal(await evaluate(`document.body.innerText.includes(${JSON.stringify(lang === "ar" ? "إنشاء حساب" : "Create account")}) || document.body.innerText.includes(${JSON.stringify(lang === "ar" ? "تسجيل الدخول" : "Log in")})`), true);
    }
  }

  lang = "en";
  stage = "signup validation";
  await setup(lang, false, 390);
  await navigate("/signup?next=%2Fwallet");
  await evaluate('document.querySelector("form button[type=submit]").click()');
  assert.equal(await evaluate("document.querySelectorAll('[id$=\"-error\"]').length"), 4);
  await fill("auth-name", accountName);
  await fill("auth-email", "not-an-email");
  await fill("auth-phone", phone);
  await fill("auth-password", password);
  await evaluate('document.querySelector("form button[type=submit]").click()');
  await waitFor('document.body.innerText.includes("valid email address")', "English email validation");
  lang = "ar";
  stage = "signup language switch";
  await evaluate('document.querySelector(\'button[aria-label="العربية"]\').click()');
  await waitFor("document.body.dir==='rtl'", "Arabic validation direction");
  assert.equal(await evaluate('document.body.innerText.includes("بريد إلكتروني صحيح")'), true, "Errors update when language changes");
  await fill("auth-email", email);
  await evaluate('document.querySelector("form button[type=submit]").click()');
  await waitFor("location.pathname==='/login' && location.search.includes('registered=1')", "successful signup");
  created = true;
  assert.equal(await evaluate('new URLSearchParams(location.search).get("next")==="/wallet"'), true);
  assert.equal(await evaluate('document.body.innerText.includes("حسابك جاهز")'), true);
  console.log("STEP 5 UI PASS: four required fields, localized validation after language switch, and safe post-signup login return.");

  stage = "wrong password";
  await fill("auth-email", email);
  await fill("auth-password", "definitely-wrong");
  await evaluate('document.querySelector("form button[type=submit]").click()');
  await waitFor('!!document.querySelector("[role=alert]")', "localized login error");
  assert.equal(await evaluate('document.querySelector("[role=alert]").innerText.includes("غير صحيحة")'), true);
  await fill("auth-password", password);
  stage = "successful login";
  await evaluate('document.querySelector("form button[type=submit]").click()');
  await waitFor("location.pathname==='/wallet'", "successful login");
  await waitFor('!!document.querySelector("button[aria-haspopup=menu]")', "account navigation");

  const protectedPages = [
    ["/wallet", ["Your wallet is waiting", "محفظتك بانتظارك"]],
    ["/gifts", ["No gifts yet", "لا توجد هدايا بعد"]],
    ["/portfolio", ["Nothing in your portfolio yet", "لا يوجد شيء في محفظتك بعد"]],
    ["/checkout", ["Checkout is coming soon", "إتمام الطلب قريباً"]],
  ];
  for (const language of ["en", "ar"]) for (const dark of [false, true]) for (const width of [390, 1280]) {
    await setLanguage(language);
    await setTheme(dark);
    await cdp("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
    for (const [path, labels] of protectedPages) {
      await navigate(path);
      await waitFor(`document.body.innerText.includes(${JSON.stringify(labels[language === "ar" ? 1 : 0])})`, `account page ${path}`);
      assert.equal(await evaluate("document.body.dir"), language === "ar" ? "rtl" : "ltr");
      assert.equal(await evaluate("document.body.classList.contains('dark')"), dark);
      assert.equal(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), true, `${path} overflows at ${width}px`);
    }
  }
  await setLanguage("ar");
  await setTheme(true);
  await cdp("Emulation.setDeviceMetricsOverride", { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
  await navigate("/wallet");
  await waitFor('!!document.querySelector("button[aria-haspopup=menu]")', "account menu");
  stage = "account menu";
  await evaluate('document.querySelector("button[aria-haspopup=menu]").click()');
  await waitFor('!!document.querySelector("[role=menu]")', "account menu open");
  for (const label of ["المحفظة", "هداياي", "محفظتي", "تسجيل الخروج"]) {
    assert.equal(await evaluate(`document.querySelector('[role=menu]').innerText.includes(${JSON.stringify(label)})`), true, `Arabic account menu ${label}`);
  }
  assert.equal(await evaluate("document.querySelector('[role=menu]').innerText.includes('الإدارة')"), false);
  await evaluate('document.querySelector(\'[role=menuitem][href="/gifts"]\').click()');
  await waitFor("location.pathname==='/gifts'", "protected signed-in navigation");
  await waitFor('document.body.innerText.includes("لا توجد هدايا بعد")', "Arabic gift empty state");
  assert.equal(await evaluate('document.body.innerText.includes("لا توجد هدايا بعد")'), true);
  assert.equal(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), true);
  await navigate("/wallet");
  assert.equal(await evaluate('document.body.innerText.includes("محفظتك بانتظارك")'), true);
  await waitFor('!!document.querySelector("button[aria-haspopup=menu]")', "restored account menu");
  await evaluate('document.querySelector("button[aria-haspopup=menu]").click()');
  await evaluate('document.querySelector(\'[role=menuitem]:last-child\').click()');
  await waitFor("location.pathname==='/'", "logout navigation");
  await waitFor('!!document.querySelector("a[href=\\"/login\\"]")', "logged-out navbar");
  const me = await fetch(base + "/api/auth/me");
  assert.equal(me.status, 401);
  console.log("STEP 6–7 UI PASS: localized wrong-password message, EN/AR role-based account menu, protected links, logout, and cleared session.");
  assert.deepEqual(themeErrors, [], "theme startup must not produce script or hydration errors");
} finally {
  try {
    if (created) {
      const { connectDB } = await import("../lib/db.ts");
      const { default: User } = await import("../models/User.ts");
      const db = await connectDB();
      await User.deleteOne({ email });
      await db.disconnect();
    }
  } finally { await cdp("Page.close"); ws.close(); }
}
