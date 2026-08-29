---
title: "Snackbar / Toast の設計"
---

## Snackbar / Toast / Notification の違い

これらの用語はしばしば混同されるが、厳密にはそれぞれ異なる文脈と用途を持つ。

| 種類 | 主な用途 | 消去方法 | 典型的な位置 |
| --- | --- | --- | --- |
| **Snackbar** | 操作の結果フィードバック（保存完了、削除完了など） | 自動消去 + 任意のアクション（Undo など） | 画面下部中央 |
| **Toast** | 軽量な通知（成功、エラー、情報） | 自動消去 or 手動閉じ | 画面右上または右下 |
| **Notification** | 重要度の高い情報（新着メッセージ、システムアラートなど） | 手動消去が基本 | 画面右上、通知パネル |

:::message
多くのプロジェクトでは Snackbar と Toast を区別せず「Toast」と呼ぶことが一般的である。重要なのは用語の統一よりも、「ユーザーの操作を阻害しない一時通知」と「注意を引く必要がある永続的な通知」を明確に区別することだ。ここでは一時通知全般を「Snackbar / Toast」として扱う。
:::

## 出現アニメーションと配置

### アニメーションパターン

Snackbar のアニメーションはユーザー体験に直結する。動きが速すぎると見逃し、遅すぎると待たされる印象になる。

- Slide-in -- 画面外から滑り込む動き。最も一般的。下部配置なら下から、右上配置なら右からスライドするのが自然
- Fade-in -- 透明から不透明へ変化。控えめだが単独では出現位置が分かりにくい。Slide-in との組み合わせが効果的
- Scale -- 小さい状態から拡大。注目を集めやすいが、使いすぎると煩わしい。重要度の高い通知に限定する

```css
/* Slide-in（下部配置向け） */
.snackbar-slide-enter {
  transform: translateY(100%); opacity: 0;
}
.snackbar-slide-active {
  transform: translateY(0); opacity: 1;
  transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1),
              opacity 200ms ease-in;
}
.snackbar-slide-exit {
  transform: translateY(100%); opacity: 0;
  transition: transform 250ms cubic-bezier(0.4, 0, 0.2, 1),
              opacity 150ms ease-out;
}

/* Fade-in + 軽い上方向スライド */
.snackbar-fade-enter { opacity: 0; transform: translateY(8px); }
.snackbar-fade-active {
  opacity: 1; transform: translateY(0);
  transition: opacity 200ms ease-in, transform 200ms ease-out;
}

/* Scale（重要通知向け） */
.snackbar-scale-enter { transform: scale(0.85); opacity: 0; }
.snackbar-scale-active {
  transform: scale(1); opacity: 1;
  transition: transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1),
              opacity 200ms ease-in;
}
```

`cubic-bezier(0.4, 0, 0.2, 1)` は Material Design 推奨の標準イージング関数である。exit アニメーションは enter より短く設定するのが定石だ（消える動きはユーザーが待つ必要がないため）。

### 配置の使い分け

- bottom-center -- Material Design の標準。視線移動が少なくコンテンツ閲覧を妨げにくい。操作フィードバックに最適
- top-right -- 複数通知を縦にスタッキングしやすい。SaaS やダッシュボードで頻用
- top-center -- 見逃してはいけないエラー向き。ヘッダーとの z-index 管理が必要
- bottom-left -- チャット UI やヘルプウィジェットとの共存用

```css
.snackbar-container {
  position: fixed;
  z-index: 1400;
  display: flex; flex-direction: column; gap: 8px;
  pointer-events: none; /* コンテナはクリック透過 */
}
.snackbar-container > * { pointer-events: auto; }

.snackbar-bottom-center { bottom: 24px; left: 50%; transform: translateX(-50%); }
.snackbar-top-right     { top: 24px; right: 24px; align-items: flex-end; }

@media (max-width: 600px) {
  .snackbar-bottom-center { left: 16px; right: 16px; transform: none; }
}
```

## 自動消去と手動消去の設計指針

| シナリオ | 推奨秒数 | 理由 |
| --- | --- | --- |
| 簡潔な成功メッセージ | 3 秒 | 確認するだけで十分 |
| アクション付き（Undo など） | 5 - 8 秒 | メッセージを読み判断する時間が必要 |
| 長めの情報メッセージ | 6 - 10 秒 | テキスト量に応じて読み切れる時間を確保 |
| エラーメッセージ | 手動消去 | 内容を確認し対処する時間が必要 |
| ネットワークエラー | 永続表示 | 問題が解消されるまで表示し続ける |

ホバー時のタイマー一時停止は WCAG の要件ではないが、ユーザビリティの観点から強く推奨される。マウスが Snackbar 上にある間は消えない、フォーカス中も一時停止する、という挙動が望ましい。

```tsx
function useAutoHide(duration: number | null, onHide: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const remainingRef = useRef(duration ?? 0);
  const startRef = useRef(0);

  const start = useCallback(() => {
    if (duration === null) return;
    startRef.current = Date.now();
    timerRef.current = setTimeout(onHide, remainingRef.current);
  }, [duration, onHide]);

  const pause = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      remainingRef.current = Math.max(
        remainingRef.current - (Date.now() - startRef.current), 0
      );
    }
  }, []);

  useEffect(() => {
    remainingRef.current = duration ?? 0;
    start();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [duration, start]);

  return { pause, resume: start };
}
```

## Undo アクションパターン

確認ダイアログで操作を止めるのではなく、操作を即座に実行してから取り消しの選択肢を提供するアプローチである。破壊的操作の UX を改善する。

```tsx
interface UndoableAction {
  id: string;
  message: string;
  execute: () => void;  // 操作の即時実行
  undo: () => void;     // 巻き戻し
}

function useUndoableAction() {
  const [pending, setPending] = useState<UndoableAction | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const perform = useCallback((action: UndoableAction) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    action.execute(); // 楽観的更新
    setPending(action);
    timerRef.current = setTimeout(() => setPending(null), 6000);
  }, []);

  const undoAction = useCallback(() => {
    if (!pending) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    pending.undo();
    setPending(null);
  }, [pending]);

  return { pending, perform, undoAction };
}
```

このパターンの要点は次の通りである。

1. 操作を即座に実行し、UI を楽観的に更新する
2. Snackbar に Undo ボタンを表示し、5 - 8 秒内であれば取り消せるようにする
3. タイマー経過後は操作を確定し Snackbar を閉じる
4. Undo が押された場合は `undo()` で元の状態に復元する

確認ダイアログ方式と比較した場合、Undo パターンには次の利点がある。

- ユーザーの操作フローが中断されない
- 「本当に削除しますか？」の確認疲れ（confirmation fatigue）を防ぐ
- 誤操作に気づいた場合のみ取り消せばよいため、多くの場合は追加操作なしで完了する

## スタッキング戦略

複数の通知が同時に発生した場合の表示方法は 3 種類に分けられる。

1. **縦にスタック表示** -- 複数通知を同時表示し、新しい通知を上下に積み上げる。最大表示数を制限し（3 - 5 件）、超過分はキューに入れる
2. **1 件ずつ入れ替え** -- 最新の 1 件だけを表示。Material Design 推奨。前の通知を見逃すリスクがある
3. **折りたたみスタック** -- 最新のみフル表示し、過去の通知は縮小表示。sonner や react-hot-toast が採用。ホバーで全件展開

```tsx
interface ToastState {
  visible: Toast[];  // 現在表示中（最大 MAX_VISIBLE 件）
  queue: Toast[];    // 表示待ちキュー
}
const MAX_VISIBLE = 3;

function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'ADD':
      if (state.visible.length < MAX_VISIBLE)
        return { ...state, visible: [...state.visible, action.toast] };
      return { ...state, queue: [...state.queue, action.toast] };
    case 'REMOVE': {
      const next = state.visible.filter((t) => t.id !== action.id);
      if (state.queue.length > 0 && next.length < MAX_VISIBLE) {
        const [head, ...rest] = state.queue;
        return { visible: [...next, head], queue: rest };
      }
      return { ...state, visible: next };
    }
    default: return state;
  }
}
```

## アクセシビリティ（aria-live, role="status"）

Snackbar は視覚的な通知だが、スクリーンリーダーにも正しく情報を伝える必要がある。

- `aria-live="polite"` / `role="status"` -- 通常の通知用。現在の読み上げを中断せず、読み終わってから通知を読み上げる。成功メッセージや情報通知に使う
- `aria-live="assertive"` / `role="alert"` -- 緊急通知用。現在の読み上げを中断して即座に読み上げる。エラーやセキュリティ警告など、本当に緊急の場合のみ使用する

```tsx
function AccessibleToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <>
      {/* 通常通知用: コンテナは常に DOM に存在させる */}
      <div aria-live="polite" aria-atomic="false" aria-relevant="additions">
        {toasts.filter((t) => t.type !== 'error').map((t) => (
          <div key={t.id} role="status">{t.message}</div>
        ))}
      </div>
      {/* 緊急通知用 */}
      <div aria-live="assertive" aria-atomic="true">
        {toasts.filter((t) => t.type === 'error').map((t) => (
          <div key={t.id} role="alert">{t.message}</div>
        ))}
      </div>
    </>
  );
}
```

:::message alert
**aria-live の注意点**
- `aria-live` コンテナは初回レンダリング時に DOM に存在させる。動的生成では一部の SR が認識しない
- `assertive` の多用は SR ユーザーの操作を頻繁に中断し、深刻な UX 低下を招く
- 自動消去でも SR が読み上げる十分な時間（最低 5 秒）を確保する
- Undo ボタン等のアクションはキーボードでフォーカス・操作可能であること
:::

## アンチパターン

### 1. Toast の大量連発

```tsx
// NG: ループ内で個別に発火
for (const file of files) { await upload(file); toast(`${file.name} 完了`); }

// OK: まとめて 1 回
const results = await Promise.allSettled(files.map(upload));
const ok = results.filter((r) => r.status === 'fulfilled').length;
toast(`${ok} 件アップロード完了`);
```

### 2. 重要情報を Toast だけで伝える

バリデーションエラーや決済結果など、確実に確認すべき情報を自動消去の Toast だけで表示するのは危険である。重要情報はインライン表示やダイアログで伝え、Toast は補助に留める。

### 3. 操作を阻害する位置に表示

送信ボタンの真上に Toast を表示して次の操作がクリックできなくなるケース。`pointer-events: none` をコンテナに設定し、Toast の下の要素をクリック可能にする。

### 4. エラーを自動消去する

API エラーの通知が 3 秒で消え、ユーザーが内容を把握できないケース。エラーは手動消去が基本である。

### 5. 文脈のない汎用メッセージ

「エラーが発生しました」ではなく「メールの送信に失敗しました」のように、具体的な操作対象を含めること。

:::details 理解度チェック: aria-live="assertive" を使うべきケースは？
**問題**: `aria-live="assertive"` を使うべきケースはどれか。

A. ファイルの保存が完了したとき
B. セッションが期限切れになりデータが失われる可能性があるとき
C. 新しいコメントが投稿されたとき
D. ダークモードに切り替わったとき

**正解: B** -- `assertive` は現在の読み上げを中断する。データ損失の可能性がある緊急時のみ使用すべきである。
:::

:::details 理解度チェック: エラーメッセージの自動消去設定
**問題**: エラー Snackbar に適切な自動消去設定はどれか。

A. 3 秒　B. 5 秒　C. 10 秒　D. 自動消去しない（手動閉じ）

**正解: D** -- エラーはユーザーが内容を確認し対処する時間が必要である。自動消去ではエラー原因を把握できないまま通知が消える。
:::

## まとめ

- 使い分け: Snackbar / Toast は操作結果の一時通知、Notification は永続通知
- アニメーション: enter 300ms / exit 200ms。cubic-bezier イージングを使う
- 配置: 操作フィードバックは bottom-center、複数通知は top-right
- タイミング: 成功 3 秒、アクション付き 5 - 8 秒、エラーは手動消去
- スタッキング: 最大表示数を制限し超過分はキューに入れる
- a11y: `aria-live="polite"` を基本とし緊急時のみ `"assertive"`
- アンチパターン: 大量連発、重要情報の Toast 依存、エラーの自動消去は避ける
