/* FOTO DOS NÚMEROS DO ACOMPANHAMENTO GERENCIAL · `npm run foto-gerencial`
   ---------------------------------------------------------------------------
   Guarda os números que o gerencial mostra com os dados fictícios e acusa
   qualquer diferença depois de uma mudança de código. Usa o arquivo de contas
   de verdade (assets/gerencial/01-calculo.js) e os dados que o painel abre
   (assets/demo/dados-ficticios.js); nada é copiado para cá.

   USO:
     node scripts/foto-gerencial.mjs --salvar   grava a foto de referência
     node scripts/foto-gerencial.mjs            compara com a referência

   Depois de gerar dados fictícios novos (npm run gerar-dados), os números
   mudam de propósito: confira a tela e grave a foto de novo com --salvar. */
import fs from 'node:fs';

const REF = 'scripts/foto-gerencial.ref.json';
const salvar = process.argv.includes('--salvar');

const escopo = {};
new Function('window', fs.readFileSync('assets/gerencial/01-calculo.js', 'utf8'))(escopo);
const G = escopo.PPGerencial;

const sem = {};
new Function('window', fs.readFileSync('assets/demo/dados-ficticios.js', 'utf8'))(sem);
const docs = (sem.PP_DEMO_SEMENTE || {}).documentos || {};

const CONTRATOS = [
  ['contrato-alfa', 'Contrato Alfa'], ['contrato-beta', 'Contrato Beta'],
  ['contrato-gama', 'Contrato Gama'], ['contrato-delta', 'Contrato Delta']
];
const contratos = CONTRATOS.map(([id, nome]) => {
  const doc = docs[Object.keys(docs).find((k) => k.endsWith('/projects/' + id))] || {};
  return G.montarContrato({ id, nome, config: doc.config || {}, historico: doc.historico || [] });
});
const total = G.consolidar(contratos);

const r2 = (v) => Math.round(Number(v) * 100) / 100;
const foto = {};
[...contratos, total].forEach((c) => {
  const mes = c.fechados - 1;
  ['mes', 'ytd', 'ano'].forEach((visao) => {
    const r = G.recorte(c, visao, mes);
    ['receitaBruta', 'receitaLiquida', 'custosDiretos', 'margemContribuicao', 'indiretas', 'ebitda', 'margemEbitda'].forEach((linha) => {
      foto[c.id + '.' + visao + '.real.' + linha] = r2(r.real[linha]);
      foto[c.id + '.' + visao + '.orcamento.' + linha] = r2(r.budget[linha]);
      foto[c.id + '.' + visao + '.forecast.' + linha] = r2(r.forecast[linha]);
    });
    if (c.id !== 'total') foto[c.id + '.' + visao + '.situacao'] = G.situacaoContrato(r);
  });
  if (c.id !== 'total') {
    const p = G.pendencias(c);
    foto[c.id + '.desviosForaDaPolitica'] = p.length;
    foto[c.id + '.semJustificativa'] = p.filter((x) => !x.justificativa).length;
  }
});

if (salvar) {
  fs.writeFileSync(REF, JSON.stringify(foto, null, 2) + '\n');
  console.log('Foto do gerencial gravada: ' + Object.keys(foto).length + ' valores em ' + REF);
  process.exit(0);
}
if (!fs.existsSync(REF)) {
  console.error('Não há foto de referência. Rode primeiro: node scripts/foto-gerencial.mjs --salvar');
  process.exit(1);
}
const ref = JSON.parse(fs.readFileSync(REF, 'utf8'));
const chaves = new Set([...Object.keys(ref), ...Object.keys(foto)]);
const dif = [...chaves].filter((k) => JSON.stringify(ref[k]) !== JSON.stringify(foto[k]));
if (dif.length) {
  console.error('ATENÇÃO: ' + dif.length + ' valor(es) do gerencial mudaram:');
  dif.slice(0, 40).forEach((k) => console.error('  ' + k + ': antes ' + JSON.stringify(ref[k]) + ', agora ' + JSON.stringify(foto[k])));
  process.exit(1);
}
console.log('Foto do gerencial conferida: os ' + chaves.size + ' valores estão IDÊNTICOS aos de antes.');
