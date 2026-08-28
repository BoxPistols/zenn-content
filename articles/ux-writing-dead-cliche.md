---
title: "AI 日本語の「クリシェ」を握りつぶす OSS を作った — 辞書・textlint・Claude Code プラグイン"
emoji: "🖋️"
type: "tech"
topics: ["claudecode", "textlint", "ai", "uxwriting", "oss"]
published: false
---

## 何を作ったか

AI が日本語文章に持ち込む定型表現 (`羅針盤`、`心臓部`、`シナジー`、`〜にほかなりません`、`〜していきましょう`) を検出し、平易な文章へ直すための辞書とツールを OSS として公開しました。

https://github.com/BoxPistols/ux-writing-dead-cliche

CLI、textlint ルール、Claude Code プラグインの 3 つの形で同じ辞書が動きます。MIT ライセンスです。この記事も公開前に自分のチェッカーを通しています。

## 作った経緯

Claude Code で日本語の文書を書かせると、内容は正しいのに文体で分かる、という問題に何度も当たりました。技術記事の締めが `いかがでしたか` になる。設計書の冒頭で認証基盤が `システムの心臓部` と呼ばれる。PR の本文に太字が散らばる。こうした文章は社内文書やレビューコメントとして出すと、読み手に「AI が書いたもの」と受け取られ、内容より先に信用を失います。

最初は CLAUDE.md に「クリシェを使わない」と書いて対処していました。これはある程度効きますが、保証がありません。指示を読むかどうか、どこまで守るかはモデルの状態に依存し、長い作業の後半で崩れます。禁止語のリストをプロンプトに並べる方法も、リストが伸びるほどコンテキストを圧迫します。

そこで、検出は決定論的なチェッカーに任せ、プロンプト側は書き直しの質だけを担当する構成に分けました。業務で UI 文言のレビュー用スキルを運用していた経験から、ルールを機械判定できるものとできないものに分けて辞書に持つ設計が固まり、業務固有の内容を除いて一般化したものがこの OSS です。

## 何を解決するか

このツールの前提は、クリシェを語彙の問題ではなく情報の欠落として扱うことです。

`この文書はチームの羅針盤です` という文の問題は、`羅針盤` という語ではありません。誰が、どの判断を、何を基準に行うのかが書かれていないことです。だから辞書の各ルールは、検出パターンに加えて 2 つのフィールドを必須にしています。

```yaml
- id: metaphor/compass
  severity: error
  pattern: '(?<!船の)(?<!航海の)羅針盤'
  why: 「指針」の比喩として頻出するが、誰がどの判断に使うのかが書かれない。
  ask: 誰が、どの判断を、何を基準に決めるのかを書く。
  examples:
    bad:
      - 'この文書はチームの羅針盤です。'
    good:
      - '実装方針で迷ったときは、この文書の判断基準の節に従います。'
  deny_examples:
    - '博物館で古い船の羅針盤を見た。'
```

`why` は避ける理由、`ask` は代わりに何を書くべきかの問いです。置換候補だけの辞書だと、別のクリシェに置き換わって終わります。「何の情報が欠けているか」を返すことで、書き直しが情報の補完になります。

ルールは 8 カテゴリ 130 件です (v0.6.1 時点)。比喩、誇張断定 (`確信しています`、`革命的`)、空虚な抽象 (`本質`、`パラダイムシフト`)、構文の型 (`単なるXではなくY`)、翻訳調 (`することができます`)、締めの型、書式 (絵文字見出し、太字箇条書き)、UI マイクロコピー (`〜が失敗しました` の助詞ゆれ、`不正な値` のような責める表現) を扱います。

機械判定できない規範 (体言止めの連打、太字の散布など) も `manual` フラグ付きで同じ辞書に置いてあり、AI にレビューさせるときの人力チェックリストとして機能します。規範の本体を辞書側に置くことで、機械ルールと同じくバージョン管理とレビューの対象になります。スキルのプロンプトには要約だけを置きます。

## 誤検出と戦う設計

この種のツールは、誤検出の多さがそのまま採用可否になります。`心臓` は医学の文脈で、`穴` は物理の文脈で、`昇華` は化学の文脈で正当な日本語です。そこで次をテストで強制しています。

- 全 130 ルールに悪い例と良い例を必須とし、機械判定する 119 ルールは悪い例が検出され良い例が検出されないことまで CI で確認する (manual の 11 ルールは例の存在のみ必須)
- 紛らわしい語は共起条件でパターンを絞り、検出してはいけない負例 (`deny_examples`) の通過を必須にする
- 正当な日本語だけの negative コーパスが全ルールで 0 件で通る
- 書き直し例の golden コーパスは、修正前が検出され修正後が 0 件で通る

公開初日に効果がありました。自分の過去記事に実行したところ、南陽市の生成 AI 実例集の正式名称「一発OK!! 市民も使える！生成AI活用実例集」の `!!` を感嘆符ルールが誤検出しました。かぎかっこ内の固有名詞引用は対象外にすべきです。修正手順はプロジェクトの規約どおり、まず negative コーパスに報告された文そのものを 1 行足し、それからパターンを直しました。誤検出の報告がそのまま回帰テストになる仕組みです。

## textlint との違い

最も近い既存ツールは textlint-ja 公式の [@textlint-ja/textlint-rule-preset-ai-writing](https://github.com/textlint-ja/textlint-rule-preset-ai-writing) です。太字プリフィックス付き箇条書きやコロン止めなど、構造面の AI 癖を 5 ルールで検出します。設計方針も「表現を縛るのではなく構造を縛る」と明確です。

本ツールとの違いは 3 点です。

1. 語彙辞書の広さと `why` / `ask`。構造ではなく語彙のクリシェ 104 件を、書き直しの指針付きで持ちます
2. 負例テストと 2 種のコーパスを CI で強制する誤検出対策
3. textlint の外での動作。Claude Code プラグイン (スキル・コマンド・エージェント・フック)、単体 CLI、UI 文言レビューまで同じ辞書で動きます

逆に preset-ai-writing は形態素解析を使うため、コロン止めの判定精度で優位です。競合ではなく役割分担なので、v0.2.0 で正規表現で成立する構造系 3 ルール (太字プリフィックス箇条書き・絵文字箇条書き・行末コロン述語) は本ツールにも独自実装で取り込み (textlint-ja 各プリセットは MIT)、文長やら抜きなど形態素解析前提の一般規範は複製せず併用でカバーする方針にしました。

併用するときは、取り込み済みの 3 ルールを preset-ai-writing 側で切ります。切らないと同じ 1 行に両方から診断が出ます。設定ファイルのキーはスコープ付きの `@textlint-ja/preset-ai-writing` です。非スコープの `preset-ai-writing` は v1.1.0 で更新が止まったパッケージにしか解決せず、解決できないキーが 1 つあると textlint は設定全体を捨てるため、他のルールも黙って無効になります。

```json
{
  "rules": {
    "preset-ja-technical-writing": true,
    "@textlint-ja/preset-ai-writing": {
      "no-ai-list-formatting": false,
      "no-ai-emphasis-patterns": false,
      "no-ai-colon-continuation": true
    },
    "ux-writing-dead-cliche": { "preset": "paper", "minSeverity": "warn" }
  }
}
```

誇張語だけは切り分けが残ります。preset-ai-writing の `no-ai-hype-expressions` は構造ではなく語彙のルールで、本ツールの overstatement カテゴリと重なります。上の設定で `革命的` を書くと両方から診断が出ます。どちらか一方でよければ切ってください。

表記ゆれも見る場合は prh を足せますが、`prh.yml` は各プロジェクトで書くファイルです。用意せずに `rulePaths` へ指定すると textlint が起動時に落ちて、他のルールも走りません。

## 導入マニュアル

### Claude Code プラグインとして (全部入り)

```
/plugin marketplace add BoxPistols/ux-writing-dead-cliche
/plugin install dead-cliche
```

これで次が入ります。

| 種類 | 名前 | 何をするか |
| --- | --- | --- |
| スキル | dead-cliche-writing | クリシェ検出と平易な書き直しの手順 |
| スキル | ux-writing-review | UI 文言のレビュー (句点原則・ボタン語彙・エラー 3 要素) |
| スキル | plain-communication | PR・コミット・Slack 文面の規律。AI 署名と絵文字の禁止 |
| コマンド | /dead-cliche:check | ファイルや差分のチェックと修正 |
| コマンド | /dead-cliche:review-request | Slack 用レビュー依頼文の生成 |
| コマンド | /dead-cliche:pr-review | PR の差分・本文・UI 文言を検査し、署名なしのレビュー文面を組み立てる |
| コマンド | /dead-cliche:compose | 導入・説明・結論の 3 段落生成。チェック 0 件まで書き直す |
| エージェント | dead-cliche-editor | 長文原稿の隔離推敲。本文をメイン会話に載せずに推敲結果だけ返す |
| フック | PostToolUse | Markdown 書き込み直後の自動チェック。検出時は書き直しを要求 |

実効性はフックが担います。Claude が Markdown を書いた直後に検出結果が返り、人が指摘する前に書き直しが走ります。ただし検査は差分ではなくファイル全体に対して、既定の paper プリセットで走ります。既存の文書を 1 行だけ直したときも、その文書に元からあった検出でブロックされます。対象から外したいパスは後述の `.deadclicherc.json` の `ignore` に入れます。

チームで揃える場合は、プロジェクトの `.claude/settings.json` に marketplace とプラグインを書いてコミットします。`enabledPlugins` のキーは `プラグイン名@マーケットプレイス名` の形です。

```json
{
  "extraKnownMarketplaces": {
    "ux-writing-dead-cliche": {
      "source": { "source": "github", "repo": "BoxPistols/ux-writing-dead-cliche" }
    }
  },
  "enabledPlugins": { "dead-cliche@ux-writing-dead-cliche": true }
}
```

### CLI として

```bash
npx github:BoxPistols/ux-writing-dead-cliche check draft.md
npx github:BoxPistols/ux-writing-dead-cliche check draft.txt --preset business
```

標準入力にも流せますが、その場合はファイルパスが決まらないため、コードフェンスのマスクも `.deadclicherc.json` の読み込みも効きません。ファイルがあるならパスで渡してください。

プリセットは 4 つです。paper (論文・技術文書、113 ルール) と business (ビジネス文書、112 ルール) は語彙と書式を見ます。chat (74 ルール) は呼びかけと締めの型を許容します。ux-microcopy (26 ルール) は UI 文言の規範に書式ルールを足したもので、paper と ux-microcopy は包含関係にありません。paper は UI マイクロコピーの 17 ルールを含まないので、画面文言をチェックするなら ux-microcopy を明示的に選びます。

既定プリセットと除外パスはプロジェクト直下の `.deadclicherc.json` に置きます。`ignore` はグロブではなく、パスの前方一致か `/` 区切りでの部分一致です。

```json
{
  "preset": "business",
  "ignore": ["docs/archive/", "CHANGELOG.md"]
}
```

### textlint として

先に挙げた推奨構成をそのまま使う場合は、そこに出てくるパッケージを全部入れます。1 つでも欠けると textlint は設定を読み込めず、このツールのルールも一緒に無効になります。

```bash
npm install -D textlint \
  textlint-rule-preset-ja-technical-writing \
  @textlint-ja/textlint-rule-preset-ai-writing \
  github:BoxPistols/ux-writing-dead-cliche
```

このツールだけでよければ `textlint` と `github:BoxPistols/ux-writing-dead-cliche` の 2 つで足ります。パッケージ名は textlint の慣例に従い `textlint-rule-` 接頭辞なので、`.textlintrc.json` のルール名は `ux-writing-dead-cliche` で解決されます。

なお textlint 経由の制限は 2 つとも v0.6.1 で解消しました。コードフェンスとインラインコードのマスクは CLI と同様に効きます (この 2 件はレビューセッションからの報告で見つかり、修正しました)。severity は textlint の仕様上、診断単位では持てないため、メッセージの先頭に `[warn]` のように明示する方式です。textlint の集計上はすべて error として数えられる点だけ残ります。

### CI として

```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with:
    node-version: 22
- run: npx github:BoxPistols/ux-writing-dead-cliche check README.md docs/usage.md
```

### Claude Desktop アプリと iPhone で使う

Desktop アプリの Code モードは、この Mac に入れたプラグインをそのまま読み込みます。プラグインの仕組みがない通常のチャットと iPhone アプリには、claude.ai のスキルとして入れます。[Releases](https://github.com/BoxPistols/ux-writing-dead-cliche/releases) にある dead-cliche-review.zip (辞書 130 ルールを同梱) を claude.ai の設定にアップロードすると、チャットでも同じ辞書に基づく検出とレビュー規律が効きます。この経路の判定は LLM が辞書を読んで行うため、決定論的な検査が要る場面は CLI と CI に任せます。

iPhone からリポジトリの PR をレビューする場合は、対象リポジトリに前述の `.claude/settings.json` をコミットしておくと、claude.ai/code のクラウドセッションでもプラグインが読み込まれ、`/dead-cliche:pr-review` での検査から投稿までを iPhone アプリだけで実行できます。

## 公開後の 2 日間で変わったこと

公開後、使いながら辞書側に改修が入りました。要点は 3 つです。

1 つ目は語彙の指摘の辞書化です。私の書いた返答の「既に核でした」に対して、核 (core の直訳) は日本語の文書では使わない、という指摘を受けました。同様に、テストの成功を「緑」と呼ぶ言い回し、`§3` や `10章で述べたように` のような章番号参照も指摘され、すべてルールになりました。指摘のたびに直すのではなく、指摘を辞書に入れて二度と通さない、という運用がここで固まりました。

2 つ目は一括拡充です。単語ごとの逐次対応は非効率なので、公開資料 ([preset-ai-writing の誇張語彙](https://github.com/textlint-ja/textlint-rule-preset-ai-writing)、AI っぽい表現の考察記事 2 本) を調査し、47 ルールを一度に足しました。採否の基準は「人間の熟練した書き手が使うか」です。使うなら日本語の資産であってクリシェではないため、`銀の弾丸` や `大幅に`、`一方で` は不採用にしました。採否と理由は [docs/research-notes.md](https://github.com/BoxPistols/ux-writing-dead-cliche/blob/main/docs/research-notes.md) に全件記録してあります。

3 つ目は文体の既定です。書き直しの語尾は敬体 (です・ます) を既定にし、全ルールの良い例と書き直しコーパスを敬体に統一しました。常体を保つのは、常体で統一された学術論文のような文書だけです。

実施前と実施後の対訳は [docs/before-after.md](https://github.com/BoxPistols/ux-writing-dead-cliche/blob/main/docs/before-after.md) にあります。書き直しコーパスから自動生成され、実施後の文が全ルールで検出 0 件であることを CI が保証します。

CLI はグロブを自分で展開しないので、`docs/*.md` のような指定はシェルが実在するファイルに展開できることが前提です。一致するファイルが無いとリテラルのまま渡って ENOENT で落ちます。対象が増減するなら、ファイル名を明示するか `git ls-files` の結果を渡してください。

error 級の検出で exit 1 になります。このリポジトリ自身も、README が自分のチェックを通ることを CI で確認しています。CLI は `.md` を渡したときコードフェンスとインラインコードを検査対象から外すので、この記事のようにクリシェを例示する文書も書けます。

### Claude Code の署名を止める

plain-communication スキルと併せて、Claude Code 本体がコミットや PR に付ける署名も設定で止められます。

全プロジェクトに効かせるなら `~/.claude/settings.json`、リポジトリ単位なら `.claude/settings.json` に足します。

```json
{ "attribution": { "commit": "", "pr": "", "sessionUrl": false } }
```

## 今後

ルール数を増やすことより、negative コーパスを増やすことを優先します。誤検出の報告は、負例 1 行の PR がそのまま最小の貢献になります。貢献の単位がプロンプトの文言ではなく YAML の 1 エントリである点が、この設計で一番残したかった性質です。
