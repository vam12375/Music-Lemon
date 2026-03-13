import { Router } from "express";
import { callUpstream } from "../upstream";
import { buildCacheKey, cacheGet, cacheSet } from "../cache";

export const methodsRouter = Router();

/**
 * GET /api/methods
 * GET /api/methods/:platform
 * GET /api/methods/:platform/:function
 * 透传上游 /v1/methods* 并缓存
 */
methodsRouter.get("/:platform?/:function?", async (req, res, next) => {
  try {
    // 构建上游路径
    let upstreamPath = "/v1/methods";
    if (req.params.platform) {
      upstreamPath += `/${req.params.platform}`;
    }
    if (req.params.function) {
      upstreamPath += `/${req.params.function}`;
    }

    // 缓存键
    const cacheKey = buildCacheKey({ route: "methods", path: upstreamPath });
    const cached = cacheGet(cacheKey);
    if (cached !== undefined) {
      res.json(cached);
      return;
    }

    const result = await callUpstream(upstreamPath, { method: "GET" }, true);
    const response = { code: 0, message: "ok", data: result.data };

    cacheSet(cacheKey, response);
    res.json(response);
  } catch (err) {
    next(err);
  }
});
