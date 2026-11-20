# Cadastro dos processos no Chain

- **Status:** Implementado no card [#292](https://github.com/lul-cas/chain/issues/292).
- **Parte de:** [Laboratório de avaliação do Chain](README.md).
- **Código:** `lab/cadastro/`.

## 1. Propósito

O cadastro leva a onda 1 (LQ-15) das specs para um Chain em execução, pela API HTTP. Os documentos de `processos/` continuam sendo a fonte de verdade: o programa os lê e monta os JSONs. Assim, nada é escrito duas vezes, e quem decide se um modelo é válido são as regras reais de publicação do Chain.

Ele é o passo inicial do laboratório, e cria a versão 1 dos processos. **As mudanças do laboratório não passam por aqui:** quem as faz são os agentes das personas, pela API (LQ-05).

## 2. O que ele cria

Quem executa é o agente de desenvolvimento, com a conta admin (LQ-12). A ordem é a de [processos/README.md](processos/README.md) §7.

| Recurso | De onde vem | Nome no Chain |
|---|---|---|
| Grupos | As raias e as permissões da onda 1, e `Processos`, com Modeler (LQ-03) | O nome do grupo |
| Bots de persona | *Configuração no Chain* de cada setor | `persona-<nome>`, sem acentos |
| Bot de integração | [sistemas-externos.md](sistemas-externos.md) §6 | `bot-core-bancario` |
| Destinos e credenciais | [sistemas-externos.md](sistemas-externos.md) §4 | O nome da tabela |
| Automações | [sistemas-externos.md](sistemas-externos.md) §5 | `AUT-CORE-01 Buscar cliente` |
| Formulários | Os processos | `F-CAD-01 Cadastro do cliente` |
| Processos | Os processos | `CAD-01 Abertura de conta` |
| Permissões | [processos/README.md](processos/README.md) §5 | — |

Só entra o que a onda 1 usa. Um bot de persona tem MCP ligado, e o token dele fica em `lab/.segredos/bots.json`.

**Pode rodar de novo.** O que já existe é reaproveitado pelo nome, e um documento igual não cria versão nova. Um processo só muda de versão quando a spec muda.

## 3. Da notação para o JSON

### 3.1 Expressões

Valem para condições de gateway, `visível quando`, `obrigatório quando`, campos calculados e mapeamentos. O formato de destino é o de [expression-language.md](../../modules/expression-language.md) §5.

| Notação | Árvore |
|---|---|
| `a = "x"`, `a ≠ "x"` | `compare` com `equals`, `notEquals` |
| `a > 1`, `a < 1`, `a >= 1`, `a <= 1` | `compare` com `greaterThan`, `lessThan`, `greaterOrEqual`, `lessOrEqual` |
| `a contém "x"` | `compare` com `contains` |
| `a não está vazio`, `a está vazio` | `compare` com `isNotEmpty`, `isEmpty` |
| `x E y`, `x OU y` | `group` com `and`, `or`. `E` liga mais forte que `OU`. |
| `a.b` | `path` com `["a", "b"]` |
| `hoje`, `hoje + 15 dias`, `hoje − 18 anos` | `system` `currentDate`, com `offset` |
| `(a + b) ÷ c × 100`, `a − b` | `arithmetic` |
| `round(a, 2)` | `call` |
| `"texto"`, `10`, `0.3`, `true` | `literal` |

### 3.2 Campos de formulário

| Regra | JSON |
|---|---|
| `obrigatório` | `validate.required` |
| `somente leitura` | `readOnly` |
| `sensível` | `sensitive` |
| `visível quando` | `visibleWhen` |
| `obrigatório quando` | `requiredWhen` |
| `opções:` | `options`. O texto depois do valor é o rótulo; sem texto, o rótulo é o próprio valor. `as de F-X` copia as do campo de mesma chave. |
| `máx. 500 caracteres` | `validate.maxLength` |
| `mín. 1`, `máx. 10` | `validate.min`, `validate.max`, com vírgula decimal. Em datas, `hoje` e `hoje − 18 anos` viram um limite relativo. |
| `2 casas` | `validate.decimalDigits` |
| `formato` | `validate.format` |
| `padrão` | `validate.pattern` |
| `máx. 3 arquivos` | `validate.maxFiles` |
| `mín. 1 linha`, `máx. 10 linhas` | `validate.minRows`, `validate.maxRows` |
| `= expressão` | `expression`, em um campo `computed` |

Uma chave `a.b` é um campo dentro do grupo `a`, e `a.b[].c`, uma coluna da lista `a.b`.

### 3.3 Automações

| Documento | JSON |
|---|---|
| Entradas `chave:tipo*` | `inputs`, com `required` |
| Saídas `chave:tipo*` | `outputs`, lidas do corpo pelo próprio nome |
| `{chave}` na chamada | `request.path`. Essas entradas não vão no corpo. |
| Demais entradas de `POST` e `PUT` | `request.body.keys`. Sem nenhuma, não há corpo. |
| Credencial do destino | `X-Api-Key: {{secret:<nome>}}` |

Execução, retentativas e idempotência ficam nos valores padrão ([sistemas-externos.md](sistemas-externos.md) §4).

### 3.4 Processos

- Cada `subgraph` do diagrama vira uma raia. `Solicitantes` tem o grupo `requesters`.
- Cada nó vira um `node`, com o tipo da forma do diagrama ([processos/README.md](processos/README.md) §6).
- `sim` e `não` viram `branch` `true` e `false`.
- As perguntas e condições vêm de *Decisões*, os mapeamentos de *Mapeamentos*, e as referências da coluna *Usa* de *Etapas*.
- **O layout é calculado.** Cada nó fica em uma coluna pela distância até o início, e na faixa da sua raia. Ele não tem significado na execução, e pode ser ajustado no editor.

## 4. Verificação

`lab/cadastro/verificar.mjs` roda 47 caminhos reais pelas personas, com as automações batendo no mock, e confere o desfecho de cada um. Três deles conferem segurança: quem vê um dado sensível, quem vê um pedido e quem pode agir nele. Ao fim, ele lê as linhas do tempo do Chain e falha se algum nó ou ramo da onda 1 não foi percorrido.

É uma verificação da montagem, não o laboratório: as instâncias do laboratório são conduzidas por agentes (LQ-04). **Essas instâncias não contam para R2.** Depois de verificar, a stack é recriada, para o laboratório começar limpo:

```sh
lab/stack.sh destroy && lab/stack.sh up && node lab/cadastro/cadastrar.mjs
```

## 5. Critérios de aceite

1. Toda expressão, campo e automação da onda 1 é traduzida, e o que a notação não previr é um erro, não um silêncio.
2. Os 8 processos publicam sem erro, pelas regras reais do Chain.
3. Rodar duas vezes não cria versões novas.
4. `verificar.mjs` leva todos os caminhos ao desfecho esperado, passando pelo mock, e percorre todos os nós e ramos da onda 1.
