#!/usr/bin/env node
// クリシェ検査。判定は ux-writing-dead-cliche の終了コードに委ねる。
//   既定       : warn 以上で失敗
//   --strict   : info も含めて失敗 (このリポジトリの基準)
// 表示文言は予告なく変わるため、文言での判定はしない (上流 README の出力契約)。
// CLI はグロブもディレクトリも展開しないので、対象ファイルはここで集める。
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const strict = process.argv.includes("--strict");
const cli = process.env.DEAD_CLICHE_CLI || "github:BoxPistols/ux-writing-dead-cliche";

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

const flags = strict ? ["--strict"] : [];
const isLocal = cli.endsWith(".mjs");
const bin = isLocal ? "node" : "npx";
const args = isLocal ? [cli, "check", ...flags, ...targets] : ["--yes", cli, "check", ...flags, ...targets];

console.log(`検査対象: ${targets.length} ファイル${strict ? " (--strict: info も失敗条件)" : ""}`);
try {
  execFileSync(bin, args, { stdio: "inherit", maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  console.error("注記: 辞書にある既知のパターンの有無だけを見ています。検出ゼロは文章の質を保証しません");
  process.exit(e.status ?? 1);
}
console.log("注記: 辞書にある既知のパターンの有無だけを見ています。検出ゼロは文章の質を保証しません");
