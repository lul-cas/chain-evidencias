// Os passos do agente de desenvolvimento em cada mudança (protocolo.md §4).
// Uso: node lab/conducao/conduzir.mjs antes|depois|fechar NOR-01
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Api } from '../cadastro/api.mjs';
import { BASE, lerBots } from '../cadastro/cadastrar.mjs';
import { Pedido, admin, criarContexto, noMock, olharMock } from '../cadastro/verificar.mjs';
import { fotografar, medirMudanca } from './medicao.mjs';
import { ROTEIROS } from './roteiros.mjs';

const EVIDENCIAS = new URL('../evidencias/', import.meta.url).pathname;
const SEGREDOS = new URL('../.segredos/', import.meta.url).pathname;

const pasta = (id) => {
  const caminho = join(EVIDENCIAS, id);
  mkdirSync(caminho, { recursive: true });
  return caminho;
};
const lerJson = (arquivo) => JSON.parse(readFileSync(arquivo, 'utf8'));
const gravar = (arquivo, conteudo) => writeFileSync(arquivo, `${JSON.stringify(conteudo, null, 2)}\n`);

/** Os contêineres da stack: Q3 confere que são os mesmos do início. */
export function conteineres() {
  const saida = execFileSync('docker', ['compose', '-p', 'chain-lab', 'ps', '--format', '{{.Service}} {{.ID}}'], { encoding: 'utf8' });
  return Object.fromEntries(saida.trim().split('\n').map((linha) => linha.split(' ')));
}

async function contexto() {
  const api = await admin();
  const c = criarContexto(api);
  c.definicoes = lerJson(join(SEGREDOS, 'cadastro.json'));
  c.pedido = (id) => new Pedido(c, id);
  c.ines = () => new Api({ base: BASE, token: lerBots()['persona-ines'].token });
  return { api, c, mock: olharMock(async (caminho) => noMock('GET', caminho)) };
}

export async function antes(id) {
  const { api, c } = await contexto();
  const estado = { foto: await fotografar(api), conteineres: conteineres() };
  if (ROTEIROS[id]) estado.roteiro = await ROTEIROS[id].antes(c);
  gravar(join(pasta(id), 'estado.json'), estado);
  return estado.roteiro ?? 'Sem roteiro: a mudança não deve publicar nada.';
}

export async function depois(id) {
  const { c, mock } = await contexto();
  const { roteiro } = lerJson(join(pasta(id), 'estado.json'));
  return ROTEIROS[id].depois(c, roteiro, mock);
}

export async function fechar(id) {
  const { api, c, mock } = await contexto();
  const estado = lerJson(join(pasta(id), 'estado.json'));
  const finais = ROTEIROS[id] ? await ROTEIROS[id].fechar(c, estado.roteiro, mock) : [];
  const medida = await medirMudanca(api, estado.foto, await fotografar(api));
  const emAndamento = finais.map(({ definitionName, versionNumber, currentNodeId, status }) => ({ processo: definitionName, versao: versionNumber, fim: currentNodeId, status }));
  const resultado = { ...medida, emAndamento, mesmosConteineres: JSON.stringify(conteineres()) === JSON.stringify(estado.conteineres) };
  gravar(join(pasta(id), 'medidas.json'), resultado);
  return resultado;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [passo, id] = process.argv.slice(2);
  const acao = { antes, depois, fechar }[passo];
  if (!acao || !id) {
    console.error('Uso: node lab/conducao/conduzir.mjs antes|depois|fechar NOR-01');
    process.exit(1);
  }
  try {
    console.log(JSON.stringify(await acao(id), null, 2));
  } catch (erro) {
    console.error(`${passo} ${id}: ${erro.message}`);
    process.exit(1);
  }
  process.exit(0);
}
