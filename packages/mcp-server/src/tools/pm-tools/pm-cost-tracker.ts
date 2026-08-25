export class PmCostTracker {
  private fieldAccessCounts: Record<string, Record<string, Record<string, { calls: number; costUSD: number }>>> = {};

  recordFieldAccess(toolType: string, fieldName: string, operation: string, apiCallsMade: number, costUSD: number) {
    if (!this.fieldAccessCounts[toolType]) {
      this.fieldAccessCounts[toolType] = {};
    }
    if (!this.fieldAccessCounts[toolType][fieldName]) {
      this.fieldAccessCounts[toolType][fieldName] = {};
    }
    if (!this.fieldAccessCounts[toolType][fieldName][operation]) {
      this.fieldAccessCounts[toolType][fieldName][operation] = { calls: 0, costUSD: 0 };
    }
    this.fieldAccessCounts[toolType][fieldName][operation].calls += apiCallsMade;
    this.fieldAccessCounts[toolType][fieldName][operation].costUSD += costUSD;
  }

  getCostPerTool(toolType: string): { totalCostUSD: number; topFields: Array<{ field: string; calls: number; pctOfTotal: number }>; apiCallCount: number } {
    if (!this.fieldAccessCounts[toolType]) {
      return { totalCostUSD: 0, topFields: [], apiCallCount: 0 };
    }

    const fields = Object.keys(this.fieldAccessCounts[toolType]);
    let totalCostUSD = 0;
    let totalCalls = 0;
    const fieldStats = fields.map(field => {
      const fieldOperations = this.fieldAccessCounts[toolType][field];
      const fieldCalls = Object.values(fieldOperations).reduce((sum, op) => sum + op.calls, 0);
      const fieldCost = Object.values(fieldOperations).reduce((sum, op) => sum + op.costUSD, 0);
      totalCostUSD += fieldCost;
      totalCalls += fieldCalls;
      return { field, calls: fieldCalls, cost: fieldCost };
    });

    const topFields = fieldStats
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 5)
      .map(field => ({ field: field.field, calls: field.calls, pctOfTotal: (field.calls / totalCalls) * 100 }));

    return { totalCostUSD, topFields, apiCallCount: totalCalls };
  }

  checkFieldCap(toolType: string, fieldName: string): boolean {
    const baseline = 15; // 15% baseline cap
    const stats = this.getCostPerTool(toolType);
    const fieldStat = stats.topFields.find(f => f.field === fieldName);
    return fieldStat ? fieldStat.pctOfTotal <= baseline : true;
  }

  storeStressTestMetrics(toolType: string, metricsJson: string) {
    // TODO: Implement CloudWatch integration for stress test metrics
  }
}