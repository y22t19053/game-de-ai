# 回滚方案（V0.1.1）

## 一句话

V0.1.1 的全部改动集中在 4 个代码/测试文件与若干新文档；回滚就是 `git checkout <基线>`。**案卷不在回滚范围内**（C-001 冻结、C-002 属新增数据）。

## 基线

| 项 | 值 |
|---|---|
| V0.1 交付 commit | `d0d83f8` |
| V0.1.1 提交 | 见 `git log --oneline`（本轮最后一个 commit） |
| 冻结案卷 | `cases/C-001/` 8 个文件，sha256 见 `docs/C001_FREEZE.md` |

## 三种回滚

### 1. 只回滚代码，保留 V0.1.1 文档

```bash
git checkout d0d83f8 -- src/court.mjs bin/court.mjs test/court.test.mjs test/redteam.mjs
node --test test/court.test.mjs
node bin/court.mjs audit verify --root .
```

注意：回滚代码后**不要**再用 V0.1.1 的 CLI 子命令（`evidence register`、`jury initial`、`cost set` 等），因为旧引擎没有这些函数；旧引擎也读不了 `schema: v0.1.1` 的新案（`isLegacy` 在旧代码里不存在），所以若已建 C-002，需要把 `cases/C-002` 移到别处再跑旧引擎。

### 2. 只回滚某一个 P0

| 想撤掉 | 撤回方式 | 副作用 |
|---|---|---|
| P0-1 三段式证据 | `git checkout d0d83f8 -- src/court.mjs` 后手工保留其他改动 | 不推荐：单文件混着五项改动，人工分离易错 |
| P0-2 陪审引证 | 把审计里的 `JURY_WITHOUT_*` 三条改成 `continue` | 只是不再报错，规则仍在 `castJury` 里强制 |
| P0-3 claims | 把 `fileBrief` 的 `BRIEF_NEEDS_CLAIMS` 降级为返回 warning | `judgeSummary` 的 `unclaimedChars` 会变成 `null` |
| P0-4 验收清单 | 把 `verifyTask` 的 `checks` 参数改为可选 | 假看材料重新变成可行（红队 A12 会重新失守） |
| P0-5 成本 | `cost` 字段退回 `{tokens: 0, ...}` | 会把「没测」重新写成 0，不推荐 |

### 3. 灾难恢复（整个工程回滚）

```bash
cd C:/Users/11ee11/Documents/deepseek-harness/default-workspace/game-de-ai-court
git log --oneline                 # 找到 V0.1 或 V0.1.1 的 commit
git checkout d0d83f8 -- .
git clean -fd                     # 删除未跟踪的新文档（先确认没有要保留的案卷复制到别处）
```

**执行前必读**：`git clean -fd` 会删掉 `cases/C-002/`、`ledger/`、`audit/` 里未提交的内容。如果 C-002 尚未提交，先 `cp -r cases/C-002 ../c002_backup/`。

## 数据层

- `cases/C-001/` **任何情况下不得改写**。若要验证「回滚后旧引擎仍能读 C-001」，请复制整个工程到临时目录再跑，不要在原地改动。
- `audit/log.jsonl` 是追加式哈希链；回滚代码不影响它，但**不要手工改行**——改一行会让 `audit verify` 报 `LOG_HASH_MISMATCH`，且这条记录本身就是「有人动过账」的证据。
- 若审计链已坏，唯一合法动作是：保留原文件（改名 `log.jsonl.broken-<时间>`）、写一份说明进 `docs/`、然后重新起链。**不要静默重建**。

## 验证回滚成功的三条命令

```bash
node --test test/court.test.mjs          # V0.1: 10/10；V0.1.1: 11/11
node test/redteam.mjs                    # V0.1: 16 次；V0.1.1: 23 次（21 挡住 + 2 如实失败）
node bin/court.mjs audit verify --root . # 期望 ok:true, problems:[]
```
