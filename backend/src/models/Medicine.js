import mongoose from "mongoose";

const batchSchema = new mongoose.Schema({
  batchNumber: { type: String, required: true, trim: true },
  expirationDate: { type: String, required: true },
  currentQuantity: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ["AVAILABLE", "QUARANTINED", "UNAVAILABLE"],
    default: "AVAILABLE",
  },
  createdAt: { type: Date, default: Date.now },
});

const movementSchema = new mongoose.Schema({
  movementType: { type: String, required: true },
  quantityDelta: { type: Number, required: true },
  note: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  batchNumber: { type: String, default: null },
});

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 180 },
  genericName: { type: String, default: null, maxlength: 180 },
  brandName: { type: String, default: null, maxlength: 180 },
  sku: { type: String, required: true, trim: true, maxlength: 80 },
  skuKey: { type: String, required: true, unique: true, select: false },
  dosageStrength: { type: String, default: null, maxlength: 100 },
  description: { type: String, default: null, maxlength: 2000 },
  unitPrice: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, required: true, min: 0 },
  prescriptionRequired: { type: Boolean, default: false },
  storageRequirements: { type: String, default: null, maxlength: 250 },
  reorderThreshold: { type: Number, required: true, min: 0, default: 0 },
  archived: { type: Boolean, default: false },
  category: { type: String, required: true, trim: true },
  batches: { type: [batchSchema], default: [] },
  movements: { type: [movementSchema], default: [] },
}, {
  timestamps: true,
  optimisticConcurrency: true,
});

medicineSchema.index({ name: 1 });
medicineSchema.index({ category: 1, archived: 1 });

export default mongoose.model("Medicine", medicineSchema);
