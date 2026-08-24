import express from "express";
import dotenv from "dotenv";
dotenv.config();

import { parseTrustProxyHops, validateEnv } from "./config/env";
validateEnv();

import passport from "passport";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import "./config/passportConfig";
import authRouter from "./routes/authRouter";
import cvRouter from "./routes/cvRouter";
import cvBuilderRouter from "./routes/cvBuilderRouter";
import chatBotRouter from "./routes/chatBotRouter";
import paymentRouter from "./routes/paymentRouter";
import jobRouter from "./routes/jobRouter";
import documentRouter from "./routes/documentRouter";
import adminRouter from "./routes/adminRouter";
import blogRouter from "./routes/blogRouter";
import quotaRouter from "./routes/quotaRouter";
import reviewRouter from "./routes/reviewRouter";
import communityRouter from "./routes/communityRouter";
import { generalLimiter, aiLimiter } from "./middleware/rateLimitMiddleware";
import { isGroqRateLimit } from "./lib/groqChat";
import { blockBannedIp } from "./middleware/ipBanMiddleware";
import { startCronJobs } from "./services/cronService";
import { loadBanCache } from "./lib/banCache";
import { loadRevocationCache } from "./lib/sessionRevocationCache";
import prisma from "./lib/prisma";
import { closeBrowser } from "./services/pdfExportService";

const app = express();
const port = process.env.PORT;

const trustProxyHops = parseTrustProxyHops();
app.set("trust proxy", trustProxyHops);

let clientIpDiagnosticPending = true;
app.use((req, _res, next) => {
  if (clientIpDiagnosticPending) {
    clientIpDiagnosticPending = false;
    const forwardedFor = req.headers["x-forwarded-for"] || "none";
    console.log(`[network] clientIp=${req.ip} forwardedFor=${forwardedFor} trustProxyHops=${trustProxyHops}`);
  }
  next();
});

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    exposedHeaders: ["X-Page-Count"],
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(passport.initialize());

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ok" });
  } catch (error) {
    console.error("[health] Database probe failed:", error);
    res.status(503).json({ status: "degraded" });
  }
});

app.use(generalLimiter);
app.use(blockBannedIp);

app.use("/auth", authRouter);
app.use("/api/ai", cvRouter);
app.use("/cvbuilder", cvBuilderRouter);
app.use("/api/chatbot", aiLimiter, chatBotRouter);
app.use("/payment", paymentRouter);
app.use("/job-radar", jobRouter);
app.use("/documents", documentRouter);
app.use("/admin", adminRouter);
app.use("/blogs", blogRouter);
app.use("/quota", quotaRouter);
app.use("/reviews", reviewRouter);
app.use("/community", communityRouter);

// Global Error Handler Middleware
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Global Error Handler:", err);
  if (isGroqRateLimit(err)) {
    res.status(429).json({ message: "You have hit your limit. Contact admin." });
    return;
  }
  const status = err.status || 500;
  // Only surface the message for intentional 4xx client errors; never leak
  // internal 5xx error details (stack, DB messages) to the client.
  res.status(status).json({
    message:
      status < 500
        ? err.message || "Request failed."
        : "An unexpected error occurred.",
  });
});

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not found");
  process.exit(1);
}

async function start() {
  await prisma.$connect();
  await loadBanCache();
  await loadRevocationCache();
  console.log("PostgreSQL connected");
  console.log(`Trust proxy hops: ${trustProxyHops}`);
  startCronJobs();
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

void start().catch((error) => {
  console.error("Server startup failed:", error);
  process.exit(1);
});

process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

// Chrome runs as its own OS process. Without this it outlives every restart and deploy,
// and the machine slowly fills with orphaned browsers.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await closeBrowser();
    await prisma.$disconnect().catch(() => undefined);
    process.exit(0);
  });
}
