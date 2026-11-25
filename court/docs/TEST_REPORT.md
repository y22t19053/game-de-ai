# 审计与测试报告 V0.1

## 1. 自动化测试（`node --test test/court.test.mjs`）

10/10 通过。每个测试都先**违反规则**再断言被拒——只测"顺利路径"不算测规则。

| # | 测试 | 锁住的规则 | 拒绝码 |
|---|---|---|---|
| 1 | 案件登记 | 重复 id；提案文件必须存在；类型合法 | `CASE_EXISTS` / `PROPOSAL_MISSING` / `BAD_TYPE` |
| 2 | 证据 | 推论不得标 `verified`；缺来源被拒 | `EVIDENCE_LAUNDERING` / `BAD_INPUT` |
| 3 | 书状 | <20 字视为未提交；同侧重复提交；改须理由并留历史 | `BRIEF_TOO_SHORT` / `BRIEF_EXISTS` / `AMEND_NEEDS_REASON` |
| 4 | 交叉询问 | 证据须在卷；轮次不足不得组陪审 | `EVIDENCE_NOT_FOUND` / `JURY_TOO_EARLY` |
| 5 | 陪审 | 必须写理由；不得重复投票 | `JURY_NEEDS_REASON` / `DUPLICATE_JUROR` |
| 6 | 裁决 | 无控辩 / 无争议 / 陪审不足 / 论点无证据 / 作者任法官 / 控方任法官 / 未记少数意见 | `NO_ADVERSARIAL_BRIEF` 等 7 个 |
| 7 | 考成 | 无裁决不得派任务；须期限；不得自验；未销不得结案 | `NO_RULING` / `BAD_INPUT` / `SELF_VERIFICATION` / `TASKS_OPEN` |
| 8 | 先例 | 跨项目不得绑定；失效先例不得引用 | `PRECEDENT_CROSS_PROJECT` / `PRECEDENT_DEAD` |
| 9 | 高风险 | 未记录制度攻击不得裁决；调用七轮须说明理由 | `REDTEAM_REQUIRED` / `ROUNDS_NEED_JUSTIFICATION` |
| 10 | 审计 | 干净案件通过；篡改陪审密封被发现 | `JURY_SEAL_BROKEN` |

## 2. 开发过程中被测试抓到的真实缺陷（4 个，全部是真 bug）

| 缺陷 | 现象 | 根因 | 修法 |
|---|---|---|---|
| 状态机死锁 | 未形成争议点就交叉询问 → `STAGE_BLOCKED`，而流程本意允许"边问边形成争议" | `raiseDispute` 只在 `briefing` 推进状态、`addCrossRound` 只接受两个阶段 | 允许 `opened/briefing` 都进 `disputed`；交叉询问守卫改成"必须已有争议点" |
| 陪审密封形同虚设 | 改掉 `jury/j2.json` 里的 `reason`，审计**不报** | 审计只比较文件里的 `sha` 字段与案卷里的 `sha` 字段，没重算 payload | 用 `{sha, ...rest}` 重组 payload 重算哈希，与文件 sha 比对 |
| 验收无依据也能过 | `verifyTask` 只要 `passed` 就核销 | 缺 `note` 校验 | 新增 `VERIFY_NEEDS_NOTE` |
| 测试自身写错 5 处 | 理由字数不足、同项目先例当跨项目 | 我按印象写断言，没按规则写 | 逐条按规则改写；跨项目断言改用 `bistro-rush` 先例 |

**意义**：前两条如果没被测出来，这套制度会给人"审计通过"的假安全感——这正是它要防的东西。

## 3. 审计器（`audit verify`）当前结果

```json
{ "ok": true, "problems": [], "checkedCases": 1, "logEntries": 7 }
```

审计检查项（任一触发即 `ok:false`）：

- 日志哈希链（`LOG_CHAIN_BROKEN` / `LOG_HASH_MISMATCH`）
- 陪审文件存在与密封 payload（`JURY_FILE_MISSING` / `JURY_SEAL_BROKEN`）
- 裁决论点挂的证证据是否仍在卷（`RULING_DANGLING_EVIDENCE`）
- 作者/控辩是否任法官（`JUDGE_IS_AUTHOR` / `JUDGE_IS_ADVOCATE`）
- 高风险案是否有制度攻击记录（`REDTEAM_MISSING`）
- 少数意见是否被压（`MINORITY_SUPPRESSED`）
- 是否存在自验（`SELF_VERIFICATION`）
- 任务证据是否仍在盘（`TASK_EVIDENCE_GONE`）、是否逾期（`TASK_OVERDUE`）
- 已结案件是否留有未销任务（`CLOSED_WITH_OPEN_TASKS`）

## 4. 未覆盖的部分（诚实清单）

- 没有测"两名 agent 真的不会再串通"（无法自动测，只能靠流程与日志）；
- 没有做并发写入测试（单人使用场景，写入串行）；
- 没有测大案件规模（>20 条证据、>10 个任务）的性能；
- `audit` 只查形式不查质量，质量靠陪审与用户；
- token 未插桩，见 `AB_COMPARISON.md`。

## 七、红队复跑结果（16 次，2026-11-15 复跑）

`node test/redteam.mjs` → **16 次攻击，被挡住 15 次，未挡住 1 次（A4）**。

| 编号 | 手法 | 结果 |
|---|---|---|
| A1a / A1b | 方案作者自任法官 / 控方自任法官 | 挡住 `JUDGE_IS_AUTHOR` / `JUDGE_IS_ADVOCATE` |
| A2a | 推论标为已独立验证 | 挡住 `EVIDENCE_LAUNDERING` |
| A2b | 提交不存在的证据文件 | 挡住（`TASK_NEEDS_REPORT` 先行拦截，随后路径检查仍会拒） |
| A3 | 执行人自行验收 | 挡住 `SELF_VERIFICATION` |
| **A4** | 长书状 20,000 字压制 80 字书状 | **未挡住（已知弱点 I-01）** |
| A5 | 论点挂不存在的证据编号 | 挡住 `EVIDENCE_NOT_FOUND` |
| A6a / A6b | 跨项目绑定先例 / 引用失效先例 | 挡住 `PRECEDENT_CROSS_PROJECT` / `PRECEDENT_DEAD` |
| A7a / A7b | 裁决后再裁 / 未裁先派任务 | 挡住 `ALREADY_RULED` / `NO_RULING` |
| A8a / A8b | 任务无验收标准 / 报告只写「完成了」 | 挡住 `TASK_NEEDS_ACCEPTANCE`（本轮新增）/ `TASK_NEEDS_REPORT` |
| A9 | 少数意见不入裁决 | 挡住 `MINORITY_NOT_RECORDED` |
| A10a / A10b | 篡改日志 / 篡改陪审投票 | 挡住 `AUDIT_DETECTED`（`LOG_HASH_MISMATCH` / `JURY_SEAL_BROKEN`） |

**本轮由红队直接促成的一处制度修改**：A8a 首次跑时未被挡住（可派「无验收标准」的任务），据此给 `createTask` 加了 `TASK_NEEDS_ACCEPTANCE`（≥10 字）——这是这次压力测试**唯一产生实际代码改动**的地方，其余 15 处都是既有规则在起作用。

**唯一未挡住项**：A4。理由是书状与修正书状都没有长度上限，也没有「论点摘要等长化」。不修的原因见 `docs/OPEN_ISSUES.md` I-01（限制全文可被拆附件绕过，正解在陪审阶段做摘要等长化）。

## 第八节 V0.1.1 测试与红队（2026-11-15）

**单元测试**：`node --test test/court.test.mjs` → **11/11 通过**（V0.1 为 10 个）。新增覆盖：三段式证据与四种拒绝码、撤回留痕、未采信不得引用、初判密封与迟到入库、终票三要件、claims 绑定与 `judgeSummary`、验收 checklist 与假材料、成本 null/unavailable 与负数拒绝、审计披露迟到初判。

**红队**：`node test/redteam.mjs` → **23 次攻击，21 次被挡住，2 次未挡住**。

- 未挡住 A4（书状篇幅占优）：纪律层不设字数上限，披露手段是 `judgeSummary().unclaimedChars`（已知弱点 I-01）。
- 未挡住 A11（批量申报刷绿闸门）：制度不挡数量，这是 C-001 已认定的边界（闸门只保溯源力、不保收敛力）。

**红队自身的教训**：V0.1 的红队脚本 16 次「全部被挡住」是**假绿**——它用旧签名调 `addEvidence`，被 BAD_PARTY 拦下，而攻击者根本没走到被测点。V0.1.1 重写为两个夹具（`seedNoBriefs` / `seed`）后，才暴露出 A2b、A8a、A15 三条真缺口（其中 A8a 直接促成 `TASK_NEEDS_ACCEPTANCE`）。

**审计**：`node bin/court.mjs audit verify --root .` → `ok: true, problems: [], warnings: [JURY_INITIAL_LATE(c002-j3)]`。C-001 未受任何新规则影响。

**未覆盖（诚实清单）**：并发写入、跨机时钟、真实 API 计费、GPU 资源争用、人在环路的操作超时；`redteam.mjs` 只测引擎拒绝码，不测「人是否会真的作弊」。
