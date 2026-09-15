import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('Students Endpoints (AC1, AC5, AC7)', () => {
  let adminToken: string;
  let createdStudentId: string;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@schoolconnect.edu',
      password: 'Admin@123',
    });
    adminToken = res.body.accessToken;
  });

  it('should create a new student record (AC1)', async () => {
    const admNum = `SC-TEST-${Date.now()}`;
    const res = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        admissionNumber: admNum,
        firstName: 'Reyansh',
        lastName: 'Gupta',
        dateOfBirth: '2016-05-15',
        gender: 'MALE',
        bloodGroup: 'B+',
        nationality: 'Indian',
        address: '10 Silicon Valley, Electronic City, Bengaluru',
        phone: '+91 91234 56789',
        email: 'reyansh.gupta@example.com',
        status: 'APPLIED',
        currentGrade: 'Grade 3',
      });

    expect(res.status).toBe(201);
    expect(res.body.student).toBeDefined();
    expect(res.body.student.admissionNumber).toBe(admNum);
    expect(res.body.student.firstName).toBe('Reyansh');
    createdStudentId = res.body.student.id;
  });

  it('should reject creating student with duplicate admission number (409)', async () => {
    const res = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        admissionNumber: 'SC-2026-001', // already exists in seed
        firstName: 'Duplicate',
        lastName: 'Student',
        dateOfBirth: '2016-01-01',
        gender: 'FEMALE',
        address: 'Some Address',
        currentGrade: 'Grade 1',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ADMISSION_NUMBER_EXISTS');
  });

  it('should list students with pagination and search (AC1)', async () => {
    const res = await request(app)
      .get('/api/students?page=1&limit=5&search=Sharma')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('students');
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.students.length).toBeGreaterThan(0);
  });

  it('should get student detail with linked parents and admission history (AC7)', async () => {
    // Seed student 1 (Aarav) has linked parents and admission
    const listRes = await request(app)
      .get('/api/students?search=SC-2026-001')
      .set('Authorization', `Bearer ${adminToken}`);

    const aaravId = listRes.body.students[0].id;

    const res = await request(app)
      .get(`/api/students/${aaravId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.student).toBeDefined();
    expect(res.body.student.parents).toBeInstanceOf(Array);
    expect(res.body.student.parents.length).toBeGreaterThan(0);
    expect(res.body.student.parents[0].parentGuardian).toBeDefined();
    expect(res.body.student.admissions).toBeInstanceOf(Array);
    expect(res.body.student.admissions.length).toBeGreaterThan(0);
  });

  it('should update student details (AC1)', async () => {
    const res = await request(app)
      .patch(`/api/students/${createdStudentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        currentGrade: 'Grade 4',
        bloodGroup: 'AB+',
      });

    expect(res.status).toBe(200);
    expect(res.body.student.currentGrade).toBe('Grade 4');
    expect(res.body.student.bloodGroup).toBe('AB+');
  });

  it('should soft-delete a student and preserve record integrity (AC5)', async () => {
    const res = await request(app)
      .delete(`/api/students/${createdStudentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.student.isDeleted).toBe(true);
    expect(res.body.student.deletedAt).not.toBeNull();

    // Default list should not include soft-deleted student
    const listRes = await request(app)
      .get('/api/students')
      .set('Authorization', `Bearer ${adminToken}`);

    const found = listRes.body.students.find((s: any) => s.id === createdStudentId);
    expect(found).toBeUndefined();
  });
});
