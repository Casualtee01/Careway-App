import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { availabilityService } from '../../services/availabilityService';
import { getErrorMessage } from '../../services/api';

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const initialAvailability = { weeklySchedule: [], unavailableDates: [], exceptions: [], appointmentDurationMinutes: 30 };

export default function AvailabilityPage() {
  const [availability, setAvailability] = useState(initialAvailability);
  const [timezone, setTimezone] = useState('UTC');
  const [unavailableInput, setUnavailableInput] = useState('');
  const [exceptionDate, setExceptionDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    availabilityService.getMine()
      .then((result) => { setAvailability({ ...initialAvailability, ...result.availability }); setTimezone(result.timezone || 'UTC'); })
      .catch((error) => toast.error(getErrorMessage(error)))
      .finally(() => setLoading(false));
  }, []);

  function updateWeek(dayOfWeek, updates) {
    setAvailability((current) => ({
      ...current,
      weeklySchedule: current.weeklySchedule.map((entry) => entry.dayOfWeek === dayOfWeek ? { ...entry, ...updates } : entry)
    }));
  }

  function toggleDay(dayOfWeek) {
    setAvailability((current) => {
      const active = current.weeklySchedule.some((entry) => entry.dayOfWeek === dayOfWeek);
      const weeklySchedule = active
        ? current.weeklySchedule.filter((entry) => entry.dayOfWeek !== dayOfWeek)
        : [...current.weeklySchedule, { dayOfWeek, startTime: '09:00', endTime: '17:00', breaks: [] }].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
      return { ...current, weeklySchedule };
    });
  }

  function toggleBreak(dayOfWeek, enabled) {
    updateWeek(dayOfWeek, { breaks: enabled ? [{ startTime: '12:00', endTime: '13:00' }] : [] });
  }

  function updateBreak(dayOfWeek, field, value) {
    const entry = availability.weeklySchedule.find((item) => item.dayOfWeek === dayOfWeek);
    const currentBreak = entry?.breaks?.[0] || { startTime: '12:00', endTime: '13:00' };
    updateWeek(dayOfWeek, { breaks: [{ ...currentBreak, [field]: value }] });
  }

  function addUnavailableDate() {
    if (!unavailableInput || availability.unavailableDates.includes(unavailableInput)) return;
    setAvailability((current) => ({ ...current, unavailableDates: [...current.unavailableDates, unavailableInput].sort() }));
    setUnavailableInput('');
  }

  function addException() {
    if (!exceptionDate || availability.exceptions.some((item) => item.date === exceptionDate)) return;
    setAvailability((current) => ({
      ...current,
      exceptions: [...current.exceptions, { date: exceptionDate, isUnavailable: false, intervals: [{ startTime: '09:00', endTime: '12:00' }] }].sort((a, b) => a.date.localeCompare(b.date))
    }));
    setExceptionDate('');
  }

  function updateException(date, updates) {
    setAvailability((current) => ({ ...current, exceptions: current.exceptions.map((item) => item.date === date ? { ...item, ...updates } : item) }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await availabilityService.update({ ...availability, timezone });
      setAvailability({ ...initialAvailability, ...result.availability });
      toast.success('Availability saved.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return <section className="dashboard-content">
    <div className="page-title"><div><p className="eyebrow">SCHEDULE SETTINGS</p><h1>Manage availability</h1><p className="muted">Slots are generated from these working hours, breaks, and date overrides.</p></div></div>
    {loading ? <div className="skeleton table-skeleton" /> : <form className="panel-section availability-form" onSubmit={save}>
      <div className="field-row"><label>Timezone<input required value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="America/New_York" /></label><label>Appointment duration<select value={availability.appointmentDurationMinutes} onChange={(event) => setAvailability({ ...availability, appointmentDurationMinutes: Number(event.target.value) })}>{[10, 15, 20, 30, 45, 60, 90, 120, 240].map((value) => <option value={value} key={value}>{value} minutes</option>)}</select></label></div>
      <h2>Weekly schedule</h2><p className="muted">Enable each working day, set hours, and add an optional break.</p>
      <div className="schedule-list">{weekdays.map((day, dayOfWeek) => {
        const entry = availability.weeklySchedule.find((item) => item.dayOfWeek === dayOfWeek);
        const pause = entry?.breaks?.[0];
        return <div className={`schedule-row ${entry ? 'schedule-active' : ''}`} key={day}>
          <label className="day-toggle"><input type="checkbox" checked={Boolean(entry)} onChange={() => toggleDay(dayOfWeek)} /><span>{day}</span></label>
          {entry ? <><input aria-label={`${day} start time`} type="time" required value={entry.startTime} onChange={(event) => updateWeek(dayOfWeek, { startTime: event.target.value })} /><span>to</span><input aria-label={`${day} end time`} type="time" required value={entry.endTime} onChange={(event) => updateWeek(dayOfWeek, { endTime: event.target.value })} /><button type="button" className="button button-small" onClick={() => toggleBreak(dayOfWeek, !pause)}>{pause ? 'Remove break' : 'Add break'}</button>{pause && <div className="break-row"><span>Break</span><input aria-label={`${day} break start`} type="time" value={pause.startTime} onChange={(event) => updateBreak(dayOfWeek, 'startTime', event.target.value)} /><span>to</span><input aria-label={`${day} break end`} type="time" value={pause.endTime} onChange={(event) => updateBreak(dayOfWeek, 'endTime', event.target.value)} /></div>}</> : <span className="muted day-off">Unavailable</span>}
        </div>;
      })}</div>
      <section className="availability-block"><h2>Unavailable dates</h2><p className="muted">Block a full date, regardless of your weekly hours.</p><div className="inline-create"><input aria-label="Unavailable date" type="date" value={unavailableInput} onChange={(event) => setUnavailableInput(event.target.value)} /><button type="button" className="button button-outline" onClick={addUnavailableDate}><Plus size={15} />Add date</button></div>{availability.unavailableDates.length > 0 && <ul className="date-chips">{availability.unavailableDates.map((date) => <li key={date}>{date}<button type="button" aria-label={`Remove unavailable date ${date}`} onClick={() => setAvailability({ ...availability, unavailableDates: availability.unavailableDates.filter((item) => item !== date) })}><Trash2 size={14} /></button></li>)}</ul>}</section>
      <section className="availability-block"><h2>Date-specific overrides</h2><p className="muted">Replace weekly hours for one date, or mark that date unavailable.</p><div className="inline-create"><input aria-label="Override date" type="date" value={exceptionDate} onChange={(event) => setExceptionDate(event.target.value)} /><button type="button" className="button button-outline" onClick={addException}><Plus size={15} />Add override</button></div>{availability.exceptions.map((item) => <div className="exception-row" key={item.date}><strong>{item.date}</strong><label className="day-toggle"><input type="checkbox" checked={item.isUnavailable} onChange={(event) => updateException(item.date, { isUnavailable: event.target.checked })} /><span>Unavailable</span></label>{!item.isUnavailable && item.intervals.map((interval, index) => <div className="exception-interval" key={`${item.date}-${index}`}><input aria-label={`${item.date} start time`} type="time" value={interval.startTime} onChange={(event) => updateException(item.date, { intervals: item.intervals.map((value, row) => row === index ? { ...value, startTime: event.target.value } : value) })} /><span>to</span><input aria-label={`${item.date} end time`} type="time" value={interval.endTime} onChange={(event) => updateException(item.date, { intervals: item.intervals.map((value, row) => row === index ? { ...value, endTime: event.target.value } : value) })} /></div>)}<button type="button" className="icon-action action-cancel" aria-label={`Remove override for ${item.date}`} onClick={() => setAvailability({ ...availability, exceptions: availability.exceptions.filter((entry) => entry.date !== item.date) })}>×</button></div>)}</section>
      <button className="button button-primary" disabled={saving}><Save size={16} />{saving ? 'Saving…' : 'Save availability'}</button>
    </form>}
  </section>;
}
