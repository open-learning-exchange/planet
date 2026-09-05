// Each activity database stamps its timestamp into a differently named field, so every report query,
// filter and sort has to name one. These constants keep that choice in one place instead of spreading
// the raw strings through the reports code.
export const ACTIVITY_DATE_FIELDS = {
  login: 'loginTime',
  logout: 'logoutTime',
  activity: 'time',
  chat: 'createdDate',
  health: 'date'
} as const;

export type ActivityDateField = typeof ACTIVITY_DATE_FIELDS[keyof typeof ACTIVITY_DATE_FIELDS];

// Fields a report's rows can be sorted by as dates rather than as text
export const DATE_SORT_FIELDS: ActivityDateField[] = [
  ACTIVITY_DATE_FIELDS.login, ACTIVITY_DATE_FIELDS.logout, ACTIVITY_DATE_FIELDS.activity
];

const REPORT_DATE_FIELDS: { [reportType: string]: ActivityDateField } = {
  logins: ACTIVITY_DATE_FIELDS.login,
  health: ACTIVITY_DATE_FIELDS.health,
  chat: ACTIVITY_DATE_FIELDS.chat
};

const DB_DATE_FIELDS: { [db: string]: ActivityDateField } = {
  login_activities: ACTIVITY_DATE_FIELDS.login
};

// Reports that are not listed carry the standard activity timestamp
export const dateFieldForReport = (reportType: string): ActivityDateField =>
  REPORT_DATE_FIELDS[reportType] || ACTIVITY_DATE_FIELDS.activity;

export const dateFieldForDb = (db: string): ActivityDateField =>
  DB_DATE_FIELDS[db] || ACTIVITY_DATE_FIELDS.activity;
