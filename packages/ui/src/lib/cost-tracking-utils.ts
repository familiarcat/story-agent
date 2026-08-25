/**
 * cost-tracking-utils.ts — Utilities for cost tracking and ROI calculations
 *
 * Pure functions for calculating crew hours cost, ROI, currency formatting,
 * and budget management.
 */

/**
 * Calculate total cost of crew hours
 * @param crewHours Object mapping role to hours worked
 * @param ratePerHour Hourly rate in USD
 * @returns Total cost in USD
 */
export function calculateCrewHoursCost(crewHours: Record<string, number>, ratePerHour: number): number {
  const totalHours = Object.values(crewHours).reduce((sum, hours) => sum + hours, 0);
  return totalHours * ratePerHour;
}

/**
 * Compute ROI (return on investment)
 * @param storiesDelivered Number of accepted stories
 * @param totalCost Total spend in USD
 * @returns ROI metric (stories per $1000 spent)
 */
export function computeROI(storiesDelivered: number, totalCost: number): number {
  if (totalCost === 0) return 0;
  return (storiesDelivered / totalCost) * 1000;
}

/**
 * Format a number as currency
 * @param value The value in USD
 * @param options Optional formatting options
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(
  value: number,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    compact?: boolean;
  }
): string {
  const fractionDigits = options?.maximumFractionDigits ?? 2;

  if (options?.compact && Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }

  if (options?.compact && Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/**
 * Estimate budget remaining
 * @param totalBudget Total budget allocation in USD
 * @param spent Amount already spent in USD
 * @returns Remaining budget amount
 */
export function estimateBudgetRemaining(totalBudget: number, spent: number): number {
  return Math.max(0, totalBudget - spent);
}

/**
 * Calculate budget variance percentage
 * @param spent Amount spent in USD
 * @param budgeted Total budget in USD
 * @returns Percentage variance (-100 to +Infinity)
 */
export function calculateBudgetVariance(spent: number, budgeted: number): number {
  if (budgeted === 0) return 0;
  return ((spent / budgeted) * 100 - 100).toFixed(1) as unknown as number;
}

/**
 * Get budget status based on variance
 * @param variance The budget variance percentage
 * @returns Status: 'good' | 'warning' | 'critical'
 */
export function getBudgetStatus(variance: number): 'good' | 'warning' | 'critical' {
  if (variance <= -20) return 'good'; // Well under budget
  if (variance <= 10) return 'warning'; // Close to budget
  return 'critical'; // Over budget
}

/**
 * Calculate cost per story delivered
 * @param totalCost Total cost in USD
 * @param storiesDelivered Number of stories delivered
 * @returns Cost per story
 */
export function calculateCostPerStory(totalCost: number, storiesDelivered: number): number {
  if (storiesDelivered === 0) return 0;
  return totalCost / storiesDelivered;
}

/**
 * Estimate cost for N stories based on average
 * @param costPerStory Average cost per story
 * @param numberOfStories Number of stories to estimate for
 * @returns Estimated total cost
 */
export function estimateCostForStories(costPerStory: number, numberOfStories: number): number {
  return costPerStory * numberOfStories;
}

/**
 * Calculate burn rate (cost per day)
 * @param totalCost Total cost to date in USD
 * @param daysElapsed Days since project start
 * @returns Daily burn rate in USD
 */
export function calculateBurnRate(totalCost: number, daysElapsed: number): number {
  if (daysElapsed === 0) return 0;
  return totalCost / daysElapsed;
}

/**
 * Estimate days until budget exhaustion
 * @param remainingBudget Remaining budget in USD
 * @param dailyBurnRate Daily burn rate in USD
 * @returns Estimated days until budget is exhausted
 */
export function estimateDaysUntilBudgetExhausted(
  remainingBudget: number,
  dailyBurnRate: number
): number {
  if (dailyBurnRate <= 0) return Infinity;
  return remainingBudget / dailyBurnRate;
}
