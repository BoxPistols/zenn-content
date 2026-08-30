---
title: "ブラウザからOpenAI APIを直接呼ぶと無効キーの401が読めない"
emoji: "🌐"
type: "tech"
topics: ["openai", "cors", "javascript", "fetch", "api"]
published: true
---

## この記事の内容

ブラウザから `api.openai.com` を直接呼ぶ構成で、無効なAPIキーを渡したときの401がJavaScriptから読めません。ステータスコードもエラー本文も取れず、`fetch` 自体が `TypeError: Failed to fetch` で失敗します。原因はレスポンスのCORSヘッダで、同じAPIでもエンドポイントによって挙動が違います。

curlで実測した結果と、それを踏まえた例外処理の書き方を残します。実測は2026年8月30日、東京からのアクセスです。

## 前提となる構成

APIキーはサーバーの環境変数に置き、クライアントは自前のエンドポイントを叩く。これが基本形です。静的サイトにキーを埋め込むとビルド成果物から取り出せるため、`import.meta.env` 経由でも同じことになります。

一方で、利用者自身のキーを入力してもらい、その端末のブラウザから直接OpenAIを呼ぶ構成もあります。サーバーを持たずに動かせるため、個人向けのツールでは選ばれます。公式SDKに `dangerouslyAllowBrowser` オプションがあるのはこの用途のためです。

この記事が扱うのは後者です。

## preflightは通る

`authorization` ヘッダを付けたPOSTは単純リクエストではないため、ブラウザは先にOPTIONSを送ります。これは通ります。

```bash
curl -i -X OPTIONS https://api.openai.com/v1/chat/completions \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type"
```

```
HTTP/2 200
access-control-allow-origin: https://example.com
access-control-allow-headers: authorization,content-type
access-control-allow-methods: GET, OPTIONS, POST
access-control-max-age: 86400
access-control-expose-headers: CF-Ray
```

Originはそのまま返ります。ワイルドカードではないため、任意のオリジンを許可する形になっています。preflightの段階で拒否されることはありません。

## 本リクエストの401にはCORSヘッダが付かない

無効なキーでPOSTすると401が返りますが、この応答には `access-control-allow-origin` がありません。

```bash
curl -i -X POST https://api.openai.com/v1/chat/completions \
  -H "Origin: https://example.com" \
  -H "authorization: Bearer sk-invalid-test-key" \
  -H "content-type: application/json" \
  -d '{"model":"gpt-5.6-luna","messages":[{"role":"user","content":"hi"}]}'
```

```
HTTP/2 401
content-type: text/plain
access-control-expose-headers: CF-Ray
x-error-json: ewogICJlcnJvciI6IHsKICAgICJtZXNzYWdlIjogIkluY29ycmVjdCBBUEkga2V5...
x-openai-authorization-error: 401
x-openai-ide-error-code: invalid_api_key
```

`access-control-allow-origin` が無い行が問題です。ブラウザはこの応答をJavaScriptに渡さないため、`fetch` が返すPromiseはrejectされます。ステータスコード401はJavaScriptからは観測できません。

つまり次のコードは動きません。

```js
// この分岐には到達しない。fetch が先に reject する
const res = await fetch(url, options)
if (res.status === 401) {
  showError('APIキーが無効です')
}
```

`content-type` が `application/json` ではなく `text/plain` である点も、この応答が通常のAPIエラーとは別の経路で返っていることを示しています。

## エンドポイントによって扱いが違う

同じ無効キーで `GET /v1/models` を叩くと、401にCORSヘッダが付きます。

```
HTTP/2 401
content-type: application/json
access-control-allow-origin: *
access-control-expose-headers: X-Request-ID
www-authenticate: Bearer realm="OpenAI API"
openai-version: 2020-10-01
```

こちらはブラウザから読めます。ステータスも本文も取れます。

| 対象 | 401のcontent-type | access-control-allow-origin | ブラウザから読めるか |
|---|---|---|---|
| POST /v1/chat/completions | text/plain | 無し | 読めない |
| GET /v1/models | application/json | `*` | 読める |

片方の挙動を見て全体を推測すると外します。キーの検証を `/v1/models` で行っている実装では401が正しく取れるため、本番のチャット送信で初めて `Failed to fetch` に当たります。

## エラー本文も取れない

401の詳細は `x-error-json` ヘッダにbase64で入っています。curlでは読めます。

```bash
curl -sD - -o /dev/null -X POST https://api.openai.com/v1/chat/completions \
  -H "authorization: Bearer sk-invalid-test-key" \
  -H "content-type: application/json" \
  -d '{"model":"gpt-5.6-luna","messages":[]}' \
  | grep -i '^x-error-json:' | cut -d' ' -f2 | base64 -d
```

```json
{
  "error": {
    "message": "Incorrect API key provided: sk-inval*******-key. You can find your API key at https://platform.openai.com/account/api-keys.",
    "type": "invalid_request_error",
    "code": "invalid_api_key",
    "param": null
  },
  "status": 401
}
```

ただし `access-control-expose-headers` が `CF-Ray` のみのため、ブラウザのJavaScriptからこのヘッダは読めません。応答自体がJavaScriptに渡らない以上、そもそも到達しません。ブラウザ側でエラーの詳細を得る手段はありません。

## preflightの失敗と誤診しやすい

手元に有効なキーが無い状態で試すと、この現象は「preflightで拒否された」ように見えます。ブラウザのコンソールにはCORSエラーが出ますし、ネットワークタブでも本リクエストが失敗した形で表示されます。

実際にはpreflightは通っており、本リクエストの応答が読めないだけです。両者を区別するには、curlでOPTIONSを直接叩いて200が返るか確かめます。ここで200が返るなら、CORSの設定を変えても状況は変わりません。

## 実装の形

`fetch` がrejectする以上、try/catchで囲む以外にありません。

```js
let res
try {
  res = await fetch(url, options)
} catch (e) {
  if (e instanceof DOMException && e.name === 'AbortError') throw e
  // キーの正否と通信断はここでは区別できないため、両方に触れる
  throw new Error('接続できませんでした。APIキーが正しいか、通信が届いているか確認してください')
}
if (!res.ok) {
  // ここに来るのはCORSヘッダが付いた応答だけ
}
```

利用者への案内文は「キーが違う」と断定できません。ネットワークが切れている場合も同じ経路を通るためです。原因を1つに絞った文言を出すと、通信断のときに誤った案内になります。

`AbortController` を併用している場合、中断も同じcatchに入ります。`AbortError` を先に振り分けないと、利用者が自分で止めた操作にエラーを表示することになります。

サーバー経由の構成であれば、この問題は起きません。サーバーからの呼び出しにはCORSが関与しないため、401はそのまま受け取れます。ブラウザ直呼びを選んだ場合に限って、エラーの粒度が落ちます。

## 確認していないこと

有効なキーでの成功応答にCORSヘッダが付くかは確認していません。preflightが通ること、および公式SDKに `dangerouslyAllowBrowser` が存在することから通ると考えていますが、実キーでの測定はしていません。

また、この挙動はOpenAI側の実装によるもので、公式ドキュメントに記載を見つけられませんでした。予告なく変わる可能性があります。同じ現象に当たったら、まず上記のcurlで現状を測ってください。

## 続けて踏む400

CORSを抜けた先で、gpt-5系のパラメータ制約に当たります。合わせて挙げておきます。ここから下の3点は[公式リファレンス](https://developers.openai.com/api/docs/api-reference/chat/create)の記載と報告例によるもので、この記事の他の箇所と違って手元での実測ではありません。

- `max_tokens` は400で拒否されます。`max_completion_tokens` に変えます。旧来のサンプルコードをそのまま持ってくるとここで止まります。
- `temperature` も既定値の1以外は400になります。旧実装から値を渡していると同じく落ちます。
- 上限値は余裕を持たせます。推論モデルは利用者から見えない思考にもcompletionトークンを消費するため、1024程度だと可視の回答が途中で尽きることがあります。

なお、OpenAIは新規のプロジェクトにはChat Completionsではなく[Responses API](https://developers.openai.com/api/docs/api-reference/responses)を勧めています。この記事のCORSの挙動はChat Completionsで測ったものです。
