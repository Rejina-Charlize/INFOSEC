import cors from "cors";
import express from "express";
import apiRouter from "./routes/api.js";
import { RequestError } from "./lib/inventory.js";

const app = express();
app.disable("x-powered-by");
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use("/api", apiRouter);
app.use((request, response) => {
  response.status(404).json({ message: `Route ${request.method} ${request.path} not found.` });
});
app.use((error, _request, response, _next) => {
  if (error instanceof RequestError) {
    return response.status(error.status).json({ message: error.message });
  }
  if (error?.code === 11000) {
    return response.status(409).json({ message: "A medicine with this SKU already exists." });
  }
  if (error?.name === "VersionError") {
    return response.status(409).json({ message: "The inventory changed during this operation. Reload and try again." });
  }
  if (error?.name === "ValidationError" || error?.type === "entity.parse.failed") {
    return response.status(400).json({ message: error.message || "Invalid request." });
  }
  if (error?.name === "CastError") {
    return response.status(400).json({ message: "Invalid request value." });
  }
  console.error(error);
  return response.status(500).json({ message: "An unexpected server error occurred." });
});

export default app;
