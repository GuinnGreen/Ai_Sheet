import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { getApiKey, setApiKey, getSelectedModel, setSelectedModel } from './settings'

describe('settings', () => {
  beforeEach(async () => { await db.delete(); await db.open() })

  it('API key 存取', async () => {
    expect(await getApiKey()).toBeNull()
    await setApiKey('AIza...')
    expect(await getApiKey()).toBe('AIza...')
  })

  it('model 預設 flash', async () => {
    expect(await getSelectedModel()).toBe('gemini-2.5-flash')
    await setSelectedModel('gemini-2.5-pro')
    expect(await getSelectedModel()).toBe('gemini-2.5-pro')
  })
})
