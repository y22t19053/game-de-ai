# 三道闸门：合并、出包、投稿

每次说「可以了」，问一句：**过的是哪道闸门？** 三道闸门的失败方式完全不同，混着过是事故的开始。

## 一、合并闸门（代码进主干）

四步，顺序不能换：

1. **越界检查** —— `git diff --name-only <base>...HEAD` 与派单白名单比对；顺带查密钥、调试开关、临时文件、`.env`。
2. **独立审查** —— 不写这段代码的人看 diff。审查回执必须指出它看了哪些文件、担心什么；「没问题」不算回执。
3. **全量测试** —— 断言数不低于基线（记下数字，别记「过了」）。UI 改动必须过实机截图。
4. **合入** —— 前三步都过才合。

判失败只看三样：测试的 exit code、失败断言的具体文字、运行日志里的 error 行。**不要**看「大概跑通了」这句话。

## 二、出包闸门（产物能发出去）

按顺序核，任何一项不过就不发：

- [ ] 版本号与变更说明一致（tag、商店页、包内版本号三处相同）
- [ ] `LICENSE` 在包内可读，三方材料标注了许可与出处
- [ ] 干净构建：从干净的 clone 跑一次出包命令，不看本地增量
- [ ] **摘除开发用 autoload / 调试入口**（见下）
- [ ] 真机跑一次：正常启动、进一局、退出；看运行时日志有没有 error
- [ ] 包体自检：清单里每个资产都能打开，路径大小写与实际文件一致
- [ ] 分发形态对应：桌面包 vs Web 包分开验，Web 包要在目标子路径下打开一次

### 引擎专用坑（Godot，实测踩过）

编辑器插件会把一个调试用的 autoload 写回 `project.godot`：

```ini
[autoload]
McpInteractionServer="*res://autoload/mcp_interaction_server.gd"
```

而导出预设的 `exclude_filter` 常常包含 `autoload/*` —— 于是发行包启动直接报：

```
Attempt to open script 'res://autoload/mcp_interaction_server.gd' resulting in error: 1 (File not found)
```

流程写成可逆的三步，不要手工改：

```bash
python tools/strip_dev_autoload.py --strip     # 出包前
# ... 导出 ...
python tools/strip_dev_autoload.py --restore   # 出包后还原，否则下轮开发自己把自己坑了
python tools/strip_dev_autoload.py --check     # 打印 present/absent
```

同类坑：Web 导出要在目标子路径（如 `/game/slug/`）下打开验证资源引用，`file://` 打开正常不代表部署后正常。

## 三、投稿闸门（交到别人手上）

- [ ] **公开仓库与本地一致**：`git ls-remote` 的 HEAD 与本地推送后的 HEAD 相同；比赛要求公开仓的，公开仓落后本地是最常见的隐性失格。
- [ ] **披露如实**：用了生成式 AI 就勾「AI generated: yes」。这不是姿态问题——见下。
- [ ] **规则页复读一遍**：截止时间（含时区）、主题、必需标签、视频时长、是否要求 Demo、获奖后的独家/首发限制。
- [ ] **双满足**：多数 jam 要求「公开仓 + 平台投稿」两件都做，少一件就是没参赛。
- [ ] **回填**：投稿后把 URL、截图、提交时间写进项目文档，并在下次核实时确认状态（`audited` / `approved` / `published` 不是同一个东西）。

### 实测坑：AI 披露会被禁 AI 的 jam 服务端直接拦住

在 itch 上对「明令禁止生成式 AI」的 jam 投稿，勾了 `AI generated: yes` 会收到：

```
This jam only accepts projects that disclose no generative AI was used.
```

这不是警告，是**提交被拒**。反过来，如果作品用了 AI 却勾了 `no`，一旦被举报/抽查，后果比不参赛严重。

所以投稿前先分清单子：

- **禁 AI**：不能用生成式素材，也不要用 AI 披露。这类 jam 适合纯手作/程序化生成的作品。
- **AI 友好**：必须如实披露，披露本身就是合规动作。
- **不表态**：按平台默认，披露 + 说明工具用途。

## 附：一页判定表

| 说法 | 该过哪道闸门 | 该交什么证据 |
|---|---|---|
| 「这个改动没问题」 | 合并闸门 | diff + 独立审查回执 + 全量断言数 |
| 「这个版本能发」 | 出包闸门 | 干净构建记录 + 真机运行日志 + 包体自检 |
| 「已经参赛/上架了」 | 投稿闸门 | 平台 URL + 状态 + `ls-remote` 对照 |
