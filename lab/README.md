# Evaluation lab tooling

The tooling of the lab described in [specs/experiments/laboratorio/](../specs/experiments/laboratorio/README.md). It has no dependencies beyond Node 24 and Docker.

| Path | What it is | Spec |
|---|---|---|
| `mock/` | The mock of the external systems | [mock.md](../specs/experiments/laboratorio/mock.md) |
| `stack.sh`, `compose.yml` | The lab's own compose stack | Below |
| `cadastro/` | Registers the first wave in Chain, and verifies it | [cadastro.md](../specs/experiments/laboratorio/cadastro.md) |
| `agentes/` | Runs Ana, the isolated agent that applies the normativas | [protocolo.md](../specs/experiments/laboratorio/protocolo.md) |
| `conducao/` | The steps around each change, and the measures | [protocolo.md](../specs/experiments/laboratorio/protocolo.md) |
| `evidencias/` | What each change left: transcripts, tool calls and measures (R5) | [resultados.md](../specs/experiments/laboratorio/resultados.md) |

## The stack

```sh
lab/stack.sh up        # builds and starts it, and creates the admin the first time
lab/stack.sh logs mock # a service's logs
lab/stack.sh down      # stops it and keeps the data
lab/stack.sh destroy   # stops it and deletes the lab's data
```

It is a compose project of its own, `chain-lab`, so a developer's stack and data are never touched. Unlike the e2e stack, it stays up between runs, because the lab's data is the point.

| Service | Address |
|---|---|
| Chain | http://localhost:54300 |
| API | http://localhost:56080 |
| PostgreSQL | localhost:56432 |
| Mock | `http://mock:8080`, on the compose network only |

Generated passwords and keys stay in `lab/.segredos/`, which git ignores.

## Registering the processes

```sh
node lab/cadastro/cadastrar.mjs   # from the specs into Chain; it can run again
node lab/cadastro/verificar.mjs   # runs real paths through the personas, and fails on anything not covered
```

Verifying leaves instances behind, and they must not count as lab results. Recreate the stack afterwards, as [cadastro.md](../specs/experiments/laboratorio/cadastro.md) §4 says.

The admin is `lab-admin`, with the password in `lab/.segredos/admin.env`. The persona bots' tokens are in `lab/.segredos/bots.json`.

## Running a change

```sh
node lab/conducao/conduzir.mjs antes NOR-01   # leaves instances parked, and photographs the versions
node lab/agentes/rodar.mjs NOR-01             # Ana works; --continuar "message" resumes her session
node lab/conducao/conduzir.mjs depois NOR-01  # checks that new instances follow the new rule
node lab/conducao/conduzir.mjs fechar NOR-01  # finishes the parked instances, and measures
```

After the ten changes:

```sh
node lab/conducao/regressao.mjs   # the paths again, on the final versions; only the declared ones may fail
node lab/conducao/padroes.mjs     # R1: the 20 control-flow patterns, by execution
node lab/conducao/personas.mjs    # who acted in the instances, from Chain's timelines
```

## Tests

```sh
cd lab && npm test
```

CI doesn't run these tests: pipeline changes stay with the owner (ADR-0010 Q9).
