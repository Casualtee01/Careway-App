const {
  app, request, setupTestDatabase, clearTestDatabase, closeTestDatabase, createAccount, DoctorProfile
} = require('./testSetup');

beforeAll(setupTestDatabase);
beforeEach(clearTestDatabase);
afterAll(closeTestDatabase);

describe('doctor discovery API', () => {
  test('returns only active approved doctors and provides available slots', async () => {
    const listedDoctor = await createAccount({ role: 'doctor', name: 'Visible Doctor', email: 'visible@example.test' });
    await createAccount({ role: 'doctor', name: 'Pending Doctor', email: 'pending@example.test', approvalStatus: 'pending' });
    const inactiveDoctor = await createAccount({ role: 'doctor', name: 'Inactive Doctor', email: 'inactive@example.test', isActive: false });

    const date = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const results = await request(app).get(`/api/v1/doctors?name=Visible&availableDate=${date}`);
    expect(results.status).toBe(200);
    expect(results.body.data.data).toHaveLength(1);
    expect(results.body.data.data[0].user.name).toBe('Visible Doctor');

    const slots = await request(app).get(`/api/v1/doctors/${listedDoctor._id}/availability?date=${date}`);
    expect(slots.status).toBe(200);
    expect(slots.body.data.slots.length).toBeGreaterThan(0);

    const hidden = await request(app).get(`/api/v1/doctors/${inactiveDoctor._id}`);
    expect(hidden.status).toBe(404);
    expect(await DoctorProfile.countDocuments({ approvalStatus: 'pending' })).toBe(1);
  });
});