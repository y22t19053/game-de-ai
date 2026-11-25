# VISUAL_LANGUAGE — <游戏名>

> 定位：实施手册。写 CSS / 建 Godot Theme 时查这一页，不要再临场决定。
> 由 `ART_DIRECTION.md` 派生；两者冲突时以 ART_DIRECTION 为准并回改此处。

## 1. 设计常量
```css
:root{
  --bg:#; --panel:#; --ink:#; --ink-dim:#; --accent:#; --accent-ink:#; --danger:#; --ok:#;
  --fs-1:12px; --fs-2:16px; --fs-3:24px; --fs-4:40px; --fs-5:72px;
  --gap-1:8px; --gap-2:12px; --gap-3:24px; --gap-4:64px;
  --radius:2px; --col-ratio:3/5;
  --dur-fast:80ms; --dur-mid:160ms; --dur-slow:240ms;
  --ease-in:cubic-bezier(.2,.8,.2,1); --ease-over:cubic-bezier(.2,1.4,.3,1);
  --font-title:; --font-body:; --font-num:;
}
```

## 2. 网格与断点
| 断点 | 列 | 说明 |
| --- | --- | --- |
| `>1024` | 非对称 <3:5> | 出血允许 -6% |
| `640–1024` | 两列 | 出血收窄到 -3% |
| `<640` | 单列 | 元信息折叠，触控 ≥44px |

## 3. 组件规格
| 组件 | 母题来源 | 规格要点 |
| --- | --- | --- |
| 主按钮 | | 高度/内边距/边框/按下反馈 |
| 次按钮 | | |
| 面板 | | 材质层/边框/内阴影 |
| 数值块 | | 字体/对齐/单位 |
| 列表行 | | 分隔线而非卡片 |
| 弹窗 | | 遮罩做法 |
| 图标 | | 网格/笔压/尺寸档 |

## 4. 状态
| 状态 | 视觉 | 时长 |
| --- | --- | --- |
| hover | | 80ms |
| active | | 80ms |
| disabled | | — |
| loading | | |
| error | | 120ms |
| success | | |

## 5. 排版细则
- 行长上限 / 行高 / 字距规则 / 中文标点 / 数字等宽：

## 6. 反例（本项目专属，从 ART_DIRECTION「明确不要」展开）
1. <不要出现的东西 + 具体表现>
2. <…>

## 7. 文件与类命名
```
.screen / .screen[data-screen="main"]
.panel / .panel__head / .btn--primary / .stat / .stat__num
```
