#!/usr/bin/env node
// G2 试点台账核验器（C-002 裁定 C1/C2/C5/C6 的可执行部分）
//
// V0.2.0 修订：时序检查不再静默跳过；必需参数缺失即 exit 2；--git 真正执行它声明的检查。
//
// 用法：
//   node tools/g2_ledger_check.mjs --ledger <path> --ui-commits <map.json>   # 推荐（跨仓库）
//   node tools/g2_ledger_check.mjs --ledger <path> --git                     # 只在被试点仓库内直接跑
//   node tools/g2_ledger_check.mjs --ledger <path> --no-timing               # 显式放弃时序（报告会写 unavailable）
//   加 --expect-pilot 做终局校验：必须恰好 3 行创作行 + 2 行交接行
//
// 退出码：0 通过；1 发现违规；2 缺少必需参数或无法完成声明的检查（不得伪装成 0）
//
// 规则来源：C-002 裁决书第六节
//   C1 台账与时序：3 创作行 + 2 交接行，交接 sha 须早于对应 ui_file 首次提交
//   C2 分类不得自评：有 class 必须有 writer 与 reviewer，且 reviewer ≠ writer；混用即不成立
//   C5 零阻断：全文件不得出现 BLOCK / REWORK / APPEAL 事件行
//   C6 记录 < 5 条时不判同款率

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const argv = {};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith('--')) {
    const k = a.slice(2);
    const next = args[i + 1];
    if (next && !next.startsWith('--')) { argv[k] = next; i++; } else { argv[k] = true; }
  }
}

const errors = [];
const warnings = [];
const notes = [];
function err(line, code, msg) { errors.push({ line, code, msg }); }

if (!argv.ledger || argv.ledger === true) {
  console.error('g2_ledger_check: 缺少 --ledger <path>（exit 2）');
  process.exit(2);
}
if (!existsSync(argv.ledger)) {
  console.error(`g2_ledger_check: 台账不存在 ${argv.ledger}（exit 2）`);
  process.exit(2);
}

// ---- 时序依据是必需参数：必须显式三选一（V0.2.0 I-18）----
const timingMode = argv['no-timing'] ? 'off' : (argv['ui-commits'] ? 'map' : (argv.git ? 'git' : null));
if (!timingMode) {
  console.error('g2_ledger_check: 缺少时序依据（exit 2）。必须显式指定其一：');
  console.error('  --ui-commits <map.json>  跨仓库时推荐：{"<ui_file>": "<ISO 首次提交时间>"}');
  console.error('  --git                    只在被试点仓库内直接跑');
  console.error('  --no-timing              明确放弃时序检查（报告中时序记为 unavailable，不会被当成通过）');
  process.exit(2);
}
if (timingMode === 'off') notes.push('timing=unavailable（--no-timing：时序未检查，不得据此认定 C1 成立）');

const raw = readFileSync(argv.ledger, 'utf8').split(/\r?\n/);
const rows = [];
let headerSeen = false;

raw.forEach((line, i) => {
  const lineNo = i + 1;
  const t = line.trim();
  if (!t) return;
  if (t.startsWith('#')) { if (!headerSeen && /schema/i.test(t)) headerSeen = true; return; }
  let obj;
  try { obj = JSON.parse(t); } catch { err(lineNo, 'BAD_JSON', '该行不是合法 JSON'); return; }
  rows.push({ lineNo, obj });
});

if (!headerSeen) err(1, 'NO_SCHEMA_HEADER', '首行须为注释式 schema 说明（含 schema 字样）');

const isCreation = (o) => o && (o.type === undefined || o.type === 'creation');
const isHandoff = (o) => o && o.type === 'handoff_read';
const eventTypes = /^(BLOCK|REWORK|APPEAL)/;

const creations = rows.filter((r) => isCreation(r.obj));
const handoffs = rows.filter((r) => isHandoff(r.obj));
const blocks = rows.filter((r) => eventTypes.test(String(r.obj.type || '')) || eventTypes.test(String(r.obj.event || '')));

// C5
for (const b of blocks) err(b.lineNo, 'BLOCKING_EVENT', `出现阻断类事件「${b.obj.type || b.obj.event}」：违反 C5 零阻断，试点应终止`);

// C1 创作行
const seenN = new Set();
for (const r of creations) {
  const o = r.obj;
  for (const f of ['n', 'sentence', 'written_at', 'ui_file', 'minutes_spent']) {
    if (o[f] === undefined || o[f] === null || o[f] === '') err(r.lineNo, 'MISSING_FIELD', `创作行缺字段 ${f}`);
  }
  if (typeof o.n === 'number') {
    if (seenN.has(o.n)) err(r.lineNo, 'DUPLICATE_N', `创作行 n=${o.n} 重复`);
    seenN.add(o.n);
  }
  if (o.minutes_spent !== undefined && !(typeof o.minutes_spent === 'number' && o.minutes_spent >= 0)) {
    err(r.lineNo, 'BAD_MINUTES', 'minutes_spent 必须是非负数');
  }
  // C2
  const hasClass = o.class !== undefined && o.class !== null && o.class !== '';
  const reviewer = o.reviewer || o.review;
  if (hasClass && !o.writer) err(r.lineNo, 'CLASS_WITHOUT_WRITER', '有 class 但没有 writer（C2 无法判自评）');
  if (hasClass && !reviewer) err(r.lineNo, 'CLASS_WITHOUT_REVIEWER', '有 class 但没有 reviewer（C2 禁止自评）');
  if (hasClass && reviewer && o.writer && String(reviewer) === String(o.writer)) {
    err(r.lineNo, 'SELF_REVIEW', 'reviewer 与 writer 相同（C2 禁止自评）');
  }
}
const classRows = creations.filter((r) => r.obj.class !== undefined && r.obj.class !== '');
if (classRows.length > 0 && classRows.length !== creations.length) {
  err(classRows[classRows.length - 1].lineNo, 'CLASS_MIXED', `部分行有 class、部分没有（C2：混用即不成立）；有 class 的行：${classRows.map((r) => r.lineNo).join(',')}`);
}

// C1 交接行不得缺
for (const c of creations) {
  const n = Number(c.obj.n);
  if (!Number.isFinite(n) || n < 2) continue;
  if (!handoffs.some((h) => Number(h.obj.read_of) === n - 1)) {
    err(c.lineNo, 'HANDOFF_MISSING', `创作行 n=${n} 缺对应的交接行（read_of=${n - 1}），C1 要求每次开工前先读上一次`);
  }
}

// C1 交接行字段
for (const r of handoffs) {
  const o = r.obj;
  for (const f of ['n', 'read_of', 'sha', 'read_at']) {
    if (o[f] === undefined || o[f] === null || o[f] === '') err(r.lineNo, 'MISSING_FIELD', `交接行缺字段 ${f}`);
  }
  if (o.read_of !== undefined && o.n !== undefined && Number(o.read_of) !== Number(o.n) - 1) {
    err(r.lineNo, 'BAD_READ_OF', `交接行 n=${o.n} 的 read_of 应为 n-1`);
  }
}

// ---- 时序（V0.2.0：要么真检查，要么显式 unavailable）----
let uiCommits = null;
if (timingMode === 'map') {
  if (!existsSync(argv['ui-commits'])) { console.error(`g2_ledger_check: ui-commits 不存在 ${argv['ui-commits']}（exit 2）`); process.exit(2); }
  try { uiCommits = JSON.parse(readFileSync(argv['ui-commits'], 'utf8')); } catch { console.error('g2_ledger_check: ui-commits 不是合法 JSON（exit 2）'); process.exit(2); }
}
if (timingMode === 'git') {
  uiCommits = {};
  let missing = 0;
  for (const r of creations) {
    const f = r.obj.ui_file;
    if (!f) continue;
    try {
      const out = execFileSync('git', ['log', '--diff-filter=A', '--format=%aI', '--', f], { encoding: 'utf8' }).trim();
      const first = out.split(/\r?\n/).filter(Boolean).pop();
      if (first) uiCommits[f] = first; else missing++;
    } catch (e) {
      console.error(`g2_ledger_check: --git 调用失败：${e.message}（exit 2）`);
      process.exit(2);
    }
  }
  if (missing > 0) {
    console.error(`g2_ledger_check: --git 模式在 ${missing} 个 ui_file 上找不到首次提交（exit 2）。`);
    console.error('  最常见原因：台账所在仓库不是被试点的仓库。请改用 --ui-commits <map.json>，或显式 --no-timing 并在报告中写 unavailable。');
    process.exit(2);
  }
}
if (timingMode !== 'off') {
  for (const r of handoffs) {
    const o = r.obj;
    const next = creations.find((c) => Number(c.obj.n) === Number(o.n));
    if (!next) { err(r.lineNo, 'HANDOFF_WITHOUT_CREATION', `交接行 n=${o.n} 找不到对应的创作行`); continue; }
    const uiFile = next.obj.ui_file;
    const firstCommit = uiCommits[uiFile];
    if (!firstCommit) { err(r.lineNo, 'NO_UI_COMMIT', `映射里没有 ${uiFile} 的首次提交时间，无法判时序（不得视为通过）`); continue; }
    // 交接时间：优先用 git 解析 sha 的提交时间，退化为自报 sha_date
    let handoffAt = null;
    let source = 'sha_date';
    if (timingMode === 'git') {
      try {
        const d = execFileSync('git', ['show', '-s', '--format=%aI', String(o.sha)], { encoding: 'utf8' }).trim();
        if (d) { handoffAt = new Date(d); source = 'git sha'; }
      } catch { /* 落到 sha_date */ }
    }
    if (!handoffAt && o.sha_date) { handoffAt = new Date(o.sha_date); source = 'sha_date'; }
    if (!handoffAt) { err(r.lineNo, 'HANDOFF_TIME_UNKNOWN', '既无 sha 提交时间也无 sha_date，无法判时序（不得视为通过）'); continue; }
    const commitDate = new Date(firstCommit);
    if (Number.isNaN(handoffAt.valueOf()) || Number.isNaN(commitDate.valueOf())) {
      err(r.lineNo, 'BAD_TIME', '时间字段无法解析'); continue;
    }
    if (handoffAt >= commitDate) {
      err(r.lineNo, 'HANDOFF_AFTER_UI', `交接 ${handoffAt.toISOString()} 不早于 ${uiFile} 首次提交 ${commitDate.toISOString()}（依据：${source}）`);
    }
  }
}

// 终局校验
const creationCount = creations.length;
if (argv['expect-pilot']) {
  if (creationCount !== 3) err(1, 'PILOT_INCOMPLETE', `--expect-pilot 要求恰好 3 行创作行，实有 ${creationCount} 行`);
  if (handoffs.length !== 2) err(1, 'PILOT_INCOMPLETE', `--expect-pilot 要求恰好 2 行交接行，实有 ${handoffs.length} 行`);
  const ns = creations.map((r) => Number(r.obj.n)).sort();
  if (ns.join(',') !== '1,2,3') err(1, 'PILOT_NUMBERS', `创作行 n 必须是 1,2,3，实为 ${ns.join(',')}`);
}

for (const e of errors) console.log(`FAIL line ${e.line}: [${e.code}] ${e.msg}`);
for (const w of warnings) console.log(`WARN line ${w.line}: [${w.code}] ${w.msg}`);
for (const n of notes) console.log(`NOTE ${n}`);
console.log(`SUMMARY 创作行 ${creationCount} 条；交接行 ${handoffs.length} 条；时序=${timingMode === 'off' ? 'unavailable' : 'checked(' + timingMode + ')'}；C6：记录 <5 时只留档，本器不判同款率`);

if (errors.length) { console.log(`\n合计 ${errors.length} 处违规。`); process.exit(1); }
console.log('OK');
process.exit(0);
