"use strict";

const { app, BrowserWindow, shell, dialog } = require("electron");
const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");

const HOST = "127.0.0.1";

// In packaged builds the repo `root` directory (server bundle + public assets)
// is copied next to the app via electron-builder `extraResources`. The native
// dependencies live in the unpacked asar. In development everything is read
// straight from the working tree.
const rootDir = app.isPackaged
  ? path.join(process.resourcesPath, "root")
  : path.join(__dirname, "..", "root");
const nodeModulesDir = app.isPackaged
  ? path.join(process.resourcesPath, "app.asar.unpacked", "node_modules")
  : path.join(__dirname, "node_modules");

const serverEntry = path.join(rootDir, "lib", "desktop.js");
const publicDir = path.join(rootDir, "public");

let serverProcess = null;
let mainWindow = null;
let currentPort = null;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, HOST, () => {
      const { port } = server.address();
      server.close(() => {
        resolve(port);
      });
    });
  });
}

function startServer(port) {
  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
    // Let the bundled server resolve native modules (better-sqlite3) that were
    // rebuilt for Electron and shipped in the unpacked asar / dev node_modules.
    NODE_PATH: nodeModulesDir,
    NODE_ENV: "production",
    DESKTOP_MODE: "true",
    SERVER_PORT: String(port),
    APP_URL: `http://${HOST}:${port}/`,
    PUBLIC_DIR: publicDir,
    DATA_DIR: path.join(app.getPath("userData"), "data"),
    DATABASE_CLIENT: "sqlite",
    DATABASE_FILENAME: path.join(app.getPath("userData"), "database.sqlite"),
    COOKIE_SECURE: "false",
    COOKIE_DOMAIN: "",
  };

  const child = spawn(process.execPath, [serverEntry], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (data) => {
    process.stdout.write(`[server] ${data}`);
  });
  child.stderr.on("data", (data) => {
    process.stderr.write(`[server] ${data}`);
  });
  child.on("exit", (code, signal) => {
    serverProcess = null;
    if (!app.isQuitting && code !== 0) {
      dialog.showErrorBox(
        "Keybr server stopped",
        `The local server exited unexpectedly (code ${code}, signal ${signal}).`,
      );
      app.quit();
    }
  });
  return child;
}

function waitForServer(port, { timeoutMs = 30000, intervalMs = 200 } = {}) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect(port, HOST);
      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() > deadline) {
          reject(new Error("Timed out waiting for the local server"));
        } else {
          setTimeout(attempt, intervalMs);
        }
      });
    };
    attempt();
  });
}

async function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    backgroundColor: "#101010",
    show: false,
    title: "Keybr",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Open external links (e.g. help pages) in the system browser instead of the
  // app window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(`http://${HOST}:${port}`)) {
      return { action: "allow" };
    }
    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  await mainWindow.loadURL(`http://${HOST}:${port}/`);
}

async function boot() {
  currentPort = await getFreePort();
  serverProcess = startServer(currentPort);
  await waitForServer(currentPort);
  await createWindow(currentPort);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow != null) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    boot().catch((err) => {
      dialog.showErrorBox("Keybr failed to start", String(err?.stack ?? err));
      app.quit();
    });

    app.on("activate", () => {
      if (
        BrowserWindow.getAllWindows().length === 0 &&
        serverProcess != null &&
        currentPort != null
      ) {
        // Server already running; just recreate the window (macOS dock click).
        void createWindow(currentPort);
      }
    });
  });

  app.on("window-all-closed", () => {
    app.quit();
  });

  app.on("before-quit", () => {
    app.isQuitting = true;
    if (serverProcess != null) {
      serverProcess.kill();
      serverProcess = null;
    }
  });
}
