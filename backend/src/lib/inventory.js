export class RequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const cleanOptional = (value, field, maxLength) => {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new RequestError(`${field} must be text.`);
  const cleaned = value.trim();
  if (cleaned.length > maxLength) throw new RequestError(`${field} must be at most ${maxLength} characters.`);
  return cleaned || null;
};

const requiredText = (value, field, maxLength) => {
  if (typeof value !== "string" || !value.trim()) throw new RequestError(`${field} is required.`);
  const cleaned = value.trim();
  if (cleaned.length > maxLength) throw new RequestError(`${field} must be at most ${maxLength} characters.`);
  return cleaned;
};

const requireObject = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RequestError("Request body must be a JSON object.");
  }
};

const nonNegativeNumber = (value, field) => {
  const number = Number(value);
  if ((typeof value !== "number" && typeof value !== "string")
    || value === "" || (typeof value === "string" && !value.trim())
    || !Number.isFinite(number) || number < 0) {
    throw new RequestError(`${field} must be a non-negative number.`);
  }
  return number;
};

export function validateMedicine(input = {}) {
  requireObject(input);
  const reorderThreshold = Number(input.reorderThreshold ?? 0);
  if (!Number.isSafeInteger(reorderThreshold) || reorderThreshold < 0) {
    throw new RequestError("reorderThreshold must be a non-negative integer.");
  }
  if (input.prescriptionRequired != null && typeof input.prescriptionRequired !== "boolean") {
    throw new RequestError("prescriptionRequired must be a boolean.");
  }

  return {
    name: requiredText(input.name, "name", 180),
    genericName: cleanOptional(input.genericName, "genericName", 180),
    brandName: cleanOptional(input.brandName, "brandName", 180),
    sku: requiredText(input.sku, "sku", 80),
    dosageStrength: cleanOptional(input.dosageStrength, "dosageStrength", 100),
    description: cleanOptional(input.description, "description", 2000),
    unitPrice: nonNegativeNumber(input.unitPrice, "unitPrice"),
    costPrice: nonNegativeNumber(input.costPrice, "costPrice"),
    prescriptionRequired: input.prescriptionRequired ?? false,
    storageRequirements: cleanOptional(input.storageRequirements, "storageRequirements", 250),
    reorderThreshold,
    category: requiredText(input.category, "category", 100),
  };
}

const isValidDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
};

export function validateAdjustment(input = {}) {
  requireObject(input);
  if (!["receive", "dispense"].includes(input.direction)) {
    throw new RequestError("Direction must be receive or dispense.");
  }
  const quantity = Number(input.quantity);
  if ((typeof input.quantity !== "number" && typeof input.quantity !== "string")
    || input.quantity === "" || (typeof input.quantity === "string" && !input.quantity.trim())
    || !Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new RequestError("quantity must be a positive integer.");
  }
  const note = cleanOptional(input.note, "note", 500);
  if (input.direction === "dispense") return { direction: input.direction, quantity, note };

  const batchNumber = requiredText(input.batchNumber, "batchNumber", 100);
  if (!isValidDate(input.expirationDate)) throw new RequestError("expirationDate must be a valid YYYY-MM-DD date.");
  if (input.expirationDate <= new Date().toISOString().slice(0, 10)) {
    throw new RequestError("Received batches must have a future expiration date.");
  }
  return { direction: input.direction, quantity, note, batchNumber, expirationDate: input.expirationDate };
}

export const isEligibleBatch = (batch, today = new Date().toISOString().slice(0, 10)) =>
  batch.status === "AVAILABLE" && batch.currentQuantity > 0 && batch.expirationDate >= today;

export function availableStock(medicine, today = new Date().toISOString().slice(0, 10)) {
  return medicine.batches
    .filter((batch) => isEligibleBatch(batch, today))
    .reduce((total, batch) => total + batch.currentQuantity, 0);
}

export function matchesInventoryFilters(medicine, { stock, expiry }, today = new Date().toISOString().slice(0, 10)) {
  const eligible = medicine.batches.filter((batch) => isEligibleBatch(batch, today));
  const quantity = eligible.reduce((total, batch) => total + batch.currentQuantity, 0);
  if (stock === "low" && quantity > medicine.reorderThreshold) return false;
  if (stock === "healthy" && quantity <= medicine.reorderThreshold) return false;

  const inRange = (batch) => batch.status === "AVAILABLE" && batch.currentQuantity > 0;
  const hasSoon = medicine.batches.some((batch) =>
    inRange(batch) && batch.expirationDate >= today
    && batch.expirationDate <= addDays(today, 30));
  const hasExpired = medicine.batches.some((batch) => inRange(batch) && batch.expirationDate < today);
  if (expiry === "soon" && !hasSoon) return false;
  if (expiry === "expired" && !hasExpired) return false;
  if (expiry === "ok" && (hasSoon || hasExpired)) return false;
  return true;
}

const addDays = (date, days) => {
  const result = new Date(`${date}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
};

export function toMedicineResponse(medicine, today = new Date().toISOString().slice(0, 10)) {
  const batches = [...medicine.batches].sort((a, b) => a.expirationDate.localeCompare(b.expirationDate));
  const eligible = batches.filter((batch) => isEligibleBatch(batch, today));
  const stock = eligible.reduce((total, batch) => total + batch.currentQuantity, 0);
  const next = eligible[0] ?? null;
  let expiryStatus = next && next.expirationDate <= addDays(today, 30) ? "soon" : "ok";
  if (batches.some((batch) => batch.status === "AVAILABLE" && batch.currentQuantity > 0 && batch.expirationDate < today)) {
    expiryStatus = "expired";
  }

  return {
    id: String(medicine._id),
    name: medicine.name,
    genericName: medicine.genericName,
    brandName: medicine.brandName,
    sku: medicine.sku,
    dosageStrength: medicine.dosageStrength,
    description: medicine.description,
    unitPrice: medicine.unitPrice,
    costPrice: medicine.costPrice,
    prescriptionRequired: medicine.prescriptionRequired,
    storageRequirements: medicine.storageRequirements,
    reorderThreshold: medicine.reorderThreshold,
    category: medicine.category,
    availableStock: stock,
    inventoryValue: Math.round(medicine.unitPrice * stock * 100) / 100,
    nextExpiryDate: next?.expirationDate ?? null,
    expiryStatus,
    nextBatchNumber: next?.batchNumber ?? null,
    supplierName: null,
    supplierEmail: null,
    batches: batches.map((batch) => ({
      id: String(batch._id),
      batchNumber: batch.batchNumber,
      expirationDate: batch.expirationDate,
      currentQuantity: batch.currentQuantity,
      status: batch.status,
      expiryStatus: batch.expirationDate < today ? "expired"
        : batch.expirationDate <= addDays(today, 30) ? "soon" : "ok",
    })),
    recentMovements: [...medicine.movements]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map((movement) => ({
        id: String(movement._id),
        movementType: movement.movementType,
        quantityDelta: movement.quantityDelta,
        note: movement.note,
        createdAt: movement.createdAt,
        batchNumber: movement.batchNumber,
      })),
  };
}

export function toDashboardSummary(medicines, categories, today = new Date().toISOString().slice(0, 10)) {
  let lowStockCount = 0;
  let expiringSoonCount = 0;
  let expiredMedicines = 0;
  let totalAvailableStock = 0;
  let inventoryValue = 0;

  for (const medicine of medicines) {
    const stock = availableStock(medicine, today);
    if (stock <= medicine.reorderThreshold) lowStockCount += 1;
    if (medicine.batches.some((batch) =>
      batch.status === "AVAILABLE" && batch.currentQuantity > 0
      && batch.expirationDate >= today && batch.expirationDate <= addDays(today, 30))) {
      expiringSoonCount += 1;
    }
    if (medicine.batches.some((batch) =>
      batch.status === "AVAILABLE" && batch.currentQuantity > 0 && batch.expirationDate < today)) {
      expiredMedicines += 1;
    }
    totalAvailableStock += stock;
    inventoryValue += medicine.unitPrice * stock;
  }

  return {
    totalMedicines: medicines.length,
    lowStockCount,
    expiringSoonCount,
    expiredMedicines,
    inventoryValue: Math.round(inventoryValue * 100) / 100,
    totalAvailableStock,
    categories,
  };
}
