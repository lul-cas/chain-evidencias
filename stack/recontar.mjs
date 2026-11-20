// Refaz a medição de Q2 do laboratório sobre as versões exportadas em stack/, sem a stack.
//
// Uso, da raiz do pacote:  node stack/recontar.mjs lab stack
//
// Usa a própria medição do laboratório (lab/conducao/medicao.mjs), trocando a API por uma leitura dos arquivos.
// Para cada mudança, parte da foto de antes (estado.json), aplica as versões que medidas.json diz terem sido
// publicadas, mede e compara o total com medidas.json. O que se refaz é a contagem, a partir dos documentos
// exportados; quais versões entram na comparação vem do registro do laboratório.
// Confere também se cada instância deixada em andamento estava aberta quando a versão nova foi publicada.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const [, , LAB, EXPORTADO] = process.argv;
const { medirMudanca } = await import(pathToFileURL(`${LAB}/conducao/medicao.mjs`).href);
const ler = (caminho) => JSON.parse(readFileSync(caminho, 'utf8'));
const indice = ler(`${EXPORTADO}/indice.json`);

const itens = [];
for (const [pasta, colecao] of [['processos', 'workflows'], ['formularios', 'forms'], ['automacoes', 'automations']]) {
  for (const item of indice[pasta]) itens.push({ ...item, colecao });
}
const porNome = (nome) => itens.find((item) => item.nome === nome);

const api = {
  get: async (caminho) => {
    const [, colecao, id, numero] = caminho.match(/^\/api\/(\w+)\/([^/]+)\/versions\/(\d+)$/);
    const item = itens.find((x) => x.colecao === colecao && x.id === id);
    return ler(`${EXPORTADO}/${item.versoes.find((v) => v.versao === Number(numero)).arquivo}`);
  },
};

let tudoIgual = true;
for (let i = 1; i <= 10; i += 1) {
  const normativa = `NOR-${String(i).padStart(2, '0')}`;
  const { foto } = ler(`${LAB}/evidencias/${normativa}/estado.json`);
  const registrado = ler(`${LAB}/evidencias/${normativa}/medidas.json`);

  const depois = structuredClone(foto);
  const publicacoes = [];
  for (const rotulo of registrado.versoes) {
    const [, nome, para] = rotulo.match(/^(.*) v(?:\d+→v)?(\d+)$/);
    const item = porNome(nome);
    depois[item.colecao][nome] = { id: item.id, versao: Number(para) };
    publicacoes.push(item.versoes.find((v) => v.versao === Number(para)).publicadaEm);
  }

  const medida = await medirMudanca(api, foto, depois);
  const igual = medida.elementos === registrado.elementos;
  tudoIgual &&= igual;

  const instancias = indice.instancias
    .filter((x) => x.normativa === normativa)
    .map((x) => {
      const aberta = publicacoes.every((quando) => x.iniciadaEm < quando && quando < x.encerradaEm);
      tudoIgual &&= aberta;
      return `${x.processo.split(' ')[0]} v${x.versao}, ${aberta ? 'aberta durante a publicação' : 'FORA DA JANELA'}, fim em ${x.fim}`;
    });

  console.log(`M${i}`.padEnd(4), `exportado=${medida.elementos}`.padEnd(14), `medidas.json=${registrado.elementos}`.padEnd(17), igual ? 'igual    ' : 'DIFERENTE', '|', instancias.join('; ') || 'sem instância em andamento');
}
console.log(tudoIgual ? '\nAs dez contagens batem com medidas.json, e as nove instâncias estavam abertas na publicação.' : '\nHÁ DIFERENÇA.');
process.exit(tudoIgual ? 0 : 1);
