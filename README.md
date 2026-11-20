# Pacote de evidências

Evidências da avaliação relatada no artigo "Execução de modelos BPMN para a adaptação de um ERP a mudanças nos processos de negócio", de Lucas Eduardo Fedum Fernandes (2026). O artigo remete a este pacote na Seção 3.1.

## Versão avaliada do protótipo

O protótipo avaliado é o Chain no commit `d99b1f4f6959dd7dd6c4831c00abf493c0931535` do repositório de desenvolvimento, que é privado. O [repositório do protótipo](https://github.com/lul-cas/chain-prototipo), que acompanha este pacote, traz o código-fonte dessa versão, em um único commit, sem a documentação interna de desenvolvimento.

O laboratório foi executado em 06/11/2026 sobre essa versão. Os arquivos de `lab/` e `specs/` deste pacote vêm, sem alteração, do commit `b6a6c04b77630017fbe7e901fb5c7a8bbca09688` do mesmo repositório, de 10/11/2026, que já inclui a reclassificação dos padrões de fluxo feita nesse dia, sem nova execução.

O pacote é uma seleção: traz o que foi avaliado, como foi avaliado e o que ficou registrado. Alguns documentos citam arquivos do repositório de desenvolvimento que não estão aqui.

## Onde está cada item

As mudanças M1 a M10 do artigo correspondem às normativas NOR-01 a NOR-10.

| Item citado no artigo | Onde está |
|---|---|
| Modelos dos processos, como foram cadastrados antes das mudanças | `specs/experiments/laboratorio/processos/`, registrados no protótipo por `lab/cadastro/` |
| Setores e personas do banco fictício | `specs/experiments/laboratorio/setores/` |
| Sistemas externos simulados | `specs/experiments/laboratorio/sistemas-externos.md` e `lab/mock/` |
| Normativas, na íntegra | `specs/experiments/laboratorio/normativas/` |
| Alterações previstas e regra de contagem de elementos | `specs/experiments/laboratorio/alteracoes-previstas.md` |
| Protocolo e critério de aceite de cada mudança | `specs/experiments/laboratorio/protocolo.md`, §4 |
| Roteiros e scripts de medição | `lab/conducao/` |
| Instruções da analista: persona, guia e ferramentas | `lab/agentes/` |
| Registros de cada mudança | `lab/evidencias/NOR-01/` a `lab/evidencias/NOR-10/` |
| Padrões de fluxo | `lab/conducao/padroes.mjs` e `lab/evidencias/padroes.json` |
| Resultados do laboratório | `specs/experiments/laboratorio/resultados.md` |
| Conferência do autor | `conferencia_manual.md` |
| Recontagem de Q2 por outro caminho | `recontagem_q2.py` |
| Versões publicadas de cada processo, formulário e automação, antes e depois de cada mudança | `stack/processos/`, `stack/formularios/`, `stack/automacoes/` e `stack/indice.json` |
| Linha do tempo das instâncias deixadas em andamento (Q4) | `stack/instancias/` |

Cada pasta `lab/evidencias/NOR-xx/` tem:

| Arquivo | O que guarda |
|---|---|
| `execucao-n/mensagem.md` | A mensagem que a analista recebeu: a normativa ou, numa retomada, o aviso do administrador. |
| `execucao-n/transcricao.jsonl` | O registro completo da sessão da analista. |
| `execucao-n/chamadas.jsonl` | Cada chamada que ela fez à API do protótipo. |
| `execucao-n/pedidos.jsonl` | O que ela pediu ao administrador (só em M5 e M6). |
| `execucao-n/resumo.json` | Modelo, ferramentas, turnos, custo e a resposta final da sessão. |
| `admin.json` | Os passos de administração feitos (só em M5 e M6). |
| `estado.json` | A foto das versões antes da mudança e os contêineres da stack. |
| `medidas.json` | Os elementos contados (Q2), as versões publicadas, a comparação dos contêineres (Q3) e as instâncias em andamento (Q4). |

Em M3 e M9 a analista não publicou nada. A resposta dela está em `lab/evidencias/NOR-03/execucao-1/resumo.json` e `lab/evidencias/NOR-09/execucao-1/resumo.json`.

Os documentos citam caminhos a partir de `~/codes/chain`, a pasta do repositório de desenvolvimento. Aqui, esses caminhos partem da raiz do pacote.

## Como conferir a contagem de elementos

```sh
python3 recontagem_q2.py lab
```

O script reconta Q2 a partir das transcrições, sem usar o script de medição do laboratório, e compara o resultado com `medidas.json`. As dez mudanças dão 1, 1, 0, 2, 2, 4, 25, 3, 0 e 9. O cabeçalho do script diz o que ele supõe.

```sh
node stack/recontar.mjs lab stack
```

Este segundo script refaz a medição do laboratório (`lab/conducao/medicao.mjs`) sobre as versões publicadas que estão em `stack/`, sem a stack, e compara o total com `medidas.json`. Confere também se cada instância deixada em andamento estava aberta quando a versão nova foi publicada. Quais versões entram em cada comparação vem do registro do laboratório; o que se refaz é a contagem.

## O que foi exportado da stack

A pasta `stack/` foi exportada em 20/11/2026 do banco de dados da stack do laboratório, por `stack/exportar.py`, que só faz leituras pela API do protótipo. Os contêineres da API e do banco eram os mesmos da avaliação (`098b1fe986d9` e `cdd264d27e94`, como em `lab/evidencias/linha-de-base.json`).

| Pasta ou arquivo | O que guarda |
|---|---|
| `stack/processos/<código>/v<n>.json` | Cada versão publicada de cada processo: número, data de publicação, hash e o documento do modelo. Os processos `PAD-xx` são os processos mínimos dos padrões de fluxo. |
| `stack/formularios/<código>/v<n>.json` | Cada versão publicada de cada formulário. |
| `stack/automacoes/<código>/v<n>.json` | Cada versão publicada de cada automação. As credenciais aparecem só pelo nome. |
| `stack/instancias/NOR-xx-<id>.json` | A instância deixada em andamento em cada mudança, com a linha do tempo: em que versão começou, onde estava parada e onde terminou. São nove: uma em M1, M2, M4, M5, M6, M8 e M10 e duas em M7. |
| `stack/indice.json` | A lista do que foi exportado, com a data de publicação e o hash de cada versão. |

Cada arquivo é a resposta da API, sem alteração. Os dados de clientes são fictícios.

## O que não está aqui

- As senhas e os tokens gerados pelo laboratório (`lab/.segredos/`).
- O banco de dados da stack do laboratório. Dele vieram as versões publicadas e as linhas do tempo das nove instâncias deixadas em andamento (`stack/`); as demais instâncias não foram exportadas.
