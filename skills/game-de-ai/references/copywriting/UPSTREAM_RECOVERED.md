# 上游项目恢复清单（两轮共 10 个）

恢复依据：本轮**不重新调研**，只从两份既有记录里取事实——
- `references/copywriting/UPSTREAM_RESEARCH.md`（V0.2 轮，六个仓库，检查日期 2026-11-15，六份 README + 六份 LICENSE 均读到原文）
- `_research/v03_upstream/{lieflat,humanizer-zh,shuorenhua,human-writing-skill}.md`（V0.3 轮，四个仓库，经 GitHub API + `raw.githubusercontent.com` 实读）

## 一、先纠正一处计数

任务书说「6 个上游，5×MIT + 1×CC-BY-4.0」，指的是 **V0.2 轮**那六个。任务书随后点名找回的 4 个（shuorenhua / op7418-Humanizer-zh / lieflat / human-writing-skill）属于 **V0.3 轮**，不在那六个里。

两轮合计 **10 个仓库**，许可证分布：**7×MIT + 1×CC-BY-4.0（slopspeare，须署名与标注修改）+ 1×CC BY-NC 4.0（lieflat，不作生产依赖）+ 1×无 LICENSE（human-writing-skill，只吸收方法）**。下表按轮次分列，避免以后再对不上。

## 二、V0.2 轮（六个）

| # | 仓库 | 许可证 | 版权人（原文） | 本轮结论 | 义务 |
|---|---|---|---|---|---|
| 1 | daydayup-xq/zh-humanizer | MIT | 姓名留空（异常） | **只借思路**：篇幅守恒 4/5–5/4、文体三分 | 溯源不清，不复制文本 |
| 2 | blader/humanizer | MIT | Siqi Chen (2025) | 吸收：强度分层 + *weak alone* 聚合 | 保留版权与许可声明 |
| 3 | davidcogan/avoid-ai-writing | MIT | Conor Bronsdon (2026) | 吸收：表面/结构双层，结构层需授权 | 同上 |
| 4 | shir-danishyar/humanize | MIT | Shirhussain Danishyar (2026) | 吸收：密度阈值、误报白名单 | 同上 |
| 5 | davidvictor/slopspeare | **CC-BY-4.0** | David Victor | 吸收：覆盖率回执、三级 strictness | **署名 + 标注修改 + 许可链接**（非软件许可） |
| 6 | syw2039/humanizer-zh | MIT + 自建 NOTICE | Siqi Chen | 吸收：NOTICE 范式（改编须说明） | 保留上游版权 + 说明改编 |

## 三、V0.3 轮（四个）

| # | 仓库 | 许可证 | 状态与结论 | 义务 |
|---|---|---|---|---|
| 7 | larashero3-dotcom/lieflat-less-ai-tone | **CC BY-NC 4.0**（© 2026 shiujan，商用须另行授权） | **只吸收方法，不作生产依赖**：风险轴分级、X 级照样计数、候选盲判、改前报告再改 | 不进任何可能商用的产物；脚本/正则表/阈值表都是受保护表达 |
| 8 | op7418/Humanizer-zh | MIT（22,849★，全仓 27KB） | **文本与脚本可复用，不安装整套**：31 条「改写前/改写后/保留」三段式、四级优先级、文体分区、受保护内容机检 | 保留版权与许可声明 |
| 9 | MrGeDiao/shuorenhua | MIT（v2.7.0） | **可直接复用运行形态**：修订稿模式（判断行 + `不动：` + 「清单外一字不动」+ 撤销协议）、范围三档、动作白名单 | 保留版权与许可声明 |
| 10 | GuMu599/human-writing-skill | **无 LICENSE**（API `license=null`） | **只吸收方法，不复制代码或文本**：信息账本 6 类、场景路由表、每条规则配正/反例 | 视为保留所有权利 |

## 四、能力归属：谁提供什么，我们自研了什么

| 能力 | 来源 | 现状 |
|---|---|---|
| 模式库（P01–P46） | 自研（吸收上表的判定思路，文本自写） | 已用 |
| 判定强度（hard / strong / guideline） | 吸收 slopspeare 三级 strictness | 已并入 `CHINESE_AI_PATTERN_CATALOG.md` §5.1 |
| *weak alone* 聚合 | 吸收 blader | 同上 |
| 覆盖率回执 | 吸收 slopspeare | 同上（「共判 N 处 · hard a · strong b · guideline c · 不适用 d」） |
| 表面层 / 结构层分离 | 吸收 avoid-ai-writing | 已并入 `COPY_DEAI_GUIDE.md` §4 第零步 |
| 篇幅守恒 4/5–5/4 | 吸收 zh-humanizer | 已并入 §3（**降级为预警，不作硬闸**） |
| 文风档案（Voice Bible） | 自研（比三家都细：声部表 + 十类文字规则 + 语域子档） | 已用 |
| 机械扫描器 `copy_scan.py` | 自研（G01–G13，stdlib，零依赖） | 已用，定位＝排雷 |
| 诊断器（指出原文位置与原因） | 自研（本轮补：见 `VALIDATION_2026-11-15.md` 的判定表） | 手工 + 扫描器 |
| 情报账本（信息清单双向核对） | 吸收 human-writing-skill 的 6 类账本 | 已在 V0.3 方案中，未落地 |
| 候选盲判（只看片段判 AI 味） | 吸收 lieflat | **未采用**（成本高、与「先读上下文」冲突） |

**明确未采用、也不建议再做的**：
1. 安装任何一整套上游 Skill（四家能力重叠 ≥60%，装进来只会互相打架）。
2. 把 CC BY-NC 的规则表/阈值表搬进生产。
3. 用 AI 检测器分数当验收标准（V0.2 已判定）。
4. 以「禁用词表」为主体做去 AI 味（会造出新的模板腔，见 `COPY_DEAI_GUIDE.md` 反例）。

## 五、与既有文档的一致性

- `UPSTREAM_RESEARCH.md` 的六行许可表与本文件 §二 完全一致，无冲突。
- V0.3 四仓的许可结论（lieflat CC BY-NC、human-writing-skill 无 LICENSE）与本轮结论一致。
- 唯一需要记住的差别：**任务书里的「6 个」不含 V0.3 的四个**，本文件把两轮合并成 10 个，以后引用总数请用 10。
