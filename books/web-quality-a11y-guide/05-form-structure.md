---
title: "Form グループの HTML 構造と課題"
---

## フォームの基本 HTML 構造

`form`、`fieldset`、`legend`、`label`、`input` の正しい階層を理解することが、アクセシブルなフォーム作りの第一歩となる。

```html
<form>
  <fieldset>
    <legend>個人情報</legend>
    <label for="name">氏名 *</label>
    <input id="name" type="text" required />
    <label for="email">メールアドレス *</label>
    <input id="email" type="email" required />
  </fieldset>
  <fieldset>
    <legend>パスワード設定</legend>
    <label for="password">パスワード *</label>
    <input id="password" type="password" minlength="8" required />
  </fieldset>
  <button type="submit">登録する</button>
</form>
```

- **form** -- フォーム全体のコンテナ。JS 制御でも必ず使う。オートコンプリート、Enter 送信、バリデーション API の基盤
- **fieldset + legend** -- 関連するフォーム要素をグループ化。SR がグループ単位で読み上げる
- **label** -- 入力フィールドの説明。`for` 属性で `input` の `id` と紐付ける

## label と input の紐付け

**方法 1: for/id（明示的ラベル -- 推奨）**

```html
<label for="username">ユーザー名</label>
<input type="text" id="username" name="username" />
```

**方法 2: label 内にネスト（暗黙的ラベル）**

```html
<label><input type="checkbox" /> 利用規約に同意する</label>
```

:::message alert
**明示的ラベルを推奨する理由**: label と input を離れた位置に配置できる、古い SR での互換性が高い、Testing Library で検証しやすい。暗黙的ラベルはチェックボックスやラジオボタンなど密接に並ぶ場合に使う。
:::

## fieldset + legend の活用

SR は `fieldset` 内の各入力にフォーカスした際に `legend` を文脈として読み上げる。

```html
<!-- SR は「配送方法、通常配送、ラジオボタン」と読む -->
<fieldset>
  <legend>配送方法</legend>
  <label><input type="radio" name="shipping" value="standard" /> 通常配送</label>
  <label><input type="radio" name="shipping" value="express" /> 速達</label>
</fieldset>

<fieldset>
  <legend>配送先住所</legend>
  <label for="zip">郵便番号</label>
  <input type="text" id="zip" pattern="\d{3}-?\d{4}" placeholder="123-4567" />
  <label for="pref">都道府県</label>
  <select id="pref"><option value="">選択してください</option></select>
</fieldset>
```

:::details 理解度チェック: ラジオボタン群のグループ化
**問題**: ラジオボタン群をグループ化する最も適切な HTML はどれか。

A. div + h3　B. fieldset + legend　C. section + aria-label　D. ul + li

**正解: B** -- SR は fieldset 内のラジオにフォーカスした際 legend を文脈として読み上げる。div + h3 では関連を認識できない。
:::

## よくある HTML 構造の間違い

### 1. div で囲むだけで fieldset を使わない

```html
<!-- NG --> <div><h3>お支払い方法</h3><label><input type="radio" ...> カード</label></div>
<!-- OK --> <fieldset><legend>お支払い方法</legend>...</fieldset>
```

### 2. label なしの input

```html
<!-- NG --> <span>メール</span><input type="email" />
<!-- OK --> <label for="email">メール</label><input id="email" type="email" />
```

### 3. placeholder をラベル代わりにする

```html
<!-- NG --> <input placeholder="氏名を入力" /> <!-- 入力開始で消える、コントラスト比が低い -->
<!-- OK --> <label for="name">氏名</label><input id="name" placeholder="例: 山田 太郎" />
```

### 4. display:none でラベルを隠す

```html
<!-- NG --> <label style="display:none">検索</label> <!-- SR からも見えなくなる -->
<!-- OK --> <label for="search" class="visually-hidden">検索</label>
```

```css
.visually-hidden {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
```

:::message alert
`display: none` や `visibility: hidden` は SR からも隠される。視覚的に隠すには `visually-hidden` か `aria-label` を使うこと。
:::

## バリデーション: ネイティブ vs JavaScript

HTML5 はネイティブのバリデーション属性を提供しているが、デザインのカスタマイズが困難なため、実務では JavaScript バリデーションと組み合わせて使うのが一般的である。

### ネイティブバリデーション属性

```html
<input type="text" required />
<input type="email" required />
<input type="tel" pattern="\d{2,4}-\d{2,4}-\d{4}" title="例: 03-1234-5678" />
<input type="password" minlength="8" maxlength="128" required />
<input type="number" min="18" max="120" />
```

### JavaScript バリデーション

```tsx
const errors: Record<string, string> = {};
if (!name) errors.name = '氏名は必須です';
if (email && !/^[^@]+@[^@]+\.[^@]+$/.test(email))
  errors.email = '有効なメールアドレスを入力してください';

<input
  aria-invalid={!!errors.name}
  aria-describedby={errors.name ? 'name-err' : undefined}
/>
{errors.name && <p id="name-err" role="alert">{errors.name}</p>}
```

:::message
**使い分け**: ネイティブはシンプル向き（デザインカスタマイズ困難）。JS は複雑な条件に対応可能。推奨は JS をメインにしつつ `required` や `type="email"` をセマンティクスとして残す方式。
:::

## エラー表示のパターン

エラー表示は大きく「インラインエラー」と「エラーサマリー」の 2 種類がある。いずれもスクリーンリーダーへの通知を考慮した ARIA 属性の付与が重要である。

### インラインエラー + aria-describedby

各フィールドの直下にエラーを表示する方式。`aria-describedby` でエラーの `id` と入力を紐付けると、SR がフォーカス時にエラーを読み上げる。

```tsx
<label htmlFor="ie-name">氏名 *</label>
<input id="ie-name" aria-invalid={!!err} aria-describedby={err ? 'ie-err' : undefined} />
{err && <p id="ie-err" role="alert">{err}</p>}
```

### エラーサマリー（フォーム上部にまとめて表示）

```tsx
function ErrorSummary({ errors }: { errors: Record<string, string> }) {
  const entries = Object.entries(errors);
  if (!entries.length) return null;
  return (
    <div role="alert" aria-labelledby="err-title">
      <h3 id="err-title">{entries.length} 件のエラーがあります</h3>
      <ul>
        {entries.map(([field, msg]) => (
          <li key={field}>
            <a href={`#field-${field}`} onClick={(e) => {
              e.preventDefault();
              document.getElementById(`field-${field}`)?.focus();
            }}>{msg}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

インラインエラーとサマリーを併用すると、ユーザーの視点に関係なくエラー箇所を把握しやすくなる。`role="alert"` が DOM に追加されると SR が即座に読み上げる（ライブリージョン）。

## 複雑なフォームパターン

実務では単純なフォームだけでなく、マルチステップ、条件付きフィールド、動的なフィールド追加・削除など、複雑な構造を持つフォームが頻出する。いずれの場合も、`fieldset` + `legend` によるグループ化と `label` の紐付けという基本原則は変わらない。

### マルチステップフォーム

```tsx
<form>
  <nav aria-label="フォームの進行状況">
    <ol>
      <li aria-current={step === 1 ? 'step' : undefined}>基本情報</li>
      <li aria-current={step === 2 ? 'step' : undefined}>詳細</li>
      <li aria-current={step === 3 ? 'step' : undefined}>確認</li>
    </ol>
  </nav>
  {step === 1 && (
    <fieldset>
      <legend>基本情報（1/3）</legend>
      <label htmlFor="ms-name">氏名</label>
      <input id="ms-name" />
      <button type="button" onClick={() => setStep(2)}>次へ</button>
    </fieldset>
  )}
</form>
```

要点: `aria-current="step"` で現在位置を SR に伝える。各ステップは `fieldset` + `legend` でグループ化しステップ番号を含める。「戻る」ボタンを必ず配置する。

### 条件付きフィールド

```tsx
<select id="method" value={method} onChange={(e) => setMethod(e.target.value)}>
  <option value="">選択してください</option>
  <option value="email">メール</option>
  <option value="phone">電話</option>
</select>
{method === 'email' && (
  <div><label htmlFor="cf-email">メールアドレス</label>
  <input type="email" id="cf-email" required /></div>
)}
```

### 動的フォーム（フィールド追加・削除）

```tsx
{skills.map((skill, i) => (
  <div key={skill.id}> {/* index ではなく一意 ID を key に */}
    <label htmlFor={`skill-${i}`}>スキル {i + 1}</label>
    <input id={`skill-${i}`} value={skill.name} onChange={...} />
    <button type="button" onClick={() => remove(skill.id)}
            aria-label={`スキル${i + 1}を削除`}>削除</button>
  </div>
))}
<button type="button" onClick={add}>スキルを追加</button>
```

`key` にインデックスを使うと、削除時に意図しないフィールドの値が入れ替わる問題が発生する。

## よくある課題と対策

### autocomplete 属性

`autocomplete` 属性を正しく設定すると、ブラウザのオートフィル機能がフィールドの用途を正しく認識する。WCAG 2.1 の「1.3.5 入力目的の特定」では、ユーザーに関する入力フィールドに `autocomplete` を設定することが求められている。

```html
<input autocomplete="name" />          <!-- 氏名 -->
<input autocomplete="email" />         <!-- メールアドレス -->
<input autocomplete="tel" />           <!-- 電話番号 -->
<input autocomplete="postal-code" />   <!-- 郵便番号 -->
<input autocomplete="street-address" /> <!-- 住所 -->
<input type="password" autocomplete="current-password" />
<input type="password" autocomplete="new-password" />
<input autocomplete="one-time-code" inputmode="numeric" /> <!-- OTP -->
```

### パスワード UX

表示/非表示の切り替えと強度インジケーターが重要な UX 要素である。

```tsx
<input type={show ? 'text' : 'password'} id="pw"
       aria-describedby={pw ? 'pw-strength' : undefined} />
<button type="button" onClick={() => setShow(!show)}
        aria-label={show ? 'パスワードを隠す' : 'パスワードを表示'}>
  {show ? '隠す' : '表示'}
</button>
{pw && <p id="pw-strength" aria-live="polite">強度: {labels[score]}</p>}
```

`aria-describedby` で強度表示を紐付け、`aria-live="polite"` で変化時に SR が更新する。

### ファイルアップロード・select・date input

**ファイルアップロード**: ネイティブ `<input type="file">` を `visually-hidden` で隠し、カスタムボタンをトリガーにするのが一般的なパターンである。

```tsx
const inputRef = useRef<HTMLInputElement>(null);
<input ref={inputRef} type="file" id="upload" className="visually-hidden"
       accept="image/png,image/jpeg" onChange={handleChange} />
<button type="button" onClick={() => inputRef.current?.click()}>
  ファイルを選択
</button>
```

**select のスタイリング**: `appearance: none` + CSS で矢印を消してカスタムアイコンを被せる。ドロップダウン内部まで制御するには Radix UI 等のヘッドレスライブラリが必要。

**date input**: ブラウザ間で UI が異なるため、(1) ネイティブ + min/max で簡易対応 (2) react-datepicker 等のライブラリ (3) 年/月/日の select 分割、の 3 択から要件に応じて選択する。

:::message
**カスタマイズの優先順位**: (1) ネイティブ要素そのまま (2) `appearance: none` + CSS (3) ヘッドレス UI ライブラリ (4) フルカスタム（最後の手段）
:::

## React でのフォーム管理

| 方式 | 値の管理 | メリット | デメリット |
| --- | --- | --- | --- |
| **制御** | `value` + `onChange` + state | リアルタイムバリデーション、条件付きフィールド制御が容易 | フィールド数が多いとボイラープレートが増える |
| **非制御** | `defaultValue` + `ref` / `FormData` | コードがシンプル、再レンダリングが少ない | リアルタイムバリデーションが難しい |

### React Hook Form

大規模フォームに有効。非制御ベースで `ref` を使い DOM から直接値を取得するため、再レンダリングを最小限に抑える。

```tsx
const { register, handleSubmit, formState: { errors } } = useForm<FormValues>();

<input {...register('name', { required: '氏名は必須です' })} aria-invalid={!!errors.name} />
{errors.name && <p role="alert">{errors.name.message}</p>}
```

`register()` が `ref` + `onChange` + `onBlur` を自動設定し、ボイラープレートを大幅に削減する。

:::details 理解度チェック: React Hook Form が非制御ベースの理由
**問題**: 主な理由はどれか。

A. コード記述量の削減　B. 入力ごとの再レンダリング回避　C. TS 互換性　D. ネイティブバリデーション活用

**正解: B** -- 制御コンポーネントでは onChange のたびにフォーム全体が再描画される。非制御 + ref で不要な再レンダリングを抑制する。
:::

:::details 理解度チェック: role="alert" の効果
**問題**: エラーメッセージに `role="alert"` を付ける効果はどれか。

A. 赤色で表示　B. アニメーション付き表示　C. SR が即座に読み上げ　D. コンソールにログ出力

**正解: C** -- ライブリージョンの一種。DOM 挿入時に SR が自動的に内容を読み上げる。視覚的変化はなく支援技術向けの情報である。
:::

## まとめ

- **HTML 構造**: `form` > `fieldset` > `legend` + `label` + `input` の階層を守る
- **ラベル**: すべての入力に `label` を紐付ける。`placeholder` はラベルの代替にならない
- **グループ化**: ラジオ群や関連フィールドは `fieldset` + `legend` で括る
- **バリデーション**: JS メインにネイティブ属性をセマンティクスとして併用
- **エラー表示**: `aria-describedby` + `role="alert"` で支援技術に通知
- **React**: 大規模フォームには React Hook Form。非制御ベースで高パフォーマンス
- **カスタマイズ**: ネイティブ優先、ヘッドレス UI、フルカスタムの順で検討
