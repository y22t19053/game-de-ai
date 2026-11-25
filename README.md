# game-de-ai

> 让 AI 参与做的游戏，少一点 AI 味。

[![ci](https://github.com/y22t19053/game-de-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/y22t19053/game-de-ai/actions/workflows/ci.yml)
![node](https://img.shields.io/badge/node-%E2%89%A522-informational)
![license](https://img.shields.io/badge/license-MIT-blue)

一套「AI 做游戏」的验收装置，三样东西：

| 目录 | 是什么 | 拿什么证明它有用 |
|---|---|---|
| [`skills/`](skills/) | 七个作业规范（Markdown skill，给 AI 用）：需求、视觉、文案、视角、物料、摸底、交付 | 15 条铁律、分流三档、A–H 主流程、59 份制度档案 |
| [`court/`](court/) | 交付法庭：零依赖 Node，证据 / 争议 / 陪审 / 裁决 / 任务全留痕 | 20 个案卷、53 条证据、468 条哈希链日志、27 个测试 |
| [`docs/`](docs/) | 把它们接起来的三份规范 | 多执行端并行 / 三类证据 / 交付闸门 |

## 它解决什么问题

AI 让做游戏变快了，也让「糊」变快了。速度上去了，判断力没跟上，于是这些句子变得很便宜：

- 「截图我看过了，做好了。」——其实那是半年前的图。
- 「测试全绿，可以发了。」——测试全绿只证明测试写到了那里。
- 「已经上架了，完成。」——上架证明的是文件能下载，不是这游戏能玩。
- 「AI 评审说 8 分。」——AI 评审和 AI 作者是同一个底模。

这个仓库不加新功能，只做一件事：**把这些说法变成可查的事**。说「做好了」得指出哪张截图、哪次真机运行；说「好玩」得有人真的玩过；说「完成」得有一个不参与开发的人按清单验收过。

## 30 秒上手

```bash
git clone https://github.com/y22t19053/game-de-ai && cd game-de-ai
npm test                                              # 27 个测试
node court/bin/court.mjs metrics show --root court    # 20 个案卷汇总
node court/bin/court.mjs audit verify --root court    # 现在会报红，见下文
node court/bin/court.mjs case list --root court       # 案卷清单
```

CLI 参数顺序是 **组 → 动作 → 选项**：`case list --root court` 对，`--root court case list` 会打印用法。
可用组：`case evidence brief dispute cross jury judge task precedent redteam cost audit metrics log`。

证据流转：`submit → register → admit | reject`（`challenge` / `withdraw` 另记）。
陪审：`jury initial`（读书状前）→ `jury vote`（须 `--supports` 与 `--no-counter`，或 `--against`）。

## court 是什么

不是给 Agent 换个「法官」的名字，而是把英美对抗制、冰岛自由邦的分布式执行、张居正的考成法写成**会拒绝你**的代码。零依赖 ESM，一个 `src/court.mjs` 加一个 CLI。

被测试锁住的规则（每一条都先违规、再断言被拒——只测顺利路径不算测规则）：

- 方案作者不得任本案法官；控辩不得任法官 —— `JUDGE_IS_AUTHOR` / `JUDGE_IS_ADVOCATE`
- 执行人不得验收自己的产出 —— `SELF_VERIFICATION`
- 模型推论不得标记为「已独立验证」 —— `EVIDENCE_LAUNDERING`
- 裁决须 ≥20 字理由，每个论点必须挂一条已入卷证据 —— `NO_EVIDENCE_CITED` / `EVIDENCE_NOT_ADMITTED`
- 陪审每人一份带 sha 密封的独立文件，改一个字审计即红 —— `JURY_SEAL_BROKEN`
- 跨项目先例不得作绑定先例；失效或被推翻的先例不得引用 —— `PRECEDENT_CROSS_PROJECT` / `PRECEDENT_DEAD`
- 任务必须带期限与可被第三方执行的验收标准（≥10 字），否则不许派；交付不得只报「完成了」
- 有未销任务不得结案；尚未裁决不得派执行任务 —— `NO_RULING`
- 引用的证据文件必须真实存在 —— `EVIDENCE_SOURCE_MISSING`

## 实测数据（不是宣传语）

20 个案卷（重大 8 / 普通 10 / 高风险 2）、53 条证据、31 轮交叉询问、65 张陪审票、22 个任务、43 个缺陷记录、468 条哈希链审计日志。

**现在的 `audit verify` 是红的**：75 条问题 = 11 条「证据文件已不在」（这些任务的证据原本在作者本机的私有目录，不进公开仓）+ 9 条逾期任务 + 55 条「初判迟到」（书状入卷之后才补记初判）。这不是 bug。制度把「你没按时做」和「你引用的东西已经不在」都记下来，而不是替你掩盖；逾期只记录、不自动追缴（见「限制」）。**一个永远绿的审计器没有价值。**

红队 23 次攻击，挡住 21 次。没挡住的两处不打算补：

- **A4 用篇幅占优压倒对方**：纪律层不设字数上限，800 字只讲一条主张也算过闸（已知弱点 I-01）
- **A11 批量申报把闸门刷绿**：闸门只保来源力、不保收敛力（C-001 裁决认定的设计边界）

弱点写在文档里，比写在事后复盘里便宜。

## 限制（写在前面）

- 「独立性」只有「独立上下文 + 不同输入包」一层。同一底模的法官，独立性是打折的。
- 陪审 n=5 不构成统计保证，只是「多一个人看一眼」。
- token 成本未插桩。`metrics show` 里的 `"tokens": "unavailable"` 就是它诚实的地方，不编数字。
- 逾期任务只记录不通知，无跨案依赖，无双人并发写测试（单人使用场景，写入串行）。

## skills/：七个作业规范

按一个项目的生命周期排，详见 [`skills/README.md`](skills/README.md)。

| 阶段 | 技能 | 一句话 |
|---|---|---|
| 动手前 | `prompt-contract` | 把一句「优化一下」变成 9 字段任务书 |
| 动手前 | `project-audit` | 只读摸底：「文档 vs 现实」冲突表，0 行改动 |
| 做的过程 | `game-de-ai` | 视觉与文案主流程：定向 → 规范 → 素材 → 实施 → 真实预览 |
| 做的过程 | `poster-brief` | 当天要发的海报：4 行 brief → 出图 → 只调四层 |
| 做的过程 | `voice-deai` | 文案「太 AI 味」：逐句对照 + 七项自检 |
| 做的过程 | `pov-guard` | 对话与旁白的视角边界：角色不知道的事不许他知道 |
| 收尾 | `delivery-gate` | 想说「做完了」之前，先答四问证据表 |

`game-de-ai` 是主流程，其余六个管边界。它们都靠 agent 自觉；`court/` 是这套规范的强制版——**技能靠自觉，法庭靠代码拒绝**。

- 15 条铁律：先有命题再有像素 / 一款游戏一个身份 / 指不回方向的装饰删掉 / 不碰玩法 / 必须真实预览截图 / 一次只改一个维度 / 明确「不要什么」清单 / 用户拍板 / 素材必须进清单 / 经验回写 / 三案差异 ≥4 维 / 门下省先独立成文 / 文案也是身份 / 改文案不补事实 / AI 检测器分数不是标准
- 分流三档（轻 / 中 / 重），重档按「省—部」分工：礼部考据、兵部构图、工部实施、刑部裁决规范例外
- 主流程 A–H：项目理解 → 艺术指导 → **方向确认（必须停等用户拍板）** → 视觉规范 → 素材生产 → 前端实施 → 真实预览 → 经验沉淀
- `skills/game-de-ai/references/history/`：59 份制度档案（古代官僚制度怎么变成可执行流程），写自己的流程时当史料库查
- 安装：把技能目录放进 agent 的 skills 目录 —— DeepSeek Harness `~/.dsh/skills/`，Claude Code `.claude/skills/`

## docs

- [`docs/WHY.md`](docs/WHY.md)：为什么是「法庭」，而不是一张 checklist
- [`docs/MULTI_AGENT.md`](docs/MULTI_AGENT.md)：多个执行端并行改一个游戏工程怎么不互相踩（worktree 隔离 / 独占文件域 / 派单七要素 / 合并门禁四步）
- [`docs/EVIDENCE_TIERS.md`](docs/EVIDENCE_TIERS.md)：机械 / 真人 / 发行三类证据不得混用
- [`docs/GATES.md`](docs/GATES.md)：合并闸门、出包闸门、投稿闸门（含禁 AI 的 jam 与 AI 披露的坑）

## 溯源与许可

MIT，见 [LICENSE](LICENSE)。
`skills/game-de-ai/references/impeccable/` 摘编自 [pbakaus/impeccable](https://github.com/pbakaus/impeccable)（Apache-2.0，已修改），见 [THIRD_PARTY.md](THIRD_PARTY.md)。
案卷里的项目名（roll-cut-die / 1-6 / bistro-rush / diceverse 等）都是作者自己的游戏，作为真实案卷保留——它们不是演示数据，是这套制度实际处理过的事。
