# Setor: Contabilidade

- **Status:** Approved pelo proprietário em 2026-11-06.
- **Parte de:** [Laboratório de avaliação do Chain](../README.md). O §4 descreve o que cada seção deve conter.

## Responsabilidade

A Contabilidade registra tudo o que movimenta dinheiro no banco, emite as notas fiscais de serviço, paga os fornecedores e fecha o mês. Quase todos os processos com dinheiro terminam nela.

Ela não aprova as operações dos outros setores. Quando um lançamento chega, a operação já aconteceu: a Contabilidade confere as contas, mas não barra o evento.

## Personas

| Persona | Cargo | Bot | Uso do Chain |
|---|---|---|---|
| Davi | Analista contábil | `persona-davi` | Confere lançamentos e resolve pendências do fechamento. |
| Fernanda | Analista fiscal | `persona-fernanda` | Confere e corrige notas fiscais. |
| Júlia | Analista de contas a pagar | `persona-julia` | Confere retenções de fornecedores. |
| Gustavo | Controller | `persona-gustavo` | Autoriza lançamentos altos e revisa o balancete. |

## Processos

| Processo | Papel do setor |
|---|---|
| [CTB-01](../processos/ctb-01-lancamento-contabil.md) Lançamento contábil | Dono. |
| [CTB-02](../processos/ctb-02-emissao-de-nfse.md) Emissão de nota fiscal de serviço | Dono. |
| [CTB-03](../processos/ctb-03-contas-a-pagar.md) Contas a pagar | Dono. |
| [CTB-04](../processos/ctb-04-fechamento-contabil.md) Fechamento contábil mensal | Dono. |
| [SEG-03](../processos/seg-03-faturamento-de-comissoes.md) Faturamento de comissões | Emite a nota e confirma o recebimento. |

## Regras de negócio

| Id | Regra | Valor |
|---|---|---|
| RN-CTB-01 | Passa por conferência humana o lançamento alto, ou o que o razão não classificou. | Acima de R$ 100 mil |
| RN-CTB-02 | Lançamento muito alto exige a Controladoria. | Acima de R$ 1 milhão |
| RN-CTB-03 | Despesa alta exige a Diretoria. | Acima de R$ 50 mil |
| RN-CTB-04 | Pagar uma nota vencida exige a Controladoria. | — |
| RN-CTB-05 | O período só fecha sem pendências, com o balancete revisto e as demonstrações aprovadas. | — |
| RN-CTB-06 | Uma nota rejeitada pelo emissor é corrigida e reenviada, ou cancelada. | — |

## Formulários e dados

Os formulários do setor são `F-CTB-01` a `F-CTB-09`, descritos nos seus processos. `F-CTB-08`, só com a competência, é reutilizado por [SEG-03](../processos/seg-03-faturamento-de-comissoes.md) e [RH-03](../processos/rh-03-folha-de-pagamento.md).

Os lançamentos vivem no Razão Contábil, não no Chain.

## Automações e integrações

| Sistema | Para quê |
|---|---|
| Razão Contábil | Classificar eventos, registrar lançamentos, gerar balancetes e fechar períodos. |
| Emissor de NFS-e | Calcular tributos, emitir notas e validar notas de fornecedores. |
| Pagamentos | Pagar fornecedores. |
| Regulador Fictício | Receber o balancete. |
| Notificações | Enviar a nota ao tomador. |

Os contratos estão em [sistemas-externos.md](../sistemas-externos.md).

## Relação com outros setores

| Setor | Recebe dele | Entrega a ele |
|---|---|---|
| Crédito, Seguros, Consórcio e RH | Eventos financeiros, por [CTB-01](../processos/ctb-01-lancamento-contabil.md) | Número do lançamento |
| Seguros | Pedidos de nota fiscal da comissão | Nota emitida |
| Todos, pelo grupo `Gestores` | Solicitações de pagamento | Pagamentos |
| Diretoria | Aprovação de despesas e demonstrações | Balancete |

## Configuração no Chain

| Grupo | Membros | Para quê |
|---|---|---|
| Contabilidade - Lançamentos | Davi | Conferir lançamentos e resolver pendências. |
| Contabilidade - Fiscal | Fernanda | Cuidar das notas de serviço. |
| Contabilidade - Contas a Pagar | Júlia | Conferir pagamentos. |
| Contabilidade - Controladoria | Gustavo | Autorizar e revisar. |

Gustavo também está em `Gestores`. As capacidades de cada grupo estão em [processos/README.md](../processos/README.md) §5.

## Questões em aberto

*Nenhuma registrada.*
