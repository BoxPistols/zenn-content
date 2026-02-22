---
title: "Portless でローカル開発のポート地獄から解放される"
emoji: "🔗"
type: "tech"
topics: ["portless", "nextjs", "開発環境", "localhost", "vercel"]
published: true
---

## はじめに

複数のアプリを同時開発していると、`localhost:3000` や `:5173` の奪い合いが日常的に発生します。どこで何が動いているのか混乱し、気づけばポートが衝突してエラー、という経験は誰しもあるはずです。

さらに最近は AI 駆動の開発が当たり前になり、AI エージェントが勝手にサーバーを立てて動作確認するケースも増えました。こうなると、もはや localhost の状態を人間が把握するのは困難です。

**Portless** はこの問題を、名前付きの `.localhost` URL で解決してくれるツールです。

:::message
**公式リポジトリ**: https://github.com/vercel-labs/portless
:::

## Portless とは

Vercel Labs が開発した、ローカル開発サーバーのポート番号を**名前付き URL** に置き換えるツールです。

公式 README の概要を日本語でまとめると:

- **ポート番号の代わりに名前でアクセス** - `localhost:3000` → `my-app.localhost:1355`
- **ポート衝突を自動回避** - 空きポートを自動割り当てするため `EADDRINUSE` が起きない
- **HTTP/2 + HTTPS 対応** - `--https` フラグで SSL 証明書を自動生成・信頼ストアに登録
- **sudo 不要** - デフォルトのポート 1355 なら管理者権限なしで動作
- **モノレポ対応** - サービスごとにサブドメインを割り当てられる
- **設定ファイル変更不要** - 環境変数 `PORT` 経由で動くため git 差分が出ない

```
# Before: ポート番号で管理
http://localhost:3000    ← どのアプリ？
http://localhost:3001    ← どのアプリ？
http://localhost:5173    ← どのアプリ？

# After: 名前で管理
http://my-app.localhost:1355
http://api-server.localhost:1355
http://docs-site.localhost:1355
```

### 動作要件

- Node.js 20 以上
- macOS または Linux

## 導入 - 3ステップで使える

### 1. グローバルインストール（一度だけでOK）

```bash
npm install -g portless
```

### 2. プロキシの起動

```bash
portless proxy start
```

:::message
初回のみ SSL 証明書の設定のためにパスワードを求められることがありますが、それ以降は不要です。
:::

### 3. アプリを起動する

いつもの起動コマンドの前に `portless <好きな名前>` を付けるだけです。

```bash
portless my-app npm run dev
```

これだけで `http://my-app.localhost:1355` でアクセスできます。

### git 差分を出さずに使う

上記のようにターミナルで直接 `portless` を頭に付ける方法なら、`package.json` を一切書き換えないため **git 差分が発生しません**。

チームで共有したい場合は `package.json` に組み込むこともできます。

```json
{
  "scripts": {
    "dev": "portless my-app next dev"
  }
}
```

## なぜポート番号が問題なのか

ローカル開発でポート番号に依存していると、いくつかの厄介な問題が起きます。

| 問題 | 具体例 |
|------|--------|
| ポート衝突 | `EADDRINUSE: address already in use :::3000` |
| どれがどれか分からない | 3000 はフロント？バック？ドキュメント？ |
| ブラウザのタブが混乱 | ポートが変わって別アプリが表示される |
| Cookie/Storage の衝突 | 同じ `localhost` ドメインを共有してしまう |
| AI エージェントの混乱 | AI がサーバーを立てるたびに未知のポートが増える |

特に AI 駆動開発では、AI エージェントがビルド確認やプレビューのためにサーバーを起動することが日常的です。人間が立てたサーバーに加えて AI が立てたサーバーも混在し、localhost の状態がカオスになります。

Portless なら名前付き URL で一意に識別できるので、`portless list` を叩けば今何が動いているか一発で分かります。

## Portless の仕組み

```bash
portless my-app npm run dev
```

を実行すると、内部では以下が起きます。

1. **空きポートを自動で確保** する（例: `4191`）
2. **`PORT=4191 npm run dev`** としてアプリを起動する
3. **`http://my-app.localhost:1355`** へのアクセスを `localhost:4191` に転送する

```
ブラウザ
  │
  │  http://my-app.localhost:1355
  ▼
Portless プロキシ (:1355)
  │
  │  localhost:4191 に転送
  ▼
Next.js dev server (:4191)
```

ポート番号は環境変数 `PORT` 経由で渡されるだけなので、Next.js や Vite など `PORT` 環境変数に対応しているフレームワークならそのまま動きます。

## 便利な使い方

### HTTPS 対応

```bash
portless proxy start --https
```

SSL 証明書を自動生成し、システムの信頼ストアに登録してくれます。`https://my-app.localhost:1355` でアクセス可能になります。

### モノレポでのサブドメイン活用

複数サービスを持つモノレポでは、名前で整理できます。

```bash
# ターミナル1
portless frontend npm run dev

# ターミナル2
portless api npm run dev

# ターミナル3
portless docs npm run dev
```

それぞれ以下でアクセスできます。

- `http://frontend.localhost:1355`
- `http://api.localhost:1355`
- `http://docs.localhost:1355`

### 稼働中のルート確認

```bash
portless list
```

現在動いているアプリとそのルーティングを一覧表示できます。

### 環境変数での設定

| 環境変数 | 説明 |
|----------|------|
| `PORTLESS_PORT` | プロキシのポート番号を変更 |
| `PORTLESS_HTTPS=1` | 常に HTTPS を有効化 |
| `PORTLESS_STATE_DIR` | 状態ディレクトリのパスを変更 |
| `PORTLESS=0` | 一時的に Portless をバイパス |

## まとめ

Portless は「ポート番号を意識しなくていい開発体験」を提供してくれるツールです。

- **導入が簡単** - グローバルインストールして `portless <名前> <コマンド>` するだけ
- **設定ファイル不要** - git 差分が出ない
- **名前でアクセス** - どのアプリがどこで動いているか一目瞭然
- **衝突しない** - ポート番号の奪い合いが起きない
- **AI 駆動開発と相性が良い** - AI が立てたサーバーも名前で把握できる

複数プロジェクトを同時に開発している人、AI エージェントを活用している人には特におすすめです。

https://github.com/vercel-labs/portless
