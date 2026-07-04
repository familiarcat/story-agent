import { describe, it, expect, beforeEach } from 'vitest'
import { RunRegistry, RunHandle } from './run-registry.js'

describe('RunRegistry', () => {
  const testHandle: RunHandle = {
    missionId: 'test-mission',
    clientId: 'test-client',
    startedAt: 1234567890
  }

  beforeEach(() => {
    // Clear registry before each test
    RunRegistry.complete(testHandle.missionId)
  })

  it('register returns true and activeCount becomes 1', () => {
    expect(RunRegistry.register(testHandle.missionId, testHandle.clientId, testHandle.startedAt)).toBe(true)
    expect(RunRegistry.activeCount()).toBe(1)
  })

  it('registering same missionId returns false and activeCount stays 1', () => {
    RunRegistry.register(testHandle.missionId, testHandle.clientId, testHandle.startedAt)
    expect(RunRegistry.register(testHandle.missionId, 'another-client', 987654321)).toBe(false)
    expect(RunRegistry.activeCount()).toBe(1)
  })

  it('complete removes handle (activeCount 0)', () => {
    RunRegistry.register(testHandle.missionId, testHandle.clientId, testHandle.startedAt)
    RunRegistry.complete(testHandle.missionId)
    expect(RunRegistry.activeCount()).toBe(0)
  })

  it('byClient returns only that client\'s handles', () => {
    RunRegistry.register(testHandle.missionId, testHandle.clientId, testHandle.startedAt)
    RunRegistry.register('other-mission', 'other-client', 987654321)
    
    const clientHandles = RunRegistry.byClient(testHandle.clientId)
    expect(clientHandles.length).toBe(1)
    expect(clientHandles[0].missionId).toBe(testHandle.missionId)
  })

  it('active() returns all handles', () => {
    RunRegistry.register(testHandle.missionId, testHandle.clientId, testHandle.startedAt)
    RunRegistry.register('other-mission', 'other-client', 987654321)
    
    const allHandles = RunRegistry.active()
    expect(allHandles.length).toBe(2)
  })
})