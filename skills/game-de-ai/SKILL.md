---
name: game-de-ai
description: >-
  个人游戏视觉创作工作流（艺术指导 + 视觉设计 + 素材 + 前端实施 + 浏览器预览）。
  适用：给一款游戏定视觉方向与美术风格；做 UI/界面/HUD/菜单设计；定色板、字体、材质、动效；
  产出或改造美术素材（AI 图、SVG 图标、CSS 纹理）；把视觉方案落成 HTML/CSS 或 Godot 界面；
  用截图做视觉评审与迭代；判断设计是否「太 AI / 太模板」；
  写或改玩家可见文案、判断文案「像不像人写的」、给一款游戏建文风档案（Voice Bible）。
  触发：「给这个游戏定个美术方向」「这界面太廉价/太 AI 味」「设计一套 UI」「配色字体怎么定」
  「做几个图标/背景」「把设计做成页面」「截图看看效果」「出视觉规范」；
  「这文案太 AI 味」「这些台词/物品描述帮我改」「写菜单/教程/成就文案」「给这款游戏定个说话方式」；
  帝制议事层触发：「走三省」「出票拟」「门下省看看这个方案」「叫兵部/礼部/工部…」
  「开个廷议」「给我奏议，我来选」。
  不适用：玩法、数值、剧情走向、存档等非视觉/非文案功能开发；纯前端 bug 修复（无视觉目标时）；
  非游戏的平面物料（海报/PPT → poster-brief / office-*）；小说/长文改文风（→ voice-deai）。
  开始前需要：目标游戏工程路径、要动的界面或画面、已有的参考或必须保留的元素；
  没有参考就先跑 A 项目理解与 B 三案，不要直接开做。
  产出：`<游戏工程>/visual/` 下的 GAME_DNA / ART_DIRECTION / VISUAL_LANGUAGE / ASSET_MANIFEST /
  ITERATIONS / COPY_VOICE_BIBLE，加 `visual/assets/`、`visual/prototype/`、`visual/preview/` 截图，
  以及 `visual/copy/` 下的文案前后对比与复核；用户确认的偏好回写 references。
  边界：这些文件归该项目所有，本 skill 不持有项目管理权（见 references/governance/PROJECT_ISOLATION.md）。
  相邻：本 skill 管「游戏长什么样、怎么做得出来、说话像不像人」；voice-deai 专管要署名的中文长文；pov-guard 管叙事视角。
---

# GAME DE-AI

> **最高层目标（优先于本文件一切方法）**：让 AI 参与制作的游戏**少一点 AI 味**——独立设计逻辑、视觉身份、内容密度、交互性格与可信细节。所有机制都是手段，检验对象是作品；六问体检见 `references/governance/MECHANISM_RESULTS.md`，目标全文见 `references/governance/MISSION.md`。

个人游戏视觉导演与制作工作流。目标不是「好看的界面」，而是**这款游戏自己的视觉身份**：可命名、可复述、可实施、能认出。

## 什么时候用

- 新游戏开工，要先定艺术方向与视觉身份；
- 已有游戏界面「能用但廉价 / 像模板 / 每款都长一样」；
- 要一套完整视觉规范给后续所有界面用；
- 要真的把设计做成可跑可截图的界面。

一次只服务**一款**游戏的一个视觉目标；不要把两款游戏的视觉混着做。

## 铁律

1. **先有命题，再有像素**。没有 `ART_DIRECTION.md` 的视觉命题句，不写第一行 CSS。
2. **一款游戏一个身份**。指纹三件套（专属色 / 字体组合 / 图形母题）不得与自家其它游戏共用。
3. **每次交付都要能指回方向**。指不回 `ART_DIRECTION.md` 的装饰，删掉。
4. **不碰玩法**。只改视觉层；原型隔离在 `visual/prototype/`，不污染游戏逻辑。
5. **必须真实预览**。交付前必有截图（桌面 + 移动）；不看截图不交付。
6. **一次只改一个维度**（构图/色彩/材质/排版/动效），改完立刻截图对比。
7. **明确不要清单**与方向同等重要——没写它，实施时默认值会全部回来。
8. **用户拍板关键决策**。方向、指纹色、字体组合、UI 隐喻：必须用户确认，不替他决定。
9. **素材必须进清单**。没进 `ASSET_MANIFEST.md` 的素材视为不存在。
10. **经验要回写**。用户确认或否掉的判断，落到 `PERSONAL_TASTE.md` / `DESIGN_LESSONS.md`，否则下次重犯。
11. **三案的差异必须落在设计逻辑上**。颜色、圆角、阴影、图标替换不算新方案；七维至少 4 维不同（见 `court/ZHONGSHU_MENXIA.md`）。
12. **门下省先独立成文，再看别人意见**。单模型环境下靠「分阶段写 + 留痕」制造真实分歧，不许把分歧总结成共识；能开独立 subagent 时必须开（见 `court/MENXIA_SUBAGENT.md`）。
13. **文案也是身份**。同一款游戏的画面与文字必须同一口气；两款游戏不许共用一套说话方式（都变成「真人口语」＝失败）。改文案前先有 `COPY_VOICE_BIBLE.md`。
14. **改文案不补事实**。人名、数值、日期、道具名、占位符、事件 ID、分支条件一律原样；没有出处的形容不许加。
15. **AI 检测器分数不是标准**。文案过不过，看三层复核 + 覆盖率回执 + 用户观感，不看检测分数。

## 朝廷怎么用（分流）

先判规模，再决定叫谁——不要每次都开全套朝廷。

| 档 | 判据 | 路径 | 产出 |
| --- | --- | --- | --- |
| **轻** | 改值、修溢出/缺字、复刻已定组件 | 承旨 → 单部门 → 截图 | 改动 + 截图 + 一行记录 |
| **中** | 方向已定，要一个新界面 | 承旨 → 尚书省拆活 → 工部实施 → 御前预览 | 原型 + 截图 |
| **重** | 新游戏、换皮、主菜单重做、身份级改动 | 十一步全走（访谈 → 三案 → 封驳 → 廷议 → 奏议） | 票拟 + 三案 + 奏议 + WBS + 原型 + 决策记录 |

**点部门语法**（用户说「叫兵部…」＝直达该部门，跳过访谈）：
吏部=专业视角调配 / 户部=素材与授权 / 礼部=艺术方向与考据 / 兵部=构图与界面组织 / 刑部=规范与例外 / 工部=实施与截图。

机构与文件：`references/court/IMPERIAL_GOVERNANCE.md`（分流、交接物、闸门 · **判不准时先读它**）、`court/INTERVIEW_ENTRY.md`（**访谈的可调用入口：触发词、每轮动作、收尾出票拟**）、`court/NEIGE_INTERVIEW.md`（访谈规则本体）、`court/ZHONGSHU_MENXIA.md`（三案与封驳）、`court/LIUBU_DUTIES.md`（六部接口）、`court/SIMULATION.md`（一次完整流程长什么样）。

**访谈怎么起**：用户说「采访我 / 记者模式 / 进入访谈」，或提出新游戏/新方向但还没说清感觉时 → 读 `court/INTERVIEW_ENTRY.md`，进记者角色，**一次只问一个问题**，收尾出 `templates/PIYI.md`；用户说「直接做」就照做，只记一句「跳过访谈」。

模板：`templates/PIYI.md`（创意票拟）· `templates/ZOUYI.md`（御前奏议）· `templates/DECISION_LOG.md`（决策记录，落到 `<工程>/visual/DECISIONS.md`）。

## 模块与底座 → 读哪个文件

| 模块 | 何时读 | 文件 |
| --- | --- | --- |
| 审美底座 | 每次开工先读；判断「这算不算 AI 味」时 | `references/PERSONAL_TASTE.md`、`references/ANTI_AI_PATTERNS.md` |
| 艺术指导 | 定方向、提案、拍板 | `references/ART_DIRECTION_GUIDE.md` |
| 视觉设计 | 定色板/字体/材质/构图/组件/动效 | `references/VISUAL_DESIGN_GUIDE.md` |
| 素材生产 | 图/图标/纹理/字体从哪来 | `references/ASSET_WORKFLOW.md`、`references/IMAGE_PIPELINE.md`（AI 图生成通道、批量脚本、可追溯清单） |
| 文案去 AI 味 | 写/改玩家可见文字；判「像不像人写的」；建文风档案 | `references/COPY_DEAI_GUIDE.md`、`references/GAME_COPY_TYPES.md`、`references/CHINESE_AI_PATTERN_CATALOG.md`、`references/copywriting/UPSTREAM_RESEARCH.md`；能力边界与调用关系见 `references/copywriting/CAPABILITY_MAP.md`，上游许可见 `references/copywriting/UPSTREAM_RECOVERED.md`，实测记录见 `references/copywriting/VALIDATION_2026-11-15.md` |
| 前端实施 + 预览 | 落成界面、截图、迭代 | `references/IMPLEMENTATION_AND_PREVIEW.md` |
| 案例与教训 | 找参考、翻旧账 | `references/DESIGN_REFERENCE.md`、`references/DESIGN_LESSONS.md`、`references/cases/diceverse2/CASE.md`（真实项目案例：**制度有没有真的改变产物**，含证据表、边界与 5 条候选原则） |
| 规则底座 | 做任何设计动作前；要判「AI 味」的具体阈值时 | `references/impeccable/CORE_RULES.md`（阈值表 §0 / 反模式 §8 / 闸门 §10）、`references/impeccable/COMMANDS.md` |
| 帝制议事 | 判分流、开访谈、出三案、封驳、拆活 | `references/court/*.md` |
| 历史机制 | 想找一个新鲜的信息结构/规则来源（过滤、双账、资格、税点、依附、刻度、双轨校验） | `references/history/V2_SCOPE.md`（八方向 A–H 与证据规则）、`references/history/V2_CANDIDATES.md`（36 项初核 + 选定项与成档状态）、`references/history/V2_SYNTHESIS.md`（六种可复用方法与创作启发）、`references/history/cases/*.md`（**59 份档案**：史实→机制→失效→游戏转译）、`references/history/ENTRY.md`（**调用入口**：八道成档判据＋按问题查的索引，覆盖 01–59）、`references/history/cards/*.md`（8 张方法卡：七问＋误用）、`references/history/V21_VERIFICATION.md`（史实复核与证据等级） |
| 库存与缺口 | 想查历史档案的成档状态与还差什么 | `references/history/STOCK_INDEX.md`（物理 59/100 与缺口） |

模板：`templates/GAME_DNA.md`、`templates/ART_DIRECTION.md`、`templates/VISUAL_LANGUAGE.md`、`templates/ASSET_MANIFEST.md`、`templates/PIYI.md`、`templates/ZOUYI.md`、`templates/DECISION_LOG.md` → 复制到 `<游戏工程>/visual/` 再填。

## 主流程 A–H

| 步 | 做什么 | 读 | 产出 | 停在哪 |
| --- | --- | --- | --- | --- |
| **A 项目理解** | 读工程：题材、核心循环、目标体验、现有界面与素材、分辨率、必须保留项 | ANTI_AI_PATTERNS（找现有问题） | `visual/INTAKE.md` 一页 | 信息缺关键项就问，不要猜 |
| **B 艺术指导** | 四步推导出命题句；给 3 个一级轴不同的方向卡 | ART_DIRECTION_GUIDE | 对话里的 3 张方向卡 + 推荐项 | — |
| **C 方向确认** | 问 3 个决策问题（像不像 / 不像别的 / 愿不愿做 20 小时） | — | 用户选定方向 | **必须停**，等用户拍板 |
| **D 视觉规范** | 写 GAME_DNA / ART_DIRECTION / VISUAL_LANGUAGE / ASSET_MANIFEST | VISUAL_DESIGN_GUIDE | `visual/` 下 4 个文件 | 指纹三件套要用户确认 |
| **E 素材生产** | 先核心 3 张；AI 图过统一层四关；SVG 自绘图标 | ASSET_WORKFLOW | `visual/assets/**` + 清单更新 | 素材糊/风格不齐就返工 |
| **F 前端实施** | 建 `visual/prototype/`，按 VISUAL_LANGUAGE 写 HTML/CSS 或 Godot Theme | IMPLEMENTATION_AND_PREVIEW | 可跑原型 | — |
| **G 真实预览** | 截图（1440×900 与 390×844，1× 与 2×），对比命题句，一轮改一处 | IMPLEMENTATION_AND_PREVIEW | `visual/preview/*.png` + `visual/ITERATIONS.md` | 不达标回 F；达标进 H |
| **H 经验沉淀** | 把用户确认/否掉的判断回写 | PERSONAL_TASTE / DESIGN_LESSONS | 归档更新 | 交付报告 |

小任务可跳步：只要方向 → 做 A、B、C；只要界面 → 做 A、D（已有方向时）、F、G；只要素材 → A、E。

**走重档时**，A–H 与十一步（下旨→承旨→内阁→中书→门下→廷议→御前→尚书→工部→预览→归档）的对应关系见 `references/court/IMPERIAL_GOVERNANCE.md` §3；A–H 是工作内容，十一步是决策权顺序，两者不冲突。

## 组织边界（协议 V0.1，2026-11-15）

**本技能是方法论与工具中枢，不是项目组。** 项目文档里的设计权、工程管理权、最终取舍权属于该项目自己。

- 只提供能力：文法层、仪器层、法庭层、G1–G7、独立验收；不主创具体游戏、不调度项目开发、不接管日常决策。
- 能力清单与接入方式：`references/governance/CAPABILITY_INTERFACE.md`（其他项目对话框可直接引用）。
- 项目边界与权责：`references/governance/PROJECT_ISOLATION.md`。
- 阶段收束与路线图：`references/governance/STAGE_SUMMARY.md`。
- 经验回流：`references/governance/FEEDBACK_INTAKE.md`（A 项目专属 / B 可复用 / C 系统缺陷），登记在 `FEEDBACK_LOG.md`。
- 项目可以拒绝任何一项能力；法庭不因项目变多而扩大审查范围。
- 禁止：为证明本技能有用而强迫接入；为展示制度完整而加流程；把非游戏项目强行游戏化。
- **架构冻结（2026-11-15）**：不新增机制/部门/角色/审批层级，不新增大规模文档；只维护现有能力、降低使用成本。

## 项目目录约定

> 下列目录由**项目调用本技能时**创建，文件归该项目所有（本技能不持有）。

```
<游戏工程>/visual/
├── INTAKE.md            现有视觉盘点（A）
├── DECISIONS.md         决策记录（每次御前裁决一条）
├── GAME_DNA.md          身份指纹（D）
├── ART_DIRECTION.md     艺术方向与命题句（D）
├── VISUAL_LANGUAGE.md   实施手册（D，随实施更新）
├── ASSET_MANIFEST.md    素材清单（E，含 AI 生成项的模型/种子/工作流）
├── COPY_VOICE_BIBLE.md  这款游戏的说话方式（改文案前必读）
├── ITERATIONS.md        迭代记录（G）
├── copy/                文案前后对比与复核（COPY_BASELINE / COPY_DIFF / COPY_REVIEW / *_scan.json）
├── assets/              素材（fonts/ bg/ icons/ decor/）
├── prototype/           可跑原型（index.html + styles.css + app.js）
└── preview/             截图存档（命名 `screen-宽x高@倍率.png`）
```

技能自身：`references/` 存方法、`templates/` 存模板、`scripts/` 存工具脚本。

## 预览怎么跑

```bash
node "<skill>/scripts/shot.mjs" --url "file:///<工程>/visual/prototype/index.html" \
  --out "<工程>/visual/preview/main-1440x900.png" --width 1440 --height 900 --scale 2
```
- 中文缺字、字体回退、图 404、溢出、对比度不足：全部在截图里查，不靠想象。
- Godot 工程用 `godot_run_project` + `godot_screenshot`（不要用 shell 起 godot）。

## 交付自检（缺一不可）

阈值与禁用项以 `references/impeccable/CORE_RULES.md` §0/§8 为准；与本技能方向文件冲突时以 `ART_DIRECTION.md` 为准，并在 `DESIGN_LESSONS.md` 记下裁决。

**通过判定**：皇帝的主观判断优先。截图清单是**下限，不是通过令**——清单未过不许说「达标」；清单全过但皇帝仍不满，记 E 类待验证并再走一轮，不许拿清单去反驳观感。


- [ ] `ART_DIRECTION.md` 有命题句、色板占比、明确不要；
- [ ] `GAME_DNA.md` 指纹三件套用户已确认，且与自家其它游戏可区分；
- [ ] `VISUAL_LANGUAGE.md` 的常量与实施代码一致（改代码必回改这里）；
- [ ] 桌面 + 移动截图各一张以上，25% 缩略图能认出是哪款游戏；
- [ ] `ASSET_MANIFEST.md` 里每个「已采用」都有可访问路径；
- [ ] `ITERATIONS.md` 记录了每轮改了什么、为什么、是否采纳；
- [ ] `DECISIONS.md` 有一条本次裁决（含 A–E 归档类别与去向）；
- [ ] 走重档时：三案七维差异 ≥4 维、门下省封驳留痕、复议已做、未收敛分歧已写进奏议；
- [ ] 动了文案时：有 `COPY_VOICE_BIBLE.md`、有前后对比、有覆盖率回执、占位符/数值/事件 ID 未动；
- [ ] 两款游戏文案抽查能「分家」（遮住名词仍认得出归属）；
- [ ] AI 生成素材有 `ASSET_MANIFEST.md` 记录（模型/种子/尺寸/提示词），且不是「工作流存在」就算接入成功；
- [ ] 用户确认/否掉的判断已回写审美库；
- [ ] 没碰玩法代码（`git status` 检查）。

## 维护

- 新增判断先写进 `DESIGN_LESSONS.md` 的「待验证」，两次以上成立再升「已验证」，最后进 `PERSONAL_TASTE.md`。
- 删规则要看反例是否还存在；反例消失说明规则已内化，可压缩成一条原则。
- 改流程或部门职责 → 同步 `references/court/*.md` 与 `USAGE.md` 的目录说明。
- 本文件 ≤250 行；方法细节放 `references/`，不要往主文件堆。

## 反例

- 收到「设计个 UI」就直接出三张图 → 没有命题，用户只能凭感觉挑，返工。
- 拿「赛博朋克/极简/国风」当方向 → 这是风格菜单，不是这游戏的视觉身份。
- 视觉规范写 2000 字散文 → 写 CSS 时没人读，等于没写。
- 截图只在 1× 桌面看 → 高分屏与移动端全塌。
- 把不同游戏的素材/or 色板复用过来「省时间」→ 身份立刻消失。
- 三案只是换色换字体 → 用户挑完还是同一套逻辑，等于没探索（违铁律 11）。
- 门下省看完中书省的辩护再写意见 → 独立性消失，封驳变成盖章（违铁律 12）。
- 文案改成「短句 + 口语 + 不加解释」就收工 → 两款游戏会一起变成同一个真人口语腔，身份反而消失（违铁律 13）。
- 用 AI 检测器分数证明文案通过 → 分数可以刷，读起来仍假（违铁律 15）。
- 把 AI 生成图放进工程就算接入成功 → 没清单、没种子、风格不齐，下次没法复现。
