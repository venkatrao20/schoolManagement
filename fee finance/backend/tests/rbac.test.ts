import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('Role-Based Access Control (AC6)', () => {
  let superAdminToken: string;
  let adminToken: string;
  let staffToken: string;

  beforeAll(async () => {
    const saRes = await request(app).post('/api/auth/login').send({
      email: 'superadmin@schoolconnect.edu',
      password: 'Admin@123',
    });
    superAdminToken = saRes.body.accessToken;

    const admRes = await request(app).post('/api/auth/login').send({
      email: 'admin@schoolconnect.edu',
      password: 'Admin@123',
    });
    adminToken = admRes.body.accessToken;

    const staffRes = await request(app).post('/api/auth/login').send({
      email: 'staff@schoolconnect.edu',
      password: 'Staff@123',
    });
    staffToken = staffRes.body.accessToken;
  });

  it('should return 401 when accessing protected route without token', async () => {
    const res = await request(app).get('/api/students');
    expect(res.status).toBe(401);
  });

  it('should allow Staff to read students list', async () => {
    const res = await request(app)
      .get('/api/students')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('students');
  });

  it('should forbid Staff from creating a student (403)', async () => {
    const res = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        admissionNumber: 'SC-TEST-STAFF-FORBID',
        firstName: 'Test',
        lastName: 'Student',
        dateOfBirth: '2016-01-01',
        gender: 'MALE',
        address: 'Test Address',
        currentGrade: 'Grade 1',
      });

    expect(res.status).toBe(403);
  });

  it('should forbid Admin from accessing User Management endpoint (403)', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
  });

  it('should forbid Staff from accessing User Management endpoint (403)', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(403);
  });

  it('should allow SuperAdmin to access User Management list (200)', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('users');
  });

  it('should allow SuperAdmin to create a new user account (201)', async () => {
    const uniqueEmail = `test.user.${Date.now()}@schoolconnect.edu`;
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'New Test Staff',
        email: uniqueEmail,
        password: 'Password@123',
        role: 'STAFF',
      });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(uniqueEmail);
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });
});
