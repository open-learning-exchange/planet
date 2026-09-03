export const educationLevel = [
  { label: $localize`Beginner`, value: 'Beginner' },
  { label: $localize`Intermediate`, value: 'Intermediate' },
  { label: $localize`Advanced`, value: 'Advanced' },
  { label: $localize`Expert`, value: 'Expert' }
];

// Fields from the user doc which admins can optionally show as extra columns in the members table.
// Only general profile information, never credentials.  The matching column definitions live in
// users-table.component.html and the selection is stored on the local configuration doc.
export const optionalUserColumns = [
  { label: $localize`Email`, value: 'email' },
  { label: $localize`Phone Number`, value: 'phoneNumber' },
  { label: $localize`Birthdate`, value: 'birthDate' },
  { label: $localize`Gender`, value: 'gender' },
  { label: $localize`Education Level`, value: 'level' },
  { label: $localize`Language`, value: 'language' }
];
