// O isolamento de protocolo.md §2 é uma afirmação do artigo, então os testes o conferem.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { argumentos, pedidoInicial, promptDeSistema, resumir, textoDaNormativa, ultimaSessao } from '../rodar.mjs';

const valorDe = (lista, opcao) => lista[lista.indexOf(opcao) + 1];
const args = argumentos({ mensagem: 'm', sistema: 's', mcp: '/x.json', modelo: 'modelo', limite: '3' });

test('a sessão não tem ferramentas embutidas, nem configurações, nem MCP de fora', () => {
  assert.equal(valorDe(args, '--tools'), '');
  assert.equal(valorDe(args, '--setting-sources'), '');
  assert.ok(args.includes('--strict-mcp-config'));
  assert.equal(valorDe(args, '--permission-mode'), 'dontAsk');
});

test('só as ferramentas de Ana estão liberadas, e há um limite de gasto', () => {
  assert.ok(valorDe(args, '--allowedTools').split(',').every((nome) => nome.startsWith('mcp__chain__')));
  assert.equal(valorDe(args, '--max-budget-usd'), '3');
});

test('continuar uma sessão usa --resume', () => {
  assert.ok(!args.includes('--resume'));
  assert.equal(valorDe(argumentos({ mensagem: 'm', sistema: 's', mcp: '/x', sessao: 'abc' }), '--resume'), 'abc');
});

test('o que Ana recebe não fala da alteração prevista', () => {
  for (let n = 1; n <= 10; n += 1) {
    const id = `NOR-${String(n).padStart(2, '0')}`;
    const texto = pedidoInicial(textoDaNormativa(id));
    assert.doesNotMatch(texto, /alteracoes-previstas|gateway|gw_|CRE-0|CAD-0|\bM\d+\b/, id);
  }
  assert.doesNotMatch(promptDeSistema(), /alteracoes-previstas|NOR-\d|M\d\b|gw_alcada|republi/i);
});

test('a normativa é achada pelo id', () => {
  assert.match(textoDaNormativa('NOR-02'), /alçada do analista/);
  assert.throws(() => textoDaNormativa('NOR-99'), /NOR-99/);
});

const inicio = (tools) => JSON.stringify({ type: 'system', subtype: 'init', session_id: 's1', model: 'm', tools });
const fim = JSON.stringify({ type: 'result', subtype: 'success', num_turns: 4, total_cost_usd: 0.5, duration_ms: 1000, result: 'Pronto.' });

test('o resumo traz custo, turnos e resposta', () => {
  assert.deepEqual(resumir([inicio(['mcp__chain__ler']), '', fim]), {
    sessao: 's1', modelo: 'm', ferramentas: 1, turnos: 4, custoUsd: 0.5, duracaoMs: 1000, fim: 'success', resposta: 'Pronto.',
  });
});

test('uma sessão que enxergou outra ferramenta não vale', () => {
  assert.throws(() => resumir([inicio(['mcp__chain__ler', 'Bash']), fim]), /Bash/);
});

test('continuar usa a última execução que terminou, e ignora uma pasta sem resumo', () => {
  const base = mkdtempSync(join(tmpdir(), 'evidencias-'));
  for (const [pasta, sessao] of [['execucao-1', 'a'], ['execucao-2', 'b'], ['execucao-10', 'c']]) {
    mkdirSync(join(base, pasta));
    writeFileSync(join(base, pasta, 'resumo.json'), JSON.stringify({ sessao }));
  }
  mkdirSync(join(base, 'execucao-11'));
  assert.equal(ultimaSessao(base), 'c');
  rmSync(base, { recursive: true });
});
