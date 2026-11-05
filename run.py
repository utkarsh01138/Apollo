"""
Project Apollo - Unified Stack Launcher & Process Manager
Starts or stops both the FastAPI ML Backend and React Vite Frontend with a single command.

Usage:
  python run.py          # Start both backend and frontend (press Ctrl+C to stop both)
  python run.py stop     # Stop any running Apollo instances
"""

import os
import signal
import subprocess
import sys
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
PID_FILE = ROOT_DIR / ".apollo.pid"

IS_WINDOWS = sys.platform.startswith("win")
VENV_DIR = BACKEND_DIR / ".venv"

if IS_WINDOWS:
    VENV_PYTHON = VENV_DIR / "Scripts" / "python.exe"
    VENV_UVICORN = VENV_DIR / "Scripts" / "uvicorn.exe"
    NPM_CMD = "npm.cmd"
else:
    VENV_PYTHON = VENV_DIR / "bin" / "python"
    VENV_UVICORN = VENV_DIR / "bin" / "uvicorn"
    NPM_CMD = "npm"


def ensure_backend_venv():
    """Ensures backend virtual environment exists and has core dependencies installed."""
    if not VENV_PYTHON.exists():
        print("⚡ [Apollo] Creating Python virtual environment in backend/.venv...")
        subprocess.run([sys.executable, "-m", "venv", str(VENV_DIR)], check=True)

    if not VENV_UVICORN.exists():
        print("⚡ [Apollo] Installing backend dependencies (FastAPI, Uvicorn, Multipart)...")
        req_file = BACKEND_DIR / "requirements.txt"
        subprocess.run(
            [str(VENV_PYTHON), "-m", "pip", "install", "-r", str(req_file)],
            check=True,
        )


def ensure_frontend_deps():
    """Ensures frontend node_modules exist."""
    node_modules = FRONTEND_DIR / "node_modules"
    if not node_modules.exists():
        print("⚡ [Apollo] Installing frontend dependencies via npm...")
        subprocess.run([NPM_CMD, "install"], cwd=str(FRONTEND_DIR), check=True)


def stop_processes():
    """Stops running backend and frontend processes."""
    print("🛑 [Apollo] Stopping all Project Apollo processes...")

    # 1. Kill saved PIDs from .apollo.pid
    if PID_FILE.exists():
        try:
            with open(PID_FILE, "r") as f:
                pids = [int(line.strip()) for line in f if line.strip()]
            for pid in pids:
                try:
                    if IS_WINDOWS:
                        subprocess.run(
                            ["taskkill", "/F", "/T", "/PID", str(pid)],
                            stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL,
                        )
                    else:
                        os.kill(pid, signal.SIGTERM)
                except Exception:
                    pass
            PID_FILE.unlink(missing_ok=True)
        except Exception as e:
            print(f"Notice: Failed to read PID file: {e}")

    # 2. Port fallback check (ports 8000 and 5173)
    if IS_WINDOWS:
        for port in [8000, 5173]:
            try:
                out = subprocess.check_output(
                    f"netstat -ano | findstr :{port}", shell=True, text=True
                )
                for line in out.splitlines():
                    parts = line.strip().split()
                    if len(parts) >= 5 and "LISTENING" in parts:
                        pid = parts[-1]
                        subprocess.run(
                            ["taskkill", "/F", "/PID", pid],
                            stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL,
                        )
            except Exception:
                pass

    print("✅ [Apollo] All services stopped cleanly.")


def start_processes():
    """Launches both backend and frontend processes simultaneously."""
    ensure_backend_venv()
    ensure_frontend_deps()

    print("=" * 65)
    print("  🚀 Starting Project Apollo (Backend + Jam Room Frontend)")
    print("=" * 65)
    print("  Backend API:  http://127.0.0.1:8000  (API Docs: http://127.0.0.1:8000/docs)")
    print("  Frontend UI:  http://localhost:5173")
    print("=" * 65)
    print("  Press Ctrl+C at any time to shut down both servers.\n")

    # Start FastAPI Backend
    backend_cmd = [
        str(VENV_UVICORN),
        "app.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        "8000",
        "--reload",
    ]
    backend_proc = subprocess.Popen(
        backend_cmd,
        cwd=str(BACKEND_DIR),
    )

    # Start React Vite Frontend
    frontend_cmd = [NPM_CMD, "run", "dev"]
    frontend_proc = subprocess.Popen(
        frontend_cmd,
        cwd=str(FRONTEND_DIR),
    )

    # Save PIDs
    with open(PID_FILE, "w") as f:
        f.write(f"{backend_proc.pid}\n{frontend_proc.pid}\n")

    def signal_handler(sig, frame):
        print("\n\n🛑 [Apollo] Shutting down...")
        try:
            if IS_WINDOWS:
                subprocess.run(
                    ["taskkill", "/F", "/T", "/PID", str(backend_proc.pid)],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
                subprocess.run(
                    ["taskkill", "/F", "/T", "/PID", str(frontend_proc.pid)],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
            else:
                backend_proc.terminate()
                frontend_proc.terminate()
        except Exception:
            pass
        PID_FILE.unlink(missing_ok=True)
        print("✅ [Apollo] Shutdown complete.")
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        # Keep orchestrator alive and monitor child processes
        while True:
            time.sleep(0.5)
            if backend_proc.poll() is not None:
                print("⚠️ [Apollo] Backend process terminated unexpectedly.")
                break
            if frontend_proc.poll() is not None:
                print("⚠️ [Apollo] Frontend process terminated unexpectedly.")
                break
    except KeyboardInterrupt:
        signal_handler(None, None)
    finally:
        PID_FILE.unlink(missing_ok=True)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1].lower() in ["stop", "--stop", "-s"]:
        stop_processes()
    else:
        start_processes()

