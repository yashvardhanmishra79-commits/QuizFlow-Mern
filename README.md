# QuizFlow - Quiz Management Platform

A modern, full-stack quiz management platform built for coaching institutes. Features include quiz creation, batch management, student assessments, and detailed analytics.

## Tech Stack

**Frontend:**
- React 18 + Vite
- React Router v6
- Axios for API calls
- React Icons
- CSS Variables for theming

**Backend:**
- Node.js + Express
- MongoDB + Mongoose
- JWT-ready authentication structure
- CORS enabled

---

## Project Structure

```
QuizFlow/
├── backend/
│   ├── index.js              # Entry point, DB connection, admin seeding
│   ├── models/
│   │   ├── User.js           # User schema (student/admin)
│   │   ├── Quiz.js           # Quiz schema
│   │   └── Batch.js          # Batch schema
│   ├── routes/
│   │   ├── userRoutes.js     # Auth & user management
│   │   ├── quizRoutes.js     # Quiz CRUD
│   │   └── batchRoutes.js    # Batch CRUD
│   ├── package.json
│   └── .env                  # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Header.jsx    # Dynamic header with auth state
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx  # Global auth state
│   │   ├── layouts/
│   │   │   ├── PublicLayout.jsx
│   │   │   └── AdminLayout.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx           # Landing page
│   │   │   ├── Login.jsx          # Login with role-based redirect
│   │   │   ├── About.jsx          # About page
│   │   │   ├── Contact.jsx        # Contact page with form & FAQ
│   │   │   ├── student/
│   │   │   │   ├── QuizList.jsx
│   │   │   │   ├── QuizSolve.jsx
│   │   │   │   └── QuizResult.jsx
│   │   │   └── admin/
│   │   │       ├── AdminDashboard.jsx
│   │   │       ├── AdminQuizBuilder.jsx
│   │   │       ├── AdminManageStudents.jsx
│   │   │       ├── AdminManageBatches.jsx
│   │   │       └── AdminManageQuizzes.jsx
│   │   ├── api/
│   │   │   └── api.jsx           # Axios instance
│   │   ├── App.jsx               # Routes configuration
│   │   ├── main.jsx              # Entry point
│   │   └── index.css             # Global styles & CSS variables
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## Features

### Authentication & Authorization
- Role-based access control (Admin / Student)
- Auto-creates default admin on first backend startup
- Session persistence via localStorage
- Protected routes for admin panel

### Admin Panel
- **Dashboard** - Overview statistics
- **Quiz Builder** - Create quizzes with questions, marking schemes, time limits
- **Manage Quizzes** - List, edit, delete quizzes
- **Manage Batches** - Create batches, assign students
- **Manage Students** - View all students, batch assignments

### Student Portal
- **Quiz List** - View assigned quizzes by batch
- **Solve Quiz** - Timed quiz interface with navigation
- **Quiz Results** - Detailed score breakdown, correct/incorrect answers

### Public Pages
- **Home** - Landing page with features & CTA
- **About** - Mission, values, stats, team
- **Contact** - Contact form, info cards, FAQ accordion

---

## Getting Started

### Prerequisites
- Node.js 20+
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI and PORT. Keep this file private.

# Provision the first administrator explicitly before starting the server.
# Verify the displayed MongoDB host/database, then enter the requested
# confirmation and administrator details interactively.
npm run provision-admin

# Start development server
npm run dev
```

The provisioning command requires `MONGO_URL` to identify a MongoDB database,
and refuses to proceed until you confirm the displayed host and database name.
The administrator password is entered interactively without terminal echo and
must not be supplied as a command-line argument. Use a private local database
for development. Before provisioning any shared or production database, verify
the active `MONGO_URL` and the displayed target carefully; the command refuses
to create an account if that database already has an administrator.
This change does not alter existing database accounts. If an earlier deployment
may already contain an administrator created by the former startup seeder, rotate
that account's password through an authorized maintenance process; this command
intentionally refuses to modify existing administrators.

Passwords are stored using Argon2id hashes. Existing plaintext accounts remain
login-compatible during the transition and are upgraded after a successful
login. See [Password Migration](#password-migration) before deploying this
version to a database that already contains users.

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at `http://localhost:5173` (default Vite port)
Backend runs at `http://localhost:4400` (configurable via .env)

---

## Environment Variables

### Backend (.env)
```env
MONGO_URL=mongodb://localhost:27017/quizflow
PORT=4400
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/user/login` | User login |
| POST | `/user/add-user` | Create new user (admin only) |
| GET | `/user/get-all-students` | List all students |

### Quizzes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/quiz/add-quiz` | Create quiz |
| POST | `/quiz/delete-quiz` | Delete quiz |
| GET | `/quiz/get-all` | List all quizzes |
| GET | `/quiz/:batchId` | Get quizzes by batch |
| GET | `/quiz/single/:quizId` | Get single quiz |

### Batches
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/batch/add-batch` | Create batch |
| GET | `/batch/get-all` | List all batches |
| GET | `/batch/:batchId` | Get batch details |

---

## User Roles

### Admin
- Access to `/admin/*` routes
- Create/manage quizzes, batches, students
- View all analytics

### Student
- Access to `/quizzes`, `/quiz/:id/solve`, `/quiz/:id/result`
- Take assigned quizzes
- View personal results

---

## Key Implementation Details

### First Administrator Provisioning
Administrators are not created automatically at backend startup. Run
`npm run provision-admin` from the backend directory after configuring
`MONGO_URL`. The command requires explicit interactive input, confirms the
database target, and refuses to create an administrator if one already exists.
It never prints the entered password. Do not pass passwords through shell
arguments or commit environment files.

## Password Migration

New student accounts, student password changes, and provisioned administrators
use Argon2id. Existing plaintext passwords are verified during login and
atomically replaced with a hash when safe. A separate migration command can
convert inactive accounts without requiring users to log in.

Before deployment, take and verify an encrypted, access-restricted database
backup. Backups, snapshots, replicas, and retained database logs may still
contain plaintext passwords and must be handled as sensitive data.

Deploy this release as a coordinated cutover: drain all old application
instances before allowing the new code to upgrade passwords. Old versions
cannot authenticate accounts after their password has been converted.

From the backend directory, first run the migration in dry-run mode:

```bash
npm run migrate-passwords -- --dry-run
```

Review the aggregate counts and the displayed MongoDB host/database. The
command requires you to type the target to confirm it. It requires an explicit
`MONGO_URL` and has no default database fallback. Only after confirming the
target and reviewing the dry-run output, apply the migration:

```bash
npm run migrate-passwords -- --apply
```

The script works in bounded batches. It hashes a legacy password only if the
stored value is unchanged and no hash exists; it removes a redundant legacy
value only if the existing valid hash and legacy value remain unchanged. It can
be restarted after interruption; migrated records are skipped on subsequent
runs. Review skipped, unsupported, or concurrently changed counts and resolve
them before considering migration complete. Confirm all accounts have hashes
and no legacy password values remain before removing transitional legacy login
support in a later release.

Do not roll back to application code that only understands plaintext after
hashes have been written. Use a hash-aware release for rollback. Restoring a
pre-migration backup can reintroduce plaintext passwords; treat that recovery
as sensitive and repeat migration before returning to service.

All newly set passwords must be at least 12 characters and at most 1024 UTF-8
bytes. Existing passwords are hashed as-is during migration to avoid changing
users' credentials. Password hashes are not reversible.

### Header Behavior
- **Unauthenticated**: Shows "Login" button
- **Authenticated Student**: Shows "Solve Quiz" + "Logout"
- **Authenticated Admin**: Shows "Admin Panel" + "Logout"

### Login Redirect Logic
```javascript
if (userData.role === "admin") {
  navigate("/admin");
} else {
  navigate("/quizzes");
}
```

### CSS Variables (Design System)
Defined in `frontend/src/index.css`:
- Colors: Primary, Secondary, Success, Error, Warning
- Typography: Inter font family
- Spacing, Radius, Shadows, Transitions
- Dark mode ready structure

---

## Development

### Run Both Servers
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### Build for Production
```bash
cd frontend && npm run build
# Output in frontend/dist/
```

---

## Initial Administrator

Provision an administrator explicitly using the steps in [Backend Setup](#backend-setup).
After signing in, create student accounts via Admin Panel → Manage Students.

---

## Folder Aliases (Vite)
```javascript
// vite.config.js
resolve: {
  alias: {
    '@': '/src',
    '@components': '/src/components',
    '@pages': '/src/pages',
    '@api': '/src/api',
  }
}
```

---

## Future Enhancements
- [ ] JWT token authentication with refresh tokens
- [ ] Email verification & password reset
- [ ] AI-powered question generation
- [ ] Real-time quiz sessions
- [ ] Export results to PDF/Excel
- [ ] Student performance analytics charts
- [ ] Multi-language support
- [ ] Dark mode toggle

---

## License

MIT License - Feel free to use for educational and commercial projects.

---

## Support

For issues or feature requests, please create an issue in the repository.

**Contact:** support@quizflow.com