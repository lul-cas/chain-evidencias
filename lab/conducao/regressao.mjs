// Regressão depois das dez mudanças (protocolo.md §4): os caminhos de verificar.mjs de novo, sobre as versões finais.
// Só podem falhar os que uma normativa mudou de propósito, declarados aqui antes de rodar.
// Uso: node lab/conducao/regressao.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Api } from '../cadastro/api.mjs';
import { BASE, lerBots } from '../cadastro/cadastrar.mjs';
import { CAMINHOS, Pedido, admin, criarContexto, noMock, olharMock } from '../cadastro/verificar.mjs';
import { camposQueFaltam } from './roteiros.mjs';

const SEGREDOS = new URL('../.segredos/', import.meta.url).pathname;
const EVIDENCIAS = new URL('../evidencias/', import.meta.url).pathname;

const ESPERADOS = {
  'CAD-01: a gerência aceita uma empresa': 'NOR-10 tirou a aprovação da gerência da agência.',
  'CAD-01: a gerência recusa uma empresa': 'NOR-10 tirou a aprovação da gerência da agência.',
  'CRE-01: analista, gerência, prestamista e veículo': 'NOR-02 pôs R$ 80 mil na alçada do analista, então a gerência não decide mais.',
};

const c = criarContexto(await admin());
const definicoes = JSON.parse(readFileSync(join(SEGREDOS, 'cadastro.json'), 'utf8'));
const mock = olharMock(async (caminho) => noMock('GET', caminho));
noMock('POST', '/__mock/reiniciar');

// O que as normativas mudaram para quem atua: Inês confere a formalização (NOR-05), e a abertura pede um campo novo (NOR-04).
c.tomas = new Api({ base: BASE, token: lerBots()['persona-ines'].token });
const abrirOriginal = c.abrir;
c.abrir = async (quem, processo, dados) => abrirOriginal(quem, processo, { ...dados, ...await camposQueFaltam(quem, definicoes[processo], dados).catch(() => ({})) });

// Quem preenche uma tela vê os valores que já estão no pedido, e os reenvia: os caminhos só mandam o que mudam.
const completarOriginal = Pedido.prototype.completar;
Pedido.prototype.completar = async function completar(persona, nodeId, dados = {}) {
  const tarefa = await this.esperar(nodeId);
  const { form, prefill = {} } = await persona.get(`/api/tasks/${tarefa.id}`);
  const preenchidos = (form?.document.components ?? []).filter(({ key, validate }) => validate?.required && !(key in dados) && key in prefill);
  return completarOriginal.call(this, persona, nodeId, { ...Object.fromEntries(preenchidos.map(({ key }) => [key, prefill[key]])), ...dados });
};

const resultado = { passaram: [], falharamComoEsperado: {}, falharamSemEsperar: {}, passaramSemEsperar: [] };
for (const [nome, caminho] of Object.entries(CAMINHOS)) {
  try {
    await caminho(c, mock);
    if (ESPERADOS[nome]) resultado.passaramSemEsperar.push(nome);
    else resultado.passaram.push(nome);
  } catch (erro) {
    if (ESPERADOS[nome]) resultado.falharamComoEsperado[nome] = ESPERADOS[nome];
    else resultado.falharamSemEsperar[nome] = erro.message;
  }
}
writeFileSync(join(EVIDENCIAS, 'regressao.json'), `${JSON.stringify(resultado, null, 2)}\n`);
console.log(`${resultado.passaram.length} passaram, ${Object.keys(resultado.falharamComoEsperado).length} falharam como esperado`);
for (const [nome, motivo] of Object.entries(resultado.falharamSemEsperar)) console.log(`FALHOU SEM ESPERAR: ${nome}\n  ${motivo}`);
for (const nome of resultado.passaramSemEsperar) console.log(`PASSOU SEM ESPERAR: ${nome}`);
process.exit(Object.keys(resultado.falharamSemEsperar).length + resultado.passaramSemEsperar.length ? 1 : 0);
