---
title: "Portlessでローカル開発のポート地獄から解放される"
emoji: "🔗"
type: "tech"
topics: ["portless", "nextjs", "開発環境", "localhost", "vercel"]
published: true
---

## はじめに

複数のアプリを同時開発していると、`localhost:3000`や`:5173`の奪い合いが日常的に発生します。どこで何が動いているのか混乱し、気づけばポートが衝突してエラー、という経験は誰しもあるはずです。

さらに最近はAI駆動の開発が当たり前になり、AIエージェントが勝手にサーバーを立てて動作確認するケースも増えました。こうなると、もはやlocalhostの状態を人間が把握するのは困難です。

**Portless**はこの問題を、名前付きの`.localhost` URLで解決してくれるツールです。

:::message
**公式リポジトリ**: https://github.com/vercel-labs/portless
:::

## Portlessとは

Vercel Labsが開発した、ローカル開発サーバーのポート番号を**名前付きURL**に置き換えるツールです。

公式READMEの概要を日本語でまとめると:

- **ポート番号の代わりに名前でアクセス** - `localhost:3000` → `my-app.localhost:1355`
- **ポート衝突を自動回避** - 空きポートを自動割り当てするため`EADDRINUSE`が起きない
- **HTTP/2 + HTTPS対応** - `--https`フラグでSSL証明書を自動生成・信頼ストアに登録
- **sudo不要** - デフォルトのポート1355なら管理者権限なしで動作
- **モノレポ対応** - サービスごとにサブドメインを割り当てられる
- **設定ファイル変更不要** - 環境変数`PORT`経由で動くためgit差分が出ない

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

- Node.js 20以上
- macOSまたはLinux

## 導入

### 1. グローバルインストール（一度だけでOK）

```bash
npm install -g portless
```

### 2. プロキシの起動

```bash
portless proxy start
```

:::message
プロキシはアプリ起動時に自動起動するため、環境によってはこのステップは不要です。うまく動かない場合に明示的に実行してください。
:::

### 3. アプリを起動する

いつもの起動コマンドの前に`portless <好きな名前>`を付けるだけです。

```bash
portless my-app npm run dev
```

これだけで`http://my-app.localhost:1355`でアクセスできます。

### git差分を出さずに使う

上記のようにターミナルで直接`portless`を頭に付ける方法なら、`package.json`を一切書き換えないため**git差分が発生しません**。

チームで共有したい場合は`package.json`に組み込むこともできます。

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
| どれがどれか分からない | 3000はフロント？バック？ドキュメント？ |
| ブラウザのタブが混乱 | ポートが変わって別アプリが表示される |
| Cookie/Storageの衝突 | 同じ`localhost`ドメインを共有してしまう |
| AIエージェントの混乱 | AIがサーバーを立てるたびに未知のポートが増える |

特にAI駆動開発では、AIエージェントがビルド確認やプレビューのためにサーバーを起動することが日常的です。人間が立てたサーバーに加えてAIが立てたサーバーも混在し、localhostの状態がカオスになります。

Portlessなら名前付きURLで一意に識別できるので、`portless list`を叩けば今何が動いているか一発で分かります。

## Portlessの仕組み

```bash
portless my-app npm run dev
```

を実行すると、内部では以下が起きます。

1. **空きポートを自動で確保**する（例: `4191`）
2. **`PORT=4191 npm run dev`**としてアプリを起動する
3. **`http://my-app.localhost:1355`**へのアクセスを`localhost:4191`に転送する

```
ブラウザ
  │
  │  http://my-app.localhost:1355
  ▼
Portlessプロキシ (:1355)
  │
  │  localhost:4191 に転送
  ▼
Next.js dev server (:4191)
```

ポート番号は環境変数`PORT`経由で渡されるだけなので、`PORT`環境変数に対応しているフレームワークならそのまま動きます。

### フレームワークごとの注意点

Next.jsは`PORT`環境変数をデフォルトで読むのでそのまま動きますが、**Viteは`PORT`を読みません**。PortlessがセットしたポートとViteが実際に使うポートがずれて、プロキシが正しく転送できなくなります。

```
# Portlessが PORT=4247 をセットして起動
# しかしViteは無視して5173から空きポートを探す

Portless → localhost:4247 に転送しようとする
Vite     → localhost:5175 で実際に起動している
→ ずれてアクセスできない
```

#### 個人利用(git差分なし): CLIで`--port`を渡す

`vite.config.ts`を変更せず、シェル経由で`PORT`環境変数を`--port`に渡します。

```bash
portless my-app sh -c 'vite --port $PORT'

# nr経由の場合
portless my-app sh -c 'nr dev -- --port $PORT'
```

#### チーム利用: `vite.config.ts`に設定を入れる

チーム全員でPortlessを使う場合は、`vite.config.ts`に設定を入れるのが確実です。

```ts
export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 5173,
  },
})
```

#### フレームワーク対応表

| フレームワーク | `PORT`環境変数 | 追加設定 |
|---------------|---------------|---------|
| Next.js | 対応済み | 不要 |
| Vite | 非対応 | CLI`--port`渡しまたは`vite.config.ts`で設定 |
| Create React App | 対応済み | 不要 |

## 便利な使い方

### HTTPS対応

```bash
portless proxy start --https
```

SSL証明書を自動生成し、システムの信頼ストアに登録してくれます。`https://my-app.localhost:1355`でアクセス可能になります。

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

### ni(パッケージマネージャー統一ツール)との併用

[ni](https://github.com/antfu-collective/ni)を使っている場合、`npm run dev`の代わりに`nr dev`で起動できます。Portlessとの組み合わせも同じ要領です。

```bash
# npm run dev の代わりに nr dev
portless my-app nr dev
```

`ni`はロックファイルや`package.json`の`packageManager`フィールドからパッケージマネージャーを自動検出して適切なコマンドに変換してくれるため、npm/yarn/pnpm/bunどの環境でも同じコマンドで動きます。

```bash
# niの主要コマンド
ni          # npm install 相当
nr dev      # npm run dev 相当
nlx vitest  # npx vitest 相当
```

:::message
niの詳細は https://osgsm.io/note/ni-unify-package-manager-commands/ が参考になります。
:::

### 環境変数での設定

| 環境変数 | 説明 |
|----------|------|
| `PORTLESS_PORT` | プロキシのポート番号を変更 |
| `PORTLESS_HTTPS=1` | 常にHTTPSを有効化 |
| `PORTLESS_STATE_DIR` | 状態ディレクトリのパスを変更 |
| `PORTLESS=0` | 一時的にPortlessをバイパス |

## まとめ

Portlessは「ポート番号を意識しなくていい開発体験」を提供してくれるツールです。

- **導入が簡単** - グローバルインストールして`portless <名前> <コマンド>`するだけ
- **設定ファイル不要** - git差分が出ない
- **名前でアクセス** - どのアプリがどこで動いているか一目瞭然
- **衝突しない** - ポート番号の奪い合いが起きない
- **AI駆動開発と相性が良い** - AIが立てたサーバーも名前で把握できる

複数プロジェクトを同時に開発している人、AIエージェントを活用している人には特におすすめです。

https://github.com/vercel-labs/portless
