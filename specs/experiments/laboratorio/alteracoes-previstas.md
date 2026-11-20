# Alterações previstas

- **Status:** Approved pelo proprietário em 2026-11-06.
- **Parte de:** [Laboratório de avaliação do Chain](README.md).
- **Normativas:** [normativas/](normativas/README.md).

**Este arquivo não é entregue aos agentes** (LQ-11). Ele é o gabarito: define, para cada normativa, o que se espera que mude, para comparar com o que os agentes fizerem. O que conta é o comportamento, não o desenho. Um agente pode resolver de outro jeito, e isso é um resultado, não um erro.

## 1. Visão geral

Os elementos afetados são os mesmos do Quadro 2 do artigo. Só o cenário muda.

| Mudança | Normativa | Processo | Elemento afetado | Q1: meio | Q2: elementos | Q3: reimplanta? | Q4: em andamento |
|---|---|---|---|---|---|---|---|
| M1 | [NOR-01](normativas/nor-01-operacoes-de-maior-risco.md) | CRE-02 | Escolha exclusiva | Modelo | 4 | Não | Concluem na versão em que começaram |
| M2 | [NOR-02](normativas/nor-02-alcada-do-analista.md) | CRE-02 | Condição do gateway | Modelo | 1 | Não | Concluem na versão em que começaram |
| M3 | [NOR-03](normativas/nor-03-analise-simultanea.md) | CAD-01 | Divisão paralela e sincronização | Código (motor) | — | Sim | Não se aplica |
| M4 | [NOR-04](normativas/nor-04-origem-dos-recursos.md) | CAD-01 | Formulário | Modelo e formulário | 2 | Não | Concluem na versão em que começaram |
| M5 | [NOR-05](normativas/nor-05-segregacao-da-formalizacao.md) | CRE-01 | Papéis e permissões | Modelo e configuração | 2 | Não | Concluem na versão em que começaram |
| M6 | [NOR-06](normativas/nor-06-comunicacao-ao-regulador.md) | CRE-01 | Integração | Modelo e configuração | 4 | Não | Concluem na versão em que começaram |
| M7 | [NOR-07](normativas/nor-07-verificacao-unica.md) | CAD-01, CAD-02 | Subprocesso | Modelo e formulário | 25 | Não | Concluem na versão em que começaram |
| M8 | [NOR-08](normativas/nor-08-boleto-do-acordo.md) | CRE-03 | Sequência | Modelo | 3 | Não | Concluem na versão em que começaram |
| M9 | [NOR-09](normativas/nor-09-prazo-da-analise.md) | CRE-02 | Cancelar atividade | Código (motor) | — | Sim | Não se aplica |
| M10 | [NOR-10](normativas/nor-10-entrada-de-empresas.md) | CAD-01 | Sequência | Modelo | 9 | Não | Concluem na versão em que começaram |

Em resumo, a previsão é de 4 mudanças só no modelo, 4 com formulário ou configuração, e 2 que exigem código.

M3 e M9 são as que provavelmente exigem código, como pede LQ-08. Elas são só classificadas (LQ-07): o Q3 "sim" diz o que aconteceria se fossem implementadas.

## 2. Como contar Q2

Q2 compara a versão publicada antes e a depois da mudança, ignorando o layout e as versões fixadas.

- **Um elemento** é um nó, um fluxo, uma raia, um campo de formulário ou uma automação que foi criado, alterado ou removido.
- **Um fluxo é identificado pela origem e pelo ramo,** que são únicos no Chain. Assim, mudar o destino conta como uma alteração, e recriar um fluxo com outro id não conta a mais.
- **Republicar um pai** só para fixar a versão nova de um filho conta zero elementos, mas gera uma versão.
- **Passos de admin** não contam em Q2: eles entram em Q1, como configuração (LQ-12).

## 3. A armadilha da versão fixada

**Publicar um processo não muda quem o chama.** O pai só usa a versão nova do filho depois de ser republicado. Se o agente não fizer isso, a normativa publica sem erro e não vale. O ensaio confirmou: com CRE-02 publicado na versão 4, uma proposta nova usou a versão 3, e R$ 85 mil foram para a gerência pela regra antiga.

| Mudança | O que precisa ser republicado |
|---|---|
| M1, M2 | CRE-01, que chama CRE-02 |
| M4 | CAD-01, que fixa os formulários |
| M7 | CRE-01, que chama CAD-02 |

Isto é um ponto de observação do laboratório: o agente percebe sozinho? Se não perceber, a mudança precisa ser registrada como tal em R3, e a nova regra só vale depois de corrigida.

## 4. Cada mudança

Os dados de conferência vêm da massa de [mock.md](mock.md) §3.

### M1: rating D ou E passa pela gerência

- **O que muda em CRE-02:** uma decisão automática depois do parecer favorável, com `ratingInterno = "D" OU ratingInterno = "E"`. Se sim, segue para `gw_alcada_gerencia`, que mantém o comitê acima de R$ 250 mil. Se não, segue para `gw_alcada_analista`.
- **Q2:** 1 nó e 3 fluxos (2 novos e 1 alterado).
- **Em andamento:** proposta de Bruno Teixeira parada em `analisar_credito`. Com rating D e R$ 30 mil, ela não passa pela gerência.
- **Nova:** a mesma proposta passa por `aprovar_gerencia`.

### M2: a alçada do analista sobe

- **O que muda em CRE-02:** a condição de `gw_alcada_analista` passa a `valorAprovado <= 80000`.
- **Q2:** 1 nó.
- **Nova:** proposta de Bruno Teixeira de R$ 70 mil, com rating B, sai do analista sem passar pela gerência.

### M3: análise simultânea

- **Por que exige código:** o motor tem um só token (ADR-0002, PQ-03). Dois fluxos saindo de uma etapa são recusados com `WF005`, e não há sincronização. O alcance é o motor.
- **O que o agente pode tentar:** pôr a Supervisão antes do analista. Isso muda a ordem, mas uma avaliação continua esperando a outra, e o item 2 da normativa não é cumprido.

### M4: origem dos recursos

- **O que muda:** `F-CAD-01` ganha `origemRecursos`, um `select` obrigatório, e `F-CAD-02` a mostra como somente leitura. CAD-01 é republicado.
- **Q2:** 2 campos.
- **Em andamento:** cadastro parado em `analisar_cadastro` termina sem o campo.
- **Nova:** sem a origem, a abertura é recusada com 422 e `required`. Com ela, o analista vê o valor.
- **O que pode faltar:** o campo em `F-CAD-02`. Sem ele, o item 3 da normativa não é cumprido.

### M5: segregação da formalização

- **Passos de admin:** criar o grupo `Controles Internos` e a persona Inês, com o bot `persona-ines`.
- **O que muda em CRE-01:** uma raia nova, e `conferir_formalizacao` passa para ela.
- **Q2:** 1 raia e 1 nó.
- **Em andamento:** proposta de Ana Clara Moreira parada em `conferir_formalizacao` continua com Tomás.
- **Nova:** Tomás é recusado, e Inês conclui.

### M6: comunicação ao regulador

- **Passos de admin:** criar o destino `regulador` e a credencial `regulador_api_key`. O mock já responde (`/regulador/v1/operacoes-credito`).
- **O que muda:** uma automação nova, com o contrato do anexo da normativa, e uma etapa depois de `liberar_credito` que guarda `protocoloComunicacao`.
- **Q2:** 1 automação, 1 nó e 2 fluxos (1 novo e 1 alterado).
- **Em andamento:** a proposta de M5 termina sem protocolo, e o regulador não recebe nada.
- **Nova:** o pedido guarda o protocolo, e `GET /__mock/estado` mostra a comunicação.

### M7: verificação única

- **O que muda:** um processo novo, CAD-04, com `consultar_situacao` e `consultar_pld` e um formulário de início com `documentoCliente` e `nomeCliente`. CAD-01 e CAD-02 trocam as duas consultas por um subprocesso, que devolve `situacaoDocumento`, `resultadoPld` e `pep`. CRE-01 é republicado.
- **Q2:** 25 elementos. CAD-04 tem 4 nós, 3 fluxos, 1 raia e 2 campos. CAD-01 muda 3 nós e 5 fluxos. CAD-02 muda 3 nós e 4 fluxos.
- **Detalhe:** CAD-04 consulta as listas sempre, mesmo com documento irregular. Em CAD-01, as listas só eram consultadas com documento regular. O desvio continua igual, porque `gw_documento_regular` passa a vir antes de `gw_pld_bloqueio`.
- **Nova:** CAD-01 chama CAD-04, os desvios de documento irregular e de bloqueio continuam valendo, e CRE-01 usa o novo CAD-02 para Eduarda Campos.
- **Limite do item 3:** a verificação fica em um só lugar, mas uma mudança nela ainda exige republicar CAD-01, CAD-02 e CRE-01 (§3).

### M8: boleto depois do lançamento

- **O que muda em CRE-03:** `lancar_acordo` passa a vir antes de `emitir_boleto`.
- **Q2:** 3 fluxos.
- **Em andamento:** acordo do contrato `CT-1001` parado em `negociar_cliente` emite o boleto antes do lançamento.
- **Nova:** a linha do tempo mostra `lancar_acordo`, `emitir_boleto` e `notificar_acordo`, nessa ordem.

### M9: prazo da análise

- **Por que exige código:** o Chain não tem temporizador (Q-02). Um nó de outro tipo é recusado com `WF000`, e nada tira uma tarefa de quem a tem sem alguém agir. O alcance é o motor.
- **O que o agente pode tentar:** o `take-over` de um gerente, ou um chamado do Agendador. Nenhum dos dois cumpre "sem que ninguém precise agir" dentro do Chain.

### M10: a gerência da agência sai

- **O que muda em CAD-01:** `gw_pessoa_juridica` e `aprovar_empresa` saem, e também a raia `Agência - Gerência`, que fica sem uso.
- **Q2:** 2 nós, 6 fluxos (4 removidos e 2 alterados) e 1 raia.
- **Em andamento:** empresa parada em `aprovar_empresa`, etapa que não existe na versão nova, termina normalmente pela decisão da gerência.
- **Nova:** a empresa abre conta sem passar pela gerência.

## 5. Ensaio

O agente de desenvolvimento aplicou as dez mudanças em uma stack descartável, em 2026-11-06, para testar esta previsão. **Não são resultados do laboratório:** quem aplicou conhecia as respostas. O ensaio mostra que cada alteração é possível, não quanto custa para quem não as conhece.

| O que foi ensaiado | Resultado |
|---|---|
| Um bot em um grupo com Modeler, pela API (LQ-05) | Criou e publicou processos, formulários e uma automação, e viu grupos e destinos, nunca o valor de uma credencial. |
| As 8 mudanças de modelo | Todas publicaram, na ordem de §1. Os números de Q2 acima foram medidos nas versões publicadas. |
| M3 e M9 | Recusadas com `WF005` e `WF000`. |
| Q4, com 5 instâncias paradas antes da primeira mudança | Todas terminaram na versão 1, com as regras antigas, mesmo a parada em uma etapa que a versão nova removeu. |
| Instâncias novas depois de todas as mudanças | Seguiram as regras novas, inclusive as recusas de M4 e M5. |
| Publicar um filho sem republicar o pai | A regra nova não valeu (§3). |
