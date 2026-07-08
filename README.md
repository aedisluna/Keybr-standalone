# Keybr Standalone

Offline desktop fork of [keybr.com](https://github.com/aradzie/keybr.com) — typing practice without ads, analytics, or internet.

## What's different from keybr.com

- **Desktop app** (Electron) with a local server and SQLite storage
- **No ads** or third-party analytics scripts
- **No multiplayer** (removed from UI and routes)
- **Auto-login** to a local user in desktop mode
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

## Run locally with Docker

### Check WinGet

```powershell
winget --version
```

Install WSL 2 support

Run PowerShell as Administrator:

```powershell
wsl --install --no-distribution
wsl --update
wsl --set-default-version 2
```

Reboot Windows after WSL installation.

Install Docker Desktop

```powershell
winget install --id Docker.DockerDesktop --exact --accept-package-agreements --accept-source-agreements
```

Start Docker Desktop manually from the Start Menu.

Verify Docker

```powershell
docker --version
docker compose version
docker run hello-world
```

Install Git if needed

```powershell
git --version
```

If Git is not installed:

```powershell
winget install --id Git.Git --exact --accept-package-agreements --accept-source-agreements
```

Clone the repository

Open PowerShell in a suitable folder:

```powershell
git clone https://github.com/aedisluna/Keybr-standalone.git
cd Keybr-standalone
```

Create local environment file

```powershell
Copy-Item .\.env.example .\.env
```

Make sure `.env` contains Docker-compatible local paths:

```env
APP_URL=http://localhost:3000/
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false
DATA_DIR=/root/.local/state/keybr
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=/root/.local/state/keybr/database.sqlite
MAIL_DOMAIN=localhost
MAIL_KEY=
MAIL_FROM_ADDRESS=user@localhost
MAIL_FROM_NAME=user
```

Run the app

```powershell
docker compose up --build
```

Open:

http://localhost:3000/

## License

This project is based on keybr.com and is distributed under the same license (see [LICENSE](LICENSE)).
