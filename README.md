# QuizFlow

QuizFlow is a full-stack quiz management application for coaching institutes. Administrators manage student accounts, batches, quizzes, and results. Students can take quizzes assigned to their batch and review their saved attempts. The public `/demo` page uses sample data and does not create backend records.

## Technology

- Frontend: React 19, React Router 7, Vite 8, Axios, and React Icons
- Backend: Node.js (20.19+ or 22.12+), Express 5, Mongoose 9, and MongoDB
- Authentication: database-backed, opaque bearer sessions; session tokens are stored server-side as hashes. Authentication does not use JWTs.
- Passwords: Argon2id for newly set passwords, with a compatibility path for legacy password migration
- AI quiz generation: Google Gemini through `@google/genai`; only required when an administrator uses AI generation
- Automated backend tests: Node.js built-in `node:test` and `assert/strict`; no database or API key is required to run them

Exact dependency ranges and lockfile versions are recorded in `backend/package.json`, `backend/package-lock.json`, `frontend/package.json`, and `frontend/package-lock.json`.

## Requirements

- Node.js 20.19+ (or 22.12+) and npm
- A MongoDB database for running the backend
- A Gemini API key only if using AI quiz generation

## Setup

### Backend

In PowerShell:

```powershell
Set-Location backend
npm install
Copy-Item .env.example .env
```

Edit `backend/.env` with a private MongoDB connection string. The local defaults are `PORT=4400` and `MONGO_URL=mongodb://localhost:27017/quizflow`. Add `GEMINI_API_KEY` only to enable AI quiz generation; never commit the `.env` file or share its contents.

Provision the first administrator explicitly:

```powershell
npm run provision-admin
```

The provisioning script requires interactive confirmation of the target MongoDB host and database. It refuses to create another administrator when one already exists. Do not supply a password as a command-line argument.

Start the backend:

```powershell
npm run dev
```

The server listens on `http://localhost:4400` by default and exposes `GET /health`. It attempts the MongoDB connection on startup and logs connection failures; database-backed requests return safe errors until the database is available. `PORT` and `MONGO_URL` can be set in the backend environment.

### Frontend

In a second terminal, from the repository root:

```powershell
Set-Location frontend
npm install
Copy-Item .env.example .env
npm run dev
```

The example sets `VITE_API_URL=http://localhost:4400`, matching the backend default. Set `VITE_API_URL` to the deployed backend origin for another environment; do not replace deployed URLs with local values. Vite serves the frontend at `http://localhost:5173` by default.

### Tests and frontend checks

Backend tests use mocks and do not load `.env`, connect to MongoDB, or call Gemini:

```powershell
Set-Location backend
npm test
```

Frontend scripts, run from `frontend`:

```powershell
npm run lint
npm run build
```

## Environment variables

### Backend (`backend/.env`)

| Variable | Default / purpose |
| --- | --- |
| `PORT` | `4400`, HTTP server port |
| `MONGO_URL` | `mongodb://localhost:27017/quizflow`, MongoDB connection URI |
| `GEMINI_API_KEY` | Optional secret; needed only for AI quiz generation |
| `GEMINI_MODEL` | Optional Gemini model override; defaults to `gemini-3.8-flash` |

The AI service also accepts `GOOGLE_API_KEY` as a compatibility alias. Keep all real credentials in ignored local environment files or the deployment platform's secret store.

### Frontend (`frontend/.env`)

| Variable | Default / purpose |
| --- | --- |
| `VITE_API_URL` | `http://localhost:4400`, backend origin used by Axios |

Only `*.example` environment files belong in version control. Do not put secrets in `VITE_*` variables; Vite exposes them to browser code.

## Application behavior

- Administrators create batches and student accounts, assign students to batches, create quizzes manually or with Gemini, and review dashboard results.
- Account email addresses are trimmed, lowercased, and checked case-insensitively. A partial unique index protects records with `emailNormalized`; legacy documents without that field are not covered until backfilled. Existing duplicate normalized values can prevent index creation.
- A quiz has a title, one existing batch, one or more multiple-choice questions with exactly four nonempty options, and a marking scheme.
- Correct-answer marks must be finite and positive. Incorrect-answer marks may be zero or negative, including decimals. Unanswered questions receive zero marks; totals and percentages can be negative.
- Students can read only quizzes assigned to their batch. Student quiz-reading responses omit correct-option indices and explanations. Saved attempts retain a quiz snapshot so historical results remain readable.
- A submission request ID prevents accidental duplicate saves. Students can only read their own saved attempts.
- Batch assignments and deletion coordinate through atomic state on each batch. Assignment writers acquire a claim before saving or reassigning a student or quiz; deletion can proceed only when no claims are pending and blocks new claims while checking references.
- Deploy the batch-claim protocol as a coordinated cutover: older backend instances do not participate and must be drained before batch deletion is enabled.
- The `/demo` route uses frontend sample data only. It does not call the backend or create real quiz attempts.

### Recovering interrupted batch operations

Assignment claims are stored in `batches.pendingAssignments`, and a deletion claim is stored in `batches.deletionInProgress`. If a server process exits before releasing a claim, these fields may remain set. Diagnose affected records with a read-only query in `mongosh`:

```javascript
db.batches.find(
  { $or: [{ pendingAssignments: { $gt: 0 } }, { deletionInProgress: true }] },
  { name: 1, pendingAssignments: 1, deletionInProgress: 1 }
)
```

Do not clear state while any backend instance or assignment writer is running. Stop all application instances, confirm no request is still in flight, and inspect `users` and `quizes` for references to each affected batch. Only after that review, an operator may reset stale state with `db.batches.updateOne({ _id: ObjectId("<batch-id>") }, { $set: { pendingAssignments: 0, deletionInProgress: false } })`. Referenced batches remain protected by the normal deletion check after recovery. Do not reset the counter or deletion flag while application writers are active.

## API

All paths below are relative to the backend origin. Authenticated requests use `Authorization: Bearer <session-token>`. The session token returned by a successful login is required by the client for subsequent authenticated requests.

### Health and accounts (`/health`, `/user`)

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | Public | Health check |
| `POST` | `/user/login` | Public | Authenticate and create a session |
| `POST` | `/user/logout` | Public; revokes the supplied bearer session when present | End the current session |
| `POST` | `/user/add-user` | Admin | Create a student account |
| `GET` | `/user/get-all-students` | Admin | List student accounts without credentials |
| `POST` | `/user/update-user` | Admin | Update a student's name, email, batch, or password |
| `POST` | `/user/delete-user` | Admin | Delete a student account |

### Batches (`/batch`)

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/batch/get-all` | Public | List batches for account and quiz forms |
| `POST` | `/batch/add-batch` | Admin | Create a batch |
| `POST` | `/batch/update-batch` | Admin | Rename a batch |
| `POST` | `/batch/delete-batch` | Admin | Delete an unreferenced batch |

### Quizzes (`/quiz`)

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/quiz/add-quiz` | Admin | Create a quiz |
| `POST` | `/quiz/delete-quiz` | Admin | Delete a quiz |
| `POST` | `/quiz/generate-ai-quiz` | Admin; Gemini key required | Generate validated quiz content |
| `GET` | `/quiz/get-all` | Admin | List quizzes for administration |
| `GET` | `/quiz/:batchId` | Student assigned to that batch | List quizzes in the student's batch |
| `GET` | `/quiz/single/:quizId` | Student assigned to the quiz batch | Read one quiz without answer keys |

### Attempts (`/attempts`)

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/attempts` | Student | Grade and save a quiz attempt |
| `GET` | `/attempts/mine` | Student | List the authenticated student's attempts |
| `GET` | `/attempts/admin/recent` | Admin | Dashboard recent results and average percentage |
| `GET` | `/attempts/:attemptId` | Student; owner only | Read one saved attempt |

## Password migration

New passwords must be at least 12 characters and no more than 1024 UTF-8 bytes. Legacy passwords are still verified during login and upgraded after successful authentication. The backend also provides an explicit migration script for inactive accounts.

Before migrating an existing database, take and verify an encrypted, access-restricted backup. Deploy this release as a coordinated cutover: drain older application instances before allowing passwords to be converted, since older versions may not understand Argon2id hashes.

Run a dry run first, from `backend`:

```powershell
npm run migrate-passwords -- --dry-run
```

Review the reported database target and aggregate counts, then apply only after explicit confirmation:

```powershell
npm run migrate-passwords -- --apply
```

The migration requires an explicit `MONGO_URL`, confirms the target interactively, and can be restarted after interruption. Do not roll back to code that only supports plaintext passwords after hashes have been written. Treat any backup that predates migration as sensitive.

## Email normalization migration

The `users.emailNormalized` field is protected by a **partial unique index**. Existing records without that field are outside the index until backfilled. A duplicate canonical email can prevent creation of the index. The migration reads the native `users` collection with Mongoose automatic index creation disabled, checks case-insensitive normalized addresses across all records, and reports duplicate or invalid-record IDs before changing anything. It never deletes, merges, or chooses an account.

For an existing database, run this migration before starting the release that declares the unique index; normal application startup may attempt to create that index. Stop backend writes and configure `MONGO_URL` in the process environment or `backend/.env`. The apply step uses temporary unique values before writing canonical addresses, so it can safely normalize around an existing unique index; if interrupted, rerun the dry run and apply command. Run the default dry run from `backend`:

```powershell
npm run migrate-emails
```

If duplicates or invalid emails are reported, resolve them manually and rerun the dry run. Do not run the apply command until the preview is clear and the intended database has been verified. Then explicitly apply the idempotent backfill and create/verify the partial unique index:

```powershell
npm run migrate-emails -- --apply
```

Keep application writes stopped until the migration and index creation complete. The utility was not run as part of this code change; run it only against an explicitly authorized database after backup and review.
