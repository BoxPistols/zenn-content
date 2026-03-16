---
title: "無料のフロントエンド実践教材「Dev Album」を公開した"
emoji: "📘"
type: "idea"
topics: ["react", "nextjs", "threejs", "frontend"]
published: false
---

## 概要

**Dev Album** は、React・Git・Three.js・Claude Code の 4 領域をカバーする Web ベースの学習教材である。

https://dev-album.vercel.app

![Dev Album トップページ](スクショURL_1)

無料・アカウント不要。ブラウザのみで利用可能。

---

## 背景と動機

既存のフロントエンド教材には以下の課題がある。

- **領域の分断**: 「React 入門」「Git 入門」は個別に存在するが、横断的に結びつける教材が少ない
- **デザイナー向け導線の不足**: Storybook や アクセシビリティを、デザイナーの視点から解説する教材がほぼない
- **静的なコード表示**: コードを読むだけで、実行結果を即座に確認できる仕組みがない

Dev Album はこれらの課題に対して、4 領域の統合・視覚的なライブプレビュー・デザイナー参加型のコンテンツ設計で対応する。

---

## 収録内容

### Git / GitHub 入門

Git の基本操作、ブランチ戦略、GitHub PR 運用、AI エージェント連携を扱う。ターミナル操作未経験者を想定し、環境構築から解説している。

### React / TypeScript / Next.js 入門

最も大きなセクション。以下のトピックを含む。

- React 19 + TypeScript の基礎から応用
- Next.js 15 App Router / Server Components / PPR
- CSS Modules / Tailwind / MUI / styled-components
- Storybook（Figma 連携・Chromatic）
- Flexbox / CSS Grid
- Dialog・Snackbar・Form の設計パターン
- セマンティック HTML・ARIA・Table 設計
- ダークパターン回避と技術倫理

### Three.js / React Three Fiber 入門

シーン構築、マテリアル、ライティング、アニメーション、React Three Fiber + drei、飛行シミュレーション開発を扱う。

### Claude Code & tmux ガイド

Claude Code CLI、MCP サーバー、tmux マルチセッション管理、Hooks、GitHub Actions、ヘッドレスモードを扱う。

---

## 学習機能

### ライブコードエディタ

左ペインにコードエディタ、右ペインにリアルタイムプレビューを配置している。Sucrase によるブラウザ内 JSX トランスパイルで、環境構築なしにコードの実行結果を確認できる。

![コードエディタとプレビューの左右分割](スクショURL_2)

エディタは prism-react-renderer によるシンタックスハイライト付き。

### 3D プレビュー

Three.js セクションでも同様の左右分割レイアウトを採用。コードの横で 3D シーンをドラッグ回転・ズームできる。

![Three.js の3Dプレビュー](スクショURL_3)

### コーディングチャレンジ

各ステップにチャレンジ問題を配置している。段階的ヒント、模範解答の表示、キーワードベースの判定機能を持つ。

![コーディングチャレンジ](スクショURL_4)

### クイズ・FAQ

選択式クイズと FAQ を各ステップに配置し、知識の確認とつまずきポイントの解消に対応している。

---

## デザイナー向けコンテンツ

### Storybook セクション

Figma ユーザーのメンタルモデルを起点に、以下をライブプレビュー付きで解説している。

![Storybook Controls 体験](スクショURL_5)

- Figma コンポーネント → Storybook Story の対応関係
- Controls パネルによるコードなしの Props 操作
- デザイントークン → CSS 変数 → コンポーネントの対応表
- Chromatic による Visual Regression テスト

### アクセシビリティ実践

- **セマンティック HTML と ARIA** — ランドマーク要素、aria 属性、フォーカス管理、スクリーンリーダーテスト
- **Table 設計** — ellipsis の多用を避けるべき理由、横スクロールの判断基準、入れ子テーブルの代替案
- **Form のアクセシビリティ** — placeholder 依存の問題、エラーメッセージの aria 紐付け、カスタム select の実装課題

### ダークパターン回避と技術倫理

代表的なダークパターンを視覚的な NG/OK 比較で解説している。Cookie バナー設計、Confirmshaming、WCAG 2.2 準拠、障害者差別解消法との関連を扱う。

---

## 技術構成

| 技術 | 用途 |
|------|------|
| React 19 + TypeScript | UI フレームワーク |
| Vite | ビルド + HMR |
| Tailwind CSS | スタイリング |
| Sucrase | ブラウザ内 JSX トランスパイル |
| React Three Fiber | 3D プレビュー |
| prism-react-renderer | シンタックスハイライト |
| wouter | ルーティング |
| Vercel | ホスティング |

プレビューは `srcDoc` iframe + `sandbox="allow-scripts allow-same-origin"` で分離している。CDN は React 18.3.1 UMD、Three.js 0.160.1 UMD を使用（React 19・Three.js 0.161+ は UMD ビルドを廃止しているため）。

---

## リンク

- 教材: https://dev-album.vercel.app
- ソースコード: https://github.com/BoxPistols/unified-manual
- バグ報告: https://dev-album.vercel.app/bug-report

![ダークモード対応](スクショURL_6)

フィードバックは GitHub Issue または本記事のコメントで受け付けている。
