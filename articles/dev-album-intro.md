---
title: "Web 開発の実践リファレンス「Dev Album」を公開した"
emoji: "📘"
type: "idea"
topics: ["react", "nextjs", "frontend", "アクセシビリティ"]
published: false
---

## 概要

**Dev Album** は、Git・React・Claude Code・Three.js の 4 領域を、Web 標準とアクセシビリティの観点を含めて解説する技術マニュアルである。

https://dev-album.vercel.app

![Dev Album トップページ](スクショURL_1)

無料・アカウント不要。ブラウザのみで利用可能。

---

## 背景

W3Schools の構成を参考に、以下の方針で構築した。

- **Web 標準の観点を含める**: セマンティック HTML、ARIA、WCAG 準拠など、コードの書き方と同時に品質面も扱う
- **領域を横断する**: Git の環境構築から React のコンポーネント設計、デプロイ、チーム開発までの流れを一本で辿れる構成にした
- **コードを書いて確認できる**: 静的なコード表示ではなく、ライブプレビュー付きのエディタで実行結果を即座に確認できる

---

## 収録内容

### Git / GitHub

Git の基本操作、ブランチ戦略、GitHub PR 運用、AI エージェント連携を扱う。環境構築から解説している。

### React / TypeScript / Next.js

最も大きなセクション。以下のトピックを含む。

- React 19 + TypeScript
- Next.js 15 App Router / Server Components
- CSS Modules / Tailwind / MUI / styled-components
- Storybook（Figma 連携・Chromatic）
- Flexbox / CSS Grid
- Dialog・Snackbar・Form の設計パターン
- セマンティック HTML・ARIA・Table 設計
- ダークパターン回避と技術倫理

### Claude Code & 開発環境

Claude Code CLI、MCP サーバー、Agent Teams、tmux、Hooks、CI/CD を扱う。

### Three.js / React Three Fiber

シーン構築、マテリアル、ライティング、アニメーション、R3F + drei、飛行シミュレーション開発を扱う。

---

## 主な機能

### ライブコードエディタ

左ペインにコードエディタ、右ペインにリアルタイムプレビューを配置している。Sucrase によるブラウザ内 JSX トランスパイルで、環境構築なしにコードの実行結果を確認できる。

![コードエディタとプレビューの左右分割](スクショURL_2)

シンタックスハイライト付き。Tab / Shift+Tab でインデント操作に対応。

### 3D プレビュー

Three.js セクションでも同様の左右分割レイアウトを採用。コードの横で 3D シーンをドラッグ回転・ズームできる。

![Three.js の3Dプレビュー](スクショURL_3)

### コーディングチャレンジ

各ステップにチャレンジ問題を配置している。段階的ヒント、模範解答の表示、キーワードベースの判定機能を持つ。

![コーディングチャレンジ](スクショURL_4)

### UI トレーニング

Flexbox の中央寄せからレスポンシブナビゲーションまで、40 問の HTML/CSS/JS チャレンジを 4 レベルで収録。

---

## Web 標準・アクセシビリティ関連

プログラミングの解説に加え、以下のトピックを独立したセクションで扱っている。

### アクセシビリティ実践

- セマンティック HTML と ARIA（ランドマーク要素、aria 属性、フォーカス管理）
- Table 設計の全課題（ellipsis の問題、横スクロール判断、入れ子テーブルの代替案）
- Form のアクセシビリティ（placeholder 依存の問題、エラーの aria 紐付け）

### UI コンポーネント設計

- Dialog の多用を避ける理由（フォーカストラップの複雑さ、認知負荷）
- Snackbar / Toast の配置・タイミング設計
- Form グループの HTML 構造と課題

### ダークパターン回避と技術倫理

代表的なダークパターンを NG/OK 比較で解説。Cookie バナー設計、WCAG 2.2、障害者差別解消法との関連を扱う。

### Storybook と Figma 連携

Figma のコンポーネントと Storybook Story の対応関係、Controls パネル、デザイントークン、Visual Regression テストを扱う。

![Storybook Controls](スクショURL_5)

---

## 技術構成

| 技術 | 用途 |
|------|------|
| React 19 + TypeScript | UI |
| Vite | ビルド + HMR |
| Tailwind CSS | スタイリング |
| Sucrase | ブラウザ内 JSX トランスパイル |
| React Three Fiber | 3D プレビュー |
| prism-react-renderer | シンタックスハイライト |
| wouter | ルーティング |
| Vercel | ホスティング |

プレビューは `srcDoc` iframe + `sandbox="allow-scripts allow-same-origin"` で分離。CDN は React 18.3.1 UMD、Three.js 0.160.1 UMD を使用（React 19・Three.js 0.161+ は UMD ビルドを廃止しているため）。

---

## リンク

- サイト: https://dev-album.vercel.app
- ソースコード: https://github.com/BoxPistols/unified-manual
- バグ報告: https://dev-album.vercel.app/bug-report

![ダークモード対応](スクショURL_6)

フィードバックは GitHub Issue または本記事のコメントで受け付けている。
