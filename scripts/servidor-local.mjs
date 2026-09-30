#!/usr/bin/env node
/* Servidor local da demonstração: npm run demo  (porta: npm run demo -- 8090)
   Abre o Painel de Produtividade em http://localhost:8080. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.argv[2]) || 8080;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8' };

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || !p) p = '/painel.html';
  const arq = path.join(RAIZ, p);
  if (!arq.startsWith(RAIZ) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arq).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(arq).pipe(res);
}).listen(PORTA, '127.0.0.1', () => {
  const url = 'http://localhost:' + PORTA + '/';
  console.log('\n  Painel de Produtividade: demonstração\n  No ar em ' + url + '  (Ctrl+C para parar)\n');
  const abrir = process.platform === 'win32' ? 'start "" "' + url + '"' : process.platform === 'darwin' ? 'open ' + url : 'xdg-open ' + url;
  exec(abrir, () => { });
});
