"""Reconta Q2 (elementos criados, alterados ou removidos) das dez mudanças a partir dos
registros das sessões da analista, sem usar lab/conducao/medicao.mjs nem a stack chain-lab.

Uso:  python3 recontagem_q2.py ~/codes/chain/lab

Fonte: lab/evidencias/NOR-xx/execucao-n/transcricao.jsonl, que guarda cada documento que a
analista leu e cada operação que ela aplicou (ajustar_rascunho, salvar_rascunho, criar).
O "antes" é o rascunho que ela leu no início da sessão; o "depois" é esse rascunho com as
operações bem-sucedidas aplicadas. O script supõe que o rascunho lido era igual à versão
publicada e que o rascunho final foi o publicado; a contagem pelas versões publicadas
(medidas.json) é a que vale para o artigo, e esta serve de conferência por outro caminho.

Regra: a de alteracoes-previstas.md §2, aprovada antes das execuções. Um elemento é um nó
(id), um fluxo (origem e ramo), uma raia (id), um campo de formulário (chave) ou uma
automação; leiaute e versões fixadas não contam; passos de admin não contam.

Resultado em 20/11/2026: 1, 1, 0, 2, 2, 4, 25, 3, 0, 9, igual a medidas.json nas dez.
"""
import copy, glob, json, sys

LAB = sys.argv[1]

def tool_results(transcript):
    """Map tool_use id -> (name, input, result text) for one session transcript."""
    uses, out = {}, {}
    for line in open(transcript, encoding="utf-8"):
        line = line.strip()
        if not line:
            continue
        ev = json.loads(line)
        msg = ev.get("message") or {}
        content = msg.get("content")
        if not isinstance(content, list):
            continue
        for part in content:
            if part.get("type") == "tool_use":
                uses[part["id"]] = (part["name"], part.get("input"))
            elif part.get("type") == "tool_result":
                c = part.get("content")
                if isinstance(c, list):
                    c = "".join(x.get("text", "") for x in c if isinstance(x, dict))
                name, inp = uses.get(part["tool_use_id"], ("?", None))
                out[part["tool_use_id"]] = (name, inp, c, part.get("is_error", False))
    return list(out.values())

def pointer(doc, path):
    parts = [p.replace("~1", "/").replace("~0", "~") for p in path.split("/")[1:]]
    cur = doc
    for p in parts[:-1]:
        cur = cur[int(p)] if isinstance(cur, list) else cur[p]
    return cur, parts[-1]

def apply(doc, ops):
    doc = copy.deepcopy(doc)
    for op in ops:
        parent, key = pointer(doc, op["path"])
        if isinstance(parent, list):
            if op["op"] == "add":
                parent.append(op["value"]) if key == "-" else parent.insert(int(key), op["value"])
            elif op["op"] == "remove":
                del parent[int(key)]
            elif op["op"] == "replace":
                parent[int(key)] = op["value"]
        else:
            if op["op"] == "remove":
                del parent[key]
            else:
                parent[key] = op["value"]
    return doc

def strip(x, drop=("layout",)):
    if isinstance(x, dict):
        return {k: strip(v, drop) for k, v in x.items() if k not in drop}
    if isinstance(x, list):
        return [strip(v, drop) for v in x]
    return x

def unpin(node):
    node = strip(node)
    for k in ("form", "automation", "workflow"):
        if isinstance(node.get(k), dict):
            node[k] = {a: b for a, b in node[k].items() if a != "version"}
    return node

def diff(before, after, key, norm):
    a = {key(x): json.dumps(norm(x), sort_keys=True) for x in before}
    b = {key(x): json.dumps(norm(x), sort_keys=True) for x in after}
    created = [k for k in b if k not in a]
    removed = [k for k in a if k not in b]
    altered = [k for k in b if k in a and a[k] != b[k]]
    return created, altered, removed

def fields(components, prefix=""):
    out = []
    for c in components:
        rest = {k: v for k, v in c.items() if k != "components"}
        rest["_path"] = prefix + c["key"]
        out.append(rest)
        out += fields(c.get("components") or [], prefix + c["key"] + ".")
    return out

def count_workflow(before, after):
    n = diff(before["nodes"], after["nodes"], lambda x: x["id"], unpin)
    f = diff(before["flows"], after["flows"], lambda x: (x["source"], x.get("branch")),
             lambda x: {k: v for k, v in strip(x).items() if k != "id"})
    l = diff(before["lanes"], after["lanes"], lambda x: x["id"], strip)
    return {"nos": n, "fluxos": f, "raias": l}

def total(d):
    return sum(len(part) for triple in d.values() for part in triple)

grand = {}
for n in range(1, 11):
    nor = f"NOR-{n:02d}"
    docs, names, kinds = {}, {}, {}      # id -> current draft document as the analyst saw/edited it
    first = {}                            # id -> document as first read (published before the change)
    created_ids = {}
    detail, elements = [], 0
    for ex in sorted(glob.glob(f"{LAB}/evidencias/{nor}/execucao-*")):
        for name, inp, res, is_err in tool_results(ex + "/transcricao.jsonl"):
            short = name.split("__")[-1]
            try:
                body = json.loads(res) if res else None
            except Exception:
                body = None
            if short == "ler" and isinstance(body, dict) and not is_err:
                path = inp["caminho"]
                seg = path.strip("/").split("/")
                if len(seg) == 3 and seg[1] in ("workflows", "forms", "automations") and seg[2] not in ("groups", "resources"):
                    rid = seg[2]
                    doc = body.get("draft") or body.get("document") or (body.get("latest") or {}).get("document")
                    names[rid] = body.get("name"); kinds[rid] = seg[1]
                    if rid not in first and rid not in created_ids:
                        first[rid] = {"keys": sorted(body.keys())}
                        first[rid]["doc"] = doc
                    if doc is not None and rid not in docs:
                        docs[rid] = copy.deepcopy(doc)
            elif short == "criar" and isinstance(body, dict) and not is_err:
                rid = body.get("id")
                created_ids[rid] = inp["colecao"]; names[rid] = inp["nome"]; kinds[rid] = inp["colecao"]
            elif short == "salvar_rascunho" and not is_err:
                docs[inp["id"]] = copy.deepcopy(inp["documento"])
            elif short == "ajustar_rascunho" and not is_err:
                docs[inp["id"]] = apply(docs[inp["id"]], inp["operacoes"])
    for rid, kind in kinds.items():
        if rid not in docs:
            continue
        after = docs[rid]
        if rid in created_ids:
            if kind == "workflows":
                t = len(after["nodes"]) + len(after["flows"]) + len(after["lanes"])
            elif kind == "forms":
                t = len(fields(after["components"]))
            else:
                t = 1
            detail.append((names[rid], "novo", t)); elements += t
            continue
        before = first.get(rid, {}).get("doc")
        if before is None:
            continue
        if kind == "workflows":
            d = count_workflow(before, after); t = total(d)
            if t:
                detail.append((names[rid], {k: [len(x) for x in v] for k, v in d.items()}, t))
        elif kind == "forms":
            c, a, r = diff(fields(before["components"]), fields(after["components"]), lambda x: x["_path"], lambda x: x)
            t = len(c) + len(a) + len(r)
            if t:
                detail.append((names[rid], {"campos": [len(c), len(a), len(r)]}, t))
        else:
            t = 0
        elements += t
    grand[nor] = elements
    stored = json.load(open(f"{LAB}/evidencias/{nor}/medidas.json"))["elementos"]
    print(f"{nor}: recontado={elements}  medidas.json={stored}  {'OK' if elements == stored else 'DIVERGE'}")
    for d in detail:
        print("     ", d)
