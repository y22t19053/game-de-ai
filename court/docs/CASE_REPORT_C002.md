# C-002 案卷报告：G2「提笔测试」做门禁还是探针

**案件**：C-002｜**类型**：ordinary（轻量庭）｜**项目**：`game-de-ai`（治理对象本身）｜**提案作者**：lead
**争议点**：D01 —— 在无三案差异测试、无 owner 的前提下，G2 应做成门禁、探针，还是两者都暂不做而先补测量？
**日期**：2026-11-15

## 一、为什么开这一庭（不是造案）

V0.3 前沿报告的 §I 把 G2（提笔测试）放进 P0，但**没有定它的地位**：是一道拦住创作的门禁，还是一个不拦路只记事的探针。两者成本、失败判据、对创作流程的侵入完全不同，且 G1（闭合文法）在 C-001 被裁为 `pilot` 之后，G2 是下一个要动的 P0。这一庭用 V0.1.1 的新程序重走一遍完整流程，同时真正裁决这个悬而未决的设计问题。

## 二、参与者与独立性

| 角色 | 身份 | 独立性说明 |
|---|---|---|
| 提案方 | lead | 案件作者，按规则不得任法官 |
| 控方 | `c002-pros`（fresh subagent） | 只读提案与证据目录；主张「门禁与探针都不该现在做」 |
| 辩方 | `c002-def`（fresh subagent） | 同上；主张「采纳探针并升级为具名归档裁决」 |
| 陪审 j1 / j2 / j3 | 三个 fresh subagent | 各自先写密封初判（未读书状），再读书状与质询，写终票 |
| 法官 | `c002-judge`（fresh subagent） | 非作者、非控辩、未参与前序 |
| 登记员 / 采信人 | `clerk-ci` / `judge-ci` | **已知弱点**：实际都是 lead 在跑 CLI（I-16） |
| 验收人 | `c002-verifier`（fresh subagent，待执行） | 不得由执行人自验 |

## 三、程序时间线（11 步）

1. **登记案件** `case open --id C-002 --type ordinary --project game-de-ai --author lead`，schema `v0.1.1`。
2. **提交方案** `docs/proposals/C-002-probe-vs-gate.md`（含失败判据与成本上界）。
3. **控辩举证**：E001 提案本身（G2 只进 P0、未定形态）、E002 `_research/v03_frontier/negation/r1.md`（三案是否真不同无 owner 无 test）、E003 `_research/v03_frontier/academic.md`（Doshi & Hauser 2024：AI 抬地板削尖峰）。三条均走完 `submit → register → admit`，采信理由写明 E003「不得外推到单件作品」。
4. **密封初判**：j1/j2/j3 全部 `conditional`；j1、j2 在书状入卷前入库，j3 迟到（见 §六）。
5. **书状**：控方 4672 字 / 3 条主张（`unclaimedChars` 4540），辩方 4803 字 / 3 条主张（4551）。所有主张都绑 admitted 证据。
6. **争议点** D01 形成。
7. **交叉询问 2 轮**：第 1 轮问辩方「2/2 交接判据是不是自我承诺」，答「无条件接受判失败，用 `g2_ledger.jsonl` + git sha 时序核验」；第 2 轮问控方「补测量是否与门禁同类」，答「是同类的一半，但风险位置不同，且给出 20 分钟盲配作为零新工具起点」。
8. **终票**：j1 `conditional`、j2 `reject`、j3 `conditional`（2:1）。三人均给了 `supports`、`against`/`noCounter`、`wouldChange`，j1/j2/j3 各留了少数意见。
9. **裁决**：见 §四。
10. **执行与验收**：见 §五。
11. **先例**：见 §四。

## 四、裁决

**法官** `c002-judge`（fresh，非作者非控辩）｜**裁决** `pilot`｜**攻击轮** 0 轮（ordinary 的 crossMin=1 已由 2 轮质询满足；剩余不确定只能靠产物级取证结清）
**裁决全文**：`_research/court_case_c002/ruling.md`（205 行，6718 汉字 + 机器块 19 行）；入卷文本存 `cases/C-002/case.json` 的 `ruling.reason`。

### 4.1 一句话裁决

G2 **只批「探针」这一形态，且只作一次性试点**；**门禁不批，且无附加条件可救**；「两者都不做、先补测量」不采纳，但它要求的盲配被吸收为必经条件。

### 4.2 为什么 `pilot` 而不是 `conditional`

`conditional` 的语义是「机制成立、条件待满」——窗口结束后机制**默认存续**。本案证据要求的是窗口结束后**默认终止**：G2 尚不具备「具名 owner + 可算的判据」两项要件，写 `conditional` 会让它在测量缺席的情况下默认常驻。

### 4.3 三条核心理由

1. **止损阀不可按**：门禁唯一停杀判据依赖「三案差异七维 ≥4 的比例」，而该比例既无 owner 也无 test（E001/E002 同源，只有一份证据强度），判不出「没上升」→ 门禁永不被判无效。
2. **开启判据悬空**：「什么算写出来了」未定义，准入只剩空/非空，作用面收窄到「一个字都不写」这种最罕见情形。
3. **摩擦与受损错位**：无具名裁决人、无时限、无误挡返还，且唯一举证方与唯一受损方同一人。

### 4.4 八条 FINDING（全部只挂 E001–E003）

| 级别 | 认定（摘要） |
|---|---|
| P0 | 门禁的唯一止损判据依赖三案差异七维比例，该比例无 owner 无 test，故门禁永不被判无效 |
| P0 | 若把 G2 任何读数登记为「R1 第 14 条已补足」，法庭将制造第二份无 owner 无 test 且带背书的假账 |
| P1 | 无 test 使门禁准入判据悬空，实际只落在空/非空 |
| P1 | 探针的句级判据与作品差异是两个量（换措辞可保收敛；同一句可做出不同作品），双向漏 |
| P1 | 探针的决定性判据是两次开工的时间戳先后，测的是「制度有没有被读过一次」 |
| P1 | E003 只能用于选择测量维度（跨作品相似度），不得从个体推到集体 |
| P2 | E001 与 E002 同源，不得加倍计算 |
| P2 | 「两者都不做」在同一缺口上与本裁试点等价，差别只在窗口内是否产出可结清的信息 |

### 4.5 六条执行条件（可被第三方按文件核验）

| 条件 | 内容 | 核验人 |
|---|---|---|
| C1 | `cases/C-002/g2_ledger.jsonl` 只追加，3 创作行 + 2 交接行，交接 `sha` 早于对应 `ui_file` 首次提交（`git log --diff-filter=A`），记 `minutes_spent` | judge-c002 |
| C2 | `class` 只能由写句人以外者写入/复核并记 reviewer；无第二人则删 `class` 只留原句；混用即不成立 | judge-c002 |
| C3 | 窗口内至少一次盲配写入 `cases/C-002/g2_blindmatch.md`（具名非作者参与者、≥2 份去标识产物、分组结果与耗时）；未完成即记「读数缺失」，不得续期 | judge-c002 |
| C4 | 任何纪要不得出现「G2 已补足/覆盖 R1 第 14 条」，须出现「G2 读数不构成三案已不同的证据」；违反则试点自始无效 | clerk-ci |
| C5 | 零阻断：台账不得出现 BLOCK / REWORK / APPEAL 事件行 | judge-c002 |
| C6 | 记录 <5 条时不得给「同款率达标/超线」结论，只能并列留档待第 5 条 | judge-c002 |

### 4.6 先例 P-002（binding，项目 `game-de-ai`）

> 当关键测量既无具名 owner 又无可执行 test 时，带阻断的机制一律不得上线；只记录不阻断的探针至多可作一次性、写死范围与失败判据的 pilot，且其读数不得被登记为该测量已补足的证据。

引用须回答四问：适用范围是否同为「测量缺席」而非「测量不足」；事实是否同为提案方自设成败判据且判据落在同一缺口上；重要差异是否为已有具名 owner 与可算比例；是否须重审。答不出降为 `reference`；跨项目不得绑定。

### 4.7 法官自陈最可能被挑战之处

「我批准了一个自己写在纸上『测不到差异』的仪器。」防线是结构性的（pilot 可结束、C3 强制取一次产物层读数、C4/C6 禁止定性），**不是实证性的**——该自陈已原文保留在 `ruling.md` §7.1，不美化。

## 五、执行与验收

### 5.1 派生任务（先裁后派）

| 任务 | owner | 期限 | 交付物 | 验收标准（第三方可执行） |
|---|---|---|---|---|
| T01 | lead | 2026-11-18 | `tools/g2_ledger_check.mjs` + `cases/C-002/g2_ledger.jsonl` | 对三份故意造错样本各返回非零并打印失败行号；对合规样本返回 0；由非 lead 验收人独立复跑 |
| T02 | clerk-ci | 2026-11-17 | `cases/C-002/g2_ban.md` | ≥6 行禁止/允许对照，覆盖三类表述，每行可 grep 定位，与裁定第五/七节一致 |

### 5.2 执行实况

- **T01**：核验器实现 C1（创作行字段、`n` 去重、交接行 `read_of=n-1`、缺交接行即 `HANDOFF_MISSING`、时序靠 `--ui-commits` 映射或 `--git` 取首次提交）、C2（`CLASS_WITHOUT_REVIEWER` / `SELF_REVIEW` / `CLASS_MIXED`）、C5（`BLOCKING_EVENT`）、C6（只报告条数、不判同款率），退出码 0/1/2。真实台账已建（6 行 schema 注释、0 条记录）；5 份样本实测见 `cases/C-002/g2_ledger_check_evidence.txt`：合规 `exit=0`；缺交接行 `exit=1`（两处 `HANDOFF_MISSING`）；交接晚于 UI 首次提交 `exit=1`（`HANDOFF_AFTER_UI`）；class 无 reviewer 且混用 `exit=1`（`CLASS_WITHOUT_REVIEWER` + `CLASS_MIXED`）；含 BLOCK 事件 `exit=1`（`BLOCKING_EVENT`）。
- **T02**：`cases/C-002/g2_ban.md` 10 行对照表 + 复核 grep 清单。
- 两项均 `task submit` 附证据路径；**验收由独立验收官执行**（见 5.3），执行人未自验。

### 5.3 独立验收

**验收官** `c002-verifier`（fresh subagent；非作者、非执行人）｜**判定** T01 通过、T02 通过｜报告与 checks：`_research/court_case_c002/verify/VERIFY_T01_T02.md`、`c002_checks_T01.json`、`c002_checks_T02.json`｜入库时间 T01 `09:36:01.902Z`、T02 `09:36:05.127Z`。

验收官**独立复跑**（未采信执行人自报），5/5 与自报逐字一致：合规 `exit=0`；缺交接行 `exit=1`（line 4/5 `HANDOFF_MISSING`）；交接晚于 UI 首次提交 `exit=1`（line 5 `HANDOFF_AFTER_UI`）；class 无 reviewer + 混用 `exit=1`（line 3 `CLASS_WITHOUT_REVIEWER`、line 1 `CLASS_MIXED`）；含 BLOCK `exit=1`（line 4 `BLOCKING_EVENT`）。并确认失败行号是**文件真实行号**（唯 `CLASS_MIXED` 的 line 1 是全局错误硬编码，已记 I-19）。

验收官另做了核验器**加跑探针**，发现五项口径缺口，全部如实记入 `OPEN_ISSUES.md` 而不掩盖（见 I-18～I-23）：
1. 时序默认静默跳过——不传 `--ui-commits` 时 `handoff_late` 也 `exit=0` 且零告警；
2. `--git` 实测无效（`ui_file` 不在法院仓库，只有 `NO_UI_COMMIT` 警告且警告不影响退出码，异常被空 catch 吞掉）；
3. 不校验「3 创作行 + 2 交接行」完整性（1 创作行 0 交接行仍 `exit=0`）；
4. C2 的「reviewer ≠ 写句人」依赖可选的 `writer` 字段，无 `writer` 时恒不报 `SELF_REVIEW`；
5. 时序比的是自报 `sha_date`，`sha` 只查存在不解析内容（属裁定 §7.2 已承认的边界）。

**验收后修正（已披露，不当作验收通过的一部分）**：`g2_ban.md` 附录 grep 清单原写法有缺陷（路径写成 `cases/C-002/CASE_REPORT_C002.md` 而实际在 `docs/`；且「命中即违规」规则会自伤，因为 glob 里只有 `g2_ban.md` 自己）。已修路径与判定规则，并在 `OPEN_ISSUES.md` 记为 I-23；`g2_ledger.jsonl` 首行注释补上 C4 要求的那句原句。

审计：`audit verify` → `ok:true`、`problems:[]`，仅既有 `JURY_INITIAL_LATE(c002-j3)`（与本两项无关）。

## 六、本轮如实记下的程序问题

1. **j3 初判迟到**：初判文件 17:19 已写，入库命令晚于书状（CLI 参数遗漏）。V0.1.1 允许带 `lateReason` 入库并记 `late:true`，审计以 `JURY_INITIAL_LATE` 警告披露。**没有把它当密封初判豁免**：其独立性按「自陈 + 文件时间戳」计，裁决书需对此表态。
2. **claims 手工提取**：`_tools/parse_claims.mjs` 从书状尾部 CLAIMS 块抽条目，本轮靠打印数量核对（3/3）；若格式漂移会静默少条（I-17）。
3. **登记员与法官同人**：`clerk-ci`/`judge-ci` 都是 lead 在跑 CLI，规则只保证「非作者、非提交人」（I-16）。
4. **主张覆盖率极低**：两份书状 `unclaimedChars` 都在 95% 左右——说明论证主体在散文里，`judgeSummary` 的披露机制只能提示、不能评价（I-14）。
5. **两票 conditional 一票 reject**：不是「多数通过」就自动成立；裁决必须处理少数意见（j2 的「两个形态都不该做」被写进少数意见，且其 `wouldChange` 给了一条产物级读数的翻盘条件）。

## 七、成本（P0-5）

`cost:set` 记录：`calls=13`、`humanSteps=20`、`humanMinutes=95`（自报，口径见 `COST_MODEL.md`）、`maintenanceMinutes=25`；`tokens` 与 `apiCostCNY` **unavailable**（脚本拿不到账单级数据）。`metrics` 汇总时这两项显示 `'unavailable'`，不给看似完整的小数字。
