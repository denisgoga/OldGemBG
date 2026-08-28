import type { RequestHandler } from "express";
import {
  getOrBuildCatalogJsonBody,
  parseCatalogPagination,
  setCatalogCacheControlHeader,
} from "../../shared/publicCatalog";

export const handlePublicCatalog: RequestHandler = async (req, res) => {
  const { page, limit, skipCache } = parseCatalogPagination(req.query);
  try {
    const { body, cacheHit } = await getOrBuildCatalogJsonBody(page, limit, {
      skipCache,
    });
    setCatalogCacheControlHeader((n, v) => {
      res.setHeader(n, v);
    });
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("X-Catalog-Cache", cacheHit ? "HIT" : "MISS");
    res.send(body);
  } catch (err) {
    console.error("[public-catalog]", err);
    res.setHeader("Cache-Control", "no-store");
    res.status(500).json({
      error: "catalog_unavailable",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
};
