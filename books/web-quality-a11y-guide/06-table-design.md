---
title: "Table設計の全課題"
---

テーブルは最も古くからあるHTML要素のひとつだが、正しく設計するのは驚くほど難しいコンポーネントである。セマンティクス、アクセシビリティ、レスポンシブ対応、テキストの溢れ、横スクロール、操作UIまで、テーブル設計で直面するすべての課題と解決策を網羅する。

管理画面、ダッシュボード、データ一覧など、テーブルは実務で頻繁に登場する。しかし「divで組む」「ellipsisで切り詰める」「入れ子テーブルで階層を表現する」といった安易な実装は、アクセシビリティの崩壊やレスポンシブ不可の原因になる。ここでテーブル設計の全体像を把握し、どのようなデータにも対応できる力を身につけてほしい。

## 1. テーブルの正しいHTML構造

テーブルのHTMLにはセマンティクスを表現するための要素が豊富に用意されている。`div` と `span` でテーブルを自作するのは、スクリーンリーダーがデータの構造を理解できなくなるため避けなければならない。

### 全要素を使った正しい構造

```html
<table>
  <!-- caption: テーブルの目的を説明する（スクリーンリーダーが最初に読む） -->
  <caption>2024年度 四半期売上レポート</caption>

  <!-- thead: ヘッダー行のグループ -->
  <thead>
    <tr>
      <th scope="col">四半期</th>
      <th scope="col">売上高</th>
      <th scope="col">前年比</th>
      <th scope="col">達成率</th>
    </tr>
  </thead>

  <!-- tbody: データ行のグループ -->
  <tbody>
    <tr>
      <th scope="row">Q1</th>
      <td>1,200万円</td>
      <td>+12%</td>
      <td>98%</td>
    </tr>
    <tr>
      <th scope="row">Q2</th>
      <td>1,450万円</td>
      <td>+8%</td>
      <td>105%</td>
    </tr>
  </tbody>

  <!-- tfoot: フッター行のグループ（合計、集計など） -->
  <tfoot>
    <tr>
      <th scope="row">合計</th>
      <td>2,650万円</td>
      <td>+10%</td>
      <td>101%</td>
    </tr>
  </tfoot>
</table>
```

### 各要素の役割

| 要素 | 役割 |
|------|------|
| **caption** | テーブルの説明。画面に表示されなくても支援技術がテーブルの目的を伝える |
| **thead / tbody / tfoot** | 行の論理グループ。CSSでのスタイリングや印刷時のヘッダー繰り返しに使われる |
| **th** | ヘッダーセル。`scope` 属性で「列のヘッダー」か「行のヘッダー」かを明示する |
| **td** | データセル |
| **scope="col"** | この `th` は列方向のヘッダーであることを示す |
| **scope="row"** | この `th` は行方向のヘッダーであることを示す |

:::message alert
**divでテーブルを作らない**

`display: grid` や `display: flex` でテーブル風の見た目を作ることは技術的に可能だが、スクリーンリーダーは「これがテーブルである」ことを認識できない。データの行列関係を表現するコンテンツには、必ず `table` 要素を使用する。CSS Gridで自由なレイアウトを作りたい場合でも、`role="table"`、`role="row"`、`role="cell"` などのARIAロールを付与する方法があるが、ネイティブHTML要素が使えるならARIAよりもネイティブ要素を優先するのが原則である。
:::

```html
<!-- 悪い例: 見た目はテーブルだが、支援技術はテーブルとして認識しない -->
<div class="table">
  <div class="table-header">
    <div class="table-cell">名前</div>
    <div class="table-cell">メール</div>
  </div>
  <div class="table-row">
    <div class="table-cell">田中太郎</div>
    <div class="table-cell">tanaka@example.com</div>
  </div>
</div>

<!-- 良い例: セマンティックな HTML テーブル -->
<table>
  <thead>
    <tr>
      <th scope="col">名前</th>
      <th scope="col">メール</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>田中太郎</td>
      <td>tanaka@example.com</td>
    </tr>
  </tbody>
</table>
```

## 2. セル内の大量テキスト問題

テーブルのセルに長いテキストが入ると、レイアウトが崩れる。多くの開発者が最初に手を伸ばすのが `text-overflow: ellipsis` だが、これは万能な解決策ではない。

### text-overflow: ellipsisを安易に多用すべきでない理由

- 情報の損失: ユーザーは切り詰められた部分を読むことができない。「東京都港区...」の先が住所の重要な部分かもしれない
- 識別不能: 類似したデータが同じ切り詰め位置で切れると、どれがどれか区別できなくなる
- アクセシビリティ: スクリーンリーダーはCSSのellipsisを無視し全文を読み上げるが、視覚的なユーザーは全文を確認できない
- 検索・コピーの妨げ: ユーザーがセルのテキストをコピーしようとしても、表示上は切り詰められた状態

### ellipsisの典型的な実装

使いどころを慎重に選ぶ必要がある。

```css
/* 1行に切り詰め */
.cell-ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;  /* 必ず幅の制限が必要 */
}

/* 複数行で切り詰め（-webkit-line-clamp） */
.cell-line-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  /* text-overflow: ellipsis は不要（line-clamp が自動で付ける） */
}
```

### ellipsisの代替アプローチ

#### 1. ツールチップ（ellipsis + ホバーで全文表示）

ellipsisを使う場合は、必ず `title` 属性やカスタムツールチップで全文を確認できるようにする。ただし、モバイルではホバーが使えないため、タッチデバイスへの配慮が必要である。

```tsx
function EllipsisCell({ text, maxWidth = 200 }: {
  text: string;
  maxWidth?: number;
}) {
  return (
    <td
      title={text}  // ネイティブツールチップ（最低限の対応）
      style={{
        maxWidth,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {text}
    </td>
  );
}
```

#### 2. 展開表示（クリックで全文を表示）

行をクリックまたは「もっと見る」ボタンで全文を展開するパターンである。モバイルでも使えるため、ツールチップより汎用的である。

```tsx
function ExpandableCell({ text, previewLength = 50 }: {
  text: string;
  previewLength?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = text.length > previewLength;

  return (
    <td>
      <span>{expanded ? text : text.slice(0, previewLength)}</span>
      {needsTruncation && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-blue-600 text-xs ml-1 underline"
        >
          {expanded ? '閉じる' : '...もっと見る'}
        </button>
      )}
    </td>
  );
}
```

#### 3. セル内折り返し（white-space: normal）

テキストが重要で切り詰めが許容されない場合は、セル内で折り返すのが最もシンプルな解決策である。行の高さが不揃いになるが、全文が表示される確実な方法である。

#### 4. 詳細リンク（別ページ / モーダルへ遷移）

テーブルにはキーとなる情報だけを表示し、全文は詳細ページやモーダルで確認させるパターンである。データ量が多い管理画面では最も実用的なアプローチである。

### white-spaceの判断基準

```css
/* nowrap: 折り返しなし。ellipsis と組み合わせる場合に使う */
/* 用途: ID、日付、ステータスなど短いデータが確実なカラム */
.cell-nowrap {
  white-space: nowrap;
}

/* normal: 通常の折り返し（デフォルト）。単語の区切りで改行 */
/* 用途: 説明文、住所、コメントなど長いテキストを表示するカラム */
.cell-normal {
  white-space: normal;
}

/* break-spaces / pre-wrap: 連続する空白も保持して折り返す */
/* 用途: コードやフォーマット済みテキストを表示する場合 */
.cell-prewrap {
  white-space: pre-wrap;
}
```

### word-breakと日本語テキストの注意点

:::message alert
**word-break: break-allは日本語で問題を起こす**

`word-break: break-all` はすべての文字位置で改行を許可する。英語のテキストでは長いURLやハッシュ値を折り返すのに有効だが、日本語のテキストでは元々任意の位置で改行されるため、助詞の直前で改行されるなど可読性が低下するケースがある。日本語コンテンツが含まれるテーブルでは `overflow-wrap: break-word` を使う方が安全である。これは単語がセル幅を超える場合にのみ折り返しを行う。
:::

```css
/* 危険: すべての文字間で改行を許可 */
.cell-break-all {
  word-break: break-all;
  /* "東京都港区六本木" が "東京都港" + "区六本木" のように
     意味のない位置で分割される可能性がある */
}

/* 安全: 単語がはみ出す場合にのみ折り返す */
.cell-break-word {
  overflow-wrap: break-word;
  /* 長い URL やメールアドレスがセルからはみ出す場合に折り返す
     通常の日本語テキストには影響しない */
}

/* 推奨: テーブルセルの汎用設定 */
.table-cell-text {
  white-space: normal;
  overflow-wrap: break-word;
  min-width: 100px;   /* セルが極端に狭くならないようにする */
}
```

## 3. テーブルの横スクロール

カラム数が多いテーブルは、狭いビューポートに収まりきらないことがある。横スクロールはこの問題に対する最も一般的なアプローチだが、ユーザーがスクロール可能であることに気づけるよう設計する必要がある。

### 横スクロールを導入する判断基準

- カラム数が5以上で、各カラムに最低限必要な幅がある場合
- テーブルの最小幅が768px以上になる場合（モバイルに収まらない）
- カラムを非表示にすると情報が失われる場合（すべてのカラムが重要）
- 印刷やエクスポートが不要で、画面上での閲覧が主目的の場合

### overflow-x wrapperパターン

テーブル自体に `overflow` をかけても効かない。必ずwrapper divを使う。

```css
/* 横スクロールのラッパー */
.table-scroll-wrapper {
  overflow-x: auto;        /* 横スクロールを有効化 */
  -webkit-overflow-scrolling: touch;  /* iOS のスムーズスクロール */
  max-width: 100%;
}

/* テーブル本体には最小幅を設定 */
.table-scroll-wrapper table {
  min-width: 800px;        /* これ以下にはならない */
  width: 100%;
  border-collapse: collapse;
}
```

Reactでの実装例を以下に示す。

```tsx
function ScrollableTable({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table style={{ minWidth: 800, width: '100%', borderCollapse: 'collapse' }}>
        {children}
      </table>
    </div>
  );
}

// 使用例
<ScrollableTable>
  <thead>
    <tr>
      <th>ID</th>
      <th>名前</th>
      <th>メール</th>
      <th>部署</th>
      <th>入社日</th>
      <th>ステータス</th>
    </tr>
  </thead>
  <tbody>{/* ... */}</tbody>
</ScrollableTable>
```

### スクロールインジケータ（グラデーション影）

ユーザーはテーブルが横にスクロールできることに気づかないことがある。グラデーションの影を使って「まだコンテンツがある」ことを視覚的に示す。

```css
/* テーブルラッパーの親要素 */
.table-container {
  position: relative;
}

/* 右端のグラデーション: 「右にまだある」を示す */
.table-container::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 40px;
  background: linear-gradient(to left, white, transparent);
  pointer-events: none;  /* クリックを透過 */
  opacity: 1;
  transition: opacity 0.3s;
}

/* JavaScript でスクロール位置を監視し、
   右端に到達したらグラデーションを非表示にする */
.table-container.scrolled-to-end::after {
  opacity: 0;
}

/* 左端のグラデーション: 「左にもある」を示す */
.table-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 40px;
  background: linear-gradient(to right, white, transparent);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s;
  z-index: 1;
}

.table-container.scrolled-from-start::before {
  opacity: 1;
}
```

### 固定カラム + スクロール（position: sticky）

左端のカラム（IDや名前など）を固定し、残りのカラムをスクロールさせるパターンである。ユーザーがどの行を見ているか常に把握でき、データの関連性を失わない。

```css
/* 横スクロール可能なラッパー */
.table-wrapper {
  overflow-x: auto;
}

.table-wrapper table {
  min-width: 1000px;
  border-collapse: separate;   /* sticky の場合は separate が必要 */
  border-spacing: 0;
}

/* 最初のカラムを固定 */
.table-wrapper th:first-child,
.table-wrapper td:first-child {
  position: sticky;
  left: 0;
  z-index: 1;
  background: white;     /* 背景色がないと下のセルが透けて見える */
}

/* 固定カラムの右に影を付ける */
.table-wrapper th:first-child::after,
.table-wrapper td:first-child::after {
  content: '';
  position: absolute;
  top: 0;
  right: -6px;
  bottom: 0;
  width: 6px;
  background: linear-gradient(to right, rgba(0, 0, 0, 0.08), transparent);
}

/* ダークモード対応 */
[data-theme="dark"] .table-wrapper th:first-child,
[data-theme="dark"] .table-wrapper td:first-child {
  background: #1e293b;
}
```

:::message
**border-collapseとstickyの互換性**

`border-collapse: collapse` と `position: sticky` を組み合わせると、ブラウザによってはstickyが正しく機能しない。固定カラムを使う場合は `border-collapse: separate; border-spacing: 0;` に設定し、ボーダーは個別のセルに適用する。
:::

## 4. レスポンシブテーブルの戦略

テーブルのレスポンシブ対応にはいくつかのアプローチがあり、データの性質やカラム数に応じて使い分ける。「唯一の正解」はなく、テーブルの内容に応じた選択が必要である。

### 戦略A: カード化パターン

モバイル幅ではテーブルの各行をカード形式に変換するパターンである。カラム数が少なく（3〜5列）、各行がひとつのエンティティを表す場合に有効である。

```css
/* デスクトップ: 通常のテーブル表示 */
.responsive-table {
  width: 100%;
  border-collapse: collapse;
}

.responsive-table th,
.responsive-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
}

/* モバイル: テーブルをカード化 */
@media (max-width: 768px) {
  .responsive-table thead {
    display: none;   /* ヘッダー行を隠す */
  }

  .responsive-table tbody tr {
    display: block;
    margin-bottom: 16px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px;
    background: white;
  }

  .responsive-table tbody td {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #f1f5f9;
  }

  .responsive-table tbody td:last-child {
    border-bottom: none;
  }

  /* data-label 属性でカラム名を表示 */
  .responsive-table tbody td::before {
    content: attr(data-label);
    font-weight: 600;
    color: #64748b;
    flex-shrink: 0;
    margin-right: 16px;
  }
}
```

`data-label` 属性を使ったHTMLは以下のようになる。

```html
<table class="responsive-table">
  <thead>
    <tr>
      <th>名前</th>
      <th>部署</th>
      <th>メール</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td data-label="名前">田中太郎</td>
      <td data-label="部署">開発部</td>
      <td data-label="メール">tanaka@example.com</td>
    </tr>
    <tr>
      <td data-label="名前">鈴木花子</td>
      <td data-label="部署">デザイン部</td>
      <td data-label="メール">suzuki@example.com</td>
    </tr>
  </tbody>
</table>
```

### 戦略B: 優先カラム表示

カラム数が多い場合に、モバイルでは重要度の高いカラムだけを表示し、残りは非表示にするパターンである。非表示にしたカラムは「詳細」リンクや展開ボタンで確認できるようにする。

```css
/* すべてのカラムにデータ属性で優先度を設定 */
/* priority="1" は常に表示、priority="2" は md 以上、priority="3" は lg 以上 */

@media (max-width: 768px) {
  [data-priority="2"],
  [data-priority="3"] {
    display: none;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  [data-priority="3"] {
    display: none;
  }
}
```

:::message
**Reactでの動的カラム非表示**

Reactで優先カラム表示を実装する場合は、CSSの `display: none` よりもJavaScriptで「表示するカラムのリスト」を管理し、条件付きレンダリングする方が制御しやすい。`useMediaQuery` フックでブレークポイントを検出し、カラム定義に `priority` フィールドを持たせるアプローチが一般的である。
:::

### 戦略C: 横スクロール + 固定列

前のセクションで解説した横スクロール + `position: sticky` のパターンである。すべてのカラムが重要で、どれも非表示にできない場合に最適である。データの比較が必要な分析ダッシュボードなどで多用される。

### 戦略の選び方

| 戦略 | 適用条件 |
|------|----------|
| **カード化** | カラム3〜5列、各行が独立したエンティティ（ユーザー一覧、商品一覧） |
| **優先カラム表示** | カラム6列以上、一部のカラムは省略可能（管理画面のログ一覧など） |
| **横スクロール + 固定列** | すべてのカラムが必要、データの横比較が必要（財務データ、比較表） |

## 5. 入れ子テーブルを避ける

テーブルのセル内に別のテーブルをネストする「入れ子テーブル」は、階層的なデータを表現する手段として一見便利に思えるが、実際には深刻な問題を引き起こす。

### 入れ子テーブルが問題である理由

- アクセシビリティの崩壊: スクリーンリーダーは入れ子テーブルの「どのヘッダーがどのデータに対応するか」を正しく伝えられない。ユーザーは構造を理解できず迷子になる
- 認知負荷: 視覚的にも「テーブルの中のテーブル」は情報の階層を把握しにくい。入れ子が2段以上になると壊滅的である
- レスポンシブ不可: 入れ子テーブルはどのレスポンシブ戦略（カード化、優先カラム、横スクロール）とも相性が悪い
- パフォーマンス: DOMノードが爆発的に増え、レンダリングコストが高くなる

```html
<!-- 悪い例: 注文テーブルの中に明細テーブルをネスト -->
<table>
  <thead>
    <tr>
      <th>注文ID</th>
      <th>顧客名</th>
      <th>明細</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>ORD-001</td>
      <td>田中太郎</td>
      <td>
        <!-- 入れ子テーブル: 避けるべき -->
        <table>
          <tr><td>商品A</td><td>3個</td><td>9,000円</td></tr>
          <tr><td>商品B</td><td>1個</td><td>5,000円</td></tr>
        </table>
      </td>
    </tr>
  </tbody>
</table>
```

### 代替案1: アコーディオン行

親行をクリックすると子行が展開されるパターンである。同じテーブル内で階層を表現でき、DOM構造もフラットに保てる。

```tsx
function OrderTable({ orders }: { orders: Order[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <table>
      <thead>
        <tr>
          <th scope="col">注文ID</th>
          <th scope="col">顧客名</th>
          <th scope="col">合計</th>
          <th scope="col">操作</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <Fragment key={order.id}>
            {/* 親行 */}
            <tr>
              <td>{order.id}</td>
              <td>{order.customer}</td>
              <td>{order.total}</td>
              <td>
                <button onClick={() => setExpandedId(
                  expandedId === order.id ? null : order.id
                )}>
                  {expandedId === order.id ? '閉じる' : '明細を見る'}
                </button>
              </td>
            </tr>
            {/* 子行（展開時のみ表示） */}
            {expandedId === order.id && order.items.map((item) => (
              <tr key={item.id} style={{ backgroundColor: '#f8fafc' }}>
                <td></td>
                <td>{item.name}</td>
                <td>{item.quantity}個</td>
                <td>{item.price}円</td>
              </tr>
            ))}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
```

### 代替案2: マスター / ディテールパターン

左側にテーブル（一覧）、右側に詳細パネルを配置するレイアウトである。行を選択すると詳細パネルの内容が切り替わる。管理画面やメールクライアントでよく見られるパターンである。

### 代替案3: ツリービュー

ファイルシステムのような階層構造が必要な場合は、テーブルではなく専用のツリービューコンポーネントを使う。テーブルの枠に無理やり階層を押し込むより、適切なUIパターンを選ぶことが重要である。

## 6. テーブルのアクセシビリティ

テーブルはスクリーンリーダーにとって最もナビゲーションが難しい要素のひとつである。正しいマークアップがあれば、支援技術はセルとヘッダーの関係を伝えてくれるが、マークアップが不適切だと、ユーザーはテーブルの中で迷子になる。

### scope属性の必須性

```html
<table>
  <caption>社員名簿</caption>
  <thead>
    <tr>
      <!-- scope="col": この th は列全体のヘッダー -->
      <th scope="col">社員番号</th>
      <th scope="col">名前</th>
      <th scope="col">部署</th>
      <th scope="col">入社年</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <!-- scope="row": この th は行のヘッダー -->
      <th scope="row">EMP-001</th>
      <td>田中太郎</td>
      <td>開発部</td>
      <td>2020</td>
    </tr>
    <tr>
      <th scope="row">EMP-002</th>
      <td>鈴木花子</td>
      <td>デザイン部</td>
      <td>2021</td>
    </tr>
  </tbody>
</table>

<!-- スクリーンリーダーの読み上げ例:
  "社員番号 EMP-001、名前 田中太郎、部署 開発部、入社年 2020"
  scope があるからこそ、各セルがどのヘッダーに対応するかが伝わる -->
```

### caption要素の重要性

`caption` はテーブルの目的や内容を要約するテキストである。スクリーンリーダーのユーザーがテーブルに到達したとき、最初に読み上げられるのがcaptionである。captionがないと、ユーザーは「このテーブルが何のデータなのか」をヘッダーセルを1つずつ読み上げるまで把握できない。

視覚的にcaptionを非表示にしつつ、支援技術には提供する方法もある。

```css
/* caption を視覚的に隠す（スクリーンリーダーには読める） */
table caption {
  /* visually-hidden パターン */
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* もしくは見出しとして堂々と表示する */
table caption.visible {
  position: static;
  width: auto;
  height: auto;
  padding: 12px 16px;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
  text-align: left;
  font-weight: 600;
  font-size: 1.125rem;
}
```

### aria-sortでソート状態を示す

ソート可能なテーブルでは、現在のソート状態を `aria-sort` 属性で支援技術に伝える必要がある。

```tsx
type SortDirection = 'ascending' | 'descending' | 'none';

function SortableHeader({
  label,
  sortDirection,
  onSort,
}: {
  label: string;
  sortDirection: SortDirection;
  onSort: () => void;
}) {
  return (
    <th
      scope="col"
      aria-sort={sortDirection}
      style={{ cursor: 'pointer', userSelect: 'none' }}
    >
      <button
        onClick={onSort}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          font: 'inherit', color: 'inherit', display: 'flex',
          alignItems: 'center', gap: 4,
        }}
      >
        {label}
        <span aria-hidden="true">
          {sortDirection === 'ascending' && ' \u25B2'}
          {sortDirection === 'descending' && ' \u25BC'}
          {sortDirection === 'none' && ' \u25B2\u25BC'}
        </span>
      </button>
    </th>
  );
}

// aria-sort の値:
// "ascending"  -- 昇順でソート中
// "descending" -- 降順でソート中
// "none"       -- ソートされていない
// "other"      -- 上記以外のソート順
```

### 空セルの取り扱い

:::message alert
**空セルを放置しない**

データがない空のセルは、スクリーンリーダーが「空白」としか読み上げないため、ユーザーは「データがないのか」「まだ読み込み中なのか」「エラーなのか」を判断できない。空セルには `aria-label="データなし"` を付与するか、視覚的にも「-」「N/A」「未設定」などのプレースホルダーを表示する。
:::

```tsx
function DataCell({ value }: { value: string | null }) {
  if (value === null || value === '') {
    return (
      <td aria-label="データなし" style={{ color: '#94a3b8' }}>
        -
      </td>
    );
  }
  return <td>{value}</td>;
}
```

## 7. テーブルの操作UI

データテーブルは表示するだけでなく、ソート、フィルター、ページネーション、行選択などの操作機能が求められることが多い。これらの操作UIを適切に設計する指針を示す。

### ソート機能

```tsx
type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
} | null;

function useTableSort<T>(data: T[], config: SortConfig): T[] {
  return useMemo(() => {
    if (!config) return data;

    return [...data].sort((a, b) => {
      const aVal = a[config.key as keyof T];
      const bVal = b[config.key as keyof T];

      if (aVal < bVal) return config.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return config.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, config]);
}

// 使用例
function UserTable({ users }: { users: User[] }) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const sortedUsers = useTableSort(users, sortConfig);

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key && prev.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return { key, direction: 'asc' };
    });
  };

  return (
    <table>
      <thead>
        <tr>
          <th scope="col" onClick={() => handleSort('name')}>名前</th>
          <th scope="col" onClick={() => handleSort('email')}>メール</th>
          <th scope="col" onClick={() => handleSort('createdAt')}>登録日</th>
        </tr>
      </thead>
      <tbody>
        {sortedUsers.map((user) => (
          <tr key={user.id}>
            <td>{user.name}</td>
            <td>{user.email}</td>
            <td>{user.createdAt}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### ページネーション

```tsx
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <nav aria-label="テーブルのページナビゲーション">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="前のページ"
        >
          前へ
        </button>

        <span aria-live="polite">
          {currentPage} / {totalPages} ページ
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="次のページ"
        >
          次へ
        </button>
      </div>
    </nav>
  );
}
```

### 行選択（チェックボックス）

```tsx
function SelectableTable({ rows }: { rows: RowData[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allSelected = selectedIds.size === rows.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    }
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <table>
      <thead>
        <tr>
          <th scope="col">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => { if (el) el.indeterminate = someSelected; }}
              onChange={toggleAll}
              aria-label="すべての行を選択"
            />
          </th>
          <th scope="col">名前</th>
          <th scope="col">メール</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>
              <input
                type="checkbox"
                checked={selectedIds.has(row.id)}
                onChange={() => toggleRow(row.id)}
                aria-label={`${row.name} を選択`}
              />
            </td>
            <td>{row.name}</td>
            <td>{row.email}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// 注目ポイント:
// 1. indeterminate 状態（一部選択）をチェックボックスに反映
// 2. 各チェックボックスに aria-label で対象を明示
// 3. 選択状態を Set で管理（O(1) の追加・削除・参照）
```

### インライン編集の是非

:::message alert
**インライン編集は慎重に導入する**

テーブルのセルを直接クリックして編集できる「インライン編集」は、一見便利だが以下の問題がある。(1) 誤操作で意図しない変更が発生しやすい。(2) 変更の確認・取り消しのUIが複雑になる。(3) バリデーションエラーの表示場所が限られる。(4) アクセシビリティの実装が非常に複雑。インライン編集を導入する場合は、明確な「編集モード」への切り替え、変更のプレビュー、Undo機能の提供を検討する。多くの場合、行をクリックして別パネルやモーダルで編集する方が安全である。
:::

## 8. CSSテーブルレイアウトの制御

CSSにはテーブルのレイアウトを制御するプロパティがいくつかある。これらを正しく使い分けることで、意図したレイアウトを実現できる。

### table-layout: fixed vs auto

```css
/* auto（デフォルト）: すべてのセルの内容を見てから幅を決定 */
.table-auto {
  table-layout: auto;
  width: 100%;
  /* メリット: 内容に応じて最適な幅が自動計算される */
  /* デメリット: すべてのセルを読むまで描画が始まらない（大量行で遅延） */
  /* デメリット: 内容によって幅が変わるため予測が難しい */
}

/* fixed: 最初の行（ヘッダー）の幅指定だけで幅が確定 */
.table-fixed {
  table-layout: fixed;
  width: 100%;
  /* メリット: 1行目を読んだだけで描画開始（パフォーマンス良好） */
  /* メリット: カラム幅が安定し、予測可能なレイアウトになる */
  /* デメリット: 内容がはみ出す可能性がある（overflow の対策が必要） */
}

/* table-layout: fixed では、th の width が尊重される */
.table-fixed th:nth-child(1) { width: 80px; }    /* ID */
.table-fixed th:nth-child(2) { width: 200px; }   /* 名前 */
.table-fixed th:nth-child(3) { width: auto; }     /* 残りの幅 */
.table-fixed th:nth-child(4) { width: 120px; }   /* 日付 */
```

**使い分けの指針:**

| 条件 | 推奨 |
|------|------|
| データが少ない（〜100行）、カラム幅が内容に依存する | `auto` |
| データが多い（100行以上）、カラム幅を厳密に制御したい | `fixed` |

### min-width / max-widthの効き方

```css
/* table-layout: auto の場合 */
/* min-width は効くが、max-width は無視されることがある */
.table-auto td {
  min-width: 100px;   /* 最低幅は保証される */
  max-width: 300px;   /* 他のカラムが小さければ無視されることがある */
}

/* table-layout: fixed の場合 */
/* width が優先され、min-width / max-width の挙動が変わる */
.table-fixed td {
  width: 200px;       /* この幅が強制される */
  overflow: hidden;   /* はみ出す内容を隠す */
}

/* 推奨: fixed + overflow-wrap の組み合わせ */
.table-fixed td.text-cell {
  overflow-wrap: break-word;  /* 長い単語を折り返す */
  overflow: hidden;           /* はみ出しを防止 */
  white-space: normal;        /* 折り返しを許可 */
}
```

### border-collapse vs border-spacing

```css
/* border-collapse: collapse */
/* セル同士のボーダーが統合される（最も一般的） */
.table-collapse {
  border-collapse: collapse;
  /* メリット: スッキリした見た目、ボーダーの重複なし */
  /* デメリット: border-radius がテーブルに効かない */
  /* デメリット: position: sticky と相性が悪い場合がある */
}

.table-collapse th,
.table-collapse td {
  border: 1px solid #e2e8f0;
  padding: 12px 16px;
}

/* border-collapse: separate + border-spacing */
/* セル同士の間にスペースが入る */
.table-separate {
  border-collapse: separate;
  border-spacing: 0;  /* 0 にすると collapse と見た目が近い */
  /* border-spacing: 4px;  セル間に隙間を入れる場合 */
  /* メリット: border-radius が効く */
  /* メリット: position: sticky と互換性がある */
  /* メリット: セル間のスペースを自由に制御できる */
}

.table-separate th,
.table-separate td {
  border-bottom: 1px solid #e2e8f0;
  border-right: 1px solid #e2e8f0;
  padding: 12px 16px;
}

/* border-radius を使ったテーブル（separate が必要） */
.table-rounded {
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;  /* 角丸の外をクリップ */
}
```

### stickyヘッダーの安全な実装

:::message
**stickyヘッダーを使う場合の注意**

縦に長いテーブルで `thead` を `position: sticky; top: 0;` で固定する場合、`border-collapse: collapse` だとヘッダーのボーダーがスクロール時に消えることがある（ブラウザの実装差異）。stickyヘッダーを使う場合は `border-collapse: separate` を使い、ヘッダーセルに個別にボーダーと背景色を設定するのが安全である。
:::

```css
/* sticky ヘッダー + separate ボーダー */
.sticky-table {
  border-collapse: separate;
  border-spacing: 0;
  width: 100%;
}

.sticky-table thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #f8fafc;      /* 背景色は必須（透過させない） */
  border-bottom: 2px solid #e2e8f0;
  padding: 12px 16px;
  font-weight: 600;
  text-align: left;
}

.sticky-table tbody td {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
}
```

## テーブル設計チェックリスト

テーブルを実装する際に、以下の項目を確認する。

- [ ] セマンティックなHTML（`table`, `thead`, `tbody`, `th`, `td`）を使っているか
- [ ] `caption` 要素でテーブルの目的を示しているか
- [ ] `th` に `scope="col"` / `scope="row"` を付与しているか
- [ ] 長いテキストの処理方針を決めているか（折り返し / ellipsis + ツールチップ / 展開）
- [ ] 横スクロールが必要な場合、wrapper divでラップしているか
- [ ] スクロール可能であることが視覚的に示されているか
- [ ] レスポンシブ戦略を選択しているか（カード化 / 優先カラム / 横スクロール）
- [ ] 入れ子テーブルを使わず、アコーディオンや詳細パネルで代替しているか
- [ ] 空セルに適切なプレースホルダーまたは `aria-label` を設定しているか
- [ ] ソート状態が `aria-sort` で支援技術に伝わるか

## よくある質問

:::details table-layout: fixedとautoはどう使い分ければいいですか？
データ量が少なく（〜100行）カラム幅を内容に合わせたい場合は `auto`（デフォルト）を使う。データ量が多い場合や、カラム幅を厳密に制御したい場合は `fixed` を使う。`fixed` はヘッダー行だけでレイアウトが確定するため、大量データのレンダリングが高速である。ただし、`fixed` ではセルの内容がはみ出す可能性があるため、overflowの対策が必要になる。
:::

:::detailsテーブルにカラムが10列以上あります。レスポンシブ対応はどうすべきですか？
カラムが10列以上の場合、カード化パターンは情報量が多すぎて破綻する。横スクロール + 固定列（`position: sticky` で左端1〜2列を固定）が最も実用的である。加えて、ユーザーが表示カラムを選択できる「カラム設定」機能を提供すると、各ユーザーが必要なカラムだけを表示できる。
:::

:::details Reactでテーブルを実装するとき、TanStack Tableのようなライブラリは使うべきですか？
ソート、フィルター、ページネーション、仮想スクロール、カラムのリサイズなど複雑な機能が必要な場合はTanStack Table（旧React Table）の利用を推奨する。ライブラリはヘッドレス（UIなし）なので、スタイルは自由に制御できる。一方、単純な表示だけのテーブルなら、ライブラリなしでネイティブの `table` 要素を使う方がシンプルである。
:::

:::detailsテーブルの行数が1,000行を超えます。パフォーマンスの対策は？
DOMに1,000行以上のテーブルをレンダリングするとパフォーマンスが低下する。主な対策は (1) ページネーションで表示行数を制限する、(2) 仮想スクロール（react-window, TanStack Virtual）で画面に見えている行だけをレンダリングする、(3) `table-layout: fixed` でレイアウト計算を高速化する、の3つである。まずはページネーションを検討し、「全行を一覧したい」要件がある場合に仮想スクロールを導入する。
:::
