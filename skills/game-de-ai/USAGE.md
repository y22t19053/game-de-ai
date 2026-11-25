# GAME DE-AI · 安装与使用说明

> 本 skill 是方法论与工具中枢：只提供能力，不接管项目。边界见 `references/governance/PROJECT_ISOLATION.md`；
> 其他项目要调用能力时，把 `references/governance/CAPABILITY_INTERFACE.md` 贴过去。
> 最高层目标与机制体检：`references/governance/MISSION.md`、`references/governance/MECHANISM_RESULTS.md`；
> 阶段收束与路线图：`references/governance/STAGE_SUMMARY.md`。

## 一、装在哪

技能是**纯文件**，没有运行时依赖、不用安装脚本。

| 平台 | 目录 |
| --- | --- |
| Windows（本机） | `C:\Users\11ee11\.dsh\skills\game-de-ai\` |
| macOS / Linux | `~/.dsh/skills/game-de-ai/` |

生效方式：DSH 启动时扫描技能目录；新建会话即可看到 `game-de-ai` 出现在可用技能里。改完文件不需要「安装」，**新开会话（或重载技能目录）就生效**。

目录结构：

```
game-de-ai/
├── SKILL.md                  主技能：分流 + 铁律 + A–H + 自检
├── USAGE.md                  本文件：装、用、维护
├── references/
│   ├── PERSONAL_TASTE.md     个人审美档案（会越长越大）
│   ├── ANTI_AI_PATTERNS.md   R1–R11 反 AI 规则
│   ├── DESIGN_REFERENCE.md   认可的案例
│   ├── DESIGN_LESSONS.md     已验证/待验证经验
│   ├── ART_DIRECTION_GUIDE.md
│   ├── VISUAL_DESIGN_GUIDE.md
│   ├── ASSET_WORKFLOW.md
│   ├── IMAGE_PIPELINE.md     AI 出图接入（本机 ComfyUI 实况 + 八步流程）
│   ├── IMPLEMENTATION_AND_PREVIEW.md
│   ├── COPY_DEAI_GUIDE.md    中文文案去 AI 味总纲（六问/三档/三层/六模式）
│   ├── GAME_COPY_TYPES.md    十类游戏文案的规则与长度预算
│   ├── CHINESE_AI_PATTERN_CATALOG.md  P01–P46 模式库 + 强度/密度/回执
│   ├── copywriting/
│   │   ├── UPSTREAM_RESEARCH.md  6 个上游仓库的授权与吸收结论
│   │   └── CAPABILITY_MAP.md     文案能力四环节与调用关系（已冻结）
│   ├── history/              历史智慧与实用创新考古（找机制，不建制度；调用入口 ENTRY.md）
│   ├── cases/diceverse2/      真实项目案例：DICEVERSE 2.0 生产与制度复盘（CASE / EVIDENCE_TABLE / PRINCIPLES / GAPS）（14–59 流水线生产）
│   │   ├── STOCK_INDEX.md     历史案例库存 物理 59/100 与缺口（对账口径）
│   │   ├── 00_RECOVERY.md    资产恢复 + 20 项制度候选核验 + 100 例扩展建议
│   │   ├── V2_SCOPE.md       V2 八方向（A–H）、V1 五案归档、证据四级规则
│   │   ├── V2_CANDIDATES.md  36 项候选初核表 + 选定 8 项及理由
│   │   ├── V2_SYNTHESIS.md   六种可复用方法 + 对文案/视觉/UI/玩法/AI 的启发
│   │   └── cases/            01–05 制度（V1）· 06–13 技术（V2：青蒿素、人痘、坎儿井、糯米灰浆、秦弩机、糊名誊录、长信宫灯、龙门账）· 14–59 流水线生产（占城稻、育秧移栽、黄泥水淋制糖、卓筒井、灵渠陡门、望火楼、应县木塔、含嘉仓、制图六体、惠民药局、救荒本草、营造法式、天一阁、胆铜法、香篆与漏刻、以工代赈、水运仪象台、天井、冰鉴、罗马军团浮桥、罗马输水道）
│   ├── court/                帝制机制
│   │   ├── IMPERIAL_GOVERNANCE.md  机构、分流、交接物、闸门
│   │   ├── INTERVIEW_ENTRY.md       记者式访谈的可调用入口（触发词 / 每轮动作 / 收尾出票拟）
│   │   ├── NEIGE_INTERVIEW.md      内阁访谈规则
│   │   ├── ZHONGSHU_MENXIA.md      三案起草 + 封驳 + 复议
│   │   ├── LIUBU_DUTIES.md         六部职责与交接接口
│   │   ├── MENXIA_SUBAGENT.md      门下省真独立 subagent 的跑法与证据
│   │   └── SIMULATION.md           一次完整虚构流程跑通的样子
│   └── impeccable/           规则底座（阈值/禁用项/交付闸门）
├── references/governance/    组织边界 / 能力接入 / 反馈登记（协议 V0.1）
├── templates/                复制到 <游戏工程>/visual/ 再填（文件归项目）
│   ├── GAME_DNA.md  ART_DIRECTION.md  VISUAL_LANGUAGE.md  ASSET_MANIFEST.md
│   ├── COPY_VOICE_BIBLE.md  COPY_REVIEW.md
│   └── PIYI.md  ZOUYI.md  DECISION_LOG.md
└── scripts/
    ├── shot.mjs              无头浏览器截图（自检用）
    └── copy_scan.py          确定性文案扫描（排雷，不是判美）
```

## 二、怎么叫它

不用记命令。说人话，技能靠 description 里的触发词命中。常用四种：

**① 直接要方向**（走内阁 + 中书省 + 门下省）

> 给《××》定个美术方向，先别动手，问我想清楚。
> 现在的主菜单太像网页了，帮我重新想，至少三种完全不同的做法。

**①b 只做访谈**（记者模式：一次一问，收尾出票拟）

> 采访我。我想做一款夜宵摊的小游戏，但还没想清楚要什么感觉。
> 进入记者模式，先问我三个问题再谈方案。
> 你先问我，别急着给设计。

启动方式与每轮动作见 `references/court/INTERVIEW_ENTRY.md`；说「直接做」就跳过访谈，不会有人拦你。

**② 直接点部门**（跳过访谈，直达生产）

> 叫兵部把这一屏的布局重排，不要居中卡片。
> 叫礼部给一个色板和字体组合，我要先看方向。
> 叫工部按现有 VISUAL_LANGUAGE 把局内 HUD 做出来，出截图。

**③ 要一份「呈上来」的东西**（票拟/奏议/记录）

> 给我一份创意票拟。
> 出御前奏议，我要选。
> 把这次的决策记进档案。

**④ 只是评审**（走门下省 + 阈值）

> 看看这张截图，哪些地方一眼就是 AI 做的。
> 这套 UI 有没有模板化问题，按 ANTI_AI_PATTERNS 判。
> 让门下省用独立 subagent 审这版文案，别只挑错，给我它的替代方案。

**⑤ 改文案 / 建文风档案**

> 这游戏的台词太 AI 味了，先给我建个说话方式，再改三条看看。
> 把这款的菜单/教程/成就文案过一遍，只改该改的，别加新事实。
> 两款游戏的文案帮我查一下，是不是变成同一个真人口语腔了。

**⑥ 要图**

> 给《××》出四张食物插画候选，风格按现在这份 VISUAL_LANGUAGE。
> 这批图能不能进工程？给我清单和 seed。

## 三、三档用法（别每次都开朝廷）

| 档 | 什么时候用 | 实际跑什么 | 产出 |
| --- | --- | --- | --- |
| **轻** | 改一个值、修溢出、复刻已定组件 | 承旨 → 单部门 → 截图 | 改动 + 截图 + 一行记录 |
| **中** | 已有方向，要一个新界面 | 承旨 → 尚书省拆任务 → 工部实施 → 御前预览 | 原型 + 截图 |
| **重** | 新游戏、换皮、主菜单重做 | 全部十一步（含访谈、三案、封驳、廷议、奏议） | 票拟 + 三案 + 奏议 + WBS + 原型 + 决策记录 |

**判据一句话**：如果这次决定会改「这款游戏长什么样」，就走重档；只改「这一屏摆哪儿」，走中档；只改「这个值不对」，走轻档。

## 四、被项目调用时会写出什么（文件留在该项目）

跑完一次完整流程，你的游戏工程里多出：

```
<游戏工程>/visual/
├── INTAKE.md          现有视觉盘点
├── DECISIONS.md       决策记录（每条含归档类别）
├── GAME_DNA.md        身份指纹
├── ART_DIRECTION.md   艺术方向与命题句
├── VISUAL_LANGUAGE.md 实施手册（token/组件/动效/例外表）
├── ASSET_MANIFEST.md  素材清单（含缺口列 + AI 生成项的模型/seed）
├── COPY_VOICE_BIBLE.md 这款游戏的说话方式（改文案前必读）
├── ITERATIONS.md      每轮改了什么的记录
├── copy/              文案前后对比（COPY_BASELINE / COPY_DIFF / COPY_REVIEW / *_scan.json）
├── assets/  prototype/  preview/
```

**原型永远在 `visual/prototype/`**，不碰游戏原有代码；要接进正式工程时，按 `VISUAL_LANGUAGE.md` 抄常量，不要复制粘贴原型里的散装样式。

## 五、截图怎么跑（自检那一关）

```bash
node "<技能目录>/scripts/shot.mjs" \
  --url "file:///<工程绝对路径>/visual/prototype/index.html" \
  --out "<工程>/visual/preview/main-1440x900.png" \
  --width 1440 --height 900 --scale 2
```

- 带 query 的深链必须写完整 `file:///` URL，否则脚本不认相对路径。
- 移动端加 `--width 390 --height 844 --full`。
- 依赖本机 Edge/Chrome（脚本会自动探测）；只在 Windows 上验证过。
- Godot 工程不要用这个脚本，走 `godot_run_project` + `godot_screenshot`。

## 五之二、文案怎么扫（只排雷）

```bash
python "<技能目录>/scripts/copy_scan.py" --file <导出的文本.json> --json --out <工程>/visual/copy/_scan.json
```

- 输入是 `[{"id","type","text"}]`；`type` 用十类之一（button/nav/label/toast/tutorial/dialogue/narration/item/shop/ending/notice）。
- **零命中 ≠ 通过**：它只查长度预算、占位符、连接词密度、客服腔这类机械项；「像不像人写的」靠 `COPY_REVIEW.md` 三层复核。
- 本机 python：`C:\Users\11ee11\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe`（PATH 上的 python 是 2.7，别用）。

## 五之三、出图怎么跑（本机现有 ComfyUI）

```powershell
& "_research\local-ai-stack\scripts\stop-ai.ps1"                       # 先释放显存（8GB 卡只许一个重服务）
& "_research\local-ai-stack\scripts\start-ai-stack.ps1" -NoWindow      # 起 8188
python "_research\local-ai-stack\scripts\comfy_batch.py" --prompts p.txt --run <run> `
  --ckpt sd_xl_base_1.0 --steps 8 --cfg 6.0 --width 1024 --height 1024 --seed 1234
```

- 输出在 `D:\AI\datasets\comfy_out\<run>\`（PNG + 同名 json sidecar + run_manifest）。
- 透明背景**当前不可用**（无抠图模型）；要透明就用 SVG/CSS 画，或另开云服务（先报成本）。
- 授权：`flux1-dev` 禁商用；SDXL/RealVisXL/Juggernaut 可商用附条件；Lightning/LoRA/放大模型待核。
- 详细八步流程与验收见 `references/IMAGE_PIPELINE.md`。

## 六、维护

| 想做的事 | 改哪里 | 注意 |
| --- | --- | --- |
| 加一条审美判断 | `references/PERSONAL_TASTE.md` | 标 `[确认]/[推断]/[待验证]`，别写形容词 |
| 加反 AI 规则 | `references/ANTI_AI_PATTERNS.md` | 必须有「现象 → 判断 → 替代方案」，编号接 R11 |
| 记一个认可案例 | `references/DESIGN_REFERENCE.md` | 给截图路径；写清「可迁移的方法」 |
| 攒经验 | `references/DESIGN_LESSONS.md` | 先进「待验证」，两次成立再升「已验证」 |
| 调阈值/禁用项 | `references/impeccable/CORE_RULES.md` | 它是 vendored 上游；要改就写在 `DESIGN_LESSONS.md` 里做本机裁决，别改上游正文 |
| 调流程/职责 | `references/court/*.md` | 改完同步 `SKILL.md` 的机构表 |
| 加一条中文 AI 模式 | `references/CHINESE_AI_PATTERN_CATALOG.md` | 编号接 P47；必须给「识别信号 + 改法」，不许只列词 |
| 改文案处理策略 | `references/COPY_DEAI_GUIDE.md` | 三档/三层/六模式任一处改动都要同时改 `COPY_REVIEW.md` 模板 |
| 换出图通道或模型 | `references/IMAGE_PIPELINE.md` | 同时改 `USAGE.md` 的命令与 `ASSET_MANIFEST.md` 的字段 |
| 换门下省跑法 | `references/court/MENXIA_SUBAGENT.md` | 换了就跑一次并留 `_research/…/EVIDENCE_*.md` |
| 升级上游 Impeccable | 重跑一次 distill，覆盖 `references/impeccable/` | 记新 commit 到 `UPSTREAM.md` |

**版本**：当前 V0.2（V0.1 视觉 + 帝制议事层；V0.2 加文案去 AI 味、门下省真 subagent、AI 出图接入）。改动记在 `DESIGN_LESSONS.md` 顶部「变更」小节即可，不单独维护 CHANGELOG。

## 七、已知限制

1. **门下省已可真独立**：用 `subagent`（新上下文）或 `spawn_teammate context:"fresh"` 跑，输入只给四样（旨意/视觉档案/三案原件/规则底座），证据落 `_research/v02_menxia/EVIDENCE_*.md`。**降级跑（同会话分阶段写）必须显式标注「降级运行」**，不许包装成多智能体。
2. **截图即验收**：脚本能证明「渲染出来了」，不能证明「好看」；好看与否最终由你在奏议上拍板。
3. **字体**：本机没有 CJK 等宽字体（`alt-c` 实测回退到 Microsoft YaHei）；要做真等宽中文得内置子集字体，与「零外部请求」冲突。另：`archive-serif.woff2` **不含汉字**，标题中文实际由系统 Noto Serif SC 渲染。
4. **平台**：截图脚本 Windows/Edge 验证过；Linux/macOS 需改浏览器探测。
5. **不碰玩法**：本技能只管视觉层与玩家可见文案；数值、剧情走向、存档、系统架构在别的流程里做。
6. **文案扫描器判不了美**：`copy_scan.py` 只排雷（长度/占位符/客服腔/密度）；实测把有 AI 味的 10 条判成 0 命中。**AI 检测器分数也不用**——它既不能证成也不能证伪。
7. **AI 出图的三条硬限制**：8GB 显存一次只能跑一个重服务；透明背景当前无通道；`flux1-dev` 禁商用、部分 LoRA 许可未核。
8. **两款测试未回填工程**：V0.2 的文案对比与生成图都留在 `visual/v02_test/` 与 `visual/assets/gen/`，**没有改动原工程源码**，确认后才回填。
