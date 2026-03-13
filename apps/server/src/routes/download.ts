import { Router } from "express";
import { AppError } from "../errors";

export const downloadRouter = Router();

/**
 * GET /api/download?url=xxx&filename=xxx
 * 代理下载音频文件，解决跨域无法直接下载的问题
 */
downloadRouter.get("/", async (req, res, next) => {
  try {
    const { url, filename } = req.query;

    if (!url || typeof url !== "string") {
      throw new AppError(400, -1, "缺少 url 参数");
    }

    // 安全校验：仅允许 http(s) 协议
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new AppError(400, -1, "无效的 URL");
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new AppError(400, -1, "不支持的协议");
    }

    // 请求远程文件
    const upstream = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      redirect: "follow",
    });

    if (!upstream.ok) {
      throw new AppError(502, -1, `远程文件请求失败: ${upstream.status}`);
    }

    // 构造下载文件名
    const safeName = typeof filename === "string" && filename.trim()
      ? filename.trim()
      : "download.mp3";

    // 设置下载响应头
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`);

    const contentType = upstream.headers.get("content-type");
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    const contentLength = upstream.headers.get("content-length");
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }

    // 流式转发
    if (upstream.body) {
      const reader = upstream.body.getReader();
      const pump = async (): Promise<void> => {
        const { done, value } = await reader.read();
        if (done) {
          res.end();
          return;
        }
        if (!res.write(value)) {
          await new Promise<void>((resolve) => res.once("drain", resolve));
        }
        return pump();
      };
      await pump();
    } else {
      res.end();
    }
  } catch (err) {
    next(err);
  }
});
