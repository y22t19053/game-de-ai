# V0.1.1 交付清单（十项）

本轮只修 C-001 暴露的五处程序漏洞 + 给出 V0.2.0 计划，**不实施 V0.2.0、不改任何游戏源码、不发布任何版本**。

| # | 交付项 | 文件 | 一句话 |
|---|---|---|---|
| ① | 修改说明 | `docs/V011_CHANGELOG.md` | 五个 P0 的「之前/之后」对照、兼容性与未解决问题 |
| ② | 独立证据登记规范 | `docs/EVIDENCE_AND_PRECEDENT.md`（新增「V0.1.1 补充」节）+ `src/court.mjs` | 三段式 `submit/register/decide`，六状态机，被拒也留痕 |
| ③ | 陪审与初判密封规范 | `docs/PROCEDURE.md` §7 + `docs/V011_CHANGELOG.md` P0-2 | 初判密封文件 + 终票三要件（supports / against 或 noCounter / wouldChange） |
| ④ | 书状篇幅偏差测试结果 | `docs/ORDER_BIAS_TEST.md` | n=2 换序不翻转；偏差来自论证密度而非字数；处置是披露不是限长 |
| ⑤ | 独立验收升级报告 | `docs/VERIFICATION_V011.md` | checklist（打开材料 / 核版本 / 复算）+ artifacts sha256 |
| ⑥ | 成本统计与缺失项说明 | `docs/COST_MODEL.md` + `metrics` | `null` + `unavailable[]`；tokens/API 费用不可得，明确不写 0 |
| ⑦ | 完整自动化测试报告 | `docs/TEST_REPORT.md` 第八节 | `node --test` 11/11 |
| ⑧ | 红队结果 | `docs/REDTEAM.md` + `test/redteam.mjs` + `docs/REDTEAM_RESULTS.json` | 23 次攻击，21 挡住，2 如实失败（A4 篇幅、A11 批量申报） |
| ⑨ | git commit / 变更清单 / 回滚方案 | `docs/ROLLBACK.md` + `git log` | 三种回滚；C-001 八文件 sha256 已复验未变 |
| ⑩ | V0.2.0 适配计划 | `docs/V020_PLAN.md` | 分流判据、门下省边界、真实案件 ≥1、失败判据写死 |

## 附：本条新增的实跑证据

- **C-002 影子案件**（`docs/CASE_REPORT_C002.md`）：真实争议「G2 做门禁还是探针」，按 V0.1.1 流程走完 11 步。
- **C-001 冻结校验**：8 个文件 sha256 与 `docs/C001_FREEZE.md` 逐字节一致（`briefs/prosecution.txt` 3382B、`case.json` 51773B 等）。
- **审计**：`ok: true, problems: [], warnings: [JURY_INITIAL_LATE(c002-j3)]`——唯一的 warning 是诚实披露一次入库迟到，不是掩盖。
- **红队自身教训**：V0.1 的 16 次「全部被挡住」是假绿（旧签名先被 `BAD_PARTY` 拦下，攻击没走到被测点），已重写夹具后复测。

## 未做（明确）

- 未跑 A/B/C 对照的新一轮（V0.1 已有 `docs/AB_COMPARISON.md`；V0.1.1 只补了成本统计骨架，没有为了凑数再开一庭）。
- 未打通 DSH 会话日志的 token 采集（列在 V0.2.0 的 V020-3，本轮不承诺）。
- 未实施 V0.2.0 的任何一条（用户明确「本轮只出计划」）。
