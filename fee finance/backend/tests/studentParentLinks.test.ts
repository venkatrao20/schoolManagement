import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('Student-Parent Linking Endpoints (AC3, AC7)', () => {
  let adminToken: string;
  let testStudentId: string;
  let testParentId: string;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@schoolconnect.edu',
      password: 'Admin@123',
    });
    adminToken = res.body.accessToken;

    // Create a student and a parent for linking tests
    const studentRes = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        admissionNumber: `SC-LINK-${Date.now()}`,
        firstName: 'LinkTestStudent',
        lastName: 'One',
        dateOfBirth: '2016-01-01',
        gender: 'FEMALE',
        address: 'Test Link Address',
        currentGrade: 'Grade 1',
      });
    testStudentId = studentRes.body.student.id;

    const parentRes = await request(app)
      .post('/api/parents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'LinkTestParent',
        lastName: 'One',
        relationship: 'MOTHER',
        phone: '+91 91111 22222',
        email: `linkparent.${Date.now()}@example.com`,
        address: 'Test Link Address',
      });
    testParentId = parentRes.body.parent.id;
  });

  it('should link a parent to a student (AC3)', async () => {
    const res = await request(app)
      .post(`/api/students/${testStudentId}/parents`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        parentGuardianId: testParentId,
        isPrimaryContact: true,
        isEmergencyContact: true,
        relationshipNotes: 'Mother is primary caretaker',
      });

    expect(res.status).toBe(201);
    expect(res.body.link).toBeDefined();
    expect(res.body.link.studentId).toBe(testStudentId);
    expect(res.body.link.parentGuardianId).toBe(testParentId);
    expect(res.body.link.isPrimaryContact).toBe(true);
    expect(res.body.link.isEmergencyContact).toBe(true);
  });

  it('should reject duplicate link for the same student and parent (409)', async () => {
    const res = await request(app)
      .post(`/api/students/${testStudentId}/parents`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        parentGuardianId: testParentId,
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('LINK_ALREADY_EXISTS');
  });

  it('should update link contact flags (AC3)', async () => {
    const res = await request(app)
      .patch(`/api/students/${testStudentId}/parents/${testParentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        isPrimaryContact: false,
        relationshipNotes: 'Updated notes',
      });

    expect(res.status).toBe(200);
    expect(res.body.link.isPrimaryContact).toBe(false);
    expect(res.body.link.relationshipNotes).toBe('Updated notes');
  });

  it('should unlink parent from student (AC3)', async () => {
    const res = await request(app)
      .delete(`/api/students/${testStudentId}/parents/${testParentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('unlinked');
  });
});
