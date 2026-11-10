import User from "../../models/userModel.js";
import SalaryStructure from "../../models/salaryStructureModel.js";

/**
 * Merge internship / employment milestones with salary structure history.
 *
 * @param {string} employeeId
 * @returns {Promise<{ events: object[], employee: object }>}
 */
export async function buildCompensationTimeline(employeeId) {
  const employee = await User.findById(employeeId)
    .select(
      "name employeeId joiningDate employmentType fullTimeStartDate internshipDetails department designation"
    )
    .populate("department", "name")
    .lean();

  if (!employee) {
    const err = new Error("Employee not found");
    err.httpStatus = 404;
    throw err;
  }

  const structures = await SalaryStructure.find({ employee: employeeId })
    .sort({ effectiveFrom: 1 })
    .lean();

  const events = [];

  if (employee.joiningDate) {
    events.push({
      kind: "joined",
      label: "Joined organization",
      date: employee.joiningDate,
      amount: null,
      meta: { employmentType: employee.employmentType },
    });
  }

  if (
    employee.employmentType === "intern" &&
    employee.internshipDetails?.startDate
  ) {
    events.push({
      kind: "internship",
      label: "Internship",
      date: employee.internshipDetails.startDate,
      periodEnd: employee.internshipDetails.endDate || null,
      amount: employee.internshipDetails.stipend ?? null,
      meta: { duration: employee.internshipDetails.duration },
    });
  }

  if (employee.fullTimeStartDate) {
    events.push({
      kind: "full_time",
      label: "Converted to full-time",
      date: employee.fullTimeStartDate,
      amount: null,
    });
  }

  for (const s of structures) {
    const amount =
      s.payrollMode === "simple" && s.monthlySalary != null
        ? Number(s.monthlySalary)
        : Number(s.netSalary ?? s.grossSalary ?? s.basicSalary) || 0;

    events.push({
      kind: "salary_structure",
      label: s.changeReason || "Salary structure",
      date: s.effectiveFrom,
      periodEnd: s.effectiveTo || null,
      amount,
      status: s.status,
      payrollMode: s.payrollMode,
      notes: s.notes || null,
      structureId: String(s._id),
    });
  }

  events.sort((a, b) => new Date(a.date) - new Date(b.date));

  return { employee, events };
}

/**
 * Roster row for compensation payroll tab.
 *
 * @param {{ limit?: number }} [opts]
 */
export async function getCompensationRoster() {
  const { mergeExcludePastMembersFilter } = await import(
    "../../utils/employeeQueryUtils.js"
  );
  const employees = await User.find(
    mergeExcludePastMembersFilter({ role: { $nin: ["superadmin", "client"] } })
  )
    .select("name employeeId designation employmentType department")
    .populate("department", "name")
    .sort({ name: 1 })
    .lean();

  const ids = employees.map((e) => e._id);
  const structures = await SalaryStructure.find({
    employee: { $in: ids },
    status: "active",
  }).lean();
  const byEmp = new Map(structures.map((s) => [String(s.employee), s]));

  const rows = employees.map((emp) => {
    const structure = byEmp.get(String(emp._id));
    const monthlySalary =
      structure?.payrollMode === "simple"
        ? structure?.monthlySalary
        : structure?.netSalary ?? structure?.basicSalary;
    return {
      employee: emp,
      hasStructure: Boolean(structure),
      payrollMode: structure?.payrollMode || null,
      monthlySalary: monthlySalary != null ? Number(monthlySalary) : null,
      effectiveFrom: structure?.effectiveFrom || null,
    };
  });

  return { rows, total: rows.length };
}
