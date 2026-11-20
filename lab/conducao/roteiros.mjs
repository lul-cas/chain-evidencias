// O que o agente de desenvolvimento faz em cada mudança (protocolo.md §4). Os roteiros conferem comportamento, não desenho:
// Ana pode resolver de outro jeito, então eles olham o grupo da próxima tarefa, e não um nó que só o gabarito conhece.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { cnpj, cpf } from '../mock/massa.mjs';
import { ACEITA, atualizacao, cadastroDoCliente, empresa, proposta } from '../cadastro/verificar.mjs';

const PARECER = { ratingInterno: 'B', parecerAnalista: 'aprovar', taxaAprovada: 2.2, justificativaAnalista: 'Laboratório' };

/** Campos obrigatórios que o início passou a pedir, com um valor válido. */
export async function camposQueFaltam(quem, definicao, dados) {
  const { form } = await quem.get(`/api/startable-workflows/${definicao}/start-form`);
  const extras = {};
  for (const campo of form?.document.components ?? []) {
    if (!campo.validate?.required || campo.key in dados || campo.visibleWhen) continue;
    if (campo.options) extras[campo.key] = campo.options[0].value;
    else if (campo.type === 'number') extras[campo.key] = 1;
    else if (campo.type === 'date') extras[campo.key] = '2026-11-06';
    else if (campo.type !== 'file' && campo.type !== 'group') extras[campo.key] = 'Laboratório';
  }
  return extras;
}

async function abrirCadastro(c, documento, nome, dados = cadastroDoCliente) {
  const base = await dados(c, documento, nome);
  return c.abrir(c.marina, 'CAD-01', { ...base, ...await camposQueFaltam(c.marina, c.definicoes['CAD-01'], base) });
}

async function analisarProposta(c, documentoBase, valor, prazo, parecer) {
  const pedido = await c.abrir(c.marina, 'CRE-01', await proposta(c, documentoBase, 'pessoal', valor, prazo));
  await pedido.completar(c.marina, 'negociar_condicoes', { valorSolicitado: valor, prazoMeses: prazo, ...ACEITA });
  await pedido.esperar('analisar_credito');
  return { pedido, parecer: { ...PARECER, valorAprovado: valor, prazoAprovado: prazo, ...parecer } };
}

/** Uma proposta aprovada automaticamente, parada na conferência da formalização. */
async function propostaNaConferencia(c, base, valor) {
  const pedido = await c.abrir(c.marina, 'CRE-01', await proposta(c, base, 'pessoal', valor, 24));
  await pedido.completar(c.marina, 'negociar_condicoes', { valorSolicitado: valor, prazoMeses: 24, ...ACEITA });
  await pedido.decidir(c.marina, 'aceitar_aprovacao', true);
  await pedido.completar(c.marina, 'colher_assinatura');
  let tarefa = await pedido.proximaTarefa();
  while (tarefa?.nodeId === 'colher_assinatura') {
    await pedido.completar(c.marina, 'colher_assinatura');
    tarefa = await pedido.proximaTarefa();
  }
  await pedido.esperar('conferir_formalizacao');
  return pedido;
}

const grupoDe = (tarefa) => tarefa?.group?.name ?? 'Solicitantes';

async function terminarDesistindo(c, pedido) {
  await pedido.decidir(c.marina, 'aceitar_aprovacao', false);
  return pedido.terminar('fim_desistencia');
}

export const ROTEIROS = {
  'NOR-01': {
    async antes(c) {
      const { pedido } = await analisarProposta(c, '000000002', 30000, 24);
      return { parada: pedido.id };
    },
    async depois(c) {
      const { pedido, parecer } = await analisarProposta(c, '000000002', 30000, 24, { ratingInterno: 'D' });
      await pedido.completar(c.otavio, 'analisar_credito', parecer);
      const tarefa = await pedido.proximaTarefa();
      assert.equal(grupoDe(tarefa), 'Crédito - Gerência', 'rating D com valor na alçada do analista passa pela gerência');
      await c.priscila.comando(`/api/tasks/${tarefa.id}/decide`, { outcome: false }, randomUUID());
      await pedido.terminar('fim_recusada');
      return 'Rating D, com R$ 30 mil, foi para a gerência.';
    },
    async fechar(c, { parada }) {
      const pedido = c.pedido(parada);
      await pedido.completar(c.otavio, 'analisar_credito', { ...PARECER, ratingInterno: 'D', valorAprovado: 30000, prazoAprovado: 24 });
      await pedido.esperar('aceitar_aprovacao');
      return [await terminarDesistindo(c, pedido)];
    },
  },
  'NOR-02': {
    async antes(c) {
      const { pedido } = await analisarProposta(c, '000000002', 70000, 48);
      return { parada: pedido.id };
    },
    async depois(c) {
      const { pedido, parecer } = await analisarProposta(c, '000000002', 70000, 48);
      await pedido.completar(c.otavio, 'analisar_credito', parecer);
      const tarefa = await pedido.proximaTarefa();
      assert.notEqual(grupoDe(tarefa), 'Crédito - Gerência', 'R$ 70 mil, com rating B, sai do analista');
      await terminarDesistindo(c, pedido);
      return 'R$ 70 mil, com rating B, saiu do analista sem a gerência.';
    },
    async fechar(c, { parada }) {
      const pedido = c.pedido(parada);
      await pedido.completar(c.otavio, 'analisar_credito', { ...PARECER, valorAprovado: 70000, prazoAprovado: 48 });
      await pedido.decidir(c.priscila, 'aprovar_gerencia', true);
      return [await terminarDesistindo(c, pedido)];
    },
  },
  'NOR-04': {
    async antes(c) {
      const pedido = await abrirCadastro(c, cpf('000000501'), 'Abel Fontes');
      await pedido.esperar('analisar_cadastro');
      const { form } = await c.marina.get(`/api/startable-workflows/${c.definicoes['CAD-01']}/start-form`);
      return { parada: pedido.id, chaves: form.document.components.map(({ key }) => key) };
    },
    async depois(c, { chaves }) {
      const { form } = await c.marina.get(`/api/startable-workflows/${c.definicoes['CAD-01']}/start-form`);
      const novos = form.document.components.filter(({ key }) => !chaves.includes(key));
      assert.equal(novos.length, 1, 'o pedido de abertura ganhou um campo');
      const [campo] = novos;
      assert.equal(campo.validate?.required, true, 'o campo novo é obrigatório');

      const dados = await cadastroDoCliente(c, cpf('000000502'), 'Bia Fontes');
      await assert.rejects(c.marina.comando('/api/instances', { definitionId: c.definicoes['CAD-01'], data: dados }, randomUUID()), ({ status, corpo }) => status === 422 && corpo.errors.some(({ key }) => key === campo.key));

      const pedido = await abrirCadastro(c, cpf('000000502'), 'Bia Fontes');
      const tarefa = await pedido.esperar('analisar_cadastro');
      const { prefill } = await c.caio.get(`/api/tasks/${tarefa.id}`);
      assert.notEqual(prefill[campo.key], undefined, 'quem analisa vê a origem informada');
      await pedido.completar(c.caio, 'analisar_cadastro', { parecerCadastro: 'aprovado' });
      await pedido.terminar('fim_conta_aberta');
      return `Sem \`${campo.key}\`, o pedido foi recusado com 422. Com ele, o analista viu o valor.`;
    },
    async fechar(c, { parada }) {
      const pedido = c.pedido(parada);
      await pedido.completar(c.caio, 'analisar_cadastro', { parecerCadastro: 'aprovado' });
      return [await pedido.terminar('fim_conta_aberta')];
    },
  },
  'NOR-05': {
    async antes(c) {
      return { parada: (await propostaNaConferencia(c, '000000001', 11000)).id };
    },
    async depois(c) {
      const pedido = await propostaNaConferencia(c, '000000001', 11500);
      const tarefa = await pedido.esperar('conferir_formalizacao');
      assert.equal(grupoDe(tarefa), 'Controles Internos', 'a conferência é de Controles Internos');
      await assert.rejects(c.tomas.comando(`/api/tasks/${tarefa.id}/complete`, { data: { formalizacaoConforme: 'sim' } }, randomUUID()), ({ status }) => status === 403 || status === 404);
      await pedido.completar(c.ines(), 'conferir_formalizacao', { formalizacaoConforme: 'sim' });
      await pedido.terminar('fim_liberado');
      return 'Tomás, do Crédito, foi recusado, e Inês conferiu.';
    },
    async fechar(c, { parada }) {
      const pedido = c.pedido(parada);
      await pedido.completar(c.tomas, 'conferir_formalizacao', { formalizacaoConforme: 'sim' });
      return [await pedido.terminar('fim_liberado')];
    },
  },
  'NOR-06': {
    async antes(c) {
      return { parada: (await propostaNaConferencia(c, '000000010', 9000)).id };
    },
    async depois(c, _, mock) {
      const pedido = await propostaNaConferencia(c, '000000001', 12000);
      await pedido.completar(c.ines(), 'conferir_formalizacao', { formalizacaoConforme: 'sim' });
      const fim = await pedido.terminar('fim_liberado');
      const { comunicacoes } = await mock.estado();
      const comunicacao = comunicacoes.find(({ numeroContrato }) => numeroContrato === fim.data.numeroContrato);
      assert.ok(comunicacao, 'o regulador recebeu a operação');
      assert.ok(Object.values(fim.data).includes(comunicacao.protocoloComunicacao), 'o protocolo ficou no pedido');
      return `O regulador recebeu ${fim.data.numeroContrato}, e o pedido guardou ${comunicacao.protocoloComunicacao}.`;
    },
    async fechar(c, { parada }, mock) {
      const pedido = c.pedido(parada);
      await pedido.completar(c.tomas, 'conferir_formalizacao', { formalizacaoConforme: 'sim' }).catch(async () => pedido.completar(c.ines(), 'conferir_formalizacao', { formalizacaoConforme: 'sim' }));
      const fim = await pedido.terminar('fim_liberado');
      const { comunicacoes } = await mock.estado();
      assert.ok(!comunicacoes.some(({ numeroContrato }) => numeroContrato === fim.data.numeroContrato), 'a versão antiga não comunica');
      return [fim];
    },
  },
  'NOR-07': {
    async antes(c) {
      const cadastro = await abrirCadastro(c, cpf('000000503'), 'Caetano Dias');
      await cadastro.esperar('analisar_cadastro');
      const atualizando = await c.abrir(c.marina, 'CAD-02', { documentoCliente: cpf('000000009'), origem: 'agencia' });
      await atualizando.esperar('atualizar_dados');
      return { cadastro: cadastro.id, atualizando: atualizando.id };
    },
    async depois(c) {
      const ultimaVersao = async (id) => {
        const { latestVersion } = await c.admin.get(`/api/workflows/${c.definicoes[id]}`);
        return (await c.admin.get(`/api/workflows/${c.definicoes[id]}/versions/${latestVersion}`)).document;
      };
      const [abertura, atualizando] = [await ultimaVersao('CAD-01'), await ultimaVersao('CAD-02')];
      const filhos = (documento) => new Set(documento.nodes.filter(({ taskKind }) => taskKind === 'subprocess').map(({ workflow }) => workflow.workflowId));
      const comum = [...filhos(abertura)].filter((id) => filhos(atualizando).has(id));
      assert.equal(comum.length, 1, 'os dois processos chamam o mesmo procedimento');
      const consultasDiretas = (documento) => documento.nodes.filter(({ id }) => id === 'consultar_situacao' || id === 'consultar_pld');
      assert.equal(consultasDiretas(abertura).length + consultasDiretas(atualizando).length, 0, 'a consulta saiu dos dois processos');

      const normal = await abrirCadastro(c, cpf('000000504'), 'Dalva Nunes');
      await normal.esperar('analisar_cadastro');
      await normal.completar(c.caio, 'analisar_cadastro', { parecerCadastro: 'aprovado' });
      await normal.terminar('fim_conta_aberta');
      const bloqueado = await abrirCadastro(c, cpf('000000104'), 'Quirino Sá');
      await bloqueado.terminar('fim_recusado');
      const irregular = await abrirCadastro(c, cpf('000000102'), 'Olga Pires');
      await irregular.esperar('ajustar_cadastro');

      const pedido = await c.abrir(c.marina, 'CAD-02', { documentoCliente: cpf('000000008'), origem: 'agencia' });
      await pedido.completar(c.rafael, 'atualizar_dados', await atualizacao(c));
      await pedido.completar(c.caio, 'conferir_atualizacao', { parecerAtualizacao: 'aprovado' });
      await pedido.terminar('fim_atualizado');
      return 'CAD-01 e CAD-02 chamam o mesmo procedimento, e os desvios de bloqueio e de documento irregular continuam valendo.';
    },
    async fechar(c, { cadastro, atualizando }) {
      const a = c.pedido(cadastro);
      await a.completar(c.caio, 'analisar_cadastro', { parecerCadastro: 'aprovado' });
      const b = c.pedido(atualizando);
      await b.completar(c.rafael, 'atualizar_dados', await atualizacao(c));
      await b.completar(c.caio, 'conferir_atualizacao', { parecerAtualizacao: 'aprovado' });
      return [await a.terminar('fim_conta_aberta'), await b.terminar('fim_atualizado')];
    },
  },
  'NOR-08': {
    async antes(c) {
      const pedido = await c.abrir(c.core, 'CRE-03', { numeroContrato: 'CT-1001', origem: 'atraso' });
      await pedido.completar(c.vera, 'elaborar_proposta', { descontoPercentual: 10, valorEntrada: 500, quantidadeParcelas: 12 });
      await pedido.esperar('negociar_cliente');
      return { parada: pedido.id };
    },
    async depois(c) {
      const pedido = await c.abrir(c.core, 'CRE-03', { numeroContrato: 'CT-1001', origem: 'atraso' });
      await pedido.completar(c.vera, 'elaborar_proposta', { descontoPercentual: 10, valorEntrada: 500, quantidadeParcelas: 12 });
      await pedido.completar(c.rafael, 'negociar_cliente', { respostaCliente: 'aceita' });
      const fim = await pedido.terminar('fim_acordo');
      const ordem = fim.timeline.filter(({ type }) => type === 'automation.requested' || type === 'subprocess.started').map(({ details }) => details.nodeId);
      assert.ok(ordem.indexOf('lancar_acordo') < ordem.indexOf('emitir_boleto'), `ordem: ${ordem}`);
      return `A ordem foi ${ordem.slice(-3).join(', ')}.`;
    },
    async fechar(c, { parada }) {
      const pedido = c.pedido(parada);
      await pedido.completar(c.rafael, 'negociar_cliente', { respostaCliente: 'aceita' });
      const fim = await pedido.terminar('fim_acordo');
      const ordem = fim.timeline.filter(({ type }) => type === 'automation.requested' || type === 'subprocess.started').map(({ details }) => details.nodeId);
      assert.ok(ordem.indexOf('emitir_boleto') < ordem.indexOf('lancar_acordo'), 'a versão antiga mantém a ordem antiga');
      return [fim];
    },
  },
  'NOR-10': {
    async antes(c) {
      const pedido = await abrirCadastro(c, cnpj('900000060001'), 'Oficina Velha Ltda', empresa);
      await pedido.completar(c.caio, 'analisar_cadastro', { parecerCadastro: 'aprovado' });
      await pedido.esperar('aprovar_empresa');
      return { parada: pedido.id };
    },
    async depois(c) {
      const pedido = await abrirCadastro(c, cnpj('900000070001'), 'Oficina Nova Ltda', empresa);
      await pedido.completar(c.caio, 'analisar_cadastro', { parecerCadastro: 'aprovado' });
      const tarefa = await pedido.proximaTarefa();
      assert.equal(tarefa, null, `a empresa não passa por mais ninguém, mas abriu ${tarefa?.nodeId}`);
      await pedido.terminar('fim_conta_aberta');
      return 'A empresa abriu conta sem passar pela gerência da agência.';
    },
    async fechar(c, { parada }) {
      const pedido = c.pedido(parada);
      await pedido.decidir(c.beatriz, 'aprovar_empresa', true);
      return [await pedido.terminar('fim_conta_aberta')];
    },
  },
};
