// Quem atuou nas instâncias: a evidência do Quadro 1 do artigo.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { quemAtuou } from '../personas.mjs';

const agiu = (username, channel = 'api') => ({ type: 'task.completed', actor: { username }, channel });
const pedido = (definitionName, ...timeline) => ({ definitionName, timeline });

test('lista quem agiu, sem o prefixo e em ordem', () => {
  const { atuaram } = quemAtuou([pedido('CAD-01 Abertura de conta', agiu('persona-marina'), agiu('persona-caio'), agiu('persona-marina'))], []);
  assert.deepEqual(atuaram, ['caio', 'marina']);
});

test('um bot de integração não é persona', () => {
  const { atuaram } = quemAtuou([pedido('CRE-03 Cobrança', agiu('bot-core-bancario'))], []);
  assert.deepEqual(atuaram, []);
});

test('um evento do sistema não tem quem agiu', () => {
  const { atuaram } = quemAtuou([pedido('CAD-01 Abertura de conta', { type: 'gateway.decided', channel: 'api' })], []);
  assert.deepEqual(atuaram, []);
});

test('os processos dos padrões ficam de fora, porque R1 não tem personas', () => {
  const { atuaram, canais } = quemAtuou([pedido('PAD-01 Sequência', agiu('persona-marina', 'web'))], []);
  assert.deepEqual(atuaram, []);
  assert.deepEqual(canais, {});
});

test('quem tem bot e não agiu aparece, exceto quem modela', () => {
  const bots = ['persona-zelia', 'persona-ana', 'persona-caio', 'persona-heloisa', 'bot-core-bancario'];
  const { semAtuar, modelou } = quemAtuou([pedido('CAD-01 Abertura de conta', agiu('persona-caio'))], bots);
  assert.deepEqual(semAtuar, ['heloisa', 'zelia']);
  assert.equal(modelou, 'ana');
});

test('conta os eventos por canal', () => {
  const { canais } = quemAtuou([pedido('CAD-01 Abertura de conta', agiu('persona-caio'), agiu('persona-caio'), agiu('persona-marina', 'mcp'), { type: 'x' })], []);
  assert.deepEqual(canais, { api: 2, mcp: 1 });
});
