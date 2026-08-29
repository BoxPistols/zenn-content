---
title: "Chromeの新規タブをSpeed Dialに置き換えるOSS「syncgrid」を公開した"
emoji: "⚡"
type: "tech"
topics: ["chrome拡張機能", "react", "typescript", "vite", "oss"]
published: false
---

## はじめに

Chromeを開くたびに、ブックマークがどこにあるか迷ったことはないでしょうか。

ブックマークバーは横に並べるだけで一覧性が低く、フォルダに入れると開くのが手間。かといってサードパーティの新規タブ系拡張は、広告・テレメトリ・重い外部依存が気になる。

そこで、**ChromeのNew Tabページを軽量なSpeed Dial型ブックマークマネージャーに置き換えるOSS「syncgrid」を作り、公開しました。**

https://github.com/BoxPistols/syncgrid

## syncgridとは

Chrome拡張機能（Manifest V3）です。新しいタブを開いたときに表示されるページを、ブックマークをタイル状に並べたSpeed Dial UIに置き換えます。

バージョン2.0.0、MITライセンスで公開しています。

### こんな人向け

- Chromeのブックマーク管理に不満がある
- プライバシーを気にしていて、テレメトリ系の拡張機能を避けている
- 自分でカスタマイズ・コントリビュートできるOSSを使いたい
- 複数端末でブックマークを同期したい

## 技術スタック

| 項目 | 内容 |
|------|------|
| UI | React 19 + TypeScript（Strict Mode） |
| ビルド | Vite 7 |
| テスト | Vitest |
| Lint | ESLint 9 + Prettier |
| PWA | vite-plugin-pwa |
| ランタイム依存 | **Reactのみ** |

Reactを除くランタイム依存がゼロというのが最大の特徴です。UIライブラリ・状態管理ライブラリ・HTTPクライアントなどは一切使っていません。

## 設計思想

### 1. ゼロランタイム依存

Chrome拡張機能は、インストールしたユーザーのブラウザ上で動き続けます。外部依存が多いほど、セキュリティリスク・バンドルサイズ・将来のメンテナンスコストが増えます。

syncgridはReact以外のランタイム依存をゼロにする方針を取っています。状態管理はReactの`useState`/`useReducer`、データ永続化はChrome Bookmarks APIとlocalStorageのみで完結します。

### 2. Chrome Bookmarks APIを唯一の信頼源にする

独自のDBを持ちません。**Chrome Bookmarks APIをSingle Source of Truth**として扱います。

```ts
// ブックマーク取得はすべてChrome APIを直接使用
chrome.bookmarks.getTree((tree) => {
  // treeをそのままUIに渡す
});
```

これにより、Chromeのブックマーク管理機能との整合性が保たれ、端末間同期もChromeの仕組みに乗れます。

### 3. ゼロテレメトリ

外部へのトラッキング通信は一切ありません。ユーザーのブックマーク情報はブラウザ外に出ません。

## 主な機能

### Speed Dial UI

ブックマークをタイル状に表示します。アイコン（favicon）付きで視認性が高く、よく使うサイトへの素早いアクセスが可能です。

### 4テーマ対応

CSS変数ベースのテーマシステムで、Light / Dark / System / High Contrastに対応しています。WCAG 2.1準拠を意識した配色設計です。

```css
/* テーマはCSS変数で管理 */
:root[data-theme="dark"] {
  --color-bg: #1a1a2e;
  --color-surface: #16213e;
  --color-text: #e0e0e0;
}
```

### i18n（日本語・英語）

151キーのi18n対応で、日本語・英語の切り替えが可能です。

### カンバン機能 + ローカルフォルダ同期（最大の新機能）

今回のv2系で実装した最大の新機能です。ブックマーク管理にタスク管理を組み合わせた3列構成（Todo / Doing / Done）のカンバンボードを内蔵しています。

**設計上の面白いポイント：URLを識別子にする**

カードの識別子に`bookmarkId`（Chrome Bookmarks APIが振るID）を使わず、**URLを識別子**にしています。

理由は、Chromeのブックマークはフォルダ移動やブラウザの再インストールでIDが変わる可能性があるためです。URLは変わらないため、カンバンカードとブックマークの紐付けが安定します。

**Chrome拡張のストレージ制約との戦い**

Chrome拡張では`chrome.storage.sync`（最大100KB）と`chrome.storage.local`（最大10MB）が使えます。カンバンデータは`storage.local`に保存しますが、端末間でのデータ共有には対応していません。

そこで採用したのが**ローカルフォルダ同期**です。

```
📁 OneDrive（またはDropbox、iCloud Driveなど）
  └── syncgrid/
        └── kanban.json   ← ここにエクスポート/インポート
```

カンバンデータをJSONとしてエクスポートし、OneDrive等の汎用ファイル同期フォルダに置くことで、端末をまたいだデータ共有を実現します。独自のクラウドサービスを持たず、ユーザーが既に使っているファイル同期インフラを活用するアプローチです。

:::message
**なぜ`chrome.storage.sync`を使わないのか**

`chrome.storage.sync`を使えば自動でChrome同期に乗せられますが、100KBの容量制限があります。カンバンデータには向きません。

また「Chromeアカウントへの依存を避ける」という観点でも、ファイルシステム経由の同期はゼロ外部依存の設計哲学と一貫しています。
:::

なお、`chrome.storage.onChanged`リスナーを使うことで、同じ端末内でカンバンデータの変更を即時検知して反映します。

**操作**

| 操作 | 方法 |
|------|------|
| カンバン表示/非表示 | `K` キーでトグル |
| 端末間同期 | SyncボタンでJSON出力→共有フォルダに保存 |
| 期限設定 | カード作成時に日付を指定可能 |

### PWA対応（vite-plugin-pwa）

`vite-plugin-pwa`を導入し、Service Workerによるオフラインキャッシュに対応しました。

### オンボーディングツアー

初回起動時にUIを案内するインタラクティブなツアーを実装しています。初めて使うユーザーでも迷わずセットアップできます。

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
# 開発サーバー起動
npm run dev

# テスト実行
npm run test

# ビルド
npm run build
```

TypeScript Strict Mode・ESLint 9・Prettier設定済みで、コード品質を保つ環境が整っています。

https://github.com/BoxPistols/syncgrid

## まとめ

| 特徴 | 内容 |
|------|------|
| ゼロランタイム依存 | React以外の依存なし |
| プライバシー | 外部通信・テレメトリなし |
| データ設計 | Chrome Bookmarks APIを唯一の信頼源 |
| 同期 | ローカルフォルダ経由でクロスデバイス対応 |
| ライセンス | MIT |

「ブックマーク管理を軽く、プライベートに」というコンセプトで作りました。試してみた感想・フィードバックはGitHub Issuesでお待ちしています。
