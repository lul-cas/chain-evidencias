# Resultados do laboratório

- **Status:** Executado em 2026-11-06, pelo [protocolo](protocolo.md). O proprietário autorizou o merge em 2026-11-07.
- **Parte de:** [Laboratório de avaliação do Chain](README.md).
- **Evidências:** `lab/evidencias/` (R5).
- **Para o artigo:** [resultados-para-o-artigo.md](resultados-para-o-artigo.md).

**O Chain acompanhou 8 das 10 mudanças sem alterar código nem reimplantar o sistema.** As 2 restantes exigem mudar o motor, e são as previstas: paralelismo e temporizador. Em todas as mudanças publicadas, as instâncias em andamento concluíram na versão em que começaram.

## 1. R1: padrões de fluxo

Cada padrão foi testado por execução em 2026-11-06 (`lab/evidencias/padroes.json`) e classificado pelos critérios da própria iniciativa dos padrões (van der Aalst, ter Hofstede, Kiepuszewski e Barros, *Workflow Patterns*, 2003, p. 45): **4 diretos, 1 parcial e 15 ausentes**. Direto exige um construto da interface gráfica que expresse o padrão sem recorrer às soluções de contorno descritas para ele. Combinar outros construtos, recorrer só à API ou a código conta como ausente. Os casos parecidos seguem as avaliações que os autores fizeram de 15 produtos, nos apêndices do artigo.

*Revisto em 2026-11-10 (card [#308](https://github.com/lul-cas/chain/issues/308)):* até então valiam os critérios do protocolo (§6 de [protocolo.md](protocolo.md)), mais brandos, que davam 5 diretos, 8 parciais e 7 ausentes. As execuções são as mesmas. Só a classificação mudou, nos padrões 6, 11 a 15, 17 e 20.

| Categoria | Padrão | Suporte | O que comprova |
|---|---|---|---|
| Básicos | 1 Sequência | Direto | Cada etapa só abre depois da anterior. |
| | 2 Divisão paralela | Ausente | Dois fluxos saindo de uma etapa são recusados (`WF005`). O motor tem um só token. |
| | 3 Sincronização | Ausente | Sem divisão paralela, não há o que sincronizar. Um nó com duas entradas segue na primeira que chega. |
| | 4 Escolha exclusiva | Direto | Um gateway segue um só ramo, por condição ou decisão de uma pessoa. |
| | 5 Junção simples | Direto | Dois ramos chegam ao mesmo nó, que roda uma vez. |
| Ramificação e sincronização avançadas | 6 Escolha múltipla | Ausente | Gateways em cadeia executam vários ramos, mas um depois do outro. Combinar construtos não conta (p. 45), e Staffware e FLOWer, com decisão binária, receberam `-`. |
| | 7 Junção sincronizada | Ausente | Não há gateway inclusivo (`WF000`), nem ramos simultâneos. |
| | 8 Junção múltipla | Ausente | Exige ramos simultâneos (`WF005`). |
| | 9 Discriminador | Ausente | Não há gateway complexo (`WF000`), nem ramos simultâneos. |
| Estruturais | 10 Ciclos arbitrários | Direto | Um fluxo de volta cria uma tarefa nova a cada passagem. |
| | 11 Término implícito | Ausente | O fim precisa estar no modelo (`WF005`, `WF008`, `WF009`). Com um só token, chegar a ele encerra o pedido. Como no COSA (`-`): "explicit termination is needed". |
| Múltiplas instâncias | 12 Sem sincronização | Ausente | O modelo não cria instâncias. Pedidos abertos pela API, um a um, correm como casos separados, sem vínculo entre si. |
| | 13 Conhecidas no projeto | Ausente | Subprocessos em sequência rodam e sincronizam, um de cada vez. Os `+` dos produtos vêm de divisão e junção paralelas, que o Chain recusa (`WF005`). |
| | 14 Conhecidas na execução | Ausente | Um laço com contador repete a etapa, uma vez de cada vez, sem instâncias simultâneas. |
| | 15 Desconhecidas na execução | Ausente | Uma decisão humana a cada volta define se há outra, uma de cada vez, sem instâncias simultâneas. |
| Baseados em estado | 16 Escolha adiada | Parcial | Uma decisão humana adia a escolha, mas é uma tarefa só, e não uma disputa entre eventos. É como a *user decision* do FLOWer, que recebeu `+/-`. |
| | 17 Roteamento intercalado | Ausente | Cada ordem precisa ser desenhada, e o número de caminhos cresce em fatorial. É a solução "spaghetti-like" que os autores avaliam com `-`. |
| | 18 Marco | Ausente | Não há esse construto (`WF000`), e o padrão pede um ramo paralelo. |
| Cancelamento | 19 Cancelar atividade | Ausente | Não há evento de borda (`WF000`), e a API não cancela uma tarefa sozinha (404). |
| | 20 Cancelar caso | Ausente | Encerrar um pedido na tela, com justificativa, cancela as tarefas abertas, mas é uma ação manual, sem construto no modelo. Segue o InConcert (`-`); FLOWer (`+/-`) e Domino (`+`) divergem. |

Os ausentes têm quase todos a mesma causa: dos 15, 11 dependem de mais de um ramo ativo ao mesmo tempo, ou de instâncias simultâneas, que o motor não tem (2, 3, 6 a 9, 12 a 15 e 18). Os outros são o término implícito, o roteamento intercalado e os dois cancelamentos.

## 2. R2: processos modelados

- **Processos:** os 8 da onda 1, com 23 formulários e 28 automações, publicados pelas regras reais do Chain ([cadastro.md](cadastro.md)).
- **Instâncias antes das mudanças:** 67, sendo 46 pedidos e 21 subprocessos, todas concluídas. Elas percorreram os 144 nós e os 104 ramos da onda 1.

| Processo | CTB-01 | CAD-01 | CAD-02 | CAD-03 | SEG-01 | CRE-02 | CRE-01 | CRE-03 |
|---|---|---|---|---|---|---|---|---|
| Instâncias | 11 | 12 | 4 | 5 | 5 | 11 | 14 | 5 |

- **Ajustes para modelar:** 15 contornos. A lista de [processos/README.md](processos/README.md) §4 tem 18, mas é do catálogo inteiro, e 3 só aparecem fora da onda 1. Os principais vêm da falta de paralelismo, de temporizadores e de uma etapa que aguarde um retorno, e de cada instância não ler os dados de outra.

## 3. R3: cada mudança

| Mudança | Normativa | Meio | Elementos | Reimplantação | Em andamento |
|---|---|---|---|---|---|
| M1 | [NOR-01](normativas/nor-01-operacoes-de-maior-risco.md) | Modelo | 1 | Não | Concluiu na versão em que começou |
| M2 | [NOR-02](normativas/nor-02-alcada-do-analista.md) | Modelo | 1 | Não | Concluiu na versão em que começou |
| M3 | [NOR-03](normativas/nor-03-analise-simultanea.md) | Código (motor) | — | Seria necessária | Não se aplica |
| M4 | [NOR-04](normativas/nor-04-origem-dos-recursos.md) | Modelo e formulário | 2 | Não | Concluiu na versão em que começou |
| M5 | [NOR-05](normativas/nor-05-segregacao-da-formalizacao.md) | Modelo e configuração | 2 | Não | Concluiu na versão em que começou |
| M6 | [NOR-06](normativas/nor-06-comunicacao-ao-regulador.md) | Modelo e configuração | 4 | Não | Concluiu na versão em que começou |
| M7 | [NOR-07](normativas/nor-07-verificacao-unica.md) | Modelo e formulário | 25 | Não | As duas concluíram na versão em que começaram |
| M8 | [NOR-08](normativas/nor-08-boleto-do-acordo.md) | Modelo | 3 | Não | Concluiu na versão em que começou |
| M9 | [NOR-09](normativas/nor-09-prazo-da-analise.md) | Código (motor) | — | Seria necessária | Não se aplica |
| M10 | [NOR-10](normativas/nor-10-entrada-de-empresas.md) | Modelo | 9 | Não | Concluiu na versão em que começou |

- **Reimplantação:** os contêineres da stack são os mesmos da linha de base ao fim de tudo, então nenhum serviço foi reconstruído ou reiniciado.
- **Em andamento:** 9 instâncias ficaram paradas antes das mudanças, inclusive uma em uma etapa que a versão nova removeu (M10). Nenhuma migrou, e nenhuma apresentou erro.
- **Regressão:** depois das dez mudanças, 47 caminhos rodaram sobre as versões finais. Passaram 44, e 3 falharam, exatamente os declarados antes de rodar, porque NOR-02 e NOR-10 mudaram de propósito o que eles esperavam (`lab/evidencias/regressao.json`).

## 4. R4: síntese

| Meio | Mudanças | Quantas |
|---|---|---|
| Só o modelo | M1, M2, M8, M10 | 4 |
| Modelo e formulário ou configuração | M4, M5, M6, M7 | 4 |
| Código | M3, M9 | 2 |

**Por que M3 e M9 exigem código.** As duas esbarram no mesmo limite que R1 mostra: M3 precisa da divisão paralela e da sincronização (padrões 2 e 3), e M9 de um evento que interrompa uma tarefa (padrão 19). O alcance é o motor, não um processo específico. Os padrões sem suporte que nem um contorno reproduz, como estes três, delimitaram de antemão as mudanças que o modelo não alcança. Pelos critérios originais (§1), outros padrões também são ausentes, como o 6, o 13 e o 17, mas um contorno ainda os aproxima sem código.

**A configuração foi pequena.** M5 pediu um grupo e uma persona, e M6 um destino e uma credencial. Nenhuma das duas mexeu em código.

## 5. Previsto e observado

O resultado bateu com [alteracoes-previstas.md](alteracoes-previstas.md) em tudo, exceto em um número:

| Mudança | Previsto | Observado | Por quê |
|---|---|---|---|
| M1 | 4 elementos | 1 elemento | Ana mudou a condição de um gateway existente, em vez de criar um novo. É mais simples que o gabarito, e o comportamento é o pedido. |

**A armadilha da versão fixada não pegou.** Nas quatro mudanças em que era preciso republicar o pai (M1, M2, M4 e M7), Ana republicou sem ninguém pedir. O guia só dizia que as referências são fixadas ao publicar. O cuidado existe, mas um modelador menos atento cairia nele: ele continua sendo um risco do produto.

**Ana não precisou de segunda chance.** Em toda mudança possível, a regra nova valeu na primeira tentativa. Nas duas impossíveis, ela explicou o que faltava e não publicou nada, embora tenha considerado as aproximações, como pôr a Supervisão antes do analista.

| Mudança | Execuções | Turnos | Tempo | Custo |
|---|---|---|---|---|
| M1 | 1 | 15 | 26 s | US$ 0,28 |
| M2 | 1 | 13 | 22 s | US$ 0,16 |
| M3 | 1 | 7 | 12 s | US$ 0,07 |
| M4 | 1 | 18 | 32 s | US$ 0,19 |
| M5 | 2 | 13 | 27 s | US$ 0,27 |
| M6 | 2 | 21 | 41 s | US$ 0,34 |
| M7 | 1 | 27 | 51 s | US$ 0,31 |
| M8 | 1 | 9 | 16 s | US$ 0,09 |
| M9 | 1 | 8 | 15 s | US$ 0,10 |
| M10 | 1 | 8 | 17 s | US$ 0,07 |
| **Total** | **12** | **139** | **259 s** | **US$ 1,88** |

M5 e M6 têm duas execuções porque Ana parou para pedir os passos de admin. O tempo não é medida do laboratório (LQ-06): está aqui só para mostrar o custo de rodar.

## 6. Desvios do protocolo

Nenhum muda os resultados, mas todos ficaram registrados:

| Onde | O que aconteceu | Consequência |
|---|---|---|
| M5 | Um erro em `rodar.mjs` impediu retomar a sessão de Ana, e o `fechar` rodou antes da mudança, consumindo a instância parada. | Ana não tinha mudado nada. O erro foi corrigido, e o passo foi refeito com uma instância nova, parada antes da mudança. |
| M6 | O passo `antes` falhou porque o roteiro usou o cliente cuja assinatura demora, e o estado precisou ser reconstruído. | A instância já estava parada na versão 4, antes de Ana mudar, então é uma instância em andamento válida. O roteiro foi corrigido. |
| Regressão | A primeira rodada teve 2 falhas não declaradas, porque o roteiro não reenviava o valor preenchido do campo novo. | O 422 estava certo: era NOR-04 valendo. O roteiro passou a reenviar o valor, como a tela faz, e a rodada foi refeita inteira. |
| Instâncias | 5 instâncias foram encerradas à mão, das rodadas que falharam. | Não entram em nenhum número acima. |

## 7. R5: evidências

| Arquivo | O que guarda |
|---|---|
| `lab/evidencias/NOR-xx/execucao-n/transcricao.jsonl` | A sessão de Ana, inteira |
| `lab/evidencias/NOR-xx/execucao-n/chamadas.jsonl` | Cada ferramenta que ela chamou |
| `lab/evidencias/NOR-xx/execucao-n/pedidos.jsonl` | O que ela pediu ao admin |
| `lab/evidencias/NOR-xx/admin.json` | O que o admin fez |
| `lab/evidencias/NOR-xx/medidas.json` | Q2, Q3 e Q4 da mudança |
| `lab/evidencias/linha-de-base.json`, `regressao.json`, `padroes.json`, `final.json` | O antes, a regressão, R1 e o estado final |
| `lab/evidencias/personas.json` | Quem atuou nas instâncias e por qual canal, lido das linhas do tempo em 2026-11-07 |

Toda sessão de Ana enxergou só as 7 ferramentas do protocolo: `rodar.mjs` recusa uma execução que veja outra.

As versões publicadas e as linhas do tempo ficam na stack `chain-lab`. Ao fim, ela tem CAD-01 v4, CAD-02 v2, CAD-03 v1, CAD-04 v1, CRE-01 v6, CRE-02 v3, CRE-03 v2, CTB-01 v1 e SEG-01 v1, com nenhuma instância em andamento e nenhum incidente aberto.
