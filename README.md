# QuizFlow — MERN Quiz Management Platform

QuizFlow is a full-stack quiz management application built with React, Node.js, Express, and MongoDB. It provides separate student and admin-facing screens for organizing batches, managing quizzes, and reviewing quiz results.

**Live demo:** https://quizflow-frontend-9ieb.onrender.com/  
**Source code:** https://github.com/yashvardhanmishra79-commits/QuizFlow-Mern

> **Security note:** This repository is a learning project, not production-ready authentication. The current backend stores passwords as plain text and does not enforce server-side authorization on management endpoints. Do not use real passwords, personal data, or expose this deployment to untrusted users until these issues are fixed.

## Features

### Admin-facing screens
- Dashboard overview
- Create, edit, and delete quizzes
- Create and manage batches
- Manage student records

### Student-facing screens
- Browse available quizzes
- Take timed quizzes
- View score breakdowns and answer explanations

### Public pages
- Home, About, and Contact pages
- React Router-based navigation
- Shared API client using Axios

## Tech stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, React Router, Axios, React Icons |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| Deployment | Render (frontend demo) |

## Repository structure

```text
QuizFlow-Mern/
├── backend/
│   ├── models/       # User, Quiz, and Batch schemas
│   ├── routes/       # User, quiz, and batch endpoints
│   ├── index.js      # Express entry point and database connection
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/      # Axios API client
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── layouts/
│   │   └── pages/
│   └── package.json
└── README.md
```

## Run locally

### Prerequisites
- Node.js and npm
- A MongoDB database, local or MongoDB Atlas
- Git

### 1. Clone the repository

```bash
git clone https://github.com/yashvardhanmishra79-commits/QuizFlow-Mern.git
cd QuizFlow-Mern
```

### 2. Configure and start the backend

Create `backend/.env` with your own MongoDB connection string:

```env
MONGO_URL=mongodb://127.0.0.1:27017/quizflow
PORT=4400
```

Use a MongoDB Atlas URI instead if you are using Atlas. Do not commit your `.env` file or put credentials in source code.

```bash
cd backend
npm install
npm run dev
```

The backend health endpoint is available at `http://localhost:4400/health` when the server starts successfully.

### 3. Configure and start the frontend

The frontend reads its API base URL from Vite's `VITE_API_URL` environment variable. Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:4400
```

Then, in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite normally serves the frontend at `http://localhost:5173`. If Vite selects another port, use the URL printed in the terminal.

## Useful commands

Run these from the relevant folder.

**Backend**
```bash
npm install
npm run dev
```

**Frontend**
```bash
npm install
npm run dev
npm run build
npm run lint
```

## API route overview

These are the routes currently declared in the backend. Request methods and response shapes should be checked in the corresponding route file before integrating another client.

| Area | Routes |
|---|---|
| Users | `POST /user/login`, `POST /user/add-user`, `GET /user/get-all-students`, `POST /user/update-user`, `POST /user/delete-user` |
| Quizzes | `POST /quiz/add-quiz`, `POST /quiz/delete-quiz`, `GET /quiz/get-all`, `GET /quiz/:batchId`, `GET /quiz/single/:quizId` |
| Batches | `POST /batch/add-batch`, `POST /batch/delete-batch`, `POST /batch/update-batch`, `GET /batch/get-all` |
| Health | `GET /health` |

## Known limitations and next steps

- Hash passwords and migrate existing plain-text password records safely.
- Add server-side authentication and role checks to every protected endpoint.
- Remove public privilege assignment: user registration must never allow a client to choose the `admin` role.
- Add input validation, consistent HTTP status codes, and centralized error handling.
- Add automated backend tests and replace the placeholder test script.
- Add a documented, secure initial-admin provisioning process.
- Configure CORS for the exact frontend origin in each environment.

## Project status

This is an educational full-stack project that demonstrates CRUD workflows and client/server integration. The security limitations above must be resolved before production use.

## License

No license file was found during this README review. Add a license file before describing the project as open source or granting reuse permissions.
