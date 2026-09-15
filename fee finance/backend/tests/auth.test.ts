import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('Authentication Endpoints (AC6)', () => {
  it('should authenticate SuperAdmin with valid credentials and return JWT tokens without password hash', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'superadmin@schoolconnect.edu',
        password: 'Admin@123',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user).toBeDefined();
    expect(res.body.user.role).toBe('SUPER_ADMIN');
    expect(res.body.user.email).toBe('superadmin@schoolconnect.edu');
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('should authenticate Admin with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@schoolconnect.edu',
        password: 'Admin@123',
      });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('ADMIN');
  });

  it('should authenticate Staff with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'staff@schoolconnect.edu',
        password: 'Staff@123',
      });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('STAFF');
  });

  it('should reject login with invalid password (401)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'superadmin@schoolconnect.edu',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('should reject login with nonexistent user (401)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nobody@nowhere.com',
        password: 'Password123',
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('should refresh access token using valid refresh token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@schoolconnect.edu',
        password: 'Admin@123',
      });

    const refreshToken = loginRes.body.refreshToken;

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body).toHaveProperty('accessToken');
    expect(refreshRes.body).toHaveProperty('refreshToken');
  });

  it('should reject invalid refresh token (401)', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'invalid.token.here' });

    expect(res.status).toBe(401);
  });
});
