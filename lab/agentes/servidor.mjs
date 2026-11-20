// O servidor MCP de Ana, por stdio (protocolo.md §2): é tudo o que ela enxerga. Fala com a API do Chain com o token dela,
// e registra cada chamada, para a evidência de R5.
import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';
import { Api } from '../cadastro/api.mjs';
import { acomodar, aplicar, semLayout } from './ajuste.mjs';

const COLECOES = ['workflows', 'forms', 'automations'];
const colecao = { type: 'string', enum: COLECOES, description: 'workflows, forms ou automations' };
const id = { type: 'string', description: 'O id do processo, formulário ou automação' };

const FERRAMENTAS = [
  {
    name: 'ler',
    description: 'Lê um caminho da API do Chain, como /api/workflows ou /api/forms/{id}. Veja o guia.',
    inputSchema: { type: 'object', properties: { caminho: { type: 'string' } }, required: ['caminho'] },
  },
  {
    name: 'criar',
    description: 'Cria um processo, formulário ou automação vazio, e devolve o id.',
    inputSchema: { type: 'object', properties: { colecao, nome: { type: 'string' }, descricao: { type: 'string' } }, required: ['colecao', 'nome'] },
  },
  {
    name: 'ajustar_rascunho',
    description: 'Aplica operações JSON Patch (add, remove, replace) ao rascunho e o salva. Os caminhos seguem o documento que `ler` mostra.',
    inputSchema: {
      type: 'object',
      properties: {
        colecao,
        id,
        operacoes: {
          type: 'array',
          items: { type: 'object', properties: { op: { type: 'string' }, path: { type: 'string' }, value: {} }, required: ['op', 'path'] },
        },
      },
      required: ['colecao', 'id', 'operacoes'],
    },
  },
  {
    name: 'salvar_rascunho',
    description: 'Troca o rascunho inteiro pelo documento dado.',
    inputSchema: { type: 'object', properties: { colecao, id, documento: { type: 'object' } }, required: ['colecao', 'id', 'documento'] },
  },
  {
    name: 'validar',
    description: 'Roda as regras de publicação sobre o rascunho, sem publicar.',
    inputSchema: { type: 'object', properties: { colecao, id }, required: ['colecao', 'id'] },
  },
  {
    name: 'publicar',
    description: 'Publica o rascunho como uma nova versão.',
    inputSchema: { type: 'object', properties: { colecao, id }, required: ['colecao', 'id'] },
  },
  {
    name: 'pedir_ao_admin',
    description: 'Registra um pedido do que só um admin pode fazer, como criar um grupo, um destino ou uma credencial. Depois de pedir, encerre e diga o que falta.',
    inputSchema: { type: 'object', properties: { pedido: { type: 'string' } }, required: ['pedido'] },
  },
];

const recurso = (argumentos) => {
  if (!COLECOES.includes(argumentos.colecao)) throw new Error(`coleção desconhecida: ${argumentos.colecao}`);
  return `/api/${argumentos.colecao}/${encodeURIComponent(argumentos.id)}`;
};

const texto = (valor) => (typeof valor === 'string' ? valor : JSON.stringify(valor));

function salvar(api, argumentos, documento) {
  const final = argumentos.colecao === 'workflows' ? acomodar(documento) : documento;
  const caminho = recurso(argumentos);
  return api.comVersao('PUT', caminho, `${caminho}/draft`, { document: final });
}

function acoes({ api, pedir }) {
  return {
    async ler({ caminho }) {
      if (typeof caminho !== 'string' || !caminho.startsWith('/api/') || caminho.includes('..')) throw new Error('o caminho precisa começar com /api/');
      return semLayout(await api.get(caminho));
    },
    async criar({ colecao: nome, nome: titulo, descricao }) {
      if (!COLECOES.includes(nome)) throw new Error(`coleção desconhecida: ${nome}`);
      const { id: novo } = await api.post(`/api/${nome}`, descricao ? { name: titulo, description: descricao } : { name: titulo });
      return { id: novo };
    },
    async ajustar_rascunho(argumentos) {
      const { draft } = await api.get(recurso(argumentos));
      await salvar(api, argumentos, aplicar(draft, argumentos.operacoes));
      return 'Rascunho salvo.';
    },
    async salvar_rascunho(argumentos) {
      await salvar(api, argumentos, argumentos.documento);
      return 'Rascunho salvo.';
    },
    validar: (argumentos) => api.post(`${recurso(argumentos)}/validate`),
    async publicar(argumentos) {
      const caminho = recurso(argumentos);
      return api.comVersao('POST', caminho, `${caminho}/publish`);
    },
    async pedir_ao_admin({ pedido }) {
      pedir(pedido);
      return 'Pedido registrado. Encerre e diga o que falta: você será avisada quando estiver pronto.';
    },
  };
}

export function criarServidor({ api, registrar, pedir }) {
  const ferramentas = acoes({ api, pedir });

  async function chamar({ name, arguments: argumentos = {} }) {
    const acao = ferramentas[name];
    let resultado;
    let erro = false;
    try {
      if (!acao) throw new Error(`ferramenta desconhecida: ${name}`);
      resultado = { content: [{ type: 'text', text: texto(await acao(argumentos)) }] };
    } catch (falha) {
      erro = true;
      const corpo = falha.corpo === undefined ? '' : ` ${texto(falha.corpo)}`;
      resultado = { content: [{ type: 'text', text: `${falha.message}${corpo}` }], isError: true };
    }
    registrar({ quando: new Date().toISOString(), ferramenta: name, argumentos, erro });
    return resultado;
  }

  return async function tratar({ id: pedido, method, params }) {
    const responder = (result) => ({ jsonrpc: '2.0', id: pedido, result });
    if (method === 'initialize') {
      return responder({ protocolVersion: params?.protocolVersion ?? '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'chain', version: '1' } });
    }
    if (method === 'tools/list') return responder({ tools: FERRAMENTAS });
    if (method === 'tools/call') return responder(await chamar(params));
    if (method === 'ping') return responder({});
    if (pedido === undefined) return null;
    return { jsonrpc: '2.0', id: pedido, error: { code: -32601, message: `método desconhecido: ${method}` } };
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { CHAIN_API, CHAIN_TOKEN, AGENTE_PASTA } = process.env;
  const tratar = criarServidor({
    api: new Api({ base: CHAIN_API, token: CHAIN_TOKEN }),
    registrar: (registro) => appendFileSync(join(AGENTE_PASTA, 'chamadas.jsonl'), `${JSON.stringify(registro)}\n`),
    pedir: (pedido) => appendFileSync(join(AGENTE_PASTA, 'pedidos.jsonl'), `${JSON.stringify({ quando: new Date().toISOString(), pedido })}\n`),
  });
  for await (const linha of createInterface({ input: process.stdin })) {
    if (!linha.trim()) continue;
    const resposta = await tratar(JSON.parse(linha));
    if (resposta) process.stdout.write(`${JSON.stringify(resposta)}\n`);
  }
}
