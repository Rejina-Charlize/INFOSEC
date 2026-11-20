import assert from "node:assert/strict";
import test from "node:test";
import {
  availableStock,
  matchesInventoryFilters,
  toDashboardSummary,
  toMedicineResponse,
  validateAdjustment,
  validateMedicine,
} from "../src/lib/inventory.js";

const medicine = {
  _id: "medicine-1",
  name: "Medicine",
  sku: "SKU-1",
  unitPrice: 3.25,
  costPrice: 2,
  prescriptionRequired: false,
  reorderThreshold: 5,
  category: "Analgesics",
  batches: [
    { _id: "batch-1", batchNumber: "EARLY", expirationDate: "2026-11-20", currentQuantity: 3, status: "AVAILABLE" },
    { _id: "batch-2", batchNumber: "EXPIRED", expirationDate: "2026-11-01", currentQuantity: 7, status: "AVAILABLE" },
    { _id: "batch-3", batchNumber: "LATER", expirationDate: "2027-01-01", currentQuantity: 4, status: "AVAILABLE" },
  ],
  movements: [],
};

test("available stock excludes expired batches and response summarizes next FEFO batch", () => {
  assert.equal(availableStock(medicine, "2026-11-15"), 7);
  const response = toMedicineResponse(medicine, "2026-11-15");
  assert.equal(response.availableStock, 7);
  assert.equal(response.nextBatchNumber, "EARLY");
  assert.equal(response.expiryStatus, "expired");
  assert.equal(response.inventoryValue, 22.75);
});

test("stock and expiry filters use eligible batches", () => {
  assert.equal(matchesInventoryFilters(medicine, { stock: "healthy" }, "2026-11-15"), true);
  assert.equal(matchesInventoryFilters(medicine, { expiry: "expired" }, "2026-11-15"), true);
  assert.equal(matchesInventoryFilters(medicine, { expiry: "ok" }, "2026-11-15"), false);
});

test("dashboard counts active stock and expiring or expired products", () => {
  assert.deepEqual(toDashboardSummary([medicine], ["Analgesics"], "2026-11-15"), {
    totalMedicines: 1,
    lowStockCount: 0,
    expiringSoonCount: 1,
    expiredMedicines: 1,
    inventoryValue: 22.75,
    totalAvailableStock: 7,
    categories: ["Analgesics"],
  });
});

test("medicine validation normalizes optional fields and validates required values", () => {
  const valid = validateMedicine({
    name: " Medicine ",
    sku: " SKU-1 ",
    unitPrice: 2.5,
    costPrice: "1.25",
    category: "Analgesics",
  });
  assert.equal(valid.name, "Medicine");
  assert.equal(valid.sku, "SKU-1");
  assert.equal(valid.costPrice, 1.25);
  assert.equal(valid.prescriptionRequired, false);
  assert.throws(() => validateMedicine({ ...valid, unitPrice: -1 }), /non-negative number/);
});

test("adjustment validation rejects invalid dates and missing receive batch data", () => {
  assert.throws(() => validateAdjustment({
    direction: "receive",
    quantity: 2,
    batchNumber: "B-1",
    expirationDate: "2026-02-30",
  }), /valid YYYY-MM-DD/);
  assert.throws(() => validateAdjustment({ direction: "receive", quantity: 2 }), /batchNumber is required/);
  assert.equal(validateAdjustment({ direction: "dispense", quantity: 2 }).quantity, 2);
});
