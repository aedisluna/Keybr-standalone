import { Application } from "@fastr/core";
import { Container } from "@fastr/invert";
import { Manifest } from "@keybr/assets";
import { ConfigModule, Env } from "@keybr/config";
import { createSchema } from "@keybr/database";
import { Logger } from "@keybr/logger";
import Knex from "knex";
import { ApplicationModule, kMain } from "./app/index.ts";
import { ServerModule } from "./server/module.ts";
import { Service } from "./server/service.ts";

// Single-process entry point for the offline desktop (Electron) build. Unlike
// the production server in `main.ts`, this does not use `cluster` and does not
// start the multiplayer WebSocket worker. It runs one HTTP server in the
// current process and creates the database schema on first launch.

initErrorHandlers();

Env.probeFilesSync();
const container = makeContainer();
Logger.info("Configuration", {
  dataDir: container.get("dataDir"),
  publicDir: container.get("publicDir"),
  canonicalUrl: container.get("canonicalUrl"),
});
process.title = "keybr desktop process";

start().catch((err) => {
  Logger.error(err, "Failed to start desktop server");
  process.exit(1);
});

async function start() {
  const knex = container.get(Knex);
  await createSchema(knex);
  Logger.info("Database schema is ready");
  const service = container.get(Service);
  service.start({
    app: container.get(Application, kMain),
    port: Env.getPort("SERVER_PORT", 3000),
  });
}

function makeContainer() {
  const container = new Container();
  container.load(new ConfigModule());
  container.load(new ApplicationModule());
  container.load(new ServerModule());
  container.get(Manifest); // Sanity check.
  return container;
}

function initErrorHandlers() {
  process.on("warning", (warning) => {
    Logger.warn("Warning", warning);
  });
  process.on("uncaughtException", (error) => {
    Logger.error("Uncaught exception", error);
    process.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    Logger.error("Unhandled rejection", reason);
    process.exit(1);
  });
}
