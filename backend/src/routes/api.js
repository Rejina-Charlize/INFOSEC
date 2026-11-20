import { Router } from "express";
import mongoose from "mongoose";
import Category from "../models/Category.js";
import Medicine from "../models/Medicine.js";
import { authenticateStaff, requireStaffRole } from "../middleware/auth.js";
import {
  RequestError,
  matchesInventoryFilters,
  toDashboardSummary,
  toMedicineResponse,
  validateAdjustment,
  validateMedicine,
} from "../lib/inventory.js";

const router = Router();
const asyncHandler = (handler) => (request, response, next) =>
  Promise.resolve(handler(request, response, next)).catch(next);
const activeMedicine = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new RequestError("Medicine not found.", 404);
  const medicine = await Medicine.findOne({ _id: id, archived: false });
  if (!medicine) throw new RequestError("Medicine not found.", 404);
  return medicine;
};
const findCategory = async (name) => {
  const category = await Category.findOne({
    name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    active: true,
  });
  if (!category) throw new RequestError("Category does not exist.");
  return category.name;
};
const parsePageValue = (value, fallback, min, max) => {
  const parsed = Number(value ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new RequestError("Invalid pagination values.");
  }
  return parsed;
};
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const optionalQueryText = (value, field) => {
  if (value == null) return "";
  if (typeof value !== "string") throw new RequestError(`${field} must be a single value.`);
  return value.trim();
};

router.get("/health", (_request, response) => response.json({ status: "ok" }));

router.get("/auth/me", authenticateStaff, (request, response) => {
  response.json({ username: request.staff.username, role: request.staff.role });
});

router.get("/categories", asyncHandler(async (_request, response) => {
  const categories = await Category.find({ active: true }).sort({ name: 1 }).select("name -_id").lean();
  response.json(categories.map((category) => category.name));
}));

router.get("/dashboard/summary", asyncHandler(async (_request, response) => {
  const [medicines, categories] = await Promise.all([
    Medicine.find({ archived: false }).lean(),
    Category.find({ active: true }).sort({ name: 1 }).select("name -_id").lean(),
  ]);
  response.json(toDashboardSummary(medicines, categories.map(({ name }) => name)));
}));

router.get("/medicines", asyncHandler(async (request, response) => {
  const page = parsePageValue(request.query.page, 0, 0, Number.MAX_SAFE_INTEGER);
  const size = parsePageValue(request.query.size, 8, 1, 100);
  const search = optionalQueryText(request.query.search, "search");
  const category = optionalQueryText(request.query.category, "category");
  const stock = optionalQueryText(request.query.stock, "stock");
  const expiry = optionalQueryText(request.query.expiry, "expiry");
  if (stock && !["low", "healthy"].includes(stock)) {
    throw new RequestError("Stock filter must be low or healthy.");
  }
  if (expiry && !["soon", "expired", "ok"].includes(expiry)) {
    throw new RequestError("Expiry filter must be soon, expired, or ok.");
  }
  let prescription;
  if (request.query.prescription != null) {
    if (!["true", "false"].includes(request.query.prescription)) {
      throw new RequestError("prescription must be true or false.");
    }
    prescription = request.query.prescription === "true";
  }

  const query = { archived: false };
  if (search) {
    const term = new RegExp(escapeRegex(search), "i");
    query.$or = [{ name: term }, { genericName: term }, { brandName: term }, { sku: term }];
  }
  if (category) query.category = new RegExp(`^${escapeRegex(category)}$`, "i");
  if (prescription != null) query.prescriptionRequired = prescription;

  const medicines = await Medicine.find(query).sort({ name: 1 }).lean();
  const matching = medicines.filter((medicine) => matchesInventoryFilters(medicine, { stock, expiry }));
  const totalElements = matching.length;
  const content = matching.slice(page * size, (page + 1) * size).map(toMedicineResponse);
  const totalPages = Math.ceil(totalElements / size);
  response.json({
    content,
    totalElements,
    totalPages,
    number: page,
    size,
    first: page === 0,
    last: totalPages === 0 || page >= totalPages - 1,
    numberOfElements: content.length,
    empty: content.length === 0,
  });
}));

router.get("/medicines/:id", asyncHandler(async (request, response) => {
  response.json(toMedicineResponse(await activeMedicine(request.params.id)));
}));

router.post("/medicines", authenticateStaff, requireStaffRole("ADMINISTRATOR", "PHARMACIST"), asyncHandler(async (request, response) => {
  const medicineData = validateMedicine(request.body);
  medicineData.category = await findCategory(medicineData.category);
  const medicine = new Medicine({ ...medicineData, skuKey: medicineData.sku.toLowerCase() });
  await medicine.save();
  response.status(201).json(toMedicineResponse(medicine));
}));

router.put("/medicines/:id", authenticateStaff, requireStaffRole("ADMINISTRATOR", "PHARMACIST"), asyncHandler(async (request, response) => {
  const medicine = await activeMedicine(request.params.id);
  const medicineData = validateMedicine(request.body);
  medicineData.category = await findCategory(medicineData.category);
  medicine.set({ ...medicineData, skuKey: medicineData.sku.toLowerCase() });
  await medicine.save();
  response.json(toMedicineResponse(medicine));
}));

router.delete("/medicines/:id", authenticateStaff, requireStaffRole("ADMINISTRATOR"), asyncHandler(async (request, response) => {
  const medicine = await activeMedicine(request.params.id);
  medicine.archived = true;
  await medicine.save();
  response.status(204).end();
}));

router.post("/medicines/:id/adjustments", authenticateStaff, requireStaffRole("ADMINISTRATOR", "PHARMACIST"), asyncHandler(async (request, response) => {
  const medicine = await activeMedicine(request.params.id);
  const adjustment = validateAdjustment(request.body);

  if (adjustment.direction === "receive") {
    if (medicine.batches.some((batch) => batch.batchNumber === adjustment.batchNumber)) {
      throw new RequestError("A batch with this number already exists.", 409);
    }
    medicine.batches.push({
      batchNumber: adjustment.batchNumber,
      expirationDate: adjustment.expirationDate,
      currentQuantity: adjustment.quantity,
      status: "AVAILABLE",
    });
    medicine.movements.push({
      movementType: "STOCK_RECEIVED",
      quantityDelta: adjustment.quantity,
      note: adjustment.note,
      batchNumber: adjustment.batchNumber,
    });
  } else {
    const eligible = medicine.batches
      .filter((batch) => batch.status === "AVAILABLE"
        && batch.currentQuantity > 0
        && batch.expirationDate >= new Date().toISOString().slice(0, 10))
      .sort((a, b) => a.expirationDate.localeCompare(b.expirationDate));
    const available = eligible.reduce((total, batch) => total + batch.currentQuantity, 0);
    if (adjustment.quantity > available) {
      throw new RequestError("Requested quantity exceeds available unexpired stock.");
    }
    let remaining = adjustment.quantity;
    for (const batch of eligible) {
      if (remaining === 0) break;
      const removed = Math.min(remaining, batch.currentQuantity);
      batch.currentQuantity -= removed;
      if (batch.currentQuantity === 0) batch.status = "UNAVAILABLE";
      medicine.movements.push({
        movementType: "DISPENSED",
        quantityDelta: -removed,
        note: adjustment.note,
        batchNumber: batch.batchNumber,
      });
      remaining -= removed;
    }
  }

  await medicine.save();
  response.json(toMedicineResponse(medicine));
}));

export default router;
