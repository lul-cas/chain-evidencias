# Setor: TI

- **Status:** Approved pelo proprietário em 2026-11-06.
- **Parte de:** [Laboratório de avaliação do Chain](../README.md). O §4 descreve o que cada seção deve conter.

## Responsabilidade

A TI mantém os sistemas do banco funcionando. Ela concede e revoga acessos, atende chamados e controla as mudanças nos sistemas.

Ela não decide quem precisa de acesso: quem pede é o gestor. A Segurança só avalia os acessos críticos.

## Personas

| Persona | Cargo | Bot | Uso do Chain |
|---|---|---|---|
| Ulisses | Analista de service desk | `persona-ulisses` | Faz a triagem dos chamados. |
| Wagner | Analista de infraestrutura | `persona-wagner` | Atua no segundo nível e executa mudanças. |
| Xênia | Analista de segurança | `persona-xenia` | Aprova acessos críticos e avalia mudanças. |
| Estela | Gerente de TI | `persona-estela` | Integra o comitê de mudanças. |

## Processos

| Processo | Papel do setor |
|---|---|
| [TI-01](../processos/ti-01-gestao-de-acessos.md) Gestão de acessos | Dono. |
| [TI-02](../processos/ti-02-chamado-de-ti.md) Chamado de TI | Dono. |
| [TI-03](../processos/ti-03-mudanca-em-sistema.md) Mudança em sistema | Dono. |

## Regras de negócio

| Id | Regra |
|---|---|
| RN-TI-01 | Acesso ao Core, ou com perfil de administrador, exige a Segurança. |
| RN-TI-02 | Revogar acessos não precisa de aprovação. |
| RN-TI-03 | Mudança padrão de baixo risco dispensa aprovação. As demais passam pela Segurança e pelo comitê. |
| RN-TI-04 | Uma mudança que falha na verificação de saúde é revertida. |

## Formulários e dados

Os formulários do setor são `F-TI-01` a `F-TI-09`, descritos nos seus processos. Os dados principais são matrícula, sistemas, perfil, dados do chamado e da mudança.

## Automações e integrações

| Sistema | Para quê |
|---|---|
| Diretório Corporativo | Provisionar e revogar acessos. |
| Monitoramento | Verificar a saúde de um sistema depois de uma mudança. |

Os contratos estão em [sistemas-externos.md](../sistemas-externos.md).

## Relação com outros setores

| Setor | Recebe dele | Entrega a ele |
|---|---|---|
| RH | Pedidos de acesso na admissão e no desligamento | Acessos concedidos e revogados |
| Todos, pelo grupo `Gestores` | Pedidos de acesso | Acessos |
| Todos, pelo grupo `Colaboradores` | Chamados | Solução |

## Configuração no Chain

| Grupo | Membros | Para quê |
|---|---|---|
| TI - Service Desk | Ulisses | Triar chamados. |
| TI - Infraestrutura | Wagner | Atuar no segundo nível e executar mudanças. |
| TI - Segurança | Xênia | Aprovar acessos críticos. |
| TI - Comitê de Mudanças | Estela, Xênia | Aprovar mudanças. |

Estela também está em `Gestores`. As capacidades de cada grupo estão em [processos/README.md](../processos/README.md) §5.

## Questões em aberto

*Nenhuma registrada.*
