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

**[Portless](https://github.com/vercel-labs/portless)** は、Vercel Labs が開発したツールで、ポート番号の代わりに**名前付きの `.localhost` URL** でアプリにアクセスできるようにしてくれます。一意の名前が付くことで、何がどこで動いているかが一目でクリアになります。

```
# Before
http://localhost:3000
http://localhost:3001
http://localhost:5173

# After
http://my-app.localhost:1355
http://api-server.localhost:1355
http://docs-site.localhost:1355
```

実際に使ってみたところ非常に快適だったので、紹介します。

## TL;DR - 3ステップで使える

```bash
# 1. グローバルインストール（一度だけでOK）
npm install -g portless

# 2. プロキシを起動（初回のみ sudo でパスワードを求められる場合あり）
portless proxy start

# 3. いつものコマンドの前に portless <名前> を付けるだけ
portless my-app npm run dev
```

これだけで `http://my-app.localhost:1355` でアクセスできます。

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

Portless は名前ベースのルーティングでこれらの問題を一括解決します。`portless list` を叩けば、今何が動いているか一発で分かります。

## Portless の仕組み

Portless が行っていることはシンプルです。

```
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

### git 差分が出ない

ポイントは、プロジェクト側の設定ファイルを**一切変更しない**ことです。`package.json` やフレームワークの設定を書き換える必要がないため、git 差分が発生しません。

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

### package.json に組み込む場合

チームで共有したい場合は `package.json` に書くこともできます。

```json
{
  "scripts": {
    "dev": "portless my-app next dev"
  }
}
```

### 環境変数での設定

| 環境変数 | 説明 |
|----------|------|
| `PORTLESS_PORT` | プロキシのポート番号を変更 |
| `PORTLESS_HTTPS=1` | 常に HTTPS を有効化 |
| `PORTLESS_STATE_DIR` | 状態ディレクトリのパスを変更 |
| `PORTLESS=0` | 一時的に Portless をバイパス |

## 動作要件

- Node.js 20 以上
- macOS または Linux

## まとめ

Portless は「ポート番号を意識しなくていい開発体験」を提供してくれるツールです。

- **導入が簡単** - グローバルインストールして `portless <名前> <コマンド>` するだけ
- **設定ファイル不要** - git 差分が出ない
- **名前でアクセス** - どのアプリがどこで動いているか一目瞭然
- **衝突しない** - ポート番号の奪い合いが起きない

複数プロジェクトを同時に開発している人には特におすすめです。

https://github.com/vercel-labs/portless
