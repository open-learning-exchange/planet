// Courses can only be managed locally, by an admin or by the user who created the course on this planet.
export const canManageCourse = (course: any, user: any, planetCode: string) =>
  user?.isUserAdmin === true || course?.creator === `${user?.name}@${planetCode}`;
