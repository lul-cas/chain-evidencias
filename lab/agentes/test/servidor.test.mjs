// O servidor MCP de Ana: JSON-RPC por stdio, e as ferramentas sobre a API do Chain.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { criarServidor } from '../servidor.mjs';

function apiFalsa(rascunho = { schemaVersion: 1, lanes: [], nodes: [], flows: [] }) {
  const chamadas = [];
  return {
    chamadas,
    get: async (caminho) => { chamadas.push(['GET', caminho]); return { id: '1', name: 'X', draft: rascunho }; },
    post: async (caminho, corpo) => { chamadas.push(['POST', caminho, corpo]); return { id: 'novo', valid: true, errors: [] }; },
    comVersao: async (metodo, recurso, caminho, corpo) => { chamadas.push([metodo, caminho, corpo]); return { versionNumber: 2 }; },
  };
}

function servidor(api = apiFalsa()) {
  const registros = [];
  const pedidos = [];
  return { api, registros, pedidos, tratar: criarServidor({ api, registrar: (r) => registros.push(r), pedir: (p) => pedidos.push(p) }) };
}

const chamar = (s, name, args) => s.tratar({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name, arguments: args } });

test('initialize responde a versão pedida e o nome', async () => {
  const resposta = await servidor().tratar({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } });
  assert.equal(resposta.id, 1);
  assert.equal(resposta.result.protocolVersion, '2025-06-18');
  assert.deepEqual(resposta.result.capabilities, { tools: {} });
});

test('uma notificação não tem resposta', async () => {
  assert.equal(await servidor().tratar({ jsonrpc: '2.0', method: 'notifications/initialized' }), null);
});

test('tools/list traz exatamente as ferramentas de protocolo.md §2', async () => {
  const resposta = await servidor().tratar({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  assert.deepEqual(resposta.result.tools.map(({ name }) => name), ['ler', 'criar', 'ajustar_rascunho', 'salvar_rascunho', 'validar', 'publicar', 'pedir_ao_admin']);
  for (const { inputSchema, description } of resposta.result.tools) {
    assert.equal(inputSchema.type, 'object');
    assert.ok(description);
  }
});

test('um método desconhecido é um erro de JSON-RPC', async () => {
  const resposta = await servidor().tratar({ jsonrpc: '2.0', id: 3, method: 'nada' });
  assert.equal(resposta.error.code, -32601);
});

test('ler só aceita caminhos da API, e tira o layout', async () => {
  const api = apiFalsa({ nodes: [{ id: 'a', layout: { x: 1 } }] });
  const s = servidor(api);
  const resposta = await chamar(s, 'ler', { caminho: '/api/workflows/1' });
  assert.ok(!resposta.result.content[0].text.includes('layout'));
  assert.deepEqual(api.chamadas[0], ['GET', '/api/workflows/1']);

  const fora = await chamar(s, 'ler', { caminho: 'http://outro/coisa' });
  assert.equal(fora.result.isError, true);
});

test('ajustar_rascunho aplica as operações sobre o rascunho e salva com a versão', async () => {
  const api = apiFalsa({ schemaVersion: 1, lanes: [], nodes: [{ id: 'a', label: 'A' }], flows: [] });
  const s = servidor(api);
  const resposta = await chamar(s, 'ajustar_rascunho', { colecao: 'workflows', id: '1', operacoes: [{ op: 'replace', path: '/nodes/0/label', value: 'B' }] });
  assert.equal(resposta.result.isError, undefined);
  const [metodo, caminho, corpo] = api.chamadas.at(-1);
  assert.equal(metodo, 'PUT');
  assert.equal(caminho, '/api/workflows/1/draft');
  assert.equal(corpo.document.nodes[0].label, 'B');
});

test('uma coleção desconhecida é recusada', async () => {
  const resposta = await chamar(servidor(), 'publicar', { colecao: 'admin/users', id: '1' });
  assert.equal(resposta.result.isError, true);
});

test('um erro da API volta como erro da ferramenta, com o corpo', async () => {
  const api = apiFalsa();
  api.comVersao = async () => { const erro = new Error('POST: 422'); erro.status = 422; erro.corpo = { errors: [{ code: 'WF005' }] }; throw erro; };
  const resposta = await chamar(servidor(api), 'publicar', { colecao: 'workflows', id: '1' });
  assert.equal(resposta.result.isError, true);
  assert.match(resposta.result.content[0].text, /WF005/);
});

test('criar, validar e publicar usam os caminhos do Chain', async () => {
  const api = apiFalsa();
  const s = servidor(api);
  await chamar(s, 'criar', { colecao: 'forms', nome: 'F' });
  await chamar(s, 'validar', { colecao: 'workflows', id: '1' });
  await chamar(s, 'publicar', { colecao: 'automations', id: '2' });
  assert.deepEqual(api.chamadas[0], ['POST', '/api/forms', { name: 'F' }]);
  assert.deepEqual(api.chamadas[1], ['POST', '/api/workflows/1/validate', undefined]);
  assert.deepEqual(api.chamadas[2], ['POST', '/api/automations/2/publish', undefined]);
});

test('pedir_ao_admin registra o pedido, sem chamar a API', async () => {
  const s = servidor();
  const resposta = await chamar(s, 'pedir_ao_admin', { pedido: 'Criar o grupo X' });
  assert.deepEqual(s.pedidos, ['Criar o grupo X']);
  assert.equal(s.api.chamadas.length, 0);
  assert.match(resposta.result.content[0].text, /registrado/i);
});

test('toda chamada de ferramenta fica registrada', async () => {
  const s = servidor();
  await chamar(s, 'ler', { caminho: '/api/forms' });
  assert.equal(s.registros.length, 1);
  assert.equal(s.registros[0].ferramenta, 'ler');
  assert.deepEqual(s.registros[0].argumentos, { caminho: '/api/forms' });
  assert.equal(s.registros[0].erro, false);
});
