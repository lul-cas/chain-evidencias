# Setor: Seguros

- **Status:** Approved pelo proprietário em 2026-11-06.
- **Parte de:** [Laboratório de avaliação do Chain](../README.md). O §4 descreve o que cada seção deve conter.

## Responsabilidade

O setor de Seguros cuida dos seguros que o banco distribui. Ele avalia os riscos que a seguradora parceira não aceita sozinha, trata os sinistros e confere as comissões que a seguradora paga ao banco.

Ele não vende: a agência vende. Ele também não guarda apólices nem assume o risco, porque quem faz isso é a seguradora parceira.

## Personas

| Persona | Cargo | Bot | Uso do Chain |
|---|---|---|---|
| Sofia | Subscritora | `persona-sofia` | Analisa riscos e pede exames. |
| Nuno | Regulador de sinistros | `persona-nuno` | Confere documentos e regula sinistros. |
| Heloísa | Gerente de seguros | `persona-heloisa` | Aprova indenizações altas e confere comissões. |

## Processos

| Processo | Papel do setor |
|---|---|
| [SEG-01](../processos/seg-01-contratacao-de-seguro.md) Contratação de seguro | Dono. |
| [SEG-02](../processos/seg-02-sinistro.md) Sinistro | Dono. |
| [SEG-03](../processos/seg-03-faturamento-de-comissoes.md) Faturamento de comissões | Dono. |

## Regras de negócio

| Id | Regra | Valor |
|---|---|---|
| RN-SEG-01 | Só contrata seguro o cliente ativo. | — |
| RN-SEG-02 | Passa por subscrição o que a seguradora exigir, ou o capital acima do limite. | R$ 300 mil |
| RN-SEG-03 | No seguro prestamista, o capital segurado é o valor aprovado do crédito. | — |
| RN-SEG-04 | Só há cobertura para sinistro ocorrido na vigência da apólice. | — |
| RN-SEG-05 | Indenização acima do limite exige a gerência. | R$ 100 mil |
| RN-SEG-06 | A nota fiscal da comissão só é emitida com o extrato conferido. | — |

## Formulários e dados

Os formulários do setor são `F-SEG-01` a `F-SEG-09`, descritos nos seus processos. Os dados principais são tipo de seguro, capital, beneficiários, parecer de risco e dados do sinistro. `declaracaoSaude` é sensível.

## Automações e integrações

| Sistema | Para quê |
|---|---|
| Seguradora Parceira | Cotar, emitir e consultar apólices, comunicar sinistros e consultar comissões. |
| Core Bancário | Ler clientes e programar o débito do prêmio. |
| Pagamentos | Pagar indenizações. |
| Notificações | Avisar o cliente. |

O Portal do Cliente inicia [SEG-02](../processos/seg-02-sinistro.md) por gatilho HTTP. Os contratos estão em [sistemas-externos.md](../sistemas-externos.md).

## Relação com outros setores

| Setor | Recebe dele | Entrega a ele |
|---|---|---|
| Agência | Vendas e avisos de sinistro | Cotações e exigências |
| Crédito | Pedidos de seguro prestamista | Apólice |
| Contabilidade | Nota fiscal da comissão e lançamentos | Prêmios, indenizações e comissões |

## Configuração no Chain

| Grupo | Membros | Para quê |
|---|---|---|
| Seguros - Subscrição | Sofia | Analisar riscos. |
| Seguros - Sinistros | Nuno | Regular sinistros. |
| Seguros - Gerência | Heloísa | Aprovar indenizações e conferir comissões. |

Heloísa também está em `Gestores`. As capacidades de cada grupo estão em [processos/README.md](../processos/README.md) §5.

## Questões em aberto

*Nenhuma registrada.*
