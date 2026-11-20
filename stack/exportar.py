#!/usr/bin/env python3
"""Exporta da stack do laboratório as versões publicadas e as linhas do tempo das instâncias em andamento.

Uso:  python3 stack/exportar.py <pasta lab do repositório de desenvolvimento> <pasta de saída>

Só lê: cada chamada é um GET à API do protótipo (http://localhost:56080), com os tokens das personas
guardados em lab/.segredos/bots.json, que não fazem parte deste pacote. Por isso o script só roda na
máquina do laboratório, com a stack no ar; está aqui para mostrar como os arquivos de stack/ foram obtidos.

Grava na pasta de saída:
  processos/<código>/v<n>.json, formularios/<código>/v<n>.json, automacoes/<código>/v<n>.json
      a resposta de GET /api/{workflows|forms|automations}/{id}/versions/{n}, sem alteração;
  instancias/NOR-xx-<id>.json
      a resposta de GET /api/instances/{id} de cada instância deixada em andamento
      (os ids vêm de lab/evidencias/NOR-xx/estado.json, campo "roteiro");
  indice.json
      o que foi exportado, com a data de publicação e o hash de cada versão.
"""
import json
import os
import re
import sys
import unicodedata
import urllib.error
import urllib.request

LAB, SAIDA = sys.argv[1], sys.argv[2]
BASE = 'http://localhost:56080'
BOTS = json.load(open(f'{LAB}/.segredos/bots.json'))
PASTAS = {'workflows': 'processos', 'forms': 'formularios', 'automations': 'automacoes'}


def get(caminho, quem='persona-ana'):
    pedido = urllib.request.Request(BASE + caminho, headers={'Accept': 'application/json', 'Authorization': 'Bearer ' + BOTS[quem]['token']})
    try:
        with urllib.request.urlopen(pedido, timeout=30) as resposta:
            return resposta.status, json.load(resposta)
    except urllib.error.HTTPError as erro:
        return erro.code, None


def gravar(caminho, dado):
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    with open(caminho, 'w', encoding='utf-8') as arquivo:
        json.dump(dado, arquivo, ensure_ascii=False, indent=2)
        arquivo.write('\n')


def codigo(nome):
    """CAD-01 para "CAD-01 Abertura de conta"; os processos dos padrões (PAD) levam o nome inteiro, que os distingue."""
    ascii_ = unicodedata.normalize('NFKD', nome).encode('ascii', 'ignore').decode()
    return re.sub(r'[^A-Za-z0-9]+', '-', ascii_ if ascii_.startswith('PAD') else ascii_.split(' ')[0]).strip('-')


indice = {}
for colecao, pasta in PASTAS.items():
    status, itens = get(f'/api/{colecao}')
    assert status == 200, (colecao, status)
    indice[pasta] = []
    for item in sorted(itens, key=lambda x: x['name']):
        versoes = []
        for numero in range(1, (item.get('latestVersion') or 0) + 1):
            status, versao = get(f"/api/{colecao}/{item['id']}/versions/{numero}")
            assert status == 200, (colecao, item['name'], numero, status)
            arquivo = f"{pasta}/{codigo(item['name'])}/v{numero}.json"
            gravar(f'{SAIDA}/{arquivo}', versao)
            versoes.append({'versao': numero, 'publicadaEm': versao.get('publishedAt'), 'hash': versao.get('contentHash'), 'arquivo': arquivo})
        indice[pasta].append({'nome': item['name'], 'id': item['id'], 'ultimaVersao': item.get('latestVersion'), 'versoes': versoes})

indice['instancias'] = []
for i in range(1, 11):
    normativa = f'NOR-{i:02d}'
    roteiro = json.load(open(f'{LAB}/evidencias/{normativa}/estado.json')).get('roteiro') or {}
    for identificador in roteiro.values():
        if not (isinstance(identificador, str) and re.fullmatch(r'[0-9a-f-]{36}', identificador)):
            continue
        # Cada persona só lê as instâncias de que participa: tenta uma a uma.
        for quem in BOTS:
            status, instancia = get(f'/api/instances/{identificador}', quem)
            if status == 200:
                break
        assert status == 200, (normativa, identificador, status)
        arquivo = f'instancias/{normativa}-{identificador}.json'
        gravar(f'{SAIDA}/{arquivo}', instancia)
        indice['instancias'].append({
            'mudanca': f'M{i}', 'normativa': normativa, 'id': identificador, 'processo': instancia['definitionName'],
            'versao': instancia['versionNumber'], 'status': instancia['status'], 'fim': instancia['currentNodeId'],
            'iniciadaEm': instancia['startedAt'], 'encerradaEm': instancia.get('endedAt'),
            'eventos': len(instancia['timeline']), 'lidaComo': quem, 'arquivo': arquivo,
        })

gravar(f'{SAIDA}/indice.json', indice)
print('versões:', sum(len(x['versoes']) for p in PASTAS.values() for x in indice[p]), '| instâncias:', len(indice['instancias']))
