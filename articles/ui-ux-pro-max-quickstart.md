---
title: "UI/UX PRO MAX クイックスタートガイド"
emoji: "🎨"
type: "tech"
topics: ["uiux", "claude", "cursor", "ai", "frontend"]
published: true
---

## はじめに

本記事は、**nextlevelbuilder**氏が開発・公開している「**UI/UX PRO MAX**」スキルの紹介記事です。公式ドキュメントを日本語に翻訳し、内容を再構成してまとめたものになります。

素晴らしいスキルを開発・公開してくださっている作者様に感謝いたします。

:::message
この記事はオリジナルの公式ドキュメントを基に作成しています。最新情報や詳細は、必ず公式リポジトリをご確認ください。
:::

## 公式リソース

- **GitHubリポジトリ**: [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
- **公式サイト**: [ui-ux-pro-max-skill.nextlevelbuilder.io](https://ui-ux-pro-max-skill.nextlevelbuilder.io)
- **ライセンス**: MIT

## 概要

UI/UX PRO MAXは、プロフェッショナルなUI/UX構築のためのAIスキルです。

### 主な機能

- **57種類のUIスタイル** - Glassmorphism、Claymorphism、Minimalism、Brutalism、Neumorphism、Bento Grid、Dark Modeなど
- **95種類のカラーパレット** - SaaS、Eコマース、ヘルスケア、Fintech、美容など業界特化型
- **56種類のフォントペアリング** - Google Fontsインポート付きのキュレーションされたタイポグラフィ組み合わせ
- **24種類のチャートタイプ** - ダッシュボードと分析のための推奨事項
- **8つの技術スタック** - React、Next.js、Vue、Svelte、SwiftUI、React Native、Flutter、HTML+Tailwind
- **98のUXガイドライン** - ベストプラクティス、アンチパターン、アクセシビリティルール

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

**Claude Code のみ使用する場合：**

```gitignore
# UI/UX PRO MAX
.claude/skills/ui-ux-pro-max/
```

**複数環境を一括で使用する場合（`uipro init --ai all`）：**

```gitignore
# UI/UX PRO MAX - 全AI環境共通
.shared/ui-ux-pro-max/

# Claude Code
.claude/skills/ui-ux-pro-max/

# Cursor
.cursor/commands/ui-ux-pro-max.md

# Windsurf
.windsurf/workflows/ui-ux-pro-max.md

# Antigravity
.agent/workflows/ui-ux-pro-max.md

# GitHub Copilot（.github/ 全体ではなくスキルファイルのみ）
.github/prompts/ui-ux-pro-max.prompt.md

# Kiro
.kiro/steering/ui-ux-pro-max.md
```

:::message
`.github/` ディレクトリ全体を ignore すると GitHub Actions やIssueテンプレートに影響します。必ずスキルファイル単位で指定してください。
:::

**一括セットアップの流れ：**

```bash
# 1. 全環境に一括インストール
uipro init --ai all

# 2. .gitignore に上記パターンを追記
cat >> .gitignore << 'EOF'

# UI/UX PRO MAX
.shared/ui-ux-pro-max/
.claude/skills/ui-ux-pro-max/
.cursor/commands/ui-ux-pro-max.md
.windsurf/workflows/ui-ux-pro-max.md
.agent/workflows/ui-ux-pro-max.md
.github/prompts/ui-ux-pro-max.prompt.md
.kiro/steering/ui-ux-pro-max.md
EOF
```

### 方法2: 手動インストール

GitHubリポジトリから直接ダウンロード：

| AIアシスタント | コピーするフォルダ |
|---|---|
| Claude Code | `.claude/skills/ui-ux-pro-max/` |
| Cursor | `.cursor/commands/ui-ux-pro-max.md` + `.shared/ui-ux-pro-max/` |
| Windsurf | `.windsurf/workflows/ui-ux-pro-max.md` + `.shared/ui-ux-pro-max/` |
| Antigravity | `.agent/workflows/ui-ux-pro-max.md` + `.shared/ui-ux-pro-max/` |
| GitHub Copilot | `.github/prompts/ui-ux-pro-max.prompt.md` + `.shared/ui-ux-pro-max/` |
| Kiro | `.kiro/steering/ui-ux-pro-max.md` + `.shared/ui-ux-pro-max/` |

## 前提条件

Python 3.x が必要です（検索スクリプト用）。

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

UI/UX作業をリクエストすると自動的にスキルが起動します：

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

- **HTML + Tailwind**（デフォルト）
- **React** / **Next.js**
- **Vue** / **Svelte**
- **SwiftUI** / **React Native** / **Flutter**

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

### ユースケース3: Next.js + MUI ダッシュボード

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
