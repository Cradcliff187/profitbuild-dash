export const getBudgetAlertThreshold = (): number => {
  const saved = localStorage.getItem('budgetAlertThreshold');
  if (saved) {
    const parsed = parseFloat(saved);
    return !isNaN(parsed) && parsed > 0 && parsed <= 100 ? parsed : 10;
  }
  return 10;
};

export const setBudgetAlertThreshold = (threshold: number): void => {
  if (threshold > 0 && threshold <= 100) {
    localStorage.setItem('budgetAlertThreshold', threshold.toString());
  }
};