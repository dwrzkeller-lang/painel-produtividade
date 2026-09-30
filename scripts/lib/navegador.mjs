/* Navegador automatizado (Chrome sem janela) usado pelo gerador de dados de
   demonstração e pelas conferências de tela. Abre o painel em modo
   demonstração, sem nenhuma nuvem externa.
   Exporta abrir() → { avaliar, cdp, foto, dorme, erros, fechar }. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

/* Onde procurar o Chrome (Windows, macOS, Linux). PP_CHROME força um caminho. */
const CHROME = [process.env.PP_CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe') : null,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'
].filter(Boolean).find((p) => { try { return fs.existsSync(p); } catch (e) { return false; } });
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff' };
export const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

export async function abrir(raiz, opcoes = {}) {
  if (!CHROME) throw new Error('Google Chrome não encontrado. Informe o caminho na variável PP_CHROME.');
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/painel.html';
    const c = path.join(raiz, p);
    if (!c.startsWith(path.resolve(raiz)) || !fs.existsSync(c) || fs.statSync(c).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(c)] || 'application/octet-stream' });
    fs.createReadStream(c).pipe(res);
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const perfil = path.join(os.tmpdir(), 'pp-perfil-' + Date.now() + '-' + Math.floor(Math.random() * 1e6));
  const porta = 9300 + Math.floor(Math.random() * 500);
  const largura = opcoes.largura || 1440, altura = opcoes.altura || 900;
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=' + porta, '--user-data-dir=' + perfil, '--window-size=' + largura + ',' + altura, 'about:blank'], { stdio: 'ignore' });
  let alvo = null;
  for (let i = 0; i < 80 && !alvo; i++) { await dorme(250); try { alvo = (await (await fetch('http://127.0.0.1:' + porta + '/json')).json()).find((t) => t.type === 'page'); } catch (e) { } }
  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let seq = 0; const pend = new Map(); const eventos = []; const dialogos = [];
  ws.addEventListener('message', (m) => {
    const j = JSON.parse(m.data);
    if (j.id && pend.has(j.id)) { const { ok, ko } = pend.get(j.id); pend.delete(j.id); j.error ? ko(new Error(JSON.stringify(j.error))) : ok(j.result); }
    else if (j.method) {
      eventos.push(j);
      if (j.method === 'Page.javascriptDialogOpening') {
        dialogos.push(j.params.type + ': ' + String(j.params.message).replace(/\s+/g, ' ').slice(0, 200));
        ws.send(JSON.stringify({ id: ++seq, method: 'Page.handleJavaScriptDialog', params: { accept: opcoes.aceitarConfirmacoes ? true : j.params.type === 'alert' } }));
      }
    }
  });
  const cdp = (method, params) => new Promise((ok, ko) => { const id = ++seq; pend.set(id, { ok, ko }); ws.send(JSON.stringify({ id, method, params: params || {} })); });
  const avaliar = async (expr) => {
    const r = await cdp('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return r.exceptionDetails ? { erro: String((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text).split('\n')[0] } : r.result.value;
  };
  await cdp('Runtime.enable'); await cdp('Page.enable'); await cdp('Log.enable'); await cdp('DOM.enable');
  /* Nenhuma nuvem externa: bloqueia Google/Firebase por garantia. */
  await cdp('Network.enable');
  await cdp('Network.setBlockedURLs', { urls: ['*googleapis.com*', '*gstatic.com*', '*firebaseio.com*', '*jsdelivr.net*', '*google-analytics*'] });
  await cdp('Emulation.setDeviceMetricsOverride', { width: largura, height: altura, deviceScaleFactor: opcoes.escala || 1, mobile: !!opcoes.celular });
  if (opcoes.antes) await cdp('Page.addScriptToEvaluateOnNewDocument', { source: opcoes.antes });
  await cdp('Page.navigate', { url: 'http://127.0.0.1:' + srv.address().port + '/painel.html' });
  await dorme(opcoes.esperaInicial || 2500);
  const foto = async (arquivo) => { const r = await cdp('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(arquivo, Buffer.from(r.data, 'base64')); };
  const erros = () => eventos.filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error'))
    .map((e) => e.method === 'Runtime.exceptionThrown' ? 'EXCECAO: ' + String(((e.params.exceptionDetails.exception || {}).description) || e.params.exceptionDetails.text).split('\n')[0] + ' @' + String(e.params.exceptionDetails.url || '').split('/').pop() + ':' + e.params.exceptionDetails.lineNumber
      : e.method === 'Log.entryAdded' ? 'LOG: ' + e.params.entry.text.slice(0, 180) + ' ' + String(e.params.entry.url || '').split('/').pop()
        : 'CONSOLE: ' + e.params.args.map((a) => a.value || a.description || '').join(' ').slice(0, 200));
  const fechar = async () => { try { ws.close(); } catch (e) { } chrome.kill(); srv.close(); await dorme(400); try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (e) { } };
  return { avaliar, cdp, foto, dorme, erros, dialogos, fechar, porta: srv.address().port };
}

/* Espera a capa de carregamento descer. */
export async function esperarCapa(nav, max = 20000) {
  const ini = Date.now(); await dorme(300);
  while (Date.now() - ini < max) {
    const aberta = await nav.avaliar('(function(){var o=document.getElementById("execLoadingOverlay");if(!o)return false;var cs=getComputedStyle(o);return cs.display!=="none"&&cs.visibility!=="hidden"&&Number(cs.opacity)>0.01;})()');
    if (aberta === false) return Date.now() - ini;
    await dorme(200);
  }
  return -1;
}
