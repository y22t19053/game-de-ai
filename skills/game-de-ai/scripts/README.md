# scripts/

## shot.mjs · 无头浏览器截图

技能自带的最小截图工具，用来把 `visual/prototype/` 渲染成 PNG 做视觉验收。零 npm 依赖（用 Node 内置模块 + CDP over WebSocket），自动探测本机 Edge / Chrome。

```bash
node shot.mjs --url "file:///C:/path/to/visual/prototype/index.html" \
  --out "C:/path/to/visual/preview/main-1440x900.png" \
  --width 1440 --height 900 --scale 2
```

| 参数 | 说明 | 默认 |
| --- | --- | --- |
| `--url` | `http(s)://`、`file:///…`、`data:` 或本机存在的文件路径 | 必填 |
| `--out` | 输出 PNG 路径 | 必填 |
| `--width` / `--height` | 视口尺寸（CSS px） | 1440 / 900 |
| `--scale` | deviceScaleFactor | 2 |
| `--full` | 整页截图（移动端长页用） | 关 |
| `--wait` | 截图前等待 ms（等字体/图片） | 0 |
| `--timeout` | 总超时 ms | 30000 |
| `--browser` | 指定浏览器 exe | 自动探测 |

成功时输出一行 JSON（含 `png.width/height`、`content.width/height`、`bytes`），失败时 exit 1 并给中文原因。

## 用法要点

- **带 query 的深链**必须写完整 `file:///` URL：`file:///C:/…/index.html?screen=game`。直接给相对路径不会被当成 URL。
- **看 `content.width`**：它比 `--width` 大说明页面横向溢出（绝对定位的装饰件最常见），必须修。
- **移动端**用 `--width 390 --height 844 --full`，并检查有没有元素被固定定位压住。
- 截图不保证逐字节稳定（动画、随机、远程字体）；静态页实测连跑一致。
- hover 等交互态不会出现在截图里，交互态要单独写测试页或用 `eval` 触发后截。
- Godot 工程不要用本脚本：走 `godot_run_project` + `godot_screenshot`。
