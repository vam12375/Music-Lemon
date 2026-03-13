import express from "express";
import cors from "cors";
import { config } from "./config";
import { healthRouter } from "./routes/health";
import { methodsRouter } from "./routes/methods";
import { execRouter } from "./routes/exec";
import { AppError } from "./errors";

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
  app.use("/api/methods", methodsRouter);
  app.use("/api/exec", execRouter);

  // 全局错误处理
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      });
      return;
    }
    console.error("未处理错误:", err);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  });

  return app;
}
