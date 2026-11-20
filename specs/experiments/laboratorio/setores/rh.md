# Setor: RH

- **Status:** Approved pelo proprietário em 2026-11-06.
- **Parte de:** [Laboratório de avaliação do Chain](../README.md). O §4 descreve o que cada seção deve conter.

## Responsabilidade

O RH cuida das pessoas do banco, da admissão ao desligamento. Ele aprova vagas, seleciona candidatos, mantém o Sistema de Folha e paga os colaboradores.

Ele não define os acessos de ninguém: isso cabe à TI, a partir do que o gestor pede.

## Personas

| Persona | Cargo | Bot | Uso do Chain |
|---|---|---|---|
| Renata | Recrutadora | `persona-renata` | Seleciona candidatos. |
| Paulo | Analista de departamento pessoal | `persona-paulo` | Coleta documentos, confere a folha e as rescisões. |
| Clarice | Gerente de RH | `persona-clarice` | Aprova vagas, justa causa e a folha. |

## Processos

| Processo | Papel do setor |
|---|---|
| [RH-01](../processos/rh-01-admissao.md) Admissão | Dono. |
| [RH-02](../processos/rh-02-desligamento.md) Desligamento | Dono. |
| [RH-03](../processos/rh-03-folha-de-pagamento.md) Folha de pagamento | Dono. |
| [RH-04](../processos/rh-04-ferias.md) Férias | Dono. |

## Regras de negócio

| Id | Regra | Valor |
|---|---|---|
| RN-RH-01 | Toda vaga é aprovada pelo RH. Aumento de quadro também exige a Diretoria. | — |
| RN-RH-02 | Só é admitido o candidato com antecedentes em ordem. | — |
| RN-RH-03 | Justa causa exige a confirmação da gerência de RH. | — |
| RN-RH-04 | Os acessos são revogados antes do cálculo da rescisão. | — |
| RN-RH-05 | A gerência aprova toda folha, e a Diretoria, a folha líquida acima do limite. | R$ 1 milhão |
| RN-RH-06 | Férias precisam de saldo e são pedidas com antecedência. | 30 dias |

## Formulários e dados

Os formulários do setor são `F-RH-01` a `F-RH-07`, descritos nos seus processos. `salarioProposto`, `salario` e `motivoDesligamento` são sensíveis.

Colaboradores e salários vivem no Sistema de Folha. A folha do mês só traz totais para o Chain.

## Automações e integrações

| Sistema | Para quê |
|---|---|
| Sistema de Folha | Cadastrar e buscar colaboradores, calcular folha e rescisão, registrar férias. |
| Validador Cadastral | Consultar antecedentes. |
| Pagamentos | Pagar rescisões e o lote da folha. |

Os contratos estão em [sistemas-externos.md](../sistemas-externos.md).

## Relação com outros setores

| Setor | Recebe dele | Entrega a ele |
|---|---|---|
| Todos, pelo grupo `Gestores` | Vagas e desligamentos | Novos colaboradores |
| Todos, pelo grupo `Colaboradores` | Pedidos de férias | Férias e holerites |
| TI | Acessos concedidos e revogados | Pedidos de acesso, por [TI-01](../processos/ti-01-gestao-de-acessos.md) |
| Contabilidade | Número do lançamento | Folha e rescisões |
| Diretoria | Aprovação de aumento de quadro e da folha | Pedidos de aprovação |

## Configuração no Chain

| Grupo | Membros | Para quê |
|---|---|---|
| RH - Recrutamento | Renata | Selecionar candidatos. |
| RH - Departamento Pessoal | Paulo | Cuidar da folha e dos documentos. |
| RH - Gerência | Clarice | Aprovar e ver dados sensíveis. |

Clarice também está em `Gestores`. As capacidades de cada grupo estão em [processos/README.md](../processos/README.md) §5.

## Questões em aberto

*Nenhuma registrada.*
