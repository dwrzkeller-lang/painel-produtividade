/**
 * Backup completo do Firestore do Painel de Produtividade → arquivo JSON.
 * ---------------------------------------------------------------------------
 * Lê TODAS as coleções/subcoleções relevantes do projeto e grava um único
 * arquivo JSON com timestamp. Feito para rodar no GitHub Actions (1x/dia), que
 * commita o resultado no repositório: backup FORA do Google, que sobrevive
 * caso a conta/projeto Firebase caia.
 *
 * Credencial: espera a variável de ambiente FIREBASE_SERVICE_ACCOUNT com o JSON
 * da chave de service account do projeto (nunca commitar essa chave).
 *
 * Uso local (opcional):
 *   FIREBASE_SERVICE_ACCOUNT="$(cat chave.json)" node scripts/backup-firestore.mjs
 *
 * Estrutura de dados coberta (ver firestore.rules):
 *   users/{uid}
 *   painel_produtividade/base/projects/{id}
 *       + subcoleções: history/{mês}, imports/{mês}, media/{doc}
 *   painel_produtividade/meta
 *   painel_produtividade/{outros docs raiz}
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = 'painel_produtividade';
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'backups-firestore');

function loadCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.error('ERRO: variável FIREBASE_SERVICE_ACCOUNT não definida.');
    process.exit(1);
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('ERRO: FIREBASE_SERVICE_ACCOUNT não é um JSON válido:', e.message);
    process.exit(1);
  }
}

/** Serializa um doc, convertendo Timestamps do Firestore em ISO string. */
function serialize(value) {
  if (value === null || typeof value !== 'object') return value;
  if (typeof value.toDate === 'function') return { __ts__: value.toDate().toISOString() };
  if (Array.isArray(value)) return value.map(serialize);
  const out = {};
  for (const k of Object.keys(value)) out[k] = serialize(value[k]);
  return out;
}

/** Lê todos os docs de uma coleção → { id: data }. */
async function dumpCollection(colRef) {
  const snap = await colRef.get();
  const out = {};
  snap.forEach((d) => { out[d.id] = serialize(d.data()); });
  return out;
}

async function main() {
  const cred = loadCredential();

  /* Mostra de qual projeto é a chave (o project_id não é segredo; a chave
     privada nunca é impressa). PP_PROJETO_ESPERADO confere se é o projeto certo. */
  console.log(`Credencial recebida para o projeto: ${cred.project_id}`);
  const esperado = process.env.PP_PROJETO_ESPERADO;
  if (esperado && cred.project_id !== esperado) {
    console.error(`ERRO: a chave é do projeto "${cred.project_id}", não de "${esperado}".`);
    process.exit(1);
  }

  initializeApp({ credential: cert(cred), projectId: cred.project_id });
  const db = getFirestore();

  const backup = {
    __meta__: {
      generatedAt: new Date().toISOString(),
      projectId: cred.project_id,
      root: ROOT,
      schemaVersion: 1
    },
    users: {},
    root: {},        // docs diretos sob painel_produtividade (ex.: meta)
    projects: {}     // base/projects/{id} + subcoleções
  };

  // 1) users
  console.log('Lendo coleção users…');
  backup.users = await dumpCollection(db.collection('users'));

  // 2) docs raiz do ROOT (meta e quaisquer outros): NÃO recursivo aqui,
  //    projects tem tratamento próprio abaixo.
  console.log('Lendo documentos raiz…');
  const rootDocs = await db.collection(ROOT).listDocuments();
  for (const docRef of rootDocs) {
    const snap = await docRef.get();
    if (snap.exists) backup.root[docRef.id] = serialize(snap.data());
  }

  // 3) projects + subcoleções (history, imports, media)
  console.log('Lendo projetos e subcoleções…');
  const projectsCol = db.collection(ROOT).doc('base').collection('projects');
  const projectDocs = await projectsCol.listDocuments();
  for (const projRef of projectDocs) {
    const snap = await projRef.get();
    const proj = {
      data: snap.exists ? serialize(snap.data()) : null,
      history: {},
      imports: {},
      media: {}
    };
    proj.history = await dumpCollection(projRef.collection('history'));
    proj.imports = await dumpCollection(projRef.collection('imports'));
    proj.media = await dumpCollection(projRef.collection('media'));  // inclui fotos (base64)
    backup.projects[projRef.id] = proj;
    const nHist = Object.keys(proj.history).length;
    const nMedia = Object.keys(proj.media).length;
    console.log(`  • ${projRef.id}: history=${nHist}, imports=${Object.keys(proj.imports).length}, media=${nMedia}`);
  }

  // Grava o arquivo com timestamp
  mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const outPath = join(OUT_DIR, `firestore-backup-${stamp}.json`);
  const json = JSON.stringify(backup, null, 0);
  writeFileSync(outPath, json, 'utf8');

  // Também mantém um "latest" para fácil inspeção/restauração
  const latestPath = join(OUT_DIR, 'firestore-backup-latest.json');
  writeFileSync(latestPath, json, 'utf8');

  const mb = (Buffer.byteLength(json, 'utf8') / 1024 / 1024).toFixed(2);
  console.log(`\n✔ Backup gerado: ${outPath}`);
  console.log(`  Projetos: ${Object.keys(backup.projects).length} | Usuários: ${Object.keys(backup.users).length} | Tamanho: ${mb} MB`);
}

main().catch((e) => { console.error('Falha no backup:', e); process.exit(1); });
