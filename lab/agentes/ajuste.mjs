// O que as ferramentas de Ana fazem com um documento (protocolo.md §2).

function segmentos(caminho) {
  if (caminho === '' || !caminho.startsWith('/')) throw new Error(`caminho inválido: "${caminho}"`);
  return caminho.split('/').slice(1).map((parte) => parte.replaceAll('~1', '/').replaceAll('~0', '~'));
}

function descer(documento, partes, caminho) {
  let atual = documento;
  for (const parte of partes) {
    const proximo = Array.isArray(atual) ? atual[Number(parte)] : atual?.[parte];
    if (proximo === undefined) throw new Error(`o caminho ${caminho} não existe`);
    atual = proximo;
  }
  return atual;
}

function aplicarOperacao(documento, { op, path, value }) {
  if (!['add', 'remove', 'replace'].includes(op)) throw new Error(`operação não aceita: ${op}. Use add, remove ou replace.`);
  const partes = segmentos(path);
  const ultima = partes.at(-1);
  const pai = descer(documento, partes.slice(0, -1), path);

  if (Array.isArray(pai)) {
    if (op === 'add' && ultima === '-') {
      pai.push(value);
      return;
    }
    const indice = Number(ultima);
    const limite = op === 'add' ? pai.length : pai.length - 1;
    if (!Number.isInteger(indice) || indice < 0 || indice > limite) throw new Error(`o caminho ${path} não existe`);
    if (op === 'add') pai.splice(indice, 0, value);
    else if (op === 'remove') pai.splice(indice, 1);
    else pai[indice] = value;
    return;
  }

  if (typeof pai !== 'object' || pai === null) throw new Error(`o caminho ${path} não existe`);
  if (op !== 'add' && !(ultima in pai)) throw new Error(`o caminho ${path} não existe`);
  if (op === 'remove') delete pai[ultima];
  else pai[ultima] = value;
}

/** Operações JSON Patch sobre uma cópia do documento. */
export function aplicar(documento, operacoes) {
  const copia = structuredClone(documento);
  for (const operacao of operacoes) aplicarOperacao(copia, operacao);
  return copia;
}

/** O layout não tem significado na execução: sai do que Ana lê, sem mudar as posições das listas. */
export function semLayout(valor) {
  if (Array.isArray(valor)) return valor.map(semLayout);
  if (typeof valor !== 'object' || valor === null) return valor;
  return Object.fromEntries(Object.entries(valor).filter(([chave]) => chave !== 'layout').map(([chave, item]) => [chave, semLayout(item)]));
}

const VAO = 10;
const COLUNA = 190;
const tamanho = ({ type }) => (type === 'task' ? [140, 70] : type === 'gateway' ? [70, 70] : [64, 64]);
const naFaixa = (layout, faixa) => layout.y >= faixa.y && layout.y + layout.h <= faixa.y + faixa.h;

/** Ana não vê o layout, mas o editor precisa dele: o que ela criou ou moveu ganha um lugar. */
export function acomodar(documento) {
  const copia = structuredClone(documento);
  for (const [indice, raia] of copia.lanes.entries()) {
    if (raia.layout) continue;
    const acima = copia.lanes[indice - 1]?.layout;
    raia.layout = acima ? { ...acima, y: acima.y + acima.h + VAO } : { x: 40, y: 30, w: 900, h: 130 };
  }

  const faixas = new Map(copia.lanes.map(({ id, layout }) => [id, layout]));
  const nos = new Map(copia.nodes.map((no) => [no.id, no]));
  const semLugar = () => copia.nodes.filter(({ layout }) => !layout);
  for (let restantes = semLugar(), voltas = copia.nodes.length + 1; restantes.length > 0 && voltas > 0; restantes = semLugar(), voltas -= 1) {
    for (const no of restantes) {
      const origem = copia.flows.map(({ source, target }) => (target === no.id ? nos.get(source) : null)).find((candidato) => candidato?.layout);
      const faixa = faixas.get(no.laneId);
      if (!origem && voltas > 1 && copia.flows.some(({ target }) => target === no.id)) continue;
      const [w, h] = tamanho(no);
      no.layout = origem
        ? { x: origem.layout.x + COLUNA, y: origem.layout.y, w, h }
        : { x: (faixa?.x ?? 40) + 100, y: (faixa?.y ?? 30) + 30, w, h };
    }
  }

  for (const no of copia.nodes) {
    const faixa = faixas.get(no.laneId);
    if (faixa && !naFaixa(no.layout, faixa)) no.layout = { ...no.layout, y: faixa.y + 30 };
    if (faixa && no.layout.x + no.layout.w + 40 > faixa.x + faixa.w) faixa.w = no.layout.x + no.layout.w + 40 - faixa.x;
  }
  return copia;
}
