import mongoose from 'mongoose';

const procurementCounterSchema = new mongoose.Schema({
  type: { type: String, enum: ['PR', 'PO', 'GR'], required: true },
  year: { type: Number, required: true },
  seq: { type: Number, default: 0 },
});

procurementCounterSchema.index({ type: 1, year: 1 }, { unique: true });

const ProcurementCounter = mongoose.model('ProcurementCounter', procurementCounterSchema);

export default ProcurementCounter;
