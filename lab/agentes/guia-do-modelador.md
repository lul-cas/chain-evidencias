# Guia de quem modela no Chain

O Chain executa processos descritos em JSON. Cada processo, formulário e automação tem um **rascunho**, que você edita, e **versões** publicadas, que não mudam. Uma instância (um pedido) usa a versão que era a mais recente quando ela começou, até o fim.

## Onde olhar

Com a ferramenta `ler`:

| Caminho | O que traz |
|---|---|
| `/api/workflows` | Os processos: `id`, `name`, `latestVersion` |
| `/api/workflows/{id}` | O processo, com o rascunho em `draft` |
| `/api/workflows/{id}/versions/{n}` | Uma versão publicada |
| `/api/workflows/{id}/data-catalog` | As chaves de dados disponíveis em cada etapa, com tipos |
| `/api/workflows/groups` | Os grupos que uma raia pode usar |
| `/api/forms`, `/api/forms/{id}` | Os formulários, com o rascunho em `draft` |
| `/api/automations`, `/api/automations/{id}` | As automações, com o rascunho em `draft` |
| `/api/automations/resources` | Os destinos e credenciais que uma automação pode usar |

## Como mudar

1. `criar`, se for algo novo.
2. `ajustar_rascunho`, com operações JSON Patch (`add`, `remove`, `replace`), ou `salvar_rascunho`, com o documento inteiro.
3. `validar`, que lista todos os problemas.
4. `publicar`, que cria uma nova versão.

**Ao publicar, cada referência a um formulário, automação ou subprocesso é fixada na versão publicada mais recente naquele momento.** Uma versão publicada nunca muda.

Grupos, destinos, credenciais e bots são criados por um admin. Você só os usa, e pede com `pedir_ao_admin`.

## Processo

```json
{
  "schemaVersion": 1,
  "lanes": [{ "id": "lane_a", "title": "Título", "group": { "kind": "group", "groupId": "<id>" } }],
  "nodes": [],
  "flows": [{ "id": "f_1", "source": "a", "target": "b" }]
}
```

Uma raia aponta para um grupo, cujos membros fazem as etapas dela, ou para `{ "kind": "requesters" }`, que é quem abriu o pedido.

| Nó | Campos |
|---|---|
| Início | `{ "id", "type": "start", "label", "laneId", "form": { "formId" } }`. Exatamente um, com um fluxo de saída. |
| Etapa humana | `{ "id", "type": "task", "taskKind": "human", "label", "laneId", "form": { "formId" } }`. O formulário é opcional. Um fluxo de saída. |
| Etapa automática | `{ "id", "type": "task", "taskKind": "automation", "label", "laneId", "automation": { "automationId", "inputs": {}, "outputs": {} } }`. Um fluxo de saída. |
| Subprocesso | `{ "id", "type": "task", "taskKind": "subprocess", "label", "laneId", "workflow": { "workflowId", "inputs": {}, "outputs": {} } }`. Um fluxo de saída. O pai espera o filho terminar. |
| Decisão humana | `{ "id", "type": "gateway", "label", "laneId", "decisionMode": "human", "question" }` |
| Decisão automática | `{ "id", "type": "gateway", "label", "laneId", "decisionMode": "automatic", "condition" }` |
| Fim | `{ "id", "type": "end", "label", "laneId" }` |

Uma decisão tem exatamente dois fluxos de saída, com `"branch": "true"` e `"branch": "false"`. Fluxos de volta a etapas anteriores são permitidos. De todo nó deve ser possível chegar a um fim. Não há outros tipos de nó.

**Dados.** Cada pedido tem um objeto de dados. Formulários escrevem as chaves dos seus campos, e as etapas automáticas e os subprocessos escrevem as chaves de `outputs`.

**Mapeamentos.** `inputs` é `{ "chaveDeEntrada": valor }`, lido dos dados do pedido. `outputs` é `{ "chaveDoPedido": valor }`, lido da saída da automação ou dos dados do subprocesso. Sem mapeamento, nada entra e nada volta.

Um subprocesso que tem formulário de início recebe nos `inputs` os campos desse formulário, e não recebe arquivos.

## Expressões

Valores:

```json
{ "kind": "path", "path": ["endereco", "cep"] }
{ "kind": "literal", "type": "text", "value": "x" }
{ "kind": "literal", "type": "number", "value": "100" }
{ "kind": "literal", "type": "boolean", "value": "true" }
{ "kind": "system", "name": "currentDate" }
{ "kind": "system", "name": "currentDate", "offset": { "amount": 15, "unit": "days" } }
{ "kind": "arithmetic", "op": "add", "left": {}, "right": {} }
{ "kind": "call", "function": "round", "args": [{}, { "kind": "literal", "type": "number", "value": "2" }] }
```

Condições:

```json
{ "kind": "compare", "left": {}, "operator": "equals", "right": {} }
{ "kind": "compare", "left": {}, "operator": "isEmpty" }
{ "kind": "group", "op": "and", "items": [] }
```

Os operadores são `equals`, `notEquals`, `greaterThan`, `lessThan`, `greaterOrEqual`, `lessOrEqual`, `contains`, `isEmpty` e `isNotEmpty`. Um valor ausente torna qualquer comparação falsa, exceto `notEquals`. Um checkbox desmarcado apaga a chave.

## Formulário

```json
{
  "schemaVersion": 1,
  "components": [
    { "type": "text", "key": "nome", "label": "Nome", "validate": { "required": true, "maxLength": 100 } },
    { "type": "select", "key": "tipo", "label": "Tipo", "options": [{ "value": "a", "label": "A" }], "validate": { "required": true } },
    { "type": "number", "key": "valor", "label": "Valor", "readOnly": true }
  ]
}
```

Os tipos são `text`, `textarea`, `number`, `checkbox`, `select`, `radio`, `checklist`, `date`, `datetime`, `time`, `file`, `group`, `dynamicList` e `computed`.

- `readOnly: true` mostra um valor que veio de uma etapa anterior.
- `visibleWhen` e `requiredWhen` recebem uma condição.
- `validate` aceita `required`, `minLength`, `maxLength`, `min`, `max`, `decimalDigits`, `format` (`email`, `cpf`, `cnpj`, `phone`, `cep`), `pattern`, `maxFiles`, `minRows` e `maxRows`.
- `sensitive: true` esconde o valor de quem não pode vê-lo.
- `computed` recebe `expression`.

Um processo usa a versão do formulário que estava publicada quando ele foi publicado.

## Automação

Uma automação é uma chamada HTTP a um destino cadastrado:

```json
{
  "schemaVersion": 1,
  "kind": "http",
  "inputs": [{ "key": "numero", "type": "text", "required": true }],
  "request": {
    "method": "POST",
    "destination": "nome-do-destino",
    "path": "/caminho/{numero}",
    "query": {},
    "headers": { "X-Api-Key": "{{secret:nome_da_credencial}}", "Accept": "application/json" },
    "auth": null,
    "body": { "type": "json", "keys": ["numero"] }
  },
  "response": { "type": "json" },
  "outputs": [{ "key": "protocolo", "type": "text", "required": true, "source": "body", "path": ["protocolo"] }]
}
```

Os tipos são `text`, `number`, `boolean`, `date`, `datetime`, `time`, `object` e `list<text>`. Uma entrada em `{chave}` no caminho não vai no corpo, e `GET` não tem corpo.
