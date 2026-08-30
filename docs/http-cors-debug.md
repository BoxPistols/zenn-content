# HTTPとCORSを実測で切り分ける手順

記事の裏取りで使う計測手順を残す。ブラウザの例外表示は原因を1つに絞れないため、curlでヘッダを直接見るのが最短になる。

この手順で測った結果は `articles/openai-browser-cors-401.md` にまとめてある。

## 大前提: Originヘッダを付けないとCORSは測れない

多くのサーバーは `Origin` が無いリクエストにCORSヘッダを返さない。付け忘れると「ヘッダが無い」という誤った結論になる。実際のアプリのオリジンを指定すると、エコーされるのか `*` が返るのかまで分かる。

## preflightだけを単体で叩く

`authorization` を付けたPOSTは単純リクエストではないため、ブラウザは先にOPTIONSを送る。ここが通るかを本リクエストと分けて見る。

```bash
curl -i -X OPTIONS https://api.openai.com/v1/chat/completions \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type"
```

200かつ `access-control-allow-origin` が返るなら、preflightは通っている。この状態でJavaScript側が `Failed to fetch` になるなら、原因は本リクエストの応答側にある。CORSの設定を変えても状況は変わらない。

## 応答ヘッダだけを見る

```bash
curl -sS -D - -o /dev/null -X POST https://api.openai.com/v1/chat/completions \
  -H "Origin: https://example.com" \
  -H "authorization: Bearer $KEY" \
  -H "content-type: application/json" \
  -d '{"model":"...","max_completion_tokens":16,"messages":[{"role":"user","content":"ping"}]}' \
  | grep -iE '^(HTTP/|access-control-|x-ratelimit-)'
```

`-D -` でヘッダを標準出力へ出し、`-o /dev/null` で本文を捨てる。応答が途中で切れていても構わない。

見るのは3つ。`access-control-allow-origin` の有無が、その応答をJavaScriptが読めるかどうかを決める。`access-control-expose-headers` に並んでいないヘッダはブラウザから読めない。`x-ratelimit-*` が除外されていれば、ブラウザ側で残量表示は作れない。

## エラーの詳細がヘッダに入っている場合

本文が `text/plain` で中身が無くても、ヘッダにJSONがbase64で入っていることがある。

```bash
curl -sD - -o /dev/null -X POST <url> -H "authorization: Bearer $KEY" ... \
  | grep -i '^x-error-json:' | cut -d' ' -f2 | base64 -d
```

curlでは読めるが、`access-control-expose-headers` に含まれていなければブラウザからは読めない。「curlでは原因が分かるのにアプリでは分からない」状態はこれで起きる。

## キーを履歴に残さずに測る

```bash
read -rs KEY && export KEY
```

入力待ちになるので、そこにキーを貼ってEnter。エコーされず履歴にも残らない。コマンドに直書きすると、貼り付け先にもそのまま残る。

## DevTools: どのリクエストを見ているか先に確かめる

外部APIを直接呼んでいるつもりで、自前のプロキシを見ていることがある。判別はRequest URLとRemote Addressで行う。

Request URLが自分のオリジン (`/.netlify/functions/...` など) なら同一オリジンで、CORSヘッダは付かないのが正常な状態になる。ヘッダが無いことは何の証拠にもならない。

Filter欄にホスト名の一部を入れて0件なら、ブラウザはそのホストと通信していない。サーバー経由の構成であり、この画面から外部APIのCORS挙動は測れない。

見えているヘッダが誰のものかはRemote Addressで確かめる。Firebaseの認証やCDNの応答を、対象のAPIと取り違えやすい。

## 測定結果 (api.openai.com / 2026年8月30日)

| 対象 | 401のcontent-type | access-control-allow-origin | JavaScriptから読めるか |
|---|---|---|---|
| POST /v1/chat/completions | text/plain | 無し | 読めない |
| GET /v1/models | application/json | `*` | 読める |

同じAPIでもエンドポイントごとに違う。片方の挙動から全体を推測しない。キー検証を `/v1/models` で行う実装は、そこでは401を正しく取れるため、本番の送信で初めて詰まる。

有効キーでの成功応答にヘッダが付くかは未測定。無効な資格情報しか手元に無い場合、「拒否された」と「エラー応答が読めない」は原理的に区別できないため、その留保を明記する。
