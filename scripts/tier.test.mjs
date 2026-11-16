import { test } from 'node:test';
import assert from 'node:assert';
import { pickTier } from '../src/lib/tier.ts';

const base = { reducedMotion: false, saveData: false, cores: 8 };

test('valid override wins over every signal', () => {
  assert.equal(pickTier({ ...base, override: 'full', reducedMotion: true }), 'full');
  assert.equal(pickTier({ ...base, override: 'still' }), 'still');
  assert.equal(pickTier({ ...base, override: 'lite' }), 'lite');
});
test('invalid override is ignored', () => {
  assert.equal(pickTier({ ...base, override: 'ultra' }), 'full');
  assert.equal(pickTier({ ...base, override: null }), 'full');
});
test('reduced motion gives still', () => assert.equal(pickTier({ ...base, reducedMotion: true }), 'still'));
// docs/07 §4: films need no WebGL2 (an opaque film is a 2D canvas), so it is no longer a signal.
test('WebGL2 is not a signal', () => assert.equal(pickTier({ ...base, webgl2: false }), 'full'));
test('Save-Data gives still', () => assert.equal(pickTier({ ...base, saveData: true }), 'still'));
test('deviceMemory 4 gives lite', () => assert.equal(pickTier({ ...base, deviceMemory: 4 }), 'lite'));
test('deviceMemory undefined with 8 cores gives full', () =>
  assert.equal(pickTier({ ...base, deviceMemory: undefined }), 'full'));
test('cores 4 gives lite', () => assert.equal(pickTier({ ...base, cores: 4 }), 'lite'));
test('avgFrameMs 22 gives lite', () => assert.equal(pickTier({ ...base, avgFrameMs: 22 }), 'lite'));
test('avgFrameMs 16 gives full', () => assert.equal(pickTier({ ...base, avgFrameMs: 16 }), 'full'));
test('reduced motion beats Save-Data', () =>
  assert.equal(pickTier({ ...base, reducedMotion: true, saveData: true }), 'still'));
