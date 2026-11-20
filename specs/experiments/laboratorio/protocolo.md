# Protocolo do laboratório

- **Status:** Implementado no card [#296](https://github.com/lul-cas/chain/issues/296). As escolhas marcadas *[review]* foram feitas pelo agente de desenvolvimento, e podem mudar.
- **Parte de:** [Laboratório de avaliação do Chain](README.md).
- **Código:** `lab/agentes/` e `lab/conducao/`.

## 1. Quem faz o quê

| Quem | Faz | Sabe a resposta? |
|---|---|---|
| **Ana**, a analista de processos (LQ-03) | Lê a normativa, entende os processos pela API e aplica a mudança. | Não. É um agente de IA isolado (§2). |
| **Agente de desenvolvimento** | Faz os passos de admin (LQ-12), conduz as instâncias por roteiro (§4) e mede (§5). | Sim, por isso não modela nada. |

Os dois são agentes de IA, como manda LQ-04. *[review]* As instâncias das personas são conduzidas por roteiro, e não por um agente de IA em cada etapa. Elas não medem nada de um agente: servem para mostrar o que a versão faz. Um roteiro é reproduzível, e um agente por etapa custaria centenas de execuções sem mudar nenhum resultado.

## 2. Isolamento

Ana não pode ver a alteração prevista (LQ-11). Por isso cada execução é uma sessão nova de `claude -p`, sem as ferramentas embutidas e sem configurações do usuário, em uma pasta vazia. Ela não tem terminal, não lê arquivos e não vê o repositório. Só enxerga as ferramentas de `lab/agentes/`, que falam com a API do Chain com o token dela.

| Ferramenta | O que faz |
|---|---|
| `ler` | `GET` em um caminho da API. O layout sai da resposta, porque não tem significado. |
| `criar` | Cria um processo, formulário ou automação pelo nome. |
| `ajustar_rascunho` | Aplica operações JSON Patch ao rascunho. |
| `salvar_rascunho` | Troca o rascunho inteiro. |
| `validar` | Roda as regras de publicação sem publicar. |
| `publicar` | Publica o rascunho. |
| `pedir_ao_admin` | Registra um pedido do que só um admin pode fazer (LQ-12). |

A permissão é a do Chain: Ana é um bot em um grupo com Modeler, e o Chain recusa o que ela não pode fazer. Passar pela API é a escolha de LQ-05.

## 3. O que Ana recebe

| Parte | Conteúdo |
|---|---|
| Sistema | A persona e o [guia de quem modela](../../../lab/agentes/guia-do-modelador.md), que resume o que os documentos do Chain dizem sobre o formato dos modelos. |
| Mensagem | O texto da normativa, e o pedido para aplicá-la e dizer o que mudou. |

O guia descreve o produto, sem nada sobre as normativas. Ele diz que as referências são fixadas ao publicar, porque isso está nos documentos do Chain, mas não diz o que fazer a respeito: é a armadilha de [alteracoes-previstas.md](alteracoes-previstas.md) §3.

Ana usa o modelo Sonnet. Cada execução tem um limite de gasto, e fica registrada por inteiro.

## 4. Cada mudança

As mudanças são aplicadas na ordem de [normativas/README.md](normativas/README.md), uma de cada vez:

1. **Antes.** O roteiro deixa instâncias paradas onde a mudança vai mexer, e guarda as versões atuais.
2. **Mudança.** Ana recebe a normativa e trabalha até terminar.
3. **Admin.** Se ela pediu algo que só um admin faz, o agente de desenvolvimento faz, registra e devolve a palavra a ela.
4. **Depois.** O roteiro abre instâncias novas, e confere se a regra nova vale.
5. **Em andamento.** O roteiro leva até o fim as instâncias do passo 1, e confere a versão em que terminaram.
6. **Medida.** O agente de desenvolvimento registra Q1 a Q4 em [resultados.md](resultados.md).

**Se a regra nova não valer,** isso é um resultado. O agente de desenvolvimento registra, avisa Ana do que foi observado, sem dizer como resolver, e dá a ela uma nova chance. Cada chance conta.

**Se a mudança exigir código,** ela é só classificada (LQ-07). Se Ana tiver publicado uma aproximação, ela fica registrada e é desfeita, para a mudança seguinte partir de um estado conhecido.

## 5. Como medir

| Medida | Como |
|---|---|
| Q1: meio | Pelo que foi preciso: só o processo, um formulário, um passo de admin, ou código. |
| Q2: elementos | Comparando as versões publicadas, como em [alteracoes-previstas.md](alteracoes-previstas.md) §2. |
| Q3: reimplantação | Conferindo que os contêineres da stack são os mesmos do início. |
| Q4: em andamento | Pela versão em que as instâncias do passo 1 terminaram. |

## 6. Padrões de fluxo (R1)

O agente de desenvolvimento testa os 20 padrões por execução. Cada um tem um processo mínimo, que é publicado e executado. Cada padrão é classificado pelos critérios da própria iniciativa (van der Aalst et al., 2003, p. 45). É **direto** quando um construto da interface gráfica o expressa sem recorrer às soluções de contorno descritas para ele, **parcial** quando não há suporte direto mas um recurso próprio resolve o padrão em parte, e **ausente** quando só se chega a ele combinando outros construtos, apenas pela API ou com código. Os casos parecidos seguem as avaliações que os autores fizeram de 15 produtos.

*Alterado em 2026-11-10 (proprietário, card [#308](https://github.com/lul-cas/chain/issues/308)):* antes, direto era "um processo o expressa e ele se comporta como definido", parcial "só um contorno chega perto" e ausente "nada expressa o padrão".

## 7. Riscos que o artigo precisa declarar

- **Agentes não são usuários.** Os resultados não medem usabilidade nem compreensão dos modelos.
- **Um só modelo.** O resultado pode mudar com outro modelo ou outra execução, e cada mudança roda uma vez.
- **O guia foi escrito por quem conhece as respostas,** ainda que não fale delas.
- **Prompt injection** (ADR-0015 §8). O que Ana lê da API pode trazer texto escrito por pessoas. Aqui todo o conteúdo é fictício e foi escrito pelo laboratório, então o risco não se aplica. Em um uso real, ele se aplicaria.
- **O mock não é um sistema real.** As integrações respondem o previsto.
