---
description: Create  a commit message by analyaing git diffs
allowed-tools: Bash(git status:*), Bash(git diff --staged), Bash(git commit:*)
---

## Your task:

Analyze above staged git changes and create a commit message. Use present tense and explain 'why' something has been changed, not just 'what' has been changed.

## Run these commands:

```bash
git status
git diff --staged
```

## Format:
Use the following format for making the commit message:

```
<emoji><type>: <concise_description>
<optional_body_expaining_why>
```

## Output
1. Show summary of changes currently staged
2. Propose commit message with appropriate emoji
3. Ask for confirmation before commiting

DO NOT auto-commit - wait for user approval, and only commit if user says so.