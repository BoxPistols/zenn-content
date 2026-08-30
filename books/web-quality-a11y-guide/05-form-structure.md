---
title: "FormグループのHTML構造と課題"
---

## フォームの基本HTML構造

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

- form -- フォーム全体のコンテナ。JS制御でも必ず使う。オートコンプリート、Enter送信、バリデーションAPIの基盤
- fieldset + legend -- 関連するフォーム要素をグループ化。SRがグループ単位で読み上げる
- label -- 入力フィールドの説明。`for` 属性で `input` の `id` と紐付ける

## labelとinputの紐付け

**方法1: for/id（明示的ラベル -- 推奨）**

```html
<label for="username">ユーザー名</label>
<input type="text" id="username" name="username" />
```

**方法2: label内にネスト（暗黙的ラベル）**

```html
<label><input type="checkbox" /> 利用規約に同意する</label>
```

:::message alert
**明示的ラベルを推奨する理由**: labelとinputを離れた位置に配置できる、古いSRでの互換性が高い、Testing Libraryで検証しやすい。暗黙的ラベルはチェックボックスやラジオボタンなど密接に並ぶ場合に使う。
:::

## fieldset + legendの活用

SRは `fieldset` 内の各入力にフォーカスした際に `legend` を文脈として読み上げる。

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

:::details理解度チェック: ラジオボタン群のグループ化
**問題**: ラジオボタン群をグループ化する最も適切なHTMLはどれか。

A. div + h3　B. fieldset + legend　C. section + aria-label　D. ul + li

**正解: B** -- SRはfieldset内のラジオにフォーカスした際legendを文脈として読み上げる。div + h3では関連を認識できない。
:::

## よくあるHTML構造の間違い

### 1. divで囲むだけでfieldsetを使わない

```html
<!-- NG --> <div><h3>お支払い方法</h3><label><input type="radio" ...> カード</label></div>
<!-- OK --> <fieldset><legend>お支払い方法</legend>...</fieldset>
```

### 2. labelなしのinput

```html
<!-- NG --> <span>メール</span><input type="email" />
<!-- OK --> <label for="email">メール</label><input id="email" type="email" />
```

### 3. placeholderをラベル代わりにする

```html
<!-- NG --> <input placeholder="氏名を入力" /> <!-- 入力開始で消える、コントラスト比が低い -->
<!-- OK --> <label for="name">氏名</label><input id="name" placeholder="例: 山田 太郎" />
```

### 4. display:noneでラベルを隠す

```html
<!-- NG --> <label style="display:none">検索</label> <!-- SR からも見えなくなる -->
<!-- OK --> <label for="search" class="visually-hidden">検索</label><input id="search" type="search" />
```

```css
.visually-hidden {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
```

:::message alert
`display: none` や `visibility: hidden` はSRからも隠される。視覚的に隠すには `visually-hidden` か `aria-label` を使うこと。
:::

## バリデーション: ネイティブvs JavaScript

HTML5はネイティブのバリデーション属性を提供しているが、デザインのカスタマイズが困難なため、実務ではJavaScriptバリデーションと組み合わせて使うのが一般的である。

### ネイティブバリデーション属性

```html
<input type="text" required />
<input type="email" required />
<input type="tel" pattern="\d{2,4}-\d{2,4}-\d{4}" title="例: 03-1234-5678" />
<input type="password" minlength="8" maxlength="128" required />
<input type="number" min="18" max="120" />
```

### JavaScriptバリデーション

```tsx
const errors: Record<string, string> = {};
if (!name) errors.name = '氏名は必須です';
if (email && !/^[^@]+@[^@]+\.[^@]+$/.test(email))
  errors.email = '有効なメールアドレスを入力してください';
```

:::message
**使い分け**: ネイティブはシンプル向き（デザインカスタマイズ困難）。JSは複雑な条件に対応可能。推奨はJSをメインにしつつ `required` や `type="email"` をセマンティクスとして残す方式。
:::

エラーの表示方法と支援技術への通知は「Formのアクセシビリティ」の「エラーメッセージの伝達」で扱う。

## 条件付きフィールド

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

## パスワードUX

表示/非表示の切り替えと強度インジケーターが重要なUX要素である。

```tsx
<input type={show ? 'text' : 'password'} id="pw"
       aria-describedby={pw ? 'pw-strength' : undefined} />
<button type="button" onClick={() => setShow(!show)}
        aria-label={show ? 'パスワードを隠す' : 'パスワードを表示'}>
  {show ? '隠す' : '表示'}
</button>
{pw && <p id="pw-strength" aria-live="polite">強度: {labels[score]}</p>}
```

`aria-describedby` で強度表示を紐付け、`aria-live="polite"` で変化時にSRが更新する。

## 要素をどこまで作り替えるか

`select` や `input type="date"` は見た目を揃えたくなるが、作り替えるほどキーボード操作と支援技術への対応を自前で持つことになる。個々のコントロールで何が必要になるかは「Formのアクセシビリティ」の「よくあるフォームの課題と問題点」で扱う。

:::message
**カスタマイズの優先順位**: (1) ネイティブ要素そのまま (2) `appearance: none` + CSS (3) ヘッドレスUIライブラリ (4) フルカスタム（最後の手段）
:::

## Reactでのフォーム管理

| 方式 | 値の管理 | メリット | デメリット |
| --- | --- | --- | --- |
| **制御** | `value` + `onChange` + state | リアルタイムバリデーション、条件付きフィールド制御が容易 | フィールド数が多いとボイラープレートが増える |
| **非制御** | `defaultValue` + `ref` / `FormData` | コードがシンプル、再レンダリングが少ない | リアルタイムバリデーションが難しい |

### React Hook Form

大規模フォームに有効。非制御ベースで `ref` を使いDOMから直接値を取得するため、再レンダリングを最小限に抑える。

```tsx
const { register, handleSubmit, formState: { errors } } = useForm<FormValues>();

<input {...register('name', { required: '氏名は必須です' })} aria-invalid={!!errors.name} />
{errors.name && <p role="alert">{errors.name.message}</p>}
```

`register()` が `ref` + `onChange` + `onBlur` を自動設定し、ボイラープレートを大幅に削減する。

:::details理解度チェック: React Hook Formが非制御ベースの理由
**問題**: 主な理由はどれか。

A. コード記述量の削減　B. 入力ごとの再レンダリング回避　C. TS互換性　D. ネイティブバリデーション活用

**正解: B** -- 制御コンポーネントではonChangeのたびにフォーム全体が再描画される。非制御 + refで不要な再レンダリングを抑制する。
:::

## まとめ

- HTML構造: `form` > `fieldset` > `legend` + `label` + `input` の階層を守る
- ラベル: すべての入力に `label` を紐付ける。`placeholder` はラベルの代替にならない
- グループ化: ラジオ群や関連フィールドは `fieldset` + `legend` で括る
- バリデーション: JSメインにネイティブ属性をセマンティクスとして併用
- React: 大規模フォームにはReact Hook Form。非制御ベースで高パフォーマンス
- カスタマイズ: ネイティブ優先、ヘッドレスUI、フルカスタムの順で検討

エラーの伝達、必須の表現、送信中の状態、autocompleteは「Formのアクセシビリティ」で扱う。
