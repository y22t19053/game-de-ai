# SOURCE — Impeccable 取证与出处

> 本目录所有规则均从**原始文件**读出，没有凭记忆转述，也没有依赖二手博客。
> 取证时间：2026-11-15。工作机：Windows，node v24.22.1 / npm 11.19.1（可用）。

## 1. 它到底是什么（结论先行）

**Impeccable 不是库，也不是 CSS 框架**，而是：

> 一套给「AI 编码代理」用的**设计技能包（skill）** + 一个可选的 **Rust 引擎二进制**（做确定性检测与浏览器 overlay）。

- 技能包 = `SKILL.md` 路由 + **45 个 playbook**（`reference/*.md`，其中 5 个是降级版子代理）+ 命令清单。
- 引擎 = `impeccable.exe`，负责 `detect`（62 条规则）、`context`（按需吐 playbook）、`live`（浏览器 overlay）、
  `motion-capture`、`generate-image` 等；**npm 包里没有它**，运行时从 GitHub Releases 下载。
- 上游**原生支持 DSH**：README 工具表列 `DeepSeek Harness → 仓库目录 .dsh/ → 全局 ${DSH_HOME:-$HOME/.dsh}/skills/`。

## 2. 版本与许可

| 项 | 值 | 来源 |
| --- | --- | --- |
| npm 包名 | `impeccable` | registry |
| 技能版本 | **4.9.1**（共 48 个版本，自 2.0.0 起；latest 发布 2026-11-14T00:09:29Z） | registry `dist-tags.latest` |
| 引擎版本 | **0.1.24** | 仓库 `skill/scripts/VERSION` |
| 许可 | **Apache-2.0** | registry `license` + `LICENSE` + `SKILL.md` frontmatter |
| 描述 | Design skills, commands, and anti-pattern detection for AI coding agents | registry |
| 仓库 | github.com/pbakaus/impeccable（约 110k stars） | README |
| 主页 | https://impeccable.style ；文档 /docs | README |
| 依赖 | 无 runtime deps；node >=18.19.0 | registry |

**许可证含义**：Apache-2.0 允许 vendor 与修改，但分发时必须随附 LICENSE 全文并标注修改（详见 `INTEGRATION.md` §7）。

## 3. 已知唯一 commit（可复现）

```
GITHUB_HEAD_SHA = 2b86d9c07b97d4bed7de23583e1bd1e58dd2baae
commit 时间 = 2026-11-15T01:52:02Z
commit 标题 = Merge pull request #1473 from pbakaus/hotfix/next-branch
```

`_vendor/GITHUB_HEAD_SHA.txt` 与 `_vendor/github-tree.json`（5417 条目）记录了这个树。
所有 raw 下载都钉在这个 commit 上 —— 引用具体行时带上 sha 即可复现。

## 4. 获取清单（一手 vs 间接）

### 一手（直接抓到原始字节，本地留存）

| 材料 | 地址形态 | 本地路径 |
| --- | --- | --- |
| npm registry 全量元数据 | `https://registry.npmjs.org/impeccable` | `_vendor/npm-registry.json` |
| npm tarball 4.9.1 | `https://registry.npmjs.org/impeccable/-/impeccable-4.9.1.tgz` | `_vendor/impeccable-4.9.1.tgz` |
| tarball 解包（**只有下载器，无设计内容**） | — | `_vendor/pkg/package/**` |
| 仓库 HEAD sha + 全树 | GitHub API `git/refs/heads/main`、`git/trees/<sha>?recursive=1` | `_vendor/GITHUB_HEAD_SHA.txt`、`_vendor/github-tree.json` |
| `SKILL.md` + 45 个 playbook + `scripts/{VERSION,command-metadata.json}` | `raw.githubusercontent.com/pbakaus/impeccable/2b86d9c0/.dsh/skills/impeccable/**` | `_vendor/repo-2b86d9c0/.dsh/skills/impeccable/**` |
| 62 条检测规则定义 | 同上 `crates/live/assets/antipatterns.json` | 同目录 |
| 规则实现（用于核对阈值与 ID） | `crates/detect/src/list_rules.rs`、`crates/core/src/checks/rules.rs`、`crates/foundation/src/rules/{text,types}.rs` | 同路径 |
| 风格与移植说明 | `docs/STYLE.md`、`docs/PORTING-GUIDE.md` | `docs/` |
| 许可全文 | `LICENSE` | `repo-2b86d9c0/LICENSE` |

共 **61 个上游文件**已落盘（含 45 个 playbook + `SKILL.md` + 规则资产 + 实现源码 + 文档 + LICENSE）。

### 间接（只读了渲染后的文档页，用于补 CLI 契约）

| 材料 | 地址 | 用途 |
| --- | --- | --- |
| Detector 使用文档 | `https://impeccable.style/docs/detector` | 补 `detect` 的 flag / 退出码 / 忽略机制（原文在 README 亦有，二者一致） |

**没有使用**任何第三方博客、二手总结或模型记忆作为规则来源。

## 5. 关键核验结果（防走偏）

1. **npm 包里没有设计规则**。`impeccable-4.9.1.tgz` 仅 16912 字节，7 个文件：
   `LICENSE`、`package.json`、`README.md`、`README.npm.md`、`README.repo.md`、`cli/bin/cli.js`、
   `skill/scripts/engine-checksums.txt`。`cli.js` 的职责只是「找/下引擎并 exec」。
   → 任何人若声称从 npm 包里读到了规则，那是在编。
2. **规则总数 62（slop 31 + quality 31）**，与 README 宣称一致（实测 `Group-Object category`）。
3. **`severity` 字段只覆盖 18/62 条**：16 条 `advisory`（`bounce-easing`、`hard-offset-shadow`、`em-dash-overuse`、
   `clipped-overflow-container`、4 条 `design-system-*` 等）+ 2 条 `error`（`script-error`、`content-hidden-at-rest`）；
   **其余 44 条无该字段，默认即 primary finding**。规则描述里出现 `banned outright` 的只有 3 条：
   `kicker-above-heading`、`undersized-ui-text`、`clipped-overflow-container`（后者仍是 advisory）。
   → 真正「任何 brief 都救不回来」的只有 kicker；`undersized-ui-text` 是硬失败；其余都是可赎回的类别默认值。
4. **`justified-text` 对 CJK 不上报**（字符网格对齐文字被豁免）—— 容易被误读成「中文两端对齐违规」，已核对实现。
5. **`em-dash-overuse` 是 advisory**（≥8 个 且 约 1/500 字符密度），不会让扫描失败（退出码仍为 0）。

## 6. 没有做的事（诚实边界）

- **没有安装引擎**。`npx impeccable ...` 首次运行会写 `~/.impeccable/bin/<version>/`（全局缓存），
  与「不污染用户全局环境」的要求冲突，故未执行 —— 因此 `detect` 的**真实输出格式**未在本机观测，
  CLI 契约来自 `cli.js` 源码 + README + 官方文档页三处互证。
- **没有跑 `detect` 的任何一次真实扫描**。所有阈值来自规则定义文件（`antipatterns.json`）与实现源码，
  不是从扫描输出反推。
- **没有验证 `live` / `generate-image` / `motion-capture`**：这些依赖引擎与图像生成，本机不具备。
  它们的**行为描述**来自 playbook 原文，未实测。
- **`main` 分支会前进**。本文钉在 `2b86d9c0`；上游若已更新，行号与文件可能漂移，按 sha 复现即可。

## 7. 复现方式

```bash
# 1) 版本与许可
curl -s https://registry.npmjs.org/impeccable | jq '{version:."dist-tags".latest, license, description}'

# 2) 确认 npm 包只是 shim
curl -sL https://registry.npmjs.org/impeccable/-/impeccable-4.9.1.tgz -o pkg.tgz && tar tzf pkg.tgz

# 3) 钉住 commit 取原文（把 <SHA> 换成上面的 sha）
SHA=2b86d9c07b97d4bed7de23583e1bd1e58dd2baae
curl -s "https://api.github.com/repos/pbakaus/impeccable/git/trees/$SHA?recursive=1" -o tree.json
curl -sL "https://raw.githubusercontent.com/pbakaus/impeccable/$SHA/.dsh/skills/impeccable/reference/craft-floor.md"

# 4) 若将来确实需要引擎（会写 ~/.impeccable/bin，属全局改动，需用户同意）
npx -y impeccable detect --list-rules
```

## 8. 本目录产出的对应关系

| 文件 | 由哪些上游文件提炼 |
| --- | --- |
| `CORE_RULES.md` | `reference/craft.md`、`craft-floor.md`、`typeset.md`、`layout.md`、`colorize.md`、`animate.md`、`clarify.md`、`harden.md`、`bolder.md`、`quieter.md`、`distill.md`、`delight.md`、`critique.md`、`critique-rubric.md`、`crates/live/assets/antipatterns.json` |
| `COMMANDS.md` | `SKILL.md`、`scripts/command-metadata.json`、45 个 playbook 的命令语义、`cli/bin/cli.js`、`README.md`、`/docs/detector` |
| `INTEGRATION.md` | 上述全部 + 本机 `C:\Users\11ee11\.dsh\skills\game-de-ai\` 的实际文件盘点 |
| `CORE_RULES.md` §8 | 62 条 ID 与阈值逐条取自 `antipatterns.json`，未做增删 |
