# School Management Admission

Full-stack school admissions management application with a React frontend, Express API, and MySQL database.

## Requirements

- Node.js 18 or newer
- MySQL 8 or newer
- MySQL service running locally

## Database setup

1. Create the database and tables by running `backend/schema/schema.sql` in MySQL Workbench or the MySQL CLI.
2. Confirm `backend/.env` contains the local connection values:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=school_admission
PORT=5000
JWT_SECRET=replace-with-a-long-random-secret
```

The application expects an active user. The included development database already contains:

```text
Username: admissions01
Password: test1234
```

Change this account and the JWT secret before production use.

## Install

From the repository root:

```powershell
npm run install:all
```

## Development

Run the API and React development server in separate terminals:

```powershell
npm run dev:backend
npm run dev:frontend
```

Open <http://localhost:3000>. The React development server proxies `/api` requests to the backend at port 5000.

## Production-style run

Build the frontend and serve the entire application from Express:

```powershell
npm run build
npm start
```

Open <http://localhost:5000>. Express serves the compiled React application and the API under `/api`.

## Main workflows

- Staff JWT login
- Live dashboard metrics from MySQL
- Enquiry creation, search, and status updates
- Application creation with optional enquiry linking
- Application search and status progression through assessment, approval, and admission
