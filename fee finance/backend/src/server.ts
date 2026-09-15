import app from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

const PORT = parseInt(env.PORT, 10) || 5000;

async function startServer() {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('✅ Connected to database successfully');

    app.listen(PORT, () => {
      console.log(`🚀 SchoolConnect API running at http://localhost:${PORT}`);
      console.log(`📚 Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
