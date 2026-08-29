#!/usr/bin/env node
// クリシェ検査の結果を JSON で受け取り、しきい値で判定する。
// 表示文言の一致で判定すると上流の文言変更で壊れるため、件数で判定する。
// 既定は error のみ失敗。--strict で warn/info も失敗にする。
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const strict = process.argv.includes("--strict");
const cli = process.env.DEAD_CLICHE_CLI || "github:BoxPistols/ux-writing-dead-cliche";

// CLI はグロブもディレクトリも展開しないため、対象ファイルを自分で集める
function collect(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) collect(p, out);
    else if (extname(p) === ".md") out.push(p);
  }
  return out;
}
const targets = [...collect("articles"), ...collect("books")].sort();
if (targets.length === 0) { console.error("対象ファイルがありません"); process.exit(2); }

let raw;
try {
  const args = cli.endsWith(".mjs")
    ? [cli, "check", "--format", "json", ...targets]
    : ["--yes", cli, "check", "--format", "json", ...targets];
  const bin = cli.endsWith(".mjs") ? "node" : "npx";
  raw = execFileSync(bin, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  // 検出があると exit 1 になるため、stdout は取り出せる
  raw = e.stdout || "";
  if (!raw) { console.error("検査コマンドを実行できませんでした"); process.exit(2); }
}

const start = raw.indexOf("{");
if (start === -1) { console.error("JSON を取得できませんでした:\n" + raw.slice(0, 500)); process.exit(2); }
const data = JSON.parse(raw.slice(start));

const all = data.results.flatMap((r) => r.violations.map((v) => ({ ...v, file: r.file })));
const bySeverity = { error: 0, warn: 0, info: 0 };
for (const v of all) bySeverity[v.severity] = (bySeverity[v.severity] ?? 0) + 1;

for (const v of all) {
  console.log(`${v.severity} ${v.file}:${v.line ?? "?"} [${v.ruleId}] 「${v.matched}」`);
}
console.log(
  `検査: ${data.results.length} ファイル / 検出 ${data.total} 件 ` +
    `(error ${bySeverity.error} / warn ${bySeverity.warn} / info ${bySeverity.info})`
);
console.log("注記: 辞書にある表現の有無だけを見ています。検出ゼロは文章の質を保証しません");

const fail = strict ? data.total : bySeverity.error;
if (fail > 0) {
  console.error(strict ? "検出があるため失敗 (--strict)" : "error 級の検出があるため失敗");
  process.exit(1);
}
process.exit(0);
