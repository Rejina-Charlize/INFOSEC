import bcrypt from "bcryptjs";
import StaffAccount from "../models/StaffAccount.js";

const unauthorized = (response) => {
  response.set("WWW-Authenticate", 'Basic realm="MedStock staff", charset="UTF-8"');
  return response.status(401).json({ message: "Staff authentication is required." });
};

export async function authenticateStaff(request, response, next) {
  const header = request.get("authorization") ?? "";
  const match = header.match(/^Basic\s+([A-Za-z0-9+/]+={0,2})$/i);
  if (!match) return unauthorized(response);

  let decoded;
  try {
    decoded = Buffer.from(match[1], "base64").toString("utf8");
  } catch {
    return unauthorized(response);
  }
  const separator = decoded.indexOf(":");
  if (separator < 1) return unauthorized(response);

  const username = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);
  const account = await StaffAccount.findOne({ username, enabled: true });
  if (!account || !(await bcrypt.compare(password, account.passwordHash))) {
    return unauthorized(response);
  }
  request.staff = { username: account.username, role: account.role };
  return next();
}

export const requireStaffRole = (...roles) => (request, response, next) => {
  if (!request.staff || !roles.includes(request.staff.role)) {
    return response.status(403).json({ message: "You do not have permission to perform this action." });
  }
  return next();
};
