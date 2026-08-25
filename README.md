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
- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env-example .env
# Edit .env with your MongoDB URI and PORT

# Start development server
npm run dev
```

**Default Admin Created on First Run:**
- Email: `admin@quizflow.com`
- Password: `admin123`

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

### Auto Admin Seeding
On backend startup, `seedAdminUser()` checks for existing admin. If none exists, creates:
```
Email: admin@quizflow.com
Password: admin123
Role: admin
```

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

## Default Test Accounts

After first backend run:
- **Admin**: `admin@quizflow.com` / `admin123`
- Create students via Admin Panel → Manage Students

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