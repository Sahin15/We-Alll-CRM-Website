import ProcurementCounter from '../models/procurementCounterModel.js';

export async function generateNumber(type) {
  const year = new Date().getFullYear();
  const counter = await ProcurementCounter.findOneAndUpdate(
    { type, year },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${type}-${year}-${String(counter.seq).padStart(4, '0')}`;
}
