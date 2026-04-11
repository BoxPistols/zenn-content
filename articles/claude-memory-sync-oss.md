---
title: "Claude Codeに永続記憶を与えるOSSツール「claude-memory-sync」を作った"
emoji: "🧠"
type: "tech"
topics: ["claudecode", "ai", "shellscript", "git", "oss"]
published: false
---

## はじめに

Claude Codeを使っていると、毎回セッションが始まるたびに同じことを伝え直す必要があります。

「このプロジェクトはpnpmを使っている」「MUIのsxプロパティでpxは禁止」「コミットはConventional Commitsで」——こういった方針を、Claude Codeは前のセッションで覚えていても次のセッションでは忘れています。

そこで、**Claude Codeにセッション間の持続的記憶を与えるOSSツール「claude-memory-sync」を作り、公開しました。**

https://github.com/BoxPistols/claude-memory-sync

外部サービス不要・コストゼロ・完全自己管理で動作します。

## claude-memory-syncとは

Claude Codeのhook機能を使い、セッション開始時に記憶ファイルを`~/.claude/CLAUDE.md`へ自動注入し、セッション終了時にGitリポジトリへ自動コミットするシェルスクリプトのセットです。

記憶はプライベートGitリポジトリ（GitHub等）で管理するため、複数PC間の同期もgit push/pullで完結します。

### こんな人向け

- Claude Codeに毎回同じプロジェクト方針を伝え直している
- 外部サービスに記憶やコードを送りたくない
- シンプルなシェルスクリプトで動く仕組みが好き

## 仕組み

### Claude Codeのhook機能

Claude Code（v1.0以降）にはhookという機能があり、特定のイベント発生時にシェルスクリプトを自動実行できます。claude-memory-syncは以下の2つのhookを利用しています。

| hook | タイミング | 処理 |
|------|-----------|------|
| `UserPromptSubmit` | プロンプト送信のたびに（初回含む） | 記憶ファイルを`~/.claude/CLAUDE.md`に注入 |
| `Stop` | セッション終了時 | 記憶ファイルをGitにコミット |

### 記憶の構造

```
~/.claude-memory/          # プライベートGitリポジトリ
├── global.md              # 全プロジェクト共通の設計方針（手動編集）
└── repos/
    ├── github.com-yourname-projectA.md   # プロジェクトAの記憶
    └── github.com-yourname-projectB.md   # プロジェクトBの記憶
```

プロジェクトはgit remote URLから自動判別されます。`github.com/yourname/repo` → `github.com-yourname-repo` のようにslug化してファイル名に使います。

### セッション開始時（UserPromptSubmit hook）

`UserPromptSubmit` hookはプロンプト送信のたびに発火しますが、記憶注入は冪等な処理（既存の注入ブロックを削除してから新しいブロックを書き込む）のため、何度実行しても同じ結果になります。

1. `~/.claude-memory/` をgit pull（リモートがある場合）
2. `global.md` とプロジェクト固有の `.md` を読み込む
3. `<!-- claude-memory-sync:begin -->` ～ `<!-- claude-memory-sync:end -->` の注入ブロックを`~/.claude/CLAUDE.md`に書き込む

### セッション終了時（Stop hook）

1. シークレットスキャナを実行（APIキー等が含まれていないか確認）
2. `.md`ファイルのみをステージング（`git add -- ':(glob)**.md'`）
3. 変更があればauto commitする

## 類似ツールとの比較

Claude Codeの記憶問題を解決するツールはいくつか存在します。

| | claude-memory-sync | mem0 | MemGPT |
|---|---|---|---|
| 外部サービス依存 | なし | あり（クラウド） | あり（クラウド） |
| コスト | 無料 | 有料プランあり | 有料プランあり |
| データの保存先 | 自分のGitリポジトリ | クラウドDB | クラウドDB |
| 複数PC同期 | git push/pull | サービス経由 | サービス経由 |
| オフライン動作 | 可（ローカルのみ） | 不可 | 不可 |
| 依存ライブラリ | git, bash, node（setup用） | Python SDK等 | Python等 |

**最大の差別化ポイントは「データが外に出ない」こと**です。記憶ファイルは自分のプライベートGitリポジトリにのみ存在し、外部サービスに送信されません。

また、`~/.claude/CLAUDE.md`はClaude Codeが標準で読み込むグローバル設定ファイルです。記憶の注入は特別なAPIではなく、Claude Code公式の仕組みを使っています（2026年4月時点の仕様）。

## セキュリティ設計

このツールはClaude Codeのhookとして**毎セッション自動実行**されます。そのため、セキュリティには特に注意して設計しました。

### シークレット漏洩の二重防御

**なぜ `git add -- ':(glob)**.md'` と `.gitignore` の両方が必要か：**

`.gitignore` は新規ファイルのコミットを防ぎますが、すでにtracking済みのファイルには効きません。`git add -- ':(glob)**.md'` で対象を`.md`ファイルのみに限定することで、たとえGit管理下に入ってしまったファイルも誤コミットを防げます。両方を組み合わせることで確実な二層防御になっています。

### シークレットスキャナ

コミット前に変更ファイルをスキャンし、APIキーのようなパターンを検出した場合はコミットを中止します。

検出対象（抜粋）：
- Anthropic APIキー（`sk-ant-[A-Za-z0-9_-]{30,}`）
- OpenAI APIキー（`sk-[A-Za-z0-9_-]{20,}`）
- GitHub PAT（`ghp_`, `github_pat_` 等）
- AWSアクセスキー（`AKIA[0-9A-Z]{16}`）
- PEMプライベートキー

> **注意:** このスキャナはbest-effortであり、完全な検出を保証するものではありません。本格的なシークレット検出にはtrufflehogやgitleaksの併用を推奨します。

スキャンは**シェル変数を経由せず一時ファイルに書き出して** grep します。シェル変数経由では nullバイトで切り詰められ、null byteを含むシークレットがスキャンを回避できるためです。

### 公式以外のリポジトリはデフォルトでabort

install.shに`CLAUDE_MEMORY_SYNC_REPO`環境変数でカスタムリポジトリを指定した場合、デフォルトでインストールを拒否します。hookは毎セッション自動実行されるため、インストール時のリポジトリの信頼性が特に重要だからです。

正当な理由がある場合（forkやプライベートミラー等）は `CLAUDE_MEMORY_ALLOW_CUSTOM_REPO=1` を設定することで許可できます。

### アトミックなCLAUDE.md更新

なぜ `cat >> ~/.claude/CLAUDE.md` ではなく、`mktemp` + `mv` を使うのか：

`cat >>` による追記は書き込み途中でプロセスが中断すると、ファイルが中途半端な状態になる可能性があります。`cleanup → 内容合成 → mv` の順で行うことで、クラッシュ時にも「更新前」か「更新後」のどちらかの状態を保ちます。

### その他のセキュリティ対策

- `CLAUDE_MEMORY_DIR`が`$HOME`以下であることを強制（パス操作防止）
- プロジェクトキーのサニタイズ（`..`除去によるパストラバーサル防止）
- EDITOR環境変数のメタ文字チェック（コマンドインジェクション防止）
- `find -maxdepth 3 -xdev`で走査範囲を制限
- ログは`/tmp`ではなく`~/.claude/logs/`に保存（symlink攻撃対策）
- 1MB超でログを自動ローテーション

## インストール

```bash
curl -fsSL https://raw.githubusercontent.com/BoxPistols/claude-memory-sync/main/install.sh | bash
```

インストール中にGitHubのプライベートリポジトリURLを聞かれます。空Enterでローカルのみ（Git同期なし）で使えます。

### 動作要件

- Claude Code（v1.0以降）
- git
- bash
- Node.js v18以上（初回セットアップのhook登録に使用）

## 使い方

### 記憶を書く

Claude Codeに「今日の知見を記憶して」と伝えるだけです。Claudeが`~/.claude-memory/repos/<project>.md`に書き込み、セッション終了時に自動コミットされます。

全プロジェクト共通の方針は`cm edit`で`global.md`を直接編集できます。

```
cm edit    # global.md を $EDITOR で開く
```

### 手動同期

```
cm         # pull --rebase → commit → push (デフォルト)
cm status  # 記憶ファイル一覧・ahead/behind・未commit変更を表示
cm log     # 最近のcommit履歴を表示
cm clean   # ~/.claude/CLAUDE.md から注入ブロックを削除
```

### 環境変数

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `CLAUDE_MEMORY_DIR` | 記憶リポジトリのパス | `~/.claude-memory` |
| `CLAUDE_MEMORY_AUTO_PUSH` | セッション終了時の自動push | off（無効） |
| `CLAUDE_MEMORY_SKIP_SECRET_SCAN` | シークレットスキャンのバイパス | off |

`CLAUDE_MEMORY_AUTO_PUSH`がデフォルトoffなのは、Claudeが誤ってAPIキー等を記憶ファイルに書き込んだ際に意図せずリモートへ漏洩することを防ぐためです。push は `cm` コマンドで明示的に行うことを推奨します。

## アンインストール

```bash
node ~/.claude/skills/memory-sync/bin/uninstall.js
```

## おわりに

claude-memory-syncは「シェルスクリプトとGitだけで、外部依存なしにClaude Codeの記憶問題を解決する」というコンセプトで作りました。

Claude CodeのCLAUDE.mdとhook機能は公式の仕組みであり、そこに乗っかる形で実装しているため、Anthropicの設計方針とも自然に合致しています。

MITライセンスで公開しています。issueやPRはお気軽にどうぞ。

https://github.com/BoxPistols/claude-memory-sync
