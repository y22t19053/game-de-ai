# IMPLEMENTATION_AND_PREVIEW — 前端视觉实施 + 真实预览

> 输入：`ART_DIRECTION.md` + `VISUAL_LANGUAGE.md` + `ASSET_MANIFEST.md`。输出：`visual/prototype/` 下可跑、可截图的界面 + 迭代记录。
> 铁律：**不改游戏玩法代码**。原型隔离在 `visual/prototype/`，定稿后再由用户决定如何并入工程。

## 1. 先读结构（不要猜）

按工程类型读入口：

| 工程 | 读什么 | 记下什么 |
| --- | --- | --- |
| Godot | `project.godot`（分辨率/window）、主场景 `.tscn`、`ui/` 或场景树里的 Control 节点 | 设计分辨率、锚点/Container 结构、主题资源（`theme/*.tres`）、字体文件 |
| 网页/HTML | `index.html`、`style.css`、游戏脚本 | 现有 DOM 结构、CSS 变量、字体栈、单位体系（px/rem/vh） |
| 其它引擎 | 入口 + UI 场景 | 同上，优先拿分辨率与字体 |

产出 `visual/INTAKE.md`（一页）：分辨率 / 现有字体 / 当前配色 / 界面清单 / 不可动部分。

## 2. 两条实施路线（按载体选）

### A. HTML/CSS 原型（首选，能浏览器预览、迭代最快）
- 单页 `visual/prototype/index.html` + `styles.css` + 少量 `app.js`；素材走相对路径 `../assets/`。
- 尺寸用一个根容器锁定设计分辨率（如 `width:1440px; height:900px`），外层用 `transform: scale()` 适配窗口；移动版单独 `@media` 断点。
- 结构：`<div class="screen" data-screen="main">`，一屏一节，方便只截某屏。
- 动画用 CSS + 极少量 JS；`prefers-reduced-motion` 全降级。
- 字体：优先系统字体栈；要特殊字体先确认许可，放 `visual/assets/fonts/`。

### B. 直接改 Godot 界面
- 先复制目标场景到 `visual/prototype/` 生成副本（改副本不改原文件），或建一个独立 `visual_prototype.tscn` 挂着用；
- 用 Theme 资源集中管颜色/字号/边距，不散落在每个节点；
- 用 `godot_run_project` 起游戏 → `godot_screenshot` 截图 → 对比；不要用 shell 跑 godot。
- 定稿后才把 Theme/贴图合回工程，并在 `visual/CHANGES.md` 列改动点。

## 3. 预览管线（本机）

技能自带脚本：`scripts/shot.mjs`（node 24 + 本机 Edge/Chrome headless）。

```bash
node "<skill>/scripts/shot.mjs" --url "file:///C:/path/visual/prototype/index.html" \
  --out "C:/path/visual/preview/main-1440x900.png" --width 1440 --height 900 --scale 2
# 整页 / 移动端
node "<skill>/scripts/shot.mjs" --url "..." --out ".../mobile-390.png" --width 390 --height 844 --full
```

- 先截**全尺寸 1×** 看排版，再截 `--scale 2` 看文字与材质细节。
- 每次改完必截：改前/改后并排看，不靠记忆。
- 检查项：中文缺字（豆腐块）、字体回退、图片 404、溢出裁切、对比度、留白是否被塞满。
- Godot 项目：`godot_run_project` + `godot_screenshot`，或直接对 HTML 原型截图。

## 4. 迭代闭环（每轮 3 步）

1. **对比**：新截图 vs `ART_DIRECTION.md` 命题句 / vs 上一版；只找「最刺眼的 3 个问题」。
2. **改一处**：一次只改一个维度（构图 / 色彩 / 材质 / 排版 / 动效），改完立刻截图。同时改三处 → 无法归因。
3. **记账**：在 `visual/ITERATIONS.md` 写 `轮次 / 改了什么 / 为什么（指回方向）/ 截图路径 / 是否采纳`。

## 5. 交付判定（不是「看起来不错」）

- [ ] 25% 缩略图能认出是这款游戏（不是通用模板）。
- [ ] 与命题句一致：色彩占比、材质层数、构图比例都能对上。
- [ ] 「明确不要」清单里的东西一个都没出现。
- [ ] 中文/数字在 1× 与 2× 下都清晰，无缺字无回退。
- [ ] hover/active/disabled/loading/error 至少 3 个状态有母题式反馈。
- [ ] 移动端 390 宽重排可用，触控目标 ≥44px。
- [ ] 桌面 1440×900 与移动 390×844 都有截图存档。
- [ ] 所有素材出现在 `ASSET_MANIFEST.md` 且路径可访问。

## 6. 反例

- 直接照抄参考站点的布局 → 得到别人的视觉身份。
- 一次改十个地方再截图 → 好看/难看都无法归因，只能重做。
- 只看 1× 截图就交付 → 高分屏下材质与字重全塌。
- 用「看起来高级」当验收标准 → 换个人看就推翻；验收必须能指回 `ART_DIRECTION.md`。
- 原型改到游戏工程里再迭代 → 污染玩法代码，回滚成本高。
