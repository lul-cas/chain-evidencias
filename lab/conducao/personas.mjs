// Quem atuou nas instâncias do laboratório, pelas linhas do tempo do Chain. Grava lab/evidencias/personas.json.
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { admin } from '../cadastro/verificar.mjs';

const EVIDENCIA = new URL('../evidencias/personas.json', import.meta.url).pathname;
const PREFIXO = 'persona-';
const QUEM_MODELA = 'ana'; // Ela age nos modelos, e não aparece nas linhas do tempo.

const semPrefixo = (nome) => nome.slice(PREFIXO.length);
const persona = (nome) => nome?.startsWith(PREFIXO);

export function quemAtuou(instancias, bots) {
  const atuaram = new Set();
  const canais = {};
  for (const { definitionName, timeline } of instancias) {
    if (definitionName.startsWith('PAD')) continue;
    for (const { actor, channel } of timeline) {
      if (channel) canais[channel] = (canais[channel] ?? 0) + 1;
      if (persona(actor?.username)) atuaram.add(semPrefixo(actor.username));
    }
  }
  const semAtuar = bots.filter(persona).map(semPrefixo).filter((nome) => !atuaram.has(nome) && nome !== QUEM_MODELA);
  return { atuaram: [...atuaram].sort(), modelou: QUEM_MODELA, semAtuar: semAtuar.sort(), canais };
}

async function lerInstancias(api) {
  const vistas = new Map();
  const ler = async (id) => {
    if (vistas.has(id)) return;
    const instancia = await api.get(`/api/instances/${id}`);
    vistas.set(id, instancia);
    for (const filha of instancia.children) await ler(filha.id);
  };
  for (const { id } of await api.get('/api/instances?scope=visible')) await ler(id);
  return [...vistas.values()];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const api = await admin();
  const bots = (await api.get('/api/admin/bots')).map(({ name }) => name);
  writeFileSync(EVIDENCIA, `${JSON.stringify(quemAtuou(await lerInstancias(api), bots), null, 2)}\n`);
  process.exit(0);
}
