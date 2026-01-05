import { calculateCost, type SupportedModel } from "./token-counter";

interface UsageRecord {
  timestamp: number;
  model: SupportedModel;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  operation: string;
}

interface BudgetConfig {
  dailyLimit: number;
  monthlyLimit: number;
}

interface UsageStats {
  dailyUsage: number;
  monthlyUsage: number;
  dailyLimit: number;
  monthlyLimit: number;
  dailyRemaining: number;
  monthlyRemaining: number;
  isOverDailyLimit: boolean;
  isOverMonthlyLimit: boolean;
}

class CostTracker {
  private records: UsageRecord[] = [];
  private budget: BudgetConfig;

  constructor(budget: Partial<BudgetConfig> = {}) {
    this.budget = {
      dailyLimit: budget.dailyLimit ?? parseFloat(process.env.OPENAI_DAILY_BUDGET || "50"),
      monthlyLimit: budget.monthlyLimit ?? parseFloat(process.env.OPENAI_MONTHLY_BUDGET || "500"),
    };
  }

  private getStartOfDay(): number {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }

  private getStartOfMonth(): number {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }

  recordUsage(
    model: SupportedModel,
    inputTokens: number,
    outputTokens: number,
    operation: string
  ): UsageRecord {
    const cost = calculateCost(model, inputTokens, outputTokens);
    const record: UsageRecord = {
      timestamp: Date.now(),
      model,
      inputTokens,
      outputTokens,
      cost,
      operation,
    };
    this.records.push(record);
    return record;
  }

  getDailyUsage(): number {
    const startOfDay = this.getStartOfDay();
    return this.records
      .filter((r) => r.timestamp >= startOfDay)
      .reduce((sum, r) => sum + r.cost, 0);
  }

  getMonthlyUsage(): number {
    const startOfMonth = this.getStartOfMonth();
    return this.records
      .filter((r) => r.timestamp >= startOfMonth)
      .reduce((sum, r) => sum + r.cost, 0);
  }

  getUsageStats(): UsageStats {
    const dailyUsage = this.getDailyUsage();
    const monthlyUsage = this.getMonthlyUsage();

    return {
      dailyUsage,
      monthlyUsage,
      dailyLimit: this.budget.dailyLimit,
      monthlyLimit: this.budget.monthlyLimit,
      dailyRemaining: Math.max(0, this.budget.dailyLimit - dailyUsage),
      monthlyRemaining: Math.max(0, this.budget.monthlyLimit - monthlyUsage),
      isOverDailyLimit: dailyUsage >= this.budget.dailyLimit,
      isOverMonthlyLimit: monthlyUsage >= this.budget.monthlyLimit,
    };
  }

  canAfford(estimatedCost: number): boolean {
    const stats = this.getUsageStats();
    return (
      !stats.isOverDailyLimit &&
      !stats.isOverMonthlyLimit &&
      estimatedCost <= stats.dailyRemaining &&
      estimatedCost <= stats.monthlyRemaining
    );
  }

  estimateCost(
    model: SupportedModel,
    inputTokens: number,
    expectedOutputTokens: number = 2000
  ): number {
    return calculateCost(model, inputTokens, expectedOutputTokens);
  }

  getRecentRecords(limit: number = 100): UsageRecord[] {
    return this.records.slice(-limit);
  }

  getRecordsByOperation(operation: string): UsageRecord[] {
    return this.records.filter((r) => r.operation === operation);
  }

  getTotalCost(): number {
    return this.records.reduce((sum, r) => sum + r.cost, 0);
  }

  clearOldRecords(retentionDays: number = 30): void {
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    this.records = this.records.filter((r) => r.timestamp >= cutoff);
  }

  updateBudget(budget: Partial<BudgetConfig>): void {
    this.budget = { ...this.budget, ...budget };
  }
}

// Singleton instance
let costTracker: CostTracker | null = null;

export function getCostTracker(budget?: Partial<BudgetConfig>): CostTracker {
  if (!costTracker) {
    costTracker = new CostTracker(budget);
  }
  return costTracker;
}

export function resetCostTracker(): void {
  costTracker = null;
}

export type { BudgetConfig, UsageRecord, UsageStats, CostTracker };
