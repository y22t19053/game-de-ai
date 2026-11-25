import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// 路径一律相对本文件解析：测试不依赖当前工作目录（cwd）
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const FIX = resolve(HERE, 'fixtures');
const MAP = `${FIX}/ui_commits.json`;
const TOOL = resolve(ROOT, 'tools/g2_ledger_check.mjs');

function run(args) {
  const r = spawnSync(process.execPath, [TOOL, ...args], { encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}
const withMap = (f, extra = []) => run(['--ledger', `${FIX}/${f}`, '--ui-commits', MAP, ...extra]);

test('I-18 复现与修复：缺少时序依据时不得静默通过（exit 2）', () => {
  const r = withMapSkipMap();
  assert.equal(r.code, 2, r.out);
  assert.match(r.out, /缺少时序依据/);
});

function withMapSkipMap() {
  return run(['--ledger', `${FIX}/ledger_handoff_late.jsonl`]);
}

test('I-18：交接晚于 UI 首次提交，带映射必被发现（exit 1）', () => {
  const r = withMap('ledger_handoff_late.jsonl');
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /HANDOFF_AFTER_UI/);
  assert.match(r.out, /line 5/);
});

test('I-18：显式 --no-timing 时输出 unavailable 且不冒充通过', () => {
  const r = withMap('ledger_handoff_late.jsonl', ['--no-timing']);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /timing=unavailable/);
});

test('I-24：--git 在非被试仓库里必须失败（exit 2），不得降级为警告', () => {
  const r = run(['--ledger', `${FIX}/ledger_good.jsonl`, '--git']);
  assert.equal(r.code, 2, r.out);
  assert.match(r.out, /找不到首次提交|--ui-commits/);
});

test('合规样本：3 创作 + 2 交接 + 时序全部通过（exit 0）', () => {
  const r = withMap('ledger_good.jsonl');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /OK/);
  assert.match(r.out, /时序=checked\(map\)/);
});

test('I-20：缺交接行被发现（exit 1）', () => {
  const r = withMap('ledger_missing_handoff.jsonl');
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /HANDOFF_MISSING/);
});

test('I-20：--expect-pilot 校验 3+2 完整性（缺行即 1）', () => {
  const ok = withMap('ledger_good.jsonl', ['--expect-pilot']);
  assert.equal(ok.code, 0, ok.out);
  const bad = withMap('ledger_missing_handoff.jsonl', ['--expect-pilot']);
  assert.equal(bad.code, 1, bad.out);
  assert.match(bad.out, /PILOT_INCOMPLETE/);
});

test('I-21：有 class 无 writer 即被拒（C2 无法判自评）', () => {
  const r = withMap('ledger_class_no_reviewer.jsonl');
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /CLASS_WITHOUT_WRITER/);
  assert.match(r.out, /CLASS_WITHOUT_REVIEWER|CLASS_MIXED/);
});

test('I-21：writer 与 reviewer 相同即自评（exit 1）', () => {
  const r = withMap('ledger_self_review.jsonl');
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /SELF_REVIEW/);
});

test('C2 合规样本：class 有他人复核则通过', () => {
  const r = withMap('ledger_class_ok.jsonl');
  assert.equal(r.code, 0, r.out);
});

test('C5：阻断事件被发现（exit 1）', () => {
  const r = withMap('ledger_blocking_event.jsonl');
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /BLOCKING_EVENT/);
});

test('I-19：CLASS_MIXED 报的是第一处有 class 的行，不是硬编码 line 1', () => {
  const r = withMap('ledger_class_no_reviewer.jsonl');
  assert.equal(r.code, 1, r.out);
  const m = r.out.match(/FAIL line (\d+): \[CLASS_MIXED\]/);
  assert.ok(m, r.out);
  assert.notEqual(m[1], '1');
});

test('缺少 --ledger 时 exit 2，不返回 0', () => {
  const r = run([]);
  assert.equal(r.code, 2, r.out);
});

test('台账文件不存在时 exit 2', () => {
  const r = run(['--ledger', `${FIX}/nope.jsonl`, '--ui-commits', MAP]);
  assert.equal(r.code, 2, r.out);
});

test('真实台账（试点未开始）显式 --no-timing 才通过，且 SUMMARY 标 unavailable', () => {
  const ledger = resolve(ROOT, 'cases/C-002/g2_ledger.jsonl');
  const r = run(['--ledger', ledger, '--no-timing']);
  assert.equal(r.code, 0, r.out);
  const s = readFileSync(ledger, 'utf8');
  assert.match(s, /G2 读数不构成三案已不同的证据/);
});
