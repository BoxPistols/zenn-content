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
この記事はオリジナルの公式ドキュメントを基に作成しています。最新情報や詳細は、必ず公式リポジトリをご確認ください。
:::

## 公式リソース

- GitHubリポジトリ: [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
- 公式サイト: [ui-ux-pro-max-skill.nextlevelbuilder.io](https://ui-ux-pro-max-skill.nextlevelbuilder.io)
- ライセンス: MIT

## 概要

UI/UX PRO MAXは、プロフェッショナルなUI/UX構築のためのAIスキルです。

### 主な機能

- 57種類のUIスタイル - Glassmorphism、Claymorphism、Minimalism、Brutalism、Neumorphism、Bento Grid、Dark Modeなど
- 95種類のカラーパレット - SaaS、Eコマース、ヘルスケア、Fintech、美容など業界特化型
- 56種類のフォントペアリング - Google Fontsインポート付きのキュレーションされたタイポグラフィ組み合わせ
- 24種類のチャートタイプ - ダッシュボードと分析のための推奨事項
- 8つの技術スタック - React、Next.js、Vue、Svelte、SwiftUI、React Native、Flutter、HTML+Tailwind
- 98のUXガイドライン - ベストプラクティス、アンチパターン、アクセシビリティルール

## インストール方法

### 方法1: CLIを使用（推奨）

```bash
# CLIをグローバルインストール
npm install -g uipro-cli

# プロジェクトディレクトリに移動
cd /path/to/your/project

# AI環境別インストール
uipro init --ai claude      # Claude Code
uipro init --ai cursor      # Cursor
uipro init --ai windsurf    # Windsurf
uipro init --ai antigravity # Antigravity
uipro init --ai copilot     # GitHub Copilot
uipro init --ai kiro        # Kiro
uipro init --ai codebuddy   # CodeBuddy
uipro init --ai codex       # Codex
uipro init --ai continue    # Continue
uipro init --ai gemini      # Gemini
uipro init --ai opencode    # OpenCode
uipro init --ai qoder       # Qoder
uipro init --ai roo         # Roo Code
uipro init --ai trae        # Trae
uipro init --ai all         # 全アシスタント
```

### その他のCLIコマンド

```bash
uipro versions              # 利用可能なバージョン一覧
uipro update                # 最新バージョンにアップデート
uipro init --version v1.0.0 # 特定バージョンをインストール
```

### `.gitignore` の設定

スキルファイルはCLIで動的に生成されるため、各開発者がローカルで `uipro init` を実行する運用が推奨です。Git管理対象から除外しましょう。

**Claude Codeのみ使用する場合：**

```gitignore
# UI/UX PRO MAX
.claude/skills/ui-ux-pro-max/
```

**複数環境を一括で使用する場合（`uipro init --ai all`）：**

```gitignore
# UI/UX PRO MAX

# Claude Code
.claude/skills/ui-ux-pro-max/
.claude/settings.local.json

# Cursor
.cursor/skills/ui-ux-pro-max/

# Windsurf
.windsurf/skills/ui-ux-pro-max/

# Antigravity
.agent/skills/ui-ux-pro-max/

# GitHub Copilot（.github/ 全体ではなくスキルディレクトリのみ）
.github/prompts/ui-ux-pro-max/

# Kiro
.kiro/steering/ui-ux-pro-max/

# CodeBuddy
.codebuddy/skills/ui-ux-pro-max/

# Codex
.codex/skills/ui-ux-pro-max/

# Continue
.continue/skills/ui-ux-pro-max/

# Gemini
.gemini/skills/ui-ux-pro-max/

# OpenCode
.opencode/skills/ui-ux-pro-max/

# Qoder
.qoder/skills/ui-ux-pro-max/

# Roo Code
.roo/skills/ui-ux-pro-max/

# Trae
.trae/skills/ui-ux-pro-max/
```

:::message
`.github/` や `.claude/` など他の用途と共有するディレクトリは、ディレクトリ全体ではなく `ui-ux-pro-max/` ディレクトリ単位で指定してください。`.github/` 全体をignoreするとGitHub ActionsやIssueテンプレートに影響します。
:::

**一括セットアップの流れ：**

```bash
# 1. .gitignore に追記（先に設定しないと git add で誤ってステージされる場合がある）
cat >> .gitignore << 'EOF'

# UI/UX PRO MAX
.claude/skills/ui-ux-pro-max/
.claude/settings.local.json
.cursor/skills/ui-ux-pro-max/
.windsurf/skills/ui-ux-pro-max/
.agent/skills/ui-ux-pro-max/
.github/prompts/ui-ux-pro-max/
.kiro/steering/ui-ux-pro-max/
.codebuddy/skills/ui-ux-pro-max/
.codex/skills/ui-ux-pro-max/
.continue/skills/ui-ux-pro-max/
.gemini/skills/ui-ux-pro-max/
.opencode/skills/ui-ux-pro-max/
.qoder/skills/ui-ux-pro-max/
.roo/skills/ui-ux-pro-max/
.trae/skills/ui-ux-pro-max/
EOF

# 2. 全環境に一括インストール
uipro init --ai all
```

:::details既にgit addしてしまった場合
`.gitignore` を設定する前に `uipro init` を実行し、`git add` でファイルをステージしてしまった場合、ignoreが効きません。以下で解除できます。

```bash
# ステージ済みの ui-ux-pro-max ファイルを追跡対象から除外（ファイル自体は削除されない）
git rm --cached -r .github/prompts/ui-ux-pro-max/ 2>/dev/null
git rm --cached -r .claude/skills/ui-ux-pro-max/ 2>/dev/null
# 他にステージされたツールがあれば同様に実行
```
:::

### 方法2: 手動インストール

GitHubリポジトリから直接ダウンロード：

| AIアシスタント | インストール先 |
|---|---|
| Claude Code | `.claude/skills/ui-ux-pro-max/` |
| Cursor | `.cursor/skills/ui-ux-pro-max/` |
| Windsurf | `.windsurf/skills/ui-ux-pro-max/` |
| Antigravity | `.agent/skills/ui-ux-pro-max/` |
| GitHub Copilot | `.github/prompts/ui-ux-pro-max/` |
| Kiro | `.kiro/steering/ui-ux-pro-max/` |
| CodeBuddy | `.codebuddy/skills/ui-ux-pro-max/` |
| Codex | `.codex/skills/ui-ux-pro-max/` |
| Continue | `.continue/skills/ui-ux-pro-max/` |
| Gemini | `.gemini/skills/ui-ux-pro-max/` |
| OpenCode | `.opencode/skills/ui-ux-pro-max/` |
| Qoder | `.qoder/skills/ui-ux-pro-max/` |
| Roo Code | `.roo/skills/ui-ux-pro-max/` |
| Trae | `.trae/skills/ui-ux-pro-max/` |

## 前提条件

Python 3.xが必要です（検索スクリプト用）。

```bash
# Pythonバージョン確認
python3 --version

# macOS
brew install python3

# Ubuntu/Debian
sudo apt update && sudo apt install python3

# Windows
winget install Python.Python.3.12
```

## 使い方

### Claude Code

UI/UX作業をリクエストすると自動的にスキルが起動します。

```
SaaS製品用のランディングページを構築して
```

### Cursor / Windsurf / Antigravity

スラッシュコマンドでスキルを起動：

```
/ui-ux-pro-max SaaS製品用のランディングページを構築して
```

### Kiro

チャットで `/` を入力してコマンド一覧を表示、`ui-ux-pro-max` を選択：

```
/ui-ux-pro-max SaaS製品用のランディングページを構築して
```

### GitHub Copilot

VS CodeのCopilotで `/` を入力してプロンプト一覧を表示、`ui-ux-pro-max` を選択：

```
/ui-ux-pro-max SaaS製品用のランディングページを構築して
```

## サンプルプロンプト

```bash
# ランディングページ
SaaS製品用のランディングページを構築して

# ダッシュボード
ヘルスケア分析用のダッシュボードを作成して

# ポートフォリオ
ダークモード付きのポートフォリオサイトをデザインして

# モバイルアプリUI
Eコマース用のモバイルアプリUIを作成して
```

## 仕組み

1. **リクエスト** - UI/UXタスクを依頼（build、design、create、implement、review、fix、improve）
2. **スキル起動** - AIが自動的にデザインデータベースから関連するスタイル、カラー、タイポグラフィ、ガイドラインを検索
3. **スマートな推奨** - 製品タイプと要件に基づいて、最適なデザインシステムを見つける
4. **コード生成** - 適切なカラー、フォント、スペーシング、ベストプラクティスでUIを実装

## 対応スタック

スタック固有のガイドラインを提供：

- HTML + Tailwind（デフォルト）
- React / **Next.js**
- Vue / **Svelte**
- SwiftUI / **React Native** / **Flutter**

プロンプトで希望のスタックを指定するか、デフォルトのHTML + Tailwindが使用されます。

## 実践例：MUI + Tailwind CSS環境での活用

### ユースケース1: デザインシステムの構築

```bash
# プロンプト例
MUI7とTailwind CSSを使ったデザインシステムを構築して。
SaaS向けのモダンなスタイルで、アクセシビリティも重視してください。
```

スキルは以下を提供：

- SaaS向けの推奨カラーパレット
- MUI7のテーマ設定とTailwindの統合方法
- アクセシビリティガイドライン（WCAG 2.1 AA準拠）

### ユースケース2: コンポーネントのレビューと改善

```bash
# プロンプト例
このMUIボタンコンポーネントをレビューして、
UXガイドラインに基づいた改善提案をください。
```

スキルは以下をチェック：

- タッチターゲットサイズ（44x44px以上）
- コントラスト比（WCAG基準）
- インタラクション状態（hover、focus、active）
- レスポンシブデザイン

### ユースケース3: Next.js + MUIダッシュボード

```bash
# プロンプト例
Next.js 15とMUI7を使って、データ分析ダッシュボードを作成して。
グラスモーフィズムスタイルで、チャートはRechartsを使用。
```

スキルは提供：

- グラスモーフィズムのスタイル定義
- 推奨チャートタイプとライブラリ統合
- MUI7 + Next.js 15のベストプラクティス
- レスポンシブグリッドレイアウト

## トラブルシューティング

### Python関連のエラー

```bash
# Pythonがインストールされているか確認
python3 --version

# インストールされていない場合
# macOS
brew install python3

# Ubuntu/Debian
sudo apt update && sudo apt install python3
```

### CLIインストールエラー

```bash
# キャッシュをクリア
npm cache clean --force

# グローバルパッケージを確認
npm list -g uipro-cli

# 再インストール
npm uninstall -g uipro-cli
npm install -g uipro-cli
```

### スキルが起動しない場合

1. プロジェクトディレクトリに正しくインストールされているか確認
2. `.claude/skills/ui-ux-pro-max/` ディレクトリが存在するか確認
3. AIアシスタントを再起動

## まとめ

UI/UX PRO MAXは、フロントエンド開発者がプロフェッショナルなUI/UXを効率的に構築するための強力なツールです。豊富なデザインリソースとベストプラクティスガイドラインにより、高品質なユーザーインターフェースを短時間で実装できます。
