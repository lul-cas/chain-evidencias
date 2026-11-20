// Uma execução de Ana (protocolo.md §2 e §3): uma sessão nova de `claude -p`, sem ferramentas embutidas nem configurações, em uma
// pasta vazia fora do repositório. Ela só enxerga servidor.mjs, com o token dela.
// Uso: node lab/agentes/rodar.mjs NOR-02 [--continuar "mensagem"]
import { spawn } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const RAIZ = new URL('../', import.meta.url).pathname;
const NORMATIVAS = new URL('../../specs/experiments/laboratorio/normativas/', import.meta.url).pathname;
const EVIDENCIAS = process.env.CHAIN_LAB_EVIDENCIAS ?? join(RAIZ, 'evidencias');
const SEGREDOS = join(RAIZ, '.segredos');
const API = process.env.CHAIN_LAB_API ?? 'http://localhost:56080';
const MODELO = process.env.CHAIN_LAB_MODELO ?? 'claude-sonnet-5-5';
const LIMITE = process.env.CHAIN_LAB_LIMITE_USD ?? '5';
const FERRAMENTAS = ['ler', 'criar', 'ajustar_rascunho', 'salvar_rascunho', 'validar', 'publicar', 'pedir_ao_admin'].map((nome) => `mcp__chain__${nome}`);

export function textoDaNormativa(id, pasta = NORMATIVAS) {
  const prefixo = id.toLowerCase();
  const arquivo = readdirSync(pasta).find((nome) => nome.startsWith(`${prefixo}-`));
  if (!arquivo) throw new Error(`não achei a normativa ${id}`);
  return readFileSync(join(pasta, arquivo), 'utf8');
}

export function pedidoInicial(normativa) {
  return `Saiu esta normativa. Aplique-a aos processos do banco.\n\n${normativa}`;
}

export function promptDeSistema(pasta = new URL('./', import.meta.url).pathname) {
  return `${readFileSync(join(pasta, 'persona-ana.md'), 'utf8')}\n\n${readFileSync(join(pasta, 'guia-do-modelador.md'), 'utf8')}`;
}

/** Os argumentos de `claude -p`. Tudo o que isola Ana está aqui, e os testes conferem. */
export function argumentos({ mensagem, sistema, mcp, sessao, modelo = MODELO, limite = LIMITE }) {
  return [
    '-p', mensagem,
    '--model', modelo,
    '--system-prompt', sistema,
    '--tools', '',
    '--mcp-config', mcp,
    '--strict-mcp-config',
    '--allowedTools', FERRAMENTAS.join(','),
    '--permission-mode', 'dontAsk',
    '--setting-sources', '',
    '--max-budget-usd', limite,
    '--output-format', 'stream-json',
    '--verbose',
    ...(sessao ? ['--resume', sessao] : []),
  ];
}

/** Lê o que a sessão fez. Falha se ela enxergou qualquer ferramenta além das de Ana: a execução não valeria. */
export function resumir(linhas) {
  const eventos = linhas.filter(Boolean).map((linha) => JSON.parse(linha));
  const inicio = eventos.find(({ type, subtype }) => type === 'system' && subtype === 'init');
  const fim = eventos.findLast(({ type }) => type === 'result');
  if (!inicio) throw new Error('a sessão não começou');
  const fora = inicio.tools.filter((ferramenta) => !FERRAMENTAS.includes(ferramenta));
  if (fora.length > 0) throw new Error(`a sessão enxergou outras ferramentas: ${fora.join(', ')}`);
  return {
    sessao: inicio.session_id,
    modelo: inicio.model,
    ferramentas: inicio.tools.length,
    turnos: fim?.num_turns,
    custoUsd: fim?.total_cost_usd,
    duracaoMs: fim?.duration_ms,
    fim: fim?.subtype,
    resposta: fim?.result,
  };
}

function proximaPasta(id) {
  const base = join(EVIDENCIAS, id);
  mkdirSync(base, { recursive: true });
  const numero = readdirSync(base).filter((nome) => nome.startsWith('execucao-')).length + 1;
  const pasta = join(base, `execucao-${numero}`);
  mkdirSync(pasta);
  return { pasta };
}

/** A sessão da última execução que terminou: uma pasta sem resumo não terminou. */
export function ultimaSessao(base) {
  const execucoes = readdirSync(base)
    .filter((nome) => nome.startsWith('execucao-') && existsSync(join(base, nome, 'resumo.json')))
    .sort((a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]));
  return JSON.parse(readFileSync(join(base, execucoes.at(-1), 'resumo.json'), 'utf8')).sessao;
}

export async function rodar(id, continuar) {
  const { token } = JSON.parse(readFileSync(join(SEGREDOS, 'bots.json'), 'utf8'))['persona-ana'];
  const sessao = continuar ? ultimaSessao(join(EVIDENCIAS, id)) : undefined;
  const { pasta } = proximaPasta(id);
  const vazia = join(tmpdir(), 'chain-lab-agentes', id);
  mkdirSync(vazia, { recursive: true });

  const mcp = join(SEGREDOS, `mcp-${process.pid}.json`);
  writeFileSync(mcp, JSON.stringify({
    mcpServers: {
      chain: {
        command: process.execPath,
        args: [join(RAIZ, 'agentes/servidor.mjs')],
        env: { CHAIN_API: API, CHAIN_TOKEN: token, AGENTE_PASTA: pasta },
      },
    },
  }), { mode: 0o600 });

  const mensagem = continuar ?? pedidoInicial(textoDaNormativa(id));
  writeFileSync(join(pasta, 'mensagem.md'), mensagem);
  const transcricao = join(pasta, 'transcricao.jsonl');
  const saida = createWriteStream(transcricao);
  try {
    await new Promise((resolver, rejeitar) => {
      const processo = spawn('claude', argumentos({ mensagem, sistema: promptDeSistema(), mcp, sessao }), { cwd: vazia, stdio: ['ignore', 'pipe', 'inherit'] });
      processo.stdout.pipe(saida);
      processo.on('error', rejeitar);
      processo.on('close', (codigo) => (codigo === 0 ? resolver() : rejeitar(new Error(`claude terminou com ${codigo}`))));
    });
  } finally {
    rmSync(mcp, { force: true });
  }
  await new Promise((resolver) => { saida.end(resolver); });

  const resumo = resumir(readFileSync(transcricao, 'utf8').split('\n'));
  writeFileSync(join(pasta, 'resumo.json'), JSON.stringify(resumo, null, 2));
  return { ...resumo, pasta, pedidos: existsSync(join(pasta, 'pedidos.jsonl')) ? readFileSync(join(pasta, 'pedidos.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l).pedido) : [] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [id, opcao, mensagem] = process.argv.slice(2);
  const resultado = await rodar(id, opcao === '--continuar' ? mensagem : undefined);
  console.log(JSON.stringify(resultado, null, 2));
}
