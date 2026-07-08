# Keybr Standalone

Offline desktop fork of [keybr.com](https://github.com/aradzie/keybr.com) - typing practice without internet.

## Download (Windows)

Latest release: [Keybr Standalone 0.0.0](https://github.com/aedisluna/Keybr-standalone/releases/tag/v0.0.0) — download `Keybr.Setup.0.0.0.exe`, run the installer, launch from the Start Menu.

## What's different from keybr.com

- **Desktop app** (Electron) with a local server and SQLite storage
- **Offline, so no multiplayer**
- **Local user**
- **Keyboard layout hint** when the OS layout does not match the lesson (e.g. Cyrillic vs English)

## Build the desktop app (Windows)

Requirements: Node.js 24+, npm, Git.

```powershell
git clone https://github.com/aedisluna/Keybr-standalone.git
cd Keybr-standalone

npm ci
npm run compile
npm run build

cd desktop
npm install
npm run dist
```

The installer is written to `desktop\dist\Keybr Setup 0.0.0.exe`.

To run without installing:

```powershell
cd desktop
npm start
```

Make sure the repo root has been built first (`npm run build` in the project root).

## License

This project is based on keybr.com and is distributed under the same license (see [LICENSE](LICENSE)).
