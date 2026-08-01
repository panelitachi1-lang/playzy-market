import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import { logger } from "./lib/logger";
import router from "./routes";

const app = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

// Serve uploaded receipt images
app.use("/api/uploads/receipts", express.static(path.join(process.cwd(), "uploads", "receipts")));
// Serve uploaded avatar images
app.use("/api/uploads/avatars", express.static(path.join(process.cwd(), "uploads", "avatars")));
// Serve uploaded listing images
app.use("/api/uploads/listings", express.static(path.join(process.cwd(), "uploads", "listings")));

app.use("/api", router);

// Serve frontend (built by Vite) — must be AFTER /api routes
const frontendDist = path.join(process.cwd(), "..", "pleer", "dist", "public");
app.use(express.static(frontendDist));
// SPA fallback — send index.html for any non-API route
app.get("*splat", (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

export default app;
