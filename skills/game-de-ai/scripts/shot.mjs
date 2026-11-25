#!/usr/bin/env node
/**
 * preview-shot —— 本机浏览器视觉预览截图（零依赖：node 内置 fetch/WebSocket + Chrome DevTools Protocol）
 *
 * 为什么不用 `--headless --screenshot`：
 *   命令行截图模式不能可靠指定 deviceScaleFactor（2x）、不能整页截图、也拿不到布局尺寸；
 *   CDP 一次启动即可覆盖视口截图 / 整页截图 / 缩放，且能等字体与图片就绪。
 *
 * 用法：node shot.mjs --url <页面> --out <输出.png> [--width 1440] [--height 900]
 *                       [--scale 2] [--full] [--wait 0] [--timeout 30000] [--browser <exe>]
 * 细节见同目录 README.md。
 *
 * 退出码：0 成功；1 失败（stderr 说明原因）。
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const TOOL = 'preview-shot';
const WIN = process.platform === 'win32';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DEFAULTS = { width: 1440, height: 900, scale: 2, wait: 0, timeout: 30000 };

const USAGE = `${TOOL} —— 本机 Edge/Chrome 无头截图（零依赖，CDP）

用法:
  node shot.mjs --url <页面> --out <输出.png> [选项]

必填:
  --url <s>        要渲染的页面：本地 HTML 路径 / file:// / http(s):// / data:
  --out <s>        输出 PNG 路径（相对路径按当前工作目录解析，父目录自动创建）

选项:
  --width <n>      视口宽（CSS px），默认 1440
  --height <n>     视口高（CSS px），默认 900
  --scale <n>      deviceScaleFactor，默认 2；输出像素 = CSS px × scale
  --full           整页截图：高度取文档完整内容高度（宽度仍为 --width 视口宽）
  --wait <ms>      load 之后额外等待毫秒，默认 0（字体/图片已内建等待）
  --timeout <ms>   导航超时毫秒，默认 30000
  --browser <exe>  指定浏览器可执行文件（默认自动探测 Edge/Chrome）
  -h, --help       显示本帮助

示例:
  node shot.mjs --url _selftest/selftest.html --out _selftest/out/selftest.png

成功时 stdout 输出一行 JSON（out/png/viewport/scale/full/elapsedMs），失败退出码 1。`;

// ---------------------------------------------------------------------------
// 参数
// ---------------------------------------------------------------------------

function toInt(raw, name, min) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min) throw new Error(`${name} 需要 ≥ ${min} 的整数，收到 "${raw}"`);
  return n;
}

function toNum(raw, name, min, max) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`${name} 需要 ${min}–${max} 之间的数字，收到 "${raw}"`);
  return n;
}

function parseArgs(argv) {
  const opts = { ...DEFAULTS, url: null, out: null, browser: null, full: false };
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i];
    if (raw === '-h' || raw === '--help') {
      console.log(USAGE);
      process.exit(0);
    }
    if (!raw.startsWith('--')) {
      throw new Error(`无法识别的参数 "${raw}"（位置参数请用 --url / --out）`);
    }
    const eq = raw.indexOf('=');
    const name = eq === -1 ? raw : raw.slice(0, eq);
    const inline = eq === -1 ? undefined : raw.slice(eq + 1);
    const value = () => {
      if (inline !== undefined) return inline;
      if (i + 1 >= argv.length) throw new Error(`${name} 需要一个值`);
      return argv[++i];
    };
    switch (name) {
      case '--url': opts.url = value(); break;
      case '--out': opts.out = value(); break;
      case '--width': opts.width = toInt(value(), name, 1); break;
      case '--height': opts.height = toInt(value(), name, 1); break;
      case '--scale': opts.scale = toNum(value(), name, 0.1, 8); break;
      case '--wait': opts.wait = toInt(value(), name, 0); break;
      case '--timeout': opts.timeout = toInt(value(), name, 1000); break;
      case '--browser': opts.browser = value(); break;
      case '--full': opts.full = true; break;
      default: throw new Error(`未知选项 ${name}`);
    }
  }
  if (!opts.url) throw new Error('缺少必填参数 --url');
  if (!opts.out) throw new Error('缺少必填参数 --out');
  return opts;
}

// ---------------------------------------------------------------------------
// 页面 URL / 输出路径 / 浏览器
// ---------------------------------------------------------------------------

function resolvePageUrl(raw) {
  if (/^(https?|file|data):/i.test(raw)) return raw;
  const abs = path.resolve(raw);
  if (!existsSync(abs)) {
    throw new Error(`--url 既不是 http(s)/file/data URL，也不是本机存在的文件：${raw}`);
  }
  return pathToFileURL(abs).href;
}

function browserCandidates(explicit) {
  const list = [];
  if (explicit) list.push(explicit);
  for (const key of ['PREVIEW_SHOT_BROWSER', 'CHROME_PATH', 'EDGE_PATH']) {
    if (process.env[key]) list.push(process.env[key]);
  }
  list.push(
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  );
  if (process.env.LOCALAPPDATA) {
    list.push(path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    list.push(path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
  }
  return [...new Set(list.filter(Boolean))];
}

function findBrowser(explicit) {
  if (explicit) {
    const abs = path.resolve(explicit);
    if (!existsSync(abs)) throw new Error(`--browser 指定的浏览器不存在：${abs}`);
    return abs;
  }
  const candidates = browserCandidates(null);
  const found = candidates.find((p) => existsSync(p));
  if (found) return path.resolve(found);
  throw new Error(
    '找不到 Edge/Chrome。已尝试：\n  ' +
      candidates.join('\n  ') +
      '\n可用 --browser "C:\\path\\to\\msedge.exe" 指定，或设置 PREVIEW_SHOT_BROWSER。',
  );
}

// ---------------------------------------------------------------------------
// 最小 CDP 客户端（node 内置 WebSocket）
// ---------------------------------------------------------------------------

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.seq = 0;
    this.pending = new Map(); // id -> {method, resolve, reject}
    this.waiters = new Map(); // method -> [{resolve, timer}]
    ws.addEventListener('message', (ev) => {
      let msg;
      try {
        const text = typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString('utf8');
        msg = JSON.parse(text);
      } catch {
        return;
      }
      if (msg.id && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) p.reject(new Error(`${p.method}: ${msg.error.message || JSON.stringify(msg.error)}`));
        else p.resolve(msg.result);
      } else if (msg.method && this.waiters.has(msg.method)) {
        const list = this.waiters.get(msg.method);
        this.waiters.delete(msg.method);
        for (const w of list) {
          clearTimeout(w.timer);
          w.resolve(msg.params);
        }
      }
    });
  }

  static connect(url, timeoutMs) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (fn, arg) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        fn(arg);
      };
      const ws = new WebSocket(url);
      const timer = setTimeout(() => {
        try { ws.close(); } catch { /* ignore */ }
        finish(reject, new Error(`CDP WebSocket 连接超时（${timeoutMs}ms）：${url}`));
      }, timeoutMs);
      ws.addEventListener('open', () => finish(resolve, new CDP(ws)));
      ws.addEventListener('error', () => finish(reject, new Error(`CDP WebSocket 连接失败：${url}`)));
    });
  }

  send(method, params = {}, timeoutMs = 60000) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP ${method} 超时（${timeoutMs}ms）`));
      }, timeoutMs);
      this.pending.set(id, {
        method,
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      });
      try {
        this.ws.send(JSON.stringify({ id, method, params }));
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err);
      }
    });
  }

  waitEvent(method, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`等待事件 ${method} 超时（${timeoutMs}ms）`)), timeoutMs);
      const list = this.waiters.get(method) || [];
      list.push({ resolve: (v) => { clearTimeout(timer); resolve(v); } });
      this.waiters.set(method, list);
    });
  }

  close() {
    try { this.ws.close(); } catch { /* ignore */ }
  }
}

async function evaluate(cdp, expression, timeoutMs) {
  const r = await cdp.send(
    'Runtime.evaluate',
    { expression, awaitPromise: true, returnByValue: true },
    timeoutMs,
  );
  if (r.exceptionDetails) {
    const detail = r.exceptionDetails.exception?.description || r.exceptionDetails.text || 'unknown';
    throw new Error(`页面脚本执行出错：${detail}`);
  }
  return r.result && r.result.value;
}

// ---------------------------------------------------------------------------
// 启动浏览器 → 等调试端口 → 连接页面
// ---------------------------------------------------------------------------

async function waitForDevToolsPort(userDataDir, child, meta, deadline) {
  const portFile = path.join(userDataDir, 'DevToolsActivePort');
  const waitStart = Date.now();
  let lastErr = null;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      const stderr = meta.stderr.trim();
      throw new Error(
        `浏览器启动后立即退出（exit ${child.exitCode}）。${
          stderr ? '\nbrowser stderr:\n' + stderr : ''
        }`,
      );
    }
    if (existsSync(portFile)) {
      const lines = readFileSync(portFile, 'utf8').split(/\r?\n/);
      const port = Number(lines[0]);
      if (Number.isInteger(port) && port > 0) return port;
      lastErr = new Error(`DevToolsActivePort 内容异常：${lines[0]}`);
    }
    await sleep(50);
  }
  throw new Error(
    `等待浏览器调试端口超时（${Math.round((Date.now() - waitStart) / 1000)}s）。` +
      (lastErr ? `\n${lastErr.message}` : '') +
      (meta.stderr.trim() ? '\nbrowser stderr:\n' + meta.stderr.trim() : ''),
  );
}

async function findPageTarget(port, deadline) {
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const list = await res.json();
        const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
        if (page) return page;
      }
    } catch {
      /* 端口刚起来时连接可能被拒，重试 */
    }
    await sleep(50);
  }
  throw new Error(`无法获取浏览器页面目标（调试端口 ${port}）`);
}

// ---------------------------------------------------------------------------
// 截图主流程
// ---------------------------------------------------------------------------

function pngSize(buf) {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < sig.length; i++) {
    if (buf[i] !== sig[i]) throw new Error('截图结果不是有效 PNG');
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function killTree(child) {
  if (!child || child.exitCode !== null) return;
  try {
    if (WIN) {
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    } else {
      child.kill('SIGTERM');
    }
  } catch {
    try { child.kill(); } catch { /* ignore */ }
  }
}

async function shoot(opts) {
  const url = resolvePageUrl(opts.url);
  const outPath = path.resolve(opts.out);
  const browser = findBrowser(opts.browser);
  mkdirSync(path.dirname(outPath), { recursive: true });

  const userDataDir = path.join(tmpdir(), `${TOOL}-${process.pid}-${Date.now()}`);
  mkdirSync(userDataDir, { recursive: true });

  /** @type {import('node:child_process').ChildProcessWithoutNullStreams | null} */
  let child = null;
  let cdp = null;
  const meta = { stderr: '' };
  const startedAt = Date.now();

  try {
    const args = [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${userDataDir}`,
      `--window-size=${opts.width},${opts.height}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-sync',
      '--disable-default-apps',
      '--hide-scrollbars',
      '--mute-audio',
      '--allow-file-access-from-files',
      '--disable-features=Translate,MediaRouter,OptimizationHints',
      'about:blank',
    ];
    child = spawn(browser, args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    child.on('error', (err) => { meta.stderr += `\nspawn error: ${err.message}`; });
    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (d) => { meta.stderr = (meta.stderr + d).slice(-8000); });

    const portDeadline = Date.now() + Math.min(opts.timeout, 20000);
    const port = await waitForDevToolsPort(userDataDir, child, meta, portDeadline);
    const target = await findPageTarget(port, Date.now() + 10000);
    cdp = await CDP.connect(target.webSocketDebuggerUrl, 10000);

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: opts.width,
      height: opts.height,
      deviceScaleFactor: opts.scale,
      mobile: false,
      screenWidth: opts.width,
      screenHeight: opts.height,
    });

    // 先挂 load 监听再导航，避免极快页面漏事件
    const loadPromise = cdp.waitEvent('Page.loadEventFired', opts.timeout).then(
      () => true,
      () => false,
    );
    const nav = await cdp.send('Page.navigate', { url }, opts.timeout);
    if (nav && nav.errorText) {
      throw new Error(`页面加载失败：${nav.errorText}（${url}）`);
    }
    const loaded = await loadPromise;
    if (!loaded) {
      const state = await evaluate(cdp, 'document.readyState', opts.timeout).catch(() => 'unknown');
      if (state !== 'complete' && state !== 'interactive') {
        throw new Error(`页面在 ${opts.timeout}ms 内未加载完成（readyState=${state}）：${url}`);
      }
    }

    // 等字体、图片 decode 与两帧绘制，避免截到未渲染态
    await evaluate(
      cdp,
      `(async () => {
        if (document.fonts && document.fonts.ready) {
          await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 5000))]);
        }
        const imgs = Array.from(document.images || []);
        await Promise.race([
          Promise.all(imgs.map(img =>
            img.complete
              ? Promise.resolve()
              : new Promise(r => {
                  img.addEventListener('load', r, { once: true });
                  img.addEventListener('error', r, { once: true });
                })
          )),
          new Promise(r => setTimeout(r, 5000)),
        ]);
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        return true;
      })()`,
      opts.timeout,
    );

    if (opts.wait > 0) await sleep(opts.wait);

    let clip;
    let contentSize = null;
    if (opts.full) {
      contentSize = await evaluate(
        cdp,
        `(() => {
          const de = document.documentElement;
          const b = document.body;
          return {
            width: Math.max(de.scrollWidth, b ? b.scrollWidth : 0, de.clientWidth, ${opts.width}),
            height: Math.max(de.scrollHeight, b ? b.scrollHeight : 0, de.clientHeight, ${opts.height}),
          };
        })()`,
        opts.timeout,
      );
      clip = {
        x: 0,
        y: 0,
        width: Math.ceil(contentSize.width),
        height: Math.ceil(contentSize.height),
        scale: 1,
      };
    }

    const captureParams = {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: Boolean(opts.full),
    };
    if (clip) captureParams.clip = clip;

    const shot = await cdp.send('Page.captureScreenshot', captureParams, Math.max(60000, opts.timeout * 2));
    const buf = Buffer.from(shot.data, 'base64');
    const dims = pngSize(buf);
    writeFileSync(outPath, buf);

    const report = {
      ok: true,
      out: outPath,
      url,
      browser,
      viewport: { width: opts.width, height: opts.height },
      scale: opts.scale,
      full: Boolean(opts.full),
      png: dims,
      content: contentSize,
      bytes: buf.length,
      elapsedMs: Date.now() - startedAt,
    };
    console.log(JSON.stringify(report));
    return report;
  } finally {
    cdp?.close();
    if (child) {
      killTree(child);
      // 等进程真正退出，再删临时 profile（Windows 上文件可能被占用）
      for (let i = 0; i < 20 && child.exitCode === null; i++) await sleep(50);
    }
    try {
      rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch {
      /* 临时目录清理失败不影响截图结果 */
    }
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  await shoot(opts);
}

main().catch((err) => {
  console.error(`${TOOL}: ERROR: ${err && err.message ? err.message : String(err)}`);
  process.exit(1);
});
