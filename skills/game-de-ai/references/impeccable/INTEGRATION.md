# Impeccable 集成方案（写入 game-de-ai 的确切方式）

> 目标技能：`C:\Users\11ee11\.dsh\skills\game-de-ai\`（V0.1，已存在：SKILL.md + 8 个 references + 4 个 templates）。
> 本文只给方案与路径，**不代写主技能**（主技能由 Lead 落笔）。

## 1. 结论：vendored 进 references，不装成独立 skill

**判定：不要 `npx impeccable install`，也不要在 `~/.dsh/skills/` 下新增 `impeccable/` 目录。**
把上提炼的三份文档 vendor 进 `game-de-ai/references/impeccable/`，由 SKILL.md 的模块表按需指读。

理由（按权重）：

1. **装不出可用的东西**。官方 24 个命令里，`craft/typeset/layout/colorize/animate/clarify/harden/distill/quieter/bolder/critique/audit` 只是一批 `.md` playbook，本身没有运行时；而它们的**脚手架**依赖引擎二进制（`impeccable context <cmd>` 由 `impeccable.exe` 输出）、子代理、图像生成、live dev-server。本机 DSH 深度限制 0–1，没有引擎，原型是 `file://` + 截图 —— 装完 `SKILL.md` 会立刻卡在第一步。
2. **独立 skill 会与 game-de-ai 抢触发**。两个 skill 的 description 都覆盖「判断设计是否太 AI / 太模板 / 定色板字体」，模型会在二者间摇摆，并可能绕过 game-de-ai 的铁律（先有 `ART_DIRECTION.md` 再写 CSS）。Impeccable 是**能力层**不是**流程层**，正确位置是被 game-de-ai 引用，而不是并列。
3. **它自己就是这么设计的**。上游 `SKILL.md` 只做路由，playbook 全部在 `commands/`，通过 `context <name>` 按需载入 —— 与 DSH 的「主文件薄、references 厚」惯例一致。vendored 进 references 正是它原本的形态。
4. **全局污染**。`npx impeccable` 首次运行会往 `~/.impeccable/bin/<version>/` 写可执行文件，并可能写 `${DSH_HOME:-$HOME/.dsh}/skills/impeccable`。任务明确要求不污染全局环境。

## 2. 落盘路径（Lead 照抄即可）

```
C:\Users\11ee11\.dsh\skills\game-de-ai\
└── references\
    └── impeccable\
        ├── CORE_RULES.md      ← 本目录同名文件
        ├── COMMANDS.md        ← 本目录同名文件
        ├── INTEGRATION.md     ← 本目录同名文件（保留，说明改动与边界）
        ├── UPSTREAM.md        ← SOURCE.md 改名或原样复制
        └── LICENSE            ← _vendor/repo-2b86d9c0/LICENSE（Apache-2.0 全文，必须）
```

只需拷 3 个 md + `LICENSE`（`_vendor/` 里 57 个上游原文**不要**复制进技能，体积与噪声都不划算；
需要原文时按 `UPSTREAM.md` 的 commit 与路径回取）。

**SKILL.md 需要加的两处**（≤4 行）：

1. 模块表加一行：
   `| 规则底座 | 做任何设计动作前；判 «AI 味» 的具体阈值时 | references/impeccable/CORE_RULES.md |`
2. 「交付自检」清单前加一句：`阈值与禁用项以 references/impeccable/CORE_RULES.md §0/§8 为准；冲突时以本技能 ART_DIRECTION 为准并记录。`
3. 「预览怎么跑」一节把 `scripts/shot.mjs` 换成实际存在的截图途径（见 §5 缺陷）。

## 3. 与现有 references 的分工（避免重复写两遍）

| 现有文件 | 保留职责 | 由 Impeccable 补的空白 |
| --- | --- | --- |
| `ANTI_AI_PATTERNS.md` | 「AI 味 = 没有理由的默认值」的判断哲学 + 十条规则的现象/替代写法 | 62 条**可判定**的检测规则与精确阈值（`CORE_RULES.md` §8）；只做交叉引用，不重写 |
| `VISUAL_DESIGN_GUIDE.md` | 色板/字阶/间距的**项目取值**（含 `--fs-*` 具体值） | 判定阈值表（`§0`）、OKLCH 派生方法、暗色模式禁机械反相 |
| `IMPLEMENTATION_AND_PREVIEW.md` | 原型结构、截图流程 | 状态六态清单、reduced-motion、i18n 膨胀预留、`min-width:0` 与手势中断 |
| `ART_DIRECTION_GUIDE.md` | 命题句与方向卡 | **不引入**（Impeccable 无对应能力，方向推导仍是本技能原创） |
| `ASSET_WORKFLOW.md` | AI 图过统一层、SVG 图标 | 「区域媒介由内容决定」一条（`CORE_RULES.md` §3-32） |
| 新增 | — | 评分体系（`§9`：Nielsen /40 + P0–P3 + persona + 认知负荷 8 项）——现有 references 完全没有 |

## 4. 必须裁决的四处冲突

这四处是上游规则与现有 `ANTI_AI_PATTERNS.md` **直接对立**的地方。建议按下表裁决，并写进 `VISUAL_LANGUAGE.md` 的「明确要有」以免默认值回来。

| 冲突点 | 现有写法 | Impeccable | 裁决 |
| --- | --- | --- | --- |
| 硬偏移阴影 | R2 建议 `box-shadow: 4px 4px 0 var(--ink)`（印刷/贴纸感） | `hard-offset-shadow`（advisory）：位移 ≥4px 且 blur=0 是「review prompt，不是自动删除」 | **有条件允许**：与上游口径一致（它本就是 advisory）；只在 `ART_DIRECTION.md` 写明「印刷/贴纸/neobrutalist 世界」时用，且全项目只出现一种硬阴影语言；否则视为默认值删 |
| 过冲曲线 | R10 建议 `cubic-bezier(.2,1.6,.3,1)`（过冲）表现「受控的错误」 | `bounce-easing`：反射性 bounce/overshoot 违规，推荐 ease-out-quart/quint/expo | **改判**：过冲曲线默认不用；「受控的错误」改由 `steps()`、套印偏移 1–2px、基线不齐承担。若确要用过冲，仅限单次、非高频交互 |
| 「科技感」发光 | R4 建议一处 radial 光模拟唯一光源 | `dark-glow`/`radial-halo`/`radial-spotlight-glow` 禁零 offset 彩色光晕 | **本就一致，需写清**：能说出光源 → 合法；说不出 → 违规。判定句统一为「这光从哪来」 |
| 字体禁令 | 无 | `overused-font` 禁 Inter/Roboto/Geist 等 | **不照搬**：Inter/Roboto 对游戏 UI 是合理选择。改为「专属字体 + 有理由」检查：字体必须出现在 `GAME_DNA.md` 指纹三件套里，否则视为默认值 |

## 5. 现存缺陷（顺带发现，建议 Lead 修）

`SKILL.md:93` 让模型运行 `node "<skill>/scripts/shot.mjs"`，但 `game-de-ai/` 目录下**没有 `scripts/`**
（实际只有 `SKILL.md`、`references/` 8 个、`templates/` 4 个）。照做会 `MODULE_NOT_FOUND`。
两条修法：① 真写一个 `scripts/shot.mjs`（Puppeteer/Playwright 截图，`--width/--height/--scale` 已定好接口）；
② 改成描述性指令「用可用截图能力截 1440×900 与 390×844，1× 与 2×，存 `visual/preview/`」。本机有
`_research/` 下的浏览器截图路径可复用，不必引入新依赖。

## 6. 不采用清单

| 不采用 | 为什么 |
| --- | --- |
| `live` overlay 实时改色 | 需引擎 + dev-server + 浏览器注入；本机 `file://` 原型做不到 |
| `visualize` comp 制图、`generate-image`、`embed-prompt`、plate | 需图像生成模型，本机无。**替代**：用用户已有的 AI 图流程 + `ASSET_WORKFLOW.md` 的统一层四关 |
| 子代理（motion-reviewer / finish-reviewer / documenter / manual-edit-applier / asset-producer） | 本机派生深度 0–1；且它们读引擎产物 |
| `motion-capture` 抓帧 | 需引擎。**替代**：手工截 before / mid / settled 三帧，用肉眼比时长与缓动是否符合 `§5` 档位 |
| `foundations` 20+ 项产品地基 | 是 Web 产品上线清单（CI、错误追踪、社交预览 1200×630、法务页、依赖扫描、`no-giant-files`），与游戏视觉无关 |
| `detect` 二进制 | 不下载引擎（会写 `~/.impeccable/bin`）。**替代**：`COMMANDS.md` §5 的三段式静态检查 |
| 整包 vendor `_vendor/repo-2b86d9c0/` | 57 个文件是调研证据，不是技能内容；体积与噪声都不划算 |

## 7. 许可证义务（Apache-2.0，必须做）

1. 拷 `_vendor/repo-2b86d9c0/LICENSE` → `references/impeccable/LICENSE`（Apache-2.0 全文，勿改）。
2. 三份 md 末尾保留「改动声明」：这是**中文节选/重排/场景化改写**，非原文翻译，并指明上游仓库与 commit。
3. 不暗示背书：不要写「由 Paul Bakaus / Impeccable 官方支持」，写「规则提炼自 Impeccable」。
4. 若日后把整份上游 playbook 原文复制进技能，需同时说明修改点（Apache-2.0 §4(b)）。

## 8. 验收（Lead 合入后自查）

- [ ] `references/impeccable/` 有 3 个 md + LICENSE，`CORE_RULES.md` ≤200 行；
- [ ] `SKILL.md` 模块表指到了 `CORE_RULES.md`，且仍 ≤250 行；
- [ ] §4 四处冲突已在 `VISUAL_LANGUAGE.md` 或 `ANTI_AI_PATTERNS.md` 里落成裁决（不是只写在这份文件里）；
- [ ] `scripts/shot.mjs` 缺陷已修（要么有脚本，要么没引用）；
- [ ] `CORE_RULES.md` 的 `[Web]` 标记项没有被硬套到 Godot 场景内美术。
