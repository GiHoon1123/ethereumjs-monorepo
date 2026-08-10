import { MapDB, hexToBytes, utf8ToBytes } from '@ethereumjs/util'
import { assert, describe, it } from 'vitest'

import { CheckpointDB } from '../../src/db/checkpoint.ts'

describe('CheckpointDB', () => {
  it('does not let a cached value mask checkpointed writes', async () => {
    const db = new CheckpointDB({ db: new MapDB(), cacheSize: 100 })
    const key = utf8ToBytes('key')
    const initialValue = utf8ToBytes('initial')
    const updatedValue = utf8ToBytes('updated')

    await db.put(key, initialValue)
    assert.deepEqual(await db.get(key), initialValue)

    db.checkpoint(hexToBytes('0x01'))
    await db.put(key, updatedValue)
    assert.deepEqual(await db.get(key), updatedValue)

    await db.del(key)
    assert.isUndefined(await db.get(key))
  })

  it('does not let a value cached during a checkpoint mask a later write', async () => {
    const db = new CheckpointDB({ db: new MapDB(), cacheSize: 100 })
    const key = utf8ToBytes('key')
    const initialValue = utf8ToBytes('initial')
    const updatedValue = utf8ToBytes('updated')

    // batch() writes directly to the backing DB without populating the cache.
    await db.batch([{ type: 'put', key, value: initialValue }])
    db.checkpoint(hexToBytes('0x01'))

    // This first checkpointed read populates both the cache and checkpoint diff.
    assert.deepEqual(await db.get(key), initialValue)

    await db.put(key, updatedValue)
    assert.deepEqual(await db.get(key), updatedValue)

    await db.del(key)
    assert.isUndefined(await db.get(key))
  })
})
