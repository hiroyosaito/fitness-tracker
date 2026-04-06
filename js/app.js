// Fitness Tracker - Main Application Logic

(function() {
  'use strict';

  // DOM Elements
  const elements = {
    datePicker: null,
    exerciseForm: null,
    exerciseNameInput: null,
    suggestionsContainer: null,
    muscleGroupsContainer: null,
    muscleSelector: null,
    weightInput: null,
    repsInput: null,
    setsInput: null,
    allActivitiesList: null,
    tabs: null,
    notesInput: null,
    // Cardio elements
    cardioForm: null,
    cardioType: null,
    cardioDuration: null,
    cardioDistance: null,
    cardioNotes: null,
    cardioList: null,
    // Class elements
    classForm: null,
    className: null,
    classDuration: null,
    classNotes: null,
    classList: null,
    // Report elements
    progressExercise: null,
    progressChart: null
  };

  // State
  let currentDate = UI.getTodayDate();
  let selectedSuggestionIndex = 0;
  let suggestions = [];
  let cachedUserExerciseNames = [];
  let reportPeriod = 'week';
  let exerciseDropdownLoaded = false;

  // Handle login screen
  function setupAuth() {
    const loginScreen = document.getElementById('login-screen');
    const appDiv = document.getElementById('app');
    const loginForm = document.getElementById('login-form');
    const signupBtn = document.getElementById('signup-btn');
    const signoutBtn = document.getElementById('signout-btn');
    const loginError = document.getElementById('login-error');

    // Sign out (always set up, regardless of session state)
    signoutBtn.addEventListener('click', () => {
      FitnessDB.signOut();
      window.location.reload();
    });

    // Restore existing session
    const session = FitnessDB.restoreSession();
    if (session) {
      loginScreen.style.display = 'none';
      appDiv.style.display = 'block';
      return true;
    }

    // Sign in
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-email').value;
      const password = document.getElementById('auth-password').value;
      const signinBtn = document.getElementById('signin-btn');
      loginError.style.display = 'none';
      signinBtn.disabled = true;
      signinBtn.textContent = 'Signing in...';
      try {
        await FitnessDB.signIn(email, password);
        window.location.reload();
      } catch (err) {
        loginError.textContent = err.message;
        loginError.style.display = 'block';
        signinBtn.disabled = false;
        signinBtn.textContent = 'Sign In';
      }
    });

    // Sign up
    signupBtn.addEventListener('click', async () => {
      const email = document.getElementById('auth-email').value;
      const password = document.getElementById('auth-password').value;
      if (!email || !password) {
        loginError.textContent = 'Please enter email and password';
        loginError.style.display = 'block';
        return;
      }
      loginError.style.display = 'none';
      try {
        await FitnessDB.signUp(email, password);
        loginError.style.display = 'none';
        // If session was created immediately, proceed
        if (FitnessDB.getCurrentUserId()) {
          window.location.reload();
        } else {
          loginError.style.color = 'var(--success)';
          loginError.textContent = 'Account created! Please check your email to confirm, then sign in.';
          loginError.style.display = 'block';
        }
      } catch (err) {
        loginError.style.color = 'var(--accent)';
        loginError.textContent = err.message;
        loginError.style.display = 'block';
      }
    });

    return false;
  }

  // Initialize the app
  async function init() {
    // Cache DOM elements
    elements.datePicker = UI.$('workout-date');
    elements.exerciseForm = UI.$('add-exercise-form');
    elements.exerciseNameInput = UI.$('exercise-name');
    elements.suggestionsContainer = UI.$('exercise-suggestions');
    elements.muscleGroupsContainer = UI.$('muscle-groups');
    elements.muscleSelector = UI.$('muscle-selector');
    elements.weightInput = UI.$('weight');
    elements.repsInput = UI.$('reps');
    elements.setsInput = UI.$('sets');
    elements.allActivitiesList = UI.$('all-activities-list');
    elements.tabs = document.querySelectorAll('.tab');
    elements.notesInput = UI.$('exercise-notes');
    // Cardio elements
    elements.cardioForm = UI.$('add-cardio-form');
    elements.cardioType = UI.$('cardio-type');
    elements.bikeTypeGroup = UI.$('bike-type-group');
    elements.bikeType = UI.$('bike-type');
    elements.bikeExtraGroup = UI.$('bike-extra-group');
    elements.bikeDifficulty = UI.$('bike-difficulty');
    elements.bikeCompanion = UI.$('bike-companion');
    elements.cardioDuration = UI.$('cardio-duration');
    elements.cardioDistance = UI.$('cardio-distance');
    elements.cardioNotes = UI.$('cardio-notes');
    elements.cardioList = UI.$('cardio-list');
    // Class elements
    elements.classForm = UI.$('add-class-form');
    elements.className = UI.$('class-name');
    elements.classDuration = UI.$('class-duration');
    elements.classNotes = UI.$('class-notes');
    elements.classList = UI.$('class-list');
    // Report elements
    elements.weekWorkoutDays = UI.$('week-workout-days');
    elements.weekStrengthCount = UI.$('week-strength-count');
    elements.weekCardioMins = UI.$('week-cardio-mins');
    elements.weekClassCount = UI.$('week-class-count');
    elements.weekBikeMiles = UI.$('week-bike-miles');
    elements.progressExercise = UI.$('progress-exercise');
    elements.progressChart = UI.$('progress-chart');

    // Initialize database
    try {
      await FitnessDB.init();
      console.log('Database initialized');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      UI.showToast('Failed to initialize database', 'error');
      return;
    }

    // Set up event listeners
    setupEventListeners();

    // Set initial date
    elements.datePicker.value = currentDate;

    // Load today's data and autocomplete cache in parallel
    await Promise.all([loadAllData(), loadUserExerciseNames()]);
  }

  // Load and cache user exercise names
  async function loadUserExerciseNames() {
    try {
      const exercises = await FitnessDB.getExerciseNamesForAutocomplete();
      cachedUserExerciseNames = exercises;
    } catch (error) {
      console.error('Failed to load user exercise names:', error);
    }
  }

  // Set up all event listeners
  function setupEventListeners() {
    // Date picker change
    elements.datePicker.addEventListener('change', async (e) => {
      currentDate = e.target.value;
      await loadAllData();
    });

    // Form submission
    elements.exerciseForm.addEventListener('submit', handleFormSubmit);

    // Exercise name input for autocomplete
    elements.exerciseNameInput.addEventListener('input', handleExerciseInput);
    elements.exerciseNameInput.addEventListener('keydown', handleKeyboardNavigation);
    elements.exerciseNameInput.addEventListener('blur', async () => {
      // Delay hiding to allow click on suggestion
      setTimeout(() => {
        elements.suggestionsContainer.classList.remove('active');
      }, 200);

      // Auto-fill if exercise name matches a known exercise
      const name = elements.exerciseNameInput.value.trim();
      if (name && elements.weightInput.value === '0' && elements.repsInput.value === '10') {
        // Only auto-fill if fields haven't been manually changed
        try {
          const lastExercise = await FitnessDB.getLastExerciseByName(name);
          if (lastExercise) {
            elements.weightInput.value = lastExercise.weight || 0;
            elements.repsInput.value = lastExercise.reps || ExerciseDB.EXERCISES.find(e => e.name === name)?.defaultReps || 10;
            elements.setsInput.value = lastExercise.sets || 1;
            if (lastExercise.notes) {
              elements.notesInput.value = lastExercise.notes;
            }
          }
        } catch (error) {
          console.error('Failed to fetch last exercise:', error);
        }
      }
    });

    // Tab switching
    elements.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        if (tab.disabled) return;
        switchTab(tab.dataset.tab);
      });
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!elements.exerciseNameInput.contains(e.target) &&
          !elements.suggestionsContainer.contains(e.target)) {
        elements.suggestionsContainer.classList.remove('active');
      }
    });

    // Show/hide bike type selector
    elements.cardioType.addEventListener('change', () => {
      const isBiking = elements.cardioType.value === 'biking';
      elements.bikeTypeGroup.style.display = isBiking ? 'block' : 'none';
      elements.bikeExtraGroup.style.display = isBiking ? 'flex' : 'none';
    });

    // Cardio form submission
    elements.cardioForm.addEventListener('submit', handleCardioSubmit);

    // Class form submission
    elements.classForm.addEventListener('submit', handleClassSubmit);

    // Progress exercise selection
    elements.progressExercise.addEventListener('change', handleProgressExerciseChange);

    // Populate exercise dropdown lazily when user opens it
    elements.progressExercise.addEventListener('focus', () => {
      if (exerciseDropdownLoaded) return;
      exerciseDropdownLoaded = true;
      const uniqueNames = [...new Set(cachedUserExerciseNames)].sort();
      uniqueNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        elements.progressExercise.appendChild(option);
      });
    });

    // Period toggle buttons
    document.querySelectorAll('.period-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        reportPeriod = btn.dataset.period;
        // Collapse all open stats so user re-fetches with new period
        document.querySelectorAll('.stat-result').forEach(r => r.style.display = 'none');
        document.querySelectorAll('.stat-btn').forEach(b => b.classList.remove('open'));
      });
    });

    // Stat buttons
    UI.$('stat-workout-days').querySelector('.stat-btn').addEventListener('click', () => loadStat('stat-workout-days', async (d) => {
      const count = await FitnessDB.statWorkoutDays(d);
      return `<span class="stat-number">${count}</span><span style="color:var(--text-secondary);font-size:0.85rem">days with at least one activity</span>`;
    }));

    UI.$('stat-strength').querySelector('.stat-btn').addEventListener('click', () => loadStat('stat-strength', async (d) => {
      const count = await FitnessDB.statStrengthDays(d);
      return `<span class="stat-number">${count}</span><span style="color:var(--text-secondary);font-size:0.85rem">days with strength training</span>`;
    }));

    UI.$('stat-cardio').querySelector('.stat-btn').addEventListener('click', () => loadStat('stat-cardio', async (d) => {
      const mins = await FitnessDB.statCardioMinutes(d);
      const hrs = (mins / 60).toFixed(1);
      return `<span class="stat-number">${mins}</span><span style="color:var(--text-secondary);font-size:0.85rem">minutes &nbsp;·&nbsp; ${hrs} hours</span>`;
    }));

    UI.$('stat-bike').querySelector('.stat-btn').addEventListener('click', () => loadStat('stat-bike', async (d) => {
      const rides = await FitnessDB.statBikeRides(d);
      const total = rides.reduce((sum, r) => sum + (r.distance || 0), 0);
      const totalStr = total % 1 === 0 ? total : total.toFixed(1);

      const byType = {}, byCompanion = {};
      rides.forEach(r => {
        const parts = (r.notes || '').split(' · ');
        const bikeTypes = ['Road', 'Mountain', 'Gravel'];
        const type = bikeTypes.includes(parts[0]) ? parts[0] : 'Other';
        const companion = parts[2] || 'Unknown';
        const mi = r.distance || 0;
        byType[type] = (byType[type] || 0) + mi;
        byCompanion[companion] = (byCompanion[companion] || 0) + mi;
      });

      const fmt = n => n % 1 === 0 ? n : n.toFixed(1);
      const sectionLabel = t => `<div style="color:var(--text-secondary);font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;margin-top:12px;margin-bottom:2px">${t}</div>`;
      let html = `<span class="stat-number">${totalStr} mi</span><div class="stat-breakdown">`;
      html += sectionLabel('By bike type');
      Object.entries(byType).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => {
        html += `<div class="stat-row"><span>${k}</span><span class="stat-row-value">${fmt(v)} mi</span></div>`;
      });
      html += sectionLabel('By companion');
      Object.entries(byCompanion).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => {
        html += `<div class="stat-row"><span>${k}</span><span class="stat-row-value">${fmt(v)} mi</span></div>`;
      });
      html += `</div>`;
      return html;
    }));

    UI.$('stat-classes').querySelector('.stat-btn').addEventListener('click', () => loadStat('stat-classes', async (d) => {
      const count = await FitnessDB.statClasses(d);
      return `<span class="stat-number">${count}</span><span style="color:var(--text-secondary);font-size:0.85rem">classes attended</span>`;
    }));

    // Database check button
    UI.$('check-db-btn').addEventListener('click', checkDatabase);
  }

  // Handle cardio form submission
  async function handleCardioSubmit(e) {
    e.preventDefault();

    const type = elements.cardioType.value;
    const duration = parseInt(elements.cardioDuration.value) || 0;
    const distance = parseFloat(elements.cardioDistance.value) || 0;
    const userNotes = elements.cardioNotes.value.trim();

    if (!type) {
      UI.showToast('Please select an activity', 'error');
      return;
    }

    let noteParts = [];
    if (type === 'biking') {
      const bikeType = elements.bikeType.value;
      const difficulty = elements.bikeDifficulty.value;
      const companion = elements.bikeCompanion.value;
      const bikeTypeLabel = { road: 'Road', mt: 'Mountain', gravel: 'Gravel' }[bikeType] || bikeType;
      const difficultyLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
      const companionLabel = companion === 'alone' ? 'Alone' : companion === 'other' ? 'Other' : `With ${companion}`;
      noteParts.push(`${bikeTypeLabel} · ${difficultyLabel} · ${companionLabel}`);
    }
    if (userNotes) noteParts.push(userNotes);

    const cardio = {
      date: currentDate,
      type: 'cardio',
      name: type,
      duration,
      distance,
      notes: noteParts.length > 0 ? noteParts.join(' · ') : null
    };

    try {
      await FitnessDB.addExercise(cardio);
      UI.showToast('Cardio added!');
      elements.cardioForm.reset();
      elements.bikeTypeGroup.style.display = 'none';
      elements.bikeExtraGroup.style.display = 'none';
      elements.cardioDuration.value = '30';
      elements.cardioDistance.value = '0';
      await loadAllData();
    } catch (error) {
      console.error('Failed to add cardio:', error);
      UI.showToast('Failed to add cardio', 'error');
    }
  }

  // Handle class form submission
  async function handleClassSubmit(e) {
    e.preventDefault();

    const name = elements.className.value;
    const duration = parseInt(elements.classDuration.value) || 0;
    const notes = elements.classNotes.value.trim();

    if (!name) {
      UI.showToast('Please select a class', 'error');
      return;
    }

    const classEntry = {
      date: currentDate,
      type: 'class',
      name,
      duration,
      notes: notes || null
    };

    try {
      await FitnessDB.addExercise(classEntry);
      UI.showToast('Class added!');
      elements.classForm.reset();
      elements.classDuration.value = '60';
      await loadAllData();
    } catch (error) {
      console.error('Failed to add class:', error);
      UI.showToast('Failed to add class', 'error');
    }
  }

  // Handle exercise name input
  function handleExerciseInput(e) {
    const query = e.target.value.trim();
    const lowerQuery = query.toLowerCase();

    // Get user's exercises first (prioritized)
    let userStartsWith = [];
    let userContains = [];

    if (query.length >= 1) {
      cachedUserExerciseNames.forEach(name => {
        if (name.toLowerCase().startsWith(lowerQuery)) {
          userStartsWith.push({ name });
        } else if (name.toLowerCase().includes(lowerQuery)) {
          userContains.push({ name });
        }
      });
    }

    // Get predefined suggestions
    const predefinedSuggestions = ExerciseDB.search(query);

    // Combine: user exercises first, then predefined (deduplicated)
    const allUserExercises = [...userStartsWith, ...userContains];
    const seenNames = new Set(allUserExercises.map(ex => ex.name));

    predefinedSuggestions.forEach(ex => {
      if (!seenNames.has(ex.name)) {
        allUserExercises.push(ex);
        seenNames.add(ex.name);
      }
    });

    suggestions = allUserExercises.slice(0, 8);
    selectedSuggestionIndex = 0;

    UI.renderSuggestions(suggestions, elements.suggestionsContainer, selectExercise);
    UI.updateMuscleGroups(query, elements.muscleGroupsContainer);

    // Show muscle selector for custom exercises (not in predefined list)
    const isPredefined = ExerciseDB.getMuscleGroups(query).length > 0;
    elements.muscleSelector.style.display = (query.length > 0 && !isPredefined) ? 'block' : 'none';
  }

  // Handle keyboard navigation in suggestions
  function handleKeyboardNavigation(e) {
    const items = elements.suggestionsContainer.querySelectorAll('li');

    if (!items.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, items.length - 1);
        updateSelectedSuggestion(items);
        break;

      case 'ArrowUp':
        e.preventDefault();
        selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, 0);
        updateSelectedSuggestion(items);
        break;

      case 'Enter':
        if (elements.suggestionsContainer.classList.contains('active') && items[selectedSuggestionIndex]) {
          e.preventDefault();
          selectExercise(items[selectedSuggestionIndex].textContent);
        }
        break;

      case 'Escape':
        elements.suggestionsContainer.classList.remove('active');
        break;
    }
  }

  // Update selected suggestion highlight
  function updateSelectedSuggestion(items) {
    items.forEach((item, index) => {
      item.classList.toggle('selected', index === selectedSuggestionIndex);
    });
  }

  // Select an exercise from suggestions
  async function selectExercise(name) {
    elements.exerciseNameInput.value = name;
    elements.suggestionsContainer.classList.remove('active');
    UI.updateMuscleGroups(name, elements.muscleGroupsContainer);

    // Fetch last exercise data and auto-fill
    try {
      const lastExercise = await FitnessDB.getLastExerciseByName(name);
      const exerciseDefaults = ExerciseDB.EXERCISES.find(e => e.name === name);
      if (lastExercise) {
        // Auto-fill weight, reps, sets
        elements.weightInput.value = lastExercise.weight || 0;
        elements.repsInput.value = lastExercise.reps || exerciseDefaults?.defaultReps || 10;
        elements.setsInput.value = lastExercise.sets || 1;

        // Auto-fill notes
        if (lastExercise.notes) {
          elements.notesInput.value = lastExercise.notes;
        }
      } else if (exerciseDefaults?.defaultReps) {
        elements.repsInput.value = exerciseDefaults.defaultReps;
      }
    } catch (error) {
      console.error('Failed to fetch last exercise:', error);
    }

    elements.weightInput.focus();
  }

  // Handle form submission
  async function handleFormSubmit(e) {
    e.preventDefault();

    const name = elements.exerciseNameInput.value.trim();
    const weight = parseFloat(elements.weightInput.value) || 0;
    const reps = parseInt(elements.repsInput.value) || 0;
    const sets = parseInt(elements.setsInput.value) || 1;

    if (!name) {
      UI.showToast('Please enter an exercise name', 'error');
      return;
    }

    if (reps < 1) {
      UI.showToast('Please enter valid reps', 'error');
      return;
    }

    const notes = elements.notesInput.value.trim();

    // Get selected muscles for custom exercises
    let selectedMuscles = null;
    const isPredefined = ExerciseDB.getMuscleGroups(name).length > 0;
    if (!isPredefined) {
      const checkboxes = elements.muscleSelector.querySelectorAll('input[type="checkbox"]:checked');
      selectedMuscles = Array.from(checkboxes).map(cb => cb.value);
      if (selectedMuscles.length === 0) selectedMuscles = null;
    }

    const exercise = {
      date: currentDate,
      type: 'strength',
      name,
      weight,
      reps,
      sets,
      notes: notes || null,
      muscles: selectedMuscles
    };

    try {
      await FitnessDB.addExercise(exercise);
      UI.showToast('Exercise added!');
      resetForm();
      await loadAllData();
      await loadUserExerciseNames(); // Refresh cache
    } catch (error) {
      console.error('Failed to add exercise:', error);
      UI.showToast('Failed to add exercise', 'error');
    }
  }

  // Reset the form
  function resetForm() {
    elements.exerciseForm.reset();
    elements.weightInput.value = '0';
    elements.repsInput.value = '10';
    elements.setsInput.value = '1';
    elements.notesInput.value = '';
    elements.muscleGroupsContainer.innerHTML = '';
    elements.muscleSelector.style.display = 'none';
    elements.muscleSelector.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    elements.exerciseNameInput.focus();
  }

  // Load all data for current date (single fetch, then split by type)
  async function loadAllData() {
    const fetchingFor = currentDate;
    try {
      const allEntries = await FitnessDB.getExercisesByDate(fetchingFor);
      if (fetchingFor !== currentDate) return; // date changed while fetching, discard stale result
      UI.renderAllActivities(allEntries, elements.allActivitiesList, handleDeleteExercise, 'all-empty-state');
      UI.renderCardioList(allEntries.filter(e => e.type === 'cardio'), elements.cardioList, handleDeleteExercise, 'cardio-empty-state');
      UI.renderClassList(allEntries.filter(e => e.type === 'class'), elements.classList, handleDeleteExercise, 'class-empty-state');
    } catch (error) {
      console.error('Failed to load data:', error);
      UI.showToast('Load error: ' + error.message, 'error');
    }
  }

  // Check what's actually in Supabase
  async function checkDatabase() {
    const btn = UI.$('check-db-btn');
    const resultDiv = UI.$('db-check-result');
    btn.disabled = true;
    btn.textContent = 'Checking...';
    resultDiv.style.display = 'none';

    let html = '';

    // Test 1: getExerciseDateCounts
    try {
      const all = await FitnessDB.getExerciseDateCounts();

      if (all.length === 0) {
        html += '<p class="db-check-empty">No exercises found in Supabase for your account.</p>';
      } else {
        const byDate = all.reduce((acc, ex) => {
          acc[ex.date] = (acc[ex.date] || 0) + 1;
          return acc;
        }, {});
        const sortedDates = Object.keys(byDate).sort().reverse();

        let rows = sortedDates.map(date => {
          const count = byDate[date];
          return `<tr><td>${date}</td><td>${count} exercise${count !== 1 ? 's' : ''}</td></tr>`;
        }).join('');

        html += `
          <p class="db-check-total">${all.length} total exercise${all.length !== 1 ? 's' : ''} across ${sortedDates.length} day${sortedDates.length !== 1 ? 's' : ''}</p>
          <table class="db-check-table">
            <thead><tr><th>Date</th><th>Count</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>`;
      }
    } catch (err) {
      html += `<p class="db-check-error">getAllExercises error: ${err.message}</p>`;
    }

    // Test 2: getExercisesByDate for today
    html += `<p style="margin-top:12px; color:var(--text-secondary); font-size:0.8rem;">Date query test (currentDate = "${currentDate}"):</p>`;
    try {
      const todayEntries = await FitnessDB.getExercisesByDate(currentDate);
      if (todayEntries.length === 0) {
        html += `<p style="color:var(--text-secondary); font-size:0.85rem;">No exercises logged for ${currentDate} yet.</p>`;
      } else {
        html += `<p class="db-check-total">getExercisesByDate: ${todayEntries.length} exercise${todayEntries.length !== 1 ? 's' : ''} found for ${currentDate}</p>`;
      }
    } catch (err) {
      html += `<p class="db-check-error">getExercisesByDate error: ${err.message}</p>`;
    }

    resultDiv.innerHTML = html;
    resultDiv.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Check Database';
  }

  // Get start date string for current report period
  function getReportStartDate() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (reportPeriod === 'week') {
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      return start.toISOString().slice(0, 10);
    } else {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return start.toISOString().slice(0, 10);
    }
  }

  // Load a single stat on demand — toggles open/closed
  async function loadStat(cardId, fetchAndRender) {
    const card = UI.$(cardId);
    const btn = card.querySelector('.stat-btn');
    const result = card.querySelector('.stat-result');

    if (result.style.display === 'block') {
      result.style.display = 'none';
      btn.classList.remove('open');
      return;
    }

    const label = btn.textContent;
    btn.textContent = '...';
    btn.disabled = true;

    try {
      result.innerHTML = await fetchAndRender(getReportStartDate());
      result.style.display = 'block';
      btn.classList.add('open');
    } catch (err) {
      result.innerHTML = `<p style="color:var(--accent);font-size:0.85rem">${err.message}</p>`;
      result.style.display = 'block';
    }

    btn.textContent = label;
    btn.disabled = false;
  }

  // Handle progress exercise selection
  async function handleProgressExerciseChange(e) {
    const exerciseName = e.target.value;

    if (!exerciseName) {
      elements.progressChart.innerHTML = '<p class="empty-state">Select an exercise to see your progress</p>';
      return;
    }

    try {
      const exerciseHistory = await FitnessDB.getExerciseHistoryByName(exerciseName);

      if (exerciseHistory.length === 0) {
        elements.progressChart.innerHTML = '<p class="empty-state">No data for this exercise</p>';
        return;
      }

      // Group by date and take max weight for each date
      const byDate = {};
      exerciseHistory.forEach(ex => {
        if (!byDate[ex.date] || ex.weight > byDate[ex.date].weight) {
          byDate[ex.date] = ex;
        }
      });

      const dataPoints = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));

      // Render as simple list
      let listHTML = '<div class="progress-list">';
      dataPoints.forEach(point => {
        const dateLabel = new Date(point.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        listHTML += `<div class="progress-list-row"><span class="progress-list-date">${dateLabel}</span><span class="progress-list-weight">${point.weight} lbs</span></div>`;
      });
      listHTML += '</div>';
      elements.progressChart.innerHTML = listHTML;

    } catch (error) {
      console.error('Failed to load exercise progress:', error);
      elements.progressChart.innerHTML = '<p class="empty-state">Error loading data</p>';
    }
  }

  // Handle exercise deletion
  async function handleDeleteExercise(id) {
    if (!confirm('Delete this entry?')) return;

    try {
      await FitnessDB.deleteExercise(id);
      UI.showToast('Deleted');
      await loadAllData();
    } catch (error) {
      console.error('Failed to delete:', error);
      UI.showToast('Failed to delete', 'error');
    }
  }

  // Handle adding a set to an exercise
  async function handleAddSet(id, currentSets) {
    try {
      await FitnessDB.updateExercise(id, { sets: currentSets + 1 });
      UI.showToast('+1 Set');
      await loadAllData();
    } catch (error) {
      console.error('Failed to add set:', error);
      UI.showToast('Failed to add set', 'error');
    }
  }

  // Make handleAddSet globally accessible
  window.handleAddSet = handleAddSet;

  // Switch tabs
  function switchTab(tabName) {
    // Update tab buttons
    elements.tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update sections
    document.querySelectorAll('.section').forEach(section => {
      section.classList.toggle('active', section.id === `${tabName}-section`);
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const loggedIn = setupAuth();
      if (loggedIn) init();
    });
  } else {
    const loggedIn = setupAuth();
    if (loggedIn) init();
  }
})();
