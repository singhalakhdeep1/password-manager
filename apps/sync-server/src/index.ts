import express from "express";
import cors from "cors";
import { createDatabase } from "./db.js";
import { createRoutes } from "./routes.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const PORT = parseInt(process.env.PORT || "3199", 10);
const app = express();

app.use(cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"] }));
app.use(express.json({ limit: "10mb" }));

const db = createDatabase();
app.use("/api/sync", createRoutes(db));

// Graceful shutdown
process.on("SIGINT", () => {
  db.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  db.close();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🔐 PWM Sync Server running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/sync/health`);
  console.log(`   Zero-knowledge: server never sees your plaintext vault`);
});
