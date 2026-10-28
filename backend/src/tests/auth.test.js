const {
  app, request, setupTestDatabase, clearTestDatabase, closeTestDatabase, User
} = require('./testSetup');

beforeAll(setupTestDatabase);
beforeEach(clearTestDatabase);
afterAll(closeTestDatabase);

describe('authentication API', () => {
  test('registers patient and doctor accounts without allowing a public admin role', async () => {
    const patient = await request(app).post('/api/v1/auth/register/patient').send({
      name: 'Jamie Patient', email: 'jamie@example.test', password: 'StrongPassword123!'
    });
    expect(patient.status).toBe(201);
    expect(patient.body.data.user.role).toBe('patient');
    expect(patient.body.data.user.password).toBeUndefined();

    const doctor = await request(app).post('/api/v1/auth/register/doctor').send({
      name: 'Taylor Doctor', email: 'taylor@example.test', password: 'StrongPassword123!'
    });
    expect(doctor.status).toBe(201);
    expect(doctor.body.data.user.role).toBe('doctor');
    expect(doctor.body.data.profile.approvalStatus).toBe('pending');

    const adminAttempt = await request(app).post('/api/v1/auth/register/patient').send({
      name: 'Public Admin', email: 'admin@example.test', password: 'StrongPassword123!', role: 'admin'
    });
    expect(adminAttempt.status).toBe(201);
    expect(await User.findOne({ email: 'admin@example.test' }).select('+password')).toMatchObject({ role: 'patient' });
  });

  test('uses a generic login error and returns only safe user data with refresh cookie', async () => {
    await User.create({ name: 'Login User', email: 'login@example.test', password: 'StrongPassword123!', role: 'patient' });
    const failure = await request(app).post('/api/v1/auth/login').send({ email: 'login@example.test', password: 'WrongPassword123!' });
    expect(failure.status).toBe(401);
    expect(failure.body.message).toBe('Invalid email or password');

    const success = await request(app).post('/api/v1/auth/login').send({ email: 'login@example.test', password: 'StrongPassword123!' });
    expect(success.status).toBe(200);
    expect(success.body.data.accessToken).toBeTruthy();
    expect(success.body.data.user.password).toBeUndefined();
    expect(success.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(success.headers['set-cookie'][0]).toContain('refreshToken=');
  });

  test('rotates refresh cookies, rejects reuse, and revokes sessions on logout', async () => {
    await User.create({ name: 'Session User', email: 'session@example.test', password: 'StrongPassword123!', role: 'patient' });
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'session@example.test', password: 'StrongPassword123!' });
    const firstCookie = login.headers['set-cookie'][0].split(';')[0];

    const rotated = await request(app).post('/api/v1/auth/refresh').set('Cookie', firstCookie);
    expect(rotated.status).toBe(200);
    const secondCookie = rotated.headers['set-cookie'][0].split(';')[0];
    expect(secondCookie).not.toBe(firstCookie);

    const reused = await request(app).post('/api/v1/auth/refresh').set('Cookie', firstCookie);
    expect(reused.status).toBe(401);
    const revokedSuccessor = await request(app).post('/api/v1/auth/refresh').set('Cookie', secondCookie);
    expect(revokedSuccessor.status).toBe(401);

    const nextLogin = await request(app).post('/api/v1/auth/login').send({ email: 'session@example.test', password: 'StrongPassword123!' });
    const logoutCookie = nextLogin.headers['set-cookie'][0].split(';')[0];
    expect((await request(app).post('/api/v1/auth/logout').set('Cookie', logoutCookie)).status).toBe(200);
    expect((await request(app).post('/api/v1/auth/refresh').set('Cookie', logoutCookie)).status).toBe(401);
  });
});