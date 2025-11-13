Backend dev: start & connectivity checks

Short guide to run the backend locally and verify mobile devices can reach it.

Prerequisites
- Python installed and available as `python` (or activate your virtualenv before running scripts)
- Uvicorn and FastAPI dependencies installed (check `pyproject.toml` or install via pip)

Start backend (foreground, debug logs):

1. Open PowerShell in this `backend` folder.
2. Run the helper script:

    .\run_backend.ps1

This will run `uvicorn main:app --host 0.0.0.0 --port 8000 --log-level debug` and show logs in the console.

Quick connectivity checks

- From the host (same machine), run:

    curl http://127.0.0.1:8000/ping

    curl http://192.168.0.100:8000/ping

- From an Android AVD emulator, open a browser and visit:
  - http://10.0.2.2:8000/ping

- From a physical device on the same Wi‑Fi, open:
  - http://192.168.0.100:8000/ping

Firewall (Windows)

If the device cannot reach the server but curl on host works for 127.0.0.1 and not for 192.168.x.x, open the firewall for testing:

Run PowerShell as Administrator and then:

    .\allow_firewall.ps1 -Action Add

When finished testing:

    .\allow_firewall.ps1 -Action Remove

If you still see `Network Error` in the app after verifying /ping works from the device, capture the following and attach them:

1. Uvicorn console log (the terminal where you ran `run_backend.ps1`) while you attempt register
2. Metro/device console logs (the `Register error full:` object printed by `auth.js`)

With those logs we can determine whether the request reaches the backend and whether there are validation/database errors to fix.
