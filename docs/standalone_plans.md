# Standalone Application Plan

## Goal

Create an offline desktop version of Keybr that runs locally without Docker.

## Target behavior

- Starts as a desktop application.
- Runs the existing Node server locally.
- Opens the React UI in an embedded browser window.
- Stores user data in local SQLite.
- Does not require internet connection.

## Proposed stack

- Electron
- Existing Node server
- Existing React frontend
- SQLite
- electron-builder for packaging

## Milestones

1. Local Docker baseline
2. Electron development wrapper
3. Local data path integration
4. Windows packaging
5. Desktop smoke tests