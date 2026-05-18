import Budget from '../models/budgetModel.js';

function getFinancialYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

export async function checkBudget(departmentId, projectId, financialYear, amount) {
  const query = projectId
    ? { project: projectId, financialYear }
    : { department: departmentId, financialYear };
  const budget = await Budget.findOne(query);
  if (!budget) return { available: 0, exceeded: true, noBudget: true };
  const committed = budget.procurementCommitted || 0;
  const spent = budget.procurementSpent || 0;
  const expenseSpent = budget.spent || 0;
  const available = budget.totalAmount - committed - spent - expenseSpent;
  return { available, exceeded: amount > available, budget };
}

export async function commitBudget(budgetId, amount) {
  return Budget.findByIdAndUpdate(
    budgetId,
    { $inc: { procurementCommitted: amount } },
    { new: true }
  );
}

export async function releaseBudget(budgetId, amount) {
  return Budget.findByIdAndUpdate(
    budgetId,
    { $inc: { procurementCommitted: -amount } },
    { new: true }
  );
}

export async function recordSpend(budgetId, amount) {
  return Budget.findByIdAndUpdate(
    budgetId,
    { $inc: { procurementCommitted: -amount, procurementSpent: amount } },
    { new: true }
  );
}

export { getFinancialYear };
