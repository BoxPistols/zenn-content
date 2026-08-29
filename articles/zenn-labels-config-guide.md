---
title: "GitHubラベル管理を自動化！labels-configでチーム開発を効率化する"
emoji: "🏷️"
type: "tech"
topics: ["github", "cli", "nodejs", "npm", "開発効率化"]
published: true
---

# TL;DR - 忙しい人向け（1分で導入）

:::message
**前提:** GitHub CLI (`gh`) がインストール・認証済みであること
:::

## 推奨: リポジトリ自動検出版

シェル関数を設定すれば、リポジトリ情報を手動指定する必要がなくなります。

```bash
# 1. インストール
npm install -g @asagiri-design/labels-config

# 2. シェル関数を設定（~/.zshrc または ~/.bashrc に追加）
labels-sync() {
  local repo=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)
  [[ -z "$repo" ]] && { echo "エラー: Gitリポジトリ内で実行してください"; return 1; }

  # owner/repo を分割
  local owner=$(echo "$repo" | cut -d'/' -f1)
  local repo_name=$(echo "$repo" | cut -d'/' -f2)

  echo "同期先: $repo"

  # 最初の引数がオプション(--で始まる)かファイル名かを判定
  local file="labels.json"
  if [[ -n "$1" && ! "$1" =~ ^-- ]]; then
    file="$1"
    shift
  fi

  labels-config sync --owner "$owner" --repo "$repo_name" --file "$file" "$@"
}

# 3. 設定を反映
source ~/.zshrc  # または source ~/.bashrc

# 4. プロジェクトディレクトリで実行
cd ~/projects/my-project
labels-config init prod-ja --file labels.json  # テンプレート作成
labels-sync --dry-run                          # 確認
labels-sync --delete-extra                     # 実行
```

## または: 手動指定版（シェル関数なしで使う場合）

```bash
npm install -g @asagiri-design/labels-config
cd ~/projects/my-project
labels-config init prod-ja --file labels.json

# リポジトリ情報を取得して owner と repo に分割
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
OWNER=$(echo $REPO | cut -d'/' -f1)
REPO_NAME=$(echo $REPO | cut -d'/' -f2)

# 同期実行
labels-config sync --owner $OWNER --repo $REPO_NAME --file labels.json --dry-run
labels-config sync --owner $OWNER --repo $REPO_NAME --file labels.json --delete-extra
```

**ポイント:**
- リポジトリ情報は自動検出されるため、手動指定不要
- `--delete-extra` で設定ファイルにないラベル（GitHubデフォルトの英語ラベル等）を削除
- 必ず `--dry-run` で確認してから実行

---

# はじめに

GitHubのIssueやPRに付けるラベル、チームやプロジェクトで統一できていますか？

複数のリポジトリを管理していると、ラベルがバラバラになりがちです。新しいリポジトリを作るたびに、手動でラベルを作成するのは面倒ですよね。

そこで今回紹介するのが **`@asagiri-design/labels-config`** です。

**ターミナルから1コマンドで、GitHubリポジトリのラベルを設定ファイルと同期できます。**

## このツールでできること

- 設定ファイル（JSON）でラベルを一元管理
- 9種類の組み込みテンプレートから選択可能
- ドライランで変更をプレビュー
- 複数リポジトリへの一括同期
- GitHub Actionsで自動化
- リポジトリ情報の自動検出（`--owner` / `--repo` 指定不要）

## 推奨される使い方

```bash
cd ~/projects/myrepo
labels-sync  # リポジトリ情報は自動検出
```

シェル関数を設定することで、プロジェクトディレクトリに移動するだけで、リポジトリ情報を自動取得してラベル同期できます。

この記事では、自動検出を使った効率的なワークフローを中心に紹介します。

# クイックスタート（5分で完了）

## Step 1: GitHub CLIのセットアップ

このツールは `gh` CLIを使用してGitHub APIと通信します。トークンの手動管理は不要です。

```bash
# macOS
brew install gh

# Linux (Debian/Ubuntu)
sudo apt install gh

# Windows
winget install --id GitHub.cli

# 認証（ブラウザが開きます）
gh auth login
```

## Step 2: labels-configをインストール

```bash
npm install -g @asagiri-design/labels-config
```

インストール確認：

```bash
labels-config --version
```

## Step 3: シェル関数を設定（推奨）

リポジトリ情報を自動検出できるようにします。

```bash
# ~/.zshrc（または ~/.bashrc）に追加
cat << 'EOF' >> ~/.zshrc
labels-sync() {
  local repo=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)
  [[ -z "$repo" ]] && { echo "エラー: Gitリポジトリ内で実行してください"; return 1; }

  # owner/repo を分割
  local owner=$(echo "$repo" | cut -d'/' -f1)
  local repo_name=$(echo "$repo" | cut -d'/' -f2)

  echo "同期先: $repo"

  # 最初の引数がオプション(--で始まる)かファイル名かを判定
  local file="labels.json"
  if [[ -n "$1" && ! "$1" =~ ^-- ]]; then
    file="$1"
    shift
  fi

  labels-config sync --owner "$owner" --repo "$repo_name" --file "$file" "$@"
}
EOF

# 設定を反映
source ~/.zshrc
```

:::detailsシェル関数を使わない場合
以下のようにコマンド置換で直接実行することもできます。
```bash
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
OWNER=$(echo $REPO | cut -d'/' -f1)
REPO_NAME=$(echo $REPO | cut -d'/' -f2)
labels-config sync --owner $OWNER --repo $REPO_NAME --file labels.json
```
:::

## Step 4: ラベル設定ファイルを作成

プロジェクトディレクトリに移動して、テンプレートから設定ファイルを生成します。

```bash
cd ~/projects/my-project
labels-config init prod-ja --file labels.json
```

これで `labels.json` が作成されます。中身を確認します。

```bash
cat labels.json
```

## Step 5: GitHubリポジトリに同期

まずはドライランで変更内容を確認：

```bash
labels-sync --dry-run --verbose
```

問題なければ、実際に同期：

```bash
labels-sync --verbose
```

これで完了です！GitHubリポジトリのラベルが設定ファイルと同期されました。

リポジトリ情報（owner/repo）は現在のディレクトリから自動検出されるため、指定不要です。

# ワークフローを改善する便利な設定

毎回 `--owner` と `--repo` を指定するのは面倒です。シェル関数やエイリアスを使って、より効率的なワークフローを構築しましょう。

## 方法1: シェル関数（推奨）

最も柔軟で機能的な方法です。現在のディレクトリから自動的にリポジトリ情報を取得します。

### Zshの場合

```bash
# ~/.zshrc に追加
labels-sync() {
  local repo=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)

  if [[ -z "$repo" ]]; then
    echo "エラー: Gitリポジトリ内で実行してください"
    return 1
  fi

  # owner/repo を分割
  local owner=$(echo "$repo" | cut -d'/' -f1)
  local repo_name=$(echo "$repo" | cut -d'/' -f2)

  echo "同期先: $repo"

  # 最初の引数がオプション(--で始まる)かファイル名かを判定
  local file="labels.json"
  if [[ -n "$1" && ! "$1" =~ ^-- ]]; then
    file="$1"
    shift
  fi

  labels-config sync --owner "$owner" --repo "$repo_name" --file "$file" "$@"
}
```

### Bashの場合

```bash
# ~/.bashrc に追加
labels-sync() {
  local repo=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)

  if [[ -z "$repo" ]]; then
    echo "エラー: Gitリポジトリ内で実行してください"
    return 1
  fi

  # owner/repo を分割
  local owner=$(echo "$repo" | cut -d'/' -f1)
  local repo_name=$(echo "$repo" | cut -d'/' -f2)

  echo "同期先: $repo"

  # 最初の引数がオプション(--で始まる)かファイル名かを判定
  local file="labels.json"
  if [[ -n "$1" && ! "$1" =~ ^-- ]]; then
    file="$1"
    shift
  fi

  labels-config sync --owner "$owner" --repo "$repo_name" --file "$file" "$@"
}
```

### 設定の反映

```bash
# Zsh
source ~/.zshrc

# Bash
source ~/.bashrc
```

### 使い方

```bash
# プロジェクトディレクトリに移動
cd ~/projects/my-awesome-project

# デフォルト（labels.json を使用）
labels-sync

# カスタム設定ファイルを指定
labels-sync custom-labels.json

# Dry-run で事前確認
labels-sync --dry-run

# 設定にないラベルを削除
labels-sync --delete-extra

# カスタムファイル + Dry-run
labels-sync my-labels.json --dry-run
```

### 出力例

```
$ cd ~/projects/my-app
$ labels-sync --dry-run

同期先: username/my-app
[dry-run] 以下の変更が適用されます:
  + bug (color: d73a4a)
  + enhancement (color: a2eeef)
  ~ documentation (color: 0075ca -> 0052cc)
```

## 方法2: GitHub CLI不要版

`gh` コマンドがない環境向け。Git remoteのURLをパースして取得します。

```bash
# ~/.zshrc または ~/.bashrc に追加
get-github-repo() {
  local url=$(git remote get-url origin 2>/dev/null)

  # SSH形式: git@github.com:owner/repo.git
  # HTTPS形式: https://github.com/owner/repo.git
  echo "$url" | sed -E 's#(git@|https://)github\.com[:/]##; s#\.git$##'
}

labels-sync() {
  local repo=$(get-github-repo)

  if [[ -z "$repo" ]]; then
    echo "エラー: GitHubリポジトリ内で実行してください"
    return 1
  fi

  # owner/repo を分割
  local owner=$(echo "$repo" | cut -d'/' -f1)
  local repo_name=$(echo "$repo" | cut -d'/' -f2)

  echo "同期先: $repo"

  # 最初の引数がオプション(--で始まる)かファイル名かを判定
  local file="labels.json"
  if [[ -n "$1" && ! "$1" =~ ^-- ]]; then
    file="$1"
    shift
  fi

  labels-config sync --owner "$owner" --repo "$repo_name" --file "$file" "$@"
}
```

## 方法3: シンプル関数（最小構成）

最小構成で素早く使いたい場合。オプション引数には非対応ですが、シンプルです。

```bash
# ~/.zshrc または ~/.bashrc に追加
labels-sync() {
  local repo=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)
  local owner=$(echo "$repo" | cut -d'/' -f1)
  local repo_name=$(echo "$repo" | cut -d'/' -f2)
  labels-config sync --owner "$owner" --repo "$repo_name" --file labels.json "$@"
}
```

:::message
この最小版は `labels.json` 固定です。柔軟な使い方をしたい場合は「方法1」を推奨します。
:::

## 追加ユーティリティ

### 現在のリポジトリ情報を確認

```bash
# ~/.zshrc または ~/.bashrc に追加
repo-info() {
  local repo=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)

  if [[ -z "$repo" ]]; then
    echo "GitHubリポジトリではありません"
    return 1
  fi

  echo "リポジトリ: $repo"
  echo "URL: https://github.com/$repo"
}
```

### ラベルエクスポート（自動リポジトリ検出付き）

```bash
# ~/.zshrc または ~/.bashrc に追加
labels-export() {
  local repo=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)

  if [[ -z "$repo" ]]; then
    echo "エラー: Gitリポジトリ内で実行してください"
    return 1
  fi

  # owner/repo を分割
  local owner=$(echo "$repo" | cut -d'/' -f1)
  local repo_name=$(echo "$repo" | cut -d'/' -f2)

  local output="${1:-labels-exported.json}"
  echo "エクスポート元: $repo"
  labels-config export --owner "$owner" --repo "$repo_name" --output "$output"
  echo "保存先: $output"
}
```

### 使用例

```bash
# 現在のリポジトリ情報を確認
repo-info

# 現在のリポジトリのラベルをエクスポート
labels-export

# カスタムファイル名でエクスポート
labels-export my-labels.json
```

## ワンライナーセットアップ

以下のコマンドで一括セットアップできます。

### Zsh

```bash
cat << 'EOF' >> ~/.zshrc

# labels-config 自動リポジトリ検出
labels-sync() {
  local repo=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)
  [[ -z "$repo" ]] && { echo "エラー: Gitリポジトリ内で実行してください"; return 1; }
  local owner=$(echo "$repo" | cut -d'/' -f1)
  local repo_name=$(echo "$repo" | cut -d'/' -f2)
  echo "同期先: $repo"
  local file="labels.json"
  if [[ -n "$1" && ! "$1" =~ ^-- ]]; then
    file="$1"
    shift
  fi
  labels-config sync --owner "$owner" --repo "$repo_name" --file "$file" "$@"
}

labels-export() {
  local repo=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)
  [[ -z "$repo" ]] && { echo "エラー: Gitリポジトリ内で実行してください"; return 1; }
  local owner=$(echo "$repo" | cut -d'/' -f1)
  local repo_name=$(echo "$repo" | cut -d'/' -f2)
  local output="${1:-labels-exported.json}"
  echo "エクスポート元: $repo"
  labels-config export --owner "$owner" --repo "$repo_name" --output "$output"
}
EOF

source ~/.zshrc
```

### Bash

```bash
cat << 'EOF' >> ~/.bashrc

# labels-config 自動リポジトリ検出
labels-sync() {
  local repo=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)
  [[ -z "$repo" ]] && { echo "エラー: Gitリポジトリ内で実行してください"; return 1; }
  local owner=$(echo "$repo" | cut -d'/' -f1)
  local repo_name=$(echo "$repo" | cut -d'/' -f2)
  echo "同期先: $repo"
  local file="labels.json"
  if [[ -n "$1" && ! "$1" =~ ^-- ]]; then
    file="$1"
    shift
  fi
  labels-config sync --owner "$owner" --repo "$repo_name" --file "$file" "$@"
}

labels-export() {
  local repo=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)
  [[ -z "$repo" ]] && { echo "エラー: Gitリポジトリ内で実行してください"; return 1; }
  local owner=$(echo "$repo" | cut -d'/' -f1)
  local repo_name=$(echo "$repo" | cut -d'/' -f2)
  local output="${1:-labels-exported.json}"
  echo "エクスポート元: $repo"
  labels-config export --owner "$owner" --repo "$repo_name" --output "$output"
}
EOF

source ~/.bashrc
```

# 利用可能なテンプレート

| テンプレート | 説明 | ラベル数 |
|-------------|------|---------|
| `minimal` | 最小構成（bug, feature, documentation） | 3 |
| `github` | GitHubデフォルトラベル | 9 |
| `prod-ja` | 日本語プロダクション用 | 14 |
| `prod-en` | 英語プロダクション用 | 14 |
| `agile` | アジャイル/スクラム用 | 12 |
| `react` | React開発用 | 15 |
| `vue` | Vue開発用 | 15 |
| `frontend` | フロントエンド汎用 | 15 |

テンプレート一覧を表示：

```bash
labels-config init --help
```

# CLIコマンド一覧

## init - 設定ファイルの作成

```bash
# テンプレートから作成
labels-config init <template> --file <出力ファイル>

# 例
labels-config init prod-ja --file labels.json
labels-config init agile --file my-labels.json
```

## validate - 設定ファイルの検証

同期前に設定ファイルが正しいかチェック：

```bash
labels-config validate labels.json
```

チェック項目：
- ラベル名の重複
- カラーコードの形式（3桁または6桁の16進数）
- 名前の長さ（最大50文字）
- 説明の長さ（最大200文字）

## sync - GitHubへの同期

### 推奨: シェル関数を使う方法

```bash
# プロジェクトディレクトリで実行
labels-sync [設定ファイル] [オプション]
```

例：
```bash
labels-sync                      # labels.json を使用
labels-sync custom-labels.json   # カスタムファイルを使用
labels-sync --dry-run            # 確認のみ
labels-sync --delete-extra       # 置き換えモード
```

### または: 直接コマンドを実行

```bash
labels-config sync \
  --owner <オーナー名> \
  --repo <リポジトリ名> \
  --file <設定ファイル> \
  [オプション]
```

例：
```bash
# リポジトリ自動検出
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
OWNER=$(echo $REPO | cut -d'/' -f1)
REPO_NAME=$(echo $REPO | cut -d'/' -f2)
labels-config sync --owner $OWNER --repo $REPO_NAME --file labels.json

# 手動指定（CI/CD環境など）
labels-config sync --owner myorg --repo myrepo --file labels.json
```

### オプション

| オプション | 説明 |
|-----------|------|
| `--dry-run` | 実際には変更せず、プレビューのみ |
| `--verbose` | 詳細なログを表示 |
| `--delete-extra` | 設定ファイルにないラベルを削除 |

### 同期モード

**追加モード（デフォルト）**
- 新しいラベルを追加
- 既存ラベルを更新（名前が同じ場合）
- 設定ファイルにないラベルは**そのまま残す**

```bash
labels-sync
```

**置き換えモード**
- 設定ファイルにないラベルを**削除する**
- 完全に設定ファイルと同じ状態にする

```bash
labels-sync --delete-extra
```

:::message alert
置き換えモードは既存のIssue/PRからラベルが外れる可能性があります。必ず `--dry-run` で確認してから実行してください。
:::

## export - 既存ラベルのエクスポート

既存リポジトリのラベルを設定ファイルとして出力：

### 推奨: シェル関数を使う方法

```bash
# プロジェクトディレクトリで実行
labels-export [出力ファイル名]
```

例：
```bash
cd ~/projects/my-project
labels-export                      # labels-exported.json に出力
labels-export my-labels.json       # カスタムファイル名で出力
```

### または: 直接コマンドを実行

```bash
# リポジトリ自動検出
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
OWNER=$(echo $REPO | cut -d'/' -f1)
REPO_NAME=$(echo $REPO | cut -d'/' -f2)
labels-config export --owner $OWNER --repo $REPO_NAME --output exported-labels.json

# 手動指定
labels-config export --owner myorg --repo myrepo --output exported-labels.json
```

他のリポジトリにラベルをコピーしたいときに便利です。

# 設定ファイルのフォーマット

## 基本形式

```json
{
  "version": "1.0.0",
  "labels": [
    {
      "name": "bug",
      "color": "d73a4a",
      "description": "バグ報告"
    },
    {
      "name": "feature",
      "color": "0e8a16",
      "description": "新機能リクエスト"
    },
    {
      "name": "documentation",
      "color": "0075ca",
      "description": "ドキュメントの改善"
    }
  ]
}
```

### フィールド説明

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `name` | ○ | ラベル名（1-50文字） |
| `color` | ○ | 16進数カラーコード（`#`なし、3桁または6桁） |
| `description` | ○ | ラベルの説明（1-200文字） |

## カテゴリ分け形式

ラベルをカテゴリごとに整理することもできます。

```json
{
  "version": "1.0.0",
  "labels": [
    {
      "category": "タイプ",
      "labels": [
        { "name": "bug", "color": "d73a4a", "description": "バグ" },
        { "name": "feature", "color": "0e8a16", "description": "新機能" }
      ]
    },
    {
      "category": "優先度",
      "labels": [
        { "name": "priority:high", "color": "ff0000", "description": "高" },
        { "name": "priority:low", "color": "cccccc", "description": "低" }
      ]
    }
  ]
}
```

# 実践的なユースケース

## ケース1: 新規プロジェクトのセットアップ

新しいリポジトリを作ったらすぐにラベルを設定：

### 基本的な方法

```bash
# 1. プロジェクトに合ったテンプレートを選択
labels-config init prod-ja --file labels.json

# 2. 必要に応じてlabels.jsonを編集
vim labels.json

# 3. 検証
labels-config validate labels.json

# 4. 同期（リポジトリ情報は手動指定）
labels-config sync --owner myorg --repo new-project --file labels.json
```

### 自動検出を使った方法（シェル関数設定済みの場合）

```bash
# プロジェクトディレクトリで実行するだけ
cd ~/projects/new-project

# テンプレート作成
labels-config init prod-ja --file labels.json

# 同期（リポジトリは自動検出）
labels-sync --dry-run    # まず確認
labels-sync              # 実行
```

## ケース2: 既存ラベルを他リポジトリにコピー

### 基本的な方法

```bash
# 1. 既存リポジトリからエクスポート
labels-config export --owner myorg --repo main-project --output labels.json

# 2. 別リポジトリに同期
labels-config sync --owner myorg --repo sub-project --file labels.json
```

### 自動検出を使った方法

```bash
# 1. メインプロジェクトでエクスポート
cd ~/projects/main-project
labels-export my-labels.json

# 2. サブプロジェクトに移動して同期
cd ~/projects/sub-project
labels-sync my-labels.json --dry-run
labels-sync my-labels.json
```

## ケース3: 複数リポジトリへの一括同期

シェルスクリプトで複数リポジトリに同期：

### 標準的な方法（リポジトリ名を指定）

```bash
#!/bin/bash
REPOS=("myorg/repo1" "myorg/repo2" "myorg/repo3")

for REPO in "${REPOS[@]}"; do
  OWNER=$(echo $REPO | cut -d'/' -f1)
  REPO_NAME=$(echo $REPO | cut -d'/' -f2)

  echo "Syncing $REPO..."
  labels-config sync \
    --owner $OWNER \
    --repo $REPO_NAME \
    --file labels.json \
    --verbose
done
```

### 自動検出を使った方法

```bash
#!/bin/bash
# ディレクトリベースで一括同期

PROJECTS=(
  "~/projects/repo1"
  "~/projects/repo2"
  "~/projects/repo3"
)

for PROJECT in "${PROJECTS[@]}"; do
  echo "Processing $PROJECT..."
  cd "$PROJECT" && labels-sync --verbose || echo "Failed: $PROJECT"
done
```

## ケース4: チーム全体での統一ラベル運用

チーム共有のラベル設定を簡単に適用：

```bash
# 1. 共有ラベル設定を取得（共有リポジトリから）
cd ~/shared-configs
git clone https://github.com/myteam/label-configs.git
cd label-configs

# 2. 各プロジェクトで使用
cd ~/projects/my-project
labels-sync ~/shared-configs/label-configs/team-labels.json

# または、シンボリックリンクで管理
ln -s ~/shared-configs/label-configs/team-labels.json labels.json
labels-sync
```

# GitHub Actionsで自動化

`labels.json` を変更したら自動で同期する設定：

:::message
GitHub Actions環境では自動検出が使えないため、リポジトリ情報を環境変数から取得します。
:::

```yaml
# .github/workflows/sync-labels.yml
name: Sync Labels

on:
  push:
    paths:
      - 'labels.json'
    branches:
      - main

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install labels-config
        run: npm install -g @asagiri-design/labels-config

      - name: Authenticate gh CLI
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: echo "$GITHUB_TOKEN" | gh auth login --with-token

      - name: Sync labels
        run: |
          REPO="${{ github.repository }}"
          OWNER=$(echo $REPO | cut -d'/' -f1)
          REPO_NAME=$(echo $REPO | cut -d'/' -f2)
          labels-config sync \
            --owner $OWNER \
            --repo $REPO_NAME \
            --file labels.json \
            --verbose
```

これで、`labels.json` をコミットするだけでラベルが自動更新されます。

**ポイント:**
- `${{ github.repository }}` は `owner/repo` 形式で展開されるので、分割して使用
- シェル関数は不要（環境変数を直接使用）

# トラブルシューティング

## 認証エラーが出る

```bash
# gh CLIの認証状態を確認
gh auth status

# 再認証
gh auth login
```

## 「Gitリポジトリ内で実行してください」エラー（自動検出使用時）

シェル関数で自動検出を使っている場合のエラー：

```bash
# 現在地がGitリポジトリか確認
git status

# リモートが設定されているか確認
git remote -v

# GitHub CLIでリポジトリ情報を取得できるか確認
gh repo view --json nameWithOwner
```

解決方法：
- Gitリポジトリのルートディレクトリで実行する
- リモートが正しく設定されているか確認する
- GitHub CLIが認証されているか確認する（`gh auth status`）

## バリデーションエラー

```bash
# 詳細なエラーを確認
labels-config validate labels.json

# よくある原因
# - ラベル名の重複
# - カラーコードに # が含まれている
# - 名前が長すぎる（50文字超）
```

## 同期されない

```bash
# 自動検出を使っている場合（推奨）
labels-sync --dry-run --verbose

# 手動指定の場合
labels-config sync --owner myorg --repo myrepo --file labels.json --verbose
labels-config sync --owner myorg --repo myrepo --file labels.json --dry-run --verbose
```

## リポジトリ名が取得できない（自動検出使用時）

```bash
# 手動で確認
gh repo view --json nameWithOwner

# リモートURLを確認
git remote get-url origin

# 正しいリモートか確認（GitHubのリポジトリか）
# SSH: git@github.com:owner/repo.git
# HTTPS: https://github.com/owner/repo.git
```

## レート制限

```bash
# 現在のレート制限を確認
gh api rate_limit

# 制限に達した場合は60分待つ
```

## シェル関数が動作しない

```bash
# 関数が定義されているか確認
type labels-sync

# 設定ファイルが読み込まれているか確認
# Zsh
source ~/.zshrc

# Bash
source ~/.bashrc

# 新しいターミナルセッションを開く
```

# ライブラリとしての使用

Node.jsプロジェクト内でプログラマティックに使用することもできます。

```typescript
import { GitHubLabelSync } from '@asagiri-design/labels-config/github'
import { CONFIG_TEMPLATES } from '@asagiri-design/labels-config/config'

// リポジトリ情報を指定（CLI版とは異なり、自動検出は使えません）
const sync = new GitHubLabelSync({
  owner: 'mycompany',
  repo: 'myapp'
})

// テンプレートを使用
const labels = CONFIG_TEMPLATES.minimal
await sync.syncLabels(labels)
```

インストール：

```bash
npm install @asagiri-design/labels-config
```

# まとめ

`@asagiri-design/labels-config` を使えば：

- ラベル設定をコードで管理できる
- テンプレートから始められる
- ドライランで変更を事前確認できる
- GitHub Actionsで自動化できる
- 複数リポジトリに一括同期できる

さらに、シェル関数を使った自動リポジトリ検出により：

- プロジェクトディレクトリでそのまま実行できる
- owner/repoの手動指定が不要になる
- 複数プロジェクト間を移動しても指定し直しが要らなくなる

GitHub CLIの認証をそのまま使えるので、トークン管理の手間もありません。

基本的な使い方から、ワークフローを改善する便利な設定まで、プロジェクトの規模や用途に合わせて選択できます。

チーム開発に導入する場合は、まず1つのリポジトリでテンプレートから `labels.json` を作り、ドライランで差分を確認するところから始めてください。

---

## 関連リンク

- [npm: @asagiri-design/labels-config](https://www.npmjs.com/package/@asagiri-design/labels-config)
- [GitHub: BoxPistols/labels-config](https://github.com/BoxPistols/labels-config)
