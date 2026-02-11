---
title: "Volta管理のAI CLIツール（Copilot・Gemini・Claude）を一括アップデートする"
emoji: "🔧"
type: "tech"
topics: ["volta", "shellscript", "copilot", "gemini", "claude"]
published: false
---

## はじめに

GitHub Copilot CLI、Gemini CLI、Claude Code。2025年以降、ターミナルで使えるAI CLIツールが一気に増えました。

これらをVolta経由で管理していると、アップデートが地味に面倒です。それぞれパッケージ名が違い、Claudeだけ更新方法が異なるため、毎回調べ直すことになりがちです。

この記事では、3つのAI CLIツールをワンコマンドで一括アップデートする方法を紹介します。

## こんな人向け

- Volta でNode.jsのツール管理をしている
- Copilot CLI / Gemini CLI / Claude Code を日常的に使っている
- アップデートを忘れがち、または毎回コマンドを調べている

## 前提環境

```
macOS / Linux
Node.js（Volta管理）
zsh or bash
```

各ツールのインストール状態：

```bash
# Volta でインストール済み
volta install @github/copilot
volta install @google/gemini-cli

# Claude Code は独自管理（インストーラー経由）
# ~/.claude/local/ に実体がある
```

:::message
**Claude Code を Volta で統一管理する場合**
Claude Code も npm パッケージ（`@anthropic-ai/claude-code`）として公開されているため、`volta install @anthropic-ai/claude-code` でインストールすれば、3つすべてを Volta で統一管理できます。その場合は `claude update` の代わりに `volta install @anthropic-ai/claude-code@latest` で更新可能です。本記事では、公式推奨のインストーラー経由で導入した環境を前提としています。
:::

## 3つのツールの管理方法の違い

まず、それぞれの更新方法が異なる点が厄介です。

| ツール | npmパッケージ名 | 管理方法 | 更新コマンド |
|--------|----------------|---------|-------------|
| Copilot CLI | `@github/copilot` | Volta | `volta install @github/copilot@latest` |
| Gemini CLI | `@google/gemini-cli` | Volta | `volta install @google/gemini-cli@latest` |
| Claude Code | `@anthropic-ai/claude-code` | 自己更新 | `claude update` |

Copilot と Gemini は `volta install <pkg>@latest` で統一できますが、Claude だけは `claude update` という独自コマンドを使います。

### よくある間違い

```bash
# NG: パッケージ名が違う
volta install @githubnext/github-copilot-cli@latest  # 旧パッケージ
npm install -g @google/generative-ai@latest           # これはSDK

# NG: claudeはgitリポジトリではない
cd ~/.claude/local && git pull  # .gitが存在しない
```

## 方法1: ワンライナー（最もシンプル）

結論から言えば、これだけで動きます：

```bash
volta install @github/copilot@latest && volta install @google/gemini-cli@latest && claude update
```

aliasに登録しておくと便利です：

```bash
# .zshrc に追加
alias update-ai='volta install @github/copilot@latest && volta install @google/gemini-cli@latest && claude update'
```

以降は `update-ai` で一括更新できます。

:::message
`&&` で繋いでいるため、途中で失敗した場合はそこで停止します。個別に実行したい場合は `;` に変えるか、方法2のスクリプト版を使ってください。
:::

## 方法2: シェルスクリプト（バージョン比較・個別更新対応）

ワンライナーでは物足りない場合、バージョン確認や個別更新に対応したスクリプトも用意しました。

### 機能

- 全ツール一括更新
- 個別更新（`update-ai-tools copilot` など）
- バージョン確認のみ（`update-ai-tools --check`）
- 更新前後のバージョン差分表示
- npmレジストリから最新バージョンを取得して比較

### セットアップ

```bash
# スクリプトを配置
mkdir -p ~/bin
curl -o ~/bin/update-ai-tools https://gist.githubusercontent.com/your-account/xxxxx/raw/update-ai-tools
chmod +x ~/bin/update-ai-tools

# PATHに追加（.zshrcに記述）
export PATH="$HOME/bin:$PATH"
```

### 使い方

```bash
# 全ツール更新
update-ai-tools

# バージョン確認のみ
update-ai-tools --check

# 個別更新
update-ai-tools copilot
update-ai-tools gemini
update-ai-tools claude
```

### スクリプト全文

:::details update-ai-tools（クリックで展開）

```bash
#!/bin/bash
# AI CLI Tools 一括アップデートスクリプト
# 対象: copilot, gemini, claude

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

TOOLS=(
  "copilot|@github/copilot|volta"
  "gemini|@google/gemini-cli|volta"
  "claude|@anthropic-ai/claude-code|self"
)

log_info()    { echo -e "${BLUE}[INFO]${RESET} $*"; }
log_success() { echo -e "${GREEN}[OK]${RESET}   $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${RESET} $*"; }
log_error()   { echo -e "${RED}[ERR]${RESET}  $*"; }
log_header()  { echo -e "\n${BOLD}${CYAN}=== $* ===${RESET}"; }

extract_semver() {
  grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1
}

get_version() {
  local tool="$1"
  local raw
  case "$tool" in
    copilot) raw=$(copilot --version 2>/dev/null | head -1) ;;
    gemini)  raw=$(gemini --version 2>/dev/null | head -1) ;;
    claude)  raw=$(claude --version 2>/dev/null | head -1) ;;
  esac
  if [ -z "$raw" ]; then
    echo "未インストール"
  else
    echo "$raw" | extract_semver
  fi
}

get_latest_npm_version() {
  local pkg="$1"
  local raw
  raw=$(npm view "$pkg" version 2>/dev/null) || true
  if [ -z "$raw" ]; then
    echo "取得失敗"
  else
    echo "$raw" | extract_semver
  fi
}

check_versions() {
  log_header "現在のバージョン"
  printf "${BOLD}%-10s %-20s %-20s %-30s${RESET}\n" "ツール" "現在" "最新(npm)" "パッケージ"
  printf "%-10s %-20s %-20s %-30s\n" "------" "------" "------" "------"

  for entry in "${TOOLS[@]}"; do
    IFS='|' read -r name pkg method <<< "$entry"
    current=$(get_version "$name")
    latest=$(get_latest_npm_version "$pkg")

    if [ "$current" = "$latest" ]; then
      status="${GREEN}(最新)${RESET}"
    else
      status="${YELLOW}(更新可能)${RESET}"
    fi

    printf "%-10s %-20s %-20s %-30s %b\n" \
      "$name" "$current" "$latest" "$pkg" "$status"
  done
}

update_volta_tool() {
  local name="$1" pkg="$2"
  local before=$(get_version "$name")

  log_info "${name} を更新中... (volta install ${pkg}@latest)"
  if volta install "${pkg}@latest" 2>&1; then
    local after=$(get_version "$name")
    if [ "$before" = "$after" ]; then
      log_success "${name}: ${after} (既に最新)"
    else
      log_success "${name}: ${before} -> ${after}"
    fi
  else
    log_error "${name} の更新に失敗"
    return 1
  fi
}

update_claude() {
  local before=$(get_version "claude")

  log_info "claude を更新中... (claude update)"
  if claude update 2>&1; then
    local after=$(get_version "claude")
    if [ "$before" = "$after" ]; then
      log_success "claude: ${after} (既に最新)"
    else
      log_success "claude: ${before} -> ${after}"
    fi
  else
    log_error "claude の更新に失敗"
    return 1
  fi
}

update_tool() {
  local name="$1"
  for entry in "${TOOLS[@]}"; do
    IFS='|' read -r tool_name pkg method <<< "$entry"
    if [ "$tool_name" = "$name" ]; then
      case "$method" in
        volta) update_volta_tool "$tool_name" "$pkg" ;;
        self)  update_claude ;;
      esac
      return $?
    fi
  done
  log_error "不明なツール: ${name}"
  return 1
}

update_all() {
  local failed=0
  log_header "AI CLI Tools アップデート開始"
  echo ""

  for entry in "${TOOLS[@]}"; do
    IFS='|' read -r name pkg method <<< "$entry"
    if ! update_tool "$name"; then
      failed=$((failed + 1))
    fi
    echo ""
  done

  log_header "アップデート完了"
  check_versions

  if [ "$failed" -gt 0 ]; then
    log_warn "${failed}件の更新に失敗しました"
    return 1
  fi
}

show_help() {
  cat << 'HELP'
AI CLI Tools 一括アップデートスクリプト

使い方:
  update-ai-tools              全ツールを更新
  update-ai-tools copilot      copilotのみ更新
  update-ai-tools gemini       geminiのみ更新
  update-ai-tools claude       claudeのみ更新
  update-ai-tools --check      バージョン確認のみ
  update-ai-tools --help       このヘルプを表示

対象ツール:
  copilot   @github/copilot        (volta管理)
  gemini    @google/gemini-cli     (volta管理)
  claude    @anthropic-ai/claude-code (自己更新)
HELP
}

main() {
  case "${1:-all}" in
    --help|-h)  show_help ;;
    --check|-c) check_versions ;;
    copilot|gemini|claude)
      log_header "${1} アップデート"
      update_tool "$1"
      echo ""
      check_versions
      ;;
    all)  update_all ;;
    *)
      log_error "不明な引数: $1"
      show_help
      exit 1
      ;;
  esac
}

main "$@"
```

:::

### 実行例

```
=== AI CLI Tools アップデート開始 ===

[INFO] copilot を更新中... (volta install @github/copilot@latest)
[OK]   copilot: 0.0.353 -> 0.0.406

[INFO] gemini を更新中... (volta install @google/gemini-cli@latest)
[OK]   gemini: 0.24.4 -> 0.28.0

[INFO] claude を更新中... (claude update)
[OK]   claude: 2.1.39 (既に最新)

=== アップデート完了 ===

=== 現在のバージョン ===
ツール    現在      最新(npm)  パッケージ
copilot   0.0.406   0.0.406    @github/copilot           (最新)
gemini    0.28.0    0.28.0     @google/gemini-cli        (最新)
claude    2.1.39    2.1.39     @anthropic-ai/claude-code (最新)
```

## 方法の比較

| | ワンライナー | スクリプト版 |
|---|---|---|
| 導入の手軽さ | alias1行 | ファイル配置+PATH設定 |
| 全更新 | `update-ai` | `update-ai-tools` |
| 個別更新 | 手動で切り出し | `update-ai-tools gemini` |
| バージョン確認 | なし | `--check` |
| エラー表示 | 素の出力 | 色付きログ |
| ツール追加 | alias編集 | 配列に1行追加 |

普段使いならワンライナーで十分です。バージョンを確認してから更新したい場合はスクリプト版が便利です。

## ツールを追加する場合

スクリプト版であれば、`TOOLS` 配列に1行追加するだけです：

```bash
TOOLS=(
  "copilot|@github/copilot|volta"
  "gemini|@google/gemini-cli|volta"
  "claude|@anthropic-ai/claude-code|self"
  # 新規追加: volta管理のツール
  "newtool|@scope/package-name|volta"
)
```

`get_version()` にも対応するケースを追加してください。

## まとめ

- AI CLIツールはパッケージ名と更新方法がバラバラで覚えにくい
- Copilot / Gemini は `volta install <pkg>@latest`、Claude は `claude update`
- ワンライナーなら alias 1行、細かく制御したいならスクリプト版
- どちらも `~/bin` や `.zshrc` に置いておけば `update-ai` 一発で最新化できる
