import { toProRataComponentMaps } from "../services/payroll/payrollCorrectnessHelpers.js";

export const calculateProRataSalarySlip = ({
  oldStructure,
  newStructure,
  effectiveDate,
  monthDate
}) => {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const totalDaysInMonth = monthEnd.getDate();

  const effDate = new Date(effectiveDate);
  effDate.setHours(0, 0, 0, 0);
  monthStart.setHours(0, 0, 0, 0);

  let daysWorkedOld = 0;
  let daysWorkedNew = 0;

  if (effDate <= monthStart) {
    daysWorkedOld = 0;
    daysWorkedNew = totalDaysInMonth;
  } else if (effDate > monthEnd) {
    daysWorkedOld = totalDaysInMonth;
    daysWorkedNew = 0;
  } else {
    daysWorkedOld = effDate.getDate() - 1;
    daysWorkedNew = totalDaysInMonth - daysWorkedOld;
  }

  const oldMaps = toProRataComponentMaps(oldStructure);
  const newMaps = toProRataComponentMaps(newStructure);

  const earnings = calculateProRataComponents(
    oldMaps.earnings,
    newMaps.earnings,
    daysWorkedOld,
    daysWorkedNew,
    totalDaysInMonth
  );

  const deductions = calculateProRataComponents(
    oldMaps.deductions,
    newMaps.deductions,
    daysWorkedOld,
    daysWorkedNew,
    totalDaysInMonth
  );

  return {
    isProRata: daysWorkedOld > 0 && daysWorkedNew > 0,
    effectiveDate: effDate,
    daysWorkedOld,
    daysWorkedNew,
    totalDaysInMonth,
    earnings,
    deductions
  };
};

const calculateProRataComponents = (
  oldComponents,
  newComponents,
  daysOld,
  daysNew,
  totalDays
) => {
  const result = {};
  const allKeys = new Set([
    ...Object.keys(oldComponents || {}),
    ...Object.keys(newComponents || {})
  ]);

  allKeys.forEach(key => {
    const oldValue = oldComponents[key] || 0;
    const newValue = newComponents[key] || 0;
    const oldDailyRate = oldValue / totalDays;
    const newDailyRate = newValue / totalDays;
    const proRataAmount = (oldDailyRate * daysOld) + (newDailyRate * daysNew);

    result[key] = {
      old: oldValue,
      new: newValue,
      proRata: Math.round(proRataAmount * 100) / 100,
      daysOld,
      daysNew,
      oldDailyRate: Math.round(oldDailyRate * 100) / 100,
      newDailyRate: Math.round(newDailyRate * 100) / 100
    };
  });

  return result;
};

export const calculateProRataTotals = (earnings, deductions) => {
  const totalEarnings = Object.values(earnings || {}).reduce(
    (sum, component) => sum + (component.proRata || 0),
    0
  );

  const totalDeductions = Object.values(deductions || {}).reduce(
    (sum, component) => sum + (component.proRata || 0),
    0
  );

  return {
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netSalary: Math.round((totalEarnings - totalDeductions) * 100) / 100
  };
};
