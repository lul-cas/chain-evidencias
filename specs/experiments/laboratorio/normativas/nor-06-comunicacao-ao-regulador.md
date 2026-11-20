# Circular 06/2026: comunicação de operações de crédito

- **Emissor:** Regulador.
- **Dirigida a:** setor de Crédito.
- **Vigência:** a partir da publicação.

## Por que

O regulador passa a acompanhar as operações de crédito do sistema financeiro.

## O que passa a valer

1. Toda liberação de crédito é comunicada ao regulador logo depois de liberada.
2. O protocolo devolvido pelo regulador fica guardado no pedido.

## Anexo técnico

| Item | Valor |
|---|---|
| Chamada | `POST /regulador/v1/operacoes-credito` |
| Credencial | Cabeçalho `X-Api-Key`, com a chave do banco junto ao regulador |
| Corpo | `numeroContrato` (texto), `documentoCliente` (texto), `valorLiberado` (número) e `dataLiberacao` (data) |
| Resposta | `protocoloComunicacao` (texto) |
