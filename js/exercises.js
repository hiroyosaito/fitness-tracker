// Exercise Database with Muscle Group Mappings

const MUSCLE_GROUPS = {
  chest: { name: 'Chest', color: '#e74c3c' },
  back: { name: 'Back', color: '#3498db' },
  shoulders: { name: 'Shoulders', color: '#9b59b6' },
  biceps: { name: 'Biceps', color: '#e67e22' },
  triceps: { name: 'Triceps', color: '#f39c12' },
  forearms: { name: 'Forearms', color: '#d35400' },
  core: { name: 'Core', color: '#1abc9c' },
  quads: { name: 'Quads', color: '#2ecc71' },
  hamstrings: { name: 'Hamstrings', color: '#27ae60' },
  glutes: { name: 'Glutes', color: '#16a085' },
  calves: { name: 'Calves', color: '#2980b9' },
  traps: { name: 'Traps', color: '#8e44ad' }
};

const EXERCISES = [
  // Chest exercises
  { name: 'Bench Press', muscles: ['chest', 'triceps', 'shoulders'] },
  { name: 'Incline Bench Press', muscles: ['chest', 'shoulders', 'triceps'] },
  { name: 'Decline Bench Press', muscles: ['chest', 'triceps'] },
  { name: 'Dumbbell Bench Press', muscles: ['chest', 'triceps', 'shoulders'] },
  { name: 'Incline Dumbbell Press', muscles: ['chest', 'shoulders'] },
  { name: 'Chest Fly Machine', muscles: ['chest'] },
  { name: 'Dumbbell Fly', muscles: ['chest'] },
  { name: 'Cable Crossover', muscles: ['chest'] },
  { name: 'Push-Ups', muscles: ['chest', 'triceps', 'shoulders', 'core'] },
  { name: 'Chest Press Machine', muscles: ['chest', 'triceps'] },

  // Back exercises
  { name: 'Lat Pulldown', muscles: ['back', 'biceps'] },
  { name: 'Pull-Ups', muscles: ['back', 'biceps', 'core'] },
  { name: 'Chin-Ups', muscles: ['back', 'biceps'] },
  { name: 'Seated Row Machine', muscles: ['back', 'biceps'] },
  { name: 'Cable Row', muscles: ['back', 'biceps'] },
  { name: 'Bent Over Row', muscles: ['back', 'biceps'] },
  { name: 'Dumbbell Row', muscles: ['back', 'biceps'] },
  { name: 'T-Bar Row', muscles: ['back', 'biceps'] },
  { name: 'Deadlift', muscles: ['back', 'hamstrings', 'glutes', 'core'] },
  { name: 'Back Extension', muscles: ['back', 'glutes'] },
  { name: 'Prone Press Up', muscles: ['back'], defaultReps: 5 },

  // Shoulder exercises
  { name: 'Overhead Press', muscles: ['shoulders', 'triceps'] },
  { name: 'Dumbbell Shoulder Press', muscles: ['shoulders', 'triceps'] },
  { name: 'Military Press', muscles: ['shoulders', 'triceps'] },
  { name: 'Lateral Raise', muscles: ['shoulders'] },
  { name: 'Front Raise', muscles: ['shoulders'] },
  { name: 'Rear Delt Fly', muscles: ['shoulders', 'back'] },
  { name: 'Face Pull', muscles: ['shoulders', 'back', 'traps'] },
  { name: 'Shoulder Press Machine', muscles: ['shoulders', 'triceps'] },
  { name: 'Arnold Press', muscles: ['shoulders', 'triceps'] },
  { name: 'Upright Row', muscles: ['shoulders', 'traps'] },

  // Arm exercises - Biceps
  { name: 'Bicep Curl', muscles: ['biceps'] },
  { name: 'Dumbbell Curl', muscles: ['biceps'] },
  { name: 'Hammer Curl', muscles: ['biceps', 'forearms'] },
  { name: 'Preacher Curl', muscles: ['biceps'] },
  { name: 'Cable Curl', muscles: ['biceps'] },
  { name: 'Concentration Curl', muscles: ['biceps'] },
  { name: 'EZ Bar Curl', muscles: ['biceps'] },
  { name: 'Bicep Curl Machine', muscles: ['biceps'] },

  // Arm exercises - Triceps
  { name: 'Tricep Pushdown', muscles: ['triceps'] },
  { name: 'Tricep Dip', muscles: ['triceps', 'chest', 'shoulders'] },
  { name: 'Skull Crusher', muscles: ['triceps'] },
  { name: 'Overhead Tricep Extension', muscles: ['triceps'] },
  { name: 'Tricep Kickback', muscles: ['triceps'] },
  { name: 'Close Grip Bench Press', muscles: ['triceps', 'chest'] },
  { name: 'Tricep Machine', muscles: ['triceps'] },

  // Leg exercises - Quads
  { name: 'Squat', muscles: ['quads', 'glutes', 'hamstrings', 'core'] },
  { name: 'Leg Press', muscles: ['quads', 'glutes', 'hamstrings'] },
  { name: 'Leg Extension', muscles: ['quads'] },
  { name: 'Hack Squat', muscles: ['quads', 'glutes'] },
  { name: 'Front Squat', muscles: ['quads', 'core'] },
  { name: 'Goblet Squat', muscles: ['quads', 'glutes', 'core'] },
  { name: 'Lunges', muscles: ['quads', 'glutes', 'hamstrings'] },
  { name: 'Bulgarian Split Squat', muscles: ['quads', 'glutes'] },

  // Leg exercises - Hamstrings & Glutes
  { name: 'Romanian Deadlift', muscles: ['hamstrings', 'glutes', 'back'] },
  { name: 'Leg Curl', muscles: ['hamstrings'] },
  { name: 'Lying Leg Curl', muscles: ['hamstrings'] },
  { name: 'Seated Leg Curl', muscles: ['hamstrings'] },
  { name: 'Hip Thrust', muscles: ['glutes', 'hamstrings'] },
  { name: 'Glute Bridge', muscles: ['glutes', 'hamstrings'] },
  { name: 'Hip Abduction Machine', muscles: ['glutes'] },
  { name: 'Hip Adduction Machine', muscles: ['quads'] },
  { name: 'Good Morning', muscles: ['hamstrings', 'back', 'glutes'] },
  { name: 'Side Lying Leg Raise', muscles: ['glutes'] },
  { name: 'Single Leg Deadlift', muscles: ['hamstrings', 'glutes', 'back'] },

  // Leg exercises - Calves
  { name: 'Calf Raise', muscles: ['calves'] },
  { name: 'Seated Calf Raise', muscles: ['calves'] },
  { name: 'Standing Calf Raise', muscles: ['calves'] },
  { name: 'Leg Press Calf Raise', muscles: ['calves'] },

  // Core exercises
  { name: 'Plank', muscles: ['core'] },
  { name: 'Crunch', muscles: ['core'] },
  { name: 'Sit-Up', muscles: ['core'] },
  { name: 'Leg Raise', muscles: ['core'] },
  { name: 'Hanging Leg Raise', muscles: ['core'] },
  { name: 'Russian Twist', muscles: ['core'] },
  { name: 'Cable Crunch', muscles: ['core'] },
  { name: 'Ab Wheel Rollout', muscles: ['core'] },
  { name: 'Mountain Climbers', muscles: ['core', 'shoulders'] },
  { name: 'Dead Bug', muscles: ['core'] },
  { name: 'Bird Dog', muscles: ['core'] },

  // Compound/Full Body
  { name: 'Clean and Press', muscles: ['shoulders', 'back', 'quads', 'core'] },
  { name: 'Kettlebell Swing', muscles: ['glutes', 'hamstrings', 'core', 'shoulders'] },
  { name: 'Burpees', muscles: ['chest', 'core', 'quads', 'shoulders'] },
  { name: 'Farmers Walk', muscles: ['forearms', 'traps', 'core'] },
  { name: 'Shrugs', muscles: ['traps'] },
  { name: 'Dumbbell Shrugs', muscles: ['traps'] }
];

// Search exercises by name (case-insensitive)
function searchExercises(query) {
  if (!query || query.length < 1) return [];

  const lowerQuery = query.toLowerCase();

  // Prioritize exercises that START with the query
  const startsWith = EXERCISES.filter(exercise =>
    exercise.name.toLowerCase().startsWith(lowerQuery)
  );

  // Then add exercises that CONTAIN the query (but don't start with it)
  const contains = EXERCISES.filter(exercise =>
    !exercise.name.toLowerCase().startsWith(lowerQuery) &&
    exercise.name.toLowerCase().includes(lowerQuery)
  );

  return [...startsWith, ...contains].slice(0, 8);
}

// Get muscle groups for an exercise by name
function getMuscleGroups(exerciseName) {
  const exercise = EXERCISES.find(e =>
    e.name.toLowerCase() === exerciseName.toLowerCase()
  );

  if (!exercise) return [];

  return exercise.muscles.map(muscleKey => ({
    key: muscleKey,
    ...MUSCLE_GROUPS[muscleKey]
  }));
}

// Get all exercise names for autocomplete
function getAllExerciseNames() {
  return EXERCISES.map(e => e.name);
}

// Export
window.ExerciseDB = {
  MUSCLE_GROUPS,
  EXERCISES,
  search: searchExercises,
  getMuscleGroups,
  getAllNames: getAllExerciseNames
};
