import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/users.routes';
import studentRoutes from './modules/students/students.routes';
import parentRoutes from './modules/parents/parents.routes';
import studentParentRoutes from './modules/student-parents/student-parents.routes';
import admissionRoutes from './modules/admissions/admissions.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import feeRoutes, { studentFeeRouter } from './modules/fees/fee.routes';

const app: Application = express();

// Security and utility middleware
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL || '*',
    credentials: true,
  })
);

if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'SchoolConnect API',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/students', studentParentRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/students', studentFeeRouter);

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: `Route ${req.method} ${req.originalUrl} not found`,
      code: 'NOT_FOUND',
    },
  });
});

// Global Centralized Error Handler
app.use(errorHandler);

export default app;
