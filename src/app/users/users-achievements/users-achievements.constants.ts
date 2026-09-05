export type AchievementSection =
  'personalInfo' | 'purpose' | 'goals' | 'certifications' | 'achievements' | 'links' | 'references' | 'resume';

export type AchievementVisibility = { [section in AchievementSection]: boolean };

export const achievementSections: { key: AchievementSection, label: string }[] = [
  { key: 'personalInfo', label: $localize`Personal Details` },
  { key: 'purpose', label: $localize`My Purpose` },
  { key: 'goals', label: $localize`My Goals` },
  { key: 'certifications', label: $localize`My Certifications` },
  { key: 'achievements', label: $localize`My Achievements` },
  { key: 'links', label: $localize`My Links` },
  { key: 'references', label: $localize`My References` },
  { key: 'resume', label: $localize`CV/Resume` }
];

export const achievementSectionKeys: AchievementSection[] = achievementSections.map(({ key }) => key);

// Sections are shown unless the learner has explicitly hidden them, so achievements saved
// before this option existed keep showing everything.
export const achievementVisibility = (visibility: Partial<AchievementVisibility> = {}): AchievementVisibility =>
  achievementSectionKeys.reduce(
    (sections, key) => ({ ...sections, [key]: visibility?.[key] !== false }),
    {} as AchievementVisibility
  );
