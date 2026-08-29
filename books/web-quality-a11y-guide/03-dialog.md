---
title: "Dialog の設計パターン"
---

Dialog（モーダル）は強力な UI パターンであるが、使い方を誤るとアクセシビリティやユーザー体験を大きく損なう。ここでは HTML の dialog 要素の仕組みから、React での実装パターン、そして「いつ Dialog を使うべきでないか」までを体系的に扱う。

## Dialog とは何か

Dialog（ダイアログ）は、メインコンテンツの上にオーバーレイ表示される独立したウィンドウである。ユーザーに注意を促したり、入力を求めたりするために使う。HTML5 では `<dialog>` 要素としてネイティブにサポートされている。

### Modal と Non-modal の違い

Dialog には 2 種類の表示モードがある。この違いを正しく理解することが設計の第一歩である。

| 特性 | Modal（モーダル） | Non-modal（非モーダル） |
|---|---|---|
| 背景操作 | 不可（背景が inert になる） | 可能 |
| backdrop | 表示される | 表示されない |
| ESC キー | 閉じる（デフォルト動作） | 閉じない（自分で実装が必要） |
| 表示 API | showModal() | show() |
| 主な用途 | 確認ダイアログ、ログインフォーム | ツールチップ、通知パネル |

:::message
**なぜネイティブ dialog 要素を使うべきか**: `<dialog>` 要素は、ブラウザが以下の機能を自動的に提供する: (1) ESC キーによるクローズ、(2) フォーカストラップ（Modal の場合）、(3) `::backdrop` 擬似要素、(4) top layer への配置（z-index 問題の解消）。`<div>` で自作するよりも遥かに少ないコードでアクセシブルな Dialog を実現できる。
:::

## Dialog の HTML 構造

ネイティブの `<dialog>` 要素を使った基本的な構造を見ていく。

```html
<!-- dialog 要素はデフォルトで非表示 -->
<dialog id="confirm-dialog">
  <h2>確認</h2>
  <p>この操作を実行しますか？</p>
  <form method="dialog">
    <!-- method="dialog" のフォーム送信で dialog が閉じる -->
    <button value="cancel">キャンセル</button>
    <button value="confirm">確認する</button>
  </form>
</dialog>

<button onclick="document.getElementById('confirm-dialog').showModal()">
  ダイアログを開く
</button>
```

### showModal() と show() の違い

```javascript
const dialog = document.getElementById('my-dialog');

// Modal として表示
// - ::backdrop が表示される
// - 背景の操作がブロックされる（inert）
// - ESC キーで閉じる
// - フォーカスが dialog 内に閉じ込められる
// - top layer に配置される（z-index 不要）
dialog.showModal();

// Non-modal として表示
// - backdrop なし
// - 背景の操作が可能
// - ESC キーで閉じない
// - フォーカストラップなし
dialog.show();

// 閉じる（両方共通）
dialog.close();

// 戻り値を渡して閉じる
dialog.close('confirm');
console.log(dialog.returnValue); // "confirm"
```

### ::backdrop 擬似要素のスタイリング

```css
/* showModal() で表示した場合のみ ::backdrop が有効 */
dialog::backdrop {
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

/* dialog 本体のスタイル */
dialog {
  border: none;
  border-radius: 12px;
  padding: 24px;
  max-width: 480px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

/* open 属性で表示中のスタイルを制御 */
dialog[open] {
  animation: dialog-fade-in 0.2s ease-out;
}

@keyframes dialog-fade-in {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

:::message alert
**open 属性を直接操作しない**: `<dialog open>` のように HTML 属性で直接 open を付けると Non-modal として表示されるが、`::backdrop` が使えずアクセシビリティ機能も無効になる。必ず JavaScript の `showModal()` または `show()` を使う。
:::

## Dialog の閉じ方パターン 5 つ

Dialog を閉じる方法は複数あるが、ユーザーが「どうやって閉じるか」を直感的に理解できることが最も重要である。

```javascript
const dialog = document.getElementById('my-dialog');

// 1. ボタンクリックで閉じる
const closeBtn = dialog.querySelector('.close-btn');
closeBtn.addEventListener('click', () => {
  dialog.close();
});

// 2. ESC キーで閉じる（Modal の場合はデフォルトで有効）
// cancel イベントで検知できる
dialog.addEventListener('cancel', (e) => {
  // e.preventDefault() で ESC による閉じを防止できる
  console.log('ESC キーで閉じられました');
});

// 3. backdrop クリックで閉じる
// ※ ネイティブでは未サポート。自前で実装が必要
dialog.addEventListener('click', (e) => {
  // dialog 要素自体がクリックされた場合（= backdrop 領域）
  if (e.target === dialog) {
    dialog.close();
  }
});

// 4. フォーム送信後に閉じる
// method="dialog" を指定した form の submit で自動的に閉じる
// <form method="dialog">
//   <button value="ok">OK</button>
// </form>
dialog.addEventListener('close', () => {
  console.log('閉じました。戻り値:', dialog.returnValue);
});

// 5. タイマーで閉じる（トースト通知的な使い方）
function showTemporaryDialog(message, duration = 3000) {
  const tempDialog = document.getElementById('temp-dialog');
  tempDialog.textContent = message;
  tempDialog.show(); // Non-modal で表示
  setTimeout(() => tempDialog.close(), duration);
}
```

:::message
**backdrop クリックの注意点**: backdrop クリックで閉じる実装は、ユーザーが dialog 内のテキストをドラッグ選択した際に意図せず閉じてしまう問題がある。`mousedown` と `mouseup` の両方が dialog 外であることを確認するか、`pointerdown` イベントの座標を判定するとより堅牢になる。
:::

## React での Dialog 実装パターン

React ではネイティブの `<dialog>` を ref で制御するか、Portal を使って DOM ツリーの外に描画するアプローチが一般的である。

### パターン 1: useRef でネイティブ dialog を制御

```tsx
import { useRef, useEffect } from 'react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

function Dialog({ open, onClose, children, title }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      // まだ開いていなければ showModal() で開く
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      dialog.close();
    }
  }, [open]);

  // ESC キーによる閉じを検知
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault(); // ブラウザのデフォルト動作を防止
      onClose();          // React の state を更新
    };

    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onClose]);

  // backdrop クリック
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      aria-labelledby="dialog-title"
    >
      <div className="dialog-content">
        <h2 id="dialog-title">{title}</h2>
        {children}
        <button onClick={onClose}>閉じる</button>
      </div>
    </dialog>
  );
}
```

### パターン 2: createPortal を使った実装

React の `createPortal` を使うと、コンポーネントツリー内の位置に関わらず DOM 上の任意の場所に描画できる。これにより CSS の `overflow: hidden` や `z-index` の影響を回避できる。

```tsx
import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

function Modal({ open, onClose, children, title }: ModalProps) {
  // ESC キーで閉じる
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  // スクロールロック
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        // overlay 自体がクリックされた場合のみ閉じる
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-content" role="document">
        <h2 id="modal-title">{title}</h2>
        {children}
        <button onClick={onClose} aria-label="閉じる">
          X
        </button>
      </div>
    </div>,
    document.body
  );
}
```

:::message alert
Portal パターンで実際に起きる問題:
- フォーカストラップを自前で実装する必要がある
- aria-modal, role="dialog" を手動で付与する必要がある
- スクロールロックの解除忘れに注意（cleanup 関数で必ず解除）
- ネイティブ dialog 要素を使う方がアクセシビリティ対応のコストが低い
:::

### パターン 3: カスタム Hook で共通化

```tsx
import { useState, useCallback, useRef, useEffect } from 'react';

function useDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement>(null);

  const open = useCallback(() => {
    // 開く前にトリガー要素を記憶（閉じた後にフォーカスを戻すため）
    triggerRef.current = document.activeElement as HTMLElement;
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // フォーカスをトリガー要素に戻す
    requestAnimationFrame(() => {
      triggerRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  return { isOpen, open, close, dialogRef };
}

// 使用例
function DeleteButton() {
  const { isOpen, open, close, dialogRef } = useDialog();

  const handleDelete = () => {
    // 削除処理...
    close();
  };

  return (
    <>
      <button onClick={open}>削除</button>
      <dialog ref={dialogRef} onCancel={close}>
        <h2>本当に削除しますか？</h2>
        <p>この操作は取り消せません。</p>
        <button onClick={close}>キャンセル</button>
        <button onClick={handleDelete}>削除する</button>
      </dialog>
    </>
  );
}
```

:::details クイズ: HTML のネイティブ dialog 要素で showModal() を使って表示した場合、自動的に提供される機能はどれか
**選択肢:**
1. backdrop クリックによる閉じ機能
2. ESC キーによる閉じ機能とフォーカストラップ
3. アニメーション付きの表示・非表示
4. レスポンシブなサイズ調整

**正解: 2**

showModal() で表示した dialog は、ブラウザが ESC キーによる閉じ機能（cancel イベント）とフォーカストラップ（Tab キーが dialog 内に閉じ込められる）を自動的に提供する。backdrop クリックによる閉じ機能は自前で実装する必要がある。
:::

## なぜ Dialog の多用を避けるべきか

Dialog は便利なパターンであるが、過度に使用するとユーザー体験を悪化させる。ここでは技術的な課題とユーザビリティの問題の両面から、Dialog の多用が危険な理由を解説する。

:::message alert
Dialog は「ユーザーの作業を中断する」UI パターンである。使用するたびにユーザーのフロー（作業の流れ）を強制的に中断する。以下の問題を理解した上で、本当に Dialog が最適かどうかを常に検討すること。
:::

### 1. フォーカストラップの実装の複雑さ

Modal Dialog ではフォーカスが dialog の外に出ないようにする「フォーカストラップ」がアクセシビリティ上必須である。ネイティブ dialog を使えばブラウザが処理するが、div で自作する場合は以下のような複雑な実装が必要になる。

```tsx
function FocusTrap({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // フォーカス可能な全要素を取得
    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      // 現時点のフォーカス可能要素を毎回取得
      // （動的に追加・削除される可能性があるため）
      const focusable = container.querySelectorAll<HTMLElement>(focusableSelector);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) return;

      if (e.shiftKey) {
        // Shift+Tab: 最初の要素にいたら最後に戻る
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: 最後の要素にいたら最初に戻る
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    const firstFocusable = container.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();

    return () => container.removeEventListener('keydown', handleKeyDown);
  }, []);

  return <div ref={containerRef}>{children}</div>;
}

// ※ これでも不十分なケースがある:
// - iframe 内の要素
// - Shadow DOM 内の要素
// - contenteditable な要素
// - tabindex が動的に変わる要素
```

### 2. スクリーンリーダー対応

スクリーンリーダーのユーザーに Dialog の存在と内容を正しく伝えるためには、複数の ARIA 属性を正確に設定する必要がある。

```html
<!-- 必須の属性 -->
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-desc"
>
  <h2 id="dialog-title">アカウント削除の確認</h2>
  <p id="dialog-desc">
    この操作は取り消せません。全データが削除されます。
  </p>
  <!-- コンテンツ... -->
</div>

<!--
  role="dialog" : スクリーンリーダーに「ダイアログ」として認識させる
  aria-modal="true" : 背景が操作不能であることを伝える
  aria-labelledby : ダイアログのタイトル要素を紐付ける
  aria-describedby : ダイアログの説明文を紐付ける

  ※ ネイティブ <dialog> + showModal() なら
    role と aria-modal は自動的に付与される
-->
```

### 3. スクロールロックの副作用

Modal 表示中は背景のスクロールを止める必要があるが、この実装には意外な副作用が伴う。

```typescript
// 単純な実装
function lockScroll() {
  document.body.style.overflow = 'hidden';
}

function unlockScroll() {
  document.body.style.overflow = '';
}

// 問題1: スクロール位置がリセットされる場合がある
// 問題2: スクロールバーの幅分だけレイアウトがガタつく
// 問題3: iOS Safari では overflow: hidden だけではスクロールが止まらない

// より堅牢な実装
function lockScrollRobust() {
  const scrollY = window.scrollY;
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = '100%';
  // スクロールバー消失によるガタつきを防止
  document.body.style.paddingRight = `${scrollbarWidth}px`;
}

function unlockScrollRobust() {
  const scrollY = parseInt(document.body.style.top || '0', 10);
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  document.body.style.paddingRight = '';
  window.scrollTo(0, -scrollY);
}
```

### 4. モバイルでの操作性の問題

モバイルデバイスでの Dialog は特に多くの問題を抱えている。

1. **画面の大半を覆い隠す** -- モバイルの小さな画面では Dialog がほぼ全画面を占め、背景のコンテキストが完全に失われる
2. **仮想キーボードとの干渉** -- Dialog 内の input にフォーカスすると仮想キーボードが表示され、Dialog の内容が見切れる
3. **スワイプ操作との競合** -- Dialog 内のスクロールとブラウザの戻る操作（スワイプバック）が競合しやすい
4. **閉じるボタンが押しにくい** -- Dialog 右上の小さな X ボタンは、タッチ操作では正確にタップしにくい

### 5. ネストされた Dialog の地獄

「Dialog の中から別の Dialog を開く」というパターンは、ユーザー体験を著しく悪化させる。

```tsx
// 避けるべきパターン
function BadExample() {
  const [showSettings, setShowSettings] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  return (
    <>
      <button onClick={() => setShowSettings(true)}>設定</button>

      {/* 第1層: 設定 Dialog */}
      <Dialog open={showSettings} onClose={() => setShowSettings(false)}>
        <h2>設定を変更</h2>
        {/* ... フォーム ... */}
        <button onClick={() => setShowConfirm(true)}>保存</button>

        {/* 第2層: 確認 Dialog（設定 Dialog の中） */}
        <Dialog open={showConfirm} onClose={() => setShowConfirm(false)}>
          <p>本当に保存しますか？</p>
          <button onClick={() => {
            save();
            setShowConfirm(false);
            setShowSuccess(true);
          }}>
            はい
          </button>

          {/* 第3層: 成功 Dialog（確認 Dialog の中）*/}
          {/* ← ここまで来るとフォーカス管理が破綻する */}
        </Dialog>
      </Dialog>
    </>
  );
}

// 改善案: ステップ型の単一 Dialog にする
function GoodExample() {
  const [step, setStep] = useState<'closed' | 'edit' | 'confirm' | 'done'>('closed');

  return (
    <>
      <button onClick={() => setStep('edit')}>設定</button>
      <Dialog open={step !== 'closed'} onClose={() => setStep('closed')}>
        {step === 'edit' && (
          <>
            <h2>設定を変更</h2>
            {/* ... フォーム ... */}
            <button onClick={() => setStep('confirm')}>保存</button>
          </>
        )}
        {step === 'confirm' && (
          <>
            <p>本当に保存しますか？</p>
            <button onClick={() => setStep('edit')}>戻る</button>
            <button onClick={() => { save(); setStep('done'); }}>はい</button>
          </>
        )}
        {step === 'done' && (
          <>
            <p>保存しました。</p>
            <button onClick={() => setStep('closed')}>閉じる</button>
          </>
        )}
      </Dialog>
    </>
  );
}
```

### 6. ユーザーの認知負荷

Dialog は「割り込み UI」である。ユーザーが何かの作業をしている最中に Dialog が表示されると、以下の認知的な負荷がかかる。

- コンテキストスイッチ: ユーザーは今やっていた作業を一時停止し、Dialog の内容に注意を切り替える必要がある
- 元の状態の記憶: Dialog を閉じた後、「さっき何をしていたか」を思い出す必要がある
- 判断の強制: Dialog が表示された瞬間に意思決定を迫られる（今すぐ判断しなければならない）
- 不安感: 「このダイアログを閉じたらデータは消えるのか？」という不安が生まれやすい

:::message alert
**特に避けるべき Dialog の使い方**:
- ページ読み込み直後のニュースレター登録 Dialog
- Cookie 同意 Dialog の上に表示されるプロモーション Dialog
- フォーム入力中に表示される「セッション切れ」Dialog（入力内容を保存してから表示すべき）
- 長いフォームを Dialog 内に配置する（ページ遷移の方が適切）
- 情報表示だけの Dialog（インライン展開で十分）
:::

## Dialog の代替案

Dialog を使う前に、以下の代替パターンで対応できないか検討する。多くの場合、Dialog よりもユーザーの作業フローを妨げない方法が存在する。

| 代替パターン | 適した場面 | 利点 |
|---|---|---|
| インライン展開 | 詳細情報の表示、ヘルプテキスト | コンテキストが失われない |
| ページ遷移 | 複雑なフォーム、設定画面 | 十分なスペースと URL 共有 |
| Drawer | フィルター、サブナビゲーション | 背景が部分的に見える |
| Accordion | FAQ、段階的な情報開示 | ページ内で完結する |
| Toast / Snackbar | 成功・エラーの通知 | 非同期的で作業を妨げない |

### インライン展開で代替する例

```tsx
// 悪い例: 詳細を Dialog で表示
function BadProductCard({ product }: { product: Product }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="card">
      <h3>{product.name}</h3>
      <button onClick={() => setShowDetails(true)}>詳細を見る</button>
      <Dialog open={showDetails} onClose={() => setShowDetails(false)}>
        <p>{product.description}</p>
        <p>価格: {product.price}円</p>
        <p>在庫: {product.stock}個</p>
      </Dialog>
    </div>
  );
}

// 良い例: インライン展開で表示
function GoodProductCard({ product }: { product: Product }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card">
      <h3>{product.name}</h3>
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls="product-details"
      >
        {expanded ? '閉じる' : '詳細を見る'}
      </button>
      {expanded && (
        <div id="product-details" className="details">
          <p>{product.description}</p>
          <p>価格: {product.price}円</p>
          <p>在庫: {product.stock}個</p>
        </div>
      )}
    </div>
  );
}
```

### Toast で代替する例

```tsx
// 悪い例: 保存成功を Dialog で表示
function BadSaveHandler() {
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = async () => {
    await saveData();
    setShowSuccess(true);
    // ユーザーは「OK」を押すまで次の操作ができない
  };

  return (
    <>
      <button onClick={handleSave}>保存</button>
      <Dialog open={showSuccess} onClose={() => setShowSuccess(false)}>
        <p>保存しました</p>
        <button onClick={() => setShowSuccess(false)}>OK</button>
      </Dialog>
    </>
  );
}

// 良い例: Toast 通知で表示
function GoodSaveHandler() {
  const { toast } = useToast();

  const handleSave = async () => {
    await saveData();
    // 通知を出しつつ、ユーザーは即座に次の操作に移れる
    toast({ message: '保存しました', type: 'success' });
  };

  return <button onClick={handleSave}>保存</button>;
}
```

:::details クイズ: 以下の場面のうち、Dialog（モーダル）の使用が最も適切なものはどれか
**選択肢:**
1. 商品の詳細情報を表示するとき
2. データの保存が成功したことを通知するとき
3. ユーザーがアカウントを削除しようとしているとき
4. FAQ の回答を表示するとき

**正解: 3**

アカウント削除は取り消せない破壊的操作であり、ユーザーに意図的な確認を求める必要があるため Dialog が適切である。商品詳細はインライン展開、保存成功は Toast 通知、FAQ は Accordion がそれぞれ適している。
:::

## Dialog の適切な使用シーン

Dialog は以下の条件を満たす場合に限り使用を検討する。「ユーザーの注意を強制的に引き付ける必要がある」かどうかが判断基準である。

**確認ダイアログ** -- 「本当に削除しますか？」「送信してよろしいですか？」のように、ユーザーの意図を確認する場面。特に取り消せない操作の前に使用する。

**破壊的操作の防止** -- アカウント削除、データの完全消去、課金の確定など、誤操作のリスクが高い操作のガードとして使用する。

**認証・ログインフォーム** -- セッション切れ時の再ログイン、2要素認証の入力など、セキュリティ上の理由で即座に対応が必要な場面。

**短い入力フォーム** -- リネーム、コメント追加など、1〜2 フィールドの簡単な入力。ページ遷移するほどではないが、インライン編集では狭い場合。

### 適切な確認ダイアログの実装例

```tsx
interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
}

function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = '確認',
  cancelLabel = 'キャンセル',
  variant = 'default',
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => { e.preventDefault(); onCancel(); }}
      onClick={(e) => { if (e.target === dialogRef.current) onCancel(); }}
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
      className="dialog"
    >
      <div className="dialog-body">
        <h2 id="confirm-title" className="dialog-title">{title}</h2>
        <p id="confirm-desc" className="dialog-description">{description}</p>
        <div className="dialog-actions">
          {/* キャンセルボタンを先に（Tab 順序で先にフォーカスさせる） */}
          <button onClick={onCancel} className="btn-secondary">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

// 使用例
function DeleteAccountButton() {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    await deleteAccount();
    setShowConfirm(false);
  };

  return (
    <>
      <button onClick={() => setShowConfirm(true)}>アカウント削除</button>
      <ConfirmDialog
        open={showConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
        title="アカウントを削除しますか？"
        description="この操作は取り消せません。すべてのデータが完全に削除されます。"
        confirmLabel="削除する"
        variant="danger"
      />
    </>
  );
}
```

## アクセシビリティチェックリスト

Dialog を実装する際には、以下のチェックリストをすべて満たしているか確認する。ネイティブの `<dialog>` + `showModal()` を使えば多くの項目が自動的に満たされる。

**ロールと属性**

- [ ] role="dialog" が設定されている（`<dialog>` なら自動）
- [ ] aria-modal="true" が設定されている（showModal() なら自動）
- [ ] aria-labelledby でタイトル要素と紐付けられている
- [ ] aria-describedby で説明文と紐付けられている（任意だが推奨）

**フォーカス管理**

- [ ] Dialog が開いたときにフォーカスが Dialog 内に移動する
- [ ] Tab キーで Dialog 外にフォーカスが出ない（フォーカストラップ）
- [ ] Dialog が閉じたときにトリガー要素にフォーカスが戻る

**キーボード操作**

- [ ] ESC キーで閉じることができる
- [ ] Enter キーでデフォルトアクション（submit）を実行できる
- [ ] 全ての操作要素に Tab でアクセスできる

**ビジュアル**

- [ ] backdrop がメインコンテンツとの区別を明確にしている
- [ ] 閉じるボタンが見つけやすい位置にある
- [ ] フォーカスリングが視認できる（outline を消していない）

### アクセシビリティ完備の Dialog コンポーネント

```tsx
import { useRef, useEffect, useCallback } from 'react';

interface AccessibleDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

function AccessibleDialog({
  open,
  onClose,
  title,
  description,
  children,
}: AccessibleDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // 開く前にトリガー要素を記憶
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement;
    }
  }, [open]);

  // showModal / close の制御
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
      // 閉じた後にフォーカスを戻す
      triggerRef.current?.focus();
    }
  }, [open]);

  // cancel イベント（ESC キー）のハンドリング
  const handleCancel = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault();
    onClose();
  }, [onClose]);

  // backdrop クリック（安全な実装）
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  }, [onClose]);

  const titleId = 'dialog-title';
  const descId = description ? 'dialog-desc' : undefined;

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClick={handleClick}
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="dialog-base"
    >
      <div className="dialog-inner">
        <h2 id={titleId}>{title}</h2>
        {description && <p id={descId}>{description}</p>}
        {children}
        <button
          onClick={onClose}
          aria-label="ダイアログを閉じる"
          className="dialog-close"
        >
          X
        </button>
      </div>
    </dialog>
  );
}
```

:::message
**ネイティブ dialog を使うのが最善**: アクセシビリティ対応の観点では、ネイティブ `<dialog>` + `showModal()` を使うのが最も確実である。`role="dialog"`、`aria-modal="true"`、フォーカストラップ、ESC キーハンドリングがブラウザによって自動的に提供される。ライブラリを使う場合でも、内部で `<dialog>` を使っているもの（Radix UI Dialog など）を選ぶことを推奨する。
:::

:::details クイズ: スクロールロックの実装で overflow: hidden だけでは不十分な理由として正しいものはどれか
**選択肢:**
1. Firefox でスクロールロックが効かないから
2. スクロールバーが消えてレイアウトがガタつき、iOS Safari では効かないことがあるから
3. React の仮想 DOM と競合するから
4. dialog 要素の仕様で禁止されているから

**正解: 2**

overflow: hidden を body に設定するとスクロールバーが消え、その幅の分だけコンテンツがガタつく。また iOS Safari ではこの方法だけではスクロールが止まらない場合がある。position: fixed と paddingRight の補正を組み合わせた実装が必要である。
:::

## 判断フローチャート

Dialog を使うかどうか迷ったときは、以下の順序で検討する。

1. **その情報はインラインで表示できないか？** -- できるなら Dialog は不要。Accordion やインライン展開を使う。
2. **ページ遷移で解決できないか？** -- 複雑なフォームや長いコンテンツなら別ページの方が適切。
3. **Toast や Snackbar で十分ではないか？** -- 単なる通知なら非同期的な表示で十分。
4. **ユーザーの作業を中断してでも確認が必要か？** -- 破壊的操作やセキュリティ上の理由がある場合のみ Dialog を使う。
5. **ネイティブ dialog 要素を使っているか？** -- div 自作よりも `<dialog>` + `showModal()` を優先する。

## まとめ

- Dialog は「割り込み UI」であることを常に意識する
- ネイティブ `<dialog>` 要素を使えばアクセシビリティ対応の大部分が自動化される
- Dialog を使う前に、インライン展開・ページ遷移・Toast など代替手段を検討する
- 使用する場合は、フォーカス管理・ESC キー・backdrop クリック・スクリーンリーダー対応を必ず実装する
- ネストされた Dialog は避け、ステップ型の単一 Dialog にリファクタリングする
- モバイルでは特に Dialog の弊害が大きいことを認識する

**参考リンク**

- [MDN - \<dialog\>: ダイアログ要素](https://developer.mozilla.org/ja/docs/Web/HTML/Element/dialog) -- HTML dialog 要素の仕様と使い方
- [WAI-ARIA Authoring Practices - Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) -- W3C によるアクセシブルな Dialog の設計ガイドライン
- [Radix UI - Dialog](https://www.radix-ui.com/primitives/docs/components/dialog) -- アクセシビリティ対応済みの React Dialog コンポーネント
