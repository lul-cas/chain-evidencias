# Setor: Cadastro

- **Status:** Approved pelo proprietário em 2026-11-06.
- **Parte de:** [Laboratório de avaliação do Chain](../README.md). O §4 descreve o que cada seção deve conter.

## Responsabilidade

O Cadastro garante que o banco conhece seus clientes. Ele aprova ou devolve os cadastros que as agências encaminham, mantém os cadastros válidos e confere os encerramentos. Também cuida da prevenção à lavagem de dinheiro (PLD), que aqui fica junto do cadastro.

Ele não atende clientes nem negocia produtos. Quem fala com o cliente é a agência.

## Personas

| Persona | Cargo | Bot | Uso do Chain |
|---|---|---|---|
| Caio | Analista de cadastro | `persona-caio` | Analisa cadastros e atualizações, e confere encerramentos. |
| Lívia | Supervisora de cadastro e PLD | `persona-livia` | Decide os casos com alerta de PLD ou com pessoa politicamente exposta. |

## Processos

| Processo | Papel do setor |
|---|---|
| [CAD-01](../processos/cad-01-abertura-de-conta.md) Abertura de conta | Dono. |
| [CAD-02](../processos/cad-02-atualizacao-cadastral.md) Atualização cadastral | Dono. |
| [CAD-03](../processos/cad-03-encerramento-de-conta.md) Encerramento de conta | Dono. |

## Regras de negócio

| Id | Regra |
|---|---|
| RN-CAD-01 | Um documento, um cliente: quem já tem cadastro não abre outro. |
| RN-CAD-02 | Pessoa física precisa ter ao menos 18 anos. |
| RN-CAD-03 | Só segue para análise o documento com situação `regular`. Os demais voltam para a agência. |
| RN-CAD-04 | `bloqueio` nas listas restritivas recusa o cadastro, sem análise. |
| RN-CAD-05 | `alerta` nas listas, ou pessoa politicamente exposta, exige decisão da Supervisão. |
| RN-CAD-06 | Um cadastro vale 24 meses. |
| RN-CAD-07 | Só se encerra uma conta sem contrato, apólice ou cota ativos, e com o termo assinado. |
| RN-CAD-08 | A participação dos sócios de uma empresa soma 100%. Quem confere é o analista. |
| RN-CAD-09 | O saldo de uma conta encerrada é devolvido antes do encerramento. |

## Formulários e dados

Os formulários do setor são `F-CAD-01` a `F-CAD-07`, descritos nos seus processos. Os dados pessoais principais são identificação, renda, endereço, contato e documentos. `rendaMensal` é sensível.

O cadastro aprovado vive no Core Bancário, não no Chain: é de lá que os outros processos o leem.

## Automações e integrações

| Sistema | Para quê |
|---|---|
| Core Bancário | Criar, ler, atualizar e bloquear clientes, e encerrar contas. |
| Validador Cadastral | Consultar a situação do CPF ou CNPJ. |
| Serviço de PLD | Consultar listas restritivas e pessoas politicamente expostas. |
| Pagamentos | Devolver o saldo no encerramento. |
| Notificações | Avisar o cliente. |

Os contratos estão em [sistemas-externos.md](../sistemas-externos.md).

## Relação com outros setores

| Setor | Recebe dele | Entrega a ele |
|---|---|---|
| Agência | Cadastros e atualizações | Pareceres e pendências |
| Crédito, Seguros e Consórcio | Pedidos de atualização, por [CRE-01](../processos/cre-01-proposta-de-credito.md) | Clientes válidos no Core |

## Configuração no Chain

| Grupo | Membros | Para quê |
|---|---|---|
| Cadastro - Análise | Caio | Analisar e conferir. |
| Cadastro - Supervisão | Lívia | Decidir alertas e ver dados sensíveis. |

Lívia também está em `Gestores`. As capacidades de cada grupo estão em [processos/README.md](../processos/README.md) §5.

## Questões em aberto

*Nenhuma registrada.* A PLD fica no Cadastro (LQ-14).
