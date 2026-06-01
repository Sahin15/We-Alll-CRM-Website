const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const calculateOfferSalary = (salary = {}) => {
  const basic = toNum(salary.basic);
  const hra = toNum(salary.hra);
  const mobile = toNum(salary.mobile);
  const special = toNum(salary.special);
  const pfEmployer = toNum(salary.pfEmployer);
  const gratuity = toNum(salary.gratuity);
  const pfEmployee = toNum(salary.pfEmployee);

  const totalEarnings = basic + hra + mobile + special;
  const othersTotal = pfEmployer + gratuity;
  const totalCtcMonthly = totalEarnings + othersTotal;
  const annualCtc = totalCtcMonthly * 12;
  const netPay = totalEarnings - pfEmployee;

  return {
    totalEarnings,
    othersTotal,
    totalCtcMonthly,
    annualCtc,
    monthlyGross: totalEarnings,
    netPay,
  };
};
