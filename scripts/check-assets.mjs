#!/usr/bin/env node
// Valida que todo <link href> e <script src> LOCAL do painel.html aponta para
// um arquivo existente, e também os arquivos que o painel carrega sozinho
// (os dados fictícios da demonstração). Uso: npm run check
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arquivos = ['painel.html'].map((f) => resolve(raiz, f));
const carregadosPeloCodigo = ['./assets/demo/dados-ficticios.js'];

// Captura src= de <script> e href= de <link>
const padrao = /<(?:script[^>]*\ssrc|link[^>]*\shref)\s*=\s*["']([^"']+)["']/gi;

const faltando = [];
let total = 0;

for (const arquivo of arquivos) {
  const html = readFileSync(arquivo, 'utf8');
  for (const m of html.matchAll(padrao)) {
    const ref = m[1];
    // Ignora URLs absolutas (CDNs) e data:
    if (/^(https?:)?\/\//i.test(ref) || ref.startsWith('data:')) continue;
    total++;
    const caminho = resolve(raiz, ref.replace(/^\.\//, '').split(/[?#]/)[0]);
    if (!existsSync(caminho)) faltando.push(ref);
  }
}

for (const ref of carregadosPeloCodigo) {
  total++;
  if (!existsSync(resolve(raiz, ref.replace(/^\.\//, '')))) faltando.push(ref);
}

if (faltando.length) {
  console.error(`ERRO: ${faltando.length} referencia(s) sem arquivo:`);
  for (const f of faltando) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(`OK: ${total} referencia(s) local(is) verificada(s).`);
