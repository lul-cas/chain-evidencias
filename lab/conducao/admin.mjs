// Os passos que só um admin faz (LQ-12), pedidos por Ana. Eles contam como configuração em Q1, por isso ficam registrados.
// Uso: node lab/conducao/admin.mjs NOR-05 | NOR-06
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { admin } from '../cadastro/verificar.mjs';

const SEGREDOS = new URL('../.segredos/', import.meta.url).pathname;
const EVIDENCIAS = new URL('../evidencias/', import.meta.url).pathname;

function guardarToken(nome, id, token) {
  const arquivo = join(SEGREDOS, 'bots.json');
  const bots = JSON.parse(readFileSync(arquivo, 'utf8'));
  bots[nome] = { id, token };
  writeFileSync(arquivo, JSON.stringify(bots, null, 2), { mode: 0o600 });
}

const PASSOS = {
  async 'NOR-05'(api) {
    const grupo = await api.post('/api/admin/groups', { name: 'Controles Internos', description: 'Área independente do Crédito (Resolução Interna 05/2026)' });
    const bot = await api.post('/api/admin/bots', { name: 'persona-ines', displayName: 'Inês' });
    await api.post(`/api/admin/bots/${bot.id}/mcp/enable`);
    await api.put(`/api/admin/groups/${grupo.id}/members/${bot.id}`);
    const { value } = await api.post(`/api/admin/bots/${bot.id}/tokens`, { label: 'laboratório' });
    guardarToken('persona-ines', bot.id, value);
    return ['Criar o grupo Controles Internos', 'Criar a persona Inês, com o bot persona-ines', 'Pôr Inês no grupo'];
  },
  async 'NOR-06'(api) {
    const { CHAIN_LAB_MOCK_KEY: valor } = Object.fromEntries(readFileSync(join(SEGREDOS, 'stack.env'), 'utf8').trim().split('\n').map((linha) => {
      const posicao = linha.indexOf('=');
      return [linha.slice(0, posicao), linha.slice(posicao + 1)];
    }));
    await api.post('/api/admin/automation/destinations', {
      name: 'regulador', description: 'Regulador Fictício', scheme: 'http', host: 'mock', port: 8080, pathPrefix: '/regulador', internal: true, allowSecretsOverHttp: true,
    });
    await api.post('/api/admin/automation/secrets', { name: 'regulador_api_key', description: 'Regulador Fictício', value: valor, allowedDestinations: ['regulador'] });
    return ['Criar o destino regulador', 'Criar a credencial regulador_api_key'];
  },
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [id] = process.argv.slice(2);
  const passos = await PASSOS[id](await admin());
  writeFileSync(join(EVIDENCIAS, id, 'admin.json'), `${JSON.stringify({ passos }, null, 2)}\n`);
  console.log(passos.join('\n'));
  process.exit(0);
}
