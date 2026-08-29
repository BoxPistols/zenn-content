---
title: "Volta管理のAI CLIツール（Copilot・Gemini・Claude）を一括アップデートする"
emoji: "🔧"
type: "tech"
topics: ["volta", "shellscript", "copilot", "gemini", "claude"]
published: true
---

## はじめに

GitHub Copilot CLI、Gemini CLI、Claude Code。2025年以降、ターミナルで使えるAI CLIツールが一気に増えました。

これらをすべてVolta経由で管理していると、アップデートのたびにパッケージ名を調べ直すのが地味に面倒です。

この記事では、Voltaで管理している3つのAI CLIツールをワンコマンドで一括アップデートする方法を紹介します。

:::message
筆者はその後、この3つのCLIをVolta管理から外してpnpmグローバル管理に移しました。経緯と移行手順は記事末尾の「追記」にあります。Voltaで管理し続ける場合の手順が本編です。
:::

## こんな人向け

- VoltaでNode.jsのツール管理をしている
- Copilot CLI / Gemini CLI / Claude Codeを日常的に使っている
- アップデートを忘れがち、または毎回コマンドを調べている

## 前提環境

```
macOS / Linux
Node.js（Volta管理）
zsh or bash
```

各ツールのインストール状態：

```bash
# 3つともVoltaでインストール済み
volta install @github/copilot
volta install @google/gemini-cli
volta install @anthropic-ai/claude-code
```

## 3つのツールのパッケージ名

すべて `volta install <pkg>@latest` で更新できますが、パッケージ名がそれぞれ異なります。

| ツール | npmパッケージ名 | 更新コマンド |
|--------|----------------|-------------|
| Copilot CLI | `@github/copilot` | `volta install @github/copilot@latest` |
| Gemini CLI | `@google/gemini-cli` | `volta install @google/gemini-cli@latest` |
| Claude Code | `@anthropic-ai/claude-code` | `volta install @anthropic-ai/claude-code@latest` |

### よくある間違い

```bash
# NG: パッケージ名が違う
volta install @githubnext/github-copilot-cli@latest  # 旧パッケージ
npm install -g @google/generative-ai@latest           # これはSDK

# NG: npm install -g ではなくvolta installを使う
npm install -g @anthropic-ai/claude-code@latest  # Volta管理から外れる
```

## 方法1: ワンライナー（最もシンプル）

結論から言えば、これだけで動きます。

```bash
volta install @github/copilot@latest && volta install @google/gemini-cli@latest && volta install @anthropic-ai/claude-code@latest
```

aliasに登録しておくと便利です。

```bash
# .zshrc に追加
alias update-ai='volta install @github/copilot@latest && volta install @google/gemini-cli@latest && volta install @anthropic-ai/claude-code@latest'
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

下の「スクリプト全文」を `~/bin/update-ai-tools` として保存し、実行権限とPATHを設定します。

```bash
mkdir -p ~/bin
# スクリプト全文を ~/bin/update-ai-tools に保存してから:
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
# AI CLI Tools 一括アップデートスクリプト（Volta統一管理版）
# 対象: copilot, gemini, claude（すべてVolta管理）

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

TOOLS=(
  "copilot|@github/copilot"
  "gemini|@google/gemini-cli"
  "claude|@anthropic-ai/claude-code"
)

log_info()    { echo -e "${BLUE}[INFO]${RESET} $*"; }
log_success() { echo -e "${GREEN}[OK]${RESET}   $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${RESET} $*"; }
log_error()   { echo -e "${RED}[ERR]${RESET}  $*"; }
log_header()  { echo -e "\n${BOLD}${CYAN}=== $* ===${RESET}"; }

extract_semver() {
  grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || true
}

get_version() {
  local tool="$1"
  local raw
  raw=$("$tool" --version 2>/dev/null | head -1) || true
  if [ -z "$raw" ]; then
    echo "未インストール"
  else
    local parsed
    parsed=$(echo "$raw" | extract_semver)
    echo "${parsed:-$raw}"
  fi
}

get_latest_npm_version() {
  local pkg="$1"
  local raw
  raw=$(npm view "$pkg" version 2>/dev/null) || true
  if [ -z "$raw" ]; then
    echo "取得失敗"
  else
    local parsed
    parsed=$(echo "$raw" | extract_semver)
    echo "${parsed:-$raw}"
  fi
}

check_versions() {
  log_header "現在のバージョン"
  printf "${BOLD}%-10s %-20s %-20s %-30s${RESET}\n" "ツール" "現在" "最新(npm)" "パッケージ"
  printf "%-10s %-20s %-20s %-30s\n" "------" "------" "------" "------"

  for entry in "${TOOLS[@]}"; do
    IFS='|' read -r name pkg <<< "$entry"
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

update_tool() {
  local name="$1"
  for entry in "${TOOLS[@]}"; do
    IFS='|' read -r tool_name pkg <<< "$entry"
    if [ "$tool_name" = "$name" ]; then
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
      return 0
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
    IFS='|' read -r name _ <<< "$entry"
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
AI CLI Tools 一括アップデートスクリプト（Volta統一管理版）

使い方:
  update-ai-tools              全ツールを更新
  update-ai-tools copilot      copilotのみ更新
  update-ai-tools gemini       geminiのみ更新
  update-ai-tools claude       claudeのみ更新
  update-ai-tools --check      バージョン確認のみ
  update-ai-tools --help       このヘルプを表示

対象ツール:
  copilot   @github/copilot           (volta管理)
  gemini    @google/gemini-cli        (volta管理)
  claude    @anthropic-ai/claude-code (volta管理)
HELP
}

main() {
  case "${1:-all}" in
    --help|-h)  show_help ;;
    --check|-c) check_versions ;;
    all)  update_all ;;
    *)
      # TOOLS配列からツール名を動的に判定
      local is_tool=false
      for entry in "${TOOLS[@]}"; do
        if [ "${entry%%|*}" = "$1" ]; then
          is_tool=true
          break
        fi
      done

      if $is_tool; then
        log_header "${1} アップデート"
        update_tool "$1"
        echo ""
        check_versions
      else
        log_error "不明な引数: $1"
        show_help
        exit 1
      fi
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

[INFO] claude を更新中... (volta install @anthropic-ai/claude-code@latest)
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

スクリプト版であれば、`TOOLS` 配列に1行追加するだけです。

```bash
TOOLS=(
  "copilot|@github/copilot"
  "gemini|@google/gemini-cli"
  "claude|@anthropic-ai/claude-code"
  # 新規追加
  "newtool|@scope/package-name"
)
```

すべてVolta管理なので、コマンド名とnpmパッケージ名を指定するだけで動作します。

## まとめ

- AI CLIツールはパッケージ名がバラバラで覚えにくい
- 3つともVoltaで管理すれば `volta install <pkg>@latest` に統一できる
- ワンライナーならalias 1行、細かく制御したいならスクリプト版
- aliasは `.zshrc` に、スクリプト版は `~/bin` に置いてPATHを通せば `update-ai` 一発で最新化できる

## 追記 (2026-06-29): 3つのCLIをVolta管理から外した

運用してみるとVolta経由の管理は更新が遅れがちで、この3つはリリース頻度が高いため、pnpmグローバル管理へ移しました。以下はその移行手順です

volta本体（nodeツールチェーン管理）は残したまま、以下3つのCLIだけをvoltaから外し、pnpmグローバル管理に移す。

- Claude Code … `@anthropic-ai/claude-code`
- Gemini CLI  … `@google/gemini-cli`（実パッケージ名に合わせる）
- GitHub Copilot CLI … `@github/copilot`（実パッケージ名に合わせる）

### 0. 現状確認

```bash
volta list all                       # volta 管理下の一覧を控える
which -a claude gemini copilot       # 各実体のパス
```

### 1. voltaから3つをアンインストール

```bash
volta uninstall @anthropic-ai/claude-code
volta uninstall @google/gemini-cli
volta uninstall @github/copilot
```

これで `~/.volta/bin` 配下の該当シムが消える。

### 2. pnpmグローバルで入れ直す

```bash
pnpm add -g @anthropic-ai/claude-code
pnpm add -g @google/gemini-cli
pnpm add -g @github/copilot
```

### 3. PATH解決の確認

```bash
which claude    # → ~/Library/pnpm/claude （volta でないこと）
which gemini    # → ~/Library/pnpm/...
which copilot   # → ~/Library/pnpm/...
claude --version
```

`~/.volta/bin` を指したままなら、PATH上でvoltaがpnpmより前にある。
`~/.zshrc` で `~/Library/pnpm` をvoltaより前に置くか、
volta側シムが残っていないか（手順1の取りこぼし）を確認する。

### 4. 今後の更新運用

この3つはpnpmで更新する（`volta install` は使わない）:

```bash
pnpm update -g @anthropic-ai/claude-code @google/gemini-cli @github/copilot
```

node / その他ツールは引き続きvoltaで管理。

### メモ
- volta uninstall = volta管理対象から除外（shim削除）。
- 同名ツールがpnpmとvolta両方に残るとPATH順で挙動が変わるため、
  手順3の `which` 確認は必須。
