---
title: "UI/UX PRO MAXクイックスタートガイド"
emoji: "🎨"
type: "tech"
topics: ["uiux", "claude", "cursor", "ai", "frontend"]
published: true
---

## はじめに

本記事は、**nextlevelbuilder**氏が開発・公開している「**UI/UX PRO MAX**」スキルの紹介記事です。公式ドキュメントを日本語に翻訳し、内容を再構成してまとめたものです。

素晴らしいスキルを開発・公開してくださっている作者様に感謝いたします。

:::message
この記事はオリジナルの公式ドキュメントを基に作成しています。収録数などは更新され続けているため、最新情報は必ず公式リポジトリをご確認ください。
:::

## 公式リソース

- GitHubリポジトリ: [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
- 公式サイト: [ui-ux-pro-max-skill.nextlevelbuilder.io](https://ui-ux-pro-max-skill.nextlevelbuilder.io)
- ライセンス: MIT

## 概要

UI/UX PRO MAXは、UIスタイル・カラーパレット・タイポグラフィ・UXガイドラインの検索可能なデータベースをAIアシスタントに与えるスキルです。依頼を受けたAIがデータベースを検索し、製品タイプに合ったデザインシステムを選んでコードに反映します。

収録数は2026年8月時点で次のとおりです。

- UIスタイル79種類(Glassmorphism、Claymorphism、Minimalism、Brutalism、Neumorphism、Bento Grid、Dark Modeなど)
- カラーパレット192種類(SaaS、Eコマース、ヘルスケア、Fintech、美容など業界特化型)
- フォントペアリング74種類(Google Fontsのインポート付き)
- チャートタイプ25種類(ダッシュボードと分析向けの推奨)
- 技術スタック22種類(React、Next.js、Vue、Svelte、SwiftUI、React Native、Flutterほか)
- UXガイドライン119件(ベストプラクティス、アンチパターン、アクセシビリティ)

## 前提条件

CLIにNode.js、検索スクリプトにPython 3.xが必要です。

```bash
python3 --version   # 3.x が表示されればOK
```

入っていない場合はmacOSなら `brew install python3`、Ubuntu/Debianなら `sudo apt install python3`、Windowsなら `winget install Python.Python.3.12` で導入できます。

## インストール

```bash
npm install -g uipro-cli
cd /path/to/your/project
uipro init --ai claude   # 使う環境を指定(指定名は下表)
uipro init --ai all      # 対応する全環境に一括インストール
```

```bash
uipro versions              # 利用可能なバージョン一覧
uipro update                # 最新バージョンにアップデート
uipro init --version v1.0.0 # 特定バージョンをインストール
```

### 対応環境とインストール先

`--ai` の指定名とインストール先の対応です。手動で入れる場合も、GitHubリポジトリからこのインストール先へ配置します。

| 環境 | `--ai` 指定 | インストール先 |
|---|---|---|
| Claude Code | `claude` | `.claude/skills/ui-ux-pro-max/` |
| Cursor | `cursor` | `.cursor/skills/ui-ux-pro-max/` |
| Windsurf | `windsurf` | `.windsurf/skills/ui-ux-pro-max/` |
| Antigravity | `antigravity` | `.agent/skills/ui-ux-pro-max/` |
| GitHub Copilot | `copilot` | `.github/prompts/ui-ux-pro-max/` |
| Kiro | `kiro` | `.kiro/steering/ui-ux-pro-max/` |
| CodeBuddy | `codebuddy` | `.codebuddy/skills/ui-ux-pro-max/` |
| Codex | `codex` | `.codex/skills/ui-ux-pro-max/` |
| Continue | `continue` | `.continue/skills/ui-ux-pro-max/` |
| Gemini | `gemini` | `.gemini/skills/ui-ux-pro-max/` |
| OpenCode | `opencode` | `.opencode/skills/ui-ux-pro-max/` |
| Qoder | `qoder` | `.qoder/skills/ui-ux-pro-max/` |
| Roo Code | `roo` | `.roo/skills/ui-ux-pro-max/` |
| Trae | `trae` | `.trae/skills/ui-ux-pro-max/` |

### .gitignoreの設定

スキルファイルはCLIで生成されるため、リポジトリにはコミットせず、各開発者がローカルで `uipro init` を実行する運用が推奨です。上表のインストール先を `.gitignore` に入れます。Claude Codeだけで使う場合は次の2行で足ります。

```gitignore
# UI/UX PRO MAX
.claude/skills/ui-ux-pro-max/
.claude/settings.local.json
```

`--ai all` で入れる場合は上表の全インストール先を同様に列挙します。順序に注意してください。`.gitignore` への追記を `uipro init` より先に済ませないと、`git add` で誤ってステージされる場合があります。

:::message
`.github/` や `.claude/` など他の用途と共有するディレクトリは、ディレクトリ全体ではなく `ui-ux-pro-max/` ディレクトリ単位で指定してください。`.github/` 全体をignoreするとGitHub ActionsやIssueテンプレートに影響します。
:::

:::details git addを先にしてしまった場合の解除
`.gitignore` を設定する前に `uipro init` を実行し、`git add` でファイルをステージしてしまった場合、ignoreが効きません。以下で解除できます。

```bash
# ステージ済みの ui-ux-pro-max ファイルを追跡対象から除外(ファイル自体は削除されない)
git rm --cached -r .github/prompts/ui-ux-pro-max/ 2>/dev/null
git rm --cached -r .claude/skills/ui-ux-pro-max/ 2>/dev/null
# 他にステージされたツールがあれば同様に実行
```
:::

## 使い方

Claude CodeではUI/UX作業を依頼すると自動的にスキルが起動します。

```
SaaS製品用のランディングページを構築して
```

その他の環境(Cursor、Windsurf、Antigravity、Kiro、GitHub Copilotなど)では、スラッシュコマンドに依頼を続けます。コマンド名はどの環境でも同じです。

```
/ui-ux-pro-max SaaS製品用のランディングページを構築して
```

依頼の例です。

```
ヘルスケア分析用のダッシュボードを作成して
ダークモード付きのポートフォリオサイトをデザインして
Eコマース用のモバイルアプリUIを作成して
```

内部の動きは4段階です。

1. リクエスト - UI/UXタスクを依頼(build、design、create、implement、review、fix、improve)
2. スキル起動 - AIがデザインデータベースから関連するスタイル、カラー、タイポグラフィ、ガイドラインを検索
3. 推奨 - 製品タイプと要件に基づいてデザインシステムを選定
4. コード生成 - 選ばれたカラー、フォント、スペーシング、ガイドラインでUIを実装

スタックはプロンプトで指定します。指定がなければHTML + Tailwindが使われます。

## 実践例: MUI + Tailwind CSS環境での活用

### ユースケース1: デザインシステムの構築

```
MUI7とTailwind CSSを使ったデザインシステムを構築して。
SaaS向けのモダンなスタイルで、アクセシビリティも重視してください。
```

SaaS向けの推奨カラーパレット、MUI7のテーマ設定とTailwindの統合方法、WCAG 2.1 AA準拠のアクセシビリティガイドラインが反映されます。

### ユースケース2: コンポーネントのレビューと改善

```
このMUIボタンコンポーネントをレビューして、
UXガイドラインに基づいた改善提案をください。
```

タッチターゲットサイズ(44x44px以上)、コントラスト比(WCAG基準)、インタラクション状態(hover、focus、active)、レスポンシブデザインがチェックされます。

### ユースケース3: Next.js + MUIダッシュボード

```
Next.js 15とMUI7を使って、データ分析ダッシュボードを作成して。
グラスモーフィズムスタイルで、チャートはRechartsを使用。
```

グラスモーフィズムのスタイル定義、推奨チャートタイプとライブラリ統合、レスポンシブグリッドレイアウトが反映されます。

## トラブルシューティング

Pythonのエラーが出る場合は、前提条件の節のコマンドでPython 3.xの有無を確認してください。

CLIのインストールに失敗する場合の再インストール手順です。

```bash
npm cache clean --force
npm uninstall -g uipro-cli
npm install -g uipro-cli
```

スキルが起動しない場合は次の3点を確認してください。

1. プロジェクトディレクトリに正しくインストールされているか
2. `.claude/skills/ui-ux-pro-max/` (使用環境のインストール先)が存在するか
3. AIアシスタントの再起動

## まとめ

UI/UX PRO MAXは、スタイル79・パレット192・UXガイドライン119件のデザインデータベースをAIの検索対象にするスキルです。導入は `uipro init` の1コマンドで、14のAI環境で同じデータベースが使えます。デザインの引き出しを増やしたいときと、生成UIの品質を揃えたいときに役立ちます。
