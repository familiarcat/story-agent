/**
 * In-memory registry of concurrent crew runs for multi-client session isolation (phase 4).
 */
export interface RunHandle {
  missionId: string
  clientId: string
  startedAt: number
}

export class RunRegistry {
  private static registry = new Map<string, RunHandle>()

  /**
   * Register a new run
   * @returns false if missionId is already active
   */
  static register(missionId: string, clientId: string, startedAt: number): boolean {
    if (this.registry.has(missionId)) return false
    this.registry.set(missionId, { missionId, clientId, startedAt })
    return true
  }

  /**
   * Complete a run by missionId
   */
  static complete(missionId: string): void {
    this.registry.delete(missionId)
  }

  /**
   * Get all active handles
   */
  static active(): RunHandle[] {
    return Array.from(this.registry.values())
  }

  /**
   * Count of active runs
   */
  static activeCount(): number {
    return this.registry.size
  }

  /**
   * Get handles for a specific client
   */
  static byClient(clientId: string): RunHandle[] {
    return this.active().filter(handle => handle.clientId === clientId)
  }
}