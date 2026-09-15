import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('Admissions Endpoints (AC4, AC7)', () => {
  let adminToken: string;
  let testStudentId: string;
  let createdAdmissionId: string;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@schoolconnect.edu',
      password: 'Admin@123',
    });
    adminToken = res.body.accessToken;

    const studentRes = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        admissionNumber: `SC-ADM-TEST-${Date.now()}`,
        firstName: 'AdmissionCandidate',
        lastName: 'Sharma',
        dateOfBirth: '2015-08-10',
        gender: 'MALE',
        address: 'Test Address',
        currentGrade: 'Grade 5',
      });
    testStudentId = studentRes.body.student.id;
  });

  it('should create an admission application for a student (AC4)', async () => {
    const res = await request(app)
      .post('/api/admissions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId: testStudentId,
        academicYear: '2026-2027',
        gradeAppliedFor: 'Grade 5',
        previousSchool: 'Springdales High',
        documentsSubmitted: ['Transfer Certificate', 'Birth Certificate'],
        remarks: 'Direct application via admin desk',
      });

    expect(res.status).toBe(201);
    expect(res.body.admission).toBeDefined();
    expect(res.body.admission.admissionStatus).toBe('PENDING');
    expect(res.body.admission.student).toBeDefined();
    expect(res.body.admission.student.parents).toBeDefined(); // AC7 requirement
    createdAdmissionId = res.body.admission.id;
  });

  it('should list admissions with filters (AC4)', async () => {
    const res = await request(app)
      .get('/api/admissions?status=PENDING&academicYear=2026-2027')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.admissions).toBeInstanceOf(Array);
    expect(res.body.admissions.length).toBeGreaterThan(0);
    expect(res.body.admissions[0].student).toBeDefined();
    expect(res.body.admissions[0].student.parents).toBeDefined(); // AC7
  });

  it('should get admission detail by ID with student and parent information (AC7)', async () => {
    const res = await request(app)
      .get(`/api/admissions/${createdAdmissionId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.admission).toBeDefined();
    expect(res.body.admission.student).toBeDefined();
    expect(res.body.admission.student.parents).toBeDefined();
  });

  it('should update admission status and record decision (AC4)', async () => {
    const res = await request(app)
      .patch(`/api/admissions/${createdAdmissionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        admissionStatus: 'APPROVED',
        remarks: 'Application approved by admissions board',
      });

    expect(res.status).toBe(200);
    expect(res.body.admission.admissionStatus).toBe('APPROVED');
    expect(res.body.admission.decidedBy).toBeDefined();
  });

  it('should get full admission history timeline for a student (AC4)', async () => {
    const res = await request(app)
      .get(`/api/admissions/student/${testStudentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.admissions).toBeInstanceOf(Array);
    expect(res.body.admissions.length).toBeGreaterThan(0);
  });
});
