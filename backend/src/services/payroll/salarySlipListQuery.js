/**
 * Salary slip list queries — dedupe legacy duplicate rows (same employee + month + year).
 */

/**
 * Aggregation stages: keep newest slip per employee/month/year.
 * @returns {import('mongoose').PipelineStage[]}
 */
export function dedupeSlipsByEmployeePeriodStages() {
  return [
    {
      $addFields: {
        _employeeKey: {
          $cond: [
            { $ifNull: ["$employee", false] },
            { $toString: "$employee" },
            null,
          ],
        },
      },
    },
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $group: {
        _id: {
          employee: "$_employeeKey",
          month: "$month",
          year: "$year",
        },
        doc: { $first: "$$ROOT" },
      },
    },
    { $replaceRoot: { newRoot: "$doc" } },
    { $project: { _employeeKey: 0 } },
  ];
}

/**
 * Build employee filter for slip list search (name or employee ID).
 * @param {string} search
 * @returns {Promise<import('mongoose').Types.ObjectId[]|null>}
 */
export async function resolveEmployeeIdsForSlipSearch(search, User) {
  const term = String(search || "").trim();
  if (!term) return null;

  const users = await User.find({
    $or: [
      { name: { $regex: term, $options: "i" } },
      { employeeId: { $regex: term, $options: "i" } },
    ],
  })
    .select("_id")
    .lean();

  return users.map((u) => u._id);
}
