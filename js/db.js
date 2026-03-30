// Supabase Database Layer for Fitness Tracker

const SUPABASE_URL = 'https://ayygpszzipyqkcbtxvzr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5eWdwc3p6aXB5cWtjYnR4dnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjIwNDIsImV4cCI6MjA5MDM5ODA0Mn0.8audcbIj2u07sJe5Cwu8H6pioQRJZkY0oBrGdTF5Cfo';

// Helper function for Supabase API calls
async function supabaseRequest(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': options.prefer || 'return=representation'
  };

  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase error: ${error}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

// Initialize (no-op for Supabase, but kept for compatibility)
function initDB() {
  return Promise.resolve();
}

// Add a new exercise entry
async function addExercise(exercise) {
  const entry = {
    date: exercise.date,
    type: exercise.type,
    name: exercise.name,
    weight: exercise.weight || null,
    reps: exercise.reps || null,
    sets: exercise.sets || null,
    duration: exercise.duration || null,
    distance: exercise.distance || null,
    notes: exercise.notes || null,
    muscles: exercise.muscles ? JSON.stringify(exercise.muscles) : null,
    image_url: null,
    timestamp: Date.now()
  };

  // Handle multiple images
  if (exercise.images && exercise.images.length > 0) {
    const base64Images = [];
    for (const img of exercise.images) {
      if (img instanceof Blob) {
        const base64 = await blobToBase64(img);
        base64Images.push(base64);
      } else if (typeof img === 'string') {
        base64Images.push(img);
      }
    }
    entry.image_url = JSON.stringify(base64Images);
  }

  const result = await supabaseRequest('exercises', {
    method: 'POST',
    body: JSON.stringify(entry)
  });

  return result[0];
}

// Convert Blob to base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Get all exercises for a specific date
async function getExercisesByDate(date) {
  const result = await supabaseRequest(`exercises?date=eq.${date}&order=timestamp.desc`);
  return result.map(transformExercise);
}

// Get all exercises
async function getAllExercises() {
  const result = await supabaseRequest('exercises?order=timestamp.desc');
  return result.map(transformExercise);
}

// Transform exercise from DB format
function transformExercise(exercise) {
  let images = null;
  if (exercise.image_url) {
    try {
      images = JSON.parse(exercise.image_url);
    } catch {
      // If not JSON, treat as single image
      images = [exercise.image_url];
    }
  }

  let muscles = null;
  if (exercise.muscles) {
    try {
      muscles = JSON.parse(exercise.muscles);
    } catch {
      muscles = null;
    }
  }

  return {
    ...exercise,
    images: images,
    muscles: muscles
  };
}

// Update an exercise entry
async function updateExercise(id, updates) {
  const result = await supabaseRequest(`exercises?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
  return result[0];
}

// Delete an exercise entry
async function deleteExercise(id) {
  await supabaseRequest(`exercises?id=eq.${id}`, {
    method: 'DELETE',
    prefer: 'return=minimal'
  });
}

// Get exercises grouped by date (for history view)
async function getExercisesGroupedByDate() {
  const exercises = await getAllExercises();
  const grouped = exercises.reduce((acc, exercise) => {
    const date = exercise.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(exercise);
    return acc;
  }, {});

  return grouped;
}

// Get the most recent entry for a specific exercise name
async function getLastExerciseByName(name) {
  const result = await supabaseRequest(
    `exercises?name=eq.${encodeURIComponent(name)}&order=timestamp.desc&limit=1`
  );

  if (result.length === 0) return null;
  return transformExercise(result[0]);
}

// Export functions
window.FitnessDB = {
  init: initDB,
  addExercise,
  getExercisesByDate,
  getAllExercises,
  updateExercise,
  deleteExercise,
  getExercisesGroupedByDate,
  getLastExerciseByName
};
