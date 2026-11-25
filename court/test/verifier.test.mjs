// I-26：验收必须记名。缺 verifier 时，"执行者不得自验"的拦截会被静默跳过，
// 因此引擎必须显式拒绝（VERIFIER_REQUIRED）。本文件独立于 court.test.mjs，自带夹具。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as C from '../src/court.mjs';

test('验收缺 verifier → VERIFIER_REQUIRED（否则自验拦截被静默跳过）', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'court-v-'));
  const prop = path.join(root, 'proposal.md');
  fs.writeFileSync(prop, '# 提案\n在 little-zelensky-simulator 副本内试点一处页脚改动。\n', 'utf8');
  const ev = path.join(root, 'evidence.txt');
  fs.writeFileSync(ev, 'screenshot ok', 'utf8');

  C.openCase(root, {
    id: 'C-900',
    title: '记名验收',
    type: 'ordinary',
    project: 'little-zelensky-simulator',
    proposalPath: prop,
    author: 'lead',
    summary: '记名校验',
  });

  const cand = C.submitEvidence(root, 'C-900', {
    submittedBy: 'author',
    kind: 'raw',
    source: ev,
    version: 'v1',
    claim: '截图可读',
    confidence: 'high',
    verified: false,
    conflict: null,
    scope: '本机',
  });
  const reg = C.registerEvidence(root, 'C-900', cand.id, {
    registrar: 'clerk-x',
    version: 'v1',
    sourceRef: ev,
    hash: 'sha256:deadbeef',
  });
  C.decideEvidence(root, 'C-900', reg.id, { by: 'judge-x', decision: 'admitted', reason: '来源为本地文件且可复核' });

  // 初判必须在书状之前
  const basis = '目前只能确认材料存在，尚不能确认渲染结果与失败判据一致，需要第三方复跑一次才能算数。';
  for (const j of ['j1', 'j2', 'j3']) {
    C.castInitialVote(root, 'C-900', { juror: j, onFundamentals: 'conditional', basis });
  }

  C.fileBrief(root, 'C-900', {
    side: 'prosecution',
    author: 'pros-x',
    text: '本方案有明确证据支撑，且失败判据写死，可在副本内一次验清。'.repeat(3),
    claims: [{ text: '截图可读', evidenceIds: [reg.id] }],
  });
  C.fileBrief(root, 'C-900', {
    side: 'defense',
    author: 'def-x',
    text: '辩方认为范围应限制在副本内，且必须附上可证伪的失败判据。'.repeat(3),
    claims: [{ text: '范围限副本', evidenceIds: [reg.id] }],
  });
  C.raiseDispute(root, 'C-900', { by: 'judge-x', point: '范围是否限于副本', evidenceIds: [reg.id] });
  C.addCrossRound(root, 'C-900', {
    round: 1,
    questionBy: 'prosecution',
    question: '失败判据由谁来跑',
    answeredBy: 'defense',
    answer: '由非执行人独立复跑，并留存完整输出与退出码',
  });

  for (const j of ['j1', 'j2', 'j3']) {
    C.castJury(root, 'C-900', {
      juror: j,
      verdict: 'conditional',
      onFundamentals: 'conditional',
      reason: '证据存在但缺第三方复跑记录，故附条件',
      supports: [reg.id],
      noCounter: '我未在任何证据里找到可反驳该主张的材料',
      wouldChange: '若出现第三方复跑记录则改判批准',
      minority: '无',
    });
  }

  C.rule(root, 'C-900', {
    judge: 'judge-x',
    verdict: 'pilot',
    reason: '三项条件均可验收，故批一次受限试点：范围限于副本，且须第三方复跑留存输出。',
    minorityRecorded: true,
    findings: [{ severity: 'P1', claim: '复跑记录缺失', evidenceIds: [reg.id] }],
    conditions: ['限于副本', '第三方复跑'],
  });

  C.createTask(root, 'C-900', {
    owner: 'lead',
    deliverable: '复跑记录',
    acceptance: '由非执行人独立复跑并留存完整输出与退出码',
    deadline: new Date(Date.now() + 86400000).toISOString(),
  });
  const t = C.loadCase(root, 'C-900').tasks[0];
  C.submitTask(root, 'C-900', t.id, {
    report: '已提交复跑输出与三份样本，逐项记录退出码与失败行号。',
    evidencePath: ev,
  });

  assert.throws(
    () =>
      C.verifyTask(root, 'C-900', t.id, {
        passed: true,
        note: '我已打开原始材料并逐项复算三处数字，结论与执行人一致，未发现遗漏。',
        checks: { artifactsOpened: true, versionChecked: true, contentRechecked: true, recomputed: true },
        artifacts: [ev],
      }),
    (e) => e.code === 'VERIFIER_REQUIRED',
  );
});
