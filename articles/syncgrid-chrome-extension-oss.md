---
title: "Chromeの新規タブをSpeed Dialに置き換えるOSS「syncgrid」を公開した"
emoji: "⚡"
type: "tech"
topics: ["chrome拡張機能", "react", "typescript", "vite", "oss"]
published: true
---

## はじめに

ブックマークバーは横に並べるだけで一覧性が低く、フォルダに入れると開くのが手間です。かといってサードパーティの新規タブ系拡張は、広告・テレメトリ・重い外部依存が気になります。

そこで、ChromeのNew Tabページを軽量なSpeed Dial型ブックマークマネージャーに置き換えるOSS「syncgrid」を作り、公開しました。

https://github.com/BoxPistols/syncgrid

## syncgridとは

Chrome拡張機能(Manifest V3)です。新しいタブを開いたときに表示されるページを、ブックマークをタイル状に並べたSpeed Dial UIに置き換えます。MITライセンスです。

### こんな人向け

- Chromeのブックマーク管理に不満がある
- プライバシーを気にしていて、テレメトリ系の拡張機能を避けている
- 自分でカスタマイズ・コントリビュートできるOSSを使いたい
- 複数端末でブックマークを同期したい

## 技術スタック

| 項目 | 内容 |
|------|------|
| UI | React 19 + TypeScript(Strict Mode) |
| ビルド | Vite 7 |
| テスト | Vitest |
| Lint | ESLint 9 + Prettier |
| PWA | vite-plugin-pwa |
| ランタイム依存 | Reactのみ |

ランタイム依存が `react` と `react-dom` だけという点が最大の特徴です。UIライブラリ・状態管理ライブラリ・HTTPクライアントは使っていません。

## 設計思想

### 1. ゼロランタイム依存

Chrome拡張機能は、インストールしたユーザーのブラウザ上で動き続けます。外部依存が多いほど、セキュリティリスク・バンドルサイズ・将来のメンテナンスコストが増えます。

syncgridはReact以外のランタイム依存をゼロにする方針を取っています。状態管理はReactの `useState`/`useReducer`、データ永続化はChrome Bookmarks APIとlocalStorageのみで完結します。

### 2. Chrome Bookmarks APIを唯一の信頼源にする

独自のDBを持ちません。Chrome Bookmarks APIをSingle Source of Truthとして扱います。

```ts
// ブックマーク取得はすべてChrome APIを直接使用
chrome.bookmarks.getTree((tree) => {
  // treeをそのままUIに渡す
});
```

これにより、Chromeのブックマーク管理機能との整合性が保たれ、端末間同期もChromeの仕組みに乗れます。

### 3. ゼロテレメトリ

外部へのトラッキング通信はありません。ユーザーのブックマーク情報はブラウザ外に出ません。

## 主な機能

### Speed Dial UIと3つのレイアウト

ブックマークをfavicon付きのタイルで表示します。レイアウトはMagazine / Card / Listの3種類で、キーボードから切り替えられます。

### テーマ

CSS変数ベースのテーマシステムで、Light / Dark / System(OS追従)に対応しています。WCAG 2.1準拠を意識した配色設計です。

```css
/* テーマはCSS変数で管理 */
:root[data-theme="dark"] {
  --color-bg: #1a1a2e;
  --color-surface: #16213e;
  --color-text: #e0e0e0;
}
```

### キーボードショートカット

| 操作 | 既定キー |
|------|------|
| 検索 | Cmd/Ctrl + K |
| ブックマーク追加 | Ctrl + N |
| レイアウト切替 (Magazine / Card / List) | Cmd/Ctrl + 1 / 2 / 3 |
| 選択削除 / 全選択 | Delete / Cmd/Ctrl + A |

### i18n(日本語・英語)

UI文言は約200キーを日英で持ち、切り替えられます。

### PWA対応とオンボーディングツアー

`vite-plugin-pwa` によるService Workerのオフラインキャッシュと、初回起動時にUIを案内するツアーを実装しています。

## 一度入れて、外した機能

v1系の途中でタスク管理(カンバン)を内蔵しましたが、ブックマーク管理という拡張の責務から外れることと、端末間同期の複雑さがChrome拡張のストレージ制約(`chrome.storage.sync` は100KB上限)に合わないことから廃止しました。タスク管理は別アプリ [kanban-react-redux](https://github.com/BoxPistols/kanban-react-redux) として独立させ、syncgridは旧カンバンの残留データを起動時に掃除するコードだけを残しています。機能を足した後に「この製品の仕事ではない」と判断して外した記録として書いておきます。

## インストール方法

現在はリポジトリからビルドしてインストールする形式です。

```bash
git clone https://github.com/BoxPistols/syncgrid
cd syncgrid
npm install
npm run build
```

1. Chromeで `chrome://extensions` を開く
2. 「デベロッパーモード」をオンにする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. ビルドされた `dist/` フォルダを選択

:::message
Chrome Web Storeへの公開も検討中です。
:::

## コントリビューション

MITライセンスのOSSです。Issue・PRを歓迎しています。

```bash
npm run dev    # 開発サーバー起動
npm run test   # テスト実行
npm run build  # ビルド
```

TypeScript Strict Mode・ESLint 9・Prettierを設定済みです。

https://github.com/BoxPistols/syncgrid

## まとめ

| 特徴 | 内容 |
|------|------|
| ゼロランタイム依存 | React以外の依存なし |
| プライバシー | 外部通信・テレメトリなし |
| データ設計 | Chrome Bookmarks APIを唯一の信頼源 |
| ライセンス | MIT |

「ブックマーク管理を軽く、プライベートに」というコンセプトで作りました。試した感想・フィードバックはGitHub Issuesで受け付けています。
