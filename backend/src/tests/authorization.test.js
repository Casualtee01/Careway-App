const {
  app, request, setupTestDatabase, clearTestDatabase, closeTestDatabase, createAccount, accessToken, DoctorProfile
} = require('./testSetup');

beforeAll(setupTestDatabase);
beforeEach(clearTestDatabase);
afterAll(closeTestDatabase);

describe('authorization API', () => {
  test('requires authentication and enforces patient-only routes', async () => {
    const patient = await createAccount({ role: 'patient', email: 'patient@example.test' });
    const doctor = await createAccount({ role: 'doctor', email: 'doctor@example.test' });
    const patientToken = await accessToken(patient.email);
    const doctorToken = await accessToken(doctor.email);

    expect((await request(app).get('/api/v1/patients/profile')).status).toBe(401);
    expect((await request(app).get('/api/v1/patients/profile').set('Authorization', `Bearer ${patientToken}`)).status).toBe(200);
    expect((await request(app).get('/api/v1/patients/profile').set('Authorization', `Bearer ${doctorToken}`)).status).toBe(403);
  });

  test('allows administrators to approve doctors but blocks other roles', async () => {
    const doctor = await createAccount({ role: 'doctor', email: 'pending@example.test', approvalStatus: 'pending' });
    const secondDoctor = await createAccount({ role: 'doctor', email: 'second.pending@example.test', approvalStatus: 'pending' });
    const admin = await createAccount({ role: 'admin', email: 'admin@example.test' });
    const patient = await createAccount({ role: 'patient', email: 'patient@example.test' });
    const doctorToken = await accessToken(doctor.email);
    const adminToken = await accessToken(admin.email);
    const patientToken = await accessToken(patient.email);

    const unauthenticatedList = await request(app).get('/api/v1/admin/doctors?approvalStatus=pending');
    expect(unauthenticatedList.status).toBe(401);

    const doctorList = await request(app).get('/api/v1/admin/doctors?approvalStatus=pending').set('Authorization', `Bearer ${doctorToken}`);
    expect(doctorList.status).toBe(403);

    const selfApproval = await request(app).patch(`/api/v1/admin/doctors/${doctor._id}/approve`).set('Authorization', `Bearer ${doctorToken}`);
    expect(selfApproval.status).toBe(403);

    const denied = await request(app).patch(`/api/v1/admin/doctors/${doctor._id}/approve`).set('Authorization', `Bearer ${patientToken}`);
    expect(denied.status).toBe(403);

    const pending = await request(app).get('/api/v1/admin/doctors?approvalStatus=pending').set('Authorization', `Bearer ${adminToken}`);
    expect(pending.status).toBe(200);
    expect(pending.body.data.data).toHaveLength(2);

    const approved = await request(app).patch(`/api/v1/admin/doctors/${doctor._id}/approve`).set('Authorization', `Bearer ${adminToken}`);
    expect(approved.status).toBe(200);
    expect((await DoctorProfile.findOne({ user: doctor._id })).approvalStatus).toBe('approved');

    const rejected = await request(app).patch(`/api/v1/admin/doctors/${secondDoctor._id}/reject`).set('Authorization', `Bearer ${adminToken}`);
    expect(rejected.status).toBe(200);
    expect((await DoctorProfile.findOne({ user: secondDoctor._id })).approvalStatus).toBe('rejected');
  });
});