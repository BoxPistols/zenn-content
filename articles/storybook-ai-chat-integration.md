---
title: "Storybook に AI チャットを常駐させる — ページ文脈認識とハイブリッド検索の実装"
emoji: "💬"
type: "tech"
topics: ["storybook", "ai", "openai", "gemini", "frontend"]
published: false
---

## はじめに

Storybook は UI カタログとして優秀ですが、「このコンポーネントってどう使うの？」という質問は Slack や別のドキュメントに散っていきます。カタログの隣に答えが無いからです。

そこで、Storybook の全ストーリーに AI チャットを常駐させ、いま見ている Story の文脈を持った状態で答えさせる仕組みを作りました。本記事はその実装ノウハウをまとめたものです。

実装は筆者のデザインシステム `kaze-ux` で稼働中のもので、記事中のコードと数値はすべて実コードから起こしています。

:::message
検証環境: Storybook 10.5 / React 18 / TypeScript strict / AI SDK v6 (`ai` + `@ai-sdk/openai` + `@ai-sdk/google`)。
確認したのはこの構成だけです。Decorator の書き方自体は以前の Storybook でも大きくは変わらないはずですが、筆者は検証していません。
:::

## ゴール

- どの Story を開いていても、右下の FAB からチャットが開く
- AI は「いま開いている Story が何か」を知っている
- API キーが無くても FAQ ベースで動く（壊れない）
- OpenAI / Gemini の両方に対応する

体験としては、こういう会話が成立する状態を目指します。

```
（Design Tokens / Spacing のページを開いた状態で）

Q: この画面なに？
A: **Design Tokens/Spacing** > Default

   スペーシング基準値。MUIの4px単位。

   - MUI: theme.spacing(1)=4px → sx={{ p: 2 }} = 8px
   - Tailwind: p-1=4px, p-2=8px（MUIと同じ基準）
   - デフォルトspacingFactor: 4（MUI標準）
   - 余白責任: margin=親が制御 / padding=自コンポーネントが制御

   **参考:**
   - https://mui.com/material-ui/customization/spacing/
```

「この画面」で通じるのがポイントです。ユーザーは何のページを見ているかを説明する必要がありません。

この 1 つ目の回答は、API キーが未設定でバックエンドにも繋がっていないとき（＝ローカル開発でキーを入れていないとき）は AI を呼ばずに返ります。あらかじめ書いておいたページ解説をそのまま出しているだけです。キーがある場合やバックエンド経由の場合は同じ質問も AI に送られ、Story の文脈はシステムプロンプト側で効きます（後述）。

## アーキテクチャ

```
.storybook/preview.tsx
  └─ Decorator が全 Story に <ChatSupport currentStory={...} /> を注入
        │
        ▼
  ChatSupport（UI）
        │
   useChatMessage（送信・文脈生成・フォールバック）
        │
   ┌────┴─────┬──────────────┐
   ▼          ▼              ▼
 callAI    semanticSearch   findFaqAnswer
 AI SDK    Embedding 512次元  同義語展開 + Fuse.js
 v6        （キーがある時）    （オフラインで動く）
```

肝は 2 つです。**Decorator で Story の文脈を渡すこと**と、**AI が使えない時に無反応にならないこと**。

## Step 1: ファイル構成

最初から分割しておくのが正解です。筆者の `ChatSupport.tsx` は初回コミット時点で既に 2,973 行あり、1,831 行まで削った状態で hooks と components に分割して 273 行まで落としました（その後の機能追加で現在は 394 行）。

```
ChatSupport/
├── ChatSupport.tsx           レイアウトだけを持つコンテナ
├── chatSupportTypes.ts       型定義
├── chatSupportConstants.ts   システムプロンプト / モデル / ショートカット定義
├── chatAiService.ts          AI 呼び出し（AI SDK v6）
├── faqDatabase.ts            FAQ + 同義語展開 + Fuse.js 検索
├── storyGuideMap.ts          Story 別ガイド（ページ文脈の実体）
├── muiKnowledge.ts           MUI 知識ベース
├── embeddingService.ts       Embedding API と VectorIndex
├── embeddingSearch.ts        知識ベースの索引化とセマンティック検索
├── dailyUsageLimit.ts        共有キーの日次上限
├── BookConciergeIcon.tsx     FAB アイコン
├── CodeBlock.tsx             回答内のコード表示
├── useResize.ts              サイドバー幅のリサイズ
├── hooks/
│   ├── useChatState.ts       isOpen / messages / scroll
│   ├── useChatConfig.ts      APIキー / モデル / ショートカット設定
│   ├── useChatMessage.ts     送信・文脈生成・フォールバック
│   └── useChatShortcuts.ts   グローバルキーボード操作
└── components/
    ├── ChatHeader.tsx
    ├── ChatInput.tsx
    ├── ChatMessageList.tsx
    ├── ChatPageContextChip.tsx
    └── ChatSettings.tsx
```

分割の軸は「UI」「状態」「外部 I/O」です。

AI 呼び出しの分岐そのものは `chatAiService.ts` に閉じます。ただし後で見るとおり「バックエンド経由かどうか」は AI の可用性表示や共有枠のカウントにも効くため、判定関数は UI 層・hook 層からも参照されることになります（現在 4 ファイル）。**fetch の切り替えは 1 ファイルで済んでも、その事実を知りたい場所は増える**ということです。

## Step 2: Decorator で全 Story に注入する

本記事のキモです。`.storybook/preview.tsx` の Decorator が `StoryContext` から Story 情報を取り出し、`ChatSupport` に渡します。

```tsx
// .storybook/preview.tsx
// テーマ / Emotion キャッシュのラップは省略。注入位置に関係する部分だけ抜粋
const Decorator = (Story: StoryFn, context: StoryContext) => {
  const storyTitle = context.title
  const storyName = context.name
  const storyDescription = context.parameters?.docs?.description?.component

  // argTypes / args は Controls 操作のたびに新しい参照になるため
  // useMemo の依存配列には入れず、ref 経由で最新値を渡す
  const argTypesRef = useRef(context.argTypes)
  const argsRef = useRef(context.args)
  argTypesRef.current = context.argTypes
  argsRef.current = context.args

  const currentStory = useMemo(
    () => ({
      title: storyTitle,
      name: storyName,
      description: storyDescription,
      argTypes: argTypesRef.current as Record<string, unknown> | undefined,
      args: argsRef.current as Record<string, unknown> | undefined,
    }),
    [storyTitle, storyName, storyDescription]
  )

  const disableDecoratorChat = context.parameters?.disableDecoratorChat === true

  return (
    <ThemeProvider theme={muiTheme}>
      <Story {...context} />
      {context.viewMode !== 'docs' && !disableDecoratorChat && (
        <ChatSupport currentStory={currentStory} />
      )}
    </ThemeProvider>
  )
}

const preview: Preview = { decorators: [Decorator] }
export default preview
```

### ハマりポイント 3 つ

**1. `args` を `useMemo` の依存配列に入れない**

`context.args` は Controls パネルを触るたびに新しいオブジェクト参照になります。依存配列に入れると `currentStory` が作り直され、後段の `storyGuide` メモ化やシステムプロンプト生成が毎回走ります。`useRef` で参照を固定しつつ毎レンダリングで `current` を更新すれば、メモは安定したまま最新値を保持できます。

**2. `viewMode !== 'docs'` を必ず見る**

Docs タブでは各 Story がまとめて描画されるため、これが無いと FAB が Story の数だけ生えます。

**3. `disableDecoratorChat` という逃げ道を用意する**

チャット自身の Story を書くと、Story 内の `<ChatSupport />` と Decorator 側の `<ChatSupport />` が同じ `position: fixed` 座標に重なり、state と localStorage の書き込みが競合します。

```tsx
// ChatSupport.stories.tsx
const meta: Meta<typeof ChatSupport> = {
  parameters: { disableDecoratorChat: true },
}
```

Decorator で何かをグローバル注入する時は、常にこの opt-out をセットで作っておくと後で困りません。

## Step 3: AI 呼び出しは AI SDK v6 に寄せる

ここは筆者が一度やり直した箇所です。

### やめた実装: Gemini の OpenAI 互換エンドポイント

Gemini には OpenAI 互換エンドポイント (`generativelanguage.googleapis.com/v1beta/openai/`) があり、「`Authorization: Bearer` で統一できるので分岐が 1 行で済む」と考えて最初はこれを使っていました。

しかし**エラーレスポンスの形が OpenAI と違い、配列で返ってくるケースがあります**。正常系のパーサだけ書いていると、失敗した時に「エラー内容が読めないまま空文字が返る」という最悪の壊れ方をします。しかもレスポンス形式が OpenAI 標準 / Responses API / Gemini native の 3 系統に分かれ、正規化のための分岐が育っていきました。

### 今の実装: プロバイダ差分は SDK に吸収させる

AI SDK v6 を挟むと、この手の差分はライブラリ側の責務になります。

なお以下のコードが走るのは開発時だけです。本番ビルドでは後述のバックエンドプロキシ経由に固定してあり、AI SDK を呼ぶのはサーバー側になります。**呼ぶ場所が変わるだけで、SDK に寄せるという方針は同じ**です。

```ts
// chatAiService.ts
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText, type ModelMessage } from 'ai'

const resolveModelDirect = (config: ChatSupportConfig) => {
  if (config.model.includes('gemini')) {
    // ネイティブエンドポイントを使う（OpenAI 互換は使わない）
    return createGoogleGenerativeAI({ apiKey: config.apiKey })(config.model)
  }
  return createOpenAI({ apiKey: config.apiKey })(config.model)
}

const callDirect = async (
  config: ChatSupportConfig,
  messagesPayload: { role: string; content: string }[],
  isTest: boolean
): Promise<string> => {
  const result = await generateText({
    model: resolveModelDirect(config),
    messages: toModelMessages(messagesPayload),
    maxOutputTokens: resolveMaxOutputTokens(config.model, { isTest }),
    abortSignal: AbortSignal.timeout(60000),
  })

  if (!result.text && result.finishReason === 'length') {
    return '(回答生成中にトークン上限に達しました。もう少し短い質問で再度お試しください)'
  }
  return result.text
}
```

`gpt-5` 系の `max_tokens` → `max_completion_tokens` 改名や、`temperature` を渡すと 400 で落ちる制約も SDK 側が吸収します。直 fetch で書いていると、モデルを増やすたびにこの手の地雷を自分で踏み直すことになります。

:::message
逆に言うと、**Vanilla JS や直 fetch のプロジェクトにこのコードを引き写しても動きません**。SDK が吸収している差分を自前で書く必要があります。
:::

### AI SDK を入れた瞬間に `storybook dev` が起動しなくなる

Storybook 10 + Vite の環境に `ai` を入れると、**dev サーバーが数千件のエラーで起動に失敗します**。ビルド (`build-storybook`) は通るのに dev だけ死ぬ、という非対称な壊れ方をするので原因に辿り着きにくいです。

`ai@6` は `@ai-sdk/gateway` を依存に持っており、これが分割代入（destructuring）を含んでいます。一方 Storybook は esbuild の `supported` に降格指定を注入するため、依存の事前バンドル時に分割代入が変換対象になって壊れます。

`viteFinal` で target を上げると直ります。**設定を丸ごと置き換えず `mergeConfig` を使ってください。**スプレッドで返すと Storybook が組み立てた `build` / `optimizeDeps` を破棄することになり、別の壊れ方をします。

```js
// .storybook/main.cjs
const { mergeConfig } = require('vite')

async viteFinal(config, { configType }) {
  return mergeConfig(config, {
    // 本番ビルド側
    build: { target: 'esnext' },
    // dev サーバーの依存事前バンドル側。build.target は dev に効かないので両方要る
    optimizeDeps: {
      esbuildOptions: {
        target: 'esnext',
        supported: { destructuring: true },
      },
    },
  })
}
```

`build.target` だけ直して満足しがちですが、**dev の依存事前バンドルを担うのは `optimizeDeps` 側の esbuild なので、同じ手当てを両方に入れる**必要があります。

## Step 4: Gemini 2.5 の reasoning token で本文が消える

これが一番ハマったので独立した節にします。

**Gemini 2.5 系（Flash / Pro）は思考トークンを `maxOutputTokens` から消費します**。しかもその消費はユーザーからは見えません。結果、`maxOutputTokens: 4000` のつもりでも思考に食われて本文が 0 トークンになり、`finishReason: 'length'` で空文字が返ります。

「なぜか Gemini だけ空の返事をする」という症状で、レスポンスにもエラーは出ません。

対策は上限にバッファを足すことです。

```ts
// lib/maxOutputTokens.ts
// Gemini 2.5 系は reasoning tokens を maxOutputTokens から消費する。
// 消費分は応答に現れないため、加算しないと finishReason='length' で本文が空になる
export const GEMINI_REASONING_BUFFER = 1200

export const resolveMaxOutputTokens = (
  model: string,
  options: { requested?: number; isTest?: boolean } = {}
): number => {
  const { requested, isTest = false } = options
  const buffer = model.includes('gemini-2.5') ? GEMINI_REASONING_BUFFER : 0

  if (isTest) {
    // 疎通確認でも、Gemini 2.5 は buffer + 最低出力 10 を確保しないと空になる
    return buffer > 0 ? buffer + 10 : 50
  }
  // 呼び出し側が算出済みの値（buffer 加算済み）はそのまま返す。二重加算しない
  if (typeof requested === 'number' && requested > 0 && requested <= 32000) {
    return requested
  }
  if (model.includes('nano') || model.includes('luna')) return 4000 + buffer
  if (model.includes('gpt-5') || model.includes('o1') || model.includes('o3')) {
    return 16000 + buffer
  }
  return 4000 + buffer
}
```

テスト環境で `maxOutputTokens: 50` のような小さい値を使っている場合も同じ穴にはまります。**「疎通確認のテストだから小さくていい」と思って詰めた値が、Gemini でだけ必ず空を返す**という形で出ます。

### この関数を 2 箇所に書くと、片方だけ静かに壊れる

ブラウザから直接モデルを叩く経路とバックエンド経由の経路があると、この計算が両側に必要になります。筆者は最初それぞれのファイルに同じ関数を書き、**サーバー側にだけ Gemini の buffer 分岐を入れ忘れました**。

厄介なのは、この状態でも**普段は動く**ことです。ブラウザ側が算出済みの `maxOutputTokens` をリクエストに載せて送るので、サーバーはその値をそのまま使います。バグが顔を出すのは、その値が届かない経路（別クライアント、範囲外の値でフォールバックしたとき）だけ。エラーは出ず、ただ Gemini の返事が空になります。

対処は共有モジュールに 1 本化することですが、**単一ソースにしただけでは再発を防げません**。分岐を消しても壊れたことが分かるテストを併せて置きます。

```ts
it('Gemini 2.5 は buffer 分だけ他モデルより大きい', () => {
  const gemini = resolveMaxOutputTokens('gemini-2.5-flash')
  const other = resolveMaxOutputTokens('gemini-2.0-flash')
  expect(gemini - other).toBe(GEMINI_REASONING_BUFFER)
})
```

書いたら**一度わざと分岐を外して赤くなることを確認**してください。緑のまま通るテストは、何も守っていません。

## Step 5: ページ文脈認識（Story → システムプロンプト）

`currentStory.title` からページ固有のガイドを引き、システムプロンプトに差し込みます。

文脈の実体は `storyGuideMap.ts` です。Story のタイトルをキーに、要約・実装参照・関連リンクを持たせます。

```ts
export interface StoryGuideEntry {
  summary: string // ページの要約（1-2文）
  codeContext: string[] // 実装の具体情報（参照先ファイル、実際の値）
  references?: string[] // MUI 公式ドキュメント等の URL
  related?: string[] // 関連する Storybook ページ
}

export const STORY_GUIDE_MAP: Record<string, StoryGuideEntry> = {
  'Guide/Introduction': {
    summary:
      'デザインシステムの入口。Storybookの基本操作とプロジェクト概要を説明する。',
    codeContext: [
      'テーマ定義: src/themes/theme.ts（lightTheme / darkTheme）',
      'Storybook設定: .storybook/preview.tsx でテーマ切替・デコレータ定義',
      'ツールバーの Theme ボタンで Light/Dark 切替可能',
    ],
    related: ['Guide/How to Use', 'Guide/For Designers'],
  },
  // ...
}

// 完全一致 → 前方一致の順で引く（Story 名のバリエーションを吸収する）
export const findStoryGuide = (storyTitle: string): StoryGuideEntry | null => {
  if (STORY_GUIDE_MAP[storyTitle]) return STORY_GUIDE_MAP[storyTitle]
  for (const [key, entry] of Object.entries(STORY_GUIDE_MAP)) {
    if (storyTitle.startsWith(key)) return entry
  }
  return null
}
```

これをシステムプロンプトに合成します。

```ts
const contextualPrompt = useMemo(() => {
  if (!currentStory) return SYSTEM_PROMPT
  const parts = [SYSTEM_PROMPT]
  parts.push(
    `\n\n## 現在のページ情報\nユーザーは現在「${currentStory.title}」の「${currentStory.name}」ストーリーを見ています。`
  )
  if (currentStory.description) parts.push(`ページ説明: ${currentStory.description}`)
  if (storyGuide) {
    parts.push(`概要: ${storyGuide.summary}`)
    parts.push(
      `実装コンテキスト:\n${storyGuide.codeContext.map((c) => `- ${c}`).join('\n')}`
    )
    if (storyGuide.references?.length) {
      parts.push(`参考リンク:\n${storyGuide.references.map((r) => `- ${r}`).join('\n')}`)
    }
    if (storyGuide.related?.length) {
      parts.push(`関連ページ: ${storyGuide.related.join(', ')}`)
    }
  }
  parts.push(
    'ユーザーが「この画面」「今見てるページ」等と言った場合、上記コンテキストを基に具体的に回答してください。参考リンクがあれば回答に含めてください。'
  )
  return parts.join('\n')
}, [currentStory, storyGuide])
```

ポイントは、**汎用的な説明ではなくプロジェクト固有の情報を `codeContext` に入れること**です。「MUI のテーマとは」を LLM に語らせても価値はありませんが、「このプロジェクトのテーマ定義は `src/themes/theme.ts`」は LLM が絶対に知り得ない情報なので、ここに書いた分だけ回答が具体的になります。

なお、キーが無い時にオフラインで即答するための短絡路も持っています。

```ts
const isPageContextQuery = (q: string): boolean => {
  const keywords = [
    'この画面', 'このページ', '今見てる', '今見ている', '今のページ',
    '今の画面', '何のページ', '何を見て', 'ここは何', 'ここって何',
    'ここは', 'what is this', 'what page',
  ]
  return keywords.some((kw) => q.toLowerCase().includes(kw))
}
```

「この画面なに？」を AI を呼ばずに `storyGuideMap` から組み立てて返します。最も頻度の高い質問がゼロコスト・ゼロレイテンシで返るのは体験として大きいです。

ただし**この短絡路が働くのは、ブラウザから AI を直接呼ぶモードのときだけ**です。バックエンド経由に切り替えると、キーが無くてもサーバーへ送れてしまうので、こちらには落ちてきません（後述）。

キーワードの粒度にも注意が要ります。`'ここは'` が入っているので「ここはどう実装するの？」もページ文脈クエリとして扱われます。広く拾って早く返す設計なので、これは意図した挙動ですが、追加するキーワードは短くしすぎないほうがよいです。

## Step 6: ハイブリッド検索（Embedding + FAQ）

### Embedding セマンティック検索

`text-embedding-3-small` を **512 次元に短縮**して使います。デフォルトは 1536 次元ですが、この用途（数十〜数百件の FAQ 検索）では 512 で精度は落ちません。

```ts
const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 512

export const fetchEmbeddings = async (
  apiKey: string,
  texts: string[]
): Promise<number[][]> => {
  if (texts.length === 0) return []
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: texts,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
      signal: controller.signal,
    })
    if (!response.ok) {
      /* エラー本文から message を取り出して throw */
    }

    const data = await response.json()
    // API は index 順に返すとは限らないため必ずソートする
    return [...data.data].sort((a, b) => a.index - b.index).map((d) => d.embedding)
  } finally {
    clearTimeout(timeoutId)
  }
}
```

:::message alert
`data` を返ってきた順に使ってはいけません。**バッチ入力の embedding は入力順で返る保証がなく**、ずれると「ボタンの質問にスペーシングの FAQ が当たる」という、エラーにならない壊れ方をします。`index` でソートしてください。
:::

### インメモリ VectorIndex

数百件規模ならベクトル DB は要りません。配列とコサイン類似度で十分です。

```ts
export class VectorIndex {
  private vectors: EmbeddingVector[] = []
  private initialized = false
  private initializing: Promise<void> | null = null

  async build(apiKey: string, entries: IndexEntry[]): Promise<void> {
    // 二重ビルド防止: 進行中のビルドがあれば待つだけにする
    if (this.initializing) {
      await this.initializing
      return
    }
    this.initializing = (async () => {
      try {
        const batchSize = 100 // レート制限対策
        const allVectors: number[][] = []
        for (let i = 0; i < entries.length; i += batchSize) {
          const batch = entries.slice(i, i + batchSize).map((e) => e.text)
          allVectors.push(...(await fetchEmbeddings(apiKey, batch)))
        }
        this.vectors = entries.map((e, idx) => ({ ...e, vector: allVectors[idx] }))
        this.initialized = true
      } finally {
        this.initializing = null
      }
    })()
    await this.initializing
  }

  search(queryVector: number[], topK = 5, threshold = 0.3): SemanticSearchResult[] {
    if (!this.initialized) return []
    return this.vectors
      // ...v で広げない。512 要素のベクトルが戻り値に混ざる
      .map((v) => ({
        id: v.id,
        score: cosineSimilarity(queryVector, v.vector),
        text: v.text,
        category: v.category,
        sourceKey: v.sourceKey,
      }))
      .filter((s) => s.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
  }
}
```

この `initializing` は、**同じインスタンスに `build()` を 2 回投げた場合しか防げません**。呼び出し口が毎回 `new VectorIndex()` してから build する作りだと、並行して初期化が走ったときに別インスタンスが 2 つでき、guard を共有しないので素通りします。同じ知識ベースを 2 回 embedding すれば、そのまま 2 回課金されます。

筆者の実装がまさにこれで、guard が実際に発火するのは「同一インスタンスに 2 回投げる」ユニットテストの中だけでした。**テストは通るが本番の経路を再現していない**という型です。StrictMode の二重実行まで塞ぐなら、モジュールレベルで進行中の Promise を持つ必要があります。

```ts
// 構築中の Promise。同時呼び出しを 1 回の構築に合流させる
let buildPromise: Promise<void> | null = null

export const initEmbeddingIndex = async (apiKey: string): Promise<void> => {
  if (globalIndex?.isReady()) return
  // isReady() は build 完了後に true になるので、これだけでは構築中の
  // 二重呼び出しを止められない
  if (buildPromise) return buildPromise

  buildPromise = (async () => {
    /* 既存の構築処理 */
  })()

  try {
    await buildPromise
  } finally {
    // 失敗時は次の呼び出しで再構築できるよう必ず解放する
    buildPromise = null
  }
}
```

`finally` での解放を忘れると、**一度失敗したら以後永久に再構築できなくなります**。ここも「同時に呼んでも API 呼び出しは 1 回分」「失敗後に再試行できる」の 2 本をテストにして、合流を外すと落ちることを確認しておくのが確実です。

索引化する知識ベースは 3 系統です。

| カテゴリ       | ソース            | 内容                            |
| -------------- | ----------------- | ------------------------------- |
| `faq`          | `faqDatabase.ts`  | タイトル + キーワード + 回答冒頭 |
| `storyGuide`   | `storyGuideMap.ts`| ページ要約 + 実装コンテキスト    |
| `muiKnowledge` | `muiKnowledge.ts` | MUI コンポーネント別リファレンス |

検索結果はそのまま返さず、システムプロンプトに追記する形で使います。

```ts
export const buildSemanticContext = (results: SemanticSearchResult[]): string => {
  if (results.length === 0) return ''
  const sections = results.map(
    // labelOf は説明用。実装では map 内のインライン三項で faq / storyGuide /
    // muiKnowledge を「FAQ」「ページガイド」「MUIリファレンス」に振り分けている
    (r) => `### ${labelOf(r.category)} (関連度: ${(r.score * 100).toFixed(0)}%)\n${r.text}`
  )
  return `\n## セマンティック検索結果（以下の情報を参考に回答すること）\n${sections.join('\n\n')}`
}
```

### FAQ 検索（キーなしでも動く層）

Embedding は API キーが要ります。キーが無い時のために、決定的なキーワード検索と Fuse.js のファジー検索を重ねます。

なお索引を構築するのは、**利用者が自分のキーを設定したときだけ**です（`config.apiKey === DEFAULT_API_KEY` なら早期 return）。共有キーやバックエンド経由の既定状態では索引を作らないので、セマンティック検索層は動かず、文脈補強は Step 5 の `contextualPrompt` だけになります。**共有ビルドを開いた人が実際に触るのはこの状態**なので、ここを勘違いすると「動いているはず」の機能が動いていないことになります。

```ts
export const findFaqAnswer = (query: string): string | null => {
  if (!query.trim()) return null

  // Step 1: 同義語展開 → キーワードスコアリング（高速・決定的）
  const q = expandSynonyms(query).toLowerCase()
  let best: { score: number; answer: string } | null = null
  for (const faq of FAQ_DATABASE) {
    let score = 0
    for (const kw of faq.keywords) {
      if (q.includes(kw.toLowerCase())) score += kw.length // 長いキーワードほど強い
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { score, answer: faq.answer }
    }
  }
  if (best && best.score >= 3) return best.answer

  // Step 2: Fuse.js ファジーマッチ（表記ゆれ・タイプミス救済）
  const results = getFuse().search(query)
  if (results.length > 0 && results[0].score !== undefined && results[0].score < 0.45) {
    return results[0].item.answer
  }

  // Step 3: 低スコアでもキーワードマッチがあればそれを返す
  return best?.answer ?? null
}
```

Fuse.js の設定はこうしています。

```ts
new Fuse(FAQ_DATABASE, {
  keys: [
    { name: 'keywords', weight: 2 },
    { name: 'title', weight: 1.5 },
    { name: 'answer', weight: 0.5 },
  ],
  threshold: 0.6, // 広めに拾い、スコアで足切りする
  ignoreLocation: true,
  includeScore: true,
})
```

`threshold: 0.6` で広めに候補を取り、`includeScore` の実値 `< 0.45` で足切りする二段構えです。Fuse のスコアは 0 に近いほど良いので、閾値の向きを間違えると全件マッチします。

同義語展開はヒット率に効きます。日本語は同じ概念に語彙が多いので、これが無いと「余白」で聞かれた時に `spacing` の FAQ に当たりません。

```ts
const SYNONYM_MAP: Record<string, string[]> = {
  余白: ['スペーシング', 'spacing', 'gap', 'margin', 'padding'],
  色: ['カラー', 'color', 'パレット'],
  角丸: ['borderRadius', 'border-radius', 'radius'],
  影: ['elevation', 'shadow', 'シャドウ'],
  // ...
}
```

## Step 7: 壊れない設計（キーが無い / 上限に達した時）

社内ツールとして配るなら、ここが一番大事です。**「送信しても何も起きない」を絶対に作らない**。

```ts
const handleSend = async (inputMessage: string, clearInput: () => void) => {
  // ...ユーザーメッセージを積む

  if (!config.apiKey) {
    respondWithFaq(userText) // キーが無ければ FAQ で答える
    return
  }
  if (blockedByDailyLimit(userText)) return // 上限なら案内 + FAQ を 1 通で返す

  // API を呼ぶ直前に数える。成功時だけ数えると、
  // 失敗が返り続ける状況で上限が効かずコスト抑制の目的を果たせない
  if (isUsingDefaultKey(config.apiKey, DEFAULT_API_KEY)) consumeUse()

  setIsTyping(true)
  try {
    let enrichedPrompt = contextualPrompt
    const embeddingResults = await semanticSearch(config.apiKey, userText)
    if (embeddingResults.length > 0) {
      enrichedPrompt += buildSemanticContext(embeddingResults)
    }
    const data = await callAI(config, [
      { role: 'system', content: enrichedPrompt },
      ...history,
      { role: 'user', content: userText },
    ])
    addBotMessage(extractContent(data))
  } catch (error) {
    // AI が落ちても FAQ で答える。エラーは併記して黙らない
    const semantic = await semanticSearch(config.apiKey, userText).catch(() => [])
    const faqAnswer = findSemanticFaqAnswer(semantic) ?? findFaqAnswer(userText)
    addBotMessage(
      faqAnswer
        ? `*AI接続エラー: ${errMsg}*\n\n---\n\nFAQから回答します:\n\n${trimFaqAnswer(faqAnswer)}`
        : `エラー: ${errMsg}`
    )
  } finally {
    setIsTyping(false)
  }
}
```

`consumeUse()` を **API 呼び出しの前**に置いているのが要点です。成功時だけカウントすると、エラーが返り続ける状況で無限に呼べてしまい、コスト上限という目的を果たしません。

### 共有キーを配るならバックエンドプロキシへ

ブラウザから直接叩く構成は、API キーがバンドルに乗ります。自分専用なら問題ありませんが、共有するなら間に自前のエンドポイントを挟みます。

ここで**切り替えを環境変数だけで判定してはいけません**。筆者は最初そうしていて、痛い目を見ました（次節）。

```ts
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || ''

// 本番ビルドは常にバックエンド経由。VITE_API_BASE の設定漏れ 1 回で
// AI が無言で止まる形にしない（同一オリジン配信なので fetch は相対 /api/ai）
export const resolveBackendMode = (apiBase: string, isProd: boolean): boolean =>
  apiBase.length > 0 || isProd

export const isBackendMode = (): boolean =>
  resolveBackendMode(API_BASE, import.meta.env.PROD === true)

export const callAI = async (config, messagesPayload, isTest = false) => {
  // 実際は全体が try/catch で包まれ、構造化エラーはそのまま再スローする
  if (isBackendMode()) return await callViaBackend(config, messagesPayload, isTest)
  return await callDirect(config, messagesPayload, isTest)
}
```

`VITE_API_BASE` は「別オリジンのバックエンドへ向けたいとき」だけの逃げ道として残し、既定の判定材料にはしません。判定を `(apiBase, isProd)` の純関数に切り出してあるのは、`import.meta.env` に触れずにテストするためです。

サーバー側のエラーは HTTP ステータスのままだと UI で分岐できないので、型にして投げ直します。

```ts
export class AIQuotaError extends Error {
  constructor(
    public readonly remaining: number,
    public readonly limit: number,
    public readonly reset: number
  ) {
    super(`本日の無料枠 (${limit}回) を使い切りました。明日リセットされます。設定から自前APIキーを入力すると無制限利用できます。`)
    this.name = 'AIQuotaError'
  }
}

export class AIUserKeyRequiredError extends Error {
  constructor() {
    super('このモデルは自分のAPIキーが必要です。設定からキーを入力してください。')
    this.name = 'AIUserKeyRequiredError'
  }
}
```

- `429` → `AIQuotaError`（残数と復帰時刻を持たせ、UI で自前キー入力の導線を出す）
- `403` かつ `code === 'USER_KEY_REQUIRED'` → `AIUserKeyRequiredError`
- 自前キーは `X-User-API-Key` ヘッダーで送り、サーバー側でレート制限を免除する

「使えないモデルを選べてしまい、長文を書き終えた送信時に初めて弾かれる」のが最悪の体験なので、モデル選択の時点で `requiresUserKey` を見て弾き、保存済み設定の読み込み時にもリセットをかけます。

```ts
// chatSupportConstants.ts の loadChatConfig()（抜粋）
const saved = localStorage.getItem(CONFIG_STORAGE_KEY)
const config = normalizeChatConfig(JSON.parse(saved))
// デフォルトAPIキー使用時、requiresUserKey なモデルが選択されていたらリセット
const isDefaultKey = !config.apiKey || config.apiKey === DEFAULT_API_KEY
if (isDefaultKey) {
  const allModels = [...OPENAI_MODELS, ...GEMINI_MODELS]
  const selectedModel = allModels.find((m) => m.value === config.model)
  if (selectedModel?.requiresUserKey) config.model = DEFAULT_MODEL
}
```

現時点でどのモデルにも `requiresUserKey` は立てていないので、この分岐は実際には通りません。それでも残しているのは、サーバー側の同じ判定と対になる契約だからです。

## 「鍵をブラウザに置かない」を入れた瞬間、下流が全部ずれる

ここからは、共有ビルドで実際に起きたことです。**公開した Storybook で、AI が一度も動いていませんでした。**しかもエラーは出ません。送信しても FAQ が返るだけなので、動いていないことに気づけない壊れ方でした。

原因は 1 つではなく、独立した 3 つが重なっていました。

### 原因 1: `define` した値はバンドルに平文で残る

キーをブラウザに配る構成をやめる直接のきっかけは、これが事故になったからです。

```js
// .storybook/main.cjs
define: {
  'import.meta.env.VITE_OPENAI_API_KEY': JSON.stringify(
    freshEnv.VITE_OPENAI_API_KEY || ''
  ),
}
```

Vite の `define` は「環境変数を渡す」のではなく、**ソース中の文字列を置換する**機能です。置換された値はビルド成果物にそのまま残るため、配信した時点で無認証の GET で誰でも取得できます。リポジトリが非公開でも関係ありません。

しかも**手元では気づけません**。ローカルには値が無いので同じ位置が空文字になり、ソースを grep しても、git 履歴を漁っても、ローカルのビルド成果物を走査しても、何も出てきません。キーは一度もコミットされないので、シークレット検出の CI も通ります。

対策は、環境変数の設定漏れに頼らないことです。

```js
'import.meta.env.VITE_OPENAI_API_KEY': JSON.stringify(
  configType === 'PRODUCTION' ? '' : freshEnv.VITE_OPENAI_API_KEY || ''
),
```

ビルド種別で機械的に空にすれば、設定を戻しても再発しません。開発時は従来どおり `.env` の値が入るので、体験は変わりません。

### 原因 2: 環境変数で経路を切り替えていた

原因 1 のガードを入れた時点で、**ブラウザにキーが無いのが正常な状態**になります。ならば本番でブラウザから AI を呼ぶ経路は、存在しないほうが安全です。

しかし当時の判定は `VITE_API_BASE` の有無だけでした。この環境変数を本番に設定し忘れると、ブラウザ直結モードのまま、キーが空の状態で動きます。結果は「送っても何も起きない」。前述の `resolveBackendMode(apiBase, isProd)` はこれを潰すための形です。

**壊れ方の質が悪い設定は、そもそも設定にしない。** これが教訓でした。

### 原因 3: 「キーがあるか」が「AI が使えるか」の代理になっていた

ここが一番おもしろい部分です。原因 1 と 2 を入れると、`config.apiKey` が空であることの意味が変わります。以前は「AI が使えない」でしたが、いまは「バックエンド経由で使える」です。

その結果、キーの有無を見ていた既存の分岐が**2 箇所とも逆の意味で動きました**。

```ts
// 修正前: バックエンド経由でもここで FAQ に落ちる → 無料枠が一度も動かない
if (!config.apiKey) { respondWithFaq(userText); return }

// 修正後
if (!config.apiKey && !isBackendMode()) { respondWithFaq(userText); return }
```

もう 1 つは回数カウントです。共有枠の使用回数を数える関数が、内部で「既定キーが空でないこと」を要求していました。原因 1 のガードで本番の既定キーは必ず空になるので、**条件は常に false になり、カウントが一度も実行されていませんでした**。上限は設定されているのに、数えていないので効きません。

一般則として言えるのは、**「キーがあるか」は「AI が使えるか」の代理変数でしかない**ということです。供給元が 1 つのうちは代理が成り立ちますが、増えた瞬間に破綻します。判定したい概念そのもの（可用性なのか、共有枠かどうか）を関数名にして、代理変数を直接見る箇所を残さないほうがよいです。

### 上限は二段で持つ

ついでに書いておくと、日次上限はブラウザ側とサーバー側の二段になりました。

- ブラウザ側（localStorage）は**自己申告**です。開発者ツールから消せるので、守りにはなりません。残り回数を表示して、上限に達したら送信前に案内するための UX 層です
- サーバー側（Upstash Redis）が実際の防壁です

片方だけでは成立しません。サーバーだけだと残数を表示できず、ブラウザだけだと守れない。役割が違うものを二重化しているだけで、冗長ではありません。

## Step 8: IME とキーボードショートカット

日本語入力で最重要なのが `isComposing` です。これが無いと変換確定の Enter で送信されます。

**チェックが 2 箇所必要**なのが見落としやすい点です。`document` に張ったグローバルハンドラは `KeyboardEvent` を直接受けますが、React の `onKeyDown` は `SyntheticEvent` なので `nativeEvent` を経由します。

```ts
// グローバルハンドラ（document レベル）
const handler = (e: KeyboardEvent) => {
  if (e.isComposing) return

  const tag = (e.target as HTMLElement)?.tagName
  const isInputFocused =
    tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable

  // 開閉だけは入力欄フォーカス中でも効かせる
  if (isShortcutMatch(e, config.shortcuts.toggleChat)) {
    e.preventDefault()
    setIsOpen((prev) => !prev)
    return
  }
  if (!isOpen) return
  if (isInputFocused) return // 以降は入力中に暴発させない
  // ...閉じる / フォーカス / 設定 / 履歴DL / UI切替 / 履歴クリア
}

// TextField レベル（React の SyntheticEvent）
const handleKeyDown = (e: React.KeyboardEvent, handleSendFn: () => void) => {
  if (e.nativeEvent.isComposing) return
  if (isShortcutMatch(e.nativeEvent, config.shortcuts.sendMessage)) {
    e.preventDefault()
    handleSendFn()
  }
}
```

`isInputFocused` のガードも要ります。これが無いと、入力欄で `Esc` を押しただけでチャットが閉じます（後述のとおり「閉じる」は修飾キー無しの `Esc` なので、入力中に素通しすると必ず暴発します）。修飾キー付きのものも同様で、入力中の `⌘ ⇧ D` が履歴ダウンロードに吸われます。

デフォルトのショートカットは 8 つで、すべて設定パネルから変更でき、localStorage に永続化されます。

| アクション                   | Mac           | Windows          |
| ---------------------------- | ------------- | ---------------- |
| メッセージ送信               | `Enter`       | `Enter`          |
| 入力欄にフォーカス           | `⌘ /`         | `Ctrl /`         |
| チャット開閉                 | `⌘ ⇧ K`       | `Ctrl ⇧ K`       |
| 設定パネル切替               | `⌘ ⇧ X`       | `Ctrl ⇧ X`       |
| 履歴ダウンロード             | `⌘ ⇧ D`       | `Ctrl ⇧ D`       |
| サイドバー / ウィジェット切替 | `⌘ ⇧ L`       | `Ctrl ⇧ L`       |
| 履歴クリア                   | `⌘ ⇧ Delete`  | `Ctrl ⇧ Delete`  |
| チャットを閉じる             | `Esc`         | `Esc`            |

**送信が素の `Enter` である**ことに注目してください。ここが `⌘ Enter` なら IME の確定 Enter とは修飾キーで区別できますが、素の `Enter` では区別できません。前述の `isComposing` チェックが、あれば便利という話ではなく**無いと日本語入力が成立しない**理由がこれです。

Mac / Windows の判定は修飾キーの正規化側に閉じ込め、各ハンドラは `isShortcutMatch(e, binding)` だけを見るようにします。

## ハマりポイントまとめ

| 症状                                   | 原因                                     | 対策                                       |
| -------------------------------------- | ---------------------------------------- | ------------------------------------------ |
| `storybook dev` が数千件のエラーで起動しない | `ai` の依存の destructuring が降格される | `optimizeDeps` と `build` の両方に `esnext` |
| Docs タブに FAB が大量に出る           | Decorator が docs でも動く               | `viewMode !== 'docs'` で除外                |
| Controls を触ると入力中テキストが消える | `args` が `useMemo` 依存配列にある        | `useRef` 経由で渡す                         |
| チャット専用 Story で二重表示・state 競合 | Decorator と Story の両方が描画          | `disableDecoratorChat` パラメータ           |
| IME 確定の Enter で誤送信              | `isComposing` 未チェック                  | グローバルと `nativeEvent` の 2 箇所で判定  |
| 入力中にショートカットが暴発            | 入力欄フォーカスを見ていない              | `isInputFocused` でガード                   |
| Gemini だけ空の返事が返る              | reasoning token が `maxOutputTokens` を食う | `GEMINI_REASONING_BUFFER` を加算            |
| Gemini がバックエンド経由のときだけ空になる | 上限計算をブラウザ側とサーバー側に二重に書き、片方の分岐が欠けた | 共有モジュールに 1 本化し、**分岐を消すと赤くなるテスト**を置く |
| Gemini のエラー内容が読めない          | OpenAI 互換 endpoint のエラーが配列形式   | ネイティブ endpoint を使う（AI SDK 経由）   |
| 質問と無関係な FAQ が当たる            | バッチ embedding の順序を信用している     | `index` でソートしてから使う                |
| Embedding が二重に課金される           | 初期化が並行して走る                      | **モジュールレベル**で進行中 Promise を保持（インスタンス変数では防げない） |
| 本番ビルドで AI が無言で動かない        | 経路の切替を環境変数だけで判定している      | `resolveBackendMode(apiBase, isProd)` で本番は常にバックエンド経由 |
| 共有キーがバンドルに焼き込まれる        | `define` した値は平文で残る                | 本番ビルド（`configType === 'PRODUCTION'`）では機械的に空にする |
| 上限を超えても呼べてしまう             | 成功時だけカウントしている                | API 呼び出しの**前**にカウントする          |

## まだやっていないこと

正直に書いておきます。以下は型と関数だけあって、まだプロンプトに繋がっていません。

**1. `argTypes` / `args` のプロンプト注入**

`CurrentStoryContext` は `argTypes` / `args` を受け取れる型になっていて Decorator からも渡していますが、システムプロンプトを組み立てる側はまだ使っていません。繋げば「このボタンの `variant` は今なに？」に答えられるようになります。

**2. ペルソナ検出**

ページ階層と質問語彙のスコアリングで designer / engineer を推定する `detectPersona()` と、ペルソナ別のプロンプト拡張は実装済みですが、**まだ呼び出し側に接続していません**（テストからしか呼ばれていない状態です）。

```ts
export const detectPersona = (pageTitle: string | undefined, query: string): Persona => {
  let designerScore = 0
  let engineerScore = 0

  // ページカテゴリシグナル (+2)
  if (pageTitle) {
    if (DESIGNER_PAGE_PREFIXES.some((p) => pageTitle.startsWith(p))) designerScore += 2
    if (ENGINEER_PAGE_PREFIXES.some((p) => pageTitle.startsWith(p))) engineerScore += 2
  }
  // 質問語彙シグナル (+1 / match)
  const q = query.toLowerCase()
  for (const w of DESIGNER_VOCABULARY) if (q.includes(w.toLowerCase())) designerScore += 1
  for (const w of ENGINEER_VOCABULARY) if (q.includes(w.toLowerCase())) engineerScore += 1

  if (designerScore > engineerScore && designerScore >= 2) return 'designer'
  if (engineerScore > designerScore && engineerScore >= 2) return 'engineer'
  return 'unknown'
}
```

「実装したのに繋いでいない機能」は、テストが緑なので気づきにくいところです。エクスポートされているだけで誰も呼んでいない関数は、grep で参照元を数えると出てきます。

## 公式の `@storybook/addon-mcp` は何をするものか

ここまで作ってきたのは「Storybook を見ている人が質問できる」チャットでした。一方 Storybook 公式は、AI について**逆向き**のアプローチを出しています。`@storybook/addon-mcp` です。

自作する前に、公式が何を用意しているかを把握しておいた方がいいので、実物を調べた内容をまとめます（本記事執筆時点で `0.7.0`、まだ 1.0 前です）。

### 何をするアドオンか

パッケージの説明はこうです。

> Help agents automatically write and test stories for your UI components
> （UI コンポーネントの Story を、エージェントが自動で書き・テストするのを助ける）
>
> — `@storybook/addon-mcp` の package.json（訳は筆者）

つまり利用者は**人ではなくコーディングエージェント**です。Storybook の開発サーバーに MCP エンドポイント（既定で `/mcp`）を生やし、Claude Code や Cursor のようなエージェントがそこに接続して Storybook の情報を読んだり操作したりできるようにします。

### 導入

`main.ts` の `addons` に足すだけです。

```ts
// .storybook/main.ts
export default {
  addons: [
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-mcp', // ← これ
  ],
}
```

エンドポイントのパスを変えたい場合はオプションで指定します。

```ts
addons: [
  {
    name: '@storybook/addon-mcp',
    options: { endpoint: '/custom-mcp' },
  },
]
```

あとは `storybook dev` を起動して、エージェント側に `http://localhost:6006/mcp` を MCP サーバーとして登録すれば繋がります。

### エージェントに何を見せるか

同梱されているツール群を見ると、狙いがはっきりします。

| ツール | できること |
| --- | --- |
| `get-changed-stories` | 変更された Story を取得する |
| `get-stories-by-component` | コンポーネントから対応する Story を引く |
| `get-storybook-story-instructions` | そのプロジェクトでの Story の書き方をエージェントに教える |
| `run-story-tests` | Story のテストを実行する |
| `preview-stories` | Story をプレビューする |
| `display-review` | レビュー結果を表示する |
| `list-all-documentation` | 登録済みコンポーネントを一覧し、他ツールに渡す ID を返す |
| `get-documentation` | コンポーネントの Story 例と props 定義を返す |
| `get-documentation-for-story` | 特定 Story のドキュメントを返す |

9 つは dev / test / docs の 3 グループに分かれています。下 3 つの docs 系は、実験機能のコンポーネントマニフェストが有効なときだけ登録されるので、既定では出てきません。

`get-storybook-story-instructions` が個人的には一番効くと思っています。「このプロジェクトでの Story の書き方」をエージェントに渡せるということは、**Story の書式がプロジェクトの規約に沿う**ということです。エージェントが書いた Story のレビューで毎回同じ指摘をする、という消耗が減ります。

:::message
`run-story-tests` を使うには `@storybook/addon-vitest` が要ります（peerDependency に入っています）。テスト実行系まで使いたいなら先に Vitest 連携を入れておいてください。
:::

MCP サーバーの実装には `tmcp` と `valibot` が使われています。Storybook が独自プロトコルを作ったわけではなく、素直に MCP 標準に乗っている構成です。

### ChatSupport と競合しないのはなぜか

向いている方向が違います。

| | `@storybook/addon-mcp` | 本記事の ChatSupport |
| --- | --- | --- |
| 利用者 | コーディングエージェント | Storybook を見ている人 |
| 動く場所 | エディタ / CLI 側 | Storybook の画面の中 |
| 目的 | Story を書く・テストする | いま見ている UI について聞く |
| 知識の向き | Storybook を**読み出す** | Storybook に**知識を持ち込む** |
| 必要なもの | MCP 対応エージェント | ブラウザだけ |

決定的な差は最後の行です。addon-mcp が助けるのは、既にエージェントを使いこなしている開発者です。一方 ChatSupport が助けたいのは、**Storybook を見に来たデザイナーやディレクター**、つまり MCP クライアントを持っていない人たちです。デザインシステムの利用者は開発者だけではないので、ここは埋まっていません。

なので両方入れて競合しません。実際 `kaze-ux` では両方を有効にしています。

「エージェントが Storybook を読む」（公式）と「Storybook を見ている人が聞ける」（本記事）は、同じデザインシステムに対する別方向の入口です。

## まとめ

1. **Decorator 注入 + `viewMode` チェック + `useRef` で args を渡す** — 文脈認識チャットの土台はこれで完成する
2. **プロバイダ差分は AI SDK v6 に吸収させる** — Gemini は OpenAI 互換ではなくネイティブ endpoint を使う
3. **Gemini 2.5 には reasoning 用のバッファを足す** — 足りないと本文が黙って空になる
4. **Embedding は 512 次元で十分、順序は `index` でソートする**
5. **キーが無い・上限に達した時も必ず何か返す** — 無反応は最悪の体験
6. **`isComposing` はグローバルと `nativeEvent` の 2 箇所で見る**

文脈を渡す部分は Storybook 固有ではありません。ドキュメントビューアでも管理画面でも、「いまユーザーが見ているものは何か」を構造化して渡せる場所があれば、同じ設計がそのまま使えます。

なお現状の実装は、プロジェクト固有の知識ベース（MUI リファレンス・自社 FAQ・テーマ定義）と UI ライブラリの両方に密結合しています。切り出すなら、知識ベースを注入可能にすることと、UI から MUI 依存を外すことの 2 つが要ります。着手したところなので、形になったら別記事にします。
