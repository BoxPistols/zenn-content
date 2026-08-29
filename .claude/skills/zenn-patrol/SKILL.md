---
name: zenn-patrol
description: zenn-contentの定期巡回。記事の実装乖離 (バージョン・件数・パッケージ実在)、publishedとZenn実態の整合、リンク生死、クリシェ検査をまとめて点検する。「巡回して」「記事の鮮度確認」「整合チェック」で使う。
---

# zenn-patrol - 記事の定期巡回

機械チェック (CIと同じもの) を先に回し、その後AIの判断が要る乖離検査を行う。
発見した問題は勝手に直さず、まず一覧で報告する (publishedの変更は必ずユーザー確認)。

## 1. 機械チェック (CIと同一)

```bash
node ~/dev/writing/ux-writing-dead-cliche/src/cli.mjs check articles/*.md books/web-quality-a11y-guide/*.md
node tools/patrol-links.mjs
npx zenn list:articles
```

すべて通ること。クリシェはwarn含め0件が基準。

## 2. publishedフラグ × Zenn実態

正準ユーザー名は `ait` (旧and_andはリダイレクト)。全記事について
`https://zenn.dev/ait/articles/<slug>` のHTTP状態 (200=公開) とfrontmatterの
`published` を突き合わせる。不整合は方向を明記して報告する。
Zenn側で手動公開されたのにrepoがfalseのケースは、放置すると次のpushで
下書きに戻るため優先度高で報告する。修正はユーザー確認後。

## 3. 実装・上流との乖離 (紹介記事の鮮度)

各記事の「真実の所在」と、照合すべき値。数値・バージョン・パッケージ名は
実測 (npm view / gh api / ローカルrepo) で確認し、記憶で判断しない。

| 記事 | 真実の所在 | 照合する値 |
|---|---|---|
| ux-writing-dead-cliche | ~/dev/writing/ux-writing-dead-cliche | version、ルール総数/manual/プリセット別件数、リリースzipの有無 |
| syncgrid | ~/dev/apps/syncgrid (origin/main) | version、機能の存否 (廃止済み機能に注意)、テーマ/ショートカット |
| nanyo-prompt-app | github BoxPistols/nanyo-prompt-app | 件数 (848前後)、データサイズ、依存、App.jsx行数 |
| claude-peers-mcp | ~/claude-peers-mcp | ポート/DB/モデル名、Claude Code要求版、未対応事項のPR状況 |
| portless | npm portless + vercel-labs/portless README | version、Node要件、既定ポート/HTTPS、環境変数 |
| volta-ai-cli | npmの3パッケージ | @github/copilot・@google/gemini-cli・@anthropic-ai/claude-codeの実在 |
| frontend-uiux-setup | npm + anthropics/claude-code plugins | 記載パッケージ全部のnpm view、プラグイン名の実在 |
| ui-ux-pro-max | nextlevelbuilder/ui-ux-pro-max-skill README | 収録数 (styles/palettes/fonts/charts/stacks/guidelines) |
| labels-config | npm @asagiri-design/labels-config | version、bin名、コマンド体系 |
| claude-memory-sync | github BoxPistols/claude-memory-sync | pushed_atが記事より新しければ差分確認 |
| google-design-md | github BoxPistols/design-md-docs | 参照ドキュメントの実在 |
| star-lists / fable / storybook / 5ad7053 / dev-album | 自己完結・実測記事 | リンク生死のみ |

乖離を見つけたら「記事の記述 / 実測値 / 影響 (読者が何で詰まるか)」の形で報告する。

## 4. 文体・規律の確認 (新規追記分)

前回巡回以降に変わった行に対してのみ、次を目視確認する。
- 章番号・自章参照 (`§`・第N章・本章) が入っていないか → 見出し名参照に
- 宣伝形のタイトル・結び (感嘆符、「効率化」「強力」「おすすめ」) が入っていないか
- 実在確認をしていないパッケージ名・コマンドが増えていないか

## 5. 報告

結果は「問題なしn項目 / 要修正n件 (優先度つき) / 判断待ちn件」の形でまとめる。
publishedの変更・タイトル変更・公開済み記事の大きな書き換えはユーザー承認を待つ。
