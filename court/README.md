# court/ — 交付法庭（制度治理原型）

> 本目录是 [game-de-ai](../README.md) 仓库的一部分。上手指南见根目录 README；这里保留法庭自身的架构、程序与案卷说明。

把英美对抗制、冰岛自由邦分布式执行、张居正考成法做成**可运行的制度**，不是给 Agent 换名字。
只治理 GAME DE-AI 本身；法庭是横向独立审查层，不是第四省。

## 目录

```
src/court.mjs          引擎（零依赖 ESM）：案件状态机、证据、书状、交叉询问、陪审、裁决、考成、先例、审计
bin/court.mjs          CLI：全部动作的唯一入口
test/court.test.mjs    10 个测试：每条制度规则都能被违反、被拒绝、被审计发现
cases/<案件id>/        案件档案（case.json、jury/*.json 密封、tasks/*.json）
precedents/index.json  先例库（含项目绑定与失效状态）
ledger/tasks.json      考成台账（跨案，含逾期）
audit/log.jsonl        追加式哈希链日志（每条 prev+hash）
docs/                  架构 / 程序 / 证据与先例 / 考成 / 制度攻击 / 真实案件报告 / 对照 / 未解决问题
```

## 运行

需要 Node ≥ 22，零依赖、无安装步骤。命令在仓库根目录执行（或在 `court/` 内省略 `--root court`）：

```bash
npm test                                                          # 27 个测试（3 个文件）
node court/bin/court.mjs case list --root court                   # 案卷清单
node court/bin/court.mjs audit verify --root court                # 哈希链 / 陪审密封 / 悬空证据 / 自验 / 逾期
node court/bin/court.mjs metrics show --root court                # 每案与全局统计
node court/bin/court.mjs log show --tail 20 --root court          # 审计日志
```

参数顺序是 **组 → 动作 → 选项**（`case list --root court`）；把 `--root` 放最前面会打印用法。
红队：`cd court && node test/redteam.mjs`（重算 `docs/REDTEAM_RESULTS.json`）。

所有写操作都经过 `src/court.mjs` 的守卫函数；违规一律抛 `CourtError`，CLI 打印 拒绝码 并 exit 1。

## 制度硬规则（被测试锁住）

- 方案作者不得任法官；控辩不得任法官；执行人不得验收自己。
- 裁决必须写 ≥20 字理由；每个论点必须挂已入卷证据；少数意见必须落档。
- 陪审必须写理由（≥10 字），不得重复投票，每人一份带 sha 密封的独立文件（审计会重算 payload，改一个字就红）。
- 高风险案件未记录制度攻击不得裁决；调用七轮必须说明目标与停止条件。
- 跨项目先例不得作为绑定先例；失效/被推翻先例不得引用。
- 任务必须带期限与验收标准；证据文件必须真实存在；有未销任务不得结案。

## 限制（写在前面）

- 独立性只有"独立上下文 + 不同输入包"这一层；同一底模的系统性偏差未消除。
- 陪审 n=5 不构成统计保证。
- token 未插桩，成本对照见 `docs/AB_COMPARISON.md` 的诚实标注。
- 逾期只记录不通知；无跨案依赖。

## 变更记录

- 2026-11-15 初始版本：引擎 + CLI + 10 测试 + 真实案件 C-001 + 制度攻击记录。
- 2026-11-25 开源整理：测试扩到 27 条（3 个文件）、fixtures 收进仓内、去掉对私有目录的路径依赖、CLI 命令名与 README 对齐。
