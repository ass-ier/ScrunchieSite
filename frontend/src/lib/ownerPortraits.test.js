import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { RITUAL_LOOKS } from './ritualTimeline.js'

const manifest = JSON.parse(readFileSync(new URL('../../public/ritual/owner-portraits.json', import.meta.url)))

test('the provided triptych is divided into three complete panels without retouching', () => {
  assert.deepEqual(manifest.source_dimensions, [2000, 667])
  assert.equal(manifest.external_processing, false)
  assert.match(manifest.processing, /No facial, hair, body, or accessory edits/)
  assert.match(manifest.processing, /background removal via an alpha mask/)
  assert.equal(manifest.background_removal.execution, 'local CPU')
  assert.equal(manifest.background_removal.rgb_retouching, false)
  assert.deepEqual(manifest.panels.map(panel => panel.look), ['ponytail', 'bun', 'wrist'])
  assert.equal(manifest.panels[0].crop[0], 0)
  assert.equal(manifest.panels[2].crop[2], 2000)
  for (let i = 1; i < 3; i++) assert.equal(manifest.panels[i].crop[0], manifest.panels[i - 1].crop[2])
})

test('all owner photos and responsive versions have alpha transparency and fit the image budget', () => {
  let bytes = 0
  for (const look of RITUAL_LOOKS) {
    const panel = manifest.panels.find(panel => panel.look === look.id)
    assert.equal(look.width, panel.width)
    assert.equal(look.height, panel.height)
    assert.equal(panel.transparent_background, true)
    for (const suffix of ['', '-small']) {
      const image = readFileSync(new URL(`../../public/ritual/owner-${look.id}${suffix}.webp`, import.meta.url))
      assert.equal(image.subarray(0, 4).toString(), 'RIFF')
      assert.equal(image.subarray(8, 12).toString(), 'WEBP')
      const chunks = []
      for (let offset = 12; offset + 8 <= image.length;) {
        const size = image.readUInt32LE(offset + 4)
        chunks.push({ name: image.subarray(offset, offset + 4).toString(), offset })
        offset += 8 + size + (size % 2)
      }
      const header = chunks.find(chunk => chunk.name === 'VP8X')
      assert.ok(header && (image[header.offset + 8] & 0x10), `${look.id}${suffix} must declare alpha transparency`)
      assert.ok(chunks.some(chunk => chunk.name === 'ALPH'), `${look.id}${suffix} must include its background-removal mask`)
      bytes += image.length
    }
  }
  assert.ok(bytes < 400 * 1024)
})

test('the live section does not load the mannequin or claim to reconstruct a person', () => {
  const component = readFileSync(new URL('../components/WearRitual.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(component, /BlenderRitualStage|akeya-ritual\.glb|reconstruction/)
  assert.match(component, /owner-\$\{look.id\}/)
})
