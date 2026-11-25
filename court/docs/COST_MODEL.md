# 成本统计模型（V0.1.1 P0-5）

## 原则

**未测就是 `unavailable`，不写 0。** 制度里最容易发生的自欺是「这一栏填 0，看起来成本很低」。因此：

- `null` ＝ 没有测到，且必须同时登记在 `cost.unavailable[]` 里；不登记会被审计抓（`COST_UNCLEARED_UNAVAILABLE`）。
- 数字 ＝ 有来源的实测值；`tokens` 若为数字但 `tokensSource` 为空，审计报 `COST_WITHOUT_SOURCE`；若写成 0 且无来源，报 `COST_ZERO_WITHOUT_SOURCE`。
- `metrics` 汇总时，只要有一个案件的某字段是 `unavailable`，汇总值就写 `'unavailable'`，**不给一个看起来像总量的小数字**。

## 字段

| 字段 | 含义 | 本机可得性 | 记录方式 |
|---|---|---|---|
| `tokens` | 输入+输出 token | **不可得**：DSH 子代理与 CLI 调用不向脚本暴露账单级 token | 一律 `null` + 登记 unavailable |
| `tokensSource` | token 数的来源 | — | 若将来接入账单导出，填文件或接口名 |
| `calls` | 模型调用次数 | 可得（人工计数，按案件活动记录） | `cost:set --calls N` |
| `apiCostCNY` | 可核实的 API 费用 | **不可得**（无账单接口） | `null` + 登记 |
| `humanSteps` | 人工操作步骤数 | 可得（人工计数） | `--human-steps N` |
| `humanMinutes` | 人工耗时（分钟） | 可得但**是自报**，必须写清口径 | `--human-minutes N`，口径写进 notes |
| `maintenanceMinutes` | 单案维护成本（改规则/复跑） | 可得但自报 | `--maintenance-minutes N` |
| `notes` | 口径与估算依据 | — | 任意文本，审计不校验内容，但文件里必须能看懂 |

## C-001 / C-002 的实际情况（如实）

- **C-001**：`tokens`、`apiCostCNY`、`humanMinutes` 全部 `unavailable`。当时的记录里有一个 `humanMinutes: 0`，那是旧 schema 的默认值，不是实测；V0.1.1 的 `metrics` 已把 legacy 案按 `unavailable` 汇总，**不把那个 0 当成「零成本」**。
- **C-002**：`calls` 与 `humanSteps` 按活动计时人工记录；`humanMinutes` 为自报估计（含开庭、写书状、陪审、裁决的人工操作时间），口径写在 `notes`；`tokens` 仍 `unavailable`。
- 因此 `metrics show` 的 `totals.tokens` 与 `totals.humanMinutes` 会显示 `'unavailable'`——这是**正确输出**，不是 bug。

## 为什么不做「自动 token 采集」

1. DSH 的模型调用发生在宿主进程里，CLI 与脚本没有稳定接口拿到按案件的 token 用量；
2. 用字符数×系数反推 token 会造出一个**看起来像实测的估计值**，正是本制度要防的事；
3. 若要真接入，路径是：改用 DSH 的会话日志（zstd jsonl）按时间窗统计每条 assistant 消息的 usage 字段——这需要先验证日志里是否有 usage，属于下一阶段（V0.2.0）的候选工作，不在本轮承诺。

## 用法

```bash
node bin/court.mjs cost set --case C-002 --calls 12 --human-steps 9 --human-minutes 95 \
  --notes "人工耗时为自报：开庭 15 + 控辩 30 + 陪审 25 + 裁决与派活 25"
node bin/court.mjs metrics show --root .
```
