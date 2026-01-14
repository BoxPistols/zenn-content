---
title: "複数Gitリポジトリを一括更新するシェルスクリプト"
emoji: "🔄"
type: "tech"
topics: ["git", "shellscript", "bash", "効率化"]
published: true
---

## はじめに

複数のGitリポジトリを管理していると、「全部mainブランチに戻して最新化したい」という場面がよくあります。

手動で一つずつ `git checkout main && git pull` するのは面倒なので、一括で処理するシェルスクリプトを作りました。

## こんな人向け

- 複数のプロジェクトを並行して開発している
- featureブランチで作業後、mainに戻し忘れがち
- 定期的に全リポジトリを最新化したい

## スクリプト

```bash
#!/bin/bash
# Git一括更新スクリプト
# 説明: 全リポジトリをmainブランチに切り替えて最新化する

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ベースディレクトリ（スクリプトのある場所）
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"

# リポジトリ一覧（自分の環境に合わせて編集）
REPOS=(
    "project-a"
    "project-b"
    "libs/common-utils"
    "apps/frontend"
)

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Git リポジトリ一括更新スクリプト${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 成功・失敗カウンター
SUCCESS_COUNT=0
FAIL_COUNT=0

update_repo() {
    local repo=$1
    local repo_path="$BASE_DIR/$repo"

    echo -e "${YELLOW}----------------------------------------${NC}"
    echo -e "${BLUE}📁 $repo${NC}"

    # リポジトリが存在するか確認
    if [ ! -d "$repo_path/.git" ]; then
        echo -e "${RED}  ❌ Gitリポジトリが見つかりません${NC}"
        ((FAIL_COUNT++))
        return 1
    fi

    cd "$repo_path"

    # 現在のブランチを取得
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "")
    echo -e "  現在のブランチ: ${YELLOW}$CURRENT_BRANCH${NC}"

    # ローカル変更を確認
    if [ -n "$(git status --porcelain)" ]; then
        echo -e "  ${YELLOW}⚠️  ローカル変更あり - stash します${NC}"
        git stash push -m "Auto stash before update $(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
        STASHED=true
    else
        STASHED=false
    fi

    # mainブランチに切り替え（main以外にいる場合）
    if [ "$CURRENT_BRANCH" != "main" ]; then
        echo -e "  ${YELLOW}🔀 mainブランチに切り替え中...${NC}"
        if git checkout main 2>/dev/null; then
            echo -e "  ${GREEN}✓ mainに切り替えました${NC}"
        else
            echo -e "${RED}  ❌ mainブランチへの切り替えに失敗${NC}"
            ((FAIL_COUNT++))
            return 1
        fi
    fi

    # fetch & pull
    echo -e "  ${BLUE}🔄 fetch中...${NC}"
    if git fetch origin 2>&1; then
        echo -e "  ${BLUE}⬇️  pull中...${NC}"
        if git pull origin main 2>&1; then
            echo -e "  ${GREEN}✅ 更新完了${NC}"
            ((SUCCESS_COUNT++))
        else
            echo -e "${RED}  ❌ pullに失敗${NC}"
            ((FAIL_COUNT++))
        fi
    else
        echo -e "${RED}  ❌ fetchに失敗${NC}"
        ((FAIL_COUNT++))
    fi

    # stashを戻す
    if [ "$STASHED" = true ]; then
        echo -e "  ${YELLOW}📤 stashを復元中...${NC}"
        git stash pop 2>/dev/null || echo -e "  ${YELLOW}⚠️  stash復元に競合の可能性${NC}"
    fi
}

# 各リポジトリを更新
for repo in "${REPOS[@]}"; do
    update_repo "$repo"
    echo ""
done

# サマリー表示
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  更新結果サマリー${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}  ✅ 成功: $SUCCESS_COUNT${NC}"
echo -e "${RED}  ❌ 失敗: $FAIL_COUNT${NC}"
echo ""
echo -e "${BLUE}完了しました！${NC}"
```

## 使い方

### 1. スクリプトを配置

プロジェクトの親ディレクトリに `git-update-all.sh` として保存します。

```
~/dev/
├── git-update-all.sh  ← ここに配置
├── project-a/
├── project-b/
└── apps/
    └── frontend/
```

### 2. リポジトリ一覧を編集

`REPOS` 配列を自分の環境に合わせて編集します。

```bash
REPOS=(
    "project-a"
    "project-b"
    "apps/frontend"
)
```

### 3. 実行権限を付与して実行

```bash
chmod +x git-update-all.sh
./git-update-all.sh
```

## 機能

| 機能 | 説明 |
|------|------|
| 自動ブランチ切り替え | main以外のブランチにいる場合、自動でmainに切り替え |
| ローカル変更の保護 | 未コミットの変更がある場合、自動でstash→復元 |
| カラー出力 | 成功/失敗が一目でわかる |
| サマリー表示 | 最後に成功・失敗数を表示 |

## カスタマイズ例

### masterブランチを使う場合

`main` を `master` に置き換えます。

```bash
if [ "$CURRENT_BRANCH" != "master" ]; then
    git checkout master 2>/dev/null
fi
git pull origin master 2>&1
```

### 自動でリポジトリを検出する

手動でリストを書く代わりに、`.git` フォルダを自動検出する方法もあります。

```bash
# REPOS配列の代わりに
REPOS=$(find . -maxdepth 2 -name ".git" -type d | sed 's|/\.git||' | sed 's|^\./||')
```

## 動作環境

| OS | 動作 |
|----|------|
| macOS (Catalina以降) | ✅ |
| Linux (Ubuntu等) | ✅ |
| Windows WSL2 (Ubuntu) | ✅ |

※ Bash 4.x 以上を推奨。絵文字表示にはUTF-8対応のターミナルが必要です。

## 注意点

- stashの競合が発生した場合は手動で解決が必要です
- リモートへの認証（SSH鍵など）が設定済みである必要があります
- `set -e` を外すと、エラーが発生しても続行します

## まとめ

このスクリプトを使えば、複数リポジトリの管理が楽になります。
週明けの「まずは全部最新化」みたいな場面で活躍するはずです。
