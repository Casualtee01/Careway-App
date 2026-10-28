const { DateTime } = require('luxon');
const {
  app, request, setupTestDatabase, clearTestDatabase, closeTestDatabase, createAccount, accessToken, mongoose
} = require('./testSetup');
const appointmentService = require('../services/appointment.service');

beforeAll(setupTestDatabase);
beforeEach(clearTestDatabase);
afterAll(closeTestDatabase);

function futureSlot() {
  return DateTime.utc().plus({ days: 3 }).set({ hour: 10, minute: 0, second: 0, millisecond: 0 });
}

describe('appointment API', () => {
  test('allows only one simultaneous booking and hides another patient appointment', async () => {
    const doctor = await createAccount({ role: 'doctor', email: 'doctor@example.test' });
    const firstPatient = await createAccount({ role: 'patient', email: 'first@example.test' });
    const secondPatient = await createAccount({ role: 'patient', email: 'second@example.test' });
    const firstToken = await accessToken(firstPatient.email);
    const secondToken = await accessToken(secondPatient.email);
    const body = { doctor: doctor._id.toString(), startAt: futureSlot().toISO(), appointmentType: 'online', reason: 'Consultation' };

    const responses = await Promise.all([
      request(app).post('/api/v1/appointments').set('Authorization', `Bearer ${firstToken}`).send(body),
      request(app).post('/api/v1/appointments').set('Authorization', `Bearer ${secondToken}`).send(body)
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);

    const winner = responses.find((response) => response.status === 201);
    const winnerIndex = responses.indexOf(winner);
    const otherToken = winnerIndex === 0 ? secondToken : firstToken;
    const privateRead = await request(app)
      .get(`/api/v1/appointments/${winner.body.data.appointment._id}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(privateRead.status).toBe(404);
  });

  test('lets the assigned doctor accept and patient cancel eligible appointments, releasing the slot', async () => {
    const doctor = await createAccount({ role: 'doctor', email: 'doctor@example.test' });
    const patient = await createAccount({ role: 'patient', email: 'patient@example.test' });
    const otherPatient = await createAccount({ role: 'patient', email: 'other@example.test' });
    const doctorToken = await accessToken(doctor.email);
    const patientToken = await accessToken(patient.email);
    const otherToken = await accessToken(otherPatient.email);
    const body = { doctor: doctor._id.toString(), startAt: futureSlot().toISO(), appointmentType: 'in_person' };

    const created = await request(app).post('/api/v1/appointments').set('Authorization', `Bearer ${patientToken}`).send(body);
    expect(created.status).toBe(201);
    const appointmentId = created.body.data.appointment._id;

    const accepted = await request(app).patch(`/api/v1/doctor/appointments/${appointmentId}/accept`).set('Authorization', `Bearer ${doctorToken}`);
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.appointment.status).toBe('accepted');

    const forbiddenCancel = await request(app).patch(`/api/v1/appointments/${appointmentId}/cancel`)
      .set('Authorization', `Bearer ${otherToken}`).send({ reason: 'Not mine' });
    expect(forbiddenCancel.status).toBe(404);

    const cancelled = await request(app).patch(`/api/v1/appointments/${appointmentId}/cancel`)
      .set('Authorization', `Bearer ${patientToken}`).send({ reason: 'Plans changed' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.appointment.status).toBe('cancelled');

    const rebooked = await request(app).post('/api/v1/appointments').set('Authorization', `Bearer ${otherToken}`).send(body);
    expect(rebooked.status).toBe(201);
  });

  test('expires pending reservations after 48 hours and releases the slot', async () => {
    const doctor = await createAccount({ role: 'doctor', email: 'doctor@example.test' });
    const patient = await createAccount({ role: 'patient', email: 'patient@example.test' });
    const token = await accessToken(patient.email);
    const created = await request(app).post('/api/v1/appointments').set('Authorization', `Bearer ${token}`).send({
      doctor: doctor._id.toString(), startAt: futureSlot().toISO(), appointmentType: 'online'
    });
    expect(created.status).toBe(201);

    const appointmentId = created.body.data.appointment._id;
    await mongoose.connection.collection('appointments').updateOne(
      { _id: new mongoose.Types.ObjectId(appointmentId) },
      { $set: { expiresAt: new Date(Date.now() - 1000) } }
    );
    expect(await appointmentService.expireDuePendingAppointments()).toBe(1);

    const appointment = await mongoose.connection.collection('appointments').findOne({ _id: new mongoose.Types.ObjectId(appointmentId) });
    expect(appointment.status).toBe('cancelled');
    expect(appointment.cancellationReason).toBe('Booking request expired');
  });
});