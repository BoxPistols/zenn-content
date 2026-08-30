#!/usr/bin/env node
// 記事・本のコードブロックを機械検査する。
// 主目的は「参照先が存在しない id」の検出。aria-labelledby や for が指す先が
// 同じブロックに無いと、支援技術には何も伝わらないが見た目には現れない。
// 実際に 02-semantic-aria のタブ例、05-form-structure の label、07-form-a11y の
// aria-errormessage の 3 件がこの形で壊れていた。
//
// 静的な文字列照合なので限界がある。ブロックをまたぐ参照や動的に組み立てる id は
// 追えない。意図してブロック外を参照する例には <!-- allow-external-ref --> を直前に置く。
// 構文検査は外部パーサ (esbuild 等) が要るため、ここでは行わない。
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";

const ARTICLES_DIR = "articles";
const BOOKS_DIR = "books";

const errors = [];
const warns = [];
const err = (loc, msg) => errors.push(`${loc}: ${msg}`);
const warn = (loc, msg) => warns.push(`${loc}: ${msg}`);

// id を参照する属性。値が空白区切りの複数 id を取りうるものを含む。
const REF_ATTRS = [
  "aria-describedby",
  "aria-labelledby",
  "aria-errormessage",
  "aria-controls",
  "aria-owns",
  "aria-activedescendant",
  "aria-details",
  "htmlFor",
  "for",
  "list",
];

// 閉じタグを持たない要素
const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

// 「悪い例」として意図的に壊した例を示している文脈
const BAD_EXAMPLE_RE = /悪い例|NG|問題のある|やってはいけない|アンチパターン|避けるべき|間違[いっ]/;
const ALLOW_EXTERNAL_RE = /<!--\s*allow-external-ref\s*-->/;

const CODE_LANGS = new Set(["tsx", "jsx", "ts", "typescript", "js", "javascript", "html"]);

function extractBlocks(text) {
  const lines = text.split("\n");
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const open = lines[i].match(/^```([a-zA-Z0-9]*)\s*$/);
    if (!open) continue;
    let j = i + 1;
    while (j < lines.length && !/^```\s*$/.test(lines[j])) j++;
    const context = lines.slice(Math.max(0, i - 6), i).join("\n");
    blocks.push({
      lang: open[1] || "none",
      line: i + 1,
      body: lines.slice(i + 1, j).join("\n"),
      badExample: BAD_EXAMPLE_RE.test(context),
      allowExternal: ALLOW_EXTERNAL_RE.test(context),
    });
    i = j;
  }
  return blocks;
}

// HTML コメントと JSX コメントを外す。コメント内のタグ名を実体と誤認しないため。
function stripComments(body) {
  return body.replace(/<!--[\s\S]*?-->/g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
}

function collectIds(body) {
  const ids = new Set();
  for (const m of body.matchAll(/\bid=["']([^"']+)["']/g)) ids.add(m[1]);
  // id={`x-${i}`} のような動的生成でも、リテラル部分は拾っておく
  for (const m of body.matchAll(/\bid=\{([^}]*)\}/g)) {
    for (const s of m[1].matchAll(/["']([A-Za-z][\w-]*)["']/g)) ids.add(s[1]);
  }
  return ids;
}

function collectRefs(body) {
  const refs = [];
  for (const attr of REF_ATTRS) {
    for (const m of body.matchAll(new RegExp(`\\b${attr}=["']([^"']+)["']`, "g"))) {
      for (const token of m[1].trim().split(/\s+/)) refs.push({ attr, token });
    }
    for (const m of body.matchAll(new RegExp(`\\b${attr}=\\{([^}]*)\\}`, "g"))) {
      for (const s of m[1].matchAll(/["']([A-Za-z][\w-]*)["']/g)) refs.push({ attr, token: s[1] });
    }
  }
  return refs;
}

function checkTagBalance(body) {
  const stack = [];
  for (const m of body.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g)) {
    const [, closing, rawName, , selfClosing] = m;
    const name = rawName.toLowerCase();
    if (VOID_ELEMENTS.has(name) || selfClosing) continue;
    if (!closing) {
      stack.push(name);
      continue;
    }
    if (stack.length > 0 && stack[stack.length - 1] === name) stack.pop();
    else if (stack.includes(name)) return `</${name}> の前に ${stack[stack.length - 1]} が閉じられていません`;
    else return `対応する開始タグの無い </${name}> があります`;
  }
  return stack.length > 0 ? `閉じられていない要素があります: ${stack.join(", ")}` : null;
}

function checkFile(file) {
  const text = readFileSync(file, "utf8");
  let checked = 0;

  for (const block of extractBlocks(text)) {
    if (!CODE_LANGS.has(block.lang)) continue;
    checked++;
    const loc = `${file}:${block.line}`;
    const body = stripComments(block.body);
    // 意図的に壊した例は書き方の実演なので、失敗にはせず警告に落とす
    const report = block.badExample ? warn : err;

    const ids = collectIds(body);
    if (!block.allowExternal) {
      for (const { attr, token } of collectRefs(body)) {
        if (!ids.has(token)) {
          report(loc, `${attr}="${token}" の参照先 id がこのブロックにありません`);
        }
      }
    }

    const seen = new Set();
    for (const m of body.matchAll(/\bid=["']([^"']+)["']/g)) {
      if (seen.has(m[1])) report(loc, `id="${m[1]}" が同じブロックで重複しています`);
      seen.add(m[1]);
    }

    for (const m of body.matchAll(/<img\b[^>]*>/g)) {
      if (!/\balt=/.test(m[0])) warn(loc, "img に alt がありません");
    }

    for (const m of body.matchAll(/tabindex=["']?(\d+)/gi)) {
      if (Number(m[1]) > 0) warn(loc, `tabindex="${m[1]}" は Tab 順を壊すため 0 か -1 にしてください`);
    }

    if (block.lang === "html") {
      const problem = checkTagBalance(body);
      if (problem) warn(loc, problem);
    }
  }
  return checked;
}

function walkMarkdown(dir) {
  const found = [];
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walkMarkdown(p));
    else if (entry.isFile() && entry.name.endsWith(".md")) found.push(p);
  }
  return found;
}

const targets = [...walkMarkdown(ARTICLES_DIR), ...walkMarkdown(BOOKS_DIR)];
let blockCount = 0;
for (const file of targets) blockCount += checkFile(file);

console.log(`コードブロック検査: ${targets.length} ファイル / ${blockCount} ブロック`);
for (const w of warns) console.log(`警告 ${w}`);
for (const e of errors) console.error(`エラー ${e}`);
console.log(`結果: エラー ${errors.length} / 警告 ${warns.length}`);
console.log("注記: 参照先の照合は同じコードブロック内に限ります。構文検査は行いません");
process.exit(errors.length > 0 ? 1 : 0);
