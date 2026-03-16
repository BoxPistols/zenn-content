---
title: "セマンティック HTML と ARIA"
---

Web アクセシビリティの土台となるセマンティック HTML と ARIA 属性を体系的に扱う。スクリーンリーダーやキーボード操作に対応した、すべてのユーザーが利用可能なインターフェースを構築するための知識を整理する。

## セマンティック HTML とは

セマンティック（意味論的）HTML とは、コンテンツの「意味」と「構造」を正しく伝える HTML 要素を使うことである。見た目は CSS で制御できるが、構造の意味はブラウザ、スクリーンリーダー、検索エンジンが HTML 要素のタグ名から判断する。

### なぜ div と span だけではダメなのか

`<div>` と `<span>` は汎用コンテナであり、それ自体に意味を持たない。スクリーンリーダーはこれらの要素を「グループ」や「テキスト」としか認識できず、ナビゲーションなのか、メインコンテンツなのか、補足情報なのかを伝えられない。

```html
<!-- 悪い例: div だけで構築されたページ -->
<!-- スクリーンリーダーにとって、すべてが「グループ」にしか見えない -->
<div class="header">
  <div class="logo">サイト名</div>
  <div class="nav">
    <div class="nav-item"><a href="/">ホーム</a></div>
    <div class="nav-item"><a href="/about">概要</a></div>
  </div>
</div>
<div class="main">
  <div class="article">
    <div class="title">記事タイトル</div>
    <div class="content">記事の本文...</div>
  </div>
  <div class="sidebar">関連記事...</div>
</div>
<div class="footer">コピーライト</div>
```

```html
<!-- 良い例: セマンティック HTML で構築されたページ -->
<!-- スクリーンリーダーがページ構造を正確に把握できる -->
<header>
  <h1>サイト名</h1>
  <nav aria-label="メインナビゲーション">
    <ul>
      <li><a href="/">ホーム</a></li>
      <li><a href="/about">概要</a></li>
    </ul>
  </nav>
</header>
<main>
  <article>
    <h2>記事タイトル</h2>
    <p>記事の本文...</p>
  </article>
  <aside aria-label="関連記事">関連記事...</aside>
</main>
<footer>コピーライト</footer>
```

:::message
セマンティック HTML の恩恵:
- スクリーンリーダーがランドマークジャンプでページを素早く移動できる
- 検索エンジンがコンテンツの構造を正しく理解し SEO が向上する
- コードの可読性が上がり、開発者間での意思疎通がスムーズになる
- ブラウザのリーダーモードがコンテンツを正しく抽出できる
:::

## ランドマーク要素の正しい使い方

ランドマーク要素は、ページの大まかな構造を定義する HTML5 要素である。スクリーンリーダーのユーザーはランドマーク間をジャンプして目的のセクションに素早くたどり着ける。

| 要素 | 暗黙の ARIA ロール | 用途 |
|---|---|---|
| `<header>` | banner | ページまたはセクションのヘッダー。サイトロゴ、グローバルナビゲーション等 |
| `<nav>` | navigation | ナビゲーションリンクのグループ。メニュー、パンくずリスト等 |
| `<main>` | main | ページ固有の主要コンテンツ。ページに1つだけ配置する |
| `<aside>` | complementary | 主要コンテンツの補足情報。サイドバー、関連リンク等 |
| `<footer>` | contentinfo | ページまたはセクションのフッター。コピーライト、連絡先等 |
| `<section>` | region（見出し付き） | テーマ別のコンテンツグループ。必ず見出しを伴うこと |
| `<article>` | article | 自己完結した独立コンテンツ。ブログ記事、ニュース、コメント等 |

:::message alert
ランドマーク要素の注意点:
- `<main>` はページに1つだけ。複数配置するとスクリーンリーダーが混乱する
- 同じ種類のランドマークが複数ある場合（nav が2つ等）は `aria-label` で区別する
- `<section>` は見出し（h2-h6）なしで使うとランドマークとして認識されない
- ランドマーク要素を過剰にネストしない。ページの大枠の構造を示すために使う
:::

## 見出しレベルの設計

見出し要素（h1-h6）はページの文書構造を定義する最も重要なセマンティック要素である。スクリーンリーダーのユーザーは見出し一覧を表示し、目的のセクションにジャンプする。見出しレベルがスキップされると、文書構造が壊れ、ナビゲーションが困難になる。

```html
<!-- 悪い例: 見出しレベルのスキップ -->
<!-- h2 を飛ばして h3 に行っている。構造が不明瞭 -->
<h1>ショッピングサイト</h1>
<h3>新着商品</h3>       <!-- h2 がない！ -->
<h5>おすすめ商品</h5>   <!-- h4 がない！ -->

<!-- 見た目のサイズで見出しレベルを選んではいけない -->
<!-- 小さい文字にしたいからといって h4 や h5 を使うのは間違い -->
<!-- サイズは CSS で制御する -->
```

正しい見出し階層の例:

```
h1 ショッピングサイト
  h2 新着商品
    h3 エレクトロニクス
    h3 ファッション
  h2 おすすめ商品
    h3 今週のピックアップ
    h3 ランキング
      h4 総合ランキング
      h4 カテゴリ別
```

### React コンポーネントでの見出しレベル管理

再利用可能なコンポーネントでは、見出しレベルを Props で受け取ることで、配置場所に応じた適切な階層を維持できる。

```tsx
// 見出しレベルを Props で受け取ることで、再利用性を確保する
interface SectionProps {
  title: string;
  headingLevel?: 'h2' | 'h3' | 'h4';
  children: React.ReactNode;
}

function Section({ title, headingLevel = 'h2', children }: SectionProps) {
  // 動的にタグを変更
  const Heading = headingLevel;

  return (
    <section aria-labelledby={title.replace(/\s/g, '-')}>
      <Heading id={title.replace(/\s/g, '-')}>{title}</Heading>
      {children}
    </section>
  );
}

// 使用例: コンテキストに応じて見出しレベルを指定
function ProductPage() {
  return (
    <main>
      <h1>商品詳細</h1>
      <Section title="商品説明" headingLevel="h2">
        <p>この商品は...</p>
        <Section title="スペック" headingLevel="h3">
          <p>サイズ: ...</p>
        </Section>
      </Section>
      <Section title="レビュー" headingLevel="h2">
        <p>ユーザーレビュー一覧</p>
      </Section>
    </main>
  );
}
```

## ARIA の基本原則

WAI-ARIA（Web Accessibility Initiative - Accessible Rich Internet Applications）は、HTML だけでは伝えきれないインタラクティブな UI の意味と状態を補足するための仕様である。ただし、最も重要な原則は「ARIA を使わないのが最良の ARIA」であるということである。

### ARIA の5つのルール

1. ネイティブ HTML 要素で代替できるなら、ARIA を使わない
2. ネイティブ HTML のセマンティクスを ARIA で上書きしない
3. すべてのインタラクティブ要素はキーボードで操作可能にする
4. フォーカス可能な要素に `role="presentation"` や `aria-hidden="true"` を使わない
5. すべてのインタラクティブ要素にはアクセシブルな名前を付ける

```tsx
// 悪い例: div に role="button" を付けるより、button を使う
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') handleClick();
  }}
>
  送信
</div>

// 良い例: ネイティブの button を使えば ARIA もキーボード対応も不要
<button onClick={handleClick}>
  送信
</button>
```

```tsx
// 悪い例: h2 の見出しロールを上書きしている
<h2 role="button">クリックして展開</h2>

// 良い例: 見出しの中にボタンを配置する
<h2>
  <button
    aria-expanded={isExpanded}
    onClick={() => setIsExpanded(!isExpanded)}
  >
    クリックして展開
  </button>
</h2>
```

:::message
ARIA はネイティブ HTML では表現できない「動的な状態」や「カスタムウィジェット」のために存在する。例えば、アコーディオンの開閉状態、タブパネルの選択状態、モーダルダイアログの存在、ライブリージョンによる動的な通知など。これらはネイティブ HTML だけでは伝えられない。
:::

## 必須 ARIA 属性

### aria-label / aria-labelledby / aria-describedby の使い分け

これら3つの属性は要素に「名前」や「説明」を付与するが、使い分けが重要である。

| 属性 | 用途 | 優先度 |
|---|---|---|
| `aria-label` | 画面上にテキストがない場合に、要素の名前を直接指定 | テキストが画面上にない場合に使う |
| `aria-labelledby` | 画面上の別の要素のテキストを名前として参照 | 画面上に既にテキストがある場合はこちらを優先 |
| `aria-describedby` | 補足説明を関連付ける（名前ではなく説明） | 追加の説明が必要な場合に使う |

```tsx
// aria-label: アイコンボタンなど、テキストが画面にない場合
<button aria-label="メニューを開く" onClick={toggleMenu}>
  <MenuIcon />
</button>

// aria-labelledby: 画面上のテキストで要素の名前を指定
<h2 id="cart-heading">ショッピングカート</h2>
<section aria-labelledby="cart-heading">
  {/* この section は「ショッピングカート」という名前を持つ */}
  <ul>...</ul>
</section>

// aria-describedby: 補足説明を関連付ける
<label htmlFor="password">パスワード</label>
<input
  id="password"
  type="password"
  aria-describedby="password-help"
/>
<p id="password-help">
  8文字以上、大文字・小文字・数字を含めてください
</p>
{/* スクリーンリーダーは「パスワード、テキスト入力、8文字以上...」と読み上げる */}
```

### aria-hidden（装飾要素の非表示）

```tsx
// 装飾用アイコンはスクリーンリーダーから隠す
<button>
  <TrashIcon aria-hidden="true" />
  削除する
</button>
{/* 「削除する」だけが読み上げられる（アイコンは冗長な情報） */}

// 悪い例: テキストなしのアイコンボタンで aria-hidden を使う
<button>
  <TrashIcon aria-hidden="true" />
</button>
{/* ボタンに名前がない！スクリーンリーダーは「ボタン」としか読み上げない */}

// 正しい方法: aria-label を併用する
<button aria-label="削除する">
  <TrashIcon aria-hidden="true" />
</button>
```

### aria-expanded / aria-controls（開閉 UI）

```tsx
function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentId = useId();

  return (
    <div>
      <h3>
        <button
          aria-expanded={isExpanded}
          aria-controls={contentId}
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full p-4 text-left"
        >
          {title}
          <ChevronIcon
            aria-hidden="true"
            className={isExpanded ? 'rotate-180' : ''}
          />
        </button>
      </h3>
      <div
        id={contentId}
        role="region"
        hidden={!isExpanded}
      >
        {children}
      </div>
    </div>
  );
}

// aria-expanded: ボタンが制御する領域の開閉状態を伝える
// aria-controls: どの要素を制御しているかを ID で紐付ける
// hidden: 閉じているときは DOM からも非表示にする
```

### aria-live / aria-atomic（動的コンテンツ通知）

SPA では画面遷移やデータ更新が JavaScript で動的に行われる。スクリーンリーダーはページのリロードなしに変化を検知できないため、`aria-live` で変更を通知する必要がある。

```tsx
// polite: 現在の読み上げが終わってから通知（多くの場面で適切）
<div aria-live="polite" aria-atomic="true">
  {statusMessage && <p>{statusMessage}</p>}
</div>

// assertive: 即座に割り込んで通知（エラーや緊急情報のみ）
<div aria-live="assertive" aria-atomic="true">
  {errorMessage && <p role="alert">{errorMessage}</p>}
</div>

// 実装例: 検索結果の件数を通知
function SearchResults({ results }: { results: Item[] }) {
  return (
    <div>
      {/* 検索結果が変わるたびに件数を読み上げる */}
      <p aria-live="polite" aria-atomic="true">
        {results.length}件の結果が見つかりました
      </p>
      <ul>
        {results.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}

// aria-atomic="true": 一部が変わっても領域全体を読み上げる
// aria-atomic="false": 変更された部分だけを読み上げる
```

### aria-current（現在のナビゲーション）

```tsx
function Navigation({ currentPath }: { currentPath: string }) {
  const links = [
    { href: '/', label: 'ホーム' },
    { href: '/products', label: '商品' },
    { href: '/about', label: '会社概要' },
  ];

  return (
    <nav aria-label="メインナビゲーション">
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              aria-current={currentPath === link.href ? 'page' : undefined}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
// スクリーンリーダーは「商品、リンク、現在のページ」と読み上げる
```

### role 属性の正しい使い方

`role` 属性は要素の役割をブラウザに伝えるが、カスタムウィジェットの場合にのみ使うべきである。ネイティブ HTML 要素に冗長な role を付ける必要はない。

```tsx
// 不要な例: ネイティブ要素には暗黙の role がある
<nav role="navigation">...</nav>        {/* nav は既に navigation */}
<button role="button">送信</button>     {/* button は既に button */}

// 適切な例: カスタムウィジェットに role を付ける
// タブインターフェース
<div role="tablist" aria-label="設定タブ">
  <button role="tab" aria-selected={activeTab === 0} aria-controls="panel-0">
    一般
  </button>
  <button role="tab" aria-selected={activeTab === 1} aria-controls="panel-1">
    通知
  </button>
</div>
<div role="tabpanel" id="panel-0" aria-labelledby="tab-0">
  一般設定の内容...
</div>

// alert: 緊急の通知
<div role="alert">
  セッションが切れました。再ログインしてください。
</div>
```

## フォーカス管理

### tabindex の使い分け

`tabindex` 属性は要素のフォーカス可能性と Tab キーでの移動順序を制御する。値によって動作が大きく異なるため、正しい使い分けが重要である。

| 値 | 動作 | 使用場面 |
|---|---|---|
| `tabindex="0"` | Tab キーで到達可能。DOM 順序でフォーカスが移動 | 通常フォーカス不可の要素をフォーカス可能にする場合 |
| `tabindex="-1"` | Tab キーでは到達不可。JavaScript の focus() で制御可能 | プログラム的にフォーカスを移す必要がある要素（モーダル、エラー表示等） |
| `tabindex="1+"` | 指定した数値の順番でフォーカスが移動 | **使用禁止。DOM の自然な順序が壊れ、混乱を招く** |

```tsx
// tabindex="0": カスタムコンポーネントをフォーカス可能にする
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
>
  カスタムボタン
</div>
{/* ただし、可能な限り <button> を使うべき */}

// tabindex="-1": モーダルを開いたときにフォーカスを移す
function Modal({ isOpen, onClose, title, children }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabIndex={-1}  // focus() で移動可能だが Tab では到達しない
    >
      <h2 id="modal-title">{title}</h2>
      {children}
      <button onClick={onClose}>閉じる</button>
    </div>
  );
}
```

### フォーカストラップの実装

モーダルダイアログを開いているとき、Tab キーによるフォーカスがモーダル内に閉じ込められる必要がある。モーダルの外にフォーカスが移動すると、背景要素と意図せず操作してしまう危険がある。

```tsx
function useFocusTrap(ref: RefObject<HTMLElement | null>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !ref.current) return;

    const element = ref.current;
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), ' +
      'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      const focusableElements = element.querySelectorAll<HTMLElement>(focusableSelector);
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shift+Tab で最初の要素から逆方向 → 最後の要素に移動
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
      // Tab で最後の要素から順方向 → 最初の要素に移動
      else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }

    element.addEventListener('keydown', handleKeyDown);
    return () => element.removeEventListener('keydown', handleKeyDown);
  }, [ref, isActive]);
}
```

### Skip Navigation リンク

ページの先頭にナビゲーションが長く続く場合、キーボードユーザーは毎回すべてのリンクを Tab で通過しなければならない。Skip Navigation リンクを設置すると、メインコンテンツに直接ジャンプできる。

```tsx
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* 通常は画面外に隠し、フォーカス時に表示する */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4
                   focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white
                   focus:rounded-lg focus:outline-none"
      >
        メインコンテンツへスキップ
      </a>

      <header>
        <nav aria-label="メインナビゲーション">
          {/* 長いナビゲーションリンク群 */}
        </nav>
      </header>

      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    </>
  );
}

/* Tailwind の sr-only クラス:
   position: absolute; width: 1px; height: 1px;
   overflow: hidden; clip: rect(0, 0, 0, 0);

   focus:not-sr-only: フォーカス時にこれらを解除して表示する */
```

## 画像の代替テキスト

`alt` 属性は画像が表示されない環境や、スクリーンリーダーで利用するユーザーに画像の内容を伝える。すべての `<img>` タグには必ず alt 属性を設定する。

```tsx
// 1. 意味のある画像: 内容を簡潔に説明する
<img src="/team-photo.jpg" alt="2025年度の開発チーム全員集合写真。10名のメンバーが笑顔で写っている" />

// 2. 機能を持つ画像（リンクやボタンの中）: 機能を説明する
<a href="/home">
  <img src="/logo.svg" alt="ホームに戻る" />
</a>

// 3. テキストを含む画像: テキスト内容をそのまま書く
<img src="/sale-banner.jpg" alt="春の大セール 全品30%オフ 3月31日まで" />

// 4. 装飾画像: alt="" で空にする（スクリーンリーダーが無視する）
<img src="/decorative-line.svg" alt="" />
<img src="/background-pattern.png" alt="" role="presentation" />

// 5. 複雑な画像（グラフ等）: 簡潔な alt + 詳細説明を別途提供
<figure>
  <img
    src="/sales-chart.png"
    alt="2025年度の月別売上推移グラフ"
    aria-describedby="chart-description"
  />
  <figcaption id="chart-description">
    1月から3月は横ばい（約500万円）、4月から急増し
    8月にピーク（1200万円）を記録。その後は緩やかに減少。
  </figcaption>
</figure>

// 避けるべきパターン
<img src="/photo.jpg" alt="画像" />          {/* 情報がない */}
<img src="/photo.jpg" alt="IMG_20250101.jpg" /> {/* ファイル名は意味がない */}
<img src="/icon.svg" alt="アイコン画像" />    {/* 「画像」は冗長 */}
```

## 色だけに依存しない情報伝達

日本人男性の約5%、女性の約0.2%が色覚特性を持つとされている。色だけで情報を伝えると、一部のユーザーが情報を受け取れない。色に加えて、テキスト、アイコン、パターンなど別の視覚的手がかりを併用する。

```tsx
// 悪い例: 赤色だけでエラーを示している
<input
  style={{ borderColor: hasError ? 'red' : 'gray' }}
/>
{/* 色覚特性のあるユーザーには赤とグレーの区別がつかない */}

// 良い例: 色 + アイコン + テキストで伝える
<div>
  <div className="flex items-center gap-2">
    <input
      className={hasError
        ? 'border-red-500 border-2'
        : 'border-gray-300 border'}
      aria-invalid={hasError}
      aria-describedby={hasError ? 'email-error' : undefined}
    />
    {hasError && (
      <ExclamationIcon aria-hidden="true" className="text-red-500" />
    )}
  </div>
  {hasError && (
    <p id="email-error" className="text-red-500 text-sm mt-1">
      {/* テキストでもエラー内容を伝える */}
      有効なメールアドレスを入力してください
    </p>
  )}
</div>
```

```tsx
// 悪い例: 色だけでステータスを区別
<span className={status === 'active' ? 'bg-green-500' : 'bg-red-500'} />

// 良い例: 色 + テキスト + アイコンの組み合わせ
function StatusBadge({ status }: { status: 'active' | 'inactive' | 'pending' }) {
  const config = {
    active: {
      className: 'bg-green-100 text-green-800 border-green-300',
      label: '有効',
      icon: <CheckCircleIcon aria-hidden="true" />,
    },
    inactive: {
      className: 'bg-red-100 text-red-800 border-red-300',
      label: '無効',
      icon: <XCircleIcon aria-hidden="true" />,
    },
    pending: {
      className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      label: '保留中',
      icon: <ClockIcon aria-hidden="true" />,
    },
  };

  const { className, label, icon } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded border ${className}`}>
      {icon}
      {label}
    </span>
  );
}
```

## キーボード操作パターン

インタラクティブなカスタムウィジェットは、WAI-ARIA Authoring Practices に定義されたキーボード操作パターンに従う必要がある。

| キー | 一般的な動作 |
|---|---|
| `Tab` | 次のフォーカス可能な要素に移動 |
| `Shift + Tab` | 前のフォーカス可能な要素に移動 |
| `Enter` | ボタンの実行、リンクの遷移、フォームの送信 |
| `Space` | ボタンの実行、チェックボックスの切替、ドロップダウンの開閉 |
| `Escape` | モーダルを閉じる、ドロップダウンを閉じる、操作のキャンセル |
| `Arrow Keys` | タブ間の移動、メニュー項目間の移動、スライダーの値の変更 |
| `Home / End` | リストの先頭 / 末尾に移動 |

:::message
**roving tabindex パターン**: グループ内で1つの要素だけが `tabIndex={0}` を持ち、他の要素は `tabIndex={-1}` にする。Tab キーでグループに入り、矢印キーでグループ内を移動し、Tab キーでグループから抜ける動作を実現する。タブリスト、メニュー、ラジオグループなど多くのウィジェットでこのパターンが使われる。
:::

## スクリーンリーダーのテスト方法

アクセシビリティの品質を確保するためには、実際にスクリーンリーダーでテストすることが不可欠である。自動テストツールだけでは検出できない問題（読み上げ順序の不自然さ、冗長な情報など）は手動でしか確認できない。

### macOS: VoiceOver

- `Cmd + F5` で起動 / 終了
- `VO + Right Arrow` で次の要素へ
- `VO + U` でローター（ランドマーク、見出し、リンク一覧）を表示
- VO キーは `Ctrl + Option`
- Safari との組み合わせが推奨される

### Windows: NVDA

- 無料のオープンソーススクリーンリーダー
- `Insert + F7` で要素リストを表示
- `H` で次の見出しへジャンプ
- `D` で次のランドマークへジャンプ
- Firefox / Chrome との組み合わせが推奨される

### テストチェックリスト

```
[ ] ページタイトルが正しく読み上げられるか
[ ] 見出し一覧で論理的な構造が確認できるか（見出しジャンプ）
[ ] ランドマーク一覧でページ構造を把握できるか
[ ] すべてのインタラクティブ要素がキーボードで操作できるか
[ ] フォームのラベルが正しく関連付けられているか
[ ] 画像に適切な代替テキストがあるか
[ ] モーダルを開いたときにフォーカスが移動するか
[ ] モーダル内にフォーカスが閉じ込められるか
[ ] モーダルを閉じたときにフォーカスが元の位置に戻るか
[ ] 動的に更新されるコンテンツが読み上げられるか（aria-live）
[ ] エラーメッセージが即座に通知されるか
[ ] ナビゲーションの現在位置が分かるか（aria-current）
```

:::message
**自動テストツールとの組み合わせ**:
- **axe-core / @axe-core/react**: 開発中にコンソールでアクセシビリティ違反を検出
- **eslint-plugin-jsx-a11y**: JSX 記述時にリアルタイムで問題を警告
- **Lighthouse**: Chrome DevTools でアクセシビリティスコアを測定
- **Storybook addon-a11y**: Story ごとにアクセシビリティチェックを実行
- 自動ツールで検出できるのは全体の約30%。残りは手動テストが必要
:::

## 理解度チェック

:::details クイズ: aria-label と aria-labelledby の使い分けとして正しいものはどれか
**選択肢:**
1. aria-label は見出し要素にのみ使い、aria-labelledby はすべての要素に使える
2. aria-labelledby は画面上に既にテキストがある場合にその要素を参照し、aria-label は画面上にテキストがない場合に直接名前を指定する
3. aria-label はフォーム要素専用で、aria-labelledby はランドマーク要素専用
4. 両者に違いはなく、どちらを使っても同じ結果になる

**正解: 2**

aria-labelledby は画面上に表示されている別の要素のテキストを参照して名前を付ける。aria-label は画面上にテキストが存在しない場合（アイコンボタンなど）に直接文字列で名前を指定する。画面上にテキストがある場合は aria-labelledby を優先して使うことで、画面表示と支援技術への情報が一致する。
:::

:::details クイズ: tabindex 属性に正の値（tabindex="5" など）を設定することが推奨されない理由はどれか
**選択肢:**
1. ブラウザのパフォーマンスが低下するから
2. HTML の仕様で正の値は非推奨と定められているから
3. DOM の自然な順序とは異なるフォーカス順序になり、ユーザーの操作が混乱するから
4. スクリーンリーダーが正の値の tabindex を無視するから

**正解: 3**

tabindex に正の値を設定すると、その要素がすべての tabindex="0" の要素よりも先にフォーカスを受ける。複数の要素に異なる正の値を設定すると、画面上の視覚的な順序と Tab キーでのフォーカス順序が一致しなくなり、特にキーボードユーザーにとって操作が予測不能になる。DOM の自然な順序（ソースコード順）でフォーカスが移動するのが最も直感的である。
:::

:::details クイズ: 「ARIA を使わないのが最良の ARIA」とはどういう意味か
**選択肢:**
1. ARIA はバグが多いため、使用を完全に避けるべきだという意味
2. ネイティブ HTML 要素が適切なセマンティクスを持つ場合はそれを使い、ARIA は HTML だけでは表現できない場合にのみ使うべきだという意味
3. ARIA は古い技術であり、現代のブラウザでは不要になったという意味
4. ARIA よりも CSS でアクセシビリティを制御すべきだという意味

**正解: 2**

ネイティブ HTML 要素（button, nav, main, input 等）は最初から適切なロール、キーボード操作、スクリーンリーダー対応を備えている。ARIA は HTML だけではカバーできないカスタムウィジェット（タブ、アコーディオン、ツリービュー等）の状態や関係性を補足するための仕様である。ARIA を不適切に使うと、かえってアクセシビリティを悪化させる可能性があるため、まずネイティブ HTML で解決できるか検討する。
:::

## まとめ

**セマンティック HTML**

- header, nav, main, aside, footer でページ構造を定義
- h1-h6 の階層構造をスキップせず正しく設計
- div/span の代わりにネイティブ要素を活用
- 画像には必ず適切な alt 属性を設定

**ARIA とフォーカス管理**

- ネイティブ HTML で足りない場合にのみ ARIA を使用
- aria-expanded, aria-live, aria-current で動的状態を通知
- tabindex は 0 と -1 のみ使用。正の値は避ける
- モーダルにはフォーカストラップと Escape での閉じを実装

**参考リンク**

- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) -- ARIA のパターンとプラクティスの公式ガイド
- [MDN - ARIA](https://developer.mozilla.org/ja/docs/Web/Accessibility/ARIA) -- ARIA の包括的なリファレンス
- [WCAG 2.2 日本語訳](https://waic.jp/translations/WCAG22/) -- Web コンテンツアクセシビリティガイドライン
- [axe-core/react](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/react) -- React アプリのアクセシビリティ自動チェックライブラリ
