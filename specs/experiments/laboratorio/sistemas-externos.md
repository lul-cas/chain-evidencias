# Sistemas externos do laboratório

- **Status:** Approved pelo proprietário em 2026-11-06.
- **Parte de:** [Laboratório de avaliação do Chain](README.md).
- **Usado por:** [Mapa dos processos](processos/README.md).

## 1. Propósito

Este documento lista as aplicações externas de que os processos do banco dependem e o contrato de cada automação que as chama. Nenhuma delas existe ainda: todas serão simuladas por um mock, em um card próprio.

Os processos são desenhados contra estes contratos. Um mock que os respeite basta para o laboratório rodar. O laboratório só precisa dos sistemas que a onda 1 usa (LQ-15): os demais ficam documentados.

## 2. Por que eles existem

O Chain não guarda dados de negócio fora das instâncias, e uma instância não lê os dados de outra. Isso define o papel de cada sistema:

| Papel | Exemplo | Por que o Chain precisa dele |
|---|---|---|
| **Sistema de registro** | Core Bancário, Sistema de Consórcios, Sistema de Folha | Guarda o que sobrevive a um processo: cliente, conta, contrato, cota, colaborador. É assim que o Crédito usa o cadastro feito pela abertura de conta. |
| **Serviço de consulta** | Bureau de Crédito, Serviço de PLD, Validador Cadastral | Traz informação de fora do banco. |
| **Serviço de execução** | Pagamentos, Emissor de NFS-e, Assinador Eletrônico | Faz algo que o Chain não faz. |
| **Origem de eventos** | Agendador, Core Bancário, Portal do Cliente | Inicia processos por gatilho HTTP (§6), porque o Chain não tem temporizadores. |

## 3. Regras para os contratos

Estas regras vêm de como o Chain trata cada resposta ([automation.md](../../modules/automation.md) §7 e §8.2).

| Regra | Motivo |
|---|---|
| **Resposta de negócio negativa é HTTP 200.** "Cliente não encontrado" é `200` com `encontrado: false`, não `404`. | Um 4xx é falha permanente: a instância fica `faulted` e espera um admin. Os processos desviam por um gateway, não por uma falha. |
| **4xx e 5xx significam erro técnico.** | O 429 e o 5xx têm nova tentativa, e os demais 4xx não têm. Esgotadas as tentativas, a instância fica `faulted`. |
| **Saída marcada com `*` é obrigatória.** | Se faltar, a instância fica `faulted` com `automation_output_invalid`. Nas respostas negativas, só o campo de status é obrigatório. |
| **Uma resposta positiva traz as saídas opcionais.** `encontrado: true` vem com os dados do cliente; `vagasDisponiveis > 0`, com o grupo; `situacaoNota: "autorizada"`, com o número. | Os processos só leem essas saídas depois de testar o status. Se faltar uma entrada obrigatória, a etapa seguinte falha com `automation_input_invalid`. |
| **Os números respeitam os formulários que os recebem.** Valores em reais têm até 2 casas, e taxas, até 4. Dias e meses são inteiros. O score fica entre 0 e 1000. | As entradas de um subprocesso passam pelo formulário de início do filho. Um valor com casas demais faz o pai ficar `faulted` com `subprocess_input_invalid`. |
| **A resposta é JSON no primeiro nível.** | Cada saída lê o corpo pelo próprio nome. |
| **Toda chamada traz `Idempotency-Key`.** Repetir a chave devolve o mesmo resultado, sem repetir o efeito. | Um job pode rodar mais de uma vez (ADR-0011). Isso importa sobretudo em Pagamentos e no Core. |
| **As chamadas respondem em até 30 segundos.** | O Chain espera a resposta da própria chamada. Ele não tem etapa que aguarde um retorno posterior, então uma espera longa, como uma assinatura, é modelada como tarefa humana seguida de consulta. |

## 4. Configuração no Chain

Quem faz estes passos é o agente de desenvolvimento, com a conta admin (LQ-12).

- **Destinos:** um por sistema, todos no mesmo host do mock, separados pelo prefixo de caminho. Como o mock fica na rede interna, cada destino usa `scheme: http`, `internal: true` e `allowSecretsOverHttp: true`.
- **Credenciais:** uma por sistema, usada no cabeçalho `X-Api-Key` como `{{secret:<nome>}}` e válida só para o destino dele.
- **Execução:** todas as automações usam os valores padrão de [automation.md](../../modules/automation.md) §5.2: 30 segundos, 5 tentativas e idempotência por cabeçalho.
- **Tipos:** `chave:tipo` é uma entrada ou saída, e `*` marca o que é obrigatório.

| Sistema | Destino | Prefixo | Credencial |
|---|---|---|---|
| Core Bancário | `core-bancario` | `/core` | `core_api_key` |
| Validador Cadastral | `validador-cadastral` | `/validador` | `validador_api_key` |
| Serviço de PLD | `pld` | `/pld` | `pld_api_key` |
| Bureau de Crédito | `bureau-credito` | `/bureau` | `bureau_api_key` |
| Motor de Crédito | `motor-credito` | `/motor` | `motor_api_key` |
| Assinador Eletrônico | `assinador` | `/assinador` | `assinador_api_key` |
| Registro de Garantias | `garantias` | `/garantias` | `garantias_api_key` |
| Seguradora Parceira | `seguradora` | `/seguradora` | `seguradora_api_key` |
| Sistema de Consórcios | `consorcios` | `/consorcios` | `consorcios_api_key` |
| Razão Contábil | `razao-contabil` | `/razao` | `razao_api_key` |
| Emissor de NFS-e | `nfse` | `/nfse` | `nfse_api_key` |
| Pagamentos | `pagamentos` | `/pagamentos` | `pagamentos_api_key` |
| Sistema de Folha | `folha` | `/folha` | `folha_api_key` |
| Diretório Corporativo | `diretorio` | `/diretorio` | `diretorio_api_key` |
| Monitoramento | `monitoramento` | `/monitoramento` | `monitoramento_api_key` |
| Notificações | `notificacoes` | `/notificacoes` | `notificacoes_api_key` |
| Regulador Fictício | `regulador` | `/regulador` | `regulador_api_key` |

O regulador é um órgão inventado, como o emissor das normativas (LQ-10). Nenhum sistema representa uma instituição real.

## 5. Automações

### 5.1 Core Bancário

Sistema de registro de clientes, contas e contratos. O cadastro aprovado em CAD-01 passa a existir aqui, e todos os outros processos leem daqui.

| Id | Automação | Chamada | Entradas | Saídas |
|---|---|---|---|---|
| `AUT-CORE-01` | Buscar cliente | `GET /core/v1/clientes/{documentoCliente}` | `documentoCliente:text*` | `encontrado:boolean*`, `idCliente:text`, `nomeCliente:text`, `tipoPessoa:text`, `situacaoCliente:text`, `dataValidadeCadastro:date`, `rendaMensal:number`, `endereco:object`, `email:text`, `telefone:text`, `numeroConta:text` |
| `AUT-CORE-02` | Criar cliente e conta | `POST /core/v1/clientes` | `documentoCliente:text*`, `tipoPessoa:text*`, `nomeCliente:text*`, `rendaMensal:number*`, `endereco:object*`, `email:text*`, `telefone:text*`, `tipoConta:text*`, `dataValidadeCadastro:date*`, `dadosPf:object`, `dadosPj:object` | `idCliente:text*`, `numeroAgencia:text*`, `numeroConta:text*` |
| `AUT-CORE-03` | Atualizar cliente | `PUT /core/v1/clientes/{documentoCliente}` | `documentoCliente:text*`, `rendaMensal:number*`, `endereco:object*`, `email:text*`, `telefone:text*`, `dataValidadeCadastro:date*` | `atualizado:boolean*` |
| `AUT-CORE-04` | Bloquear cliente | `POST /core/v1/clientes/{documentoCliente}/bloqueio` | `documentoCliente:text*`, `motivo:text*` | `situacaoCliente:text*` |
| `AUT-CORE-05` | Consultar pendências da conta | `GET /core/v1/clientes/{documentoCliente}/pendencias` | `documentoCliente:text*` | `possuiPendencia:boolean*`, `saldoConta:number*`, `contratosAtivos:number*`, `apolicesAtivas:number*`, `cotasAtivas:number*` |
| `AUT-CORE-06` | Encerrar conta | `POST /core/v1/clientes/{documentoCliente}/encerramento` | `documentoCliente:text*`, `motivoEncerramento:text*` | `dataEncerramento:date*` |
| `AUT-CORE-07` | Consultar exposição de crédito | `GET /core/v1/clientes/{documentoCliente}/exposicao` | `documentoCliente:text*` | `parcelasAtuais:number*`, `saldoDevedorTotal:number*`, `atrasoMaximoDias:number*` |
| `AUT-CORE-08` | Gerar contrato | `POST /core/v1/contratos` | `documentoCliente:text*`, `produto:text*`, `valorAprovado:number*`, `prazoAprovado:number*`, `taxaAprovada:number*` | `numeroContrato:text*` |
| `AUT-CORE-09` | Liberar crédito | `POST /core/v1/contratos/{numeroContrato}/liberacao` | `numeroContrato:text*` | `valorLiberado:number*`, `dataLiberacao:date*` |
| `AUT-CORE-10` | Buscar contrato | `GET /core/v1/contratos/{numeroContrato}` | `numeroContrato:text*` | `encontrado:boolean*`, `documentoCliente:text`, `nomeCliente:text`, `email:text`, `saldoDevedor:number`, `diasAtraso:number`, `valorParcela:number` |
| `AUT-CORE-11` | Registrar acordo | `POST /core/v1/contratos/{numeroContrato}/acordos` | `numeroContrato:text*`, `valorAcordo:number*`, `valorEntrada:number*`, `quantidadeParcelas:number*` | `numeroAcordo:text*` |
| `AUT-CORE-12` | Marcar cobrança judicial | `POST /core/v1/contratos/{numeroContrato}/cobranca-judicial` | `numeroContrato:text*` | `dataMarcacao:date*` |
| `AUT-CORE-13` | Registrar apólice na conta | `POST /core/v1/clientes/{documentoCliente}/apolices` | `documentoCliente:text*`, `numeroApolice:text*`, `premioMensal:number*` | `debitoProgramado:boolean*` |

### 5.2 Validador Cadastral

Consulta a situação de pessoas e empresas em uma base fictícia.

| Id | Automação | Chamada | Entradas | Saídas |
|---|---|---|---|---|
| `AUT-VAL-01` | Consultar situação do documento | `GET /validador/v1/documentos/{documentoCliente}` | `documentoCliente:text*` | `situacaoDocumento:text*` |
| `AUT-VAL-02` | Consultar antecedentes | `POST /validador/v1/antecedentes` | `cpfCandidato:text*`, `nomeCandidato:text*` | `antecedentesOk:boolean*` |

`situacaoDocumento` é `regular`, `irregular` ou `inexistente`. Um CPF ou CNPJ com dígito verificador errado é `inexistente`.

### 5.3 Serviço de PLD

Prevenção à lavagem de dinheiro: listas restritivas e pessoas politicamente expostas (PEP).

| Id | Automação | Chamada | Entradas | Saídas |
|---|---|---|---|---|
| `AUT-PLD-01` | Consultar listas restritivas | `POST /pld/v1/consultas` | `documentoCliente:text*`, `nomeCliente:text*` | `resultadoPld:text*`, `pep:boolean*` |

`resultadoPld` é `limpo`, `alerta` ou `bloqueio`.

### 5.4 Bureau de Crédito

| Id | Automação | Chamada | Entradas | Saídas |
|---|---|---|---|---|
| `AUT-BUR-01` | Consultar score | `GET /bureau/v1/score/{documentoCliente}` | `documentoCliente:text*` | `score:number*`, `possuiRestricao:boolean*`, `valorRestricoes:number*` |

### 5.5 Motor de Crédito

Calcula condições e guarda as decisões. **As regras de aprovação não ficam aqui:** elas ficam nos gateways de CRE-02, para que uma normativa possa mudá-las sem tocar em código.

| Id | Automação | Chamada | Entradas | Saídas |
|---|---|---|---|---|
| `AUT-MOT-01` | Simular operação | `POST /motor/v1/simulacoes` | `produto:text*`, `valorSolicitado:number*`, `prazoMeses:number*`, `score:number*` | `taxaMensal:number*`, `valorParcela:number*`, `cetAnual:number*` |
| `AUT-MOT-02` | Registrar decisão de crédito | `POST /motor/v1/decisoes` | `documentoCliente:text*`, `produto:text*`, `decisao:text*`, `origemDecisao:text*`, `valorAprovado:number`, `prazoAprovado:number`, `taxaAprovada:number`, `validadeAprovacao:date` | `decisaoCredito:text*`, `valorAprovado:number`, `prazoAprovado:number`, `taxaAprovada:number`, `validadeAprovacao:date` |

`AUT-MOT-02` devolve o que recebeu: a decisão entra nos dados da instância por esta resposta, porque o Chain não atribui um valor fixo a uma chave sem formulário ou automação.

### 5.6 Assinador Eletrônico

| Id | Automação | Chamada | Entradas | Saídas |
|---|---|---|---|---|
| `AUT-ASS-01` | Enviar para assinatura | `POST /assinador/v1/envelopes` | `documentoCliente:text*`, `referencia:text*`, `email:text*` | `idEnvelope:text*` |
| `AUT-ASS-02` | Consultar assinatura | `GET /assinador/v1/envelopes/{idEnvelope}` | `idEnvelope:text*` | `assinaturaConcluida:boolean*` |

### 5.7 Registro de Garantias

| Id | Automação | Chamada | Entradas | Saídas |
|---|---|---|---|---|
| `AUT-GAR-01` | Registrar gravame | `POST /garantias/v1/gravames` | `referencia:text*`, `documentoCliente:text*`, `descricaoBem:text*`, `valorBem:number*` | `numeroGravame:text*` |

### 5.8 Seguradora Parceira

O banco distribui seguros de uma seguradora parceira: ela guarda as apólices e paga comissão ao banco.

| Id | Automação | Chamada | Entradas | Saídas |
|---|---|---|---|---|
| `AUT-SEG-01` | Cotar seguro | `POST /seguradora/v1/cotacoes` | `documentoCliente:text*`, `tipoSeguro:text*`, `capitalSegurado:number*` | `idCotacao:text*`, `premioMensal:number*`, `exigeSubscricao:boolean*` |
| `AUT-SEG-02` | Emitir apólice | `POST /seguradora/v1/apolices` | `idCotacao:text*`, `documentoCliente:text*`, `sobrepremioPercentual:number` | `numeroApolice:text*`, `vigenciaInicio:date*`, `vigenciaFim:date*` |
| `AUT-SEG-03` | Consultar apólice | `GET /seguradora/v1/apolices/{numeroApolice}` | `numeroApolice:text*` | `encontrada:boolean*`, `vigenciaInicio:date`, `vigenciaFim:date`, `capitalSegurado:number` |
| `AUT-SEG-04` | Comunicar sinistro | `POST /seguradora/v1/sinistros` | `numeroApolice:text*`, `tipoSinistro:text*`, `dataOcorrencia:date*`, `valorIndenizacao:number*` | `autorizado:boolean*`, `protocoloSeguradora:text*` |
| `AUT-SEG-05` | Consultar extrato de comissões | `GET /seguradora/v1/comissoes/{competencia}` | `competencia:text*` | `quantidadeApolices:number*`, `valorComissao:number*`, `cnpjSeguradora:text*`, `nomeSeguradora:text*`, `emailSeguradora:text*` |
| `AUT-SEG-06` | Contestar extrato | `POST /seguradora/v1/comissoes/{competencia}/contestacoes` | `competencia:text*`, `divergencias:text*` | `protocoloContestacao:text*` |

### 5.9 Sistema de Consórcios

Sistema de registro de grupos e cotas. Depois de publicar o resultado de uma assembleia, ele inicia CON-03 para cada cota contemplada (§6).

| Id | Automação | Chamada | Entradas | Saídas |
|---|---|---|---|---|
| `AUT-CON-01` | Consultar grupos disponíveis | `GET /consorcios/v1/grupos` | `tipoBem:text*`, `valorCredito:number*`, `prazoMeses:number*` | `vagasDisponiveis:number*`, `grupoSugerido:text`, `valorParcelaConsorcio:number`, `taxaAdministracao:number` |
| `AUT-CON-02` | Registrar cota | `POST /consorcios/v1/cotas` | `documentoCliente:text*`, `grupoSugerido:text*`, `valorCredito:number*`, `prazoMeses:number*` | `numeroCota:text*` |
| `AUT-CON-03` | Ativar cota | `POST /consorcios/v1/cotas/{numeroCota}/ativacao` | `numeroCota:text*` | `cotaAtiva:boolean*` |
| `AUT-CON-04` | Apurar assembleia | `POST /consorcios/v1/grupos/{numeroGrupo}/apuracoes` | `numeroGrupo:text*`, `dataAssembleia:date*` | `quantidadeContemplados:number*`, `valorFundoComum:number*`, `resumoApuracao:text*` |
| `AUT-CON-05` | Publicar resultado | `POST /consorcios/v1/grupos/{numeroGrupo}/resultado` | `numeroGrupo:text*`, `dataAssembleia:date*` | `publicado:boolean*` |
| `AUT-CON-06` | Baixar carta de crédito | `POST /consorcios/v1/cotas/{numeroCota}/baixa-carta` | `numeroCota:text*`, `valorCarta:number*` | `cartaBaixada:boolean*` |

Em `AUT-CON-01`, as entradas vão na query da chamada.

### 5.10 Razão Contábil

| Id | Automação | Chamada | Entradas | Saídas |
|---|---|---|---|---|
| `AUT-RAZ-01` | Classificar evento contábil | `POST /razao/v1/classificacoes` | `eventoContabil:text*`, `valor:number*` | `classificado:boolean*`, `contaDebito:text`, `contaCredito:text` |
| `AUT-RAZ-02` | Registrar lançamento | `POST /razao/v1/lancamentos` | `eventoContabil:text*`, `valor:number*`, `dataCompetencia:date*`, `documentoReferencia:text*`, `contaDebito:text*`, `contaCredito:text*`, `historico:text*` | `numeroLancamento:text*` |
| `AUT-RAZ-03` | Apurar pendências do período | `GET /razao/v1/periodos/{competencia}/pendencias` | `competencia:text*` | `lancamentosPendentes:number*`, `contasNaoConciliadas:number*` |
| `AUT-RAZ-04` | Gerar balancete | `POST /razao/v1/periodos/{competencia}/balancete` | `competencia:text*` | `idBalancete:text*`, `totalAtivo:number*`, `totalPassivo:number*`, `resultadoPeriodo:number*` |
| `AUT-RAZ-05` | Fechar período | `POST /razao/v1/periodos/{competencia}/fechamento` | `competencia:text*` | `periodoFechado:boolean*` |

### 5.11 Emissor de NFS-e

Representa a prefeitura fictícia que autoriza notas fiscais de serviço. Também valida as notas dos fornecedores.

| Id | Automação | Chamada | Entradas | Saídas |
|---|---|---|---|---|
| `AUT-NFS-01` | Calcular tributos | `POST /nfse/v1/calculos` | `codigoServico:text*`, `valorServico:number*` | `aliquotaIss:number*`, `valorIss:number*`, `valorLiquido:number*` |
| `AUT-NFS-02` | Emitir NFS-e | `POST /nfse/v1/notas` | `cnpjTomador:text*`, `nomeTomador:text*`, `codigoServico:text*`, `descricaoServico:text*`, `valorServico:number*`, `competencia:text*` | `situacaoNota:text*`, `numeroNota:text`, `codigoVerificacao:text`, `motivoRejeicao:text` |
| `AUT-NFS-03` | Validar nota de fornecedor | `POST /nfse/v1/validacoes` | `cnpjFornecedor:text*`, `numeroNotaFiscal:text*`, `valorNota:number*` | `notaValida:boolean*`, `motivoInvalidez:text` |

`situacaoNota` é `autorizada` ou `rejeitada`. A rejeição é resposta de negócio: vem com HTTP 200. `valorIss` é sempre maior que zero, porque vira um lançamento em [CTB-01](processos/ctb-01-lancamento-contabil.md).

### 5.12 Pagamentos

| Id | Automação | Chamada | Entradas | Saídas |
|---|---|---|---|---|
| `AUT-PAG-01` | Efetuar pagamento | `POST /pagamentos/v1/pagamentos` | `favorecido:text*`, `contaDestino:text*`, `valor:number*`, `referencia:text*` | `idPagamento:text*` |
| `AUT-PAG-02` | Pagar lote da folha | `POST /pagamentos/v1/lotes` | `competencia:text*`, `valorTotal:number*` | `idLote:text*` |
| `AUT-PAG-03` | Emitir boleto | `POST /pagamentos/v1/boletos` | `documentoCliente:text*`, `valor:number*`, `referencia:text*`, `dataVencimento:date*` | `idBoleto:text*`, `linhaDigitavel:text*` |
| `AUT-PAG-04` | Consultar boleto | `GET /pagamentos/v1/boletos/{idBoleto}` | `idBoleto:text*` | `boletoPago:boolean*` |

### 5.13 Sistema de Folha

Sistema de registro de colaboradores.

| Id | Automação | Chamada | Entradas | Saídas |
|---|---|---|---|---|
| `AUT-FOL-01` | Cadastrar colaborador | `POST /folha/v1/colaboradores` | `nomeColaborador:text*`, `cpf:text*`, `cargo:text*`, `setor:text*`, `salario:number*`, `dataAdmissao:date*`, `contaSalario:text*` | `matricula:text*` |
| `AUT-FOL-02` | Buscar colaborador | `GET /folha/v1/colaboradores/{matricula}` | `matricula:text*` | `encontrado:boolean*`, `nomeColaborador:text`, `cargo:text`, `setor:text`, `salario:number`, `contaSalario:text` |
| `AUT-FOL-03` | Calcular rescisão | `POST /folha/v1/colaboradores/{matricula}/rescisao` | `matricula:text*`, `tipoDesligamento:text*`, `dataDesligamento:date*` | `valorRescisao:number*` |
| `AUT-FOL-04` | Calcular folha | `POST /folha/v1/folhas/{competencia}/calculo` | `competencia:text*` | `quantidadeColaboradores:number*`, `totalBruto:number*`, `totalLiquido:number*`, `totalEncargos:number*` |
| `AUT-FOL-05` | Reprocessar folha | `POST /folha/v1/folhas/{competencia}/reprocessamento` | `competencia:text*`, `ajustes:text*` | `reprocessada:boolean*` |
| `AUT-FOL-06` | Enviar holerites | `POST /folha/v1/folhas/{competencia}/holerites` | `competencia:text*` | `holeritesEnviados:number*` |
| `AUT-FOL-07` | Consultar saldo de férias | `GET /folha/v1/colaboradores/{matricula}/ferias` | `matricula:text*` | `saldoFerias:number` |
| `AUT-FOL-08` | Registrar férias | `POST /folha/v1/colaboradores/{matricula}/ferias` | `matricula:text*`, `dataInicioFerias:date*`, `quantidadeDias:number*`, `abonoPecuniario:boolean` | `idFerias:text*` |

### 5.14 Diretório Corporativo

| Id | Automação | Chamada | Entradas | Saídas |
|---|---|---|---|---|
| `AUT-DIR-01` | Provisionar acessos | `POST /diretorio/v1/colaboradores/{matricula}/acessos` | `matricula:text*`, `sistemas:list<text>*`, `perfil:text*` | `provisionado:boolean*`, `loginRede:text` |
| `AUT-DIR-02` | Revogar acessos | `POST /diretorio/v1/colaboradores/{matricula}/revogacao` | `matricula:text*` | `revogado:boolean*` |

`AUT-DIR-02` revoga todos os acessos da matrícula.

### 5.15 Monitoramento

| Id | Automação | Chamada | Entradas | Saídas |
|---|---|---|---|---|
| `AUT-MON-01` | Verificar saúde do sistema | `GET /monitoramento/v1/sistemas/{sistemaAfetado}/saude` | `sistemaAfetado:text*` | `sistemaSaudavel:boolean*` |

### 5.16 Notificações

Envia e-mail ou SMS. Um único contrato atende todos os processos: `modelo` escolhe o texto.

| Id | Automação | Chamada | Entradas | Saídas |
|---|---|---|---|---|
| `AUT-NOT-01` | Notificar | `POST /notificacoes/v1/mensagens` | `destinatario:text*`, `modelo:text*`, `referencia:text*` | `idMensagem:text*` |

### 5.17 Regulador Fictício

| Id | Automação | Chamada | Entradas | Saídas |
|---|---|---|---|---|
| `AUT-REG-01` | Enviar balancete | `POST /regulador/v1/balancetes` | `competencia:text*`, `idBalancete:text*` | `protocoloRegulador:text*` |

## 6. Sistemas que iniciam processos

Estes sistemas chamam `POST /api/instances` com o token de um bot ([workflow-engine.md](../../modules/workflow-engine.md) §15). O bot é o solicitante da instância, por isso estes processos não têm etapas na raia de Solicitantes.

| Sistema | Bot | Grupo | Inicia | Quando | `Idempotency-Key` |
|---|---|---|---|---|---|
| Agendador | `bot-agendador` | Integração - Agendador | [SEG-03](processos/seg-03-faturamento-de-comissoes.md) | Todo dia 5, sobre o mês anterior | `comissoes-<competencia>` |
| Agendador | `bot-agendador` | Integração - Agendador | [CON-02](processos/con-02-assembleia-de-consorcio.md) | Na data da assembleia de cada grupo | `assembleia-<grupo>-<data>` |
| Agendador | `bot-agendador` | Integração - Agendador | [CTB-04](processos/ctb-04-fechamento-contabil.md) | Todo dia 1, sobre o mês anterior | `fechamento-<competencia>` |
| Agendador | `bot-agendador` | Integração - Agendador | [RH-03](processos/rh-03-folha-de-pagamento.md) | Todo dia 25 | `folha-<competencia>` |
| Core Bancário | `bot-core-bancario` | Integração - Core Bancário | [CAD-02](processos/cad-02-atualizacao-cadastral.md) | 30 dias antes de vencer o cadastro | `cadastro-<documento>-<validade>` |
| Core Bancário | `bot-core-bancario` | Integração - Core Bancário | [CRE-03](processos/cre-03-cobranca-e-renegociacao.md) | Quando um contrato completa 30 dias de atraso | `cobranca-<contrato>-<vencimento>` |
| Sistema de Consórcios | `bot-consorcios` | Integração - Consórcios | [CON-03](processos/con-03-contemplacao.md) | Para cada cota contemplada | `contemplacao-<cota>` |
| Portal do Cliente | `bot-portal-cliente` | Integração - Portal do Cliente | [SEG-02](processos/seg-02-sinistro.md) | Quando o cliente avisa um sinistro | Gerada pelo portal |

No laboratório, estes disparos são feitos por quem conduz a execução, chamando o mock ou o próprio Chain. O Agendador não precisa ser um serviço real, só precisa ter a identidade de um bot.
