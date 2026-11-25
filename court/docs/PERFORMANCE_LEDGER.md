# 考成与执行核销规范 V0.1

「一事一责、一事一证、一事一销、逾期不免责」。考成法在这一版里只做一件事：**让"做完了"变成可核验的记录**，而不是让报告更好看。

## 1. 每条任务必须有的字段

| 字段 | 规则 |
|---|---|
| `id` | 程序生成 `T001` |
| `deliverable` | 具体交付物（"完成方案"不算；"生成 style.json + build-check.mjs"算） |
| `owner` | 单一责任人，不得写"团队" |
| `deadline` | 必填，缺失即 `BAD_INPUT` |
| `acceptance` | 可验收标准（能被第三方执行的检查） |
| `evidence` | 提交时必填路径，且文件必须真实存在 |
| `status` | 待执行/执行中/待验收/验收通过/验收失败/逾期/取消 |
| `verifier` | 验收人，不得等于 owner |
| `verifiedAt` | 核销时间 |
| `delayReason` | 延期须写原因，原期限保留不改 |

## 2. 七条硬要求与它们的实现

| 要求 | 实现 | 拒绝码 |
|---|---|---|
| 完成报告 ≠ 任务完成 | 必须提交报告（≥10 字）+ 证据文件 | `TASK_NEEDS_REPORT` / `TASK_NEEDS_EVIDENCE` |
| 文件存在 ≠ 功能可用 | 验收标准写在任务里，由验收人按标准核销 | ——（人/制度责任） |
| 测试通过 ≠ 设计目标实现 | 裁决里区分"测试证据"与"目标证据" | —— |
| 责任人不能自行验收 | `verifier !== owner` | `SELF_VERIFICATION` |
| 延期不抹除原期限 | 改期限必须留 `delayReason`，原值保留在历史 | `BAD_INPUT`（无理由） |
| 处罚不代替修复 | 取消任务必须写原因，问题仍留在案卷 | `CANCEL_NEEDS_REASON` |
| 未完成不得改名拆分关闭逃责 | 结案前必须全部核销 | `TASKS_OPEN` |

## 3. 防止考成法异化（张居正教训）

考成法真正的风险不是不执行，是**指标异化**：

1. **只数任务数**：一个案件被拆成十个微任务，完成率 100%，问题还在 → 裁决必须写"实质目标"，指标只作下限。
2. **只按期率**：全在期限内完成但验收标准被写软 → 验收标准必须可被第三方执行。
3. **形式合规**：证据文件存在但内容无关 → 验收人必须在 `note` 里写"证据与主张的一致性"判断。
4. **逾期一刀切处罚**：会诱导报小任务、报假进度 → 本版只记录逾期，不自动处罚；逾期进入审计报告，由人判断。
5. **考核压力传导到质量**：`audit` 只查形式（链、密封、悬空证据），不查质量；质量由陪审与用户裁决负责，两者不得互相替代。

## 4. 状态流转

```
待执行 ──submit──▶ 待验收 ──verify(pass)──▶ 验收通过
   └─────────────── verify(fail) ──▶ 验收失败（可重新提交，历史保留）
任意未结 ──cancel(理由)──▶ 取消
逾期：deadline < now 且未通过 → audit 报 TASK_OVERDUE（状态不变，避免"改状态即免责"）
```

## 5. 台账与报表

`ledger/tasks.json` 是唯一真相；`metrics` 输出：

- per-case：任务数、通过数、逾期数、平均核销时长；
- totals：案件数、裁决分布、逾期率、自验拦截次数（来自审计问题计数）。

报表只作**入口**，任何"看起来很好"的数字都要能追到 `evidence` 路径。数字好看不算通过。

## 6. 已知不完善

- 没有工作量估计字段，无法区分"2 小时任务"与"2 天任务"；
- 没有跨案件依赖（A 案的任务依赖 B 案的裁决）；
- 逾期不自动通知，只在审计时暴露；
- token 成本未插桩（见 `docs/AB_COMPARISON.md` 的诚实说明）。

## V0.1.1 补充：验收 checklist 与成本字段

**验收**：每条任务核销除「报告 ≥10 字 + 证据路径存在」外，还必须给 `checks`：

| 字段 | 必填 | 含义 |
|---|---|---|
| artifactsOpened | 是 | 直接打开原始材料（不是只看报告） |
| versionChecked | 是 | 核对版本 / commit / sha |
| contentRechecked | 是 | 独立复算内容 |
| recomputed / doubleCountChecked / omissionChecked | 至少一真 | 算对 / 不重复计数 / 不选择性遗漏 |

另：`artifacts[]` 路径必须存在且写 sha256；note ≥20 字；执行人自验 → `SELF_VERIFICATION`；材料消失 → 审计 `TASK_EVIDENCE_GONE`。

**成本**：`cost = { tokens, tokensSource, calls, apiCostCNY, humanSteps, humanMinutes, maintenanceMinutes, unavailable[], notes[] }`。初始五个字段为 `null` 并登记在 `unavailable`；`recordCost` 只接受非负值或 `'unavailable'`；审计拒绝 `COST_WITHOUT_SOURCE` / `COST_ZERO_WITHOUT_SOURCE` / `COST_UNCLEARED_UNAVAILABLE`；`metrics` 汇总时任一案缺失即输出字符串 `'unavailable'`，不给看似完整的小数字。

口径与不可得原因见 `docs/COST_MODEL.md`。
