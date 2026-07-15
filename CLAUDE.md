@AGENTS.md

# PR・マージのルール

## PR

- issue 単位でブランチを切る（命名: `feat/<issue番号>-<slug>`）
- PR タイトルは `A1: ...` のように issue コードを先頭に付ける
- PR 本文に `closes #<番号>` を含める

## マージ

- **マージは必ずユーザーが自分で行う。Claude はマージしない。**
- 以下が揃ってからマージする:
  - CI（Lint / Type Check）が pass
  - CodeRabbit の Approve が付いている
- マージ方式: Merge commit（デフォルト）
