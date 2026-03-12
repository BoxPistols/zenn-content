---
title: "ITエンジニアが知っておくべき非推奨用語と代替リスト"
emoji: "📝"
type: "tech"
topics: ["初心者", "ポエム"]
published: true
---

## はじめに

IT業界でかつて当たり前に使われていた用語の中に、差別的な意味合いを持つものがあるという問題は、もはや「最近の話題」ではなく**業界全体の共通認識**となっています。

2020年にGitHubがデフォルトブランチを`main`に変更して以来、Google、Apple、Microsoft、IETF、Linuxカーネルなど主要な組織が公式に用語の見直しを実施しました。現在では多くの企業やOSSプロジェクトでinclusive（包括的）な用語の使用が**標準**になっています。

この記事では、日本のエンジニアが特につまずきやすいポイントを踏まえながら、非推奨用語と代替案を整理します。

:::message
この記事の目的は差別をなくすことです。非推奨用語を列挙しているのは、代替用語への移行を促すためです。
:::

## 用語と代替案

### 主従関係に由来する用語

奴隷制度を連想させる用語として、最も広く見直しが進んでいるカテゴリです。

| 非推奨用語 | 代替用語 | 補足 |
|---|---|---|
| master / slave | primary / replica | DB、ハードウェア全般 |
| master / slave | primary / secondary | 一般的な主従関係 |
| master / slave | active / standby | フェイルオーバー構成 |
| master / slave | writer / reader | 読み書き分離の文脈 |
| master / slave | controller / worker | プロセス管理の文脈 |
| master（ブランチ） | main | Git。GitHubは2020年にデフォルト変更済み |
| master key | primary key | 暗号化・認証の文脈 |
| master record / master data | reference record, golden record | データ管理の文脈 |

:::message
MySQLは8.0.26（2021年）で`SHOW REPLICA STATUS`等に変更済み。PostgreSQLも16（2023年）で`primary`/`standby`を正式採用しています。古いドキュメントやスクリプトに残っている場合は更新を推奨します。
:::

### 人種差別に由来する用語

「黒=悪、白=善」という構図を強化する表現です。

| 非推奨用語 | 代替用語 | 補足 |
|---|---|---|
| blacklist | blocklist, denylist | すべての主要企業が移行済み |
| whitelist | allowlist | 同上 |
| graylist | provisional list | メール等のフィルタリング |
| black hat / white hat | unethical / ethical hacker | セキュリティの文脈 |
| blackhole（動詞） | drop, discard | ネットワーク用語 |
| Chinese wall | information barrier | 金融・法務の文脈 |

:::message
**変更不要と判断されている用語:** Inclusive Naming Initiativeの評価で`blackbox`、`blackout`、`whitebox`、`white-label`、`red team`、`parent/child`、`foreign key`、`zombie process`、`orphan process`、`daemon`、`hamburger menu`は変更不要とされています。すべてを機械的に置き換える必要はありません。
:::

### ジェンダーに関する用語

男性を前提とした表現は、技術文書やコードコメントにも残りがちです。

| 非推奨用語 | 代替用語 | 補足 |
|---|---|---|
| man-in-the-middle（MITM） | on-path attack, machine-in-the-middle | IETF、Google推奨 |
| man-hours | person-hours, work-hours | 工数見積もりの文脈 |
| manpower | workforce, staff | 人員の文脈 |
| mankind | humanity, people | ドキュメント全般 |
| chairman | chair, moderator | 会議の進行役 |
| he/she（汎用） | they（単数） | 英語技術文書での代名詞 |
| man page | reference page | UNIX由来のコマンド名としては許容される場合も |
| webmaster | web administrator | Webサイト管理者の役職名 |
| postmaster | email administrator | メールサーバー管理者 |
| middleman | mediator, intermediary | プロキシ等の文脈 |
| guys（呼びかけ） | folks, everyone, team | 英語での汎用呼びかけ |
| housekeeping | cleanup, maintenance | 家事労働のジェンダー的含意 |

### 障害・精神疾患に関する用語（Ableist）

精神疾患や障害に対するスティグマを強化する恐れがある用語です。

| 非推奨用語 | 代替用語 | 補足 |
|---|---|---|
| sanity check | confidence check, quick check | Google、Android、IETF推奨 |
| dummy（変数・データ） | placeholder, test, mock | Android推奨 |
| cripple | degrade, limit | 機能制限の文脈 |
| crazy / insane | unexpected, remarkable | 形容詞としての使用 |
| blind（比喩） | unaware, ignore | 「blind spot」→「gap」 |
| dumb terminal | thin client, text terminal | レガシーシステムの文脈 |
| ブラインドタッチ | タッチタイピング | 日本固有の和製英語。海外では通じない |
| normal / abnormal | typical / atypical, expected / unexpected | 状態やステータスの表現 |
| fat client / fat binary | rich client, universal binary | Appleが採用 |

### 暴力・軍事に由来する用語

Microsoftが特に積極的に見直しを推奨しているカテゴリです。

| 非推奨用語 | 代替用語 | 補足 |
|---|---|---|
| abort | cancel, halt, stop | Inclusive Naming InitiativeのTier 1 |
| kill（プロセス） | stop, terminate, end | 文脈次第で許容される場合もある |
| hang（フリーズ） | stop responding, freeze | Microsoft推奨 |
| nuke | delete, remove completely | 口語的だが避けるべき |
| kill chain（サイバー） | cyberattack chain | Microsoft推奨 |
| blast radius | impact, affected scope | 軍事由来。Inclusive Naming InitiativeのTier 3 |
| demilitarized zone（DMZ） | perimeter network | Microsoft推奨 |
| war room | situation room, operations center | インシデント対応の文脈 |
| STONITH | fence | Google推奨。クラスター管理 |
| locked down | secured | Microsoft推奨 |

### 文化・社会的背景に関する用語

| 非推奨用語 | 代替用語 | 補足 |
|---|---|---|
| grandfathered | legacy, exempt, preapproved | 19世紀の投票権制限に由来（Tier 1） |
| first-class citizen | core feature, built-in, top-level | 市民権の階層を暗示 |
| tribe | squad, team | 植民地主義との関連（Tier 1） |
| segregate | separate, segment | 人種隔離政策（segregation）を想起 |
| evangelist | advocate, ambassador | 宗教的偏りの懸念（Tier 3） |
| native feature | built-in feature | 文脈によっては先住民差別と捉えられる |
| dark pattern | deceptive pattern | deceptive.design公式変更（2021年） |
| illegal（値・文字） | invalid, not valid | 移民・犯罪との連想を回避 |
| end-of-life | end of support | INI Tier 3 |

### AI関連の新しい注意用語

| 非推奨用語 | 代替用語 | 補足 |
|---|---|---|
| hallucination（AI） | confabulation, factual error, inaccuracy | 精神疾患のスティグマ＋開発者責任の回避を助長（Tier 3） |

### 日本語特有の差別表現

IT文脈で使われることがある日本語の差別表現です。放送禁止用語に指定されているものも含まれます。

| 非推奨用語 | 代替用語 | 補足 |
|---|---|---|
| 片手落ち | 不十分、考慮漏れ | 身体障害に由来。放送禁止用語 |
| 目くら判 | 形骸化した承認、確認なしの承認 | 視覚障害の蔑称に由来 |
| つんぼ桟敷 | 蚊帳の外、情報が届かない状態 | 聴覚障害の蔑称に由来 |
| びっこを引く | パフォーマンスが低下する | 身体障害の蔑称に由来 |
| ちんば | バージョン不一致、不揃い | 身体障害の蔑称に由来 |
| ブラック企業 / ホワイト企業 | 過重労働企業 / 優良企業 | 黒=悪・白=善の構図 |
| ハッカー（犯罪者の意味で） | 攻撃者、不正アクセス者 | 本来は高度な技術者の意味 |

## フレームワーク/ツール別の変更対応表

主要なプロジェクトやツールで実際に行われた用語変更の一覧です。移行作業の参考にしてください。

| プロジェクト / ツール | 変更年 | 非推奨 | 代替 |
|---|---|---|---|
| GitHub | 2020 | master（ブランチ） | main |
| Jenkins | 2016/2020 | slave / master | agent / controller |
| Redis 5.0 | 2018 | SLAVEOF | REPLICAOF |
| MySQL 8.0.26 | 2021 | SHOW SLAVE STATUS等 | SHOW REPLICA STATUS等 |
| PostgreSQL 16 | 2023 | master / slave | primary / standby |
| Kubernetes 1.20 | 2020 | master | control plane |
| Django 2.1 | 2018 | master / slave | default / replica |
| Python 3.12 | 2023 | master_open（pty） | parent_open |
| Firefox 88 | 2021 | Master Password | Primary Password |
| Chrome / Chromium | 2020 | blacklist | blocklist |
| AWS | 2020 | master account | management account |
| GCP（GKE） | 2020 | master | control plane |
| Docker Swarm | — | — | 当初からmanager / worker採用 |

## 日本のエンジニアが特に注意すべきポイント

### 1. 和製英語の罠

「**ブラインドタッチ**」は日本でのみ使われる和製英語です。英語圏では`touch typing`が正式名称であり、「blind」を使うこと自体が差別的と受け取られかねません。海外メンバーとの会話では特に注意が必要です。

### 2. MySQLの慣習が根強い

日本のWeb開発現場では、DBレプリケーションの文脈で「マスター」「スレーブ」がまだ口語的に使われています。MySQL公式が`source`/`replica`に移行していることを踏まえ、ドキュメントやSlackでの会話も含めて意識的に切り替えましょう。

### 3. 「サニティチェック」の多用

コードレビューやQAの場面で「サニティチェック」は頻出しますが、`confidence check`や`quick check`で十分に意味が通じます。

### 4. カタカナ語だと気づきにくい

「ホワイトリスト」「ブラックリスト」はカタカナで定着しているため、差別的ニュアンスに気づきにくい傾向があります。日本語でも「許可リスト」「拒否リスト」に言い換えることを推奨します。

### 5. grandfatheredの訳語に注意

「既得権」と訳されることがありますが、原語は19世紀アメリカで黒人の投票権を制限するために作られた法律用語（grandfather clause）に由来します。`legacy`や`exempt`を使いましょう。

## 実践: 開発環境での対応

### Gitのデフォルトブランチを変更

```bash
git config --global init.defaultBranch main
```

### 既存リポジトリのブランチ名を変更

```bash
git branch -m master main
git push -u origin main
# リモートのデフォルトブランチをGitHub/GitLab UIで変更後
git push origin --delete master
```

### ESLintで用語をチェック（eslint-plugin-inclusive-language）

```bash
npm install --save-dev eslint-plugin-inclusive-language
```

```js
// eslint.config.js
import inclusiveLanguage from "eslint-plugin-inclusive-language";

export default [
  {
    plugins: { "inclusive-language": inclusiveLanguage },
    rules: {
      "inclusive-language/use-inclusive-words": "warn",
    },
  },
];
```

## 参考資料

- [Inclusive Naming Initiative - Word Lists](https://inclusivenaming.org/word-lists/overview/)
- [Google Developer Documentation Style Guide](https://developers.google.com/style/inclusive-documentation)
- [Android - Respectful Code](https://source.android.com/docs/setup/contribute/respectful-code)
- [Microsoft - Bias-Free Communication](https://learn.microsoft.com/en-us/style-guide/bias-free-communication)
- [IETF - Terminology, Power, and Exclusionary Language](https://datatracker.ietf.org/doc/draft-knodel-terminology/)

## まとめ

用語の置き換えは「言葉狩り」ではなく、**コードベースやドキュメントを世界中の誰にとっても読みやすくする取り組み**です。

日本国内だけで開発していると感覚的に掴みにくい部分もありますが、OSSへのコントリビューションや海外メンバーとの協業の場面では、こうした配慮がコミュニケーションの質を大きく左右します。

「変更不要」と判断されている用語もあるように、すべてを機械的に変える必要はありません。まずは自分のプロジェクトで使われている用語を確認し、主要なもの（master/slave、blacklist/whitelist）から段階的に移行していくのが現実的です。
