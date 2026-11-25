// GAME DE-AI 法庭原型：核心制度引擎
// 设计原则：制度约束写在代码里，不写在文档里。凡是"应该"的规则，都必须能抛错。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export class CourtError extends Error {
  constructor(code, message, detail) {
    super(`[${code}] ${message}`);
    this.code = code;
    this.detail = detail || null;
  }
}

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const now = () => new Date().toISOString();

export const CASE_TYPES = {
  ordinary: { juryMin: 3, crossMin: 1, requireRedteam: false },
  major: { juryMin: 5, crossMin: 2, requireRedteam: false },
  high: { juryMin: 5, crossMin: 3, requireRedteam: true },
};

export const EVIDENCE_KINDS = ['raw', 'run', 'external', 'expert', 'inference', 'assumption', 'judgment'];
// V0.1.1 P0-1：证据不是「登记即采信」。登记、采信、被质疑、被拒、撤回是五个不同状态。
export const EVIDENCE_STATES = ['submitted', 'registered', 'admitted', 'challenged', 'rejected', 'withdrawn'];
export const PARTIES = ['prosecution', 'defense', 'author', 'registrar'];
export const SCHEMA = 'v0.1.1';
// 旧案件（schema 缺省）一律按 legacy 处理：不新增强制字段，不修改其档案。
export const isLegacy = (c) => !c.schema || c.schema !== SCHEMA;
export const evState = (e) => e.state || 'admitted'; // 旧案证据视同已采信，仅用于读取
export const VERDICTS = ['approved', 'conditional', 'pilot', 'stay', 'dismissed', 'remanded', 'insufficient'];
export const STAGES = ['opened', 'briefing', 'disputed', 'crossexam', 'jury', 'ruled', 'executing', 'closed'];
export const TASK_STATUS = ['pending', 'doing', 'submitted', 'verified', 'failed', 'overdue', 'cancelled'];
export const PRECEDENT_SCOPES = ['binding', 'reference', 'invalid', 'overruled'];

// ---------- 路径与读写 ----------
export function paths(root) {
  const r = {
    root,
    cases: path.join(root, 'cases'),
    precedents: path.join(root, 'precedents'),
    ledger: path.join(root, 'ledger'),
    audit: path.join(root, 'audit'),
    log: path.join(root, 'audit', 'log.jsonl'),
  };
  for (const d of [r.cases, r.precedents, r.ledger, r.audit]) fs.mkdirSync(d, { recursive: true });
  return r;
}

const readJson = (p, fallback) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fallback);
const writeJson = (p, v) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n', 'utf8');
};

export function caseDir(root, id) {
  return path.join(paths(root).cases, id);
}

// ---------- 审计日志（哈希链） ----------
function appendLog(root, entry) {
  const p = paths(root);
  const lines = fs.existsSync(p.log) ? fs.readFileSync(p.log, 'utf8').trim().split('\n').filter(Boolean) : [];
  const prev = lines.length ? JSON.parse(lines[lines.length - 1]).hash : 'genesis';
  const body = { seq: lines.length + 1, ts: now(), prev, ...entry };
  const hash = sha256(JSON.stringify(body));
  fs.appendFileSync(p.log, JSON.stringify({ ...body, hash }) + '\n', 'utf8');
  return hash;
}

export function readLog(root) {
  const p = paths(root);
  if (!fs.existsSync(p.log)) return [];
  return fs.readFileSync(p.log, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

// ---------- 案件 ----------
export function openCase(root, { id, title, type, project, proposalPath, author, summary, tokens, humanMinutes }) {
  if (!id || !title) throw new CourtError('BAD_INPUT', 'id 与 title 必填');
  if (!CASE_TYPES[type]) throw new CourtError('BAD_TYPE', `案件类型必须是 ${Object.keys(CASE_TYPES).join('/')}`);
  const dir = caseDir(root, id);
  if (fs.existsSync(path.join(dir, 'case.json'))) throw new CourtError('CASE_EXISTS', `案件 ${id} 已存在`);
  let proposalSha = null;
  if (proposalPath) {
    const abs = path.isAbsolute(proposalPath) ? proposalPath : path.resolve(root, proposalPath);
    if (!fs.existsSync(abs)) throw new CourtError('PROPOSAL_MISSING', `提案文件不存在：${abs}`);
    proposalSha = sha256(fs.readFileSync(abs));
  }
  const c = {
    id, title, type, schema: SCHEMA, project: project || null, author, summary: summary || '',
    proposalPath: proposalPath || null, proposalSha, stage: 'opened',
    openedAt: now(), closedAt: null,
    evidence: [], disputes: [], briefs: [], cross: [], jury: [], juryInitial: [], redteam: [],
    ruling: null, tasks: [], citedPrecedents: [], history: [],
    // P0-5：未测就是 unavailable，不是 0。数值字段缺失一律为 null 并进 unavailable 列表。
    cost: {
      tokens: null, tokensSource: null, calls: 0,
      apiCostCNY: null, humanSteps: null, humanMinutes: null, maintenanceMinutes: null,
      unavailable: ['tokens', 'apiCostCNY', 'humanSteps', 'humanMinutes', 'maintenanceMinutes'],
      notes: [],
    },
  };
  fs.mkdirSync(path.join(dir, 'briefs'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'jury'), { recursive: true });
  saveCase(root, c);
  appendLog(root, { type: 'case.open', caseId: id, payload: sha256(JSON.stringify({ title, type, author })) });
  return c;
}

export function loadCase(root, id) {
  const p = path.join(caseDir(root, id), 'case.json');
  if (!fs.existsSync(p)) throw new CourtError('CASE_NOT_FOUND', `案件 ${id} 不存在`);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export function saveCase(root, c) {
  writeJson(path.join(caseDir(root, c.id), 'case.json'), c);
  return c;
}

export function listCases(root) {
  const dir = paths(root).cases;
  return fs.readdirSync(dir).filter((n) => fs.existsSync(path.join(dir, n, 'case.json')))
    .map((n) => loadCase(root, n));
}

// ---------- 证据：提交 → 独立登记 → 采信（V0.1.1 P0-1） ----------
// 提案方、检察方、辩护方都可以提交候选证据；登记由独立书记角色完成；
// 采信/拒绝由法官裁。登记不等于采信，被拒与撤回同样留痕。
export function submitEvidence(root, caseId, { submittedBy, kind, source, version, claim, confidence, verified, conflict, scope, counter, note }) {
  const c = loadCase(root, caseId);
  if (!PARTIES.includes(submittedBy) || submittedBy === 'registrar') throw new CourtError('BAD_PARTY', `提交方必须是 ${PARTIES.filter((p) => p !== 'registrar').join('/')}`);
  if (!EVIDENCE_KINDS.includes(kind)) throw new CourtError('BAD_EVIDENCE_KIND', `证据类型必须是 ${EVIDENCE_KINDS.join('/')}`);
  if (!claim) throw new CourtError('BAD_INPUT', '证据必须写明支持的主张（claim）');
  if (!source) throw new CourtError('BAD_INPUT', '证据必须写明来源（source）');
  if (!confidence) throw new CourtError('BAD_INPUT', '证据必须标注可信程度（confidence: high/medium/low）');
  if (kind === 'inference' && verified === true) throw new CourtError('EVIDENCE_LAUNDERING', '模型推论不得标记为已独立验证');
  // 指向文件的来源必须真实存在（防止「提交不存在的证据」）
  const looksLikePath = /[\\/]/.test(source) || /\.(txt|md|json|png|jpg|jpeg|webp|css|js|mjs|ts|tsx|html|csv|log)$/i.test(source);
  if (looksLikePath) {
    const abs = path.isAbsolute(source) ? source : path.resolve(root, source);
    if (!fs.existsSync(abs)) throw new CourtError('EVIDENCE_SOURCE_MISSING', `证据来源文件不存在：${source}`);
  }
  const cand = {
    id: `S${String(c.evidence.length + 1).padStart(3, '0')}`,
    state: 'submitted', submittedBy, submittedAt: now(),
    kind, source, version: version || null, claim,
    confidence, verified: !!verified, conflict: conflict || null,
    scope: scope || 'case', counter: counter || null, note: note || null,
    registeredBy: null, registeredAt: null, sourceRef: null,
    decidedBy: null, decidedAt: null, decisionReason: null,
  };
  c.evidence.push(cand);
  saveCase(root, c);
  appendLog(root, { type: 'evidence.submit', caseId, payload: sha256(JSON.stringify({ id: cand.id, submittedBy, claim })) });
  return cand;
}

export function registerEvidence(root, caseId, candidateId, { registrar, version, sourceRef, hash }) {
  const c = loadCase(root, caseId);
  const e = c.evidence.find((x) => x.id === candidateId);
  if (!e) throw new CourtError('EVIDENCE_NOT_FOUND', `候选证据 ${candidateId} 不存在`);
  if (evState(e) !== 'submitted') throw new CourtError('EVIDENCE_NOT_SUBMITTED', `证据 ${candidateId} 当前状态 ${evState(e)}，不可登记`);
  if (!registrar) throw new CourtError('BAD_INPUT', '登记必须写明登记人（registrar）');
  // 入口独立：提案作者不得登记自己的证据（避免提案方独占入口）
  if (registrar === c.author) throw new CourtError('REGISTRAR_IS_AUTHOR', '提案方不得登记本案证据（入口必须独立于提案方）');
  if (registrar === e.submittedBy) throw new CourtError('REGISTRAR_IS_SUBMITTER', '登记人不得与提交人同一人（自提自登不算独立登记）');
  e.id = `E${String(c.evidence.filter((x) => /^E\d+$/.test(x.id)).length + 1).padStart(3, '0')}`;
  e.state = 'registered';
  e.registeredBy = registrar;
  e.registeredAt = now();
  e.version = version || e.version || null;
  e.sourceRef = sourceRef || null;
  e.contentHash = hash || null;
  saveCase(root, c);
  appendLog(root, { type: 'evidence.register', caseId, payload: sha256(JSON.stringify({ id: e.id, registrar, from: candidateId })) });
  return e;
}

export function decideEvidence(root, caseId, evidenceId, { by, decision, reason }) {
  const c = loadCase(root, caseId);
  const e = c.evidence.find((x) => x.id === evidenceId);
  if (!e) throw new CourtError('EVIDENCE_NOT_FOUND', `证据 ${evidenceId} 不存在`);
  if (!['admitted', 'rejected'].includes(decision)) throw new CourtError('BAD_DECISION', '裁决只能是 admitted 或 rejected（质疑用 challengeEvidence）');
  if (!['registered', 'challenged'].includes(evState(e))) throw new CourtError('EVIDENCE_NOT_REGISTERED', `证据 ${evidenceId} 尚未登记，不得裁其资格`);
  if (!reason || String(reason).trim().length < 10) throw new CourtError('EVIDENCE_DECISION_NEEDS_REASON', '证据资格裁决必须给理由（≥10 字）');
  if (by === c.author) throw new CourtError('AUTHOR_CANNOT_ADMIT', '提案作者不得自行裁定证据资格（须由法官裁决）');
  if (by === e.submittedBy) throw new CourtError('SELF_ADMISSION', '提交人不得自行采信证据');
  e.state = decision;
  e.decidedBy = by;
  e.decidedAt = now();
  e.decisionReason = reason;
  saveCase(root, c);
  appendLog(root, { type: 'evidence.decide', caseId, payload: sha256(JSON.stringify({ id: evidenceId, decision, by })) });
  return e;
}

export function challengeEvidence(root, caseId, evidenceId, { by, ground }) {
  const c = loadCase(root, caseId);
  const e = c.evidence.find((x) => x.id === evidenceId);
  if (!e) throw new CourtError('EVIDENCE_NOT_FOUND', `证据 ${evidenceId} 不存在`);
  if (!['registered', 'admitted'].includes(evState(e))) throw new CourtError('EVIDENCE_NOT_CHALLENGEABLE', `证据 ${evidenceId} 当前状态 ${evState(e)} 不可质疑`);
  if (!ground || String(ground).trim().length < 10) throw new CourtError('CHALLENGE_NEEDS_GROUND', '质疑证据必须说明具体理由（≥10 字）');
  e.state = 'challenged';
  e.challengedBy = by;
  e.challengeGround = ground;
  saveCase(root, c);
  appendLog(root, { type: 'evidence.challenge', caseId, payload: sha256(JSON.stringify({ id: evidenceId, by })) });
  return e;
}

export function withdrawEvidence(root, caseId, evidenceId, { by, reason }) {
  const c = loadCase(root, caseId);
  const e = c.evidence.find((x) => x.id === evidenceId);
  if (!e) throw new CourtError('EVIDENCE_NOT_FOUND', `证据 ${evidenceId} 不存在`);
  if (!reason || String(reason).trim().length < 10) throw new CourtError('WITHDRAW_NEEDS_REASON', '撤回证据必须说明理由（≥10 字）并留痕');
  if (by !== e.submittedBy && by !== c.author) throw new CourtError('WITHDRAW_NOT_YOURS', '只有提交人或本案作者可撤回证据');
  e.state = 'withdrawn';
  e.decidedBy = by;
  e.decidedAt = now();
  e.decisionReason = reason;
  saveCase(root, c);
  appendLog(root, { type: 'evidence.withdraw', caseId, payload: sha256(JSON.stringify({ id: evidenceId, by })) });
  return e;
}

// 兼容入口：一次走完 提交→登记→采信，但三个角色必须由三个不同的人承担。
export function addEvidence(root, caseId, { submittedBy, registrar, admittedBy, kind, source, version, claim, confidence, verified, conflict, scope, counter, hash, reason }) {
  const cand = submitEvidence(root, caseId, { submittedBy, kind, source, version, claim, confidence, verified, conflict, scope, counter });
  const reg = registerEvidence(root, caseId, cand.id, { registrar, version, sourceRef: source, hash });
  return decideEvidence(root, caseId, reg.id, { by: admittedBy || 'judge', decision: 'admitted', reason: reason || '书面提交，来源与版本可核，先行采信' });
}

export function admittedEvidence(root, caseId) {
  const c = loadCase(root, caseId);
  return c.evidence.filter((e) => evState(e) === 'admitted');
}

export function requireAdmitted(root, caseId, ids) {
  const c = loadCase(root, caseId);
  const out = [];
  for (const id of ids || []) {
    const e = c.evidence.find((x) => x.id === id);
    if (!e) throw new CourtError('EVIDENCE_NOT_FOUND', `引用了不存在的证据 ${id}`);
    if (evState(e) !== 'admitted') throw new CourtError('EVIDENCE_NOT_ADMITTED', `证据 ${id} 当前状态 ${evState(e)}，不得在书状/裁决/陪审意见中引用（只有已采信证据可作依据）`);
    out.push(id);
  }
  if (out.length === 0) throw new CourtError('NO_EVIDENCE_CITED', '必须至少引用一条已采信证据');
  return out;
}


// ---------- 书状（控辩分离 + 结构化主张，V0.1.1 P0-3） ----------
// 统一结构：每方书状必须由「主张 + 该主张引用的已采信证据」组成。
// 不设机械字数上限（那会把长论证直接判死），而是让法官先读结构化摘要，再决定读原文。
export function fileBrief(root, caseId, { side, author, contextId, text, claims }) {
  const c = loadCase(root, caseId);
  if (!['prosecution', 'defense'].includes(side)) throw new CourtError('BAD_SIDE', '书状只能由 prosecution 或 defense 提交');
  if (c.briefs.some((b) => b.side === side)) throw new CourtError('BRIEF_EXISTS', `${side} 书状已存在；补充意见请用 amendBrief`);
  if (!text || text.trim().length < 20) throw new CourtError('BRIEF_TOO_SHORT', '书状不足 20 字，视为未提交');
  const cl = (claims || []).filter(Boolean);
  if (cl.length === 0) throw new CourtError('BRIEF_NEEDS_CLAIMS', '书状必须给出结构化主张（claims：主张 + 证据编号），不接受只写一大段议论');
  const normClaims = cl.map((x) => {
    const t = String(x.text || '').trim();
    if (t.length < 4) throw new CourtError('CLAIM_TOO_SHORT', '主张必须写成一句话（≥4 字）');
    const ids = requireAdmitted(root, caseId, x.evidenceIds || []);
    return { text: t, evidenceIds: ids };
  });
  const body = {
    side, author, contextId: contextId || 'unknown', text, claims: normClaims,
    lengthChars: [...text].length, filedAt: now(),
  };
  body.sha = sha256(JSON.stringify(body));
  c.briefs.push(body);
  fs.writeFileSync(path.join(caseDir(root, caseId), 'briefs', `${side}.txt`), text, 'utf8');
  if (c.stage === 'opened') c.stage = 'briefing';
  saveCase(root, c);
  appendLog(root, { type: 'brief.file', caseId, payload: body.sha });
  return { side, sha: body.sha, claims: normClaims.length, lengthChars: body.lengthChars };
}

export function amendBrief(root, caseId, { side, author, contextId, text, reason }) {
  const c = loadCase(root, caseId);
  const b = c.briefs.find((x) => x.side === side);
  if (!b) throw new CourtError('BRIEF_NOT_FOUND', `${side} 尚无可修改的书状`);
  if (!reason) throw new CourtError('AMEND_NEEDS_REASON', '修改书状必须说明理由（禁止静默改口）');
  // 原论证不可被覆盖：保留历史副本
  fs.writeFileSync(path.join(caseDir(root, caseId), 'briefs', `${side}.v${c.briefs.filter(x => x.side === side).length}.txt`), b.text, 'utf8');
  b.history = b.history || [];
  b.history.push({ sha: b.sha, text: b.text, at: b.filedAt });
  const body = { side, author, contextId: contextId || b.contextId, text, filedAt: now(), reason };
  body.sha = sha256(JSON.stringify(body));
  Object.assign(b, body);
  fs.writeFileSync(path.join(caseDir(root, caseId), 'briefs', `${side}.txt`), text, 'utf8');
  saveCase(root, c);
  appendLog(root, { type: 'brief.amend', caseId, payload: body.sha });
  return { side, sha: body.sha, revisions: b.history.length };
}

// ---------- 争议点 ----------
export function raiseDispute(root, caseId, { point, raisedBy, evidenceIds }) {
  const c = loadCase(root, caseId);
  if (!point) throw new CourtError('BAD_INPUT', '争议点不能为空');
  const ids = (evidenceIds || []).map((id) => {
    if (!c.evidence.some((e) => e.id === id)) throw new CourtError('EVIDENCE_NOT_FOUND', `争议点引用了不存在的证据 ${id}`);
    return id;
  });
  const d = { id: `D${String(c.disputes.length + 1).padStart(2, '0')}`, point, raisedBy, evidenceIds: ids, at: now() };
  c.disputes.push(d);
  if (['opened', 'briefing'].includes(c.stage)) c.stage = 'disputed';
  saveCase(root, c);
  appendLog(root, { type: 'dispute.raise', caseId, payload: sha256(JSON.stringify(d)) });
  return d;
}

// ---------- 交叉询问 ----------
export function addCrossRound(root, caseId, { round, question, askedBy, answeredBy, answer, evidenceIds }) {
  const c = loadCase(root, caseId);
  if (!['disputed', 'crossexam'].includes(c.stage)) throw new CourtError('STAGE_BLOCKED', `当前阶段 ${c.stage} 不接受交叉询问（须先形成争议点）`);
  if (!question || !answer) throw new CourtError('BAD_INPUT', '交叉询问需要 question 与 answer');
  const ids = (evidenceIds || []).map((id) => {
    if (!c.evidence.some((e) => e.id === id)) throw new CourtError('EVIDENCE_NOT_FOUND', `质询引用了不存在的证据 ${id}`);
    return id;
  });
  const r = { round: round || c.cross.length + 1, question, askedBy, answeredBy, answer, evidenceIds: ids, at: now() };
  c.cross.push(r);
  c.stage = 'crossexam';
  saveCase(root, c);
  appendLog(root, { type: 'cross.round', caseId, payload: sha256(JSON.stringify(r)) });
  return r;
}

// ---------- 陪审（初判密封 + 终票强制引证，V0.1.1 P0-2） ----------
// 初判：只读提案与证据目录，读控辩书状之前提交并密封；终票：必须引支持证据、
// 指出反证或说明为何无反证，并写明「什么新证据会改变判断」；少数意见原样保留。
export function castInitialVote(root, caseId, { juror, onFundamentals, basis, contextId, lateReason }) {
  const c = loadCase(root, caseId);
  if (['ruled', 'executing', 'closed'].includes(c.stage)) throw new CourtError('INITIAL_TOO_LATE', `案件已进入裁决后阶段 ${c.stage}，不得再补初判`);
  // 书状入卷后仍可入库，但必须带 lateReason：这一次不再算「读书状前形成」，审计会以 warning 披露。
  let late = false;
  if (c.briefs.length > 0) {
    if (!lateReason || String(lateReason).trim().length < 20) {
      throw new CourtError('INITIAL_TOO_LATE', '已有控辩书状入卷，初判不再算「读书状前形成」；若确系先写后录，须给 ≥20 字的迟到原因（lateReason）并接受审计披露');
    }
    late = true;
  }
  if (!['approve', 'reject', 'conditional'].includes(onFundamentals)) throw new CourtError('BAD_VOTE', 'onFundamentals 只能是 approve/reject/conditional');
  if (!basis || String(basis).trim().length < 30) throw new CourtError('INITIAL_NEEDS_BASIS', '初判必须写自己的判断依据（≥30 字，且不得引用尚未产生的书状）');
  if (c.juryInitial.some((j) => j.juror === juror)) throw new CourtError('DUPLICATE_JUROR', `陪审员 ${juror} 已提交初判`);
  const v = { juror, onFundamentals, basis, contextId: contextId || 'unknown', beforeBriefs: !late, late, lateReason: late ? String(lateReason).trim() : null, at: now() };
  v.sha = sha256(JSON.stringify(v));
  c.juryInitial.push(v);
  writeJson(path.join(caseDir(root, caseId), 'jury', `${juror}.initial.json`), v);
  saveCase(root, c);
  appendLog(root, { type: 'jury.initial', caseId, payload: v.sha });
  return { juror, sha: v.sha };
}

export function castJury(root, caseId, { juror, onFundamentals, reason, minority, contextId, supports, against, noCounter, wouldChange }) {
  const c = loadCase(root, caseId);
  const need = CASE_TYPES[c.type].crossMin;
  if (c.cross.length < need) throw new CourtError('JURY_TOO_EARLY', `${c.type} 案件需要先完成 ${need} 轮交叉询问（当前 ${c.cross.length}）`);
  if (!['approve', 'reject', 'conditional'].includes(onFundamentals)) throw new CourtError('BAD_VOTE', 'onFundamentals 只能是 approve/reject/conditional');
  if (!reason || reason.trim().length < 10) throw new CourtError('JURY_NEEDS_REASON', '陪审意见必须写理由，不得只投票');
  if (c.jury.some((j) => j.juror === juror)) throw new CourtError('DUPLICATE_JUROR', `陪审员 ${juror} 已投票`);
  if (!c.juryInitial.some((j) => j.juror === juror)) throw new CourtError('JURY_INITIAL_MISSING', '没有密封初判不得投终票（初判必须在读书状前形成）');
  // 引证义务：支持证据至少一条；反证要么点名，要么说明为什么没有。
  const sup = requireAdmitted(root, caseId, supports || []);
  let ag = [];
  if (against && against.length) ag = requireAdmitted(root, caseId, against);
  else if (!noCounter || String(noCounter).trim().length < 10) throw new CourtError('JURY_NEEDS_COUNTER_OR_REASON', '终票必须指出反对证据，或说明为何认为没有反证（≥10 字）');
  if (!wouldChange || String(wouldChange).trim().length < 10) throw new CourtError('JURY_NEEDS_WOULD_CHANGE', '终票必须写明哪些新证据会改变自己的判断（≥10 字）');
  const vote = {
    juror, onFundamentals, reason, minority: minority || null, contextId: contextId || 'unknown',
    supports: sup, against: ag, noCounter: ag.length ? null : noCounter, wouldChange, at: now(),
  };
  vote.sha = sha256(JSON.stringify(vote));
  c.jury.push(vote);
  // 密封：每个陪审员一份独立文件（防串通后修改）
  writeJson(path.join(caseDir(root, caseId), 'jury', `${juror}.json`), vote);
  c.stage = 'jury';
  saveCase(root, c);
  appendLog(root, { type: 'jury.vote', caseId, payload: vote.sha });
  return { juror, sha: vote.sha, supports: sup.length, against: ag.length };
}

// ---------- 裁决 ----------
export function rule(root, caseId, { judge, verdict, findings, conditions, reason, roundsChosen, roundsWhy, minorityRecorded, cost }) {
  const c = loadCase(root, caseId);
  if (!VERDICTS.includes(verdict)) throw new CourtError('BAD_VERDICT', `裁决必须是 ${VERDICTS.join('/')}`);
  if (c.ruling) throw new CourtError('ALREADY_RULED', '本案已有裁决；变更须走 reconsider');
  if (!reason || reason.trim().length < 20) throw new CourtError('RULING_NEEDS_REASON', '裁决必须写理由');
  // 利益冲突：作者不得任法官
  if (judge === c.author) throw new CourtError('JUDGE_IS_AUTHOR', '方案作者不得担任本案法官');
  if (c.briefs.some((b) => b.author === judge)) throw new CourtError('JUDGE_IS_ADVOCATE', '已提交书状的人不得担任本案法官');
  // 程序：控辩齐备 + 争议点 + 交叉询问
  const hasP = c.briefs.some((b) => b.side === 'prosecution');
  const hasD = c.briefs.some((b) => b.side === 'defense');
  if (verdict !== 'insufficient' && !(hasP && hasD)) throw new CourtError('NO_ADVERSARIAL_BRIEF', '控辩双方书状不齐备，不得裁决（insufficient 除外）');
  if (verdict !== 'insufficient' && c.disputes.length === 0) throw new CourtError('NO_DISPUTE', '未形成争议点，不得裁决');
  const need = CASE_TYPES[c.type].crossMin;
  if (verdict !== 'insufficient' && c.cross.length < need) throw new CourtError('CROSS_INCOMPLETE', `交叉询问不足：需 ${need} 轮，当前 ${c.cross.length}`);
  const juryMin = CASE_TYPES[c.type].juryMin;
  if (verdict !== 'insufficient' && c.jury.length < juryMin) throw new CourtError('JURY_INCOMPLETE', `陪审不足：需 ${juryMin} 票，当前 ${c.jury.length}`);
  if (verdict !== 'insufficient' && minorityRecorded !== true) throw new CourtError('MINORITY_NOT_RECORDED', '必须记录少数意见（即便为"无"）');
  // 高风险案件必须已有制度攻击记录
  if (c.type === 'high' && CASE_TYPES.high.requireRedteam && c.redteam.length === 0) {
    throw new CourtError('REDTEAM_REQUIRED', '高风险案件在裁决前必须有至少一次制度攻击记录');
  }
  // 七轮：不是强制，但选了就必须说明目标与停止条件
  const rounds = Number(roundsChosen || 0);
  if (rounds > 0 && !roundsWhy) throw new CourtError('ROUNDS_NEED_JUSTIFICATION', '启动特殊审查轮次必须说明攻击目标与停止条件');
  // 裁决要点必须挂已采信证据（被拒/撤回/仅登记的证据不得支撑裁决）
  const f = (findings || []).map((x) => {
    const ids = x.evidenceIds || [];
    if (ids.length === 0) throw new CourtError('FINDING_WITHOUT_EVIDENCE', `裁决要点「${x.claim}」没有引用证据`);
    return { severity: x.severity || 'minor', claim: x.claim, evidenceIds: requireAdmitted(root, caseId, ids) };
  });
  c.ruling = {
    judge, verdict, findings: f, conditions: conditions || [], reason,
    roundsChosen: rounds, roundsWhy: roundsWhy || null,
    minorityRecorded: true, ruledAt: now(),
  };
  c.ruling.sha = sha256(JSON.stringify(c.ruling));
  c.stage = ['stay', 'dismissed', 'remanded', 'insufficient'].includes(verdict) ? 'ruled' : 'executing';
  if (cost) c.cost = { ...c.cost, ...cost };
  saveCase(root, c);
  appendLog(root, { type: 'case.rule', caseId, payload: c.ruling.sha });
  return c.ruling;
}

// ---------- 法官摘要（P0-3：先读结构，再决定是否读长文） ----------
// 目的不是压字数，而是让法官的注意力先落在「争议点 + 双方各自主张与证据」上，
// 长书状只在需要核验某条主张时才被展开。
export function judgeSummary(root, caseId) {
  const c = loadCase(root, caseId);
  const ev = (ids) => ids.map((id) => {
    const e = c.evidence.find((x) => x.id === id) || { id, claim: '(缺失)', kind: '?' };
    return { id, kind: e.kind, state: evState(e), claim: e.claim };
  });
  const sideView = (b) => b ? {
    side: b.side, author: b.author, lengthChars: b.lengthChars || [...b.text].length,
    claims: (b.claims || []).map((x) => ({ text: x.text, evidence: ev(x.evidenceIds) })),
    unclaimedChars: b.lengthChars ? Math.max(0, b.lengthChars - (b.claims || []).reduce((a, x) => a + [...x.text].length, 0)) : null,
  } : null;
  return {
    caseId: c.id, type: c.type, stage: c.stage,
    dispute: c.disputes.map((d) => ({ id: d.id, point: d.point, evidence: ev(d.evidenceIds) })),
    prosecution: sideView(c.briefs.find((b) => b.side === 'prosecution')),
    defense: sideView(c.briefs.find((b) => b.side === 'defense')),
    evidence: {
      total: c.evidence.length,
      admitted: c.evidence.filter((e) => evState(e) === 'admitted').length,
      rejected: c.evidence.filter((e) => evState(e) === 'rejected').map((e) => ({ id: e.id, reason: e.decisionReason })),
      withdrawn: c.evidence.filter((e) => evState(e) === 'withdrawn').map((e) => ({ id: e.id, reason: e.decisionReason })),
      challenged: c.evidence.filter((e) => evState(e) === 'challenged').map((e) => ({ id: e.id, ground: e.challengeGround })),
    },
    cross: c.cross.map((r) => ({ round: r.round, askedBy: r.askedBy, answeredBy: r.answeredBy, chars: [...r.answer].length })),
    jury: { votes: c.jury.length, initial: c.juryInitial.length },
    ruling: c.ruling ? { verdict: c.ruling.verdict, findings: c.ruling.findings.length } : null,
  };
}

// ---------- 考成：执行任务 ----------
export function createTask(root, caseId, { deliverable, owner, deadline, acceptance, evidencePath }) {
  const c = loadCase(root, caseId);
  if (!c.ruling) throw new CourtError('NO_RULING', '尚无裁决，不得派生执行任务');
  if (!deliverable || !owner) throw new CourtError('BAD_INPUT', '任务需要 deliverable 与 owner');
  if (!deadline) throw new CourtError('BAD_INPUT', '任务必须有完成期限（不得无期限）');
  if (!acceptance || String(acceptance).trim().length < 10) throw new CourtError('TASK_NEEDS_ACCEPTANCE', '任务必须写可被第三方执行的验收标准（≥10 字），否则"验收"会退化成点头');
  const t = {
    id: `T${String(c.tasks.length + 1).padStart(2, '0')}`,
    deliverable, owner, deadline: new Date(deadline).toISOString(),
    acceptance: acceptance || null, evidencePath: evidencePath || null,
    status: 'pending', createdAt: now(), submittedAt: null, verifiedAt: null,
    verifier: null, report: null, overdueReason: null, cancelReason: null,
  };
  c.tasks.push(t);
  saveCase(root, c);
  appendLog(root, { type: 'task.create', caseId, payload: sha256(JSON.stringify(t)) });
  return t;
}

export function submitTask(root, caseId, taskId, { report, evidencePath }) {
  const c = loadCase(root, caseId);
  const t = c.tasks.find((x) => x.id === taskId);
  if (!t) throw new CourtError('TASK_NOT_FOUND', `任务 ${taskId} 不存在`);
  if (['verified', 'cancelled'].includes(t.status)) throw new CourtError('TASK_SETTLED', `任务 ${taskId} 已结案`);
  if (!report || report.trim().length < 10) throw new CourtError('TASK_NEEDS_REPORT', '交付需要说明（不得只报"完成"）');
  if (evidencePath) {
    const abs = path.isAbsolute(evidencePath) ? evidencePath : path.resolve(root, evidencePath);
    if (!fs.existsSync(abs)) throw new CourtError('EVIDENCE_PATH_MISSING', `交付证据不存在：${abs}`);
    t.evidencePath = abs;
  }
  if (!t.evidencePath) throw new CourtError('TASK_NEEDS_EVIDENCE', '交付必须有可核查的证据文件路径');
  t.status = 'submitted';
  t.report = report;
  t.submittedAt = now();
  saveCase(root, c);
  appendLog(root, { type: 'task.submit', caseId, payload: sha256(`${taskId}:${report}`) });
  return t;
}

// P0-4：验收不是点头。验收人必须直接打开原始材料、独立核对版本与内容、
// 必要时自己复算，并对「重复计数 / 选择性遗漏 / 口径错误」做明确检查。
export function verifyTask(root, caseId, taskId, { verifier, passed, note, checks, artifacts }) {
  const c = loadCase(root, caseId);
  const t = c.tasks.find((x) => x.id === taskId);
  if (!t) throw new CourtError('TASK_NOT_FOUND', `任务 ${taskId} 不存在`);
  if (t.status !== 'submitted') throw new CourtError('TASK_NOT_SUBMITTED', '任务尚未提交交付，不得验收');
  if (!verifier || !String(verifier).trim()) throw new CourtError('VERIFIER_REQUIRED', '验收必须记名验收人（verifier），否则自验拦截会被静默跳过');
  if (verifier === t.owner) throw new CourtError('SELF_VERIFICATION', '执行者不得自行验收');
  if (!note || note.trim().length < 20) throw new CourtError('VERIFY_NEEDS_NOTE', '验收必须写依据（≥20 字，含你实际核对了什么）');
  const ck = checks || {};
  const need = ['artifactsOpened', 'versionChecked', 'contentRechecked'];
  for (const k of need) if (ck[k] !== true) throw new CourtError('VERIFY_CHECKLIST_INCOMPLETE', `验收清单缺项：${k} 必须为 true（打开原始材料 / 核对版本 / 独立复核内容）`);
  if (![ck.recomputed, ck.doubleCountChecked, ck.omissionChecked].some((v) => v === true)) {
    throw new CourtError('VERIFY_CHECKLIST_INCOMPLETE', '验收必须至少做一项实质复核：自行复算（recomputed）、检查重复计数（doubleCountChecked）或检查选择性遗漏（omissionChecked）');
  }
  const arts = (artifacts || []).map((p) => {
    const abs = path.isAbsolute(p) ? p : path.resolve(root, p);
    if (!fs.existsSync(abs)) throw new CourtError('VERIFY_ARTIFACT_MISSING', `验收人声称打开的材料不存在：${abs}`);
    return { path: abs, sha256: sha256(fs.readFileSync(abs)) };
  });
  if (arts.length === 0) throw new CourtError('VERIFY_NEEDS_ARTIFACTS', '必须列出你实际打开过的原始材料（artifacts），不得只凭执行者的报告验收');
  t.verifier = verifier;
  t.verifyChecks = ck;
  t.verifyArtifacts = arts;
  t.status = passed ? 'verified' : 'failed';
  t.verifiedAt = now();
  t.verifyNote = note;
  if (!passed) t.report = `${t.report}\n[验收失败] ${note}`;
  saveCase(root, c);
  appendLog(root, { type: 'task.verify', caseId, payload: sha256(`${taskId}:${passed}:${arts.length}`) });
  return t;
}

export function cancelTask(root, caseId, taskId, { reason, by }) {
  const c = loadCase(root, caseId);
  const t = c.tasks.find((x) => x.id === taskId);
  if (!t) throw new CourtError('TASK_NOT_FOUND', `任务 ${taskId} 不存在`);
  if (!reason) throw new CourtError('CANCEL_NEEDS_REASON', '取消任务必须说明依据');
  t.status = 'cancelled';
  t.cancelReason = `${reason}（by ${by}）`;
  saveCase(root, c);
  appendLog(root, { type: 'task.cancel', caseId, payload: sha256(`${taskId}:${reason}`) });
  return t;
}

// ---------- 先例 ----------
export function addPrecedent(root, { id, project, title, holding, scope, fromCase, commit, facts }) {
  if (!PRECEDENT_SCOPES.includes(scope)) throw new CourtError('BAD_SCOPE', `先例类型必须是 ${PRECEDENT_SCOPES.join('/')}`);
  const p = paths(root);
  const db = readJson(path.join(p.precedents, 'index.json'), { items: [] });
  if (db.items.some((x) => x.id === id)) throw new CourtError('PRECEDENT_EXISTS', `先例 ${id} 已存在`);
  const item = { id, project: project || null, title, holding, scope, fromCase: fromCase || null, commit: commit || null, facts: facts || null, createdAt: now() };
  db.items.push(item);
  writeJson(path.join(p.precedents, 'index.json'), db);
  appendLog(root, { type: 'precedent.add', caseId: fromCase || null, payload: sha256(JSON.stringify(item)) });
  return item;
}

export function citePrecedent(root, caseId, { precedentId, relevance, sameFacts, differences, asBinding }) {
  const c = loadCase(root, caseId);
  const db = readJson(path.join(paths(root).precedents, 'index.json'), { items: [] });
  const pr = db.items.find((x) => x.id === precedentId);
  if (!pr) throw new CourtError('PRECEDENT_NOT_FOUND', `先例 ${precedentId} 不存在`);
  if (['invalid', 'overruled'].includes(pr.scope)) throw new CourtError('PRECEDENT_DEAD', `先例 ${precedentId} 已失效/被推翻，不得引用`);
  if (asBinding && pr.scope !== 'binding') throw new CourtError('PRECEDENT_NOT_BINDING', `先例 ${precedentId} 不是绑定先例`);
  if (asBinding && c.project && pr.project !== c.project) throw new CourtError('PRECEDENT_CROSS_PROJECT', '跨项目先例不得作为绑定先例（小泽的规则不能自动成为其他作品的法律）');
  if (!relevance || !sameFacts) throw new CourtError('PRECEDENT_NEEDS_ANALYSIS', '引用先例必须说明关联性与事实异同');
  const cit = { precedentId, asBinding: !!asBinding, relevance, sameFacts, differences: differences || null, at: now() };
  c.citedPrecedents.push(cit);
  saveCase(root, c);
  appendLog(root, { type: 'precedent.cite', caseId, payload: sha256(JSON.stringify(cit)) });
  return cit;
}

// ---------- 制度攻击方 ----------
export function recordRedteam(root, caseId, { vector, attempt, outcome, weakness, fixed, evidencePath }) {
  const c = loadCase(root, caseId);
  if (!vector) throw new CourtError('BAD_INPUT', '必须写明攻击向量');
  if (!['succeeded', 'failed', 'partial'].includes(outcome)) throw new CourtError('BAD_OUTCOME', 'outcome 只能是 succeeded/failed/partial');
  const a = { vector, attempt, outcome, weakness: weakness || null, fixed: !!fixed, evidencePath: evidencePath || null, at: now(), sandboxed: true };
  c.redteam.push(a);
  saveCase(root, c);
  appendLog(root, { type: 'redteam.record', caseId, payload: sha256(JSON.stringify(a)) });
  return a;
}

// ---------- 结案 ----------
export function closeCase(root, caseId, { by }) {
  const c = loadCase(root, caseId);
  if (!c.ruling) throw new CourtError('NO_RULING', '没有裁决不得结案');
  if (['stay', 'dismissed', 'remanded', 'insufficient'].includes(c.ruling.verdict) && c.tasks.length === 0) {
    c.stage = 'closed'; c.closedAt = now(); saveCase(root, c);
    appendLog(root, { type: 'case.close', caseId, payload: sha256(by || 'system') });
    return c;
  }
  const open = c.tasks.filter((t) => !['verified', 'cancelled'].includes(t.status));
  if (open.length) throw new CourtError('TASKS_OPEN', `仍有 ${open.length} 项任务未核销：${open.map((t) => t.id).join(',')}`);
  c.stage = 'closed'; c.closedAt = now();
  c.closedBy = by || 'system';
  saveCase(root, c);
  appendLog(root, { type: 'case.close', caseId, payload: sha256(by || 'system') });
  return c;
}

// ---------- 审计 ----------
export function verifyAudit(root) {
  const problems = [];
  const warnings = [];
  const log = readLog(root);
  let prev = 'genesis';
  for (const e of log) {
    const { hash, ...body } = e;
    if (body.prev !== prev) problems.push({ code: 'LOG_CHAIN_BROKEN', at: e.seq });
    if (sha256(JSON.stringify(body)) !== hash) problems.push({ code: 'LOG_HASH_MISMATCH', at: e.seq });
    prev = hash;
  }
  for (const c of listCases(root)) {
    const dir = caseDir(root, c.id);
    // 迟到初判：不判错，但必须披露（书状入卷后才入库的密封初判）
    for (const j of c.juryInitial || []) {
      if (j.late) warnings.push({ code: 'JURY_INITIAL_LATE', caseId: c.id, juror: j.juror, reason: j.lateReason });
    }
    // 陪审密封
    for (const j of c.jury) {
      const f = path.join(dir, 'jury', `${j.juror}.json`);
      if (!fs.existsSync(f)) { problems.push({ code: 'JURY_FILE_MISSING', caseId: c.id, juror: j.juror }); continue; }
      const disk = JSON.parse(fs.readFileSync(f, 'utf8'));
      const { sha: diskSha, ...rest } = disk;
      // 密封必须自证：文件里任何字段被改，payload 重算就对不上
      if (diskSha !== j.sha || sha256(JSON.stringify(rest)) !== diskSha) problems.push({ code: 'JURY_SEAL_BROKEN', caseId: c.id, juror: j.juror });
    }
    // 裁决完整性
    if (c.ruling) {
      for (const f of c.ruling.findings) {
        for (const id of f.evidenceIds) if (!c.evidence.some((e) => e.id === id)) problems.push({ code: 'RULING_DANGLING_EVIDENCE', caseId: c.id, evidence: id });
      }
      if (c.ruling.judge === c.author) problems.push({ code: 'JUDGE_IS_AUTHOR', caseId: c.id });
      if (c.type === 'high' && c.redteam.length === 0) problems.push({ code: 'REDTEAM_MISSING', caseId: c.id });
      // 未撤销的少数意见必须存在
      if (c.jury.some((j) => j.minority) && c.ruling.minorityRecorded !== true) problems.push({ code: 'MINORITY_SUPPRESSED', caseId: c.id });
    }
    // P0-1：证据登记独立性与状态机
    for (const e of c.evidence) {
      if (!isLegacy(c) && !EVIDENCE_STATES.includes(evState(e))) problems.push({ code: 'BAD_EVIDENCE_STATE', caseId: c.id, evidence: e.id, state: evState(e) });
      if (e.registeredBy && c.author && e.registeredBy === c.author) problems.push({ code: 'REGISTRAR_IS_AUTHOR', caseId: c.id, evidence: e.id });
      if (e.registeredBy && e.registeredBy === e.submittedBy) problems.push({ code: 'REGISTRAR_IS_SUBMITTER', caseId: c.id, evidence: e.id });
      if (evState(e) === 'admitted' && e.decidedBy === c.author) problems.push({ code: 'AUTHOR_CANNOT_ADMIT', caseId: c.id, evidence: e.id });
      if (['rejected', 'withdrawn'].includes(evState(e)) && !e.decisionReason) problems.push({ code: 'EVIDENCE_DECISION_WITHOUT_REASON', caseId: c.id, evidence: e.id });
    }
    const isAdmitted = (id) => { const e = c.evidence.find((x) => x.id === id); return e && evState(e) === 'admitted'; };
    const badCite = (ids, where) => { for (const id of ids || []) if (!isAdmitted(id)) problems.push({ code: 'CITED_NON_ADMITTED_EVIDENCE', caseId: c.id, where, evidence: id }); };
    for (const b of c.briefs) for (const cl of b.claims || []) badCite(cl.evidenceIds, `brief:${b.side}`);
    for (const d of c.disputes) badCite(d.evidenceIds, `dispute:${d.id}`);
    for (const j of c.jury) { badCite(j.supports, `jury:${j.juror}`); badCite(j.against, `jury:${j.juror}`); }
    // P0-2：初判密封与终票引证
    for (const j of c.jury) {
      if (!isLegacy(c) && !c.juryInitial.some((x) => x.juror === j.juror)) problems.push({ code: 'JURY_INITIAL_MISSING', caseId: c.id, juror: j.juror });
      if (!isLegacy(c) && !(j.supports || []).length) problems.push({ code: 'JURY_WITHOUT_CITATION', caseId: c.id, juror: j.juror });
      if (!isLegacy(c) && !(j.against || []).length && !j.noCounter) problems.push({ code: 'JURY_WITHOUT_COUNTER_REASON', caseId: c.id, juror: j.juror });
      if (!isLegacy(c) && !j.wouldChange) problems.push({ code: 'JURY_WITHOUT_WOULD_CHANGE', caseId: c.id, juror: j.juror });
    }
    for (const j of c.juryInitial || []) {
      const f = path.join(dir, 'jury', `${j.juror}.initial.json`);
      if (!fs.existsSync(f)) { problems.push({ code: 'JURY_INITIAL_FILE_MISSING', caseId: c.id, juror: j.juror }); continue; }
      const disk = JSON.parse(fs.readFileSync(f, 'utf8'));
      const { sha: diskSha, ...rest } = disk;
      if (diskSha !== j.sha || sha256(JSON.stringify(rest)) !== diskSha) problems.push({ code: 'JURY_INITIAL_SEAL_BROKEN', caseId: c.id, juror: j.juror });
    }
    // P0-3：书状结构化
    if (!isLegacy(c)) for (const b of c.briefs) {
      if (!(b.claims || []).length) problems.push({ code: 'BRIEF_WITHOUT_CLAIMS', caseId: c.id, side: b.side });
      for (const cl of b.claims || []) if (!(cl.evidenceIds || []).length) problems.push({ code: 'CLAIM_WITHOUT_EVIDENCE', caseId: c.id, side: b.side });
    }
    // P0-4：验收清单
    for (const t of c.tasks) {
      if (t.status === 'verified' && !isLegacy(c) && (!t.verifyChecks || !t.verifyArtifacts || t.verifyArtifacts.length === 0)) {
        problems.push({ code: 'VERIFY_CHECKLIST_MISSING', caseId: c.id, task: t.id });
      }
    }
    // P0-5：成本字段必须「数值或 null」，且 null 必须登记在 unavailable
    if (!isLegacy(c)) {
      const cost = c.cost || {};
      for (const k of ['tokens', 'apiCostCNY', 'humanMinutes']) {
        const v = cost[k];
        if (v !== null && v !== undefined && !Number.isFinite(Number(v))) problems.push({ code: 'BAD_COST_FIELD', caseId: c.id, field: k });
        if ((v === null || v === undefined) && !(cost.unavailable || []).includes(k)) problems.push({ code: 'COST_UNCLEARED_UNAVAILABLE', caseId: c.id, field: k });
      }
      // 报了 token 数却没有来源（API 账单/插桩记录）→ 视为未测冒充实测
      if (Number.isFinite(Number(cost.tokens)) && Number(cost.tokens) > 0 && !cost.tokensSource) {
        problems.push({ code: 'COST_WITHOUT_SOURCE', caseId: c.id, field: 'tokens' });
      }
      if (cost.tokens !== null && cost.tokens !== undefined && Number(cost.tokens) === 0 && !cost.tokensSource) {
        problems.push({ code: 'COST_ZERO_WITHOUT_SOURCE', caseId: c.id, field: 'tokens' });
      }
    }
    // 任务
    for (const t of c.tasks) {
      if (t.status === 'verified' && t.verifier === t.owner) problems.push({ code: 'SELF_VERIFICATION', caseId: c.id, task: t.id });
      if (t.status === 'verified' && t.evidencePath && !fs.existsSync(t.evidencePath)) problems.push({ code: 'TASK_EVIDENCE_GONE', caseId: c.id, task: t.id });
      if (!['verified', 'cancelled'].includes(t.status) && Date.parse(t.deadline) < Date.now()) {
        problems.push({ code: 'TASK_OVERDUE', caseId: c.id, task: t.id, deadline: t.deadline, status: t.status });
      }
    }
    // 结案条件
    if (c.stage === 'closed' && c.tasks.some((t) => !['verified', 'cancelled'].includes(t.status))) {
      problems.push({ code: 'CLOSED_WITH_OPEN_TASKS', caseId: c.id });
    }
  }
  return { ok: problems.length === 0, problems, warnings, checkedCases: listCases(root).length, logEntries: log.length };
}

// ---------- 成本（P0-5） ----------
// 能测的写数值并记来源；不能测的必须留在 unavailable 里，禁止用 0 冒充「没有成本」。
export function recordCost(root, caseId, patch) {
  const c = loadCase(root, caseId);
  const cost = c.cost || { unavailable: [] };
  cost.unavailable = cost.unavailable || [];
  for (const [k, v] of Object.entries(patch || {})) {
    if (v === null || v === undefined) continue;
    if (v === 'unavailable') {
      cost[k] = null;
      if (!cost.unavailable.includes(k)) cost.unavailable.push(k);
      continue;
    }
    if (['tokens', 'apiCostCNY', 'humanMinutes', 'maintenanceMinutes', 'calls', 'humanSteps'].includes(k)) {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) throw new CourtError('BAD_COST', `成本字段 ${k} 必须是非负数字，或显式标记 unavailable`);
      cost[k] = n;
      cost.unavailable = cost.unavailable.filter((x) => x !== k);
    } else {
      cost[k] = v;
    }
  }
  c.cost = cost;
  saveCase(root, c);
  appendLog(root, { type: 'cost.record', caseId, payload: sha256(JSON.stringify(patch)) });
  return cost;
}

// ---------- 指标 ----------
export function metrics(root) {
  const cs = listCases(root);
  const per = cs.map((c) => {
    // 旧案（无 schema 或旧 cost 形状）里的 0 不是「测出来是 0」，是「当时没插桩」，一律按 unavailable 处理
    const legacyNoSource = isLegacy(c) && !c.cost?.tokensSource;
    const tokens = legacyNoSource ? null : (Number.isFinite(Number(c.cost?.tokens)) ? Number(c.cost.tokens) : null);
    const humanMinutes = legacyNoSource ? null : (Number.isFinite(Number(c.cost?.humanMinutes)) ? Number(c.cost.humanMinutes) : null);
    const unavailable = [...new Set([
      ...(c.cost?.unavailable || []),
      ...(tokens === null ? ['tokens'] : []),
      ...(humanMinutes === null ? ['humanMinutes'] : []),
    ])];
    return {
      id: c.id, type: c.type, stage: c.stage, verdict: c.ruling?.verdict || null,
      evidence: c.evidence.length, briefs: c.briefs.length, disputes: c.disputes.length,
      cross: c.cross.length, jury: c.jury.length, tasks: c.tasks.length,
      verified: c.tasks.filter((t) => t.status === 'verified').length,
      defects: c.ruling ? c.ruling.findings.filter((f) => f.severity !== 'minor').length : 0,
      tokens, humanMinutes, calls: c.cost?.calls || 0, costUnavailable: unavailable,
    };
  });
  const sum = (k) => per.reduce((a, b) => a + (Number(b[k]) || 0), 0);
  const unavailable = [...new Set(per.flatMap((p) => p.costUnavailable))];
  return {
    cases: per.length,
    byType: cs.reduce((m, c) => ((m[c.type] = (m[c.type] || 0) + 1), m), {}),
    totals: {
      evidence: sum('evidence'), cross: sum('cross'), jury: sum('jury'), tasks: sum('tasks'), verified: sum('verified'), defects: sum('defects'),
      calls: sum('calls'),
      tokens: unavailable.includes('tokens') ? 'unavailable' : sum('tokens'),
      humanMinutes: unavailable.includes('humanMinutes') ? 'unavailable' : sum('humanMinutes'),
      costUnavailable: unavailable,
    },
    per,
  };
}
