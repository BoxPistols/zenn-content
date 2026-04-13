---
title: "Storybook に AI チャットを組み込む完全フロー — ページ文脈認識 + ハイブリッド検索"
emoji: "💬"
type: "tech"
topics: ["storybook", "ai", "openai", "gemini", "frontend"]
published: false
---

## はじめに

Storybook は UI カタログとして優秀ですが、**「このコンポーネントってどう使うの？」** という質問が Slack やドキュメントに分散しがちです。
そこで本記事では、Storybook に AI チャットを常駐させ、**今見ている Story の文脈を理解した状態で質問に答えてくれる** 仕組みを作るノウハウをまとめます。

実装済みリポジトリ（`kaze-ux`）での知見を汎用化した内容なので、そのまま別プロジェクトにも持ち込めます。

:::message
前提: Storybook 8 以降（v10 で検証済み）、React + TypeScript、MUI or 任意の UI ライブラリ。
:::

## ゴール

- Storybook のどの Story でも、右下に FAB（フローティングアクションボタン）からチャット UI が開く
- AI は「いま表示されている Story のタイトル・Props・argTypes」を理解している
- オフライン（APIキー未設定時）でも FAQ ベースで動作する
- OpenAI / Gemini の両方に対応（Bearer 認証統一）

## アーキテクチャ全体像

```
┌─────────────────────────────────────────────┐
│ Storybook (.storybook/preview.tsx)          │
│   └─ Decorator で <ChatSupport /> を常駐    │
│        └─ currentStory (title, name, args) を渡す
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│ ChatSupport (src/components/ChatSupport/)   │
│   ├─ useChatState     状態管理              │
│   ├─ useChatMessage   送信・履歴             │
│   ├─ useChatConfig    APIキー・モデル選択   │
│   └─ useChatShortcuts キーボード操作         │
└─────────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   callAI()   semanticSearch  FAQ (Fuse.js)
 OpenAI/Gemini  Embedding      オフライン
                512次元         ファジー検索
```

3 層フォールバック:

1. **セマンティック検索** (Embedding + コサイン類似度) — APIキーあり
2. **FAQ キーワード検索** (Fuse.js) — オフライン可
3. **ハードコード Suggestions** — 最終手段

## Step 1: ChatSupport コンポーネントを配置する

`src/components/ChatSupport/` に以下を作ります。

```
ChatSupport/
├── ChatSupport.tsx        エントリ
├── chatAiService.ts       callAI / extractContent
├── embeddingService.ts    OpenAI embedding API
├── embeddingSearch.ts     VectorIndex (インメモリ)
├── faqDatabase.ts         FAQ 定義
├── storyGuideMap.ts       Story 別ガイド
├── hooks/
│   ├── useChatState.ts
│   ├── useChatMessage.ts
│   ├── useChatConfig.ts
│   └── useChatShortcuts.ts
└── components/
    ├── ChatHeader.tsx
    ├── ChatInput.tsx
    ├── ChatMessageList.tsx
    └── ChatSettings.tsx
```

ポイントは **1 コンポーネント 1 責務**。`ChatSupport.tsx` がモノリスになりがちなので、hooks と子コンポーネントに早めに分割します（筆者は 1831 行のモノリスから 273 行に縮めた経験あり）。

## Step 2: Storybook Decorator でグローバル注入

ここが本記事のキモです。`.storybook/preview.tsx` で `context` から Story 情報を取り出し、`<ChatSupport />` に渡します。

```tsx
// .storybook/preview.tsx
import { useMemo, useRef } from 'react'
import { ChatSupport } from '../src/components/ChatSupport/ChatSupport'

const decorator = (Story, context) => {
  // Story メタ情報
  const storyTitle = context.title
  const storyName = context.name
  const storyDescription = context.parameters?.docs?.description?.component

  // argTypes / args は Controls 操作で頻繁に変わるので ref 経由で渡す
  // こうしないと AI パネルが毎回再レンダリングされて入力が消える
  const argTypesRef = useRef(context.argTypes)
  const argsRef = useRef(context.args)
  argTypesRef.current = context.argTypes
  argsRef.current = context.args

  const currentStory = useMemo(
    () => ({
      title: storyTitle,
      name: storyName,
      description: storyDescription,
      argTypes: argTypesRef.current,
      args: argsRef.current,
    }),
    [storyTitle, storyName, storyDescription], // args は依存に入れない
  )

  // 専用 Story (ChatSupport 自身のデモ等) は二重描画を防ぐ
  const disableDecoratorChat = context.parameters?.disableDecoratorChat === true

  return (
    <>
      <Story {...context} />
      {context.viewMode !== 'docs' && !disableDecoratorChat && (
        <ChatSupport currentStory={currentStory} />
      )}
    </>
  )
}

export default { decorators: [decorator] }
```

### ハマりポイント 3 つ

- **`viewMode !== 'docs'`** をチェックしないと Docs タブに FAB が 2 個出ます
- **`args` を `useMemo` の依存配列に入れない**。Controls を動かすたびにチャットが再マウントされて入力中のテキストが消えます。`useRef` 経由で渡すのが正解
- **`disableDecoratorChat` エスケープハッチ**。ChatSupport 自身の Story を書くと、Story 内の `<ChatSupport />` と Decorator の `<ChatSupport />` が二重になります。`meta.parameters.disableDecoratorChat = true` で無効化できるようにしておく

## Step 3: OpenAI / Gemini デュアル対応（Bearer 認証統一）

Gemini は **OpenAI 互換エンドポイント** (`generativelanguage.googleapis.com/v1beta/openai/`) が使えるため、分岐は 1 行で済みます。

```ts
// chatAiService.ts
const callAI = async ({ apiKey, model, messages }) => {
  const isGemini = model.includes('gemini')
  const endpoint = isGemini
    ? 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
    : 'https://api.openai.com/v1/chat/completions'

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`, // 両方 Bearer で統一
    },
    body: JSON.stringify({ model, messages, stream: false }),
  })
  const data = await res.json()
  return extractContent(data)
}

// OpenAI 標準 / Responses API / Gemini native の 3 形式を正規化
const extractContent = (data): string => {
  return (
    data?.choices?.[0]?.message?.content ?? // OpenAI 標準
    data?.output?.[0]?.content?.[0]?.text ?? // Responses API
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? // Gemini native
    ''
  )
}
```

本番プロキシ化するなら AI SDK v6 の `streamText` + `toUIMessageStreamResponse()` に置き換えるのが筋ですが、**Storybook 用途では fetch 直呼びで十分**。デプロイ時に CORS とレート制限だけ気をつけてください。

## Step 4: ページ文脈認識（currentStory → システムプロンプト）

受け取った `currentStory` をシステムプロンプトに注入します。

```ts
const buildSystemPrompt = (currentStory) => `
あなたは ${currentStory.title} の使い方を解説するアシスタントです。
現在表示中の Story: ${currentStory.name}
概要: ${currentStory.description ?? '(なし)'}
Props 定義: ${JSON.stringify(currentStory.argTypes, null, 2)}
現在の Props 値: ${JSON.stringify(currentStory.args, null, 2)}

ユーザーが「このコンポーネント」「これ」と言ったら上記の Story を指しています。
`
```

これで `「これってどう使うの？」` に対して **いま開いている Story の文脈で** 返答できます。
ドキュメントビューアや別のカタログでも、同じパターンで「現在地」パラメータを渡すだけで転用可能です。

## Step 5: ハイブリッド検索（Embedding + FAQ）

### Embedding セマンティック検索

`text-embedding-3-small` を **512 次元に短縮** するとコストが半分以下になります。

```ts
// embeddingService.ts
const embed = async (texts: string[]) => {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texts,
      dimensions: 512, // デフォルト 1536 → 512 に短縮
    }),
  })
  return (await res.json()).data.map((d) => d.embedding)
}
```

### インメモリ VectorIndex

```ts
class VectorIndex {
  private items: { id: string; text: string; vec: number[] }[] = []

  async addBatch(docs: { id: string; text: string }[]) {
    // 100 件ずつ embedding 取得
    for (let i = 0; i < docs.length; i += 100) {
      const chunk = docs.slice(i, i + 100)
      const vecs = await embed(chunk.map((d) => d.text))
      chunk.forEach((d, j) => this.items.push({ ...d, vec: vecs[j] }))
    }
  }

  search(queryVec: number[], topK = 5, threshold = 0.3) {
    return this.items
      .map((item) => ({ ...item, score: cosine(queryVec, item.vec) }))
      .filter((x) => x.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
  }
}

const cosine = (a: number[], b: number[]) => {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0)
  const normA = Math.sqrt(a.reduce((s, v) => s + v * v, 0))
  const normB = Math.sqrt(b.reduce((s, v) => s + v * v, 0))
  return dot / (normA * normB)
}
```

### FAQ フォールバック（Fuse.js）

APIキーが無い、または Embedding が失敗したとき用:

```ts
import Fuse from 'fuse.js'

const fuse = new Fuse(faqDatabase, {
  keys: ['question', 'answer', 'keywords'],
  threshold: 0.4, // 0.0 = 完全一致, 1.0 = なんでも
  ignoreLocation: true,
})

const searchFaq = (query: string) => fuse.search(query).slice(0, 3)
```

**同義語展開** を入れると FAQ ヒット率が上がります:

```ts
const SYNONYM_MAP = {
  ボタン: ['button', 'btn'],
  色: ['カラー', 'color'],
  // ...
}
```

## Step 6: ペルソナ検出

デザイナーとエンジニアでは欲しい答えが違います。以下のシンプルなスコアリングで分岐できます。

```ts
const detectPersona = (page: string, message: string) => {
  let designerScore = 0
  let engineerScore = 0

  // ページシグナル (+2)
  if (page.includes('DesignTokens')) designerScore += 2
  if (page.includes('Components')) engineerScore += 2

  // 語彙シグナル (+1 / match)
  const designerWords = ['figma', 'デザイン', '色', 'トークン']
  const engineerWords = ['props', 'type', 'import', 'API']
  designerWords.forEach((w) => message.includes(w) && designerScore++)
  engineerWords.forEach((w) => message.includes(w) && engineerScore++)

  if (designerScore >= 2 && designerScore > engineerScore) return 'designer'
  if (engineerScore >= 2) return 'engineer'
  return 'unknown'
}
```

システムプロンプトに `ペルソナ: designer` のような 1 行を足すだけで回答のトーンが変わります。

## Step 7: 設定永続化（localStorage）

```ts
// useChatConfig.ts
const CONFIG_KEY = 'kaze-chat-config'

const useChatConfig = () => {
  const [config, setConfig] = useState(() => {
    const raw = localStorage.getItem(CONFIG_KEY)
    return raw ? JSON.parse(raw) : { apiKey: '', model: 'gpt-4o-mini', uiMode: 'widget' }
  })

  const update = (patch) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch }
      localStorage.setItem(CONFIG_KEY, JSON.stringify(next))
      return next
    })
  }

  return { config, update }
}
```

ビルド時のデフォルト (`import.meta.env.VITE_OPENAI_API_KEY`) とユーザー入力を階層化すると、**「開発者はデフォで動く、本番はユーザー入力」** の両立ができます。

## Step 8: キーボードショートカット（IME 対応）

日本語入力対応で最重要なのが **`isComposing` チェック** です。これが無いと変換確定の Enter で送信されます。

```ts
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.nativeEvent.isComposing) return // IME 変換中は無視

  const isMac = navigator.userAgent.includes('Mac')
  const modifier = isMac ? e.metaKey : e.ctrlKey

  if (modifier && e.key === 'Enter') {
    e.preventDefault()
    sendMessage()
  }
}
```

## ハマりポイントまとめ

| 症状 | 原因 | 対策 |
|------|------|------|
| Docs タブに FAB が 2 個 | Decorator が docs でも動く | `viewMode !== 'docs'` で除外 |
| Controls で入力が消える | args が依存配列に入っている | `useRef` 経由で渡す |
| ChatSupport 自身の Story で二重表示 | Decorator + Story 内の両方で描画 | `disableDecoratorChat` パラメータ |
| IME 確定 Enter で誤送信 | `isComposing` 未チェック | `e.nativeEvent.isComposing` を判定 |
| Gemini のレスポンスがパースできない | response 形式が 3 種類ある | `extractContent` で正規化 |
| Embedding コスト高 | 1536 次元をフルで使っている | `dimensions: 512` で短縮 |

## まとめ

Storybook に AI チャットを組み込む上で効くポイントを再掲します。

1. **Decorator 注入 + `viewMode` チェック + `useRef` で args を渡す** — これだけで文脈認識チャットの土台は完成
2. **OpenAI 互換エンドポイントで Gemini も Bearer 統一** — 分岐はほぼ 1 行
3. **3 層フォールバック (Embedding → FAQ → Suggestions)** — オフラインでも動く
4. **Embedding は 512 次元で十分** — コスト最適化
5. **IME 対応 + ペルソナ検出** — 日本語 UX と回答品質を両立

「Storybook でカタログ化したコンポーネント群に、コンテキスト付き AI サポートを常駐させる」という体験は、ドキュメントを書くより早く、回答精度も高い。ぜひ試してみてください。

:::message
実装例リポジトリは別記事で紹介予定です。AI SDK v6 にフル移行した実装も公開予定。
:::
