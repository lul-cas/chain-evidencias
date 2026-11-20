// As ferramentas de Ana (protocolo.md §2): o que elas fazem com um documento.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { acomodar, aplicar, semLayout } from '../ajuste.mjs';

test('add em objeto, em posição de lista e no fim da lista', () => {
  const doc = { a: { b: 1 }, lista: ['x', 'z'] };
  const novo = aplicar(doc, [
    { op: 'add', path: '/a/c', value: 2 },
    { op: 'add', path: '/lista/1', value: 'y' },
    { op: 'add', path: '/lista/-', value: 'w' },
  ]);
  assert.deepEqual(novo, { a: { b: 1, c: 2 }, lista: ['x', 'y', 'z', 'w'] });
  assert.deepEqual(doc, { a: { b: 1 }, lista: ['x', 'z'] }, 'o original não muda');
});

test('replace e remove', () => {
  assert.deepEqual(aplicar({ a: 1, b: [1, 2, 3] }, [{ op: 'replace', path: '/a', value: 9 }, { op: 'remove', path: '/b/1' }]), { a: 9, b: [1, 3] });
});

test('caminhos com ~ são escapados', () => {
  assert.deepEqual(aplicar({ 'a/b': 1 }, [{ op: 'replace', path: '/a~1b', value: 2 }]), { 'a/b': 2 });
});

test('um caminho errado é um erro, que diz qual', () => {
  assert.throws(() => aplicar({ a: 1 }, [{ op: 'replace', path: '/b', value: 1 }]), /\/b/);
  assert.throws(() => aplicar({ a: [1] }, [{ op: 'remove', path: '/a/5' }]), /\/a\/5/);
  assert.throws(() => aplicar({ a: [1] }, [{ op: 'remove', path: '/a/1' }]), /\/a\/1/, 'logo depois do fim também não existe');
  assert.throws(() => aplicar({ a: { b: 1 } }, [{ op: 'add', path: '/x/y', value: 1 }]), /\/x\/y/);
  assert.throws(() => aplicar({}, [{ op: 'move', path: '/a', from: '/b' }]), /move/);
});

test('o layout sai da leitura, em qualquer profundidade, sem mudar as posições das listas', () => {
  const doc = { draft: { lanes: [{ id: 'l', layout: { x: 1 } }], nodes: [{ id: 'a', layout: { x: 2 } }, { id: 'b' }], flows: [{ id: 'f', layout: { mode: 'HV' } }] } };
  assert.deepEqual(semLayout(doc), { draft: { lanes: [{ id: 'l' }], nodes: [{ id: 'a' }, { id: 'b' }], flows: [{ id: 'f' }] } });
});

test('um nó novo fica perto do nó que leva a ele', () => {
  const doc = {
    lanes: [{ id: 'l', layout: { x: 40, y: 30, w: 900, h: 130 } }],
    nodes: [{ id: 'a', type: 'task', laneId: 'l', layout: { x: 100, y: 50, w: 140, h: 70 } }, { id: 'n', type: 'gateway', laneId: 'l' }],
    flows: [{ id: 'f', source: 'a', target: 'n' }],
  };
  const { layout } = acomodar(doc).nodes[1];
  assert.equal(layout.w, 70);
  assert.ok(layout.x > 100, 'à direita de quem leva a ele');
});

test('uma raia nova fica abaixo da última', () => {
  const doc = {
    lanes: [{ id: 'l', layout: { x: 40, y: 30, w: 900, h: 130 } }, { id: 'n' }],
    nodes: [],
    flows: [],
  };
  assert.deepEqual(acomodar(doc).lanes[1].layout, { x: 40, y: 170, w: 900, h: 130 });
});

test('um nó que mudou de raia vai para a faixa dela', () => {
  const doc = {
    lanes: [{ id: 'a', layout: { x: 40, y: 30, w: 900, h: 130 } }, { id: 'b', layout: { x: 40, y: 170, w: 900, h: 130 } }],
    nodes: [{ id: 'n', type: 'task', laneId: 'b', layout: { x: 300, y: 50, w: 140, h: 70 } }],
    flows: [],
  };
  const { layout } = acomodar(doc).nodes[0];
  assert.ok(layout.y >= 170 && layout.y + layout.h <= 300);
  assert.equal(layout.x, 300);
});

test('um documento sem nada novo não muda', () => {
  const doc = { lanes: [{ id: 'a', layout: { x: 40, y: 30, w: 900, h: 130 } }], nodes: [{ id: 'n', type: 'task', laneId: 'a', layout: { x: 300, y: 50, w: 140, h: 70 } }], flows: [] };
  assert.deepEqual(acomodar(doc), doc);
});
