#!/usr/bin/env node
// 記事・books の外部リンク生死検査。恒久的な消失 (404/410) のみ失敗にする。
// 一時的な失敗 (timeout / 5xx / bot 拒否) は警告として報告し、exit 0 で通す。
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SKIP = /localhost|127\.0\.0\.1|example\.com|example-analytics|\$|<|xxxxx|your-account|YOUR|OWNER\/REPO|USERNAME|zenn\.dev\/ait\/articles/;
const files = [];
for (const dir of ["articles", "books/web-quality-a11y-guide"]) {
  for (const f of readdirSync(dir)) if (f.endsWith(".md")) files.push(join(dir, f));
}
const urls = new Map(); // url -> first file
for (const f of files) {
  // コードフェンス内はプレースホルダURLが多いため対象外 (実URLは本文側で拾われる)
  const text = readFileSync(f, "utf8").split("\n")
    .reduce((acc, line) => {
      if (line.startsWith("```")) { acc.inFence = !acc.inFence; return acc; }
      if (!acc.inFence) acc.out.push(line);
      return acc;
    }, { out: [], inFence: false }).out.join("\n");
  for (const m of text.matchAll(/https?:\/\/[^\s)"\]<>`*']+/g)) {
    const u = m[0].replace(/[.,。、)']+$/, "");
    if (!SKIP.test(u) && !urls.has(u)) urls.set(u, f);
  }
}
console.log(`検査対象: ${urls.size} URL / ${files.length} ファイル`);

async function check(url) {
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetch(url, {
        method: "GET", redirect: "follow",
        headers: { "user-agent": "Mozilla/5.0 (patrol-links)" },
        signal: AbortSignal.timeout(20000),
      });
      return res.status;
    } catch { /* retry */ }
  }
  return 0;
}

const entries = [...urls.entries()];
const results = [];
const POOL = 8;
let idx = 0;
await Promise.all(Array.from({ length: POOL }, async () => {
  while (idx < entries.length) {
    const [url, file] = entries[idx++];
    results.push([await check(url), url, file]);
  }
}));

const dead = results.filter(([s]) => s === 404 || s === 410);
const warn = results.filter(([s]) => s !== 200 && s !== 404 && s !== 410);
for (const [s, u, f] of warn) console.log(`警告 ${s || "接続不可"} ${u} (${f})`);
for (const [s, u, f] of dead) console.error(`消失 ${s} ${u} (${f})`);
console.log(`結果: 200=${results.length - dead.length - warn.length} 警告=${warn.length} 消失=${dead.length}`);
process.exit(dead.length > 0 ? 1 : 0);
