# AI 图片生成接入（本机实况）

> 目的：把「要一张图」变成可复现的四步——定风格 → 定规格 → 出图 → 进清单。
> 本机实况盘点见 `_research/v02_image_env/IMAGE_ENV.md`（2026-11-15 实测）；本篇是可执行口径。

## 0. 本机有什么（别重装）

| 通道 | 状态 | 速度 | 透明背景 | 商用 | 费用 |
|---|---|---|---|---|---|
| **A 本地 ComfyUI + SDXL** | ✅ 已装，**推荐** | Lightning 4 步 ≈7s；28 步 ≈19s（1024²） | ❌ | 视 checkpoint 而定（附限制） | 0 |
| B 本地 Flux.1 | ⚠️ 有 fp8 权重，8GB 卡吃力 | ≈41s | ❌ | `flux1-dev` **禁商用**；schnell 可 | 0 |
| C 云端抠图/生图 API | ❌ 无凭证 | — | ✅ 唯一可用路径 | 服务商条款 | 按量 |

- 安装：`C:\Users\11ee11\Tools\comfyui\ComfyUI_windows_portable`；服务 `http://127.0.0.1:8188`。
- 起停：`_research\local-ai-stack\scripts\start-ai-stack.ps1 -NoWindow`（日志 `comfyui.start.log`）／`stop-ai.ps1`。
- **铁律：8GB 显存同时只能跑一个重服务——出图前先停 LLM（Ollama）；D 盘是外接 USB，冷加载慢、偶尔掉线。**
- 批量：`_research\local-ai-stack\scripts\comfy_batch.py --prompts p.txt --run <name> --ckpt <ckpt> --steps N --cfg C --width 1024 --height 1024 --seed 1234`。输出 `D:\AI\datasets\comfy_out\<run>\*.png` + 同名 `.json` sidecar + `run_manifest.json`。
- 模型位置：`D:\ComfyModels` 与 `D:\AI_STACK\01_MODELS\ComfyUI`（由 `extra_model_paths.yaml` 挂载）。

## 1. 八步流程（缺一步就退回）

| 步 | 谁 | 交付物 | 判据 |
|---|---|---|---|
| 1 需求 | 尚书省 | 哪张图、放哪个界面、多大、什么比例 | 能指到 `VISUAL_LANGUAGE.md` 的一个位置 |
| 2 风格 | 礼部 | 一段英文风格 brief（材质/线条/光/色）+ 3 个禁用项 | brief 里的每个词都能在截图上验证 |
| 3 规格 | 户部 | 尺寸、格式、透明与否、文件命名、存放路径 | 尺寸来自界面实测，不是整数癖好 |
| 4 出图 | 工部 | 3–4 张候选（同 brief 不同 seed） | 至少两张「不离谱」，先过自己的眼 |
| 5 筛选 | 礼部/兵部/刑部 | 选 1 张 + 3 条具体理由（线宽/色相/阴影方向） | 理由指到像素，不写「更有感觉」 |
| 6 确认 | 皇帝 | 一句「用这张」或「再出一版」 | 不以「工作流跑通」为通过 |
| 7 入库 | 户部 | 文件进 `<工程>/visual/assets/gen/<run>/` | 原图与 sidecar 一起留 |
| 8 清单 | 户部 | `ASSET_MANIFEST.md` 一行：用途/尺寸/模型/seed/提示词路径 | 半年后能一模一样重出 |

## 2. 风格一致性（同项目内）

同一批图必须共享三个常量，缺一就会「像不同人画的」：

1. **线宽/描边**：如「粗黑描边 ≈4px@1024」；
2. **色相与套色数**：不要每张换配色方案，允许的色数写死在 brief 里；
3. **光与影方向**：硬影统一右下（或统一无影），阴影长度一致。

**做法**：一次只跑同批 4 张；跨批时把上一批的 seed 与 ckpt 记下来，换 batch 时只改主体词，不改风格词。

## 3. 提示词模板

```
<主体，含数量与状态>, <视角与构图>, <材质与做法>, <风格与年代>,
flat 2-3 color screen print, thick black outline, hard offset shadow to bottom-right,
no gradient, no photo, no plastic highlight, plain <底色> background, centered, generous margin
```

负面：`photo, 3d render, gradient, glow, text, watermark, logo, blurry, extra limbs`

- **中文意图 → 英文提示词**：先写中文 brief（给礼部看），再压成英文（给模型看）；两边都留档。
- **不要把 UI 文字烘进图**：需要文字的地方由 HTML/CSS 画（图里的字在缩放时必糊）。
- **透明背景当前不可用**：要么设计成「纯色底 + 程序化裁切/混合模式」，要么用 SVG/CSS 画，要么另开云抠图（先报成本）。

## 4. 可追溯（缺一项等于没做）

`ASSET_MANIFEST.md` 每行至少：`id / 用途 / 文件 / 尺寸 / 模型(ckpt) / LoRA / steps / cfg / sampler / seed / 提示词文件 / 生成日期 / 采用状态`。
`D:\AI\datasets\comfy_out\<run>\` 的 sidecar JSON 是原始证据，不要删。

## 5. 授权红线（写进清单，不问就别说「可商用」）

- `flux1-dev-fp8`：**禁商用**（只做内部试验）。
- SDXL base / RealVisXL / Juggernaut：可商用**附条件**（模型卡条款各不相同，采用前逐条看清）。
- Lightning LoRA / 放大模型：许可未核 → 视为待确认，不进正式发布素材。
- 字体与外部素材同样要授权：`archive-serif.woff2` 之类要查来源许可（本机该字体许可未知）。

## 6. 验收（不是「工作流存在」）

- [ ] 真的出了图，且截图里能看到它进界面；
- [ ] 同批 ≥3 张放在一起，不靠说明能看出是同一套；
- [ ] 尺寸/格式/透明与否与界面需求一致；
- [ ] 清单能复现（拿 seed + ckpt + 提示词能重出近似图）；
- [ ] 授权状态已写（可商用 / 仅试验 / 待确认）。

## 7. 反例

- 先跑工作流再想「这图放哪」→ 出了漂亮的图但没有容身之处，白跑。
- 每张图单独调提示词 → 风格各自漂移，最后只能靠「都加了描边」自我安慰。
- 用 512² 出图再放大到 1024 → 描边与刻痕细节全糊，在 UI 里一眼假。
- 把「能生成」当「已接入」→ 交付报告经不起追问（问：哪张、放哪、seed 多少）。
