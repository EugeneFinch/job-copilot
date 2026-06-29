# Job Search Copilot Backend

This project contains the local backend server for the **100x job Copilot** Chrome Extension. It is configured to run persistently in the background on macOS as a launch agent daemon.

## Web Dashboard & API Ports

When running the background daemon, the server hosts **both** the backend API and the React Dashboard on the same port:
- **React Dashboard**: Open [http://localhost:3004](http://localhost:3004) in your browser.
- **Backend API**: Accessible at [http://localhost:3004/api](http://localhost:3004/api).

*Note: Since the backend serves the built frontend statically, you do not need to run a separate Vite dev server on port `5173` anymore.*

## Background Server Management

To make the extension work even after closing your terminal or IDE, the server runs as a macOS background daemon. You can manage this daemon using the following `npm` commands:

### 1. Check Service Status
See if the daemon is registered, loaded, and actively listening on port `3004`:
```bash
npm run server:persist-status
```

### 2. Stop & Uninstall
If you want to temporarily or permanently stop the background server:
```bash
npm run server:persist-uninstall
```

### 3. Start & Install
If the background server is stopped and you want to start/re-install it:
```bash
npm run server:persist-install
```

### 4. Restart Server
Quickly restart the background server (useful if settings change or to flush connections):
```bash
npm run server:persist-restart
```

---

## Viewing Logs

Logs are redirected locally to the `logs/` directory in the root of this project:

- **Standard Output Logs** (general console logs, scraping actions, API traffic):
  ```bash
  npm run server:persist-logs
  ```
  *(Reads from `logs/server.log`)*

- **Error Logs** (uncaught exceptions, critical issues):
  ```bash
  npm run server:persist-errors
  ```
  *(Reads from `logs/server-error.log`)*

---

## Technical Details

- **Plist Location**: `~/Library/LaunchAgents/com.eugene.jobsearch.server.plist`
- **Dynamic Configuration**: The background service uses `scripts/manage-daemon.js` to automatically resolve your current Node binary location and project path, ensuring it doesn't break if you update Node or move the project folder.
- **Auto-run**: The service is configured to automatically launch when your Mac boots/logs in, and it will restart itself if it unexpectedly crashes.
