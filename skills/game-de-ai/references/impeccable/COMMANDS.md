# Impeccable 命令手册（提炼 + 本机可用性判定）

> 上游 24 个命令，全部以 `.dsh/skills/impeccable/commands/<name>.md` 形式发布（SKILL.md 里通过
> `impeccable context <command>` 按需载入）。这里给的是**每个命令的实质动作**，以及在本机
> （DSH 无引擎二进制、无图像生成、无子代理、无 live dev-server）能否直接照做。
>
> 可用性图例：**✅ 可原样执行**（纯规则/流程，靠读代码+看截图即可）｜**🟡 需替代物**（动作保留，工具替换）｜
> **❌ 不具备**（依赖本机没有的运行时）。

## 0. 先理解它是什么形态

| 事实 | 值 |
| --- | --- |
| npm 包 `impeccable` | 只是个**下载器 shim**（16.9KB），不含任何设计内容 |
| 设计内容在哪 | GitHub 仓库 `.dsh/skills/impeccable/`（与 `skill/` 同构） |
| `npx impeccable detect` 靠什么跑 | 从 GitHub Releases 下 `impeccable-<target>.exe`（Rust 引擎），缓存到 `~/.impeccable/bin/<ver>/` |
| 引擎版本 | `0.1.24`（`skill/scripts/VERSION`）≠ 技能版本 `4.9.1` |
| 许可证 | Apache-2.0 |

**结论**：官方安装（`npx impeccable install` / `impeccable install`）会写 `~/.impeccable/bin` 与
`${DSH_HOME:-$HOME/.dsh}/skills/impeccable`，属于全局环境改动，且装完仍需引擎才能跑 `detect`/`context`/`live`。
本任务要求不污染用户全局环境 → **不安装，只提炼**。

## 1. 命令全表（24 个）

| 命令 | 实质动作（一句话） | 本机 |
| --- | --- | --- |
| `craft` | **施工标准**：8 个 Verify 区（对比/深度/间距/排版/动效/状态/浏览器面/文案）+ Refuse 清单。所有创作前先读 | ✅ |
| `init` | 从**现有项目**反推设计系统，生成 `DESIGN.md` + `.impeccable/design.json`（token 与字阶的事实记录） | 🟡 可手写，需人工确认 token |
| `document` | 维护 `DESIGN.md`：把已实现的值登记为「文档化的」基准，供 detect 的 design-system 规则比对 | 🟡 |
| `shape` | 需求未成型时先问问题、收敛成 brief（不画像素） | ✅ |
| `extract` | 从截图/现有界面里**提取**视觉语言（色、字、形、间距）落成 token | 🟡 靠截图目测，需标注不确定 |
| `generate` | 按 design system 生成新界面（走 craft 标准） | ✅ |
| `adapt` | 响应式改版：结构性重排、断点、触控目标 | ✅ |
| `animate` | 动效设计：时长档位、easing、出场/入场、reduced-motion | ✅ |
| `audit` | 逐项技术审查（可达性、层级、状态覆盖），产出问题清单带严重度 | ✅ |
| `critique` | **评分式评审**：Nielsen 10×0–4 = /40 + P0–P3 + persona + 认知负荷 8 项 | ✅ **本机最有价值** |
| `bolder` | 加大视觉冲击：复用系统既有母题与字阶（放满），「其它一切不变」是字面指令 | ✅ |
| `quieter` | 收敛：饱和度 70–85%、强调色约 10%、字重下调、位移 10–20px | ✅ |
| `distill` | 去冗余：一个 primary action、1–2 装饰色、3–4 字号、拍平嵌套 | ✅ |
| `polish` | 收尾打磨：光学对齐、间距微调、边缘态 | ✅ |
| `layout` | 构图与间距：squint test、proximity、4-pt 刻度、密度节奏 | ✅ |
| `typeset` | 排版：字阶、行长、行高、tracking、balance/pretty、光学对齐 | ✅ |
| `colorize` | 配色：先审后选、OKLCH、建角色、对比度表、暗色模式 | ✅ |
| `clarify` | 文案与反馈：状态消息四层、错误三答、破坏性确认、empty 分类 | ✅ |
| `harden` | 边界加固：溢出、i18n +30–40%、移动端 16px 输入框、错误码逐档、竞态、手势中断 | ✅ |
| `onboard` | 首次使用/引导流程 | ✅ |
| `optimize` | 性能（字体子集、图片、动画成本） | 🟡 只在有 devtools 时量化 |
| `overdrive` | 打破常规的「做大」实验（有明确上限与回滚） | ✅ |
| `delight` | 愉悦感：一个 delight thesis，不为普通点击庆祝，不强插声音 | ✅ |
| `live` | 浏览器 overlay 实时改色/改字，接 Vite/Next dev server | ❌ 需 dev server + 引擎 |
| ~~`visualize`~~ | comp 制图（3 张 north-star + 150–300 词 prompt + 一次批准点） | ❌ 需图像生成 |

> 注：`visualize` 未在 24 命令名单内但在 `reference/` 中有独立 playbook，标注于此以免遗漏。
> 名单来源是仓库 `scripts/command-metadata.json`（正好 24 个 key，本表与之逐项一致）。
> 官网侧栏把入口写成 `/impeccable`、`/shape` 两条（`craft` 未单列）——`impeccable` 是默认入口，产物即 `craft` playbook。

## 2. 值得直接并入本机工作流的 8 个（按价值排序）

1. **`critique`** —— 唯一自带**评分尺度**的命令。10 项 × 0–4 = 40，区间 36–40/28–35/20–27/12–19/0–11，
   配 P0–P3 与 5 个 persona。给「这界面几分」一个可复算的答案，避免「感觉挺好看」。
2. **`craft`** —— 施工前的 8 条 Verify + Refuse 清单，等于把验收标准前置。
3. **`bolder` / `quieter` / `distill`** —— 三个**成对的调节杆**，都是「只动一个维度、其它一切不变」，
   正好对上本机技能的铁律「一次只改一个维度」。`quieter` 的 70–85% 饱和度、10% 强调色、10–20px 位移
   是可直接抄进 CSS 的数值。
4. **`typeset` + `layout`** —— 全部是阈值型规则，能直接变成检查项（见 `CORE_RULES.md` §2/§3）。
5. **`clarify` + `harden`** —— 覆盖本机现有 references 最薄的两块：状态文案与边界态。
6. **`audit`** —— 与 `critique` 配对：`audit` 查硬缺陷（对比度/溢出/状态缺失），`critique` 打体验分。
7. **`colorize`** —— OKLCH 与「建角色不建色板」是比 hex 色板更可维护的写法。
8. **`animate`** —— 时长表（100–150/150–300/300–500/500–800ms）与 `cubic-bezier(0.16,1,0.3,1)`。

## 3. 不采用的（及原因）

| 能力 | 原因 |
| --- | --- |
| `live` mode | 需要引擎 + 浏览器 overlay + Vite/Next dev server；本机是 `file://` 原型 + 截图，无 dev server |
| `visualize` comp 制图 | 需要图像生成模型；本机无 |
| `generate-image` / `embed-prompt` / `plate` / `comp` 一族 | 同上 |
| 子代理派发（motion-reviewer / finish-reviewer / documenter / manual-edit-applier / asset-producer） | DSH 本机深度限制为 0–1，且这些子代理要读引擎产物 |
| `motion-capture` | 需引擎驱动浏览器抓帧 + 生成 filmstrip/report.json；本机用截图序列手工替代 |
| `foundations`（20+ 项产品地基） | 讲的是 Web 产品上线（CI、错误追踪、社交预览图、法务页、依赖扫描），与游戏视觉无关 |
| `detect` 二进制 | 见下节，用静态检查替代 |

## 4. `detect` CLI 契约（供将来装了引擎时用）

```bash
npx impeccable detect <path|url>        # 目录、单文件、或 URL
npx impeccable detect --json src/ > findings.json   # JSON→stdout，人读→stderr
npx impeccable detect --viewport 390x844 http://localhost:3000   # URL 默认 1280×800
npx impeccable detect --scope type,layout src/      # 限定设计域
npx impeccable detect --list-rules                  # 列出 62 条规则
cat component.css | npx impeccable detect           # 无参数时读 stdin
```

- 退出码：**0** = 无 primary finding（可能有 advisory）｜**2** = 有 primary finding｜**1** = 至少一个目标扫不了（按扫描失败处理）。
- `--quiet`（只留计数）、`--no-advisory`（隐藏 advisory）、`--no-design-system`（跳过与 `DESIGN.md` 比对）、
  `--no-inline-ignores`、`--no-config`（绕过 `.impeccable/config.json` 与 `config.local.json`）。
- `--github` 产出 Actions 注解。
- 源文件扫描只跑**模式类**规则；需要渲染页的（低对比度、过小文字）只在扫 URL 时跑，且用本机 Chrome/Edge。
  HTML 扫描会连带检查本地链接的 CSS；JSX/TSX/Vue/Svelte/Astro 与样式表跑源码检查。
- 忽略机制三级：项目级 `npx impeccable ignores add-value overused-font Inter --reason "Brand font"`；
  内联 `<!-- impeccable-disable overused-font: 原因 -->`；元素级 `data-impeccable-ignore="<rule-id>"`。
- 有 `DESIGN.md` 时额外跑 4 条 design-system 规则（字体/颜色/圆角/字号超出声明范围即报），
  `.impeccable/design.json` 提供结构化 token 与字阶。

## 5. 本机替代 `detect` 的做法（🟡）

引擎不可用，但 62 条规则的判定标准在 `CORE_RULES.md` 里已落成阈值。用三段式静态检查代替：

1. **源码检查**（等效 `--scope type,layout` 的模式规则）：grep 一遍禁用写法——
   `background-clip:text`、`linear-gradient` 配紫蓝端色、`box-shadow:\s*\d+px\s+\d+px\s+0`（无 blur）、
   `border-left:\s*[2-9]px`（单侧彩边）、`font-family` 命中 overused 名单、`filter:blur` 晕光、
   `text-wrap` 缺失、`border-radius` 出现在卡片套卡片结构、`number` 类 emoji/`★▸⚙` 顶图标。
2. **截图检查**（等效 `--scope` 的渲染类规则）：对比度取色器量正文与背景（≥4.5:1）、
   量字号（≥14px 正文 / ≥11px UI 字）、量行宽（≤80 字符）、量容器内边距（≥8px）、
   量视口边距（≥16px）、量标题上下间距比。
3. **运行检查**：控制台报错（`script-error`）、图片 404（`broken-image`）、默认态内容不可见
   （`content-hidden-at-rest`）。

判定口径统一为：**命中即记一条 finding，附 file:line 或截图像素坐标 + 严重度 P0–P3**。
