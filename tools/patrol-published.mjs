#!/usr/bin/env node
// repo の published フラグと Zenn 上の公開状態を突き合わせる。
// Zenn の Web UI で手動公開/非公開にすると repo とずれ、次の push で
// 連携が repo 側の値に戻してしまうため、ずれを定期的に検出する。
import { readFileSync, readdirSync } from "node:fs";
import { join, basename, extname } from "node:path";

const USER = process.env.ZENN_USER || "ait";
const files = readdirSync("articles").filter((f) => extname(f) === ".md");

async function liveState(slug) {
  const url = `https://zenn.dev/${USER}/articles/${slug}`;
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetch(url, {
        method: "GET", redirect: "follow",
        headers: { "user-agent": "Mozilla/5.0 (patrol-published)" },
        signal: AbortSignal.timeout(20000),
      });
      if (res.status === 200) return "live";
      if (res.status === 403 || res.status === 404) return "draft";
      return `unknown:${res.status}`;
    } catch { /* retry */ }
  }
  return "unreachable";
}

const rows = [];
for (const f of files) {
  const slug = basename(f, ".md");
  const text = readFileSync(join("articles", f), "utf8");
  const m = text.match(/^published:\s*(true|false)\s*$/m);
  rows.push({ slug, repo: m ? m[1] : "不明", live: await liveState(slug) });
}

const mismatches = rows.filter(
  (r) => (r.repo === "true" && r.live === "draft") || (r.repo === "false" && r.live === "live")
);
const unreachable = rows.filter((r) => r.live === "unreachable" || r.live.startsWith("unknown"));

for (const r of rows) {
  const mark = mismatches.includes(r) ? "  <= 不整合" : "";
  console.log(`${r.slug.padEnd(36)} repo=${r.repo.padEnd(5)} zenn=${r.live}${mark}`);
}
for (const r of unreachable) console.log(`警告 状態を取得できません: ${r.slug} (${r.live})`);

console.log(`結果: ${rows.length} 記事 / 不整合 ${mismatches.length} / 取得不可 ${unreachable.length}`);
if (mismatches.length > 0) {
  console.error(
    "repo と Zenn の公開状態がずれています。" +
      "Zenn 側で手動公開したなら repo のフラグを合わせてください (放置すると次の push で戻ります)"
  );
  process.exit(1);
}
process.exit(0);
