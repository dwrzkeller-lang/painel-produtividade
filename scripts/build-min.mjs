#!/usr/bin/env node
/**
 * BUILD DE PRODUÇÃO · Painel de Produtividade
 * ---------------------------------------------------------------------------
 * Gera a pasta `dist/` que é o que vai ao ar (firebase.json aponta public:"dist").
 * O código-fonte legível continua na raiz do repo; só o dist/ é minificado.
 *
 * ESTRATÉGIA (opção A, segura): cada JS é minificado SEPARADAMENTE, mantendo o
 * mesmo caminho e nome. Minificar por arquivo faz o terser tratar todo nome de
 * escopo de topo como "possivelmente usado de fora" e PRESERVÁ-LO: essencial
 * aqui, porque o painel usa o padrão "última definição vence": um arquivo
 * redefine por nome (loadProjectState = ..., renderAll = ...) funções globais
 * declaradas em outro. Bundlar/concatenar quebraria isso; por arquivo, não.
 *
 * NÃO minificamos o HTML (é o ponto de entrada, e o ganho é pequeno): apenas
 * copiamos. CSS é minificado. Tudo o mais (imagens, etc.) é copiado como está.
 *
 * Uso: npm run build   (rode antes de `firebase deploy --only hosting`)
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, resolve, join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { minify } from 'terser';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(raiz, 'dist');

/* O que NÃO deve ir para o dist (espelha o ignore do firebase.json + fontes de build). */
const IGNORAR = new Set([
  'dist', 'node_modules', '.git', 'scripts', 'backups',
  'firebase.json', 'firestore.rules', '.firebaserc', '.gitignore', '.gitattributes',
  'package.json', 'package-lock.json', 'README.md', 'ABRIR-DEMONSTRACAO.bat',
]);
const IGNORAR_EXT = new Set(['.xlsx', '.xls', '.bak', '.log']);

/* Config conservadora do terser. mangle:true é SEGURO por arquivo (só renomeia
   locais; nomes de topo são preservados): verificado com teste de cadeia. */
const TERSER_OPTS = {
  compress: { passes: 1 },
  mangle: true,
  format: { comments: false },
};

let jsCount = 0, cssCount = 0, copyCount = 0, savedBytes = 0;

async function processarArquivo(abs) {
  const rel = relative(raiz, abs);
  const destino = join(dist, rel);
  mkdirSync(dirname(destino), { recursive: true });
  const ext = extname(abs).toLowerCase();

  if (ext === '.js') {
    const src = readFileSync(abs, 'utf8');
    const out = await minify(src, TERSER_OPTS);
    if (out.error) throw new Error(`terser falhou em ${rel}: ${out.error}`);
    writeFileSync(destino, out.code, 'utf8');
    savedBytes += src.length - out.code.length;
    jsCount++;
  } else if (ext === '.css') {
    /* CSS: minificação simples e segura (remove comentários e espaço redundante).
       Não usamos um minificador CSS pesado para não arriscar seletores :has()/zoom. */
    const src = readFileSync(abs, 'utf8');
    const out = src
      .replace(/\/\*[\s\S]*?\*\//g, '')      // comentários
      .replace(/\s+/g, ' ')                    // colapsa espaço
      .replace(/\s*([{}:;,>])\s*/g, '$1')     // espaço ao redor de tokens
      .replace(/;}/g, '}')
      .trim();
    writeFileSync(destino, out, 'utf8');
    savedBytes += src.length - out.length;
    cssCount++;
  } else {
    cpSync(abs, destino);
    copyCount++;
  }
}

function coletar(dir, acc) {
  for (const nome of readdirSync(dir)) {
    if (IGNORAR.has(nome)) continue;
    if (nome.startsWith('.') && dir === raiz) continue; // dotfiles na raiz
    const abs = join(dir, nome);
    const st = statSync(abs);
    if (st.isDirectory()) coletar(abs, acc);
    else if (!IGNORAR_EXT.has(extname(nome).toLowerCase())) acc.push(abs);
  }
  return acc;
}

async function main() {
  if (existsSync(dist)) rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });

  const arquivos = coletar(raiz, []);
  for (const abs of arquivos) {
    try { await processarArquivo(abs); }
    catch (e) { console.error('ERRO:', e.message); process.exit(1); }
  }

  console.log('=== BUILD dist/ ===');
  console.log(`  JS minificados : ${jsCount}`);
  console.log(`  CSS minificados: ${cssCount}`);
  console.log(`  copiados       : ${copyCount}`);
  console.log(`  economia       : ${(savedBytes / 1024).toFixed(0)} KB`);
  console.log('  >> deploy com: firebase deploy --only hosting');
}

main();
