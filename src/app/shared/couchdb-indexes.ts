export const REQUIRED_INDEXES = [
  // courses
  { db: 'courses', index: { index: { fields: [{ courseTitle: 'asc' }] }, name: 'title-index' } },
  { db: 'courses', index: { index: { fields: [{ creator: 'asc' }] }, name: 'creator-index' } },
  // resources
  { db: 'resources', index: { index: { fields: [{ createdDate: 'desc' }] }, name: 'date-index' } },
  { db: 'resources', index: { index: { fields: [{ author: 'asc' }] }, name: 'author-index' } },
  // courses_progress
  { db: 'courses_progress', index: { index: { fields: [{ userId: 'asc' }] }, name: 'user-index' } },
  { db: 'courses_progress', index: { index: { fields: [{ courseId: 'asc' }] }, name: 'course-index' } },
  // notifications
  { db: 'notifications', index: { index: { fields: [{ status: 'asc' }] }, name: 'status-index' } },
  { db: 'notifications', index: { index: { fields: [{ type: 'asc' }] }, name: 'type-index' } },
  { db: 'notifications', index: { index: { fields: [{ link: 'asc' }] }, name: 'link-index' } },
  // submissions
  { db: 'submissions', index: { index: { fields: [{ parentId: 'asc' }] }, name: 'parent-index' } },
  { db: 'submissions', index: { index: { fields: [{ status: 'asc' }] }, name: 'status-index' } },
  // health
  { db: 'health', index: { index: { fields: [{ planetCode: 'asc' }] }, name: 'planet-index' } },
  // login_activities
  { db: 'login_activities', index: { index: { fields: [{ user: 'asc' }] }, name: 'user-index' } }
];
