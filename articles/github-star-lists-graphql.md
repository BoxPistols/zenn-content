---
title: "GitHubのスターリストをGraphQLで整理する — UserListとスコープ・件数・private・削除"
emoji: "⭐"
type: "tech"
topics: ["github", "graphql", "cli", "gh", "整理術"]
published: true
---

## この記事の内容

GitHubのスター一覧にあるLists機能を、コマンドラインから読み書きした記録です。520件のスターと27個のリストを整理する過程で、ドキュメントに載っていない挙動をいくつか踏みました。同じことをする人が同じ場所で止まらないように書いておきます。

動作確認は2026年8月時点です。

## Listsとは

`github.com/<user>?tab=stars` に表示される、スター済みリポジトリの分類機能です。1つのリポジトリを複数のリストに入れられます。

リストの内容は公開プロフィールから見えます。ただしリストに入っているprivateリポジトリは本人にしか表示されません。この非対称性が、後述の件数の食い違いにつながります。

## APIはどこにあるか

REST APIを探しても見つかりません。[Starringのリファレンス](https://docs.github.com/en/rest/activity/starring)に載っているエンドポイントは7つで、リストに触れるものはありません。`/user/starred` はスター一覧を返しますが、リストの情報は含まれていません。ここで「APIがない」と結論してWebのUIで手作業を始めがちですが、GraphQLには型もミューテーションもあります。

型を直接問い合わせれば確認できます。

```bash
gh api graphql -f query='{ __type(name:"UserList"){ fields { name } } }'
```

```
createdAt  description  id  isPrivate  items
lastAddedAt  name  slug  updatedAt  user
```

ミューテーションは4つです。

```
createUserList  updateUserList  deleteUserList  updateUserListsForItem
```

`updateUserListsForItem` は、1つのリポジトリが属するリストをまとめて差し替えるものです。「このリストにこの1件を追加する」という形のAPIではないので、既存の所属を取得してから差し替える必要があります。

このAPIは公式ドキュメントにもあります。置き場所が[GraphQLリファレンスのUsers](https://docs.github.com/en/graphql/reference/users)で、`Lists`という見出しが無いため、リスト機能の側から辿ると届きにくい位置にあります。スキーマを直接引けば、置き場所を知らなくても存在を確かめられます。

API化の要望は[community/community#8293](https://github.com/orgs/community/discussions/8293)に2021年から積まれていて、2026年6月のコメントで`UserList`が2023年後半から使えることが共有されました。`gh`本体での対応は[cli/cli#13226](https://github.com/cli/cli/issues/13226)で要望中です。

```bash
# ミューテーション名を全部出して grep する
gh api graphql -f query='{ __schema { mutationType { fields { name } } } }' \
  --jq '.data.__schema.mutationType.fields[].name' | grep -i list
```

## 変更系にはuserスコープが要る

読み取りは既定のトークンで通ります。しかし変更系を叩くと拒否されます。

```
INSUFFICIENT_SCOPES: 'deleteUserList' requires ['user'],
your token has: ['admin:public_key','gist','project','read:org','read:packages','repo']
```

`repo` を持っていても通りません。リポジトリではなくユーザーに紐づくリソースだからです。[OAuthスコープの一覧](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)で `user` は「read/write access to profile info only」とされていて、リストへの言及はありません。どのスコープが要るかは、このエラーメッセージで知ることになります。

```bash
gh auth refresh -h github.com -s user
```

このコマンドはブラウザにワンタイムコードを貼る対話フローを含みます。出力を取り込む形で起動すると途中で止まって完了しません。対話できる端末で実行してください。

同じ理由で、リポジトリの削除には `delete_repo` が別途要ります。

## itemsは100件で切れる

リストの中身は `items` で取れます。

```graphql
query {
  user(login: "USERNAME") {
    lists(first: 50) {
      totalCount
      nodes {
        id name slug description
        createdAt updatedAt lastAddedAt
        items(first: 100) {
          totalCount
          nodes {
            ... on Repository {
              nameWithOwner url description
              isPrivate isFork isArchived
              stargazerCount pushedAt
              primaryLanguage { name }
            }
          }
        }
      }
    }
  }
}
```

`items` の `nodes` は `UserListItems` というunion型です。実体は今のところ `Repository` の1つだけですが、unionである以上、インラインフラグメントなしではフィールドを選べません。

`first` の上限が100であることは[リソース制限のドキュメント](https://docs.github.com/en/graphql/overview/resource-limitations)にあります(「Values of `first` and `last` must be within 1-100.」)。書かれていないのはその先です。上限を超えるリストでもエラーは返らず、先頭の100件だけが返ります。117件のリストが100件で返っていることに、`totalCount` と実際の配列長を比べるまで気づきませんでした。

```python
if len(nodes) != items["totalCount"]:
    # ページングが要る
```

ページングはリストの `id` を `node()` に渡して進めます。

```graphql
query($id: ID!, $cur: String) {
  node(id: $id) {
    ... on UserList {
      items(first: 100, after: $cur) {
        totalCount
        pageInfo { hasNextPage endCursor }
        nodes { ... on Repository { nameWithOwner } }
      }
    }
  }
}
```

取得した件数と `totalCount` を突き合わせてください。この照合を入れるかどうかで、バックアップが完全かどうかが決まります。

## HTMLから数えるとprivateが抜ける

APIを見つける前に `?tab=stars` のHTMLをスクレイプして件数を数えていました。この数字はGraphQLの `totalCount` と一致しません。未ログインの取得ではprivateリポジトリが含まれないためです。

実際、6件のリストが4件に見えていました。件数を条件に使う処理を書いていたので、判定そのものが狂います。

件数や所属を判断材料にするならGraphQLを使ってください。HTMLは表示の都合で内容が変わります。

## リストを消してもスターは外れない

これは事故ではなく仕様です。削除の影響は分類だけに閉じます。

```bash
gh api graphql \
  -f query='mutation($id: ID!) {
    deleteUserList(input: { listId: $id }) { user { login } }
  }' \
  -F id="$LIST_ID"
```

`listId` には取得時の `id`（`UL_kw...` 形式）を渡します。slugでは受け付けません。

19個のリストを削除しましたが、スター総数は520件のまま変わりませんでした。`deleteUserList` が消すのは分類だけです。

つまり失われるのは「どのリポジトリをどの分類に入れていたか」という情報だけです。取り消しはできないので、削除の前にこの対応表だけ書き出しておけば足ります。

## 消す前に名前を直す

分類を消すと、あとはリポジトリ名で探すことになります。ここで問題になったのは、名前が内容を表していないリポジトリでした。

- `cdd` — 中身はnpmへpublishするコンポーネントライブラリの環境
- `nuxt-m1-2105` — `m1` が何を指すのか、リポジトリのどこにも書かれていない
- `rails-render` — Renderへのデプロイ検証。Railsの `render` メソッドと紛らわしい
- 説明が `Created with CodeSandbox` の雛形のまま、というものが20件以上

名前を思い出せないものは、分類が消えた時点で見つけられなくなります。そこで削除の前に、READMEとファイル構成を読んで実体を確認し、改名と説明の記入を済ませました。

### 改名で壊れるもの

GitHubは旧URLからリダイレクトします。旧名で別のリポジトリを作らない限りリダイレクトは残るので、ローカルのremoteもクローンも動き続けます。壊れるのは次の2つです。

- GitHub Pagesの公開URL。`<user>.github.io/OLD/` は404になり、リダイレクトされません
- デプロイ連携。Vercelなどが参照しているリポジトリ名は自動追従しないことがあります

Pagesが有効かどうかは事前に判別できます。

```bash
gh api repos/OWNER/REPO --jq '"pages=\(.has_pages) home=\(.homepage // "-")"'
```

このチェックで2件が該当したので、その2件は改名せず説明の追加だけにしました。

## 実際の手順

1. 全リストをGraphQLで取得し、Markdownに書き出す
2. 削除対象のリポジトリが漏れなく記録されているか機械照合する
3. 名前から内容が想起できないものを、READMEを読んだ上で改名する
4. 説明が空のもの、雛形のまま残っているものを埋める
5. リストを削除する
6. バックアップに削除実施日と結果を追記する

2の照合を入れておくと、「itemsは100件で切れる」で書いた切り詰めに気づけます。目視で「全部入っているように見える」で進めると、100件目以降が消えたことに後から気づくことになります。

```python
need = {r["nameWithOwner"] for lst in delete_targets for r in lst["items"]}
missing = [r for r in need if f"[{r}]" not in backup_md]
assert not missing, missing
```

## バックアップを公開する前に

書き出したMarkdownをGistに上げようとして手が止まりました。リストにはprivateリポジトリが混ざっていて、その中には取引先の非公開リポジトリもありました。

secret gistは検索に出ないだけで、URLを知っていれば誰でも読めます。置き場所としては安全ではありません。

結局、手順をまとめた技術メモだけを公開して、リポジトリ名を含むバックアップはローカルに置きました。スターリストの内容は「自分が何に関わっているか」の一覧でもあります。公開する前にprivateの混入を数えてください。

```python
priv = [r for r in all_items if r["isPrivate"]]
print(len(priv), "件の private が含まれます")
```

## まとめ

- ListsはRESTにないがGraphQLにはある。`__type` と `__schema` で確かめられる
- 変更系には `user` スコープが要る。`repo` では通らない
- `items(first: 100)` は上限。`totalCount` と突き合わせないと静かに欠ける
- HTMLから数えるとprivateが抜けて件数が合わない
- リストを削除してもスターは外れない。消えるのは分類だけ
- 分類を消す前に、名前と説明で内容が分かる状態にしておく
