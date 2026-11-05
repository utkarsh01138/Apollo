# Development & Contribution Guide

This guide establishes the coding standards, environment setup guidelines, and commit conventions for **Project Apollo**.

---

## 1. Prerequisites & Environment

### Operating System & Core Dependencies
- **Operating System:** Windows, macOS, or Linux.
- **Python:** Version 3.11 or 3.12 is strongly recommended for seamless compatibility with PyTorch, Demucs, and TensorFlow/ONNX dependencies used by Basic-Pitch.
- **FFmpeg:** Must be installed and accessible on your system `PATH`.
  - Windows verification: `ffmpeg -version`
- **Node.js:** v18.0.0 or later (v20+ LTS recommended) and `npm` / `pnpm`.

---

## 2. Git Commit Conventions

Project Apollo enforces [Conventional Commits v1.0.0](https://www.conventionalcommits.org/) for clear, structured, and auditable version histories.

### Commit Format
```text
<type>(<scope>): <short description in present tense>

[optional body explaining motivation and details]

[optional footer(s)]
```

### Supported Types
- `feat`: A new user-facing feature or API capability.
- `fix`: A bug fix.
- `docs`: Documentation updates or additions.
- `style`: Formatting, whitespace, or visual styling changes (no production logic altered).
- `refactor`: Code changes that neither fix a bug nor add a feature.
- `perf`: Code changes improving performance or memory footprint.
- `test`: Adding missing unit/integration tests or correcting existing tests.
- `build`: Changes affecting build systems, packaging, or external dependencies.
- `ci`: Changes to CI/CD configurations, scripts, or workflows.
- `chore`: Repository maintenance, gitignore modifications, or auxiliary tooling changes.

### Common Scopes
- `backend`: Core FastAPI server and app configuration.
- `demucs`: Audio stem separation service and wrapper.
- `transcribe`: Basic-Pitch audio-to-MIDI transcription pipeline.
- `notation`: Music21 difficulty reduction, quantization, and score generation.
- `frontend`: React UI, component architecture, and styling.
- `mixer`: Web Audio API multi-track audio engine and playback logic.
- `tasks`: Asynchronous worker queues and background job tracking.
- `docs`: Architectural and usage documentation.

### Example Commits
```text
feat(demucs): integrate htdemucs 4-stem separation model with async task dispatch
feat(mixer): implement synchronized multi-stem mute and solo matrix in web audio
fix(notation): prevent division by zero in 16th-note quantization grid
docs(architecture): add sequence diagram for stem extraction and transcription
```

---

## 3. Python Backend Workflow

### Virtual Environment Setup
Always develop within a dedicated Python virtual environment:

```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux / macOS:
# source .venv/bin/activate

pip install -r requirements.txt
```

### Running the API Server Locally
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Interactive OpenAPI documentation is automatically served at:
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

---

## 4. Frontend Workflow

### Setup & Local Development Server
```bash
cd frontend
npm install
npm run dev
```
The development server will launch at `http://localhost:5173/`.

---

## 5. Branching Strategy

- `main`: Production-ready, stable codebase.
- `feat/<feature-name>`: Dedicated feature branches for active development.
- `fix/<bug-description>`: Bug fix branches.
