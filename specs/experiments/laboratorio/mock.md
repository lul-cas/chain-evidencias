# Mock dos sistemas externos

- **Status:** Implementado no card [#291](https://github.com/lul-cas/chain/issues/291).
- **Parte de:** [Laboratório de avaliação do Chain](README.md).
- **Contratos:** [sistemas-externos.md](sistemas-externos.md). Este documento não os repete: ele define só o que os contratos deixam em aberto.
- **Código:** `lab/mock/`.

## 1. Propósito

O mock responde pelos 11 sistemas e pelas 28 automações que a onda 1 usa (LQ-15), e pela comunicação ao regulador que [NOR-06](normativas/nor-06-comunicacao-ao-regulador.md) exige. Os demais contratos ficam só documentados.

Ele existe para o laboratório alcançar cada caminho de propósito. Por isso a massa é fixa e cada desvio depende de um dado conhecido, não de sorte.

| Sistema | Prefixo | Automações |
|---|---|---|
| Core Bancário | `/core` | `AUT-CORE-01` a `AUT-CORE-13` |
| Validador Cadastral | `/validador` | `AUT-VAL-01` |
| Serviço de PLD | `/pld` | `AUT-PLD-01` |
| Bureau de Crédito | `/bureau` | `AUT-BUR-01` |
| Motor de Crédito | `/motor` | `AUT-MOT-01`, `AUT-MOT-02` |
| Assinador Eletrônico | `/assinador` | `AUT-ASS-01`, `AUT-ASS-02` |
| Registro de Garantias | `/garantias` | `AUT-GAR-01` |
| Seguradora Parceira | `/seguradora` | `AUT-SEG-01`, `AUT-SEG-02` |
| Razão Contábil | `/razao` | `AUT-RAZ-01`, `AUT-RAZ-02` |
| Pagamentos | `/pagamentos` | `AUT-PAG-01`, `AUT-PAG-03` |
| Notificações | `/notificacoes` | `AUT-NOT-01` |
| Regulador Fictício | `/regulador` | A comunicação de NOR-06, que só passa a ser chamada depois dela |

## 2. Como ele funciona

- **Um só serviço.** É um servidor Node sem dependências, na rede interna do compose, e usa a mesma imagem do frontend, como o stub dos testes e2e. A stack não ganha uma imagem nova.
- **Estado em memória.** O que uma automação grava, a seguinte lê: o cliente de `AUT-CORE-02` aparece em `AUT-CORE-01`. Reiniciar o serviço volta à massa.
- **Uma chave para todos.** Todas as credenciais têm o mesmo valor, `MOCK_API_KEY`. Sem a chave certa em `X-Api-Key`, a resposta é 401.
- **Idempotência.** A mesma `Idempotency-Key`, no mesmo método e caminho, devolve a resposta guardada, sem repetir o efeito.
- **Datas.** "Hoje" é a data em UTC−03:00, como no Chain, ou `MOCK_HOJE`, para testes.
- **Gatilhos.** O mock não inicia processos. Quem conduz o laboratório chama o Chain com o token do bot, como [sistemas-externos.md](sistemas-externos.md) §6 permite.

Respostas fora dos contratos:

| Situação | Resposta |
|---|---|
| Chave errada ou ausente | 401 |
| Caminho desconhecido | 404 |
| Corpo que não é JSON | 400 |

## 3. Massa de dados

Os documentos são gerados a partir da base da tabela, com dígitos verificadores válidos. Nomes e documentos são fictícios.

### 3.1 Clientes no Core

Saldo é o da conta. Parcelas, saldo devedor e atraso vêm de `AUT-CORE-07`: o saldo devedor é a soma dos contratos de §3.3 ou, sem contrato, 24 parcelas, e o atraso é o maior entre o da tabela e o dos contratos. Todos têm cadastro válido, situação `ativo`, sem restrição e sem apólices ou cotas, exceto o que a tabela diz.

| Base | Cliente | Renda | Score | Parcelas | Saldo | Particularidade | Serve para |
|---|---|---|---|---|---|---|---|
| `000000001` | Ana Clara Moreira | 12.000 | 800 | 300 | 2.500 | — | Aprovação automática |
| `000000002` | Bruno Teixeira | 8.000 | 650 | 800 | 900 | — | Análise do analista e alçadas |
| `000000003` | Carla Nunes | 5.000 | 350 | 200 | 100 | — | Recusa automática por score |
| `000000004` | Diogo Prado | 6.000 | 620 | 900 | 50 | Atraso de 120 dias | Recusa automática por atraso |
| `000000005` | Eduarda Campos | 7.000 | 700 | 400 | 800 | Cadastro vencido | CAD-02 dentro de CRE-01 |
| `000000006` | Fábio Rocha | 4.000 | 600 | 0 | 0 | Situação `bloqueado` | Cliente bloqueado |
| `000000007` | Gabriela Dias | 9.000 | 700 | 500 | 300 | 1 contrato e 1 apólice ativos | Encerramento com pendência |
| `000000008` | Heitor Lima | 3.500 | 640 | 0 | 1.500 | — | Encerramento com saldo |
| `000000009` | Íris Melo | 3.000 | 610 | 0 | 0 | — | Encerramento sem saldo |
| `000000010` | Júlio Braga | 10.000 | 780 | 200 | 1.200 | Assinatura demora | `gw_assinado` falso uma vez |
| `000000011` | Karina Alves | 6.500 | 690 | 300 | 700 | PLD `alerta` | Supervisão em CAD-02 |
| `000000012` | Leandro Reis | 15.000 | 720 | 1.000 | 4.000 | Com restrição de R$ 2.500 | Análise com restrição |
| `000000013` | Marcos Vale | 4.500 | 500 | 900 | 0 | — | Cobrança judicial |
| `000000014` | Nestor Sales | 11.000 | 790 | 100 | 600 | Aprovação vencida | `gw_dentro_validade` falso |

A empresa de CNPJ `900000010001` é a Oficina Boa Vista Ltda, com faturamento de 60.000, score 700, parcelas 3.000 e saldo 10.000.

### 3.2 Documentos fora do Core

Servem para CAD-01. Um documento com dígito errado é `inexistente`, e os demais são `regular` e `limpo`, com score 650.

| Base | Validador | PLD | Serve para |
|---|---|---|---|
| `000000101` | `regular` | `limpo` | Caminho feliz |
| `000000102` | `irregular` | `limpo` | Volta para a agência |
| `000000103` | `regular` | `alerta` | Supervisão |
| `000000104` | `regular` | `bloqueio` | Recusa sem análise |
| `000000105` | `regular` | `limpo`, com `pep: true` | Supervisão |

### 3.3 Contratos no Core

| Contrato | Cliente | Saldo devedor | Parcela | Atraso | Serve para |
|---|---|---|---|---|---|
| `CT-1001` | Bruno Teixeira | 12.000 | 600 | 45 dias | Renegociação |
| `CT-1002` | Marcos Vale | 30.000 | 900 | 400 dias | Cobrança judicial |
| `CT-1003` | Ana Clara Moreira | 9.000 | 300 | 0 | Sem atraso |

Um contrato desconhecido responde `encontrado: false`.

## 4. Regras dos sistemas

| Sistema | Regra |
|---|---|
| Motor de Crédito | A taxa mensal depende do score: 1,5% a partir de 750, 2,2% a partir de 600, e 3,5% abaixo disso. A parcela segue a tabela Price, com 2 casas, e o CET é a taxa composta em 12 meses. `AUT-MOT-02` devolve o que recebeu, com `decisaoCredito` igual a `decisao`. A exceção é a aprovação de Nestor Sales, que volta com a validade de ontem: sem esperar 15 dias, é a única forma de alcançar `fim_expirada`. |
| Assinador Eletrônico | O envelope está assinado na primeira consulta, exceto o de Júlio Braga, que só está na segunda. |
| Seguradora Parceira | O prêmio mensal é o capital vezes a taxa anual, dividido por 12, com 2 casas: vida 0,6%, residencial 0,3%, auto 4% e prestamista 1,2%. Exige subscrição o seguro de vida a partir de R$ 100 mil. A vigência é de um ano a partir de hoje. |
| Razão Contábil | Todo evento é classificado, exceto `ajuste_manual`, que volta com `classificado: false`. |
| Core Bancário | Criar um cliente deixa a situação `ativo`. Um contrato liberado soma ao saldo devedor e conta em `contratosAtivos`. Uma apólice registrada conta em `apolicesAtivas`. Encerrar a conta muda a situação para `encerrado`. |

Identificadores seguem um prefixo e uma sequência: `CLI-0001`, `CT-2001`, `AC-0001`, `ENV-0001`, `GR-0001`, `AP-0001`, `PG-0001`, `BL-0001`, `LC-0001`, `MSG-0001` e `REG-0001`.

## 5. Inspeção

Para o laboratório conferir efeitos, com a mesma chave:

| Chamada | Resposta |
|---|---|
| `GET /__mock/estado` | O que foi gravado: clientes, contratos, decisões, apólices, pagamentos, boletos, lançamentos, mensagens e comunicações ao regulador. |
| `POST /__mock/reiniciar` | Volta à massa inicial. |

## 6. Critérios de aceite

1. Toda automação da onda 1, lida de [sistemas-externos.md](sistemas-externos.md) e dos processos, responde 200 com todas as saídas obrigatórias, nos tipos declarados.
2. Cada linha de §3 produz o resultado que a tabela diz.
3. As respostas negativas têm HTTP 200 e só o campo de status: `encontrado: false`.
4. Valores respeitam os limites de [sistemas-externos.md](sistemas-externos.md) §3: até 2 casas em reais e 4 em taxas.
5. Sem a chave certa, a resposta é 401, em qualquer caminho.
6. Repetir uma `Idempotency-Key` não repete o efeito.
7. O cliente criado por `AUT-CORE-02` é lido por `AUT-CORE-01`, e o reinício apaga o que foi gravado.
