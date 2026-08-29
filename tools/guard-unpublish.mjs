#!/usr/bin/env node
// published: true → false の変更を検出する。
// Zenn の GitHub 連携は push 時にこの値をそのまま反映するため、
// 公開中の記事を意図せず下書きに戻す変更を、マージ前に止める。
// 意図的に取り下げる場合はコミットメッセージに [unpublish] を含める。
import { execSync } from "node:child_process";

const base = process.argv[2] || process.env.BASE_REF || "origin/main";

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "";
  }
}

const range = `${base}...HEAD`;
const changed = sh(`git diff --name-only ${range} -- articles books`)
  .split("\n")
  .filter((f) => f.endsWith(".md") || f.endsWith("config.yaml"));

if (changed.length === 0) {
  console.log("対象の変更なし");
  process.exit(0);
}

const publishedOf = (ref, file) => {
  const text = ref === null ? sh(`cat "${file}"`) : sh(`git show ${ref}:${file}`);
  const m = text.match(/^published:\s*(true|false)\s*$/m);
  return m ? m[1] : null;
};

const allowed = /\[unpublish\]/.test(sh(`git log --format=%B ${range}`));
const violations = [];

for (const file of changed) {
  const before = publishedOf(base, file);
  const after = publishedOf("HEAD", file);
  if (before === "true" && after === "false") violations.push(file);
}

console.log(`検査: ${changed.length} ファイル (基準 ${base})`);
for (const f of violations) console.log(`  published: true → false  ${f}`);

if (violations.length === 0) {
  console.log("結果: 公開中記事の取り下げなし");
  process.exit(0);
}
if (allowed) {
  console.log("結果: コミットメッセージに [unpublish] があるため意図的な取り下げとして許可");
  process.exit(0);
}
console.error(
  "結果: 公開中の記事を下書きに戻す変更が含まれます。" +
    "意図的ならコミットメッセージに [unpublish] を含めてください"
);
process.exit(1);
