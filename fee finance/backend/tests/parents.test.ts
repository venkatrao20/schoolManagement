import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('Parents/Guardians Endpoints (AC2, AC7)', () => {
  let adminToken: string;
  let createdParentId: string;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@schoolconnect.edu',
      password: 'Admin@123',
    });
    adminToken = res.body.accessToken;
  });

  it('should create a new parent/guardian record (AC2)', async () => {
    const res = await request(app)
      .post('/api/parents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Sanjay',
        lastName: 'Verma',
        relationship: 'FATHER',
        phone: '+91 99001 22334',
        email: 'sanjay.verma@example.com',
        occupation: 'Civil Engineer',
        address: '45 Prestige Park, Bengaluru',
        idProofType: 'AADHAAR',
        idProofNumber: 'XXXX-XXXX-3344',
      });

    expect(res.status).toBe(201);
    expect(res.body.parent).toBeDefined();
    expect(res.body.parent.firstName).toBe('Sanjay');
    createdParentId = res.body.parent.id;
  });

  it('should list parents with search by name/email/phone (AC2)', async () => {
    const res = await request(app)
      .get('/api/parents?search=Sharma')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('parents');
    expect(res.body.parents.length).toBeGreaterThan(0);
  });

  it('should get parent detail with linked students (AC7)', async () => {
    const listRes = await request(app)
      .get('/api/parents?search=rajesh.sharma@example.com')
      .set('Authorization', `Bearer ${adminToken}`);

    const parentId = listRes.body.parents[0].id;

    const res = await request(app)
      .get(`/api/parents/${parentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.parent).toBeDefined();
    expect(res.body.parent.students).toBeInstanceOf(Array);
    expect(res.body.parent.students.length).toBeGreaterThanOrEqual(2); // Aarav and Priya siblings
  });

  it('should update parent/guardian record (AC2)', async () => {
    const res = await request(app)
      .patch(`/api/parents/${createdParentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        occupation: 'Principal Consultant',
      });

    expect(res.status).toBe(200);
    expect(res.body.parent.occupation).toBe('Principal Consultant');
  });

  it('should soft-delete parent/guardian record (AC5)', async () => {
    const res = await request(app)
      .delete(`/api/parents/${createdParentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.parent.isDeleted).toBe(true);
  });
});
