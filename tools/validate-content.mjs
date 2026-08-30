#!/usr/bin/env node
// Zenn の記事・本を公開前に検証する。
// 判定規則は zenn-cli 0.2.11 の validator (dist/client/assets/index-*.js) から起こしたもの。
// あわせてリポジトリ固有の規約 (画像の実在・コードフェンスの対応・正準URL) も見る。
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, basename, extname } from "node:path";

const ARTICLES_DIR = "articles";
const BOOKS_DIR = "books";

const errors = [];
const warns = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);
const warn = (file, msg) => warns.push(`${file}: ${msg}`);

// --- frontmatter を最小限のパーサで読む (YAML依存を持たない) ---
function parseFrontmatter(text) {
  if (!text.startsWith("---\n")) return null;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;
  const body = text.slice(3, end).trim();
  const out = {};
  for (const line of body.split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let v = m[2].trim();
    if (v === "true") out[key] = true;
    else if (v === "false") out[key] = false;
    else if (/^-?\d+$/.test(v)) out[key] = Number(v);
    else if (v.startsWith("[") && v.endsWith("]")) {
      out[key] = v
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter((s) => s.length > 0);
    } else out[key] = v.replace(/^["']|["']$/g, "");
  }
  return out;
}

// --- zenn-cli 由来の規則 ---
const SLUG_RE = /^[0-9a-z\-_]{12,50}$/;
const CHAPTER_SLUG_RE = /^([0-9a-z\-_]{1,50}|[0-9]+\.[0-9a-z\-_]{1,50})$/;
const TOPIC_SYMBOL_RE = /[ -/:-@[-`{-~]/;
const PUBLISHED_AT_RE = /^\d{4}-\d{2}-\d{2}(\s\d{2}:\d{2})?$/;
const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;

function isSingleEmoji(s) {
  if (typeof s !== "string" || s.length === 0) return false;
  const seg = new Intl.Segmenter("ja", { granularity: "grapheme" });
  const graphemes = [...seg.segment(s)];
  return graphemes.length === 1 && PICTOGRAPHIC.test(s);
}

function validateFrontmatter(file, fm, { isBook = false } = {}) {
  if (!fm) return err(file, "frontmatter を読めません (--- で始まっていない)");

  if (typeof fm.title !== "string" || fm.title.length === 0) {
    err(file, "title（タイトル）を文字列で入力してください");
  } else if (fm.title.length > 70) {
    err(file, `タイトルは70字以内にしてください (現在 ${fm.title.length} 字)`);
  }

  if (typeof fm.published !== "boolean") {
    err(file, 'published（公開設定）を true か false で指定してください（クオテーション " で囲まない）');
  }

  if (fm.published_at != null) {
    const raw = String(fm.published_at);
    const parsed = Date.parse(raw.replace(" ", "T"));
    if (!PUBLISHED_AT_RE.test(raw) || isNaN(parsed)) {
      err(file, "published_at は `YYYY-MM-DD` または `YYYY-MM-DD hh:mm` の形式にしてください");
    } else if (parsed > Date.now() && fm.published !== true) {
      err(file, "published_at に未来日時を指定する場合は published を true にしてください");
    }
  }

  if (!isBook) {
    if (fm.type !== "tech" && fm.type !== "idea") {
      err(file, "type に tech もしくは idea を指定してください");
    }
    if (typeof fm.emoji !== "string" || fm.emoji.length === 0) {
      err(file, "アイキャッチとなる emoji（絵文字）を指定してください");
    } else if (!isSingleEmoji(fm.emoji)) {
      err(file, `絵文字（emoji）を1つだけ指定してください (現在: ${fm.emoji})`);
    }
  } else {
    if (typeof fm.summary !== "string" || fm.summary.length === 0) {
      err(file, "summary（本の説明）の記載は必須です");
    }
    if (typeof fm.price !== "number") {
      err(file, "price（本の価格）を半角数字で指定してください");
    } else if (fm.price !== 0 && (fm.price < 200 || fm.price > 5000)) {
      err(file, "price を有料にする場合、200〜5000 の間で指定してください");
    } else if (fm.price % 100 !== 0) {
      err(file, "price は100円単位で指定してください");
    }
  }

  if (fm.tags != null || fm.tag != null) err(file, "tags ではなく topics を使ってください");

  if (!Array.isArray(fm.topics) || fm.topics.length === 0) {
    err(file, 'topics を配列で指定してください。例）["react", "javascript"]');
  } else {
    if (fm.topics.length > 5) err(file, `topics は最大5つまでです (現在 ${fm.topics.length} 個)`);
    for (const t of fm.topics) {
      if (typeof t !== "string" || t.length === 0) err(file, "topics は全て文字列で指定してください");
      else if (t.length > 18) err(file, `topics は18字以内にしてください (${t})`);
      else if (TOPIC_SYMBOL_RE.test(t)) err(file, `topics に記号やスペースは使えません (${t})`);
    }
  }

  if (fm.publication_name != null && !/^[0-9a-z_]{2,15}$/.test(String(fm.publication_name))) {
    err(file, "publication_name は小文字英数字とアンダースコアの2〜15字にしてください");
  }
}

// --- リポジトリ固有の規約 ---
function validateBody(file, text) {
  const lines = text.split("\n");

  const fenceCount = lines.filter((l) => l.startsWith("```")).length;
  if (fenceCount % 2 !== 0) err(file, `コードフェンスが対応していません (\`\`\` が ${fenceCount} 個)`);

  // 本文 (フェンス外) だけを対象にする
  let inFence = false;
  const prose = [];
  for (const l of lines) {
    if (l.startsWith("```")) { inFence = !inFence; continue; }
    if (!inFence) prose.push(l);
  }
  const proseText = prose.join("\n");

  for (const m of proseText.matchAll(/!\[[^\]]*\]\((\/images\/[^)]+)\)/g)) {
    const p = m[1].replace(/^\//, "");
    if (!existsSync(p)) err(file, `画像が存在しません: ${m[1]}`);
  }
  for (const m of proseText.matchAll(/!\[[^\]]*\]\(([^)]*(?:スクショ|URL_\d|TODO)[^)]*)\)/g)) {
    warn(file, `画像がプレースホルダのままです: ${m[1]}`);
  }
  if (/zenn\.dev\/and_and\//.test(proseText)) {
    err(file, "旧ユーザー名の Zenn URL が残っています (zenn.dev/ait/ に統一)");
  }
}

// --- 記事 ---
let articleCount = 0;
for (const f of readdirSync(ARTICLES_DIR)) {
  if (extname(f) !== ".md") continue;
  articleCount++;
  const file = join(ARTICLES_DIR, f);
  const slug = basename(f, ".md");
  if (!SLUG_RE.test(slug)) {
    err(file, `slug の値（${slug}）が不正です。a-z0-9 とハイフン・アンダースコアの12〜50字にしてください`);
  }
  const text = readFileSync(file, "utf8");
  validateFrontmatter(file, parseFrontmatter(text));
  validateBody(file, text);
}

// config.yaml の chapters (文字列の配列) だけを読む。無ければ null
function parseChapterList(text) {
  const m = text.match(/^chapters:\s*$/m);
  if (!m) return null;
  const rest = text.slice(m.index + m[0].length).split("\n").slice(1);
  const out = [];
  for (const line of rest) {
    const item = line.match(/^\s*-\s*(.+?)\s*$/);
    if (!item) break;
    out.push(item[1].replace(/^["']|["']$/g, ""));
  }
  return out;
}

const NUMBERED_CHAPTER_RE = /^\d+\.[a-z0-9_-]+$/;

// --- 本 ---
let bookCount = 0;
let chapterCount = 0;
if (existsSync(BOOKS_DIR)) {
  for (const b of readdirSync(BOOKS_DIR)) {
    const dir = join(BOOKS_DIR, b);
    if (!statSync(dir).isDirectory()) continue;
    bookCount++;
    if (!SLUG_RE.test(b)) err(dir, `本の slug（${b}）が不正です`);

    const cfgPath = join(dir, "config.yaml");
    if (!existsSync(cfgPath)) {
      err(dir, "config.yaml がありません");
    } else {
      validateFrontmatter(cfgPath, parseFrontmatter("---\n" + readFileSync(cfgPath, "utf8") + "\n---"), { isBook: true });
    }

    // 表紙 (cover.png / cover.jpg、1MB 以内、縦横比 1:1.4 推奨) が無いと Zenn の連携で invalid になる
    const cover = ["cover.png", "cover.jpg", "cover.jpeg"].map((n) => join(dir, n)).find(existsSync);
    if (!cover) {
      err(dir, "表紙 (cover.png または cover.jpg) がありません。Zenn の連携が invalid として弾きます");
    } else if (statSync(cover).size > 1024 * 1024) {
      err(cover, `表紙が 1MB を超えています (${Math.trunc(statSync(cover).size / 1024)}KB)`);
    }

    // チャプターは config.yaml の chapters に列挙するか、ファイル名を N.slug.md にする。
    // どちらも満たさないファイルは Zenn のデプロイ対象から黙って外れる。
    const listed = existsSync(cfgPath) ? parseChapterList(readFileSync(cfgPath, "utf8")) : null;
    const chapterFiles = readdirSync(dir).filter((f) => extname(f) === ".md");
    if (listed) {
      for (const slug of listed) {
        if (!existsSync(join(dir, `${slug}.md`))) err(cfgPath, `chapters に書かれた ${slug} に対応する ${slug}.md がありません`);
      }
    }

    for (const f of chapterFiles) {
      chapterCount++;
      const file = join(dir, f);
      const slug = basename(f, ".md");
      if (!CHAPTER_SLUG_RE.test(slug)) err(file, `チャプターの slug（${slug}）が不正です`);
      if (listed) {
        if (!listed.includes(slug)) err(file, "config.yaml の chapters に無いため Zenn のデプロイ対象に含まれません");
      } else if (!NUMBERED_CHAPTER_RE.test(slug)) {
        err(file, "config.yaml の chapters に列挙するか、ファイル名を「チャプター番号.スラッグ.md」にしてください");
      }
      validateBody(file, readFileSync(file, "utf8"));
    }
  }
}

console.log(`検証: 記事 ${articleCount} / 本 ${bookCount} (チャプター ${chapterCount})`);
for (const w of warns) console.log(`警告 ${w}`);
for (const e of errors) console.error(`エラー ${e}`);
console.log(`結果: エラー ${errors.length} / 警告 ${warns.length}`);
process.exit(errors.length > 0 ? 1 : 0);
