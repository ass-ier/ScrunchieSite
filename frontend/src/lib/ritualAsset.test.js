import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const asset = new URL('../../public/ritual/akeya-ritual.glb', import.meta.url)
const buffer = readFileSync(asset)
const jsonLength = buffer.readUInt32LE(12)
const gltf = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString())

test('the actual Blender export is a self-contained glTF within the loading budget', () => {
  assert.equal(buffer.subarray(0, 4).toString(), 'glTF')
  assert.equal(buffer.readUInt32LE(4), 2)
  assert.equal(buffer.readUInt32LE(8), buffer.length)
  assert.ok(buffer.length < 5 * 1024 * 1024)
  assert.equal(gltf.buffers.length, 1)
  assert.equal(gltf.buffers[0].uri, undefined)
  assert.ok(gltf.asset.generator.includes('Blender'))
})

test('camera, hair, arm and both scrunchies are genuinely animated in the asset', () => {
  assert.equal(gltf.cameras.length, 1)
  const channels = gltf.animations.flatMap(animation => animation.channels)
  for (const name of ['Ponytail choreography', 'Bun choreography', 'Forearm gesture', 'Hero lilac scrunchie', 'Butter wrist scrunchie', 'RitualCamera']) {
    const node = gltf.nodes.findIndex(node => node.name === name)
    assert.ok(node >= 0, `Missing ${name}`)
    assert.ok(channels.some(channel => channel.target.node === node), `Missing animation for ${name}`)
  }
  const samplers = gltf.animations.flatMap(animation => animation.samplers)
  const starts = samplers.map(sampler => gltf.accessors[sampler.input].min[0])
  const ends = samplers.map(sampler => gltf.accessors[sampler.input].max[0])
  assert.ok(Math.abs(Math.max(...ends) - Math.min(...starts) - 5) < 0.001)
})

test('all three Blender fallback images and editable source are delivered', () => {
  for (const look of ['ponytail', 'bun', 'wrist']) {
    const image = readFileSync(new URL(`../../public/ritual/blender-${look}.webp`, import.meta.url))
    assert.equal(image.subarray(0, 4).toString(), 'RIFF')
    assert.equal(image.subarray(8, 12).toString(), 'WEBP')
    assert.ok(image.length > 10000 && image.length < 150000)
  }
  assert.ok(statSync(new URL('../../../assets/blender/akeya-ritual.blend', import.meta.url)).size > 100000)
})

test('exported animation restores the same geometry when scrubbing backwards', async () => {
  const array = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  const model = await new GLTFLoader().parseAsync(array, '')
  const mixer = new THREE.AnimationMixer(model.scene)
  const actions = model.animations.map(clip => {
    const action = mixer.clipAction(clip).setLoop(THREE.LoopOnce, 1)
    action.clampWhenFinished = true
    action.play()
    return action
  })
  const tracks = model.animations.flatMap(clip => clip.tracks)
  const start = Math.min(...tracks.map(track => track.times[0]))
  const end = Math.max(...tracks.map(track => track.times[track.times.length - 1]))
  const pose = progress => {
    actions.forEach(action => { action.paused = false; action.enabled = true })
    mixer.setTime(start + (end - start) * progress)
    model.scene.updateMatrixWorld(true)
    const matrices = []
    model.scene.traverse(object => matrices.push(...object.matrixWorld.elements))
    return matrices.map(value => Number(value.toFixed(6)))
  }
  const ponytail = pose(0)
  const bun = pose(.5)
  const wrist = pose(1)
  assert.notDeepEqual(ponytail, bun)
  assert.notDeepEqual(bun, wrist)
  assert.deepEqual(pose(.5), bun)
  assert.deepEqual(pose(0), ponytail)
  mixer.stopAllAction()
  model.scene.traverse(object => { object.geometry?.dispose(); object.material?.dispose() })
})
