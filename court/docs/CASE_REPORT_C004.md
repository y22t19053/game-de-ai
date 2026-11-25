# 案件报告 C-004：小泽模拟器副本内可做哪些改动

类型 `major`　项目 `little-zelensky-simulator`　提案人 `lead`　开案 2026-11-15　结案 2026-11-15

## 一、争议是什么

已发布 V3.2.1 的视觉方向**已被用户认可**、不允许推翻。那么"在副本里做一轮打磨"到底该做哪些、不该做哪些？提案给了 A（排版/对比/页脚）与 B（把"已阅"章从装饰升级为状态指示器）两张清单。

## 二、证据（全部走提交→登记→采信三段式）

| 编号 | 内容 | 状态 |
|---|---|---|
| E001 | `visual/GAME_DNA.md`（身份与识别锚点） | admitted |
| E002 | `visual/VISUAL_LANGUAGE.md`（token 与版面） | admitted |
| E003 | `_research/v03_frontier/academic.md`（AI 抬地板削尖峰） | admitted |
| E004 | 提案 `docs/proposals/C-004-lzx-copy-changes.md` | admitted |
| E005 | `_research/v03_frontier/proto/fp_bistro.json`（对照用） | admitted |
| E006 | **更正证据**：正式版对 `stamp`／`已阅` 零命中 | admitted |

E006 是本轮的关键：`index.html` 与 `js/v2*` 里 `stamp`／`已阅` 都 0 命中，`--stamp` 只在 `css/v2.css:24` 定义、`:417` 被 `.v2-ending{border-left-color:var(--stamp)}` 引用。**"已阅"章只存在于 `visual/prototype/`。**

## 三、控辩与质询

- 控方 4 条主张（`_research/court_case_c004/prosecution.md`），辩方 5 条（`defense.md`）。
- 争议点 D01：B 的前提（成品里有一枚装饰性"已阅"章）被推翻后，B 是否还有可试的对象。
- 质询 2 轮，最锋利的一问是控方回答辩方："若把章搬进局内屏，那是**新增装饰而非补语义**，恰好造出提案要消灭的纯装饰，只是更红。"

## 四、裁决（`c004-judge`，fresh）

**VERDICT `conditional`**，6 条 FINDING、5 条 CONDITION、2 个 TASK、1 条先例。

核心判准：**副本内只减不增**——只许收紧既有 token/间距/断点；任何新增玩家可见元素（含把章或字标加进任一屏）不批，须单独立案。每条改动必须同时交「基线出处（文件:行）+ 算式 + 同机同 DPR 双端实拍」。

A1 的执行形态被锁死为：先出 390 基线并量 `scrollWidth`；仅在末段孤行或溢出成立时，只改 `@media (max-width:560px)` 内 `.v2-menu-foot` 行距。

## 五、执行与独立验收（都发生了，见 `_research/court_case_c004/verify/VERIFY_T01_T02.md`）

**T01（lead）**：真读 `documentElement.scrollWidth` = **390**（无横向溢出），页脚 3 个 span 分 2 行、第 2 行只有「38 天 · 时间由你推进」→ **孤行成立**。按许可形态试过 `row-gap` 6→14px：孤行未消、面板上移 4px、且 6→14 属**放宽**间距（违反条件 1）→ **回滚，判"不改"**，最终副本 `css/v2.css` 与正式版逐字节相同（0 改动）。

**T02（lead）**：五处数字/表述订正 + 两处档案订正：
- 页脚由"两段/8px"改为"三段/gap:6px 18px"；
- ΔL 2.1 → 实测 **ΔL\* 7.19（成品 `css/v2.css:19-20`）/ 5.99（原型 `prototype/styles.css:22-23`）**，并写明是"成对色值之差"不是算法之差；
- 删除"打印视角"（v2 无 print 面）；
- 印章条补 E006 注（`#9c3b2e` 与 `stamp` 在成品均 0 命中，按驳回处理）；
- §五 `.stage` → `.v2-grid`；
- `visual/GAME_DNA.md` §4 的"右上那枚小红章"改为「只存在于 prototype，成品零命中，不得当既有锚点，加回须单独立案」；
- `visual/ASSET_MANIFEST.md` 的 archive-stamp 色值订正为「铜色双线 `#b99a5d`，非朱红」，状态订正为「**零引用**」（连原型都没引用它——原型那枚章是 CSS 双线绘制）。

**验收（`c004-verifier`，fresh，非执行人）**：三轮。首轮 T01 未过（G1 放宽间距且未回滚、G2 未交代 4px 位移、G3 `content.width` ≠ `scrollWidth`）、T02 未过（§4 未改、朱红未订正、ΔL\* 归因错）；我按条修正后复验 **T01/T02 双 PASS**，并再指出 2 处（`ASSET_MANIFEST` 的"仅原型引用"不实、副本 `_baseline-390.png` 与副本文档漂移未交代）——均已修。验收人自己入的库（`verifier=c004-verifier`）。

## 六、本案的方法产出

1. **先例 P-004**：原型里有、成品零命中的元素不得作为"副本内打磨"对象；先指实装位置与渲染证据，指不出即驳回，也不许换屏当替身。
2. **I-25**：附条件批准必须写明「若实施后缺陷仍在」的撤回/升级条件，否则会产出「合规但无效」的改动——本案 A1 就是活例。
3. **口径纪律**：`shot.mjs` 的 `content.width` 是**视口宽**，不是 `scrollWidth`；判溢出必须 `page.evaluate` 真读（`_tools/measure_sw.mjs`）。
4. 副本目录不能靠"全目录 diff"证明"只改一处"（庭前就有未跟踪项）；只能做**目标文件级** sha 对比。
