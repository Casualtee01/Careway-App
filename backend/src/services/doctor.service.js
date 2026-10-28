const DoctorProfile = require('../models/DoctorProfile');
const Specialty = require('../models/Specialty');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { DateTime } = require('luxon');
const { listAvailableSlots } = require('./availability.service');

async function searchDoctors(query) {
  if (query.specialty && !(await Specialty.exists({ _id: query.specialty, isActive: true }))) {
    return { data: [], pagination: { page: Number(query.page) || 1, limit: Number(query.limit) || 20, total: 0, pages: 0 } };
  }
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  const profileFilter = { approvalStatus: 'approved' };
  if (query.specialty) profileFilter.specialty = query.specialty;
  if (query.minFee !== undefined || query.maxFee !== undefined) {
    profileFilter.consultationFee = {};
    if (query.minFee !== undefined) profileFilter.consultationFee.$gte = Number(query.minFee);
    if (query.maxFee !== undefined) profileFilter.consultationFee.$lte = Number(query.maxFee);
  }
  if (query.location) profileFilter.$or = [
    { clinicName: { $regex: escapeRegex(query.location), $options: 'i' } },
    { clinicAddress: { $regex: escapeRegex(query.location), $options: 'i' } }
  ];
  if (query.clinicName) profileFilter.clinicName = { $regex: escapeRegex(query.clinicName), $options: 'i' };

  const userFilter = { role: 'doctor', isActive: true };
  if (query.name) userFilter.name = { $regex: escapeRegex(query.name), $options: 'i' };
  profileFilter.user = { $in: await User.distinct('_id', userFilter) };
  if (query.minFee !== undefined && query.maxFee !== undefined && Number(query.minFee) > Number(query.maxFee)) {
    throw new ApiError(422, 'minFee cannot exceed maxFee');
  }

  const sortBy = { fee: { consultationFee: 1 }, experience: { experienceYears: -1 } }[query.sort] || { createdAt: -1 };
  let profiles;
  let total;
  if (query.availableDate) {
    if (!DateTime.fromISO(query.availableDate, { zone: 'UTC' }).isValid || !/^\d{4}-\d{2}-\d{2}$/.test(query.availableDate)) {
      throw new ApiError(400, 'availableDate must be a valid YYYY-MM-DD value');
    }
    const candidates = await DoctorProfile.find(profileFilter).sort(sortBy).limit(5000)
      .populate({ path: 'user', match: { isActive: true, role: 'doctor' }, select: 'name profileImage' })
      .populate('specialty', 'name');
    const available = await Promise.all(candidates.filter((profile) => profile.user).map(async (profile) => ({
      profile,
      slots: await listAvailableSlots(profile.user._id, query.availableDate)
    })));
    profiles = available.filter((entry) => entry.slots.length).map((entry) => entry.profile);
    total = profiles.length;
    profiles = profiles.slice((page - 1) * limit, page * limit);
  } else {
    [profiles, total] = await Promise.all([
      DoctorProfile.find(profileFilter).sort(sortBy).skip((page - 1) * limit).limit(limit)
        .populate({ path: 'user', match: { isActive: true, role: 'doctor' }, select: 'name profileImage' })
        .populate('specialty', 'name'),
      DoctorProfile.countDocuments(profileFilter)
    ]);
    profiles = profiles.filter((profile) => profile.user);
  }

  return { data: profiles, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

async function getPublicDoctor(doctorId) {
  const profile = await DoctorProfile.findOne({ user: doctorId, approvalStatus: 'approved' })
    .populate({ path: 'user', match: { isActive: true, role: 'doctor' }, select: 'name profileImage' })
    .populate('specialty', 'name');
  if (!profile?.user) throw new ApiError(404, 'Doctor not found');
  return profile;
}

async function getDoctorProfile(doctorId) {
  const profile = await DoctorProfile.findOne({ user: doctorId }).populate('specialty', 'name');
  if (!profile) throw new ApiError(404, 'Doctor profile not found');
  return profile;
}

async function updateDoctorProfile(doctorId, input) {
  const profile = await DoctorProfile.findOne({ user: doctorId });
  if (!profile) throw new ApiError(404, 'Doctor profile not found');
  if (input.timezone && !DateTime.now().setZone(input.timezone).isValid) throw new ApiError(422, 'Timezone must be a valid IANA timezone');
  if (input.specialty && !(await Specialty.exists({ _id: input.specialty, isActive: true }))) throw new ApiError(400, 'Selected specialty is unavailable');

  const allowed = ['specialty', 'qualifications', 'experienceYears', 'bio', 'clinicName', 'clinicAddress', 'consultationFee', 'timezone'];
  for (const field of allowed) if (Object.hasOwn(input, field)) profile[field] = input[field];
  await profile.save();
  return profile;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { searchDoctors, getPublicDoctor, getDoctorProfile, updateDoctorProfile };