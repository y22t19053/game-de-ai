#!/usr/bin/env node
// 法庭 CLI：把制度动作变成可审计的命令（V0.1.1）
import fs from 'node:fs';
import path from 'node:path';
import * as C from '../src/court.mjs';

function parse(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) args[key] = true;
      else {
        i++;
        if (args[key] === undefined) args[key] = next;
        else if (Array.isArray(args[key])) args[key].push(next);
        else args[key] = [args[key], next];
      }
    } else args._.push(a);
  }
  return args;
}

const flags = (v) => (v === true || v === undefined ? [] : Array.isArray(v) ? v : [v]);
const readText = (root, p) => fs.readFileSync(path.isAbsolute(p) ? p : path.resolve(root, p), 'utf8');
const readJson = (root, p) => JSON.parse(readText(root, p));
const out = (obj) => console.log(JSON.stringify(obj, null, 2));
// 主张：--claim "主张文字|E001,E002"，可重复；或 --claims-file 给 JSON 数组
const claimsFrom = (root, argv) => {
  if (argv['claims-file']) return readJson(root, argv['claims-file']);
  return flags(argv.claim).map((s) => {
    const [text, ids] = s.split('|');
    return { text, evidenceIds: ids ? ids.split(',').map((x) => x.trim()).filter(Boolean) : [] };
  });
};

function main() {
  const argv = parse(process.argv.slice(2));
  const root = argv.root ? path.resolve(argv.root) : process.cwd();
  const [group, action] = argv._;
  const cid = argv.case;

  try {
    switch (`${group}:${action || ''}`) {
      case 'case:open':
        out(C.openCase(root, {
          id: argv.id, title: argv.title, type: argv.type, project: argv.project,
          proposalPath: argv.proposal, author: argv.author, summary: argv.summary,
        }));
        break;
      case 'case:show': out(C.loadCase(root, cid)); break;
      case 'case:list':
        out(C.listCases(root).map((c) => ({ id: c.id, type: c.type, stage: c.stage, title: c.title, verdict: c.ruling?.verdict || null })));
        break;
      case 'case:close': out(C.closeCase(root, cid, { by: argv.by || 'system' })); break;

      // ---- 证据：提交 → 登记 → 采信（P0-1） ----
      case 'evidence:submit':
        out(C.submitEvidence(root, cid, {
          submittedBy: argv.by, kind: argv.kind, source: argv.source, version: argv.version,
          claim: argv.claim, confidence: argv.confidence, verified: argv.verified === true,
          conflict: argv.conflict, scope: argv.scope, counter: argv.counter,
        }));
        break;
      case 'evidence:register':
        out(C.registerEvidence(root, cid, argv.evidence, {
          registrar: argv.registrar, version: argv.version, sourceRef: argv['source-ref'], hash: argv.hash,
        }));
        break;
      case 'evidence:admit':
      case 'evidence:reject':
        out(C.decideEvidence(root, cid, argv.evidence, {
          by: argv.judge || argv.by, decision: action === 'admit' ? 'admitted' : 'rejected',
          reason: argv['reason-file'] ? readText(root, argv['reason-file']) : argv.reason,
        }));
        break;
      case 'evidence:challenge':
        out(C.challengeEvidence(root, cid, argv.evidence, {
          by: argv.by, ground: argv['reason-file'] ? readText(root, argv['reason-file']) : argv.reason,
        }));
        break;
      case 'evidence:withdraw':
        out(C.withdrawEvidence(root, cid, argv.evidence, {
          by: argv.by, reason: argv['reason-file'] ? readText(root, argv['reason-file']) : argv.reason,
        }));
        break;
      case 'evidence:list':
        out(C.loadCase(root, cid).evidence.map((e) => ({ id: e.id, state: C.evState(e), kind: e.kind, submittedBy: e.submittedBy, registeredBy: e.registeredBy, decidedBy: e.decidedBy, claim: e.claim })));
        break;

      case 'brief:file':
        out(C.fileBrief(root, cid, {
          side: argv.side, author: argv.author, contextId: argv.context,
          text: argv['text-file'] ? readText(root, argv['text-file']) : argv.text,
          claims: claimsFrom(root, argv),
        }));
        break;
      case 'brief:amend':
        out(C.amendBrief(root, cid, {
          side: argv.side, author: argv.author, contextId: argv.context,
          text: argv['text-file'] ? readText(root, argv['text-file']) : argv.text,
          reason: argv.reason,
        }));
        break;

      case 'dispute:raise':
        out(C.raiseDispute(root, cid, { point: argv.point, raisedBy: argv.by, evidenceIds: flags(argv.evidence) }));
        break;

      case 'cross:add':
        out(C.addCrossRound(root, cid, {
          round: argv.round ? Number(argv.round) : undefined,
          question: argv['question-file'] ? readText(root, argv['question-file']) : argv.question,
          askedBy: argv['asked-by'], answeredBy: argv['answered-by'],
          answer: argv['answer-file'] ? readText(root, argv['answer-file']) : argv.answer,
          evidenceIds: flags(argv.evidence),
        }));
        break;

      case 'jury:initial':
        out(C.castInitialVote(root, cid, {
          juror: argv.juror, onFundamentals: argv.on,
          basis: argv['basis-file'] ? readText(root, argv['basis-file']) : argv.basis,
          contextId: argv.context,
          lateReason: argv['late-reason-file'] ? readText(root, argv['late-reason-file']) : argv['late-reason'],
        }));
        break;
      case 'jury:vote':
        out(C.castJury(root, cid, {
          juror: argv.juror, onFundamentals: argv.on,
          reason: argv['reason-file'] ? readText(root, argv['reason-file']) : argv.reason,
          minority: argv['minority-file'] ? readText(root, argv['minority-file']) : argv.minority === true ? null : argv.minority,
          contextId: argv.context,
          supports: flags(argv.supports), against: flags(argv.against),
          noCounter: argv['no-counter-file'] ? readText(root, argv['no-counter-file']) : argv['no-counter'],
          wouldChange: argv['would-change-file'] ? readText(root, argv['would-change-file']) : argv['would-change'],
        }));
        break;

      case 'judge:summary': out(C.judgeSummary(root, cid)); break;
      case 'judge:rule': {
        const findings = flags(argv.finding).map((s) => {
          const [severity, claim, ids] = s.split('|');
          return { severity, claim, evidenceIds: ids ? ids.split(',').map((x) => x.trim()).filter(Boolean) : [] };
        });
        out(C.rule(root, cid, {
          judge: argv.judge, verdict: argv.verdict, findings,
          conditions: argv['conditions-file'] ? readJson(root, argv['conditions-file']) : flags(argv.condition),
          reason: argv['reason-file'] ? readText(root, argv['reason-file']) : argv.reason,
          roundsChosen: Number(argv.rounds || 0), roundsWhy: argv['rounds-why'],
          minorityRecorded: argv['minority-recorded'] === true,
        }));
        break;
      }

      case 'task:create':
        out(C.createTask(root, cid, {
          deliverable: argv.deliverable, owner: argv.owner, deadline: argv.deadline,
          acceptance: argv.acceptance, evidencePath: argv.evidence,
        }));
        break;
      case 'task:submit':
        out(C.submitTask(root, cid, argv.task, { report: argv.report, evidencePath: argv.evidence }));
        break;
      case 'task:verify': {
        const checks = argv['checks-file'] ? readJson(root, argv['checks-file']) : {
          artifactsOpened: argv['checked-artifacts'] !== undefined ? true : undefined,
          versionChecked: argv['checked-version'] === true,
          contentRechecked: argv['checked-content'] === true,
          recomputed: argv.recomputed === true,
          doubleCountChecked: argv['checked-doublecount'] === true,
          omissionChecked: argv['checked-omission'] === true,
        };
        out(C.verifyTask(root, cid, argv.task, {
          verifier: argv.verifier || argv.by, passed: argv.passed !== 'false',
          note: argv['note-file'] ? readText(root, argv['note-file']) : argv.note,
          checks, artifacts: flags(argv.artifact),
        }));
        break;
      }
      case 'task:cancel':
        out(C.cancelTask(root, cid, argv.task, { reason: argv.reason, by: argv.by || 'system' }));
        break;

      case 'precedent:add':
        out(C.addPrecedent(root, {
          id: argv.id, project: argv.project, title: argv.title, holding: argv.holding,
          scope: argv.scope, fromCase: cid, facts: argv.facts,
        }));
        break;
      case 'precedent:cite':
        out(C.citePrecedent(root, cid, {
          precedentId: argv.precedent, relevance: argv.relevance,
          sameFacts: argv['same-facts'], differences: argv.differences, asBinding: argv.binding === true,
        }));
        break;
      case 'precedent:list': out(JSON.parse(fs.readFileSync(path.join(root, 'precedents', 'index.json'), 'utf8'))); break;

      case 'redteam:record':
        out(C.recordRedteam(root, cid, {
          vector: argv.vector, attempt: argv.attempt, outcome: argv.outcome,
          weakness: argv.weakness, fixed: argv.fixed === true, evidencePath: argv.evidence,
        }));
        break;

      case 'cost:set':
        out(C.recordCost(root, cid, {
          tokens: argv.tokens !== undefined ? Number(argv.tokens) : undefined,
          tokensSource: argv['tokens-source'],
          calls: argv.calls !== undefined ? Number(argv.calls) : undefined,
          apiCostCNY: argv['api-cost'] !== undefined ? Number(argv['api-cost']) : undefined,
          humanSteps: argv['human-steps'] !== undefined ? Number(argv['human-steps']) : undefined,
          humanMinutes: argv['human-minutes'] !== undefined ? Number(argv['human-minutes']) : undefined,
          maintenanceMinutes: argv['maintenance-minutes'] !== undefined ? Number(argv['maintenance-minutes']) : undefined,
        }));
        break;

      case 'audit:verify': out(C.verifyAudit(root)); break;
      case 'metrics:show': out(C.metrics(root)); break;
      case 'log:show': out(C.readLog(root).slice(-Number(argv.tail || 20))); break;

      default:
        console.error('用法：court <组> <动作> [--root 目录] [--case 案件号] ...');
        console.error('组：case evidence brief dispute cross jury judge task precedent redteam cost audit metrics log');
        console.error('证据：submit → register → admit|reject（challenge / withdraw 另记）');
        console.error('陪审：jury initial（读书状前）→ jury vote（须 --supports 与 --no-counter 或 --against）');
        process.exit(1);
    }
  } catch (e) {
    console.log(JSON.stringify({ rejected: true, code: e.code || 'ERROR', message: e.message }, null, 2));
    process.exit(1);
  }
}

main();
