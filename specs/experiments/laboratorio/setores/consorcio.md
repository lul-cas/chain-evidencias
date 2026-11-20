# Setor: Consórcio

- **Status:** Approved pelo proprietário em 2026-11-06.
- **Parte de:** [Laboratório de avaliação do Chain](../README.md). O §4 descreve o que cada seção deve conter.

## Responsabilidade

O setor de Consórcio administra os grupos de consórcio do banco. Ele confere as adesões, homologa as assembleias, aprova os bens dos contemplados e cuida do pagamento ao vendedor.

Ele não vende, porque a agência vende. Ele também não decide o crédito do contemplado, porque quem decide é o setor de Crédito.

## Personas

| Persona | Cargo | Bot | Uso do Chain |
|---|---|---|---|
| Igor | Analista de consórcio | `persona-igor` | Confere adesões, homologa assembleias e analisa bens. |
| Yara | Gerente de consórcio | `persona-yara` | Decide o que fazer com uma assembleia não homologada. |

## Processos

| Processo | Papel do setor |
|---|---|
| [CON-01](../processos/con-01-adesao-a-consorcio.md) Adesão a consórcio | Dono. |
| [CON-02](../processos/con-02-assembleia-de-consorcio.md) Assembleia de consórcio | Dono. |
| [CON-03](../processos/con-03-contemplacao.md) Contemplação | Dono. |

## Regras de negócio

| Id | Regra |
|---|---|
| RN-CON-01 | Só adere ao consórcio o cliente ativo. |
| RN-CON-02 | Só há adesão a grupo com vaga. |
| RN-CON-03 | A cota só fica ativa depois do pagamento da primeira parcela. |
| RN-CON-04 | O resultado da assembleia só é publicado depois de homologado. Sem homologação, a gerência decide se repete a apuração. |
| RN-CON-05 | A carta só é usada em um bem aprovado pelo setor. |
| RN-CON-06 | O contemplado passa pela mesma análise de crédito das propostas. |

## Formulários e dados

Os formulários do setor são `F-CON-01` a `F-CON-07`, descritos nos seus processos. Os dados principais são tipo de bem, valor do crédito, cota, grupo, bem e vendedor.

Grupos e cotas vivem no Sistema de Consórcios, não no Chain.

## Automações e integrações

| Sistema | Para quê |
|---|---|
| Sistema de Consórcios | Consultar grupos, registrar e ativar cotas, apurar e publicar assembleias, e baixar cartas. |
| Core Bancário | Ler clientes e a exposição de crédito. |
| Bureau de Crédito | Consultar o contemplado. |
| Pagamentos | Emitir boletos e pagar o vendedor. |
| Assinador Eletrônico | Colher o termo de alienação. |
| Registro de Garantias | Registrar o gravame do bem. |
| Notificações | Avisar o cliente. |

O Sistema de Consórcios inicia [CON-03](../processos/con-03-contemplacao.md) por gatilho HTTP. Os contratos estão em [sistemas-externos.md](../sistemas-externos.md).

## Relação com outros setores

| Setor | Recebe dele | Entrega a ele |
|---|---|---|
| Agência | Adesões e dados do bem | Grupos sugeridos e contemplações |
| Crédito | Decisão sobre o contemplado | Pedidos de análise |
| Contabilidade | Número do lançamento | Parcelas e faturamentos |

## Configuração no Chain

| Grupo | Membros | Para quê |
|---|---|---|
| Consórcio - Operações | Igor | Conferir, homologar e analisar. |
| Consórcio - Gerência | Yara | Decidir sobre assembleias e ver dados sensíveis. |

Yara também está em `Gestores`. As capacidades de cada grupo estão em [processos/README.md](../processos/README.md) §5.

## Questões em aberto

*Nenhuma registrada.*
