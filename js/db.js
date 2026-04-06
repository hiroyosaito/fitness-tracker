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

// Sign in with Google (OAuth redirect)
function signInWithGoogle() {
  const redirectTo = window.location.origin + window.location.pathname;
  window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
}

// Handle OAuth callback — call on page load to detect redirect-back from Google
async function handleOAuthCallback() {
  const hash = window.location.hash.substring(1);
  if (!hash) return false;
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  if (!accessToken) return false;

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${accessToken}` }
    });
    if (!response.ok) return false;
    const user = await response.json();
    currentSession = {
      access_token: accessToken,
      refresh_token: params.get('refresh_token'),
      expires_in: parseInt(params.get('expires_in') || '3600'),
      token_type: 'bearer',
      user
    };
    localStorage.setItem('fitness_session', JSON.stringify(currentSession));
    history.replaceState(null, '', window.location.pathname);
    return true;
  } catch {
    return false;
  }
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
    timestamp: Date.now()
  };

  const result = await supabaseRequest('exercises', {
    method: 'POST',
    body: JSON.stringify(entry)
  });

  return result[0];
}

const EXERCISE_COLUMNS = 'id,date,type,name,weight,reps,sets,duration,distance,notes,muscles,timestamp';

// Get all exercises for a specific date
async function getExercisesByDate(date) {
  const userId = getCurrentUserId();
  const result = await supabaseRequest(`exercises?user_id=eq.${userId}&date=eq.${date}&select=${EXERCISE_COLUMNS}&order=timestamp.desc`);
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

// Get unique strength exercise names for autocomplete
async function getExerciseNamesForAutocomplete() {
  const userId = getCurrentUserId();
  const result = await supabaseRequest(
    `exercises?user_id=eq.${userId}&type=eq.strength&select=name&order=name.asc`
  );
  return [...new Set(result.map(r => r.name))];
}

// Get exercises for reports - excludes image data, supports optional date filter
const REPORT_COLUMNS = 'id,date,type,name,weight,reps,sets,duration,distance,muscles,timestamp';
async function getExercisesForReports(startDate = null) {
  const userId = getCurrentUserId();
  let query = `exercises?user_id=eq.${userId}&select=${REPORT_COLUMNS}&order=timestamp.desc`;
  if (startDate) {
    query += `&date=gte.${startDate}`;
  }
  const result = await supabaseRequest(query);
  return result.map(transformExercise);
}

// Get exercise history by name for progress chart
async function getExerciseHistoryByName(name) {
  const userId = getCurrentUserId();
  const result = await supabaseRequest(
    `exercises?user_id=eq.${userId}&name=eq.${encodeURIComponent(name)}&select=id,date,weight,reps,sets,type,name&order=date.asc`
  );
  return result.map(transformExercise);
}

// Get exercise date counts for database check (lightweight)
async function getExerciseDateCounts() {
  const userId = getCurrentUserId();
  const result = await supabaseRequest(
    `exercises?user_id=eq.${userId}&select=id,date&order=date.desc`
  );
  return result;
}

// Stat queries — each fetches only the columns it needs

async function statWorkoutDays(startDate) {
  const userId = getCurrentUserId();
  const result = await supabaseRequest(`exercises?user_id=eq.${userId}&date=gte.${startDate}&select=date`);
  return [...new Set(result.map(r => r.date))].length;
}

async function statStrengthDays(startDate) {
  const userId = getCurrentUserId();
  const result = await supabaseRequest(`exercises?user_id=eq.${userId}&type=eq.strength&date=gte.${startDate}&select=date`);
  return [...new Set(result.map(r => r.date))].length;
}

async function statCardioMinutes(startDate) {
  const userId = getCurrentUserId();
  const result = await supabaseRequest(`exercises?user_id=eq.${userId}&type=eq.cardio&date=gte.${startDate}&select=duration`);
  return result.reduce((sum, r) => sum + (r.duration || 0), 0);
}

async function statBikeRides(startDate) {
  const userId = getCurrentUserId();
  return await supabaseRequest(`exercises?user_id=eq.${userId}&name=eq.biking&date=gte.${startDate}&select=distance,notes`);
}

async function statClasses(startDate) {
  const userId = getCurrentUserId();
  const result = await supabaseRequest(`exercises?user_id=eq.${userId}&type=eq.class&date=gte.${startDate}&select=name`);
  return result.length;
}

// Get unique companion names from biking/walking/running cardio entries
async function getCardioCompanionNames() {
  const userId = getCurrentUserId();
  const result = await supabaseRequest(
    `exercises?user_id=eq.${userId}&type=eq.cardio&name=in.(biking,walking,running)&select=name,notes`
  );
  const names = new Set();
  result.forEach(r => {
    if (!r.notes) return;
    const parts = r.notes.split(' · ');
    const companionLabel = r.name === 'biking' ? parts[2] : parts[0];
    if (!companionLabel || !companionLabel.startsWith('With ')) return;
    const name = companionLabel.slice(5).trim();
    if (name && name !== 'Friend' && name !== 'Family') names.add(name);
  });
  return [...names].sort();
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
  getExerciseNamesForAutocomplete,
  getExercisesForReports,
  getExerciseHistoryByName,
  getExerciseDateCounts,
  statWorkoutDays,
  statStrengthDays,
  statCardioMinutes,
  statBikeRides,
  statClasses,
  getCardioCompanionNames,
  getLastExerciseByName,
  signUp,
  signIn,
  signOut,
  signInWithGoogle,
  handleOAuthCallback,
  restoreSession,
  getCurrentUserId
};
