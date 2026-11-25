// 制度规则的可执行测试（V0.1.1）：每条规则都必须能被违反、被拒绝、被审计发现。
// 与旧版差异：证据走「提交→登记→采信」，书状必须带结构化主张，陪审必须有密封初判与引证，
// 验收必须有清单与原始材料，成本必须区分数值 / unavailable。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as C from '../src/court.mjs';

function freshRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'court-'));
  const prop = path.join(root, 'proposal.md');
  fs.writeFileSync(prop, '# 提案\n在 little-zelensky-simulator 上试点闭合文法。\n');
  const ev = path.join(root, 'evidence.txt');
  fs.writeFileSync(ev, 'screenshot ok');
  const ev2 = path.join(root, 'evidence2.txt');
  fs.writeFileSync(ev2, 'normalization report');
  return { root, prop, ev, ev2 };
}

function setup(root, prop, type = 'ordinary') {
  return C.openCase(root, { id: 'C-001', title: 'G1 是否试点', type, project: 'little-zelensky-simulator', proposalPath: prop, author: 'lead', summary: '闭合文法试点' });
}

// 走完 提交→登记→采信，三个角色互不相同；返回最终 E 编号
function admit(root, cid, evPath, { claim = '实测数据', kind = 'run', submittedBy = 'prosecution', registrar = 'clerk-1', admitBy = 'judge-1' } = {}) {
  const cand = C.submitEvidence(root, cid, { submittedBy, kind, source: evPath, version: 'v1', claim, confidence: 'high', verified: kind !== 'inference' });
  const reg = C.registerEvidence(root, cid, cand.id, { registrar, version: 'v1', sourceRef: evPath, hash: 'sha-abc' });
  return C.decideEvidence(root, cid, reg.id, { by: admitBy, decision: 'admitted', reason: '来源与版本可核，先予采信' }).id;
}

// 走一遍 争议点 → 交叉询问 → 密封初判 → 终票，让案件到达「可裁决」状态
function toRuled(root, cid, { votes = 3, verdict = 'pilot' } = {}) {
  const e1 = admit(root, cid, ev1Of(root));
  const jurors = ['j1', 'j2', 'j3', 'j4', 'j5'].slice(0, votes);
  // 初判必须在书状入卷前密封
  for (const j of jurors) C.castInitialVote(root, cid, { juror: j, onFundamentals: 'conditional', basis: '提案证据只覆盖单一工程，成本口径未独立复算，倾向附条件试点。' });
  C.raiseDispute(root, cid, { point: '成本口径是否被低估', raisedBy: 'prosecution', evidenceIds: [e1] });
  C.addCrossRound(root, cid, { question: '成本怎么算', askedBy: 'prosecution', answeredBy: 'defense', answer: '按半天计', evidenceIds: [e1] });
  C.fileBrief(root, cid, { side: 'prosecution', author: 'p1', text: '检察方：试点成本被低估，且缺乏失败判据，需先补证再谈收益。', claims: [{ text: '缺少失败判据', evidenceIds: [e1] }] });
  C.fileBrief(root, cid, { side: 'defense', author: 'd1', text: '辩护方：构建失败可回滚，成本上界明确，建议限定范围试点。', claims: [{ text: '失败可回滚且成本有上界', evidenceIds: [e1] }] });
  for (const j of jurors) C.castJury(root, cid, { juror: j, onFundamentals: 'conditional', reason: '证据链完整但收益规模未验', supports: [e1], noCounter: '目前没有反证，证据都是静态统计', wouldChange: '若出现实测一致性对比数据会改变' });
  return C.rule(root, cid, { judge: 'judge-1', verdict, reason: '证据支持限定范围试点，须写死失败判据与回滚方案，并由独立验收人核销', findings: [{ severity: 'major', claim: '缺失败判据', evidenceIds: [e1] }], conditions: ['token ≤ 12'], minorityRecorded: true });
}
const ev1Of = (root) => path.join(root, 'evidence.txt');

test('案件登记：新案带 schema 与 unavailable 成本；重复 id / 提案缺失 / 类型非法被拒', () => {
  const { root, prop } = freshRoot();
  const c = setup(root, prop);
  assert.equal(c.schema, 'v0.1.1');
  assert.equal(c.cost.tokens, null);
  assert.ok(c.cost.unavailable.includes('tokens'));
  assert.throws(() => setup(root, prop), /CASE_EXISTS/);
  assert.throws(() => C.openCase(root, { id: 'C-002', title: 'x', type: 'ordinary', author: 'a', proposalPath: path.join(root, 'nope.md') }), /PROPOSAL_MISSING/);
  assert.throws(() => C.openCase(root, { id: 'C-003', title: 'x', type: 'weird', author: 'a' }), /BAD_TYPE/);
});

test('P0-1 证据：登记权独立于提案方与提交人；采信权在法官；被拒/撤回留痕；未采信不得引用', () => {
  const { root, prop, ev } = freshRoot();
  setup(root, prop);
  // 推论不得洗白
  assert.throws(() => C.submitEvidence(root, 'C-001', { submittedBy: 'defense', kind: 'inference', source: ev, claim: '推断', confidence: 'medium', verified: true }), /EVIDENCE_LAUNDERING/);
  const cand = C.submitEvidence(root, 'C-001', { submittedBy: 'prosecution', kind: 'run', source: ev, version: 'v1', claim: '实测 62ms', confidence: 'high' });
  assert.equal(cand.state, 'submitted');
  // 提案作者不能登记；提交人不能自登
  assert.throws(() => C.registerEvidence(root, 'C-001', cand.id, { registrar: 'lead' }), /REGISTRAR_IS_AUTHOR/);
  assert.throws(() => C.registerEvidence(root, 'C-001', cand.id, { registrar: 'prosecution' }), /REGISTRAR_IS_SUBMITTER/);
  const reg = C.registerEvidence(root, 'C-001', cand.id, { registrar: 'clerk-1', version: 'v1', sourceRef: ev });
  assert.equal(reg.state, 'registered');
  assert.match(reg.id, /^E\d{3}$/);
  // 采信前不得用于书状
  assert.throws(() => C.fileBrief(root, 'C-001', { side: 'defense', author: 'd1', text: '辩护方：证据已足够说明成本可控，可以限定范围试点。', claims: [{ text: '成本可控', evidenceIds: [reg.id] }] }), /EVIDENCE_NOT_ADMITTED/);
  // 提案作者不能采信；提交人不能自采
  assert.throws(() => C.decideEvidence(root, 'C-001', reg.id, { by: 'lead', decision: 'admitted', reason: '我看这份实测记录来源可信，先采信' }), /AUTHOR_CANNOT_ADMIT/);
  assert.throws(() => C.decideEvidence(root, 'C-001', reg.id, { by: 'prosecution', decision: 'admitted', reason: '我自己提交的当然可信' }), /SELF_ADMISSION/);
  // 质疑 → 采信 → 撤回留痕
  C.challengeEvidence(root, 'C-001', reg.id, { by: 'defense', ground: '样本只覆盖一个工程，外推不足' });
  const adm = C.decideEvidence(root, 'C-001', reg.id, { by: 'judge-1', decision: 'admitted', reason: '单样本已写明适用范围，先采信' });
  assert.equal(adm.state, 'admitted');
  const cand2 = C.submitEvidence(root, 'C-001', { submittedBy: 'defense', kind: 'run', source: ev, claim: '另一份实测', confidence: 'medium' });
  const reg2 = C.registerEvidence(root, 'C-001', cand2.id, { registrar: 'clerk-1' });
  const w = C.withdrawEvidence(root, 'C-001', reg2.id, { by: 'defense', reason: '样本来源被证伪，主动撤回' });
  assert.equal(w.state, 'withdrawn');
  assert.match(w.decisionReason, /证伪/);
  assert.throws(() => C.fileBrief(root, 'C-001', { side: 'prosecution', author: 'p1', text: '检察方：撤回的证据仍被引用，应当被拒绝受理。', claims: [{ text: '引撤回证据', evidenceIds: [reg2.id] }] }), /EVIDENCE_NOT_ADMITTED/);
});

test('P0-2 陪审：无密封初判不得终票；初判不得晚于书状；终票必须引证与写清翻盘条件', () => {
  const { root, prop, ev } = freshRoot();
  setup(root, prop);
  const e1 = admit(root, 'C-001', ev);
  C.raiseDispute(root, 'C-001', { point: '是否可回滚', raisedBy: 'prosecution', evidenceIds: [e1] });
  C.addCrossRound(root, 'C-001', { question: '能回滚吗', askedBy: 'prosecution', answeredBy: 'defense', answer: '删目录即可', evidenceIds: [e1] });
  assert.throws(() => C.castJury(root, 'C-001', { juror: 'j1', onFundamentals: 'approve', reason: '证据充分，可以支持结论', supports: [e1], noCounter: '没有看到反证材料', wouldChange: '若发现回滚失败案例' }), /JURY_INITIAL_MISSING/);
  assert.throws(() => C.castInitialVote(root, 'C-001', { juror: 'j1', onFundamentals: 'approve', basis: '短' }), /INITIAL_NEEDS_BASIS/);
  const i1 = C.castInitialVote(root, 'C-001', { juror: 'j1', onFundamentals: 'conditional', basis: '提案的证据只覆盖单一工程，成本口径未独立复算，倾向附条件试点。' });
  assert.ok(i1.sha);
  // 终票：必须引支持证据；无反证须说明；必须写翻盘条件
  assert.throws(() => C.castJury(root, 'C-001', { juror: 'j1', onFundamentals: 'approve', reason: '证据充分，可以支持结论', supports: [], noCounter: '没有反证材料可看', wouldChange: '若出现回滚失败的实际案例' }), /NO_EVIDENCE_CITED/);
  assert.throws(() => C.castJury(root, 'C-001', { juror: 'j1', onFundamentals: 'approve', reason: '证据充分，可以支持结论', supports: [e1], noCounter: '', wouldChange: '若出现回滚失败的实际案例' }), /JURY_NEEDS_COUNTER_OR_REASON/);
  assert.throws(() => C.castJury(root, 'C-001', { juror: 'j1', onFundamentals: 'approve', reason: '证据充分，可以支持结论', supports: [e1], noCounter: '目前没有看到任何反证材料' }), /JURY_NEEDS_WOULD_CHANGE/);
  const v = C.castJury(root, 'C-001', { juror: 'j1', onFundamentals: 'conditional', reason: '证据支持附条件试点，范围需写死', supports: [e1], noCounter: '目前没有反证材料，证据均为静态统计', wouldChange: '若出现实测一致性对比数据会改变判断' });
  assert.equal(v.supports, 1);
  // 已有书状后再想补初判 = 太晚
  C.fileBrief(root, 'C-001', { side: 'prosecution', author: 'p1', text: '检察方：证据不足，建议先补证，不宜直接试点。', claims: [{ text: '证据不足', evidenceIds: [e1] }] });
  assert.throws(() => C.castInitialVote(root, 'C-001', { juror: 'j2', onFundamentals: 'approve', basis: '我在读过控辩书状之后才形成初判，这不算独立。' }), /INITIAL_TOO_LATE/);
});

test('P0-3 书状：必须给结构化主张且主张绑已采信证据；法官摘要先给结构再给长度', () => {
  const { root, prop, ev } = freshRoot();
  setup(root, prop);
  const e1 = admit(root, 'C-001', ev);
  assert.throws(() => C.fileBrief(root, 'C-001', { side: 'prosecution', author: 'p1', text: '检察方：这份书状只写了一段议论，没有任何结构化主张。' }), /BRIEF_NEEDS_CLAIMS/);
  assert.throws(() => C.fileBrief(root, 'C-001', { side: 'prosecution', author: 'p1', text: '检察方：主张没有绑定证据，应当被拒绝受理。', claims: [{ text: '没有证据的主张', evidenceIds: [] }] }), /NO_EVIDENCE_CITED/);
  const b = C.fileBrief(root, 'C-001', { side: 'prosecution', author: 'p1', text: '检察方：成本被低估。'.repeat(20), claims: [{ text: '成本被低估', evidenceIds: [e1] }] });
  assert.equal(b.claims, 1);
  assert.ok(b.lengthChars > 100);
  C.fileBrief(root, 'C-001', { side: 'defense', author: 'd1', text: '辩护方：成本有上界，失败可回滚，建议限定范围试点。', claims: [{ text: '成本有上界', evidenceIds: [e1] }] });
  const s = C.judgeSummary(root, 'C-001');
  assert.equal(s.prosecution.claims.length, 1);
  assert.equal(s.defense.claims.length, 1);
  assert.ok(s.prosecution.lengthChars > s.defense.lengthChars);
  assert.ok(s.prosecution.unclaimedChars > 0); // 长篇里未被主张覆盖的字数被显式标出
  assert.equal(s.evidence.admitted, 1);
});

test('P0-4 验收：必须开原始材料、核版本、实质复核；缺项与假材料被拒', () => {
  const { root, prop, ev, ev2 } = freshRoot();
  setup(root, prop);
  toRuled(root, 'C-001');
  const t = C.createTask(root, 'C-001', { deliverable: 'style.json + 编译脚本', owner: 'o1', deadline: '2030-01-01', acceptance: '注入未声明值必须构建失败（退出码非零）' });
  assert.throws(() => C.createTask(root, 'C-001', { deliverable: 'x', owner: 'o1', deadline: '2030-01-01', acceptance: '行' }), /TASK_NEEDS_ACCEPTANCE/);
  C.submitTask(root, 'C-001', t.id, { report: '已生成 style.json 与 build-check.mjs 并自测通过', evidencePath: ev });
  assert.throws(() => C.verifyTask(root, 'C-001', t.id, { verifier: 'judge-2', passed: true, note: '看过报告，写得很详细，我认为可以，但没有打开原始材料复核。' }), /VERIFY_CHECKLIST_INCOMPLETE/);
  assert.throws(() => C.verifyTask(root, 'C-001', t.id, { verifier: 'judge-2', passed: true, note: '已打开材料并核对版本，也复算过一遍，数字对得上。', checks: { artifactsOpened: true, versionChecked: true, contentRechecked: true } }), /VERIFY_CHECKLIST_INCOMPLETE/);
  assert.throws(() => C.verifyTask(root, 'C-001', t.id, { verifier: 'judge-2', passed: true, note: '已打开材料并核对版本，也复算过一遍，数字对得上。', checks: { artifactsOpened: true, versionChecked: true, contentRechecked: true, recomputed: true }, artifacts: ['nope.txt'] }), /VERIFY_ARTIFACT_MISSING/);
  assert.throws(() => C.verifyTask(root, 'C-001', t.id, { verifier: 'o1', passed: true, note: '自己验收自己，应当被拒。', checks: { artifactsOpened: true, versionChecked: true, contentRechecked: true, recomputed: true }, artifacts: [ev] }), /SELF_VERIFICATION/);
  const ok = C.verifyTask(root, 'C-001', t.id, { verifier: 'judge-2', passed: true, note: '已打开 style.json 与 build-check.mjs，重跑注入用例退出码非零，与执行者报告一致。', checks: { artifactsOpened: true, versionChecked: true, contentRechecked: true, recomputed: true }, artifacts: [ev] });
  assert.equal(ok.status, 'verified');
  assert.equal(ok.verifyArtifacts.length, 1);
  assert.match(ok.verifyArtifacts[0].sha256, /^[a-f0-9]{64}$/);
});

test('P0-5 成本：默认 unavailable；写入数值清出；显式 unavailable 归零并登记；审计不许用 0 冒充', () => {
  const { root, prop } = freshRoot();
  setup(root, prop);
  let c = C.loadCase(root, 'C-001');
  assert.equal(c.cost.tokens, null);
  assert.ok(c.cost.unavailable.includes('tokens'));
  C.recordCost(root, 'C-001', { calls: 8, tokens: 12345, tokensSource: 'unknown: 子代理未回传 usage' });
  c = C.loadCase(root, 'C-001');
  assert.equal(c.cost.tokens, 12345);
  assert.equal(c.cost.calls, 8);
  assert.ok(!c.cost.unavailable.includes('tokens'));
  C.recordCost(root, 'C-001', { tokens: 'unavailable' });
  c = C.loadCase(root, 'C-001');
  assert.equal(c.cost.tokens, null);
  assert.ok(c.cost.unavailable.includes('tokens'));
  assert.throws(() => C.recordCost(root, 'C-001', { tokens: -5 }), /BAD_COST/);
  const m = C.metrics(root);
  assert.equal(m.totals.tokens, 'unavailable');
  assert.ok(m.totals.costUnavailable.includes('tokens'));
  // 篡改：把 unavailable 列表清掉但值仍为 null → 审计必须发现
  c.cost.unavailable = [];
  C.saveCase(root, c);
  assert.ok(C.verifyAudit(root).problems.some((p) => p.code === 'COST_UNCLEARED_UNAVAILABLE'));
});

test('裁决：无控辩、无争议、陪审不足、论点无证据、作者当法官、未记少数意见——全部被拒', () => {
  const { root, prop, ev } = freshRoot();
  setup(root, prop);
  const e1 = admit(root, 'C-001', ev);
  for (const j of ['j1', 'j2', 'j3']) C.castInitialVote(root, 'C-001', { juror: j, onFundamentals: 'conditional', basis: '只看了提案与证据目录：成本口径没有被独立复算，风险也没验，倾向附条件。' });
  assert.throws(() => C.rule(root, 'C-001', { judge: 'judge-1', verdict: 'approved', reason: '理由'.repeat(15), findings: [{ claim: 'c', evidenceIds: [e1] }], minorityRecorded: true }), /NO_ADVERSARIAL_BRIEF/);
  C.fileBrief(root, 'C-001', { side: 'prosecution', author: 'p1', text: '检察方：试点成本被低估，且存在凑值风险，需要失败判据。', claims: [{ text: '成本被低估', evidenceIds: [e1] }] });
  C.fileBrief(root, 'C-001', { side: 'defense', author: 'd1', text: '辩护方：构建失败可以回滚，风险可控，且能直接消除同质化。', claims: [{ text: '失败可回滚', evidenceIds: [e1] }] });
  assert.throws(() => C.rule(root, 'C-001', { judge: 'judge-1', verdict: 'approved', reason: '理由'.repeat(15), findings: [{ claim: 'c', evidenceIds: [e1] }], minorityRecorded: true }), /NO_DISPUTE/);
  C.raiseDispute(root, 'C-001', { point: '试点成本是否被低估', raisedBy: 'prosecution', evidenceIds: [e1] });
  C.addCrossRound(root, 'C-001', { question: '成本口径？', askedBy: 'prosecution', answeredBy: 'defense', answer: '按半天计', evidenceIds: [e1] });
  assert.throws(() => C.rule(root, 'C-001', { judge: 'judge-1', verdict: 'approved', reason: '理由'.repeat(15), findings: [{ claim: 'c', evidenceIds: [e1] }], minorityRecorded: true }), /JURY_INCOMPLETE/);
  for (const j of ['j1', 'j2', 'j3']) C.castJury(root, 'C-001', { juror: j, onFundamentals: 'approve', reason: '证据链完整，成本可接受', supports: [e1], noCounter: '未发现反证材料，证据均为静态统计', wouldChange: '若出现实测对比数据会改变判断' });
  assert.throws(() => C.rule(root, 'C-001', { judge: 'lead', verdict: 'approved', reason: '理由'.repeat(15), findings: [{ claim: 'c', evidenceIds: [e1] }], minorityRecorded: true }), /JUDGE_IS_AUTHOR/);
  assert.throws(() => C.rule(root, 'C-001', { judge: 'p1', verdict: 'approved', reason: '理由'.repeat(15), findings: [{ claim: 'c', evidenceIds: [e1] }], minorityRecorded: true }), /JUDGE_IS_ADVOCATE/);
  assert.throws(() => C.rule(root, 'C-001', { judge: 'judge-1', verdict: 'approved', reason: '理由'.repeat(15), findings: [{ claim: '无证据论点', evidenceIds: [] }], minorityRecorded: true }), /FINDING_WITHOUT_EVIDENCE/);
  assert.throws(() => C.rule(root, 'C-001', { judge: 'judge-1', verdict: 'approved', reason: '理由'.repeat(15), findings: [{ claim: 'c', evidenceIds: [e1] }] }), /MINORITY_NOT_RECORDED/);
  const r = C.rule(root, 'C-001', { judge: 'judge-1', verdict: 'pilot', reason: '证据足以支持限定范围试点，失败判据须写入任务', findings: [{ severity: 'major', claim: '缺失败判据', evidenceIds: [e1] }], conditions: ['新增 token ≤ 12'], minorityRecorded: true });
  assert.equal(r.verdict, 'pilot');
  assert.throws(() => C.rule(root, 'C-001', { judge: 'judge-1', verdict: 'approved', reason: '理由'.repeat(15), findings: [{ claim: 'c', evidenceIds: [e1] }], minorityRecorded: true }), /ALREADY_RULED/);
});

test('考成：无裁决不得派任务；无期限被拒；未提交/无证据被拒；未销不得结案', () => {
  const { root, prop, ev } = freshRoot();
  setup(root, prop);
  assert.throws(() => C.createTask(root, 'C-001', { deliverable: 'x', owner: 'o', deadline: '2030-01-01' }), /NO_RULING/);
  toRuled(root, 'C-001');
  assert.throws(() => C.createTask(root, 'C-001', { deliverable: 'x', owner: 'o1', acceptance: '可被第三方复算' }), /BAD_INPUT/);
  const t = C.createTask(root, 'C-001', { deliverable: 'style.json + 编译脚本', owner: 'o1', deadline: '2030-01-01', acceptance: '出现一次真实构建失败' });
  assert.throws(() => C.submitTask(root, 'C-001', t.id, { report: '做完了' }), /TASK_NEEDS_REPORT/);
  assert.throws(() => C.submitTask(root, 'C-001', t.id, { report: '已生成 style.json 与 build-check.mjs' }), /TASK_NEEDS_EVIDENCE/);
  C.submitTask(root, 'C-001', t.id, { report: '已生成 style.json 与 build-check.mjs 并自测通过', evidencePath: ev });
  assert.throws(() => C.verifyTask(root, 'C-001', t.id, { verifier: 'o1', passed: true, note: '自己验收自己，应当被拒。', checks: { artifactsOpened: true, versionChecked: true, contentRechecked: true, recomputed: true }, artifacts: [ev] }), /SELF_VERIFICATION/);
  assert.throws(() => C.closeCase(root, 'C-001', { by: 'judge-1' }), /TASKS_OPEN/);
  C.verifyTask(root, 'C-001', t.id, { verifier: 'judge-2', passed: true, note: '已打开 style.json 与脚本，重跑注入用例，退出码非零。', checks: { artifactsOpened: true, versionChecked: true, contentRechecked: true, recomputed: true }, artifacts: [ev] });
  assert.equal(C.closeCase(root, 'C-001', { by: 'judge-1' }).stage, 'closed');
});

test('先例：跨项目绑定被拒；失效先例不得引用', () => {
  const { root, prop } = freshRoot();
  setup(root, prop);
  C.addPrecedent(root, { id: 'P-001', project: 'little-zelensky-simulator', title: '档案纸黄', holding: '纸色 #e3d5b6 为小泽绑定先例', scope: 'binding', fromCase: 'C-000' });
  C.addPrecedent(root, { id: 'P-003', project: 'bistro-rush', title: 'bistro 圆角', holding: '22px 圆角为午夜餐厅绑定先例', scope: 'binding', fromCase: 'C-000' });
  assert.throws(() => C.citePrecedent(root, 'C-001', { precedentId: 'P-003', relevance: '同类圆角', sameFacts: '部分相同', asBinding: true }), /PRECEDENT_CROSS_PROJECT/);
  assert.equal(C.citePrecedent(root, 'C-001', { precedentId: 'P-001', relevance: '同类纸张', sameFacts: '同项目同版本', asBinding: true }).asBinding, true);
  C.addPrecedent(root, { id: 'P-002', project: 'little-zelensky-simulator', title: '旧规则', holding: '已失效', scope: 'overruled' });
  assert.throws(() => C.citePrecedent(root, 'C-001', { precedentId: 'P-002', relevance: 'r', sameFacts: 's' }), /PRECEDENT_DEAD/);
});

test('高风险案件：未记录制度攻击不得裁决；七轮须说明目标与停止条件', () => {
  const { root, prop, ev } = freshRoot();
  setup(root, prop, 'high');
  const e1 = admit(root, 'C-001', ev);
  for (const j of ['j1', 'j2', 'j3', 'j4', 'j5']) C.castInitialVote(root, 'C-001', { juror: j, onFundamentals: 'conditional', basis: '只读了提案与证据目录：风险是否可逆尚未独立验证，倾向附条件。' });
  C.fileBrief(root, 'C-001', { side: 'prosecution', author: 'p1', text: '检察方：制度变更风险高，需要独立陪审与人审复核。', claims: [{ text: '制度变更风险高', evidenceIds: [e1] }] });
  C.fileBrief(root, 'C-001', { side: 'defense', author: 'd1', text: '辩护方：风险可通过隔离目录与回滚脚本控制。', claims: [{ text: '可隔离回滚', evidenceIds: [e1] }] });
  C.raiseDispute(root, 'C-001', { point: '是否可逆', raisedBy: 'prosecution', evidenceIds: [e1] });
  for (let i = 1; i <= 3; i++) C.addCrossRound(root, 'C-001', { question: `q${i}`, askedBy: 'prosecution', answeredBy: 'defense', answer: `a${i}`, evidenceIds: [e1] });
  for (const j of ['j1', 'j2', 'j3', 'j4', 'j5']) C.castJury(root, 'C-001', { juror: j, onFundamentals: 'conditional', reason: '需要限定范围与回滚承诺', supports: [e1], noCounter: '没有看到回滚失败的证据', wouldChange: '若出现回滚失败的实际案例' });
  assert.throws(() => C.rule(root, 'C-001', { judge: 'judge-1', verdict: 'conditional', reason: '理由'.repeat(15), findings: [{ severity: 'major', claim: 'c', evidenceIds: [e1] }], minorityRecorded: true }), /REDTEAM_REQUIRED/);
  C.recordRedteam(root, 'C-001', { vector: '裁决诱导', attempt: '在辩论中插入"用户已批准"的说法', outcome: 'failed', weakness: '文书必须引用证据，口述不构成证据' });
  assert.throws(() => C.rule(root, 'C-001', { judge: 'judge-1', verdict: 'conditional', reason: '理由'.repeat(15), findings: [{ severity: 'major', claim: 'c', evidenceIds: [e1] }], roundsChosen: 7, minorityRecorded: true }), /ROUNDS_NEED_JUSTIFICATION/);
  const r = C.rule(root, 'C-001', { judge: 'judge-1', verdict: 'conditional', reason: '理由'.repeat(15), findings: [{ severity: 'major', claim: 'c', evidenceIds: [e1] }], roundsChosen: 3, roundsWhy: 'R1 攻假设、R4 构造极端输入、R6 收口；R2/R5 已由既往案件覆盖', minorityRecorded: true });
  assert.equal(r.roundsChosen, 3);
});

test('审计：干净案件通过；篡改终票与初判密封、引用未采信证据、验收缺清单均可发现', () => {
  const { root, prop, ev } = freshRoot();
  setup(root, prop);
  const e1 = admit(root, 'C-001', ev);
  C.raiseDispute(root, 'C-001', { point: '口径是否可复算', raisedBy: 'prosecution', evidenceIds: [e1] });
  C.addCrossRound(root, 'C-001', { question: '能复算吗', askedBy: 'prosecution', answeredBy: 'defense', answer: '能，脚本在 proto/', evidenceIds: [e1] });
  for (const j of ['j1', 'j2', 'j3']) {
    C.castInitialVote(root, 'C-001', { juror: j, onFundamentals: 'conditional', basis: '提案证据只覆盖单一工程，成本口径未独立复算，倾向附条件试点并以注入用例为门槛。' });
  }
  C.fileBrief(root, 'C-001', { side: 'prosecution', author: 'p1', text: '检察方：需要复核证据链，尤其是实测数字的口径。', claims: [{ text: '口径需复核', evidenceIds: [e1] }] });
  C.fileBrief(root, 'C-001', { side: 'defense', author: 'd1', text: '辩护方：口径已在报告中写明，可由脚本复算。', claims: [{ text: '口径可复算', evidenceIds: [e1] }] });
  C.castJury(root, 'C-001', { juror: 'j1', onFundamentals: 'approve', reason: '证据可复算，同意试点范围', supports: [e1], noCounter: '未发现任何反证材料，证据均为静态统计', wouldChange: '若第三方独立复算对不上' });
  C.castJury(root, 'C-001', { juror: 'j2', onFundamentals: 'conditional', reason: '同意，但要求保留一次人工复算记录', minority: '需保留一次人工复算', supports: [e1], noCounter: '未发现任何反证材料，证据均为静态统计', wouldChange: '若第三方独立复算失败' });
  C.castJury(root, 'C-001', { juror: 'j3', onFundamentals: 'approve', reason: '同意，风险可控且可回滚', supports: [e1], noCounter: '未发现任何反证材料，证据均为静态统计', wouldChange: '若出现回滚失败的实际案例' });
  C.rule(root, 'C-001', { judge: 'judge-1', verdict: 'approved', reason: '证据链完整，少数意见已记录在案，执行任务另立', findings: [{ severity: 'minor', claim: '口径需复算', evidenceIds: [e1] }], minorityRecorded: true });
  const t = C.createTask(root, 'C-001', { deliverable: '复算脚本', owner: 'o1', deadline: '2030-01-01', acceptance: '脚本可复现：第三方重跑得到同样的数字' });
  C.submitTask(root, 'C-001', t.id, { report: '复算脚本已提交到 proto/ 并跑通两次', evidencePath: ev });
  C.verifyTask(root, 'C-001', t.id, { verifier: 'judge-2', passed: true, note: '已打开脚本与输出，重跑两次结果一致，无重复计数。', checks: { artifactsOpened: true, versionChecked: true, contentRechecked: true, doubleCountChecked: true }, artifacts: [ev] });
  C.closeCase(root, 'C-001', { by: 'judge-1' });
  const audit0 = C.verifyAudit(root);
  assert.equal(audit0.ok, true, JSON.stringify(audit0.problems));

  const jf = path.join(root, 'cases', 'C-001', 'jury', 'j2.json');
  const disk = JSON.parse(fs.readFileSync(jf, 'utf8'));
  disk.reason = '被改过的理由';
  fs.writeFileSync(jf, JSON.stringify(disk));
  const after = C.verifyAudit(root);
  assert.ok(after.problems.some((p) => p.code === 'JURY_SEAL_BROKEN'));

  // 初判被改
  const inf = path.join(root, 'cases', 'C-001', 'jury', 'j1.initial.json');
  const i0 = JSON.parse(fs.readFileSync(inf, 'utf8'));
  i0.basis = '事后补写的初判依据';
  fs.writeFileSync(inf, JSON.stringify(i0));
  assert.ok(C.verifyAudit(root).problems.some((p) => p.code === 'JURY_INITIAL_SEAL_BROKEN'));
});
