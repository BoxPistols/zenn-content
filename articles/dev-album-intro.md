---
title: "Web開発の実践リファレンス「Dev Album」を公開した"
emoji: "📘"
type: "idea"
topics: ["react", "nextjs", "frontend", "アクセシビリティ"]
published: false
---

## 概要

**Dev Album** は、Git・React・Claude Code・Three.jsの4領域を、Web標準とアクセシビリティの観点を含めて解説する技術マニュアルである。

https://dev-album.vercel.app

![Dev Albumトップページ](スクショURL_1)

無料・アカウント不要。ブラウザのみで利用可能。

---

## 背景

W3Schoolsの構成を参考に、以下の方針で構築した。

- Web標準の観点を含める: セマンティックHTML、ARIA、WCAG準拠など、コードの書き方と同時に品質面も扱う
- 領域を横断する: Gitの環境構築からReactのコンポーネント設計、デプロイ、チーム開発までの流れを一本で辿れる構成にした
- コードを書いて確認できる: 静的なコード表示ではなく、ライブプレビュー付きのエディタで実行結果を即座に確認できる

---

## 収録内容

### Git / GitHub

Gitの基本操作、ブランチ戦略、GitHub PR運用、AIエージェント連携を扱う。環境構築から解説している。

### React / TypeScript / Next.js

最も大きなセクション。以下のトピックを含む。

- React 19 + TypeScript
- Next.js 15 App Router / Server Components
- CSS Modules / Tailwind / MUI / styled-components
- Storybook（Figma連携・Chromatic）
- Flexbox / CSS Grid
- Dialog・Snackbar・Formの設計パターン
- セマンティックHTML・ARIA・Table設計
- ダークパターン回避と技術倫理

### Claude Code & 開発環境

Claude Code CLI、MCPサーバー、Agent Teams、tmux、Hooks、CI/CDを扱う。

### Three.js / React Three Fiber

シーン構築、マテリアル、ライティング、アニメーション、R3F + drei、飛行シミュレーション開発を扱う。

---

## 主な機能

### ライブコードエディタ

左ペインにコードエディタ、右ペインにリアルタイムプレビューを配置している。Sucraseによるブラウザ内JSXトランスパイルで、環境構築なしにコードの実行結果を確認できる。

![コードエディタとプレビューの左右分割](スクショURL_2)

シンタックスハイライト付き。Tab / Shift+Tabでインデント操作に対応。

### 3Dプレビュー

Three.jsセクションでも同様の左右分割レイアウトを採用。コードの横で3Dシーンをドラッグ回転・ズームできる。

![Three.jsの3Dプレビュー](スクショURL_3)

### コーディングチャレンジ

各ステップにチャレンジ問題を配置している。段階的ヒント、模範解答の表示、キーワードベースの判定機能を持つ。

![コーディングチャレンジ](スクショURL_4)

### UIトレーニング

Flexboxの中央寄せからレスポンシブナビゲーションまで、40問のHTML/CSS/JSチャレンジを4レベルで収録。

---

## Web標準・アクセシビリティ関連

プログラミングの解説に加え、以下のトピックを独立したセクションで扱っている。

### アクセシビリティ実践

- セマンティックHTMLとARIA（ランドマーク要素、aria属性、フォーカス管理）
- Table設計の全課題（ellipsisの問題、横スクロール判断、入れ子テーブルの代替案）
- Formのアクセシビリティ（placeholder依存の問題、エラーのaria紐付け）

### UIコンポーネント設計

- Dialogの多用を避ける理由（フォーカストラップの複雑さ、認知負荷）
- Snackbar / Toastの配置・タイミング設計
- FormグループのHTML構造と課題

### ダークパターン回避と技術倫理

代表的なダークパターンをNG/OK比較で解説。Cookieバナー設計、WCAG 2.2、障害者差別解消法との関連を扱う。

### StorybookとFigma連携

FigmaのコンポーネントとStorybook Storyの対応関係、Controlsパネル、デザイントークン、Visual Regressionテストを扱う。

![Storybook Controls](スクショURL_5)

---

## 技術構成

| 技術 | 用途 |
|------|------|
| React 19 + TypeScript | UI |
| Vite | ビルド + HMR |
| Tailwind CSS | スタイリング |
| Sucrase | ブラウザ内JSXトランスパイル |
| React Three Fiber | 3Dプレビュー |
| prism-react-renderer | シンタックスハイライト |
| wouter | ルーティング |
| Vercel | ホスティング |

プレビューは `srcDoc` iframe + `sandbox="allow-scripts allow-same-origin"` で分離。CDNはReact 18.3.1 UMD、Three.js 0.160.1 UMDを使用（React 19・Three.js 0.161+ はUMDビルドを廃止しているため）。

---

## リンク

- サイト: https://dev-album.vercel.app
- ソースコード: https://github.com/BoxPistols/unified-manual
- バグ報告: https://dev-album.vercel.app/bug-report

![ダークモード対応](スクショURL_6)

フィードバックはGitHub Issueまたは本記事のコメントで受け付けている。
