import { ACTIVITY_DATE_FIELDS, dateFieldForDb, dateFieldForReport } from './reports.constants';

describe('reports date fields', () => {
  it('names the field each report stamps its date into', () => {
    expect(dateFieldForReport('logins')).toBe(ACTIVITY_DATE_FIELDS.login);
    expect(dateFieldForReport('health')).toBe(ACTIVITY_DATE_FIELDS.health);
    expect(dateFieldForReport('chat')).toBe(ACTIVITY_DATE_FIELDS.chat);
  });

  it('falls back to the standard activity timestamp for every other report', () => {
    expect(dateFieldForReport('resourceViews')).toBe(ACTIVITY_DATE_FIELDS.activity);
    expect(dateFieldForReport('courseViews')).toBe(ACTIVITY_DATE_FIELDS.activity);
    expect(dateFieldForReport('stepCompletions')).toBe(ACTIVITY_DATE_FIELDS.activity);
  });

  it('names the field each activity database stamps its date into', () => {
    expect(dateFieldForDb('login_activities')).toBe(ACTIVITY_DATE_FIELDS.login);
    expect(dateFieldForDb('resource_activities')).toBe(ACTIVITY_DATE_FIELDS.activity);
    expect(dateFieldForDb('course_activities')).toBe(ACTIVITY_DATE_FIELDS.activity);
  });
});
