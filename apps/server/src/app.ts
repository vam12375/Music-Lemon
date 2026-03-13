import express from "express";
import cors from "cors";
import { config } from "./config";
import { healthRouter } from "./routes/health";

export function createApp() {
  const app = express();

  // 中间件
  app.use(cors({
    origin: config.corsOrigin,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-API-Key"],
  }));
  app.use(express.json());

  // 路由
  app.use("/api/health", healthRouter);

  return app;
}
