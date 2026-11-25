// 制度压力测试（V0.1.1）：用「制度攻击方」的手法攻击制度本身。
// 每个攻击在独立临时根里跑，不碰正式案卷。
// 判据：抛 CourtError 或审计报问题＝被挡住；无抛错且审计干净＝制度有洞，如实记录。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as C from '../src/court.mjs';

const rows = [];

function tmp() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'court-redteam-'));
  const prop = path.join(root, 'proposal.md');
  fs.writeFileSync(prop, '# 提案\n最小提案，用于制度压力测试，含失败判据与回滚方案。\n');
  const ev = path.join(root, 'evidence.txt');
  fs.writeFileSync(ev, 'ok');
  return { root, prop, ev };
}

// 建一个「程序完备但还没写书状」的案子：证据三段式 → 初判 → 争议 → 质询
function seedNoBriefs(root, prop, ev, { type = 'ordinary', project = 'bistro-rush', jury = null, id = 'C-900' } = {}) {
  C.openCase(root, { id, title: '压力测试案', type, project, proposalPath: prop, author: 'lead', summary: 'redteam seed' });
  const cand = C.submitEvidence(root, id, { submittedBy: 'prosecution', kind: 'run', source: ev, claim: '种子证据：真实存在的测试文件', confidence: 'high' });
  const reg = C.registerEvidence(root, id, cand.id, { registrar: 'clerk-x', version: 'v1' });
  C.decideEvidence(root, id, reg.id, { by: 'judge-x', decision: 'admitted', reason: '单样本已写明适用范围，先采信' });
  const jn = jury || C.CASE_TYPES[type].juryMin;
  for (let i = 1; i <= jn; i++) {
    C.castInitialVote(root, id, { juror: `j${i}`, onFundamentals: i === 1 ? 'conditional' : 'approve', basis: `种子初判 ${i}：只读了提案与证据目录，成本口径未被独立复算，倾向有条件。` });
  }
  C.raiseDispute(root, id, { point: '成本口径是否成立', raisedBy: 'prosecution', evidenceIds: [reg.id] });
  for (let i = 0; i < C.CASE_TYPES[type].crossMin; i++) {
    C.addCrossRound(root, id, { question: `种子质询 ${i + 1}`, askedBy: 'prosecution', answeredBy: 'defense', answer: `种子回答 ${i + 1}`, evidenceIds: [reg.id] });
  }
  return { id, evId: reg.id, candId: cand.id };
}

// 在 seedNoBriefs 之上补齐书状与终票
function seed(root, prop, ev, opts = {}) {
  const s = seedNoBriefs(root, prop, ev, opts);
  const id = s.id;
  const jn = opts.jury || C.CASE_TYPES[opts.type || 'ordinary'].juryMin;
  C.fileBrief(root, id, { side: 'prosecution', author: 'p1', text: '检察方种子书状：本方案缺少失败判据，成本口径也未给出，建议不予批准。', claims: [{ text: '缺少失败判据', evidenceIds: [s.evId] }] });
  C.fileBrief(root, id, { side: 'defense', author: 'd1', text: '辩护方种子书状：失败判据已写入提案第四节，回滚方案见第二段，可以试点。', claims: [{ text: '失败判据已写入提案', evidenceIds: [s.evId] }] });
  for (let i = 1; i <= jn; i++) {
    C.castJury(root, id, { juror: `j${i}`, onFundamentals: i === 1 ? 'conditional' : 'approve', reason: `种子终票 ${i}：支持证据可读，条件与保留意见另记。`, minority: i === 1 ? '我保留：需要独立复核成本口径' : undefined, supports: [s.evId], noCounter: '目前没有看到反证材料，证据都是静态统计', wouldChange: '若出现实测对比数据会改变判断' });
  }
  return s;
}

function ruleOk(root, id, evId, extra = {}) {
  return C.rule(root, id, {
    judge: 'judge-x', verdict: 'approved',
    reason: '证据链完整，控辩意见均已听取，少数意见已记录，可以批准并进入执行。',
    findings: [{ severity: 'minor', claim: '成本口径需复算', evidenceIds: [evId] }],
    minorityRecorded: true, ...extra,
  });
}

// blocked(fn)：期望抛错或审计报问题
function blocked(fn, codeHint) {
  try {
    fn();
  } catch (e) {
    const hit = !codeHint || String(e.message).includes(codeHint);
    return { blocked: true, note: `${e.code || 'ERR'} ${hit ? '' : `（期望 ${codeHint}）`}${String(e.message).slice(0, 60)}`.trim() };
  }
  return { blocked: false, note: '未抛错' };
}

function auditBlocked(root) {
  const a = C.verifyAudit(root);
  if (a.ok) return { blocked: false, note: '审计干净（未发现）' };
  return { blocked: true, note: `AUDIT ${a.problems.map((p) => p.code).join(',')}` };
}

function record(id, name, how, res) {
  rows.push({ id, name, how, blocked: res.blocked, note: res.note });
}

// ---------- 旧攻击面（V0.1 起） ----------
{
  const { root, prop, ev } = tmp();
  const { id, evId } = seed(root, prop, ev);
  record('A1a', '方案作者自任法官', 'case.author 与 judge 同一人', blocked(() => ruleOk(root, id, evId, { judge: 'lead' }), 'JUDGE_IS_AUTHOR'));
  record('A1b', '控方自任法官', '书状作者作法官', blocked(() => ruleOk(root, id, evId, { judge: 'p1' }), 'JUDGE_IS_ADVOCATE'));
}
{
  const { root, prop, ev } = tmp();
  seed(root, prop, ev);
  record('A2a', '把模型推论标为已独立验证', 'submitEvidence kind=inference + verified=true', blocked(() => C.submitEvidence(root, 'C-900', { submittedBy: 'defense', kind: 'inference', source: ev, claim: '推断结论', confidence: 'medium', verified: true }), 'EVIDENCE_LAUNDERING'));
  record('A2b', '提交不存在的证据文件', 'source 指向不存在的路径', blocked(() => C.submitEvidence(root, 'C-900', { submittedBy: 'defense', kind: 'run', source: path.join(root, 'nope.txt'), claim: '不存在的实测', confidence: 'high' })));
}
{
  const { root, prop, ev } = tmp();
  const { id, evId } = seed(root, prop, ev);
  ruleOk(root, id, evId);
  const t = C.createTask(root, id, { deliverable: '复算脚本', owner: 'o1', deadline: '2030-01-01', acceptance: '第三方重跑得到同样数字' });
  C.submitTask(root, id, t.id, { report: '已提交复算脚本并自测通过', evidencePath: ev });
  record('A3', '执行人自行验收', 'verifier 与 owner 同一人', blocked(() => C.verifyTask(root, id, t.id, { verifier: 'o1', passed: true, note: '自己验收自己，按新规则应被拒。', checks: { artifactsOpened: true, versionChecked: true, contentRechecked: true, recomputed: true }, artifacts: [ev] }), 'SELF_VERIFICATION'));
}
{
  // A4 已知弱点：篇幅占优。规则层不设字数上限（避免用机械限制解决呈现偏差），只做结构化摘要与 unclaimedChars 披露。
  const { root, prop, ev } = tmp();
  seedNoBriefs(root, prop, ev);
  const long = C.fileBrief(root, 'C-900', { side: 'defense', author: 'd1', text: '辩护方：这是一份很长的书状。'.repeat(60), claims: [{ text: '很长但只主张一句', evidenceIds: ['E001'] }] });
  const s = C.judgeSummary(root, 'C-900');
  record('A4', '用篇幅占优压制对方', '书状写 800 字只主张 1 条', { blocked: false, note: `纪律层不设字数上限（已知弱点 I-01）；披露手段＝judgeSummary 里 unclaimedChars=${s.defense.unclaimedChars}，供法官先读结构（${long.lengthChars} 字 / 1 条主张）` });
}
{
  const { root, prop, ev } = tmp();
  const { id, evId } = seed(root, prop, ev);
  record('A5', '论点挂不存在的证据编号', 'findings 指向 E999', blocked(() => ruleOk(root, id, evId, { findings: [{ severity: 'major', claim: '引用不存在的证据', evidenceIds: ['E999'] }] }), 'EVIDENCE_NOT_FOUND'));
}
{
  const { root, prop, ev } = tmp();
  const { id } = seed(root, prop, ev);
  C.addPrecedent(root, { id: 'P-101', project: 'little-zelensky-simulator', title: '档案纸黄', holding: '纸色 #e3d5b6 是小泽绑定先例', scope: 'binding', fromCase: 'C-000' });
  C.addPrecedent(root, { id: 'P-102', project: 'bistro-rush', title: '旧规则', holding: '已被推翻', scope: 'overruled' });
  record('A6a', '跨项目绑定先例', '把其他项目的先例当本研究约束', blocked(() => C.citePrecedent(root, 'C-900', { precedentId: 'P-101', relevance: '同类纸张', sameFacts: '部分相同', asBinding: true }), 'PRECEDENT_CROSS_PROJECT'));
  record('A6b', '引用失效先例', 'scope=overruled 的先例', blocked(() => C.citePrecedent(root, 'C-900', { precedentId: 'P-102', relevance: 'r', sameFacts: 's' }), 'PRECEDENT_DEAD'));
}
{
  const { root, prop, ev } = tmp();
  const { id, evId } = seed(root, prop, ev);
  ruleOk(root, id, evId);
  record('A7a', '裁决后再次裁决（不改判程序）', '直接再调 rule', blocked(() => ruleOk(root, id, evId), 'ALREADY_RULED'));
}
{
  const { root, prop, ev } = tmp();
  const { id } = seed(root, prop, ev);
  record('A7b', '未裁决先派任务', '新案直接 createTask', blocked(() => C.createTask(root, id, { deliverable: 'x', owner: 'o1', deadline: '2030-01-01', acceptance: '可被第三方复算' }), 'NO_RULING'));
}
{
  const { root, prop, ev } = tmp();
  const { id, evId } = seed(root, prop, ev);
  ruleOk(root, id, evId);
  record('A8a', '任务不带验收标准', 'acceptance 缺失或过短', blocked(() => C.createTask(root, id, { deliverable: 'x', owner: 'o1', deadline: '2030-01-01' }), 'TASK_NEEDS_ACCEPTANCE'));
  const t = C.createTask(root, id, { deliverable: '复算脚本', owner: 'o1', deadline: '2030-01-01', acceptance: '第三方重跑得到同样数字' });
  record('A8b', '报告只写「完成了」', 'submitTask report 过短', blocked(() => C.submitTask(root, id, t.id, { report: '完成了', evidencePath: ev }), 'TASK_NEEDS_REPORT'));
}
{
  const { root, prop, ev } = tmp();
  const { id, evId } = seed(root, prop, ev);
  record('A9', '陪审有少数意见但裁决不记', 'minorityRecorded 缺省', blocked(() => ruleOk(root, id, evId, { minorityRecorded: undefined }), 'MINORITY_NOT_RECORDED'));
}
{
  const { root, prop, ev } = tmp();
  const { id, evId } = seed(root, prop, ev);
  ruleOk(root, id, evId);
  const before = JSON.stringify(C.verifyAudit(root));
  const logPath = path.join(root, 'audit', 'log.jsonl');
  const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
  lines[1] = lines[1].replace('"caseId":"C-900"', '"caseId":"C-999"');
  fs.writeFileSync(logPath, `${lines.join('\n')}\n`);
  const a1 = auditBlocked(root);
  record('A10a', '篡改审计日志一条', '改 caseId 破坏哈希链', a1);
  fs.writeFileSync(logPath, `${JSON.parse(before).ok ? '' : ''}${lines.join('\n')}\n`);
}
{
  const { root, prop, ev } = tmp();
  const { id, evId } = seed(root, prop, ev);
  ruleOk(root, id, evId);
  const jf = path.join(root, 'cases', 'C-900', 'jury', 'j2.json');
  const v = JSON.parse(fs.readFileSync(jf, 'utf8'));
  v.onFundamentals = 'conditional';
  fs.writeFileSync(jf, JSON.stringify(v, null, 2));
  record('A10b', '篡改陪审投票内容', '改终票立场但不改 sha', auditBlocked(root));
}

// ---------- V0.1.1 新攻击面 ----------
{
  const { root, prop, ev } = tmp();
  const { id } = seed(root, prop, ev);
  record('A11', '批量申报把闸门刷绿（收敛力缺失）', '登记员一次登记大量候选证据，让「未声明值＝0」成立', {
    blocked: false,
    note: '制度层不挡「数量」，这是 C-001 裁决已认定的设计边界（闸门只保溯源力、不保收敛力）；披露手段＝judgeSummary 的证据计数与「全申报也可绿灯」反例必须并列',
  });
}
{
  const { root, prop, ev } = tmp();
  const { id, evId } = seed(root, prop, ev);
  ruleOk(root, id, evId);
  const t = C.createTask(root, id, { deliverable: '复算脚本', owner: 'o1', deadline: '2030-01-01', acceptance: '第三方重跑得到同样数字' });
  C.submitTask(root, id, t.id, { report: '已提交复算脚本并自测通过', evidencePath: ev });
  record('A12a', '验收报假材料路径', 'artifacts 指向不存在文件', blocked(() => C.verifyTask(root, id, t.id, { verifier: 'judge-2', passed: true, note: '打开材料核对版本并复算一遍，数字对得上。', checks: { artifactsOpened: true, versionChecked: true, contentRechecked: true, recomputed: true }, artifacts: ['nope.txt'] }), 'VERIFY_ARTIFACT_MISSING'));
  record('A12b', '验收不写清单只写结论', 'checks 缺项', blocked(() => C.verifyTask(root, id, t.id, { verifier: 'judge-2', passed: true, note: '打开材料核对版本并复算一遍，数字对得上。', checks: { artifactsOpened: true, versionChecked: true } }), 'VERIFY_CHECKLIST_INCOMPLETE'));
}
{
  const { root, prop, ev } = tmp();
  const { id } = seed(root, prop, ev);
  record('A13', '读书状后再补密封初判', '想用终票倒推初判', blocked(() => C.castInitialVote(root, id, { juror: 'j9', onFundamentals: 'approve', basis: '我在读过控辩书状之后才形成初判，这不能算独立判断。' }), 'INITIAL_TOO_LATE'));
}
{
  const { root, prop, ev } = tmp();
  const { id } = seedNoBriefs(root, prop, ev);
  const cand = C.submitEvidence(root, id, { submittedBy: 'defense', kind: 'run', source: ev, claim: '待撤回的实测', confidence: 'low' });
  const reg = C.registerEvidence(root, id, cand.id, { registrar: 'clerk-x' });
  C.withdrawEvidence(root, id, reg.id, { by: 'defense', reason: '样本来源被证伪，主动撤回' });
  record('A14', '引用已撤回的证据', '书状 claim 绑 withdrawn 证据', blocked(() => C.fileBrief(root, id, { side: 'defense', author: 'd1', text: '辩护方：撤回的证据仍可支持我方结论，请法官看看。', claims: [{ text: '撤回证据仍可用', evidenceIds: [reg.id] }] }), 'EVIDENCE_NOT_ADMITTED'));
}
{
  const { root, prop, ev } = tmp();
  const { id } = seed(root, prop, ev);
  const c = C.loadCase(root, id);
  c.cost.tokens = 0; // 假装「测出来是 0」
  C.saveCase(root, c);
  record('A15', '把未插桩的成本写成 0', 'tokens=0 且 unavailable 未登记', auditBlocked(root));
}
{
  const { root, prop, ev } = tmp();
  const { id } = seedNoBriefs(root, prop, ev);
  record('A16', '主张不绑证据', 'claims.evidenceIds 为空', blocked(() => C.fileBrief(root, id, { side: 'prosecution', author: 'p1', text: '检察方：这段书状有主张但没有绑定任何证据，应当被拒。', claims: [{ text: '没有证据的主张', evidenceIds: [] }] }), 'NO_EVIDENCE_CITED'));
}

// ---------- 输出 ----------
const blockedCount = rows.filter((r) => r.blocked).length;
const lines = [];
lines.push('| 攻击 | 手法 | 是否被挡住 | 拦截点 / 备注 |');
lines.push('|---|---|---|---|');
for (const r of rows) lines.push(`| ${r.id} | ${r.name} | ${r.blocked ? '是' : '否'} | ${r.note} |`);
const summary = `合计 ${rows.length} 次攻击，被挡住 ${blockedCount} 次，未挡住 ${rows.length - blockedCount} 次。`;
const missed = rows.filter((r) => !r.blocked).map((r) => `${r.id} ${r.name}（${r.note}）`);

console.log(lines.join('\n'));
console.log('');
console.log(summary);
console.log(missed.length ? `未挡住的：\n- ${missed.join('\n- ')}` : '未挡住的：无');

fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync(path.join('docs', 'REDTEAM_RESULTS.json'), JSON.stringify({ generated: new Date().toISOString(), schema: 'v0.1.1', total: rows.length, blocked: blockedCount, rows }, null, 2));
