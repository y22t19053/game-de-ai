# 证据与先例管理规范 V0.1

## 1. 证据的十一个字段（`evidence add` 强制）

| 字段 | 说明 | 拒绝码 |
|---|---|---|
| `id` | 自动编号 `E001`… | —— |
| `kind` | raw/run/external/expert/inference/assumption/judgment | `BAD_EVIDENCE_KIND` |
| `source` | 文件路径、URL、命令输出位置 | —— |
| `claim` | 它支持的具体主张（一句话，可被反驳） | —— |
| `confidence` | high/medium/low | `BAD_INPUT` |
| `verified` | 是否**独立**验证过 | 推论标 verified → `EVIDENCE_LAUNDERING` |
| `conflict` | 提交者与该主张是否有利益关系 | —— |
| `scope` | 适用到哪个项目/哪一屏/哪一版 | —— |
| `against` | 可能反驳它的反证或限制 | —— |
| `at` | 时间戳（程序写，不可改） | —— |
| `actor` | 提交者 | —— |

## 2. 七类证据与它的"证到哪一步"

| 类型 | 能证明 | 不能证明 |
|---|---|---|
| `raw` 原始事实（源码行、截图、语料） | 存在性 | 好坏 |
| `run` 实际运行结果（脚本输出、构建失败） | 行为 | 普适性 |
| `external` 外部研究与公开资料 | 别人观察到什么 | 本项目成立 |
| `expert` 专家意见（含门下省封驳单） | 有理由的判断 | 事实 |
| `inference` 模型推论 | 假设 | **绝不能标 verified** |
| `assumption` 未验证假设 | 待检验 | 任何结论 |
| `judgment` 用户主观判断 | 偏好 | 通用规则 |

**三条铁律**：①推论不得包装成实测（`EVIDENCE_LAUNDERING`）；②单项目成功不得升级成跨项目规则（先例有 `project` 绑定）；③"没发现问题"不等于安全（`audit` 不通过 ≠ 制度有效，需要压力测试）。

## 3. 举证责任

- 提案方：收益、成本、可行性、必要性，四项各自要有证据；
- 指控方：每条具体指控自行举证（`FINDING_WITHOUT_EVIDENCE` 拦裁决论点）；
- 重大风险：不能以"暂未发现"结案，只能 `stay` 或 `pilot`；
- 不可逆决策：要求更高证明等级（至少一条 `run` + 一条独立 `external`）；
- 证据不足：允许 `insufficient`，不强迫二元裁决。

## 4. 先例四种状态

| 状态 | 效力 | 引用要求 |
|---|---|---|
| `binding` | 同项目同版本同类事实有较强约束 | 必须说明事实是否相同、重要差异 |
| `reference` | 只作参考 | 必须说明差异 |
| `invalid` | 失效（前提变了） | 不得引用（`PRECEDENT_DEAD`） |
| `overruled` | 被推翻 | 不得引用；推翻须留新证据与理由 |

**跨项目禁止绑定**：`bistro-rush` 的先例不能作为 `little-zelensky-simulator` 的"法律"（`PRECEDENT_CROSS_PROJECT`）。这条是硬规则，因为《小泽模拟器》的视觉规则来自它自己的题材与用户裁决，不是通用设计原则。

引用时必须回答四问：适用范围、事实是否相同、重要差异、是否需要重审。答不出就降级为 `reference`。

## 5. 推翻先例

只有当出现以下之一才受理：①新证据使原结论不再成立；②原裁决推理存在可指出的缺陷；③适用范围被证明误用。推翻本身是一个新案件，须经同一套程序，不得在裁决里顺手改掉。

## 6. 档案结构

```
cases/C-001/
  case.json          # 状态、书状、证据摘要、争议点、交叉询问、陪审、裁决
  jury/j1.json ...   # 每份含 sha 密封，审计会重算 payload
  tasks/T001.json
  ruling.md          # 人类可读裁决（可选，程序以 case.json 为准）
precedents/index.json
ledger/tasks.json    # 考成台账（含逾期与延期原因）
audit/log.jsonl      # 追加式哈希链日志
```

## V0.1.1 补充：独立证据登记与状态机

| 状态 | 谁能做 | 引擎函数 | 说明 |
|---|---|---|---|
| `submitted` | 任何一方（控、辩、作者、登记员） | `submitEvidence` | 只拿到候选编号 `S###`，不可被引用 |
| `registered` | 登记员（≠提案作者、≠提交人） | `registerEvidence` | 转正为 `E###`，记 sourceRef/version/hash |
| `admitted` | 法官 | `decideEvidence` | 必须写理由；作者本人不得采信（`AUTHOR_CANNOT_ADMIT`） |
| `rejected` | 法官 | `decideEvidence` | 留痕，可被后续质疑解除 |
| `challenged` | 任何一方 | `challengeEvidence` | 须给质疑理由；不改变 admission 状态 |
| `withdrawn` | 提交人 | `withdrawEvidence` | 须给理由；撤回后不得再被引用 |

**审计强制**（仅对新 schema 案件）：`BAD_EVIDENCE_STATE`、`REGISTRAR_IS_AUTHOR`、`REGISTRAR_IS_SUBMITTER`、`AUTHOR_CANNOT_ADMIT`、`EVIDENCE_DECISION_WITHOUT_REASON`、`CITED_NON_ADMITTED_EVIDENCE`、`EVIDENCE_SOURCE_MISSING`（source 像路径时必须真实存在）。

**legacy 兼容**：无 `state` 字段的旧证据一律视同 `admitted`，旧案不适用上述强制（C-001 保持 `audit verify` 全绿）。
