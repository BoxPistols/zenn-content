---
title: "DESIGN.mdを置くと、どこまで「いい感じ」になるのか — 74件を測って確かめた"
emoji: "📐"
type: "tech"
topics: ["designsystem", "ai", "claudecode", "frontend", "google"]
published: true
---

AIにUIを作らせると、毎回ちょっとずつ違うものが出てきます。

「モダンで、クリーンで、信頼感のある感じで」と頼む。悪くないものが出る。翌日また頼む。また悪くないものが出る。でも昨日のとは違う。

Google Labsが公開した **DESIGN.md** は、この「毎回違う」を止めるためのファイル形式です。デザインの意図を1ファイルに書いて、AIに毎回読ませます。

実際に導入して、どこまで効くのかを測りました。結論から書きます。

### この記事の内容

| | |
|:--|:--|
| [効くところと効かないところ](#効くところと効かないところ) | 先に結論 |
| [そもそも何のファイルなのか](#そもそも何のファイルなのか) | 出自と、Google自身の説明 |
| [実物を74件測った](#実物を74件測った) | 書き方は2つに分かれる／公式サンプルは真似ないほうがいい |
| [仕様どおりに書くと壊れる箇所](#仕様どおりに書くと壊れる箇所) | 黙って値が消える4パターン |
| [ボタン1個を書ききれない](#ボタン1個を書ききれない) | 一番はっきりした限界 |
| [どう書くか](#どう書くか) | 測った結果から言えること5つ |
| [従っているかをどう確かめるか](#従っているかをどう確かめるか) | 検証を自分で作れるか実験した |
| [一番危ないのは検査が通ってしまうこと](#一番危ないのは検査が通ってしまうこと) | 自分のrepoで測れる3つの数字 |
| [人に何を聞くか](#人に何を聞くか) | 聞き方で必要な習熟度が変わる |

### 調べた内容はリポジトリにまとめてあります

記事に書いた数字と実験は、全部ここから再現できます。

**https://github.com/BoxPistols/design-md-docs**

| | |
|:--|:--|
| [構造リファレンス](https://github.com/BoxPistols/design-md-docs/blob/main/docs/02-structure.md) | スキーマ・型・セクションの辞書 |
| [2つの書き方と選び方](https://github.com/BoxPistols/design-md-docs/blob/main/docs/03-two-styles.md) | 74件の測定結果と、[測定スクリプト](https://github.com/BoxPistols/design-md-docs/blob/main/tools/measure.py) |
| [書き方ガイド](https://github.com/BoxPistols/design-md-docs/blob/main/docs/04-writing-guide.md) | 良い例・悪い例・レビュー観点 |
| [失敗パターン集](https://github.com/BoxPistols/design-md-docs/blob/main/docs/05-pitfalls.md) | 7件すべての再現手順 |
| [デザイナーがいない組織での運用](https://github.com/BoxPistols/design-md-docs/blob/main/docs/06-orgs-without-designers.md) | CSSを書ける人がいない場合 |
| [検証の実験](https://github.com/BoxPistols/design-md-docs/blob/main/docs/07-machine-verification.md) | この記事の後半の詳細 |
| [テンプレート](https://github.com/BoxPistols/design-md-docs/blob/main/templates/DESIGN.md) | そのまま使える出発点 |

デザイナー向けに、値の話を抜いた解説も置いています → [Wiki](https://github.com/BoxPistols/design-md-docs/wiki)

## 効くところと効かないところ

**効く**

- 色や書体の指示がブレなくなる。セッションが変わっても、担当者が変わっても同じ値が出る
- WCAGのコントラスト比を機械でチェックできる
- Tailwindの設定やCSS変数として書き出せる
- 値が決まっていない段階でも書き始められる

**効かない**

- UIは生成しません。 CLIにあるのは検証と変換だけです
- あなたのコードは1行も読みません。 ESLintと違い、検査対象はDESIGN.md自身です
- 文章の部分は検証されません。 11個の検査ルールのうち、Markdown本文を見るのは1つだけで、それも見出しの並び順しか見ません
- ボタン1個を書ききれません（後述）

一番はっきり言えるのはこれです。

> **DESIGN.mdを置いても、実装がそれに従っているかは誰も確認していません。**

lintは通ります。CIも成功します。でもそれは「DESIGN.mdというファイルの書式が正しい」という意味であって、画面が意図どおりかとは無関係です。

:::message
検証時点: フォーマット `alpha` / CLI `@google/design.md@0.4.0` / 2026年8月。
draft段階なので、この先で挙動は変わります。
:::

---

## そもそも何のファイルなのか

YAMLのfront matterに色や書体の値を書き、その下のMarkdownに「なぜその値なのか」を書きます。

```md
---
name: Heritage
colors:
  primary: "#1A1C1E"
  tertiary: "#B8422E"
---

## Overview

高級なマット紙の質感。上質な新聞か、美術館の図録に近い。

## Colors

- **Primary (#1A1C1E)**: 見出しと本文のインク。純黒ではない
- **Tertiary (#B8422E)**: 操作できる場所にだけ使う色。文字には使わない
```

### Stitchから出てきたもの

出自を押さえておくと、後の話が繋がります。

GitHubリポジトリのhomepageが、Google Stitchのドキュメントを指しています。

```console
$ gh repo view google-labs-code/design.md --json homepageUrl
{"homepageUrl":"https://stitch.withgoogle.com/docs/design-md/specification"}
```

[公式ブログ](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-design-md/)（2026-04-21）のタイトルがそのまま答えです。

> Stitch's DESIGN.md format is now open-source so you can use it across platforms.

[Stitch](https://stitch.withgoogle.com/) はGoogle LabsのUI生成ツールです。そこで使っていた内部フォーマットを、他のツールでも使えるように切り出したものです。

### Google自身は何と言っているか

ここは正確に引用します。

> AI agents can know exactly what a color is for, and can **validate their choices against WCAG accessibility rules**.

検証できるものとして名前が挙がっているのは **WCAGだけ**です。「デザインとして正しいか検証できる」とは書いていません。

そして実際、ツールはそのとおりに動きます。**Googleの説明は正確です。** ずれているのは、読む側が「じゃあデザインも守られるんだろう」と広げてしまうところです。

---

## 実物を74件測った

仕様書を読んでも「で、みんなどう書いてるの」は分かりません。測りました。

対象は [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) という有志のコレクションです。airbnb、apple、figma、nike、notion、spotify、teslaなど74件が入っています（公式ではなくコミュニティ製）。

測定スクリプトは公開しているので、同じ結果を出せます。

```bash
git clone --depth 1 https://github.com/VoltAgent/awesome-design-md.git /tmp/awesome
python3 tools/measure.py /tmp/awesome/design-md
```

### 書き方は2つに分かれる

| | 件数 | 中身 |
|:--|--:|:--|
| 色や書体の値を書いているもの | 64 | `Overview` `Colors` `Typography` … 仕様どおりの見出し |
| **値を1つも書かず、文章だけのもの** | **10** | `1. Visual Theme & Atmosphere` 〜 `9. Agent Prompt Guide` の番号付き |

後者10件は色コードが1つも出てきません。全部が説明文です（starbucksは450行）。

**どちらもlintを通ります。** 値が固まっていない段階なら、文章だけで始めても問題ありません。

内訳と分布は [2つの書き方と選び方](https://github.com/BoxPistols/design-md-docs/blob/main/docs/03-two-styles.md) に全部載せています。

### 公式サンプルは真似ないほうがいい

同じ物差しで、本家に同梱されているサンプル3件も測りました。

| | 値の行数（中央値） | 文章の行数（中央値） |
|:--|--:|--:|
| 実物64件 | 268 | **206** |
| 公式サンプル3件 | 144 | **37** |

文章の量が **5.6倍**違います。しかも実物の最大値と公式サンプルの最小値が重なりません。公式サンプルは実物の分布の外にあります。

理由はサンプルの中身を見ると想像がつきます。3件とも色数がきっちり47個で一致していて、命名も `surface-container-lowest` `on-primary-fixed-variant` とMaterial Design 3の定義と一致します。テーマ生成ツールの出力をそのまま置いたように見えます。

**手本にするなら公式サンプルではなく、実物の中央値です。**

### 仕様にない見出しが定着している

正式な8セクションに入っていないのに、過半数が使っている見出しが3つありました。

| 見出し | 使用率 | 中身 |
|:--|--:|:--|
| Responsive Behavior | 51 / 64 | 画面幅ごとの振る舞い |
| Iteration Guide | 50 / 64 | **AIに修正を頼むときの手順** |
| Known Gaps | 43 / 64 | **まだ決めていないことの宣言** |

後ろの2つは仕様が想定していないものです。

`Known Gaps` は書いておくと効きます。「アイコンは未定。既存の線の太さから推測してよい」のように書く。書かないとAIが勝手に埋めて、しかも毎回違うやり方で埋めます。

---

## 仕様どおりに書くと壊れる箇所

npmで公開されている `@google/design.md@0.4.0` で確認したものです。7件見つかりましたが、**エラーになるのは1件だけ**で、あとは黙って壊れます。

代表的なものを4つ挙げます。残り3件と、CIに入れるチェックの例は [失敗パターン集](https://github.com/BoxPistols/design-md-docs/blob/main/docs/05-pitfalls.md) にあります。

### 数値をそのまま書くと消える

仕様書は `lineHeight` を「単位なしの数値も可」と書いていて、**仕様書自身のサンプルが `lineHeight: 1.1` を使っています**。

でもYAMLの数値として書くと捨てられます。文字列にすると通ります。

```yaml
typography:
  body:
    lineHeight: 1.5      # 消える
  body2:
    lineHeight: "1.5"    # 通る
spacing:
  sm: 8                  # 消える
  md: 16px               # 通る
```

```console
$ npx @google/design.md@0.4.0 export --format css-tailwind P.md
@theme {
  --leading-body2: 1.5;   ← body2 だけ。body は消えた
  --spacing-md: 16px;     ← md だけ。sm は消えた
}

$ npx @google/design.md@0.4.0 lint P.md
  summary: { errors: 0, warnings: 0 }   ← 何も言わない
```

しかも件数のサマリは**消えたあとの数**を報告するので、気づく手段がありません。

**対策**: front matterの値は全部クォートで囲む。

### 参照が壊れていても黙って消える

`broken-ref` というルールは「解決しない参照はエラー」と説明されていますが、実際に見ているのは `components` セクションだけです。

```yaml
colors:
  primary: "#1A1C1E"
  accent: "{colors.nope}"   # 存在しない参照
```

lintは無警告。exportすると `accent` が丸ごと消えます。

**対策**: `{参照}` は `components` の中だけで使う。

### 壊れたCSSが出る

```yaml
colors:
  bad: "hsl(120 100% 50% / -1)"
```

```
--color-bad: #00ff00-ff;   ← CSS として構文エラー
```

これがテーマファイルに混ざると、その宣言ごと無効になります。ビルドは通って、実行時に色が当たらない、という壊れ方をします。

**対策**: 色は `#RRGGBB` で書く。仕様も互換性の理由でhexを推奨しています。

### 重複見出しはエラーにならない

仕様書には「重複するセクション見出しはエラーとしてファイルを拒否する」と書いてありますが、実装されていません。

**対策**: 自分でチェックを足す。

```bash
grep -E '^## ' DESIGN.md | sort | uniq -d
```

---

## ボタン1個を書ききれない

ここが一番はっきりした限界です。

普通のボタンのCSSを並べてみます。

```css
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 6px; height: 34px; padding: 0 16px;
  border: 1px solid transparent; border-radius: 6px;
  font-size: 13px; font-weight: 600;
  transition: background .15s;
}
```

DESIGN.mdがコンポーネントに書けるのは、この8つだけです。

`backgroundColor` `textColor` `typography` `rounded` `padding` `size` `height` `width`

（型とセクションの一覧は [構造リファレンス](https://github.com/BoxPistols/design-md-docs/blob/main/docs/02-structure.md) にまとめました）

| ボタンが持っているもの | 書けるか |
|:--|:--|
| height, font-size, font-weight, border-radius | 書ける |
| padding `0 16px` | 2値なので仕様の範囲外 |
| **gap** | 書けない |
| **border** | 書けない |
| **transition** | 書けない |
| **display, align-items, justify-content** | 書けない |

**ボタン1個ですらこうです。** カード、テーブル、アラート、フォームと数えていけば、書けないものの方が多くなります。

だから「デザイナーがDESIGN.mdを直せば実装の見た目が変わる」という期待は、**仕様の能力として成立しません**。文章で「高さは34pxにして」と書くことはできますが、書いただけでは何も起きません。

---

## どう書くか

測った結果から言えることをまとめます。

**1. 値が決まっていないなら、文章だけで始める**

74件のうち10件が、色コードを1つも書いていません。決まっていない値を先に埋めると、根拠のない数字が固定化されます。

**2. Overviewに具体的な参照を1つ置く**

「モダンでクリーン」は範囲が広すぎて、AIは真ん中あたりの無難なものを作ります。「駅の発車標」「美術館の図録」「医療機器の操作パネル」のように**具体的なモノ**を挙げると、そこから細部が決まります。

しかもこれには副産物があります。具体的なモノを挙げると、**やってはいけないことが自動的に付いてきます**。「講義ハンドアウト」と言えば、グラデーションもグローも使わないことが伝わります。書かなくても伝わる。

**3. Don'tが増えてきたら、Overviewに戻る**

本家の `PHILOSOPHY.md` にこう書かれています（訳は筆者）。

> A long rambling list is often a sign the description was too vague to carry them.
> （長くとりとめのないリストは、記述が曖昧すぎてそれを運べなかった兆候であることが多い）

禁止事項を足したくなったら、まず参照を具体的にするほうが早く解決します。

**4. Known Gapsを書く**

「決めていない」と書くだけで、AIが勝手に埋めるのを防げます。「未定」と「意図的に持たない」は分けて書きます。

**5. 既知の失敗を2つだけ避ける**

値は全部クォートする。`{参照}` は `components` の中だけで使う。これで「黙って消える」の大半は防げます。

書き方の詳細は [書き方ガイド](https://github.com/BoxPistols/design-md-docs/blob/main/docs/04-writing-guide.md)、そのまま使える出発点は [テンプレート](https://github.com/BoxPistols/design-md-docs/blob/main/templates/DESIGN.md) に置いてあります。既知の失敗を回避した書き方にしてあるので、コピーすれば5は自動的に満たせます。

チーム内にCSSを書ける人がいない場合は、始め方が変わります → [デザイナーがいない組織での運用](https://github.com/BoxPistols/design-md-docs/blob/main/docs/06-orgs-without-designers.md)

---

## 従っているかをどう確かめるか

ここからが本題です。DESIGN.mdは実装を見ないので、確かめる仕組みは自分で作ることになります。作れるのかを実験しました。

以下は要点だけです。実験環境・スクリーンショット・判定スクリプトは [検証の実験](https://github.com/BoxPistols/design-md-docs/blob/main/docs/07-machine-verification.md) にあります。

### やったこと

「美術館の図録」を参照にしたDESIGN.mdを書いて、守るべきことを5つ決めました。

| | 決めごと |
|:--|:--|
| V1 | アクセント色を文字に使わない（ボタンの背景だけ） |
| V2 | font-weight 700以上を使わない |
| V3 | 角丸は3pxまで |
| V4 | 影を使わない |
| V5 | グラデーションを使わない |

同じカードUIを3通り実装しました。違うのは違反だけです。

- A: 違反なし
- B: 5つ全部違反
- C: V2とV4だけ違反

これを2種類の方法で判定させました。

- CSSを読む判定: Playwrightでcomputed styleを走査する
- 画像を見る判定: スクリーンショットだけをLLMに渡す

LLMには正解を伏せました。ファイル名を `sample-1/2/3` にして、順番も入れ替えて、画像に焼き込んだラベルも消しています。そして選択肢に **`undetermined`（画像からは判断できない）** を用意して、「分からないものを断定するより、分からないと言うほうが有害でない」と明記しました。

### 途中で実験が壊れた

スクリーンショットを撮った時点で、A（font-weight 600）とC（800）のタイトルが**見た目でほぼ同じ**でした。

Georgiaには600も800も無いので、ブラウザが両方とも合成ボールドで描きます。**CSSでは明確な違反なのに、画像には差が出ません。**

ここで分かったことがあります。

> **決めごとには「CSSを見ないと分からないもの」と「画像を見ないと分からないもの」がある。判定を1種類にすると必ず取りこぼす。**

### 結果

**CSSを読む判定は完璧でした。**

```
A（違反なし）  : 0件
B（5つ違反）   : V1〜V5 全部検出
C（2つ違反）   : V2 と V4 だけ
```

誤検出なし、見逃しなし、LLM不使用。

**画像を見る判定も、判定できる範囲では全問正解でした。**

| | sample-1 = C | sample-2 = A | sample-3 = B |
|:--|:--|:--|:--|
| V1アクセント色 | ok | ok | **違反** |
| V2 font-weight | `undetermined` | `undetermined` | `undetermined` |
| V3角丸 | ok | ok | **違反** |
| V4影 | **違反** | ok | **違反** |
| V5グラデーション | ok | ok | **違反** |

判定できた12項目すべて正解。違反なしのAを1件も違反と言いませんでした。

そして **V2は3枚とも「分からない」と答えました。** 理由の説明が的確でした（以下は要約）。

> ラスタ画像にフォントウェイトの数値情報は載らない。代理指標はステム幅しかないが、600と700の境界はステム幅にして数％の差でしかなく、その境界位置は書体のウェイト軸に依存する。書体が同定できない以上、600か700かに割り当てるのは推測にしかならない。

さらに、こちらが目視で立てた仮説を実測で裏づけてきました。見出しのインク画素数を数えて、こう報告しています。

> 15661 / 15661 / 15507

順にsample-1 / 2 / 3です。sample-1はfont-weight 800、sample-2は600なのに、**画素数が一致しています**。画像上に差が存在しないことが数値で確定しました。

### 分かったこと

判定を3層に分けるのが正解でした。

```
画像を見る判定   … 余白の印象、全体の雰囲気     ← LLM
CSS を読む判定   … 数値で書いた決めごと          ← ここが空いている
lint            … DESIGN.md 自体の書式          ← 既存
```

**CSSから分かることをLLMに聞いてはいけません。** 精度が落ちるうえに高くつきます。LLMの出番は、CSSに書いていないものだけです。

### 「分からない」と言えたのは、そう作ったから

LLMが正直に答えたのは、モデルが賢かったからではありません。

1. `undetermined` という選択肢を用意した
2. 棄権を推奨すると書いた
3. 「画像のどこを見てそう言えるか」を必須にした
4. 正解を推測できる情報を全部消した

**どれを外しても結果は変わっていたはずです。** 特に1つめは決定的で、「違反」か「ok」の二択しか渡さなければ、V2についても必ずどちらかを答えます。そしてそれは根拠のない推測になります。

---

## 一番危ないのは検査が通ってしまうこと

ここまでに挙げたものを並べると、全部同じ形をしています。

| | 見た目 | 実際 |
|:--|:--|:--|
| 数値が消える | lint成功、exit 0 | 値が失われ、件数も減ったあとの数を報告 |
| 参照が壊れる | lint成功、exit 0 | トークンごと消える |
| 文章の検証 | lint成功 | 文章は1文字も読まれていない |

**どれもエラーが出ません。** CIは全件通過します。

一方、実験でLLMが返した `undetermined` は逆の性質を持ちます。「V2は判定できません」と言われた人は別の手段を用意しますが、「V2はokです」と言われた人は何もしません。後者のほうが体験は滑らかで、成果物は壊れます。

### カバレッジも同じ形をしている

自分で提案しておいて言うのもなんですが、「DESIGN.mdに書いたコンポーネントが全部Storybookにあるか」というチェックは作れます。作れますし役に立ちます。

ただし**カバレッジ100%は、その全部が意図どおりであることを意味しません**。全部がDESIGN.mdと真逆でも数字は100%になります。

網羅したことと正しいことは別です。「テストを入れた」「カバレッジを上げた」で安心する構造は、上の表とまったく同じ形をしています。

### 経路で考える

もう一段広げると、こうなります。

```
DESIGN.md ──→ トークン ──→ テーマ ──→ 画面
          ✕            ✕          ✕
    文章は検証されない  実装を見ない  参照されているか不明
```

**各工程は個別に正しくて、それぞれのCIも通っていて、それでも端から端までは繋がっていません。** そして経路全体を見る人が構造上どこにもいません。工程ごとに担当はいても、「DESIGN.mdに書いたことが画面に届いているか」を見る役割は誰にも割り当たっていないからです。

### 自分のrepoで測れる3つの数字

抽象論で終わらせないために、いま測れるものを挙げます。

```bash
# 1. テーマを参照しているファイルの割合
grep -rl "your-theme-package" src --include='*.tsx' | wc -l
find src -name '*.tsx' | wc -l

# 2. 個別指定の量
grep -rho "sx={{\|style={{" src --include='*.tsx' | wc -l

# 3. デザイン定義から画面までの間にある検証の数
```

**1が低くて2が高いなら、トークンを直しても画面は変わりません。** その状態でデザイン定義を整備しても成果は出ません。3はたいてい0です。

---

## 人に何を聞くか

最後にもう1つ。実験でLLMに「分からない」と言わせたのと同じ話が、人間側にもあります。

「この実装は規約に沿っているか」を聞くには、規約を理解している必要があります。
「**この2枚は同じか、違うか**」なら、誰でも答えられます。

同じことを確かめるのに、聞き方で必要な習熟度が変わります。答えられない形で聞けば、返ってくるのは推測です。これは機械でも人間でも同じです。

だから確認の仕組みを作るなら、**人に残す判断は訓練が要らないものにする**のがいいと思います。差分が出たあとの「なぜ」は、機械とAIに任せられます。

---

## まとめ

- DESIGN.mdはGoogle Stitchから切り出されたもので、2026-04-21にApache 2.0で公開されたdraft仕様
- Googleの説明は正確で控えめ。「WCAGを検証できる」としか書いていない
- 実物74件を測ると、値を書かず文章だけのものが10件ある。公式サンプルは実物の分布の外にあるので手本にしない
- 仕様どおりに書いても壊れる箇所が7件。エラーになるのは1件だけで、あとは黙って消える
- ボタン1個を書ききれない。 「DESIGN.mdを直せば実装が変わる」は仕様の能力として成立しない
- 実装が従っているかは機械で判定できる。CSSを読む判定は誤検出ゼロ、画像を見る判定も判定できる範囲では全問正解だった
- そしてLLMは「分からない」と答えられた。**そう作ったから**

一番危ないのは、できていないのに検査が通ってしまうことです。エラーも出ず、カバレッジも100%で、出力は自信ありげです。

「分からない」と言える作りは、機能を減らしているように見えて、**信頼できる範囲をはっきりさせています**。範囲がはっきりしていないものは、そもそも使えません。

---

### 資料

- 解説とテンプレート: https://github.com/BoxPistols/design-md-docs
- 実験の詳細と再現手順: https://github.com/BoxPistols/design-md-docs/blob/main/docs/07-machine-verification.md
- 本家: https://github.com/google-labs-code/design.md
- 公式アナウンス: https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-design-md/
- 測定対象のコレクション: https://github.com/VoltAgent/awesome-design-md
