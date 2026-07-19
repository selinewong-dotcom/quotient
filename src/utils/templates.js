export const TEMPLATES = {
  work: [
    {
      id: 'work_sprint_velocity',
      type: 'rolling_average',
      title: 'Sprint Velocity',
      description: 'Track weekly story points completed to monitor team delivery speed.',
      windowDays: 7,
      unit: 'story points',
    },
    {
      id: 'work_q3_revenue',
      type: 'hard_target',
      title: 'Q3 Revenue Target',
      description: 'Monitor Q3 closed-won sales against the quota.',
      currentValue: 0,
      targetValue: 100000,
      unit: '$',
      deadline: new Date(new Date().getFullYear(), 8, 30).toISOString().split('T')[0], // Dynamic Sept 30 of current year
    },
    {
      id: 'work_v1_milestones',
      type: 'milestone',
      title: 'V1.0 Feature Roadmap',
      description: 'Key milestones required to ship the first version to production.',
      milestones: [
        { id: 'm1', label: 'Figma Designs Approved', completed: false },
        { id: 'm2', label: 'Database Schema Migrated', completed: false },
        { id: 'm3', label: 'Auth & Security Configured', completed: false },
        { id: 'm4', label: 'Stripe Payment Live', completed: false },
        { id: 'm5', label: 'Beta Testing Completed', completed: false },
      ],
    },
    {
      id: 'work_deep_work',
      type: 'habit',
      title: 'Focused Deep Work',
      description: 'Log a successful 4-hour block of uninterrupted coding each day.',
    },
    {
      id: 'work_code_reviews',
      type: 'rolling_average',
      title: 'PR Reviews Completed',
      description: 'Monitor daily code reviews to ensure team reviews are unblocked.',
      windowDays: 5,
      unit: 'PRs',
    },
    {
      id: 'work_sla_response',
      type: 'rolling_average',
      title: 'Client Response SLA',
      description: 'Maintain healthy customer ticket turnaround times.',
      windowDays: 7,
      unit: 'hours',
    }
  ],
  personal: [
    {
      id: 'personal_savings',
      type: 'hard_target',
      title: 'Emergency Fund',
      description: 'Build a safety net covering 6 months of necessary living expenses.',
      currentValue: 0,
      targetValue: 15000,
      unit: '$',
    },
    {
      id: 'personal_water',
      type: 'habit',
      title: 'Drink 3L Water',
      description: 'Daily hydration habit tracker.',
    },
    {
      id: 'personal_books',
      type: 'milestone',
      title: 'Personal Reading Checklist',
      description: 'Books to read this year for personal growth.',
      milestones: [
        { id: 'b1', label: 'Read: Atomic Habits', completed: false },
        { id: 'b2', label: 'Read: Clean Code', completed: false },
        { id: 'b3', label: 'Read: Thinking, Fast and Slow', completed: false },
        { id: 'b4', label: 'Read: Designing Data-Intensive Applications', completed: false },
      ],
    },
    {
      id: 'personal_gym',
      type: 'habit',
      title: 'Strength Training Workout',
      description: 'Resistance training at the gym (minimum 45 minutes).',
    },
    {
      id: 'personal_sleep',
      type: 'rolling_average',
      title: 'Sleep Duration',
      description: 'Track average nightly sleep hours over a 7-day rolling window.',
      windowDays: 7,
      unit: 'hours',
    },
    {
      id: 'personal_screen_time',
      type: 'rolling_average',
      title: 'Daily Screen Time',
      description: 'Monitor daily screen time (aiming for less than 2.5 hours).',
      windowDays: 7,
      unit: 'hours',
    }
  ],
  language: [
    {
      id: 'lang_immersion_hours',
      type: 'hard_target',
      title: 'Active Immersion Hours',
      description: 'Structured language study hours toward conversational fluency. Tracks time in target language environment or focused study sessions.',
      currentValue: 0,
      targetValue: 100,
      unit: 'hours',
      deadline: (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 3);
        return d.toISOString().split('T')[0];
      })(),
    },
    {
      id: 'lang_syllabus_roadmap',
      type: 'milestone',
      title: 'Core Syllabus / Textbook Roadmap',
      description: 'Structured progression through language course material. Track completion of textbook chapters, grammar units, or course modules.',
      milestones: [
        { id: 'lm1', label: 'Complete Unit 1: Phonetics & Alphabet', completed: false },
        { id: 'lm2', label: 'Finish Unit 2: Basic Greetings & Courtesies', completed: false },
        { id: 'lm3', label: 'Master Unit 3: Present Tense Conjugation', completed: false },
        { id: 'lm4', label: 'Complete Unit 4: Present Perfect & Past Tense', completed: false },
        { id: 'lm5', label: 'Pass Unit 5 Proficiency Checkpoint', completed: false },
      ],
    },
    {
      id: 'lang_vocab_cards',
      type: 'rolling_average',
      title: 'Daily Vocabulary Cards Cleared',
      description: 'Rolling 7-day average of vocabulary cards studied or flashcards completed. Measure cumulative learning velocity.',
      windowDays: 7,
      unit: 'cards',
    },
    {
      id: 'lang_media_intake',
      type: 'habit',
      title: 'Daily Target-Language Media Intake',
      description: 'Daily engagement with native media: podcasts, films, news, or conversational practice. Binary yes/no check-in.',
    }
  ]
}
