import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RITUAL_LOOKS, lookAtProgress, positionAtProgress, scrollProgress } from './ritualTimeline.js'

test('scroll maps to the entire photo sequence including both endpoints', () => {
  assert.equal(scrollProgress(80, 3000, 800, 80), 0)
  assert.equal(scrollProgress(-1020, 3000, 800, 80), 0.5)
  assert.equal(scrollProgress(-2120, 3000, 800, 80), 1)
  assert.equal(scrollProgress(1000, 3000, 800, 80), 0)
  assert.equal(scrollProgress(-5000, 3000, 800, 80), 1)
})

test('six beats alternate between each question and its supplied portrait', () => {
  assert.deepEqual([0, .2, .4, .6, .8, 1].map(value => positionAtProgress(value)), [0, 1, 2, 3, 4, 5])
  assert.deepEqual(RITUAL_LOOKS.map(look => positionAtProgress(look.progress)), [1, 3, 5])
  assert.deepEqual(RITUAL_LOOKS.map(look => look.prompt), ['Ponytails?', 'Messy buns?', 'On your wrist?'])
})

test('scroll transitions are continuous and reversible without overshoot', () => {
  const positions = Array.from({ length: 1001 }, (_, i) => positionAtProgress(i / 1000))
  for (let i = 1; i < positions.length; i++) {
    assert.ok(positions[i] >= positions[i - 1])
    assert.ok(positions[i] - positions[i - 1] < .02)
  }
  assert.equal(positions[0], 0)
  assert.equal(positions.at(-1), 5)
  assert.deepEqual([...positions].reverse(), Array.from({ length: 1001 }, (_, i) => positionAtProgress((1000 - i) / 1000)))
  assert.equal(positionAtProgress(-1), 0)
  assert.equal(positionAtProgress(2), 5)
})

test('paused and reduced-motion states show still compositions without intermediate transforms', () => {
  for (let i = 0; i <= 100; i++) {
    assert.ok(Number.isInteger(positionAtProgress(i / 100, false)))
  }
  assert.deepEqual(RITUAL_LOOKS.map(look => positionAtProgress(look.progress, false)), [1, 3, 5])
})

test('all three looks remain reachable forward and backward', () => {
  assert.deepEqual([0, .5, 1, .5, 0].map(value => RITUAL_LOOKS[lookAtProgress(value)].id),
    ['ponytail', 'bun', 'wrist', 'bun', 'ponytail'])
})

test('short sections never divide by zero', () => {
  assert.equal(scrollProgress(0, 800, 800, 80), 0)
  assert.equal(scrollProgress(0, 400, 800, 80), 0)
})
