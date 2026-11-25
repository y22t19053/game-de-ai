# V0.1.1 修改说明

版本：0.1.1（schema `v0.1.1`）｜基线：`d0d83f8`（V0.1 交付）｜原则：**冻结历史，不迁移旧档案**

## 一句话

V0.1 的法庭能开庭，但程序上有五处结构性漏洞：证据由提案方独占入口、陪审可以不引证就投票、长书状没有披露机制、验收可以假看材料、成本栏把「没测」写成 0。V0.1.1 只修这五处，**不新增角色、不改三省六部、不扩案件类型**。

## P0-1 独立证据登记

| 之前 | 之后 |
|---|---|
| `addEvidence` 一个函数、提案方自己写入 `E###` | 三段式：`submitEvidence`（任何一方，写候选 `S###`）→ `registerEvidence`（登记员，转成 `E###`，禁作者/禁提交人自任）→ `decideEvidence`（法官，只接受 admitted / rejected，必须写理由） |
| 证据一经提交即视为可用 | 状态机 `submitted → registered → admitted / rejected`，可 `challengeEvidence`（须给理由）、可 `withdrawEvidence`（须理由且只能撤自己的） |
| 无「被拒也留痕」 | 被拒、被质疑、被撤回的条目全部留在案卷并进审计 |
| 谁都能引用任何编号 | `requireAdmitted`：书状主张、争议点、裁决 findings、陪审引证都只能用 `admitted` 的证据 |

审计新增：`BAD_EVIDENCE_STATE`、`REGISTRAR_IS_AUTHOR`、`REGISTRAR_IS_SUBMITTER`、`AUTHOR_CANNOT_ADMIT`、`EVIDENCE_DECISION_WITHOUT_REASON`、`CITED_NON_ADMITTED_EVIDENCE`、`EVIDENCE_SOURCE_MISSING`。

## P0-2 陪审必须引证

| 之前 | 之后 |
|---|---|
| 一次投票，只有结论与理由 | 两阶段：先 `castInitialVote`（密封写 `jury/<juror>.initial.json`，读书状之前或之后都可，但书状一旦提交就禁止补初判） |
| 投票可以不提任何证据 | 终票必须给 `supports[]`（支持结论的证据）与 `against[]` 或 `noCounter`（为何没有反证） |
| 无改判条件 | 必须给 `wouldChange`（哪些新证据会改变判断） |
| 少数意见可选 | 保留 minority 字段；审计 `MINORITY_SUPPRESSED` |

审计新增：`JURY_INITIAL_MISSING`、`JURY_INITIAL_FILE_MISSING`、`JURY_INITIAL_SEAL_BROKEN`、`JURY_WITHOUT_CITATION`、`JURY_WITHOUT_COUNTER_REASON`、`JURY_WITHOUT_WOULD_CHANGE`。

## P0-3 书状与呈现顺序

- `fileBrief` 要求 `claims[]`：每条 `{text ≥4 字, evidenceIds}`，必须绑 `admitted` 证据；无主张 → `BRIEF_NEEDS_CLAIMS`。
- 新增 `judgeSummary`：先给争议点与双方主张（结构），再给 `lengthChars` 与 `unclaimedChars`（正文里没有被任何主张覆盖的字数）。
- **不做机械字数限制**（P0-3 明令禁止）。顺序偏差通过披露处理，不做裁决。
- 实测见 `ORDER_BIAS_TEST.md`：n=2、换顺序不翻转结论；篇幅优势来自「带可证伪判据」而非字数。

## P0-4 独立验收升级

`verifyTask` 现在要求：

- `checks.artifactsOpened` / `versionChecked` / `contentRechecked` 全为真；
- 至少一项 `recomputed` / `doubleCountChecked` / `omissionChecked`；
- `artifacts[]`：路径必须存在，引擎记 sha256 入库（第三方事后可复算）；
- `note ≥20 字`；执行人自验 → `SELF_VERIFICATION`。

审计新增：`VERIFY_CHECKLIST_MISSING`、`TASK_EVIDENCE_GONE`。

## P0-5 成本统计

- `cost` 字段初始为 `null` + `unavailable[]` 登记，**不写 0**。
- `recordCost` 写入时校验非负；`'unavailable'` 归零并登记。
- 审计：`COST_WITHOUT_SOURCE`（有 token 无来源）、`COST_ZERO_WITHOUT_SOURCE`、`COST_UNCLEARED_UNAVAILABLE`、`BAD_COST_FIELD`。
- `metrics` 汇总：任一案 unavailable → 汇总显示 `'unavailable'`；legacy 案的旧默认 0 不当实测。
- 详见 `COST_MODEL.md`（含为什么不做字符数×系数反推）。

## 兼容性

- `SCHEMA = 'v0.1.1'` 写在新案 `case.json`；`isLegacy(c)` 判定旧案。
- 旧案（C-001）**只读兼容**：证据缺 state 视同 `admitted`；新规则（claims、jury 三要件、验收清单、成本来源）对 legacy 全部不强制，`audit verify` 对 C-001 仍 `ok: true`。
- 不迁移、不改写 C-001 的任何文件（冻结清单见 `C001_FREEZE.md`）。

## 未解决的问题（继承到 V0.2.0）

1. **A4 篇幅占优**：无字数上限，只靠 `unclaimedChars` 披露；红队 23 次攻击里唯一未被挡住的制度缺口之一。
2. **A11 批量申报**：制度不挡「把所有值都申报」，因为闸门只判有无声明——这是 C-001 已认定的边界（并入 P-001）。
3. **I-14**：把关键论证藏在散文里不写进 claims，`unclaimedChars` 会低估它。
4. 登记员与法官在实践中仍是同一人（`clerk-ci` / `judge-ci`），本轮只保证「不是作者、不是提交人」；真正的角色分离要靠独立 subagent，成本见 `COST_MODEL.md`。

## 改动文件

`src/court.mjs`、`bin/court.mjs`、`test/court.test.mjs`、`test/redteam.mjs`、新增 `docs/C001_FREEZE.md`、`docs/ORDER_BIAS_TEST.md`、`docs/COST_MODEL.md`、本文件、`docs/VERIFICATION_V011.md`、`docs/ROLLBACK.md`、`docs/V020_PLAN.md`、`docs/proposals/C-002-probe-vs-gate.md`。
