import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import app from "./app.js";
import Category from "./models/Category.js";
import StaffAccount from "./models/StaffAccount.js";

const defaultCategories = [
  ["Analgesics", "Medicines used for pain relief"],
  ["Antibiotics", "Medicines used to treat bacterial infections"],
  ["Chronic Care", "Medicines used to manage long-term conditions"],
  ["Antihistamines", "Medicines used to relieve allergy symptoms"],
];

async function provisionStaff(username, password, role) {
  if (!username || !password) return false;
  const passwordHash = await bcrypt.hash(password, 12);
  await StaffAccount.updateOne(
    { username },
    { $setOnInsert: { username, passwordHash, role, enabled: true } },
    { upsert: true },
  );
  return true;
}

async function start() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI must be configured.");
  await mongoose.connect(mongoUri);
  await Promise.all(defaultCategories.map(([name, description]) =>
    Category.updateOne({ name }, { $setOnInsert: { name, description, active: true } }, { upsert: true })));

  const adminProvisioned = await provisionStaff(
    process.env.MEDSTOCK_ADMIN_USERNAME,
    process.env.MEDSTOCK_ADMIN_PASSWORD,
    "ADMINISTRATOR",
  );
  if (!adminProvisioned) {
    console.warn("No administrator account was provisioned. Set MEDSTOCK_ADMIN_USERNAME and MEDSTOCK_ADMIN_PASSWORD.");
  }
  await provisionStaff(
    process.env.MEDSTOCK_PHARMACIST_USERNAME,
    process.env.MEDSTOCK_PHARMACIST_PASSWORD,
    "PHARMACIST",
  );

  const port = Number(process.env.PORT || 8080);
  app.listen(port, () => console.log(`MedStock API listening on port ${port}`));
}

start().catch((error) => {
  console.error("Could not start the MedStock API:", error);
  process.exitCode = 1;
});
