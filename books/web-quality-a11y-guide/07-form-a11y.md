---
title: "Formのアクセシビリティ"
---

フォームはWebで最もインタラクティブな要素であり、アクセシビリティ上の問題が最も起きやすい箇所である。ラベルの紐付け、エラーメッセージの伝達、キーボード操作、送信時のUXまで包括的に解説する。

## フォームアクセシビリティの基本原則

フォームのアクセシビリティは4つの原則に集約される。

1. **すべてのフィールドにプログラム的に紐付いたラベルがある**
2. **エラーが明確に伝わる**
3. **キーボードだけで全操作が完結する**
4. **状態変化が支援技術に通知される**

これらが一つでも欠けると、スクリーンリーダーやキーボード操作のユーザーがフォームを正しく使えなくなる。

## ラベルの必須性

ラベルの紐付けには複数の方法がある。用途に応じて使い分ける。

```html
<!-- 方法 1: for 属性で id を指定（最も推奨） -->
<label for="email">メールアドレス</label>
<input type="email" id="email" name="email" />

<!-- 方法 2: label で input を囲む（暗黙的な紐付け） -->
<label>
  メールアドレス
  <input type="email" name="email" />
</label>

<!-- 方法 3: aria-label（視覚的ラベルがない場合） -->
<input type="search" aria-label="サイト内検索" placeholder="検索..." />

<!-- 方法 4: aria-labelledby（別の要素をラベルとして参照） -->
<h2 id="billing-title">請求先住所</h2>
<form aria-labelledby="billing-title">
  <label for="address">住所</label>
  <input type="text" id="address" name="address" />
</form>

<!-- 複数の要素をラベルにする -->
<span id="card-label">カード番号</span>
<span id="card-hint">（ハイフンなし 16 桁）</span>
<input type="text" aria-labelledby="card-label card-hint"
       inputmode="numeric" />
```

:::message alert
**placeholderはラベルの代替にならない**

`placeholder` は入力のヒントであり、ラベルの代わりにはならない。入力を始めると消えるため、何を入力すべきか分からなくなる。多くのスクリーンリーダーはplaceholderをラベルとして読み上げない。必ず `label` または `aria-label` と併用する。
:::

## エラーメッセージの伝達

### aria-describedby + aria-invalid

フィールドにエラーがある場合、`aria-invalid="true"` でフィールドが無効であることを示し、`aria-describedby` でエラーメッセージの要素を参照する。

```tsx
function EmailField() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const validate = () => {
    if (!email) setError('メールアドレスは必須です');
    else if (!email.includes('@')) setError('有効なメールアドレスを入力してください');
    else setError('');
  };

  return (
    <div>
      <label htmlFor="email">メールアドレス</label>
      <input
        type="email"
        id="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={validate}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? 'email-error' : undefined}
        placeholder="example@mail.com"
      />
      {error && (
        <p id="email-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

### aria-errormessage

`aria-errormessage` は `aria-invalid="true"` の時だけ読み上げられるエラー専用属性である。ただしスクリーンリーダー対応がまだ不完全な場合がある。確実を期すなら `aria-describedby` + `role="alert"` を推奨する。

```tsx
<>
  <input
    type="password"
    id="password"
    aria-invalid={hasError ? 'true' : undefined}
    aria-errormessage={hasError ? 'password-error' : undefined}
  />
  {hasError && <p id="password-error">{errorText}</p>}
</>
```

参照先の要素が存在しないとこの属性は無視される。`hidden`属性や `display: none` で隠した要素を指しても読み上げられない。

### エラーサマリー

フォーム上部にエラー一覧を表示するパターンである。送信時に全フィールドを検証し、エラーがあれば一覧を表示してフォーカスを移動する。

```tsx
function FormWithErrorSummary() {
  const [errors, setErrors] = useState({});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!name) newErrors.name = '名前は必須です';
    if (!email) newErrors.email = 'メールアドレスは必須です';
    setErrors(newErrors);
  };

  const errKeys = Object.keys(errors);

  return (
    <form onSubmit={handleSubmit} noValidate>
      {errKeys.length > 0 && (
        <div role="alert" tabIndex={-1}>
          <h2>{errKeys.length} 件のエラーがあります</h2>
          <ul>
            {Object.entries(errors).map(([field, msg]) => (
              <li key={field}>
                <a href={'#' + field}>{msg}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* フォームフィールド */}
    </form>
  );
}
```

エラーサマリーの要点は以下の通りである。

- `role="alert"` でスクリーンリーダーに即座に通知する
- `tabIndex={-1}` + `focus()` でプログラム的にフォーカスを移動する
- 各エラーからフィールドへのアンカーリンクで該当箇所にジャンプできるようにする

## 必須フィールドの表現

必須フィールドは視覚的な表示とプログラム的な通知の両方が必要である。

```html
<!-- 良い例: required + aria-required + 視覚的なアスタリスク -->
<p><span aria-hidden="true">*</span> は必須項目です</p>

<label for="fullname">
  名前 <span aria-hidden="true">*</span>
</label>
<input id="fullname" type="text" required aria-required="true" />

<!-- 任意フィールドは明示する -->
<label for="company">
  会社名 <span>（任意）</span>
</label>
<input id="company" type="text" />
```

:::message alert
アスタリスク（`*`）だけに頼ってはならない。`required` 属性でブラウザバリデーションを有効にし、`aria-required="true"` でスクリーンリーダーに必須であることを通知する。アスタリスク自体は `aria-hidden="true"` で装飾として扱い、スクリーンリーダーが「アスタリスク」と読み上げないようにする。
:::

## フィールドのグループ化と説明テキスト

### fieldset / legend

関連するフィールドは `fieldset` と `legend` でグループ化する。特にラジオボタンやチェックボックスのグループには必須である。

```html
<!-- fieldset + legend でグループ化 -->
<fieldset>
  <legend>お届け先住所</legend>
  <label for="zip">郵便番号</label>
  <input type="text" id="zip" autocomplete="postal-code" />
  <label for="city">市区町村</label>
  <input type="text" id="city" autocomplete="address-level2" />
</fieldset>

<!-- ラジオボタンには fieldset/legend が必須 -->
<fieldset>
  <legend>お支払い方法</legend>
  <input type="radio" id="credit" name="payment" value="credit" />
  <label for="credit">クレジットカード</label>
  <input type="radio" id="bank" name="payment" value="bank" />
  <label for="bank">銀行振込</label>
</fieldset>

<!-- div ではスクリーンリーダーがグループを認識できない -->
<div class="address-group">
  <h3>お届け先住所</h3>  <!-- これは見出しであってグループ名ではない -->
  <label for="zip2">郵便番号</label>
  <input type="text" id="zip2" />
</div>
```

### ヒントテキストの紐付け

`aria-describedby` でヒントテキストをフィールドに紐付ける。フォーカス時にスクリーンリーダーがラベルの後にヒントを読み上げる。

```html
<label for="username">ユーザー名</label>
<input type="text" id="username" aria-describedby="username-hint" />
<p id="username-hint">3〜20文字の半角英数字とアンダースコアが使用できます</p>
```

## よくあるフォームの課題と問題点

### placeholder依存の危険性

placeholderをラベル代わりに使うパターンは多いが、以下の理由から推奨されない。

1. 入力開始で消えてしまう
2. デフォルトの薄いグレーがWCAGコントラスト比を満たさない
3. ブラウザの自動翻訳がplaceholderを翻訳しない場合がある

必ず `label` と併用する。

### disabled vs readonlyの使い分け

```html
<!-- disabled: Tab で飛ばされる、スクリーンリーダーが読み飛ばす場合あり、
     フォーム送信時に値が含まれない -->
<input type="text" id="plan1" value="スタンダード" disabled />

<!-- readonly: Tab で到達、スクリーンリーダーが読み上げる、
     フォーム送信時に値が含まれる -->
<input type="text" id="plan2" value="スタンダード" readonly />

<!-- 使い分け:
  disabled → そのフィールドが現在無関係（条件分岐で無効化）
  readonly → 値を見せたいが変更は不可（確認画面など） -->
```

### 日付入力のクロスブラウザ問題と代替

`<input type="date">` はブラウザ間でUIが大きく異なり、アクセシビリティの実装にもばらつきがある。確実な方法として、3つの `select` に分割するパターンがある。

```html
<fieldset>
  <legend>生年月日</legend>
  <label for="birth-year">年</label>
  <select id="birth-year" autocomplete="bday-year">
    <option value="">----</option>
  </select>
  <label for="birth-month">月</label>
  <select id="birth-month" autocomplete="bday-month">
    <option value="">--</option>
  </select>
  <label for="birth-day">日</label>
  <select id="birth-day" autocomplete="bday-day">
    <option value="">--</option>
  </select>
</fieldset>
```

### カスタムselectのアクセシビリティ

ネイティブの `<select>` を独自ドロップダウンに置き換えると、キーボード操作やスクリーンリーダー対応が欠落しがちである。カスタムselectの最低要件を以下に示す。

```tsx
<label id="color-label">好きな色</label>
<div
  role="combobox"
  aria-expanded={isOpen}
  aria-haspopup="listbox"
  aria-labelledby="color-label"
  aria-controls="color-listbox"
  tabIndex={0}
  onKeyDown={handleKeyDown}
>
  <span>{selectedOption || '選択してください'}</span>
</div>
{isOpen && (
  <ul id="color-listbox" role="listbox" aria-labelledby="color-label">
    {options.map((opt, i) => (
      <li key={opt.value} role="option" aria-selected={selectedIndex === i}>
        {opt.label}
      </li>
    ))}
  </ul>
)}
```

必要なキーボード操作は以下の通りである。

- Enter / Space: ドロップダウンの開閉
- 上下矢印: 選択肢の移動
- Home / End: 最初 / 最後の選択肢に移動
- Escape: 閉じる
- 文字キー: 一致する選択肢にジャンプ

現実的な推奨としては、Radix UI / Headless UI / React Ariaのようなアクセシブルなコンポーネントライブラリを使うことである。

### ファイルアップロード

```tsx
function AccessibleFileUpload() {
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <label htmlFor="file-upload">添付ファイル</label>
      {/* sr-only で視覚的に隠す（display:none だとフォーカス不可） */}
      <input
        type="file"
        id="file-upload"
        ref={inputRef}
        onChange={(e) => setFileName(e.target.files?.[0]?.name || '')}
        className="sr-only"
        accept=".pdf,.doc,.docx"
        aria-describedby="file-hint"
      />
      <button type="button" onClick={() => inputRef.current?.click()}>
        ファイルを選択
      </button>
      <span aria-live="polite">
        {fileName ? `選択中: ${fileName}` : 'ファイル未選択'}
      </span>
      <p id="file-hint">PDF, DOC, DOCX 形式（最大 5MB）</p>
    </div>
  );
}
```

### CAPTCHAのアクセシビリティ

CAPTCHAの種類によってアクセシビリティへの影響は大きく異なる。

| 種類 | アクセシビリティ |
|------|-----------------|
| 画像CAPTCHA | 視覚障害者は読めない。最もアクセシブルでない |
| reCAPTCHA v3 | ユーザー操作不要で透過的。問題が最も少ない |
| Cloudflare Turnstile | 非対話型でプライバシーも良好 |
| ハニーポット | 隠しフィールドでボット検知。操作不要でアクセシブル |

## フォーム送信のUX

### 送信中の状態表示

`aria-busy` でフォームが処理中であることを支援技術に通知する。

```tsx
<form onSubmit={handleSubmit} aria-busy={status === 'submitting'}>
  {/* フィールド */}
  <button
    type="submit"
    disabled={status === 'submitting'}
    aria-disabled={status === 'submitting'}
  >
    {status === 'submitting' ? '送信中...' : '送信する'}
  </button>
</form>
```

### フォーカス管理

送信結果（成功メッセージやエラーサマリー）にフォーカスを移動することで、スクリーンリーダーユーザーが結果を確実に認識できるようにする。

```tsx
<div tabIndex={-1} role="status" aria-live="polite">
  {status === 'success' && (
    <p>お問い合わせを受け付けました。</p>
  )}
  {status === 'error' && (
    <div role="alert">
      <p>送信に失敗しました。再度お試しください。</p>
    </div>
  )}
</div>
```

### ダブルサブミット防止

:::message alert
**disabledとaria-disabledの違い**

`disabled` はボタンをフォーカス不可にするため、キーボードユーザーが「送信中」を認識しにくくなる。`aria-disabled="true"` ならフォーカスは残りつつ操作を無効化できるが、クリックイベントは発火するためJavaScript側で重複送信を防ぐ必要がある。
:::

## 複雑なフォームパターン

### マルチステップフォーム

```tsx
function MultiStepForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const stepTitles = ['個人情報', 'お届け先', '確認'];

  return (
    <div>
      {/* 進捗インジケーター */}
      <nav aria-label="フォームの進捗">
        <ol>
          {stepTitles.map((title, i) => {
            const step = i + 1;
            return (
              <li key={step} aria-current={step === currentStep ? 'step' : undefined}>
                ステップ {step}: {title}
                {step < currentStep && <span className="sr-only">（完了）</span>}
                {step === currentStep && <span className="sr-only">（現在）</span>}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* ステップの内容 */}
      <div role="group"
           aria-label={`ステップ ${currentStep} / 3: ${stepTitles[currentStep - 1]}`}>
        <h2>ステップ {currentStep}: {stepTitles[currentStep - 1]}</h2>
        {/* フォームフィールド */}
      </div>

      <div>
        {currentStep > 1 && (
          <button type="button" onClick={() => setCurrentStep((s) => s - 1)}>
            前のステップに戻る
          </button>
        )}
        {currentStep < 3 ? (
          <button type="button" onClick={() => setCurrentStep((s) => s + 1)}>
            次のステップへ進む
          </button>
        ) : (
          <button type="submit">送信する</button>
        )}
      </div>
    </div>
  );
}
```

`aria-current="step"` で現在のステップを支援技術に明示し、`role="group"` と `aria-label` で各ステップの内容をグループ化する。

### 動的フィールドの追加 / 削除

```tsx
function DynamicPhoneFields() {
  const [phones, setPhones] = useState(['']);
  const lastInputRef = useRef<HTMLInputElement>(null);

  const addField = () => setPhones([...phones, '']);

  useEffect(() => {
    if (phones.length > 1) lastInputRef.current?.focus();
  }, [phones.length]);

  return (
    <fieldset>
      <legend>電話番号<span className="sr-only">（{phones.length} 件）</span></legend>
      {phones.map((phone, i) => (
        <div key={i} role="group" aria-label={`電話番号 ${i + 1}`}>
          <label htmlFor={`phone-${i}`}>電話番号 {i + 1}</label>
          <input type="tel" id={`phone-${i}`} value={phone}
                 ref={i === phones.length - 1 ? lastInputRef : undefined}
                 autoComplete="tel" onChange={/* ... */} />
          {phones.length > 1 && (
            <button type="button" aria-label={`電話番号 ${i + 1} を削除`}
                    onClick={() => setPhones(phones.filter((_, j) => j !== i))}>
              削除
            </button>
          )}
        </div>
      ))}
      <button type="button" onClick={addField}>電話番号を追加</button>
      <div aria-live="polite" className="sr-only">電話番号は {phones.length} 件です</div>
    </fieldset>
  );
}
```

フィールドが追加されたとき、新しいフィールドにフォーカスを移動し、`aria-live="polite"` で件数の変更を通知する。

### バリデーションのタイミング

リアルタイム（入力中）バリデーションは即座のフィードバックが利点だが、入力途中にエラーが表示されて混乱やスクリーンリーダーの頻繁な読み上げの原因になる。

推奨は **onBlur（フォーカス移動時）+ 送信時** の組み合わせである。フィールドからフォーカスが外れたときにバリデーションし、送信時に全フィールドを再チェックしてエラーサマリーを表示する。パスワード強度メーターや文字数カウンターのように、入力中のフィードバックが自然な場面でのみリアルタイムを使う。

## autocomplete属性の正しい使い方

`autocomplete` を正しく設定すると、ブラウザの自動入力が適切に動作し、ユーザーの入力負担を大幅に軽減する。WCAG 2.1の達成基準1.3.5でも要求されている。

```html
<!-- 氏名 -->
<input type="text" id="name" autocomplete="name" />
<input type="text" id="family" autocomplete="family-name" />
<input type="text" id="given" autocomplete="given-name" />

<!-- 連絡先 -->
<input type="email" id="email" autocomplete="email" />
<input type="tel" id="tel" autocomplete="tel" />

<!-- 住所 -->
<input type="text" id="postal" autocomplete="postal-code" inputmode="numeric" />
<input type="text" id="addr1" autocomplete="address-level1" />
<input type="text" id="addr2" autocomplete="address-line1" />

<!-- クレジットカード -->
<input type="text" id="cc-name" autocomplete="cc-name" />
<input type="text" id="cc-number" autocomplete="cc-number" inputmode="numeric" />
<input type="text" id="cc-exp" autocomplete="cc-exp" placeholder="MM/YY" />
<input type="text" id="cc-csc" autocomplete="cc-csc" inputmode="numeric" />

<!-- ログイン / 新規登録 -->
<input type="text" id="user" autocomplete="username" />
<input type="password" id="pass" autocomplete="current-password" />
<input type="password" id="new-pass" autocomplete="new-password" />
```

:::message
**autocompleteと認知アクセシビリティ**

autocompleteの恩恵はスクリーンリーダーユーザーだけのものではない。認知障害や運動障害のあるユーザーにとって自動入力は入力負担を大きく軽減する。パスワードマネージャーが正しく動作するためにも `autocomplete="username"` と `autocomplete="current-password"` の設定は重要である。
:::

## フォームアクセシビリティチェックリスト

### 基本チェック

- [ ] すべての入力フィールドに `label` が紐付いている
- [ ] `required` / `aria-required` で必須を明示
- [ ] エラーが `aria-invalid` + `aria-describedby` で伝わる
- [ ] `fieldset` / `legend` で関連フィールドをグループ化
- [ ] `autocomplete` 属性が適切に設定されている

### UXチェック

- [ ] Tabキーで全フィールドを順に移動できる
- [ ] 送信中の状態が `aria-busy` で通知される
- [ ] 送信結果にフォーカスが移動する
- [ ] ダブルサブミットが防止されている
- [ ] `placeholder` だけに依存していない

:::message
**テストの習慣を身につける**

フォームのアクセシビリティは「実装して終わり」ではない。(1) キーボードだけで全操作を完了できるか試す、(2) スクリーンリーダー（VoiceOver, NVDA）で実際に操作する、(3) axe DevToolsやLighthouseでチェックする、の3段階テストを習慣にする。特にカスタムUIコンポーネントはネイティブ要素と同等の操作性を必ず検証する。
:::
