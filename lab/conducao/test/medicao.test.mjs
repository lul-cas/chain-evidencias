// Q2, como alteracoes-previstas.md §2 conta.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compararFormularios, compararProcessos, medirMudanca, totalDoProcesso } from '../medicao.mjs';

const base = () => ({
  lanes: [{ id: 'l', title: 'L', group: { kind: 'requesters' }, layout: { x: 1 } }],
  nodes: [
    { id: 'a', type: 'task', label: 'A', laneId: 'l', layout: { x: 1 }, form: { formId: 'f', version: 1 } },
    { id: 'b', type: 'end', label: 'B', laneId: 'l' },
  ],
  flows: [{ id: 'f1', source: 'a', target: 'b', layout: { mode: 'HV' } }],
});

test('nada muda quando só o layout e as versões fixadas mudam', () => {
  const depois = base();
  depois.lanes[0].layout = { x: 9 };
  depois.nodes[0].layout = { x: 9 };
  depois.nodes[0].form.version = 7;
  depois.flows[0].layout = { mode: 'VH' };
  assert.equal(totalDoProcesso(compararProcessos(base(), depois)), 0);
});

test('um nó criado, alterado e removido', () => {
  const depois = base();
  depois.nodes[0].label = 'Outro';
  depois.nodes[1] = { id: 'c', type: 'end', label: 'C', laneId: 'l' };
  const { nos } = compararProcessos(base(), depois);
  assert.deepEqual(nos, { criados: 1, removidos: 1, alterados: 1 });
});

test('um fluxo é identificado pela origem e pelo ramo, não pelo id', () => {
  const recriado = base();
  recriado.flows[0].id = 'outro';
  assert.equal(totalDoProcesso(compararProcessos(base(), recriado)), 0);

  const redirecionado = base();
  redirecionado.flows[0].target = 'c';
  assert.deepEqual(compararProcessos(base(), redirecionado).fluxos, { criados: 0, removidos: 0, alterados: 1 });
});

test('os dois ramos de um gateway são fluxos diferentes', () => {
  const antes = { ...base(), flows: [{ id: '1', source: 'g', target: 'a', branch: 'true' }] };
  const depois = { ...base(), flows: [{ id: '1', source: 'g', target: 'a', branch: 'true' }, { id: '2', source: 'g', target: 'b', branch: 'false' }] };
  assert.deepEqual(compararProcessos(antes, depois).fluxos, { criados: 1, removidos: 0, alterados: 0 });
});

test('uma raia nova conta', () => {
  const depois = base();
  depois.lanes.push({ id: 'n', title: 'N', group: { kind: 'group', groupId: 'g' } });
  assert.deepEqual(compararProcessos(base(), depois).raias, { criados: 1, removidos: 0, alterados: 0 });
});

test('campos de formulário contam em qualquer nível', () => {
  const antes = { components: [{ type: 'group', key: 'g', label: 'G', components: [{ type: 'text', key: 'a', label: 'A' }] }] };
  const depois = { components: [{ type: 'group', key: 'g', label: 'G', components: [{ type: 'text', key: 'a', label: 'Outro' }, { type: 'text', key: 'b', label: 'B' }] }, { type: 'text', key: 'c', label: 'C' }] };
  assert.deepEqual(compararFormularios(antes, depois), { criados: 2, removidos: 0, alterados: 1 });
});

function apiDe(documentos) {
  return {
    get: async (caminho) => {
      const achou = /^\/api\/(workflows|forms|automations)\/(\w+)\/versions\/(\d+)$/.exec(caminho);
      return { document: documentos[`${achou[1]}/${achou[2]}/${achou[3]}`] };
    },
  };
}

test('a mudança soma processos, formulários e automações, e republicar conta zero', async () => {
  const novoProcesso = { lanes: [{ id: 'l' }], nodes: [{ id: 'a' }, { id: 'b' }], flows: [{ id: 'f', source: 'a', target: 'b' }] };
  const alterado = base();
  alterado.nodes[0].label = 'Mudou';
  const documentos = {
    'workflows/p/1': base(), 'workflows/p/2': alterado,
    'workflows/r/1': base(), 'workflows/r/2': base(),
    'workflows/n/1': novoProcesso,
    'forms/f/1': { components: [] }, 'forms/f/2': { components: [{ type: 'text', key: 'x', label: 'X' }] },
    'forms/g/1': { components: [{ type: 'text', key: 'y', label: 'Y' }, { type: 'text', key: 'z', label: 'Z' }] },
  };
  const antes = { workflows: { P: { id: 'p', versao: 1 }, R: { id: 'r', versao: 1 } }, forms: { F: { id: 'f', versao: 1 } }, automations: {} };
  const depois = {
    workflows: { P: { id: 'p', versao: 2 }, R: { id: 'r', versao: 2 }, N: { id: 'n', versao: 1 } },
    forms: { F: { id: 'f', versao: 2 }, G: { id: 'g', versao: 1 } },
    automations: { A: { id: 'a', versao: 1 } },
  };
  const medida = await medirMudanca(apiDe(documentos), antes, depois);
  assert.equal(medida.elementos, 1 + 0 + 4 + 1 + 2 + 1);
  assert.deepEqual(medida.versoes, ['P v1→v2', 'R v1→v2', 'N v1', 'F v1→v2', 'G v1', 'A v1']);
  assert.deepEqual(medida.republicados, ['R']);
});

test('sem nada novo, a mudança é zero', async () => {
  const foto = { workflows: { P: { id: 'p', versao: 1 } }, forms: {}, automations: {} };
  const medida = await medirMudanca(apiDe({}), foto, foto);
  assert.equal(medida.elementos, 0);
  assert.deepEqual(medida.versoes, []);
});
