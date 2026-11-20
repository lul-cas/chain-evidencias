# Setor: Agência

- **Status:** Approved pelo proprietário em 2026-11-06.
- **Parte de:** [Laboratório de avaliação do Chain](../README.md). O §4 descreve o que cada seção deve conter.

## Responsabilidade

A agência é a porta de entrada do cliente. Ela abre cadastros, negocia crédito, vende seguros e consórcios, e leva ao cliente o que os outros setores decidem. Também ajusta o que volta, e colhe assinaturas.

Ela não aprova cadastros, não decide crédito e não aceita riscos: isso cabe aos setores de Cadastro, Crédito e Seguros.

## Personas

| Persona | Cargo | Bot | Uso do Chain |
|---|---|---|---|
| Marina | Gerente de relacionamento | `persona-marina` | Abre cadastros e propostas, negocia e colhe assinaturas. |
| Rafael | Atendente | `persona-rafael` | Abre cadastros e vende seguros e consórcios. |
| Beatriz | Gerente geral da agência | `persona-beatriz` | Aprova a entrada de empresas como clientes e acompanha a agência. |

## Processos

A Agência não é dona de nenhum processo. Ela participa destes:

| Processo | O que a agência faz |
|---|---|
| [CAD-01](../processos/cad-01-abertura-de-conta.md) Abertura de conta | Abre o cadastro, ajusta o que volta e aprova empresas. |
| [CAD-02](../processos/cad-02-atualizacao-cadastral.md) Atualização cadastral | Atualiza os dados com o cliente. |
| [CAD-03](../processos/cad-03-encerramento-de-conta.md) Encerramento de conta | Pede o encerramento e resolve as pendências. |
| [CRE-01](../processos/cre-01-proposta-de-credito.md) Proposta de crédito | Abre, negocia, confirma o aceite e colhe a assinatura. |
| [CRE-02](../processos/cre-02-analise-de-credito.md) Análise de crédito | Responde ao que o analista pede. |
| [CRE-03](../processos/cre-03-cobranca-e-renegociacao.md) Cobrança e renegociação | Leva a proposta ao cliente e traz a resposta. |
| [SEG-01](../processos/seg-01-contratacao-de-seguro.md) Contratação de seguro | Vende, apresenta a cotação e anexa exames. |
| [SEG-02](../processos/seg-02-sinistro.md) Sinistro | Avisa o sinistro e complementa documentos. |
| [CON-01](../processos/con-01-adesao-a-consorcio.md) Adesão a consórcio | Vende, ajusta a adesão e confirma o pagamento. |
| [CON-03](../processos/con-03-contemplacao.md) Contemplação | Contata o cliente e colhe a assinatura. |

## Regras de negócio

| Id | Regra |
|---|---|
| RN-AGE-01 | Todo produto vendido a um cliente começa na agência. |
| RN-AGE-02 | O que volta para ajuste volta para quem abriu o pedido, pela raia de Solicitantes. Se o solicitante for um bot, volta para o grupo `Agência - Atendimento`. |
| RN-AGE-03 | Uma empresa só vira cliente com a aprovação da gerência da agência. |
| RN-AGE-04 | Se o cliente desistir, quem abriu encerra o pedido com justificativa. |

## Formulários e dados

A agência preenche formulários dos processos de outros setores, como [`F-CAD-01`](../processos/cad-01-abertura-de-conta.md#f-cad-01-cadastro-do-cliente) e [`F-CRE-01`](../processos/cre-01-proposta-de-credito.md#f-cre-01-proposta-de-crédito). Ela não tem formulários próprios.

## Automações e integrações

Nenhuma própria. As etapas automáticas dos processos em que ela participa pertencem aos setores donos.

## Relação com outros setores

| Setor | Recebe dele | Entrega a ele |
|---|---|---|
| Cadastro | Pareceres e pendências | Cadastros e atualizações |
| Crédito | Decisões e pedidos de informação | Propostas negociadas e contratos assinados |
| Seguros | Cotações e exigências | Vendas e avisos de sinistro |
| Consórcio | Grupos sugeridos e contemplações | Adesões e dados do bem |
| TI | Solução de chamados | Chamados |

## Configuração no Chain

| Grupo | Membros | Para quê |
|---|---|---|
| Agência - Atendimento | Marina, Rafael | Atendimento e venda. |
| Agência - Gerência | Beatriz | Aprovar empresas e acompanhar pedidos. |

Beatriz também está em `Gestores`, e todas as personas estão em `Colaboradores`. As capacidades de cada grupo estão em [processos/README.md](../processos/README.md) §5.

## Questões em aberto

*Nenhuma registrada.* Um só grupo representa todas as agências (LQ-13).
