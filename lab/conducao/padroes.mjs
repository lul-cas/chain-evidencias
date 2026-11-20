// R1: os 20 padrões de fluxo, por execução (protocolo.md §6). Cada um tem um processo mínimo, ou a tentativa que o Chain recusa.
// Uso: node lab/conducao/padroes.mjs
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pedido, admin, criarContexto } from '../cadastro/verificar.mjs';
import { condicao, valor } from '../cadastro/expressao.mjs';

const EVIDENCIAS = new URL('../evidencias/', import.meta.url).pathname;
const api = await admin();
const c = criarContexto(api);
const grupos = await api.get('/api/admin/groups');
const grupoAtendimento = grupos.find(({ name }) => name === 'Agência - Atendimento').id;

async function publicarFormulario(nome, components) {
  const existente = (await api.get('/api/forms')).find((form) => form.name === nome);
  const { id } = existente ?? await api.post('/api/forms', { name: nome });
  await api.comVersao('PUT', `/api/forms/${id}`, `/api/forms/${id}/draft`, { document: { schemaVersion: 1, components } });
  await api.comVersao('POST', `/api/forms/${id}`, `/api/forms/${id}/publish`);
  return id;
}

const formDados = await publicarFormulario('F-PAD-01 Dados do padrão', [
  { type: 'checkbox', key: 'a', label: 'A' },
  { type: 'checkbox', key: 'b', label: 'B' },
  { type: 'number', key: 'restantes', label: 'Restantes' },
]);
const formContagem = await publicarFormulario('F-PAD-02 Contagem', [{ type: 'computed', key: 'restantes', label: 'Restantes', expression: valor('restantes − 1') }]);

const RAIA = { id: 'l', title: 'Solicitantes', group: { kind: 'requesters' }, layout: { x: 40, y: 30, w: 1500, h: 300 } };
const inicio = () => ({ id: 'inicio', type: 'start', label: 'Início', laneId: 'l', form: { formId: formDados } });
const tarefa = (id, extra = {}) => ({ id, type: 'task', taskKind: 'human', label: id, laneId: 'l', ...extra });
const fim = (id = 'fim') => ({ id, type: 'end', label: id, laneId: 'l' });
const decisao = (id, texto) => ({ id, type: 'gateway', label: id, laneId: 'l', decisionMode: 'automatic', condition: condicao(texto) });
const pergunta = (id) => ({ id, type: 'gateway', label: id, laneId: 'l', decisionMode: 'human', question: `${id}?` });
const f = (origem, destino, ramo) => ({ id: `f_${origem}_${destino}_${ramo ?? 'x'}`, source: origem, target: destino, ...(ramo ? { branch: ramo } : {}) });

function comLayout(nos) {
  return nos.map((no, indice) => ({ ...no, layout: { x: 140 + (indice % 7) * 190, y: 60 + Math.floor(indice / 7) * 110, w: no.type === 'task' ? 140 : 70, h: 70 } }));
}

async function criar(nome) {
  const existente = (await api.get('/api/workflows')).find((processo) => processo.name === nome);
  return existente?.id ?? (await api.post('/api/workflows', { name: nome })).id;
}

/** Publica um processo mínimo, que Marina pode iniciar. */
async function publicar(nome, nodes, flows) {
  const id = await criar(nome);
  await api.comVersao('PUT', `/api/workflows/${id}`, `/api/workflows/${id}/draft`, { document: { schemaVersion: 1, lanes: [RAIA], nodes: comLayout(nodes), flows } });
  await api.comVersao('POST', `/api/workflows/${id}`, `/api/workflows/${id}/publish`);
  await api.comVersao('PUT', `/api/workflows/${id}`, `/api/workflows/${id}/grants`, [{ groupId: grupoAtendimento, capabilities: ['start'] }]);
  return id;
}

/** O que o Chain diz de um modelo que tenta expressar o padrão: as regras de publicação, ou a recusa ao salvar. */
async function tentar(nome, nodes, flows) {
  const id = await criar(nome);
  try {
    await api.comVersao('PUT', `/api/workflows/${id}`, `/api/workflows/${id}/draft`, { document: { schemaVersion: 1, lanes: [RAIA], nodes: comLayout(nodes), flows } });
  } catch (erro) {
    return [...new Set((erro.corpo?.errors ?? []).map(({ code }) => code))];
  }
  const { valid, errors } = await api.post(`/api/workflows/${id}/validate`);
  assert.equal(valid, false, `${nome} deveria ser recusado`);
  return [...new Set(errors.map(({ code }) => code))];
}

const abrir = async (definicao, dados = {}) => new Pedido(c, (await c.marina.comando('/api/instances', { definitionId: definicao, data: dados }, randomUUID())).id);
const tarefasCriadas = (instancia) => instancia.timeline.filter(({ type }) => type === 'task.created').map(({ details }) => details.nodeId);

const inicioEm = (destino) => f('inicio', destino);
const PARALELO = [[inicio(), tarefa('a'), tarefa('b'), tarefa('c'), fim()], [inicioEm('a'), f('a', 'b'), f('a', 'c'), f('b', 'fim'), f('c', 'fim')]];

// Suporte pelos critérios da iniciativa dos padrões (van der Aalst et al., 2003, p. 45; resultados.md §1, card #308):
// direto só com um construto da interface gráfica, sem contorno; combinar construtos, só pela API ou por código é ausente.
const PADROES = [
  ['01', 'Sequência', 'direto', async () => {
    const id = await publicar('PAD-01 Sequência', [inicio(), tarefa('a'), tarefa('b'), fim()], [inicioEm('a'), f('a', 'b'), f('b', 'fim')]);
    const pedido = await abrir(id);
    await pedido.completar(c.marina, 'a');
    await pedido.completar(c.marina, 'b');
    const final = await pedido.terminar('fim');
    assert.deepEqual(tarefasCriadas(final), ['a', 'b']);
    return 'Etapas em ordem, cada uma só abre depois da anterior.';
  }],
  ['02', 'Divisão paralela', 'ausente', async () => {
    const erros = await tentar('PAD-02 Divisão paralela', ...PARALELO);
    assert.ok(erros.includes('WF005'));
    return `Dois fluxos saindo de uma etapa são recusados (${erros.join(', ')}). O motor tem um só token.`;
  }],
  ['03', 'Sincronização', 'ausente', async () => {
    const id = await publicar('PAD-03 Junção sem espera', [inicio(), decisao('g', 'a = true'), tarefa('x'), tarefa('y'), tarefa('z'), fim()], [inicioEm('g'), f('g', 'x', 'true'), f('g', 'y', 'false'), f('x', 'z'), f('y', 'z'), f('z', 'fim')]);
    const pedido = await abrir(id, { a: true });
    await pedido.completar(c.marina, 'x');
    await pedido.completar(c.marina, 'z');
    await pedido.terminar('fim');
    return 'Sem divisão paralela não há o que sincronizar: um nó com duas entradas segue na primeira que chega, sem esperar a outra.';
  }],
  ['04', 'Escolha exclusiva', 'direto', async () => {
    const id = await publicar('PAD-04 Escolha exclusiva', [inicio(), decisao('g', 'a = true'), tarefa('x'), tarefa('y'), fim('fx'), fim('fy')], [inicioEm('g'), f('g', 'x', 'true'), f('g', 'y', 'false'), f('x', 'fx'), f('y', 'fy')]);
    const sim = await abrir(id, { a: true });
    await sim.completar(c.marina, 'x');
    await sim.terminar('fx');
    const nao = await abrir(id, {});
    await nao.completar(c.marina, 'y');
    await nao.terminar('fy');
    return 'Um gateway segue um só ramo, por condição ou decisão de uma pessoa.';
  }],
  ['05', 'Junção simples', 'direto', async () => {
    const id = await publicar('PAD-05 Junção simples', [inicio(), decisao('g', 'a = true'), tarefa('x'), tarefa('y'), tarefa('z'), fim()], [inicioEm('g'), f('g', 'x', 'true'), f('g', 'y', 'false'), f('x', 'z'), f('y', 'z'), f('z', 'fim')]);
    for (const [dados, ramo] of [[{ a: true }, 'x'], [{}, 'y']]) {
      const pedido = await abrir(id, dados);
      await pedido.completar(c.marina, ramo);
      await pedido.completar(c.marina, 'z');
      const final = await pedido.terminar('fim');
      assert.equal(tarefasCriadas(final).filter((no) => no === 'z').length, 1);
    }
    return 'Os dois ramos chegam ao mesmo nó, que roda uma vez.';
  }],
  ['06', 'Escolha múltipla', 'ausente', async () => {
    const id = await publicar('PAD-06 Escolha múltipla', [inicio(), decisao('ga', 'a = true'), tarefa('ta'), decisao('gb', 'b = true'), tarefa('tb'), fim()], [inicioEm('ga'), f('ga', 'ta', 'true'), f('ga', 'gb', 'false'), f('ta', 'gb'), f('gb', 'tb', 'true'), f('gb', 'fim', 'false'), f('tb', 'fim')]);
    const pedido = await abrir(id, { a: true, b: true });
    await pedido.completar(c.marina, 'ta');
    await pedido.completar(c.marina, 'tb');
    await pedido.terminar('fim');
    return 'Gateways em cadeia executam vários ramos, mas um depois do outro, nunca ao mesmo tempo.';
  }],
  ['07', 'Junção sincronizada', 'ausente', async () => {
    const erros = await tentar('PAD-07 Junção sincronizada', [inicio(), { id: 'j', type: 'inclusiveGateway', label: 'j', laneId: 'l' }, fim()], [inicioEm('j'), f('j', 'fim')]);
    return `Não há gateway inclusivo (${erros.join(', ')}), nem ramos simultâneos a aguardar.`;
  }],
  ['08', 'Junção múltipla', 'ausente', async () => {
    const erros = await tentar('PAD-08 Junção múltipla', ...PARALELO);
    return `Exige ramos simultâneos, que o Chain recusa (${erros.join(', ')}).`;
  }],
  ['09', 'Discriminador', 'ausente', async () => {
    const erros = await tentar('PAD-09 Discriminador', [inicio(), { id: 'j', type: 'complexGateway', label: 'j', laneId: 'l' }, fim()], [inicioEm('j'), f('j', 'fim')]);
    return `Não há gateway complexo (${erros.join(', ')}), nem ramos simultâneos.`;
  }],
  ['10', 'Ciclos arbitrários', 'direto', async () => {
    const id = await publicar('PAD-10 Ciclos', [inicio(), tarefa('a'), pergunta('repetir'), fim()], [inicioEm('a'), f('a', 'repetir'), f('repetir', 'a', 'true'), f('repetir', 'fim', 'false')]);
    const pedido = await abrir(id);
    await pedido.completar(c.marina, 'a');
    await pedido.decidir(c.marina, 'repetir', true);
    await pedido.completar(c.marina, 'a');
    await pedido.decidir(c.marina, 'repetir', false);
    const final = await pedido.terminar('fim');
    assert.equal(tarefasCriadas(final).filter((no) => no === 'a').length, 2);
    return 'Um fluxo de volta cria uma tarefa nova a cada passagem.';
  }],
  ['11', 'Término implícito', 'ausente', async () => {
    const erros = await tentar('PAD-11 Término implícito', [inicio(), tarefa('a'), fim()], [inicioEm('a')]);
    assert.ok(erros.includes('WF005'));
    return `Um nó sem saída é recusado (${erros.join(', ')}): o fim precisa estar no modelo. Com um só token, chegar a ele encerra o pedido, sem nada pendente.`;
  }],
  ['12', 'Múltiplas instâncias sem sincronização', 'ausente', async () => {
    const id = await publicar('PAD-12 Instâncias independentes', [inicio(), tarefa('a'), fim()], [inicioEm('a'), f('a', 'fim')]);
    const pedidos = await Promise.all([abrir(id), abrir(id), abrir(id)]);
    await pedidos[1].completar(c.marina, 'a');
    await pedidos[1].terminar('fim');
    assert.equal((await pedidos[0].ver()).status, 'running');
    await pedidos[0].completar(c.marina, 'a');
    await pedidos[2].completar(c.marina, 'a');
    return 'O modelo não cria instâncias. Um sistema externo inicia várias por gatilho HTTP, que correm independentes.';
  }],
  ['13', 'Múltiplas instâncias conhecidas no projeto', 'ausente', async () => {
    const filho = await publicar('PAD-13 Filho', [inicio(), tarefa('t'), fim()], [inicioEm('t'), f('t', 'fim')]);
    const sub = (id) => ({ id, type: 'task', taskKind: 'subprocess', label: id, laneId: 'l', workflow: { workflowId: filho, inputs: {}, outputs: {} } });
    const id = await publicar('PAD-13 Conhecidas no projeto', [inicio(), sub('s1'), sub('s2'), sub('s3'), tarefa('depois'), fim()], [inicioEm('s1'), f('s1', 's2'), f('s2', 's3'), f('s3', 'depois'), f('depois', 'fim')]);
    const pedido = await abrir(id);
    for (let i = 0; i < 3; i += 1) await pedido.completar(c.marina, 't');
    await pedido.completar(c.marina, 'depois');
    const final = await pedido.terminar('fim');
    assert.equal(final.children.length, 3);
    return 'Três subprocessos em sequência rodam e sincronizam, mas um de cada vez.';
  }],
  ['14', 'Múltiplas instâncias conhecidas na execução', 'ausente', async () => {
    const id = await publicar('PAD-14 Conhecidas na execução', [inicio(), tarefa('t', { form: { formId: formContagem } }), decisao('g', 'restantes > 0'), fim()], [inicioEm('t'), f('t', 'g'), f('g', 't', 'true'), f('g', 'fim', 'false')]);
    const pedido = await abrir(id, { restantes: 3 });
    for (let i = 0; i < 3; i += 1) await pedido.completar(c.marina, 't');
    const final = await pedido.terminar('fim');
    assert.equal(tarefasCriadas(final).length, 3);
    return 'Um laço com contador repete a etapa N vezes, com N vindo do pedido, mas uma de cada vez.';
  }],
  ['15', 'Múltiplas instâncias desconhecidas na execução', 'ausente', async () => {
    const id = await publicar('PAD-15 Desconhecidas na execução', [inicio(), tarefa('t'), pergunta('outra'), fim()], [inicioEm('t'), f('t', 'outra'), f('outra', 't', 'true'), f('outra', 'fim', 'false')]);
    const pedido = await abrir(id);
    await pedido.completar(c.marina, 't');
    await pedido.decidir(c.marina, 'outra', true);
    await pedido.completar(c.marina, 't');
    await pedido.decidir(c.marina, 'outra', false);
    await pedido.terminar('fim');
    return 'Uma decisão humana a cada volta define se há outra, mas uma de cada vez.';
  }],
  ['16', 'Escolha adiada', 'parcial', async () => {
    const id = await publicar('PAD-16 Escolha adiada', [inicio(), pergunta('qual'), tarefa('x'), tarefa('y'), fim('fx'), fim('fy')], [inicioEm('qual'), f('qual', 'x', 'true'), f('qual', 'y', 'false'), f('x', 'fx'), f('y', 'fy')]);
    const pedido = await abrir(id);
    await pedido.decidir(c.marina, 'qual', false);
    await pedido.completar(c.marina, 'y');
    await pedido.terminar('fy');
    return 'Uma decisão humana adia a escolha até alguém agir, mas é uma tarefa só, e não uma disputa entre dois eventos.';
  }],
  ['17', 'Roteamento intercalado', 'ausente', async () => {
    const id = await publicar('PAD-17 Roteamento intercalado', [inicio(), pergunta('ordem'), tarefa('a1'), tarefa('b1'), tarefa('b2'), tarefa('a2'), fim()], [inicioEm('ordem'), f('ordem', 'a1', 'true'), f('ordem', 'b2', 'false'), f('a1', 'b1'), f('b1', 'fim'), f('b2', 'a2'), f('a2', 'fim')]);
    const pedido = await abrir(id);
    await pedido.decidir(c.marina, 'ordem', false);
    await pedido.completar(c.marina, 'b2');
    await pedido.completar(c.marina, 'a2');
    await pedido.terminar('fim');
    return 'Cada ordem precisa ser desenhada: com duas etapas são dois caminhos, e o número cresce em fatorial.';
  }],
  ['18', 'Marco', 'ausente', async () => {
    const erros = await tentar('PAD-18 Marco', [inicio(), { id: 'm', type: 'milestone', label: 'm', laneId: 'l' }, fim()], [inicioEm('m'), f('m', 'fim')]);
    return `Não há esse construto (${erros.join(', ')}), e o padrão pede um ramo paralelo que observe o outro.`;
  }],
  ['19', 'Cancelar atividade', 'ausente', async () => {
    const erros = await tentar('PAD-19 Cancelar atividade', [inicio(), tarefa('a'), { id: 'b', type: 'boundaryEvent', label: 'b', laneId: 'l' }, fim()], [inicioEm('a'), f('a', 'fim'), f('b', 'fim')]);
    const id = await publicar('PAD-19 Tarefa', [inicio(), tarefa('a'), fim()], [inicioEm('a'), f('a', 'fim')]);
    const pedido = await abrir(id);
    const aberta = await pedido.esperar('a');
    const status = await c.marina.comando(`/api/tasks/${aberta.id}/cancel`, {}, randomUUID()).then(() => 'aceito', ({ status: codigo }) => codigo);
    assert.notEqual(status, 'aceito');
    await pedido.completar(c.marina, 'a');
    await pedido.terminar('fim');
    return `Não há evento de borda (${erros.join(', ')}), e a API não cancela uma tarefa sozinha (${status}). Só o pedido inteiro é encerrado.`;
  }],
  ['20', 'Cancelar caso', 'ausente', async () => {
    const id = await publicar('PAD-20 Cancelar caso', [inicio(), tarefa('a'), fim()], [inicioEm('a'), f('a', 'fim')]);
    const pedido = await abrir(id);
    await pedido.esperar('a');
    await c.marina.comando(`/api/instances/${pedido.id}/close`, { justification: 'Cliente desistiu.' }, randomUUID());
    const final = await pedido.ver();
    assert.equal(final.status, 'cancelled');
    assert.equal(final.openTasks.length, 0);
    return 'Encerrar um pedido, com justificativa, cancela as tarefas abertas.';
  }],
];

const resultado = [];
for (const [numero, nome, suporte, testar] of PADROES) {
  try {
    const evidencia = await testar();
    resultado.push({ numero, nome, suporte, evidencia });
    console.log(`${numero} ${suporte.padEnd(7)} ${nome}`);
  } catch (erro) {
    resultado.push({ numero, nome, suporte: 'FALHOU', evidencia: erro.message });
    console.log(`${numero} FALHOU  ${nome}: ${erro.message.slice(0, 200)}`);
  }
}
writeFileSync(join(EVIDENCIAS, 'padroes.json'), `${JSON.stringify(resultado, null, 2)}\n`);
const contagem = Object.groupBy(resultado, ({ suporte }) => suporte);
console.log(Object.entries(contagem).map(([chave, lista]) => `${chave}: ${lista.length}`).join(', '));
process.exit(contagem.FALHOU ? 1 : 0);
