# 案件处理程序 V0.1

状态机被写死在 `src/court.mjs` 的 `STAGES` 与各函数守卫里；`bin/court.mjs` 只暴露允许的转换。任何越阶操作都会被拒绝并返回错误码。

## 1. 状态机

```
opened ──fileBrief──▶ briefing ──raiseDispute──▶ disputed ──addCrossRound──▶ crossexam
   └─────────────────raiseDispute──────────────────┘                              │
                                                              castJury ◀───────────┘
                                                                 │
                                                              jury ──rule──▶ ruled/executing ──close──▶ closed
```

- `opened`：立案，必须挂提案文件路径（`PROPOSAL_MISSING` 拦）。
- `briefing`：控辩各自提交书状（每侧一份；改须理由并留历史）。
- `disputed`：**必须显式形成争议点**，否则不许交叉询问（`NO_DISPUTE` 拦裁决）。
- `crossexam`：每轮必须挂证据编号，且证据必须已入卷（`EVIDENCE_NOT_FOUND` 拦）。
- `jury`：轮次达到类型门槛后才能投票（`JURY_TOO_EARLY` 拦）。
- `ruled`：裁决必须写理由、挂论点证据、记少数意见、必要时记制度攻击与轮次理由。
- `closed`：所有执行任务必须已核销（`TASKS_OPEN` 拦）。

## 2. 十一项必经动作（缺一不成立）

1. 提交方案（文件落盘，路径入档）
2. 登记案件（`case open`：类型、项目、作者、摘要）
3. 控辩举证（`brief file` ×2，`evidence add` ×N）
4. 形成争议点（`dispute raise`，必须挂证据）
5. 交叉询问（`cross add`，每轮问/答/证据）
6. 独立陪审（`jury cast` ×≥门槛，每人一份密封文件）
7. 形成裁决（`judge rule`：证据、推理、风险、条件、少数意见）
8. 生成执行任务（`task create`：交付物/期限/验收标准/验收人）
9. 提交交付证据（`task submit`：报告 ≥10 字 + 证据文件须真实存在）
10. 独立验收核销（`task verify`：验收人不得是执行人）
11. 保存先例（`precedent add`：范围 + 项目绑定）

## 3. 七种裁决

| 裁决 | 含义 | 对执行的要求 |
|---|---|---|
| `approved` | 批准 | 按裁决条件执行 |
| `conditional` | 附条件批准 | 条件须逐条可验收，写进任务 |
| `pilot` | 限定范围试点 | 必须写死范围与失败判据 |
| `stay` | 暂缓补证 | 不派执行任务，回到举证 |
| `dismissed` | 驳回 | 保留理由，允许重新立案 |
| `remanded` | 发回重审 | 指明须补的程序或证据 |
| `insufficient` | 证据不足 | 与 stay 的区别：主张本身不可证 |

裁决三个硬要求：`reason` ≥20 字；每个 `finding` 必须挂已入卷证据编号（`FINDING_WITHOUT_EVIDENCE`）；少数意见必须落档（`MINORITY_NOT_RECORDED`）。

## 4. 交叉询问规则

- 每轮只问一个问题，由质询方指定证据；
- 回答不得"补充新证据"（新证据须先入卷再引用）；
- high 案 ≥3 轮，且至少一轮针对"失败路径"；
- 法官可在裁决里指出"某轮质询无效"，但不得删除记录（追加式日志）。

## 5. 利益回避

- 方案作者不得任最终法官（`JUDGE_IS_AUTHOR`）；
- 控辩任一方不得任法官（`JUDGE_IS_ADVOCATE`）；
- 同一 juror 不得投两次（`DUPLICATE_JUROR`）；
- 执行人不得验收自己的交付（`SELF_VERIFICATION`）；
- 角色切换须在书状里写明（"本轮以检察视角"），原始立场不得被覆盖。

## 6. 命令清单（`bin/court.mjs`）

```bash
node bin/court.mjs case open   --id C-001 --title "..." --type major --project bistro-rush --proposal <path> --author lead --summary "..."
node bin/court.mjs evidence add --case C-001 --kind run --source <path> --claim "..." --confidence high --verified
node bin/court.mjs brief file  --case C-001 --side prosecution --author p1 --text "..."
node bin/court.mjs dispute raise --case C-001 --point "..." --by p1 --evidence E001
node bin/court.mjs cross add   --case C-001 --q "..." --ask p1 --answer-by d1 --a "..." --evidence E001
node bin/court.mjs jury cast   --case C-001 --juror j1 --vote approve --reason "..." [--minority "..."] [--context ctx-1]
node bin/court.mjs judge rule  --case C-001 --judge judge-1 --verdict pilot --reason "..." --finding "major|主张|E001" --minority-recorded [--rounds 3 --rounds-why "..."]
node bin/court.mjs task create --case C-001 --deliverable "..." --owner o1 --deadline 2026-12-01 --acceptance "..."
node bin/court.mjs task submit --case C-001 --task T001 --report "..." --evidence <path>
node bin/court.mjs task verify --case C-001 --task T001 --verifier judge-2 --pass --note "..."
node bin/court.mjs precedent add --id P-001 --project x --title "..." --holding "..." --scope binding --from C-001
node bin/court.mjs redteam record --case C-001 --vector "..." --attempt "..." --outcome failed --weakness "..."
node bin/court.mjs case close  --case C-001 --by judge-1
node bin/court.mjs audit check
node bin/court.mjs metrics
```

`audit check` 每次校验：哈希链完整、陪审密封未被改、裁决不挂悬空证据、作者/控辩未任法官、high 案有制度攻击、少数意见在档、无自验、任务证据仍在盘、无逾期任务、已结案件无未销任务。

## 7. V0.1.1 程序变更（2026-11-15）

本节只写「程序上多了什么」，实现细节见 `docs/V011_CHANGELOG.md`。

**证据三段式（P0-1）**：任一方向法庭提交候选证据 `S###`（`submitEvidence`）→ 登记员转正为 `E###`（`registerEvidence`，禁提案作者、禁提交人自任）→ 法官裁定 `admitted` 或 `rejected`（`decideEvidence`，必须写理由）。状态机：`submitted → registered → admitted | rejected`，任一阶段可 `challenge`、`withdraw`（须理由，撤回只能撤自己的）。**登记不等于采信**；未被采信的证据不得出现在书状主张、争议点、裁决 findings 与陪审引证里。

**陪审两阶段（P0-2）**：先提交密封初判（`juryInitial`，写 `jury/<juror>.initial.json`），读书状之前或之后都可，但书状一旦入卷须给 ≥20 字 `lateReason`，审计以 `JURY_INITIAL_LATE` 警告披露；终票必须给 `supports[]` + （`against[]` 或 `noCounter`）+ `wouldChange`。

**书状（P0-3）**：`fileBrief` 要求 `claims[]`（每条 ≥4 字并绑 admitted 证据）；法官用 `judgeSummary` 先读结构化争议摘要（含 `unclaimedChars`），**不设字数上限**。

**验收（P0-4）**：`verifyTask` 要求 `checks`（artifactsOpened / versionChecked / contentRechecked 全真，且至少一项 recomputed / doubleCountChecked / omissionChecked）与 `artifacts[]`（路径存在，引擎记 sha256）。

**成本（P0-5）**：`cost` 初始为 null + `unavailable[]`；`recordCost` 写实测值；审计拒绝「有值无来源」与「无来源的 0」。

**新增 CLI**：`evidence submit|register|admit|reject|challenge|withdraw|list`、`brief file --claims-file`、`jury initial --late-reason`、`jury vote --supports/--against/--no-counter/--would-change`、`judge summary`、`task verify --checks-file --artifact`、`cost set`。
