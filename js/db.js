// Supabase Database Layer for Fitness Tracker

const SUPABASE_URL = 'https://ayygpszzipyqkcbtxvzr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5eWdwc3p6aXB5cWtjYnR4dnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjIwNDIsImV4cCI6MjA5MDM5ODA0Mn0.8audcbIj2u07sJe5Cwu8H6pioQRJZkY0oBrGdTF5Cfo';

// Currently logged-in user session token
let currentSession = null;

// Get the auth token to use for requests
function getAuthToken() {
  return currentSession ? currentSession.access_token : SUPABASE_ANON_KEY;
}

// Sign up with email and password
async function signUp(email, password) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.msg || 'Sign up failed');
  if (data.session) currentSession = data.session;
  return data;
}

// Sign in with email and password
async function signIn(email, password) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.msg || 'Sign in failed');
  currentSession = data;
  localStorage.setItem('fitness_session', JSON.stringify(data));
  return data;
}

// Sign out
function signOut() {
  currentSession = null;
  localStorage.removeItem('fitness_session');
}

// Refresh the access token using the refresh token
async function refreshSession() {
  if (!currentSession || !currentSession.refresh_token) return false;
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: currentSession.refresh_token })
    });
    if (!response.ok) return false;
    const data = await response.json();
    currentSession = data;
    localStorage.setItem('fitness_session', JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

// Restore session from localStorage on page load
function restoreSession() {
  const saved = localStorage.getItem('fitness_session');
  if (saved) {
    currentSession = JSON.parse(saved);
  }
  return currentSession;
}

// Get current user ID
function getCurrentUserId() {
  return currentSession ? currentSession.user.id : null;
}

// Helper function for Supabase API calls
async function supabaseRequest(endpoint, options = {}, isRetry = false) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${getAuthToken()}`,
    'Content-Type': 'application/json',
    'Prefer': options.prefer || 'return=representation'
  };

  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers }
  });

  if (response.status === 401 && !isRetry) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return supabaseRequest(endpoint, options, true);
    } else {
      signOut();
      window.location.reload();
      return;
    }
  }

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
    user_id: getCurrentUserId(),
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
  const userId = getCurrentUserId();
  const result = await supabaseRequest(`exercises?user_id=eq.${userId}&date=eq.${date}&order=timestamp.desc`);
  return result.map(transformExercise);
}

// Get all exercises
async function getAllExercises() {
  const userId = getCurrentUserId();
  const result = await supabaseRequest(`exercises?user_id=eq.${userId}&order=timestamp.desc`);
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
  const userId = getCurrentUserId();
  const result = await supabaseRequest(
    `exercises?name=eq.${encodeURIComponent(name)}&user_id=eq.${userId}&order=timestamp.desc&limit=1`
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
  getLastExerciseByName,
  signUp,
  signIn,
  signOut,
  restoreSession,
  getCurrentUserId
};
