// Q2, como alteracoes-previstas.md §2 conta: compara versões publicadas, sem o layout e sem as versões fixadas.

const semLayout = ({ layout, ...resto }) => resto;

function semPin(no) {
  const copia = semLayout(no);
  for (const chave of ['form', 'automation', 'workflow']) {
    if (copia[chave]) {
      const { version, ...referencia } = copia[chave];
      copia[chave] = referencia;
    }
  }
  return copia;
}

function diferencas(antes, depois, chave, normal) {
  const lerMapa = (lista) => new Map(lista.map((item) => [chave(item), JSON.stringify(normal(item))]));
  const [a, d] = [lerMapa(antes), lerMapa(depois)];
  const resultado = { criados: 0, removidos: 0, alterados: 0 };
  for (const [id, valor] of d) {
    if (!a.has(id)) resultado.criados += 1;
    else if (a.get(id) !== valor) resultado.alterados += 1;
  }
  for (const id of a.keys()) if (!d.has(id)) resultado.removidos += 1;
  return resultado;
}

const somar = ({ criados, removidos, alterados }) => criados + removidos + alterados;

export function compararProcessos(antes, depois) {
  return {
    nos: diferencas(antes.nodes, depois.nodes, ({ id }) => id, semPin),
    fluxos: diferencas(antes.flows, depois.flows, ({ source, branch }) => `${source}|${branch ?? ''}`, ({ id, layout, ...resto }) => resto),
    raias: diferencas(antes.lanes, depois.lanes, ({ id }) => id, semLayout),
  };
}

export const totalDoProcesso = ({ nos, fluxos, raias }) => somar(nos) + somar(fluxos) + somar(raias);

function achatar(componentes, prefixo = '') {
  return componentes.flatMap(({ components, ...campo }) => [{ ...campo, chave: `${prefixo}${campo.key}` }, ...achatar(components ?? [], `${prefixo}${campo.key}.`)]);
}

export function compararFormularios(antes, depois) {
  return diferencas(achatar(antes.components), achatar(depois.components), ({ chave }) => chave, (campo) => campo);
}

const versao = async (api, colecao, id, numero) => (await api.get(`/api/${colecao}/${id}/versions/${numero}`)).document;

/** As versões atuais de tudo o que se modela. */
export async function fotografar(api) {
  const ler = async (colecao) => Object.fromEntries((await api.get(`/api/${colecao}`)).filter(({ latestVersion }) => latestVersion).map(({ id, name, latestVersion }) => [name, { id, versao: latestVersion }]));
  return { workflows: await ler('workflows'), forms: await ler('forms'), automations: await ler('automations') };
}

/** O que mudou entre duas fotografias. Quem publicou várias vezes conta pela primeira e pela última versão. */
export async function medirMudanca(api, antes, depois) {
  const medida = { elementos: 0, versoes: [], republicados: [], processos: {}, formularios: {}, automacoes: [] };
  const rotulo = (nome, de, para) => (de ? `${nome} v${de}→v${para}` : `${nome} v${para}`);

  for (const [nome, { id, versao: para }] of Object.entries(depois.workflows)) {
    const de = antes.workflows[nome]?.versao;
    if (de === para) continue;
    medida.versoes.push(rotulo(nome, de, para));
    const documento = await versao(api, 'workflows', id, para);
    if (de) {
      const comparacao = compararProcessos(await versao(api, 'workflows', id, de), documento);
      const total = totalDoProcesso(comparacao);
      medida.processos[nome] = { ...comparacao, total };
      medida.elementos += total;
      if (total === 0) medida.republicados.push(nome);
    } else {
      const total = documento.nodes.length + documento.flows.length + documento.lanes.length;
      medida.processos[nome] = { novo: true, total };
      medida.elementos += total;
    }
  }

  for (const [nome, { id, versao: para }] of Object.entries(depois.forms)) {
    const de = antes.forms[nome]?.versao;
    if (de === para) continue;
    medida.versoes.push(rotulo(nome, de, para));
    const documento = await versao(api, 'forms', id, para);
    const total = de ? somar(compararFormularios(await versao(api, 'forms', id, de), documento)) : achatar(documento.components).length;
    medida.formularios[nome] = { novo: !de, total };
    medida.elementos += total;
  }

  for (const [nome, { versao: para }] of Object.entries(depois.automations)) {
    const de = antes.automations[nome]?.versao;
    if (de === para) continue;
    medida.versoes.push(rotulo(nome, de, para));
    medida.automacoes.push(nome);
    medida.elementos += 1;
  }
  return medida;
}
