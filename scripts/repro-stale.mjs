import { writeFileSync } from "node:fs";
import { VIEWPORTS, applyViewport, clickAt, evaluate, openBrowser, settle, visit } from "./cdp.mjs";

const ORIGIN = "http://127.0.0.1:4310";
const OUT = process.argv[2] ?? "/tmp";
const URL_ = (process.argv[3] ?? "math-quest").startsWith("/") ? `${ORIGIN}${process.argv[3]}` : `${ORIGIN}/play/${process.argv[3] ?? "math-quest"}`;
const { cdp, sessionId, close } = await openBrowser(9344);
await applyViewport(cdp, sessionId, VIEWPORTS[1]);
await visit(cdp, sessionId, URL_, 900);

const SNAP = `(() => {
  const prompts = [...document.querySelectorAll("[data-prompt]")].map(p => p.parentElement?.querySelector(".sr-only")?.textContent ?? "?");
  const rows = [...document.querySelectorAll("main ul")].map(u => u.querySelectorAll("li button").length);
  const stages = [...document.querySelectorAll("[data-world] > div")].map(d => ({cls: d.className.slice(0,40), op: getComputedStyle(d).opacity}));
  return { prompts, rows, stages, status: document.querySelector('[role=status]')?.textContent ?? "" };
})()`;
const BTN = (re) => `(() => { const b=[...document.querySelectorAll("main button")].find(b=>${re}.test(b.getAttribute("aria-label")??b.textContent)); if(!b) return null; const r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`;
const TILES = `[...document.querySelectorAll("main li button")].map(b=>{const r=b.getBoundingClientRect();return {label:b.getAttribute("aria-label"),x:r.left+r.width/2,y:r.top+r.height/2}})`;

const play = await evaluate(cdp, sessionId, BTN("/play|let|go|start/i"));
await clickAt(cdp, sessionId, play);
await settle(cdp, sessionId, 900);

let shot = 0;
const snapshot = async (tag) => {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
  writeFileSync(`${OUT}/${String(shot++).padStart(2,"0")}-${tag}.png`, Buffer.from(data, "base64"));
};

for (let q = 0; q < 4; q++) {
  // tap tiles until one is correct
  for (let attempt = 0; attempt < 5; attempt++) {
    const tiles = await evaluate(cdp, sessionId, TILES);
    const t = tiles.find(t => !/already tried|not this one/.test(t.label));
    if (!t) break;
    await clickAt(cdp, sessionId, t);
    await settle(cdp, sessionId, 150);
    const s = await evaluate(cdp, sessionId, SNAP);
    if (/that's the one/.test(JSON.stringify(await evaluate(cdp, sessionId, TILES)))) {
      console.log(`Q${q} correct:`, JSON.stringify(s));
      // sample the transition
      for (let i = 0; i < 14; i++) {
        await settle(cdp, sessionId, 100);
        const ss = await evaluate(cdp, sessionId, SNAP);
        console.log(`  +${150 + (i+1)*100}ms`, JSON.stringify(ss));
        if (i === 9 || i === 10 || i === 11) await snapshot(`q${q}-t${i}`);
      }
      break;
    }
    await settle(cdp, sessionId, 900);
  }
  await settle(cdp, sessionId, 500);
}
await close();
