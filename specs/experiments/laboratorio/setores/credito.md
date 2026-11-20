# Setor: Crédito

- **Status:** Approved pelo proprietário em 2026-11-06.
- **Parte de:** [Laboratório de avaliação do Chain](../README.md). O §4 descreve o que cada seção deve conter.

## Responsabilidade

O Crédito decide se o banco empresta, quanto e em que condições. Ele usa o cadastro do cliente, o score do bureau e a exposição que o cliente já tem no banco. Também formaliza os contratos, e cobra os que atrasam.

Ele não negocia com o cliente: a agência negocia, e o Crédito decide. Ele também avalia os contemplados do consórcio, pelo mesmo processo.

## Personas

| Persona | Cargo | Bot | Uso do Chain |
|---|---|---|---|
| Otávio | Analista de crédito | `persona-otavio` | Dá o parecer e define as condições. |
| Priscila | Gerente de crédito | `persona-priscila` | Aprova na sua alçada, aprova descontos e integra o comitê. |
| Tomás | Analista de formalização | `persona-tomas` | Confere o contrato antes da liberação. |
| Vera | Analista de cobrança | `persona-vera` | Elabora propostas de renegociação. |

## Processos

| Processo | Papel do setor |
|---|---|
| [CRE-01](../processos/cre-01-proposta-de-credito.md) Proposta de crédito | Dono. |
| [CRE-02](../processos/cre-02-analise-de-credito.md) Análise de crédito | Dono. |
| [CRE-03](../processos/cre-03-cobranca-e-renegociacao.md) Cobrança e renegociação | Dono. |
| [CON-03](../processos/con-03-contemplacao.md) Contemplação | Avalia o contemplado, por CRE-02. |

## Regras de negócio

| Id | Regra | Valor |
|---|---|---|
| RN-CRE-01 | Só contrata crédito o cliente ativo, com cadastro válido. | — |
| RN-CRE-02 | Recusa automática. | Score abaixo de 400, ou atraso acima de 90 dias |
| RN-CRE-03 | Aprovação automática. | Score a partir de 750, sem restrição, até R$ 20 mil e comprometimento até 30% |
| RN-CRE-04 | Comprometimento de renda é a soma das parcelas atuais e da nova, dividida pela renda. | — |
| RN-CRE-05 | Alçadas de aprovação. | Analista até R$ 50 mil, gerência até R$ 250 mil, comitê acima disso |
| RN-CRE-06 | Uma aprovação vale por um prazo. Depois dele, o contrato não é liberado. | 15 dias |
| RN-CRE-07 | Financiamento de veículo exige gravame registrado antes da liberação. | — |
| RN-CRE-08 | A cobrança começa depois de um prazo de atraso. | 30 dias |
| RN-CRE-09 | Desconto na renegociação acima do limite exige a gerência. | 20% |
| RN-CRE-10 | Atraso longo pode ir para a cobrança judicial, se a gerência decidir. | 360 dias |

Todas essas regras estão nos gateways e nos mapeamentos dos processos, não em um sistema externo. Exceção: RN-CRE-08 é o momento em que o Core inicia CRE-03.

## Formulários e dados

Os formulários do setor são `F-CRE-01` a `F-CRE-11`, descritos nos seus processos. Os dados principais são produto, valor, prazo, score, restrições, exposição e parecer. `rendaMensal` e `comprometimentoRenda` são sensíveis.

O Crédito não guarda cadastro: ele lê o cliente do Core a cada proposta.

## Automações e integrações

| Sistema | Para quê |
|---|---|
| Core Bancário | Ler clientes e contratos, gerar contratos, liberar crédito e registrar acordos. |
| Bureau de Crédito | Consultar score e restrições. |
| Motor de Crédito | Simular operações e guardar decisões. |
| Assinador Eletrônico | Enviar contratos e consultar a assinatura. |
| Registro de Garantias | Registrar gravames. |
| Pagamentos | Emitir boletos de acordo. |
| Notificações | Avisar o cliente. |

Os contratos estão em [sistemas-externos.md](../sistemas-externos.md).

## Relação com outros setores

| Setor | Recebe dele | Entrega a ele |
|---|---|---|
| Agência | Propostas e respostas do cliente | Decisões e propostas de renegociação |
| Cadastro | Clientes válidos | Pedidos de atualização |
| Seguros | Apólice prestamista | Valor aprovado para o seguro |
| Consórcio | Pedidos de análise de contemplados | Decisão de crédito |
| Contabilidade | Número do lançamento | Liberações, acordos e provisões |

## Configuração no Chain

| Grupo | Membros | Para quê |
|---|---|---|
| Crédito - Análise | Otávio | Dar pareceres. |
| Crédito - Gerência | Priscila | Aprovar na alçada e ver dados sensíveis. |
| Crédito - Comitê | Priscila, Antônio, Zélia | Deliberar acima da alçada da gerência. |
| Crédito - Formalização | Tomás | Conferir contratos. |
| Crédito - Cobrança | Vera | Elaborar renegociações. |

Priscila também está em `Gestores`. As capacidades de cada grupo estão em [processos/README.md](../processos/README.md) §5.

## Questões em aberto

*Nenhuma registrada.*
