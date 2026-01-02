---
title: "フロントエンド・UI/UXデザイナー向け Claude Code 設定ガイド"
emoji: "🎨"
type: "tech"
topics: ["claudecode", "frontend", "uiux", "figma", "mcp"]
published: false
---

## はじめに

この記事では、フロントエンド開発やUI/UXデザインに携わる方向けに、Claude Codeの実践的な設定を紹介します。

:::message
本記事は [@minorun365](https://qiita.com/minorun365) 氏の「[Claude Codeライトユーザー向け！おすすめ設定まとめ](https://qiita.com/minorun365/items/3711c0de2e2558adb7c8)」を参考に、フロントエンド・UI/UX領域向けにアレンジしたものです。
:::

---

## TL;DR - 今すぐ使いたい人向け

**最低限これだけやれば効果を実感できる設定**を厳選しました。

### 1. UI/UX PRO MAX スキルを導入

```bash
npm install -g uipro-cli
cd /path/to/your/project
uipro init --ai claude
```

→ 57種のUIスタイル、95種のカラーパレット、UXガイドラインが即座に使えるようになります。

### 2. Figma MCP を設定

`~/.claude.json` に追加：

```json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-figma"]
    }
  }
}
```

→ FigmaデザインをClaude Codeから直接参照・コード化できます。

### 3. CLAUDE.md にフロントエンド向けルールを記載

`~/.claude/CLAUDE.md` を作成：

```markdown
## フロントエンド開発ルール
- UIコンポーネントはアクセシビリティ（WCAG 2.1 AA）を考慮する
- レスポンシブデザインはモバイルファーストで実装
- 使用スタック: React/Next.js + Tailwind CSS + MUI
```

---

## 基礎編 - Claude Codeの設定ファイル構造

Claude Codeの設定は以下のディレクトリに集約されます：

```
~/.claude/
├── CLAUDE.md          # グローバルルール（全プロジェクト共通）
├── settings.json      # ユーザー設定
├── agents/            # カスタムサブエージェント
└── skills/            # スキル（UI/UX PRO MAX等）

~/.claude.json         # MCP設定
```

### CLAUDE.md でフロントエンドルールを一元管理

毎回同じ指示を入力する手間を省けます。

```markdown
## 技術スタック
- Next.js 15 (App Router)
- TypeScript 5.x
- MUI 7 + Tailwind CSS 4
- Storybook 8

## コーディング規約
- コンポーネントは関数コンポーネント + TypeScript
- スタイルはTailwind CSSを優先、複雑なものはMUIのsxプロップ
- 命名規則: PascalCase（コンポーネント）、camelCase（変数・関数）

## UI/UX原則
- タッチターゲットは最小44x44px
- コントラスト比 4.5:1 以上（通常テキスト）
- フォーカス状態は必ず視覚的に区別
```

### 音声通知 - 長い処理の完了を見逃さない

Claude Codeが応答したときに音を鳴らす設定です。

`~/.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "afplay /System/Library/Sounds/Glass.aiff"
          }
        ]
      }
    ]
  }
}
```

### コンテキスト使用率を表示

会話が長くなると自動圧縮され、文脈が失われることがあります。使用率を表示して管理しましょう。

Claude Code起動後に `/config` → Statuslineで設定するか、以下のスクリプトを使用：

`~/.claude/statusline.sh`:

```bash
#!/bin/bash
PERCENT="${CLAUDE_CONTEXT_WINDOW_PERCENT:-0}"
if [ "$PERCENT" -ge 80 ]; then
  echo "CTX:${PERCENT}%"
fi
```

---

## Skills編 - UI/UX PRO MAX

### UI/UX PRO MAX とは

プロフェッショナルなUI/UX構築のためのスキルです。Claude CodeがUIタスクを検知すると自動的に起動し、最適なデザインリソースを参照します。

**主な機能：**
- 57種のUIスタイル（Glassmorphism、Neumorphism、Bento Grid等）
- 95種の業界別カラーパレット
- 56種のフォントペアリング
- 98のUXガイドライン

### インストール

```bash
npm install -g uipro-cli
cd /path/to/your/project
uipro init --ai claude
```

:::message
**個人用 vs チーム共有**

`uipro init` を実行すると `.claude/skills/` 配下に多数のファイルが生成されます。
配置場所によってgit管理の方針が変わります：

| 配置場所 | 用途 | git管理 |
|---------|------|---------|
| `~/.claude/skills/` | 個人用 | しない |
| `プロジェクト/.claude/skills/` | チーム共有 | する |

**推奨**: 汎用スキル（UI/UX PRO MAX等）はホームディレクトリにインストール。
プロジェクト固有のカスタムスキルのみリポジトリで共有。

```bash
# ホームディレクトリにインストール（推奨）
cd ~
uipro init --ai claude
```

プロジェクトに置く場合は `.gitignore` に追加：
```gitignore
.claude/skills/ui-ux-pro-max/
```
:::

### 使い方

UI/UX関連のリクエストをすると自動起動します：

```
SaaS向けのダッシュボードを構築して。
グラスモーフィズムスタイルで、ダークモード対応。
```

スキルが自動的に：
1. 適切なスタイルガイドを検索
2. カラーパレットを提案
3. UXガイドラインに基づいた実装

---

## MCP編 - 外部ツール連携

MCPサーバーを設定することで、Claude Codeの参照精度が向上します。

### Figma MCP

FigmaデザインをClaude Codeから直接参照できます。

**セットアップ手順：**

1. **Figma Access Token を取得**
   - Figma → Settings → Account → Personal access tokens
   - 「Generate new token」でトークンを生成

2. **`~/.claude.json` に設定を追加**

```json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "figma-developer-mcp", "--stdio"],
      "env": {
        "FIGMA_API_KEY": "figd_xxxxxx..."
      }
    }
  }
}
```

**活用例：**

```bash
# デザインからコンポーネント生成
このFigmaファイルのデザインをReactコンポーネントとして実装して
https://www.figma.com/design/xxxxx/ProjectName?node-id=123-456

# デザイントークンの抽出
このFigmaファイルからカラーパレットとタイポグラフィを抽出して、
Tailwind CSS の設定ファイルを生成して

# デザインレビュー
実装したコンポーネントとFigmaデザインを比較して、差異をレポートして
```

### MUI MCP

MUIコンポーネントのドキュメントを正確に参照できます。

```json
{
  "mcpServers": {
    "mui": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-mui"]
    }
  }
}
```

### Playwright MCP

ブラウザ操作やスクリーンショット取得に活用できます。

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-playwright"]
    }
  }
}
```

**活用例：**

```bash
# 開発サーバーの画面をキャプチャ
localhost:3000 のトップページをスクリーンショットして

# レスポンシブ確認
localhost:3000 をモバイル（375px）とデスクトップ（1440px）で
スクリーンショットを取って比較して

# インタラクションテスト
ログインフォームに入力してボタンをクリック、
遷移先の画面をキャプチャして
```

### Storybook / Chromatic 連携

Storybookを活用したコンポーネント開発フローを強化できます。

**Storybook MCPの設定：**

```json
{
  "mcpServers": {
    "storybook": {
      "command": "npx",
      "args": ["-y", "storybook-mcp-server", "--port", "6006"]
    }
  }
}
```

**Chromatic（ビジュアルテスト）との連携：**

```bash
# Chromaticのセットアップ
npm install --save-dev chromatic
npx chromatic --project-token=your-token
```

`~/.claude/settings.json` に自動承認を追加：

```json
{
  "permissions": {
    "allow": [
      "Bash(npx chromatic:*)",
      "Bash(npm run storybook:*)"
    ]
  }
}
```

**活用例：**

```bash
# Storybookでコンポーネント確認
Buttonコンポーネントの全バリエーションをStorybookで確認して

# ビジュアルリグレッションテスト
Chromaticでビジュアルテストを実行して、変更点をレポートして

# コンポーネントカタログ生成
src/components配下の全コンポーネントのStorybookストーリーを生成して
```

---

## 自動承認設定

参照系の操作を自動承認することで、ワークフローがスムーズになります。

`~/.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "WebFetch(domain:figma.com)",
      "WebFetch(domain:storybook.js.org)",
      "WebFetch(domain:mui.com)",
      "Bash(npm run storybook:*)",
      "Bash(npx playwright:*)"
    ]
  }
}
```

---

## 実践ワークフロー例

### ワークフロー1: Figma → React コンポーネント

```mermaid
graph LR
    A[Figmaデザイン] --> B[Figma MCP]
    B --> C[UI/UX PRO MAX]
    C --> D[コンポーネント実装]
    D --> E[Storybook]
    E --> F[Chromatic]
```

**プロンプト例：**

```
このFigmaデザインを参考に、MUI + Tailwindでカードコンポーネントを実装して。
https://www.figma.com/design/xxxxx?node-id=123-456

要件：
- レスポンシブ対応（モバイル/タブレット/デスクトップ）
- ダークモード対応
- アクセシビリティ（WCAG 2.1 AA）
- Storybookストーリーも作成
```

### ワークフロー2: デザインシステム構築

**プロンプト例：**

```
プロジェクトのデザインシステムを構築して。

1. Figmaからデザイントークン（カラー、タイポグラフィ、スペーシング）を抽出
2. Tailwind CSS設定ファイルを生成
3. MUIテーマファイルを生成
4. 基本コンポーネント（Button、Input、Card）を実装
5. Storybookでドキュメント化
```

### ワークフロー3: 既存UIのリファクタリング

**プロンプト例：**

```
src/components/配下のコンポーネントをレビューして。

確認観点：
- UXガイドライン準拠（タッチターゲット、コントラスト比）
- アクセシビリティ（aria属性、キーボード操作）
- レスポンシブ対応
- パフォーマンス（不要な再レンダリング）

問題があれば修正して、改善レポートを作成して。
```

### ワークフロー4: ビジュアルリグレッションテスト

**プロンプト例：**

```
以下の手順でビジュアルテストを実施して：

1. Storybookを起動
2. 全コンポーネントのスクリーンショットを取得
3. Chromaticにアップロード
4. 前回からの変更点をレポート
```

---

## まとめ

| 設定 | 効果 |
|------|------|
| CLAUDE.md | 毎回の指示入力を削減 |
| UI/UX PRO MAX | デザインリソース・ガイドラインを自動参照 |
| Figma MCP | デザイン→実装の橋渡し |
| Storybook/Playwright | 品質担保・テスト自動化 |

フロントエンド・UI/UX開発において、これらの設定を組み合わせることで、デザインから実装、テストまでのワークフローを大幅に効率化できます。

## 参考リンク

- [Claude Code 公式ドキュメント](https://docs.anthropic.com/claude-code)
- [UI/UX PRO MAX GitHub](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
- [MCP 公式ドキュメント](https://modelcontextprotocol.io/)
