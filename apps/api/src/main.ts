import "./env"; // must be first: loads .env before anything reads process.env
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { toNodeHandler } from "better-auth/node";
import * as express from "express";
import { AppModule } from "./app.module";
import { auth } from "./auth/auth";
import { env } from "./env";

async function bootstrap() {
  // bodyParser disabled globally: Better Auth's node handler must receive the
  // raw request stream; JSON parsing is re-added below for everything else.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  app.enableCors({ origin: [env.webUrl], credentials: true });

  const server = app.getHttpAdapter().getInstance();
  server.all(/^\/api\/auth\/.*/, toNodeHandler(auth));

  app.use(express.json({ limit: "2mb" }));

  // Log every EA sync request so connection problems are visible in this console.
  app.use(/^\/sync\/.*/, (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const started = Date.now();
    res.on("finish", () => {
      console.log(
        `[sync] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - started}ms)`,
      );
    });
    next();
  });

  await app.listen(env.port);
  console.log(`TradeMind API listening on ${env.apiUrl}`);
}

bootstrap();
