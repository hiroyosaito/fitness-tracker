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
    setsContainer: null,
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

  // Predefined class suggestions
  const PREDEFINED_CLASSES = [
    'Aqua Zumba', 'Gentle Yoga', 'Line Dance', 'Tai Chi', 'Vinyasa Yoga', 'Zumba'
  ];

  // State
  let currentDate = UI.getTodayDate();
  let selectedSuggestionIndex = 0;
  let suggestions = [];
  let cachedUserExerciseNames = [];
  let cachedClassNames = [...PREDEFINED_CLASSES];
  let cachedCustomCardioNames = [];
  let reportPeriod = 'week';
  let exerciseDropdownLoaded = false;
  let historyLoaded = false;
  let goalsLoaded = false;

  // Handle login screen
  async function setupAuth() {
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

    // Handle password recovery redirect
    const recoveryToken = FitnessDB.getRecoveryToken();
    if (recoveryToken) {
      history.replaceState(null, '', window.location.pathname);
      UI.$('login-form').style.display = 'none';
      document.querySelector('.login-divider').style.display = 'none';
      document.getElementById('google-btn').style.display = 'none';
      UI.$('set-password-section').style.display = 'block';

      UI.$('save-password-btn').addEventListener('click', async () => {
        const newPassword = UI.$('new-password').value;
        const msg = UI.$('set-password-message');
        if (!newPassword || newPassword.length < 6) {
          msg.textContent = 'Password must be at least 6 characters.';
          msg.style.color = 'var(--accent)';
          msg.style.display = 'block';
          return;
        }
        const btn = UI.$('save-password-btn');
        btn.disabled = true;
        btn.textContent = 'Saving...';
        try {
          await FitnessDB.updatePassword(newPassword, recoveryToken);
          msg.textContent = 'Password updated! Redirecting to sign in...';
          msg.style.color = 'var(--success)';
          msg.style.display = 'block';
          setTimeout(() => {
            UI.$('set-password-section').style.display = 'none';
            UI.$('login-form').style.display = 'block';
            document.querySelector('.login-divider').style.display = '';
            document.getElementById('google-btn').style.display = 'block';
          }, 2000);
        } catch (err) {
          msg.textContent = err.message;
          msg.style.color = 'var(--accent)';
          msg.style.display = 'block';
          btn.disabled = false;
          btn.textContent = 'Save Password';
        }
      });

      return false;
    }

    // Handle OAuth redirect-back (Google)
    const oauthHandled = await FitnessDB.handleOAuthCallback();
    if (oauthHandled) {
      loginScreen.style.display = 'none';
      appDiv.style.display = 'block';
      return true;
    }

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

    // Google sign in
    document.getElementById('google-btn').addEventListener('click', () => {
      FitnessDB.signInWithGoogle();
    });

    // Forgot password — show email entry section
    UI.$('forgot-password-link').addEventListener('click', () => {
      UI.$('login-form').style.display = 'none';
      document.querySelector('.login-divider').style.display = 'none';
      document.getElementById('google-btn').style.display = 'none';
      UI.$('forgot-password-section').style.display = 'block';
    });

    UI.$('back-to-login-btn').addEventListener('click', () => {
      UI.$('forgot-password-section').style.display = 'none';
      UI.$('reset-message').style.display = 'none';
      UI.$('login-form').style.display = 'block';
      document.querySelector('.login-divider').style.display = '';
      document.getElementById('google-btn').style.display = 'block';
    });

    UI.$('send-reset-btn').addEventListener('click', async () => {
      const email = UI.$('reset-email').value.trim();
      const msg = UI.$('reset-message');
      const btn = UI.$('send-reset-btn');
      if (!email) {
        msg.textContent = 'Please enter your email.';
        msg.style.color = 'var(--accent)';
        msg.style.display = 'block';
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Sending...';
      try {
        await FitnessDB.requestPasswordReset(email);
        msg.textContent = 'Check your email for a reset link.';
        msg.style.color = 'var(--success)';
        msg.style.display = 'block';
        btn.textContent = 'Sent!';
      } catch (err) {
        msg.textContent = err.message;
        msg.style.color = 'var(--accent)';
        msg.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Send Reset Link';
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
    elements.setsContainer = UI.$('sets-container');
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
    elements.bikeCompanionInput = UI.$('bike-companion-name');
    elements.walkRunCompanionGroup = UI.$('walk-run-companion-group');
    elements.walkRunCompanion = UI.$('walk-run-companion');
    elements.walkRunCompanionInput = UI.$('walk-run-companion-name');
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
    elements.classSuggestions = UI.$('class-suggestions');
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

    // Seed the strength form with one default set row
    buildSetRow(elements.setsContainer, 0, 10);

    localStorage.removeItem('bikeCompanions'); // migrated to DB-derived
    await initCompanionDropdown();

    // Set initial date
    elements.datePicker.value = currentDate;

    // Load today's data, autocomplete caches, and streak in parallel
    await Promise.all([loadAllData(), loadUserExerciseNames(), loadClassNames(), loadCustomCardioNames(), updateStreak()]);

    // Silently migrate old encoded-notes entries to dedicated columns
    FitnessDB.migrateCardioColumns().catch(e => console.warn('Cardio migration:', e));
  }

  // Shift a YYYY-MM-DD date by N days
  function dateOffset(dateStr, days) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  // Calculate consecutive-day streak from a set of date strings
  function calculateStreak(dateSet) {
    const today = UI.getTodayDate();
    let start = today;
    if (!dateSet.has(today)) {
      const yesterday = dateOffset(today, -1);
      if (!dateSet.has(yesterday)) return 0;
      start = yesterday;
    }
    let streak = 0;
    let current = start;
    while (dateSet.has(current)) {
      streak++;
      current = dateOffset(current, -1);
    }
    return streak;
  }

  // Fetch dates and display streak banner
  async function updateStreak() {
    try {
      const dates = await FitnessDB.getWorkoutDates();
      const streak = calculateStreak(new Set(dates));
      const banner = UI.$('streak-banner');
      if (streak >= 2) {
        UI.$('streak-count').textContent = streak;
        banner.style.display = 'block';
      } else {
        banner.style.display = 'none';
      }
    } catch (e) {
      console.warn('Streak load failed:', e);
    }
  }

  // Load and cache custom cardio names
  async function loadCustomCardioNames() {
    try {
      cachedCustomCardioNames = await FitnessDB.getCustomCardioNames();
    } catch (e) {
      cachedCustomCardioNames = [];
    }
  }

  // Show custom cardio suggestions
  function showCustomCardioSuggestions(query) {
    const container = UI.$('cardio-other-suggestions');
    const q = query.trim().toLowerCase();
    const matches = q
      ? cachedCustomCardioNames.filter(n => n.toLowerCase().includes(q))
      : cachedCustomCardioNames;

    container.innerHTML = '';
    if (matches.length === 0) { container.classList.remove('active'); return; }

    matches.slice(0, 8).forEach((name, i) => {
      const li = UI.createElement('li', {
        textContent: name,
        onClick: () => {
          UI.$('cardio-other-name').value = name;
          container.classList.remove('active');
          elements.cardioDuration.focus();
        }
      });
      if (i === 0) li.classList.add('selected');
      container.appendChild(li);
    });
    container.classList.add('active');
  }

  // Load and cache class names (user's past + predefined)
  async function loadClassNames() {
    try {
      const userClasses = await FitnessDB.getClassNamesForAutocomplete();
      cachedClassNames = [...new Set([...userClasses, ...PREDEFINED_CLASSES])].sort();
    } catch (e) {
      cachedClassNames = [...PREDEFINED_CLASSES];
    }
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
      setTimeout(() => elements.suggestionsContainer.classList.remove('active'), 200);
      const name = elements.exerciseNameInput.value.trim();
      if (!name) return;
      // Only auto-fill if the user hasn't modified the single default set row
      const rows = elements.setsContainer.querySelectorAll('.set-row');
      const isDefault = rows.length === 1 &&
        parseFloat(rows[0].querySelector('.set-weight').value) === 0;
      if (isDefault) {
        try {
          const lastExercise = await FitnessDB.getLastExerciseByName(name);
          if (lastExercise) {
            prefillSetsFromEntry(elements.setsContainer, lastExercise, name);
            const isPredefined = ExerciseDB.getMuscleGroups(name).length > 0;
            if (!isPredefined) populateSavedMuscles(lastExercise.muscles);
          }
        } catch (error) {
          console.error('Failed to fetch last exercise:', error);
        }
      }
    });

    // Add Set button
    UI.$('add-set-btn').addEventListener('click', () => {
      const rows = elements.setsContainer.querySelectorAll('.set-row');
      const lastRow = rows[rows.length - 1];
      const lastWeight = lastRow ? parseFloat(lastRow.querySelector('.set-weight').value) || 0 : 0;
      const lastReps = lastRow ? parseInt(lastRow.querySelector('.set-reps').value) || 10 : 10;
      buildSetRow(elements.setsContainer, lastWeight, lastReps);
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

    // Show/hide bike type selector, walk/run companion, and other name input
    elements.cardioType.addEventListener('change', () => {
      const type = elements.cardioType.value;
      const isBiking = type === 'biking';
      const isWalkRun = type === 'walking' || type === 'running';
      const isOther = type === 'other';
      elements.bikeTypeGroup.style.display = isBiking ? 'block' : 'none';
      elements.bikeExtraGroup.style.display = isBiking ? 'flex' : 'none';
      elements.walkRunCompanionGroup.style.display = isWalkRun ? 'block' : 'none';
      if (!isWalkRun) { elements.walkRunCompanionInput.style.display = 'none'; }
      UI.$('cardio-other-group').style.display = isOther ? 'block' : 'none';
      UI.$('cardio-other-suggestions').classList.remove('active');
      if (isOther) { UI.$('cardio-other-name').focus(); showCustomCardioSuggestions(''); }
    });

    // Show/hide companion name inputs
    elements.bikeCompanion.addEventListener('change', () => {
      const needsName = elements.bikeCompanion.value === 'with';
      elements.bikeCompanionInput.style.display = needsName ? 'block' : 'none';
      if (needsName) { elements.bikeCompanionInput.value = ''; elements.bikeCompanionInput.focus(); }
    });
    elements.walkRunCompanion.addEventListener('change', () => {
      const needsName = elements.walkRunCompanion.value === 'with';
      elements.walkRunCompanionInput.style.display = needsName ? 'block' : 'none';
      if (needsName) { elements.walkRunCompanionInput.value = ''; elements.walkRunCompanionInput.focus(); }
    });

    // Custom cardio name autocomplete
    UI.$('cardio-other-name').addEventListener('input', (e) => showCustomCardioSuggestions(e.target.value));
    UI.$('cardio-other-name').addEventListener('blur', () => {
      setTimeout(() => UI.$('cardio-other-suggestions').classList.remove('active'), 200);
    });

    // Class name autocomplete
    elements.className.addEventListener('focus', () => showClassSuggestions(elements.className.value));
    elements.className.addEventListener('input', (e) => showClassSuggestions(e.target.value));
    elements.className.addEventListener('blur', () => {
      setTimeout(() => elements.classSuggestions.classList.remove('active'), 200);
    });
    document.addEventListener('click', (e) => {
      if (!elements.className.contains(e.target) && !elements.classSuggestions.contains(e.target)) {
        elements.classSuggestions.classList.remove('active');
      }
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
      const bikeTypeLabels = { road: 'Road', mt: 'Mountain', gravel: 'Gravel' };
      rides.forEach(r => {
        let rideType, rideCompanion;
        if (r.bike_type) {
          // New format
          rideType = bikeTypeLabels[r.bike_type] || 'Other';
          rideCompanion = r.companion || 'Unknown';
        } else {
          // Legacy: parse from notes
          const parts = (r.notes || '').split(' · ');
          const validTypes = ['Road', 'Mountain', 'Gravel'];
          rideType = validTypes.includes(parts[0]) ? parts[0] : 'Other';
          rideCompanion = parts[2] || 'Unknown';
        }
        const mi = r.distance || 0;
        byType[rideType] = (byType[rideType] || 0) + mi;
        byCompanion[rideCompanion] = (byCompanion[rideCompanion] || 0) + mi;
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

    // Export button
    UI.$('export-btn').addEventListener('click', handleExport);

    // Database check button
    UI.$('check-db-btn').addEventListener('click', checkDatabase);

    // Weekly goals
    UI.$('add-goal-btn').addEventListener('click', handleAddGoal);

    const goalExerciseInput = UI.$('goal-exercise');
    const goalSuggestions = UI.$('goal-exercise-suggestions');

    const STANDARD_CARDIO = ['Walking', 'Biking', 'Swimming', 'Running', 'Elliptical', 'Stairmaster', 'Rowing'];

    function getAllGoalNames() {
      return [...new Set([
        ...cachedUserExerciseNames,
        ...STANDARD_CARDIO,
        ...cachedCustomCardioNames,
        ...cachedClassNames
      ])].sort();
    }

    function showGoalSuggestions(q) {
      const all = getAllGoalNames();
      const matches = q
        ? all.filter(n => n.toLowerCase().includes(q.toLowerCase()))
        : all;
      goalSuggestions.innerHTML = '';
      if (matches.length === 0) { goalSuggestions.classList.remove('active'); return; }
      matches.slice(0, 8).forEach((name, i) => {
        const li = UI.createElement('li', {
          textContent: name,
          onClick: () => {
            goalExerciseInput.value = name;
            goalSuggestions.classList.remove('active');
          }
        });
        if (i === 0) li.classList.add('selected');
        goalSuggestions.appendChild(li);
      });
      goalSuggestions.classList.add('active');
    }

    goalExerciseInput.addEventListener('input', () => showGoalSuggestions(goalExerciseInput.value.trim()));
    goalExerciseInput.addEventListener('focus', () => showGoalSuggestions(goalExerciseInput.value.trim()));
    goalExerciseInput.addEventListener('blur', () => {
      setTimeout(() => goalSuggestions.classList.remove('active'), 200);
    });

    // Edit modal
    UI.$('edit-cancel-btn').addEventListener('click', closeEditModal);
    UI.$('edit-form').addEventListener('submit', handleEditSave);
    UI.$('edit-modal').addEventListener('click', (e) => {
      if (e.target === UI.$('edit-modal')) closeEditModal();
    });
    UI.$('edit-companion').addEventListener('change', () => {
      const needsName = UI.$('edit-companion').value === 'with';
      UI.$('edit-companion-name').style.display = needsName ? 'block' : 'none';
      if (needsName) { UI.$('edit-companion-name').value = ''; UI.$('edit-companion-name').focus(); }
    });

    // Add Set button in edit modal
    UI.$('edit-add-set-btn').addEventListener('click', () => {
      const container = UI.$('edit-sets-container');
      const rows = container.querySelectorAll('.set-row');
      const lastRow = rows[rows.length - 1];
      const lastWeight = lastRow ? parseFloat(lastRow.querySelector('.set-weight').value) || 0 : 0;
      const lastReps = lastRow ? parseInt(lastRow.querySelector('.set-reps').value) || 10 : 10;
      buildSetRow(container, lastWeight, lastReps);
    });

    // Live muscle tag update when checkboxes change in edit modal
    UI.$('edit-muscle-selector').addEventListener('change', () => {
      const checked = Array.from(UI.$('edit-muscle-selector').querySelectorAll('input[type="checkbox"]:checked'));
      const muscleTags = checked.map(cb => ({
        key: cb.value,
        name: cb.value.charAt(0).toUpperCase() + cb.value.slice(1),
        color: window.ExerciseDB.MUSCLE_GROUPS[cb.value]?.color || '#666'
      }));
      UI.$('edit-muscle-groups').innerHTML = '';
      UI.renderMuscleTags(muscleTags).forEach(tag => UI.$('edit-muscle-groups').appendChild(tag));
    });
  }

  // Populate companion dropdowns from DB entries (always in sync with deletions)
  async function initCompanionDropdown() {
    let names = [];
    try { names = await FitnessDB.getCardioCompanionNames(); } catch { return; }
    [elements.bikeCompanion, elements.walkRunCompanion].forEach(select => {
      select.querySelectorAll('[data-saved]').forEach(o => o.remove());
      if (names.length === 0) return;
      const insertBefore = select.querySelector('[value="with"]');
      names.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        opt.dataset.saved = '1';
        select.insertBefore(opt, insertBefore);
      });
    });
  }

  // Handle cardio form submission
  async function handleCardioSubmit(e) {
    e.preventDefault();

    const type = elements.cardioType.value;
    const duration = parseInt(elements.cardioDuration.value) || 0;
    const distance = parseFloat(elements.cardioDistance.value) || 0;
    const userNotes = elements.cardioNotes.value.trim();
    const otherName = UI.$('cardio-other-name').value.trim();

    if (!type) {
      UI.showToast('Please select an activity', 'error');
      return;
    }
    if (type === 'other' && !otherName) {
      UI.showToast('Please enter an activity name', 'error');
      return;
    }

    let companion = null;
    let bike_type = null;
    let difficulty = null;

    if (type === 'biking') {
      bike_type = elements.bikeType.value;
      difficulty = elements.bikeDifficulty.value;
      const companionVal = elements.bikeCompanion.value;
      const companionText = elements.bikeCompanionInput.value.trim();
      if (companionVal === 'alone') companion = 'Alone';
      else if (companionVal === 'group') companion = 'Group';
      else if (companionVal === 'with') companion = companionText ? `With ${companionText}` : 'With someone';
      else companion = `With ${companionVal}`;
    }
    if (type === 'walking' || type === 'running') {
      const companionVal = elements.walkRunCompanion.value;
      const companionText = elements.walkRunCompanionInput.value.trim();
      if (companionVal === 'alone') companion = 'Alone';
      else if (companionVal === 'group') companion = 'Group';
      else if (companionVal === 'with') companion = companionText ? `With ${companionText}` : 'With someone';
      else companion = `With ${companionVal}`;
    }

    const cardio = {
      date: currentDate,
      type: 'cardio',
      name: type === 'other' ? otherName : type,
      duration,
      distance,
      notes: userNotes || null,
      companion,
      bike_type,
      difficulty
    };

    try {
      await FitnessDB.addExercise(cardio);
      historyLoaded = false;
      UI.showToast('Cardio added!');
      elements.cardioForm.reset();
      elements.bikeTypeGroup.style.display = 'none';
      elements.bikeExtraGroup.style.display = 'none';
      elements.bikeCompanionInput.style.display = 'none';
      elements.walkRunCompanionGroup.style.display = 'none';
      elements.walkRunCompanionInput.style.display = 'none';
      UI.$('cardio-other-group').style.display = 'none';
      elements.cardioDuration.value = '30';
      elements.cardioDistance.value = '0';
      await Promise.all([loadAllData(), initCompanionDropdown(), loadCustomCardioNames()]);
    } catch (error) {
      console.error('Failed to add cardio:', error);
      UI.showToast('Failed to add cardio', 'error');
    }
  }

  // Show class name suggestions
  function showClassSuggestions(query) {
    const q = query.trim().toLowerCase();
    const matches = q
      ? cachedClassNames.filter(n => n.toLowerCase().includes(q))
      : cachedClassNames;

    elements.classSuggestions.innerHTML = '';
    if (matches.length === 0) {
      elements.classSuggestions.classList.remove('active');
      return;
    }

    matches.slice(0, 8).forEach((name, i) => {
      const li = UI.createElement('li', {
        textContent: name,
        onClick: () => {
          elements.className.value = name;
          elements.classSuggestions.classList.remove('active');
          elements.classDuration.focus();
        }
      });
      if (i === 0) li.classList.add('selected');
      elements.classSuggestions.appendChild(li);
    });

    elements.classSuggestions.classList.add('active');
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
      historyLoaded = false;
      UI.showToast('Class added!');
      elements.classForm.reset();
      elements.classDuration.value = '60';
      elements.classSuggestions.classList.remove('active');
      await Promise.all([loadAllData(), loadClassNames()]);
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

  // Build a single set row element
  function buildSetRow(container, weight = 0, reps = 10) {
    const row = document.createElement('div');
    row.className = 'set-row';

    const label = document.createElement('span');
    label.className = 'set-label';

    const weightInput = document.createElement('input');
    weightInput.type = 'number';
    weightInput.className = 'set-weight';
    weightInput.min = '0';
    weightInput.step = '2.5';
    weightInput.value = weight;
    weightInput.placeholder = '0';

    const sep = document.createElement('span');
    sep.className = 'set-sep';
    sep.textContent = 'lbs ×';

    const repsInput = document.createElement('input');
    repsInput.type = 'number';
    repsInput.className = 'set-reps';
    repsInput.min = '1';
    repsInput.value = reps;
    repsInput.placeholder = '10';

    const repsLabel = document.createElement('span');
    repsLabel.className = 'set-sep';
    repsLabel.textContent = 'reps';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-icon remove-set';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Remove set';
    removeBtn.addEventListener('click', () => {
      row.remove();
      renumberSetRows(container);
    });

    row.append(label, weightInput, sep, repsInput, repsLabel, removeBtn);
    container.appendChild(row);
    renumberSetRows(container);
    return row;
  }

  function renumberSetRows(container) {
    container.querySelectorAll('.set-row').forEach((row, i) => {
      const label = row.querySelector('.set-label');
      if (label) label.textContent = `Set ${i + 1}`;
      // Hide remove button when only one set remains
      const btn = row.querySelector('.remove-set');
      if (btn) btn.style.visibility = container.querySelectorAll('.set-row').length > 1 ? 'visible' : 'hidden';
    });
  }

  function getSetDetails(container) {
    return Array.from(container.querySelectorAll('.set-row')).map(row => ({
      weight: parseFloat(row.querySelector('.set-weight').value) || 0,
      reps: parseInt(row.querySelector('.set-reps').value) || 0
    }));
  }

  function prefillSetsFromEntry(container, lastExercise, name) {
    container.innerHTML = '';
    const defaultReps = ExerciseDB.EXERCISES.find(e => e.name === name)?.defaultReps || 10;
    if (lastExercise.set_details && lastExercise.set_details.length > 0) {
      lastExercise.set_details.forEach(s => buildSetRow(container, s.weight, s.reps));
    } else {
      const setCount = lastExercise.sets || 1;
      for (let i = 0; i < setCount; i++) {
        buildSetRow(container, lastExercise.weight || 0, lastExercise.reps || defaultReps);
      }
    }
  }

  // Pre-populate muscle checkboxes and tags from saved muscle data
  function populateSavedMuscles(muscles) {
    if (!muscles || muscles.length === 0) return;
    elements.muscleSelector.style.display = 'block';
    elements.muscleSelector.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = muscles.includes(cb.value);
    });
    const muscleTags = muscles.map(key => ({
      key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      color: window.ExerciseDB.MUSCLE_GROUPS[key]?.color || '#666'
    }));
    elements.muscleGroupsContainer.innerHTML = '';
    UI.renderMuscleTags(muscleTags).forEach(tag => elements.muscleGroupsContainer.appendChild(tag));
  }

  // Select an exercise from suggestions
  async function selectExercise(name) {
    elements.exerciseNameInput.value = name;
    elements.suggestionsContainer.classList.remove('active');
    UI.updateMuscleGroups(name, elements.muscleGroupsContainer);

    try {
      const lastExercise = await FitnessDB.getLastExerciseByName(name);
      const exerciseDefaults = ExerciseDB.EXERCISES.find(e => e.name === name);
      if (lastExercise) {
        prefillSetsFromEntry(elements.setsContainer, lastExercise, name);
        const isPredefined = ExerciseDB.getMuscleGroups(name).length > 0;
        if (!isPredefined) populateSavedMuscles(lastExercise.muscles);
      } else if (exerciseDefaults?.defaultReps) {
        const row = elements.setsContainer.querySelector('.set-row');
        if (row) row.querySelector('.set-reps').value = exerciseDefaults.defaultReps;
      }
    } catch (error) {
      console.error('Failed to fetch last exercise:', error);
    }

    elements.setsContainer.querySelector('.set-weight')?.focus();
  }

  // Handle form submission
  async function handleFormSubmit(e) {
    e.preventDefault();

    const name = elements.exerciseNameInput.value.trim();
    if (!name) {
      UI.showToast('Please enter an exercise name', 'error');
      return;
    }

    const setDetails = getSetDetails(elements.setsContainer);
    if (setDetails.length === 0 || setDetails.some(s => s.reps < 1)) {
      UI.showToast('Please enter valid reps for each set', 'error');
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

    // Summary fields for backwards compat and progress chart (max weight)
    const maxWeight = Math.max(...setDetails.map(s => s.weight));
    const firstSet = setDetails[0];

    const exercise = {
      date: currentDate,
      type: 'strength',
      name,
      weight: maxWeight,
      reps: firstSet.reps,
      sets: setDetails.length,
      set_details: setDetails,
      notes: notes || null,
      muscles: selectedMuscles
    };

    try {
      // If the same exercise already exists for this date, append sets to it
      const todayEntries = await FitnessDB.getExercisesByDate(currentDate);
      const existing = todayEntries.find(e => e.type === 'strength' && e.name.toLowerCase() === name.toLowerCase());

      if (existing) {
        const mergedSets = [...(existing.set_details || []), ...setDetails];
        const newMaxWeight = Math.max(...mergedSets.map(s => s.weight));
        await FitnessDB.updateExercise(existing.id, {
          set_details: JSON.stringify(mergedSets),
          sets: mergedSets.length,
          weight: newMaxWeight,
          timestamp: Date.now()
        });
        UI.showToast('Set added to existing exercise!');
      } else {
        await FitnessDB.addExercise(exercise);
        UI.showToast('Exercise added!');
      }
      resetForm();
      historyLoaded = false;
      await Promise.all([loadAllData(), loadUserExerciseNames(), updateStreak()]);
    } catch (error) {
      console.error('Failed to add exercise:', error);
      UI.showToast('Failed to add exercise', 'error');
    }
  }

  // Reset the form
  function resetForm() {
    elements.exerciseForm.reset();
    elements.notesInput.value = '';
    elements.muscleGroupsContainer.innerHTML = '';
    elements.muscleSelector.style.display = 'none';
    elements.muscleSelector.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    elements.setsContainer.innerHTML = '';
    buildSetRow(elements.setsContainer, 0, 10);
    elements.exerciseNameInput.focus();
  }

  // Load all data for current date (single fetch, then split by type)
  async function loadAllData() {
    const fetchingFor = currentDate;
    try {
      const allEntries = await FitnessDB.getExercisesByDate(fetchingFor);
      if (fetchingFor !== currentDate) return; // date changed while fetching, discard stale result
      UI.renderAllActivities(allEntries, elements.allActivitiesList, handleDeleteExercise, 'all-empty-state', openEditModal);
      UI.renderCardioList(allEntries.filter(e => e.type === 'cardio'), elements.cardioList, handleDeleteExercise, 'cardio-empty-state', openEditModal);
      UI.renderClassList(allEntries.filter(e => e.type === 'class'), elements.classList, handleDeleteExercise, 'class-empty-state', openEditModal);

      // Refresh goals silently when logging today's exercises so progress stays current
      const { weekStart } = getWeekBounds();
      if (fetchingFor === weekStart.slice(0, 10) || isCurrentWeek(fetchingFor)) {
        loadGoals().catch(() => {});
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      UI.showToast('Load error: ' + error.message, 'error');
    }
  }

  function isCurrentWeek(dateStr) {
    const { weekStart, weekEnd } = getWeekBounds();
    return dateStr >= weekStart && dateStr <= weekEnd;
  }

  // Convert rows to CSV string
  function toCSV(rows) {
    const headers = ['Date', 'Type', 'Name', 'Weight (lbs)', 'Reps', 'Sets', 'Duration (min)', 'Distance (mi)', 'Companion', 'Bike Type', 'Difficulty', 'Notes'];
    const escape = val => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      return (str.includes(',') || str.includes('"') || str.includes('\n'))
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };
    const lines = [headers.join(',')];
    rows.forEach(r => {
      lines.push([
        r.date, r.type, r.name,
        r.weight ?? '', r.reps ?? '', r.sets ?? '',
        r.duration ?? '', r.distance ?? '',
        r.companion ?? '', r.bike_type ?? '', r.difficulty ?? '',
        r.notes ?? ''
      ].map(escape).join(','));
    });
    return lines.join('\n');
  }

  // Handle CSV export
  async function handleExport() {
    const btn = UI.$('export-btn');
    btn.disabled = true;
    btn.textContent = 'Exporting...';
    try {
      const data = await FitnessDB.getExercisesForReports();
      const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
      const csv = toCSV(sorted);
      const filename = `getfitdaily-${UI.getTodayDate()}.csv`;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      UI.showToast('Downloaded!');
    } catch (err) {
      console.error('Export failed:', err);
      UI.showToast('Export failed', 'error');
    }
    btn.disabled = false;
    btn.textContent = 'Download CSV';
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

  // Edit modal state
  let editingEntry = null;

  function openEditModal(entry) {
    editingEntry = entry;
    UI.$('edit-id').value = entry.id;
    UI.$('edit-type').value = entry.type;
    UI.$('edit-notes').value = entry.notes || '';

    const isStrength = entry.type === 'strength';
    const isCardio = entry.type === 'cardio';
    const isClass = entry.type === 'class';
    const isBiking = isCardio && entry.name === 'biking';
    const isWalkRun = isCardio && (entry.name === 'walking' || entry.name === 'running');

    UI.$('edit-strength-fields').style.display = isStrength ? 'block' : 'none';
    UI.$('edit-duration-group').style.display = (isCardio || isClass) ? 'block' : 'none';
    UI.$('edit-distance-group').style.display = isCardio ? 'block' : 'none';
    UI.$('edit-bike-fields').style.display = isBiking ? 'block' : 'none';
    UI.$('edit-companion-group').style.display = (isBiking || isWalkRun) ? 'block' : 'none';

    const activityNames = { walking:'Walking', biking:'Biking', swimming:'Swimming', running:'Running', elliptical:'Elliptical', stairmaster:'Stairmaster', rowing:'Rowing', other:'Other' };

    if (isStrength) {
      UI.$('edit-modal-title').textContent = entry.name;

      // Populate set rows
      const editSetsContainer = UI.$('edit-sets-container');
      editSetsContainer.innerHTML = '';
      if (entry.set_details && entry.set_details.length > 0) {
        entry.set_details.forEach(s => buildSetRow(editSetsContainer, s.weight, s.reps));
      } else {
        buildSetRow(editSetsContainer, entry.weight || 0, entry.reps || 10);
      }

      // Populate muscle groups
      const editMuscleGroups = UI.$('edit-muscle-groups');
      const editMuscleSelector = UI.$('edit-muscle-selector');
      editMuscleGroups.innerHTML = '';
      editMuscleSelector.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);

      // Determine starting muscles: predefined list takes priority, then saved muscles
      const predefinedMuscles = ExerciseDB.getMuscleGroups(entry.name);
      const muscles = predefinedMuscles.length > 0
        ? predefinedMuscles.map(m => m.key)
        : (entry.muscles || []);

      // Always show checkboxes so user can add/remove muscle groups
      editMuscleSelector.style.display = 'block';
      editMuscleSelector.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = muscles.includes(cb.value);
      });
      const muscleTags = muscles.map(key => ({
        key,
        name: key.charAt(0).toUpperCase() + key.slice(1),
        color: window.ExerciseDB.MUSCLE_GROUPS[key]?.color || '#666'
      }));
      UI.renderMuscleTags(muscleTags).forEach(tag => editMuscleGroups.appendChild(tag));
    } else if (isCardio) {
      UI.$('edit-modal-title').textContent = activityNames[entry.name] || entry.name;
      UI.$('edit-duration').value = entry.duration || 0;
      UI.$('edit-distance').value = entry.distance || 0;

      if (isBiking) {
        UI.$('edit-bike-type').value = entry.bike_type || 'road';
        UI.$('edit-difficulty').value = entry.difficulty || 'medium';
      }

      if (isBiking || isWalkRun) {
        const companion = entry.companion || 'Alone';
        const companionSelect = UI.$('edit-companion');
        const companionNameInput = UI.$('edit-companion-name');
        if (companion === 'Alone' || companion === 'Group') {
          companionSelect.value = companion;
          companionNameInput.style.display = 'none';
        } else if (companion.startsWith('With ')) {
          companionSelect.value = 'with';
          companionNameInput.value = companion.slice(5);
          companionNameInput.style.display = 'block';
        } else {
          companionSelect.value = 'Alone';
          companionNameInput.style.display = 'none';
        }
      }
    } else if (isClass) {
      UI.$('edit-modal-title').textContent = entry.name;
      UI.$('edit-duration').value = entry.duration || 0;
    }

    UI.$('edit-modal').style.display = 'flex';
  }

  function closeEditModal() {
    UI.$('edit-modal').style.display = 'none';
    editingEntry = null;
  }

  async function handleEditSave(e) {
    e.preventDefault();
    if (!editingEntry) return;

    const type = UI.$('edit-type').value;
    const updates = { notes: UI.$('edit-notes').value.trim() || null };

    if (type === 'strength') {
      const editSetsContainer = UI.$('edit-sets-container');
      const setDetails = getSetDetails(editSetsContainer);
      updates.set_details = JSON.stringify(setDetails);
      updates.weight = Math.max(...setDetails.map(s => s.weight));
      updates.reps = setDetails[0]?.reps || 0;
      updates.sets = setDetails.length;
      // Save muscle groups (always editable)
      const checked = UI.$('edit-muscle-selector').querySelectorAll('input[type="checkbox"]:checked');
      updates.muscles = Array.from(checked).map(cb => cb.value);
    } else if (type === 'cardio' || type === 'class') {
      updates.duration = parseInt(UI.$('edit-duration').value) || 0;
      if (type === 'cardio') {
        updates.distance = parseFloat(UI.$('edit-distance').value) || 0;
        const name = editingEntry.name;
        if (name === 'biking') {
          updates.bike_type = UI.$('edit-bike-type').value;
          updates.difficulty = UI.$('edit-difficulty').value;
        }
        if (name === 'biking' || name === 'walking' || name === 'running') {
          const companionVal = UI.$('edit-companion').value;
          const companionText = UI.$('edit-companion-name').value.trim();
          if (companionVal === 'Alone' || companionVal === 'Group') {
            updates.companion = companionVal;
          } else if (companionVal === 'with') {
            updates.companion = companionText ? `With ${companionText}` : 'With someone';
          }
        }
      }
    }

    try {
      await FitnessDB.updateExercise(editingEntry.id, updates);
      UI.showToast('Updated!');
      closeEditModal();
      await loadAllData();
    } catch (err) {
      console.error('Failed to update:', err);
      UI.showToast('Failed to update', 'error');
    }
  }

  // Handle exercise deletion
  async function handleDeleteExercise(id) {
    if (!confirm('Delete this entry?')) return;

    try {
      await FitnessDB.deleteExercise(id);
      historyLoaded = false;
      UI.showToast('Deleted');
      await Promise.all([loadAllData(), initCompanionDropdown(), updateStreak()]);
    } catch (error) {
      console.error('Failed to delete:', error);
      UI.showToast('Failed to delete', 'error');
    }
  }

  // Handle adding a set to an exercise
  async function handleAddSet(id, currentSets, currentSetDetails) {
    try {
      const updates = { sets: currentSets + 1 };
      if (currentSetDetails && currentSetDetails.length > 0) {
        const lastSet = currentSetDetails[currentSetDetails.length - 1];
        updates.set_details = JSON.stringify([...currentSetDetails, { weight: lastSet.weight, reps: lastSet.reps }]);
      }
      await FitnessDB.updateExercise(id, updates);
      UI.showToast('+1 Set');
      await loadAllData();
    } catch (error) {
      console.error('Failed to add set:', error);
      UI.showToast('Failed to add set', 'error');
    }
  }

  // Make handleAddSet globally accessible
  window.handleAddSet = handleAddSet;

  // Build a summary string for a day's entries
  function buildDateSummary(entries) {
    const cardioNames = { walking: 'Walking', biking: 'Biking', swimming: 'Swimming', running: 'Running', elliptical: 'Elliptical', stairmaster: 'Stairmaster', rowing: 'Rowing', other: 'Other' };
    const parts = [];
    const strengthCount = entries.filter(e => e.type === 'strength').length;
    if (strengthCount > 0) parts.push(`${strengthCount} strength`);
    entries.filter(e => e.type === 'cardio').forEach(e => parts.push(cardioNames[e.name] || e.name));
    entries.filter(e => e.type === 'class').forEach(e => parts.push(e.name));
    return parts.join(' · ');
  }

  // Load and render workout history
  async function loadHistory() {
    const container = UI.$('history-list');
    const emptyState = UI.$('history-empty-state');
    container.innerHTML = '<p class="empty-state">Loading...</p>';
    emptyState.style.display = 'none';

    try {
      const entries = await FitnessDB.getWorkoutHistory();
      container.innerHTML = '';

      if (entries.length === 0) {
        emptyState.style.display = 'block';
        return;
      }

      // Group by date
      const byDate = {};
      entries.forEach(e => {
        if (!byDate[e.date]) byDate[e.date] = [];
        byDate[e.date].push(e);
      });

      Object.keys(byDate).sort().reverse().forEach(date => {
        const dayEntries = byDate[date];
        const count = dayEntries.length;
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
          <div>
            <div class="history-date">${UI.formatDate(date)}</div>
            <div class="history-summary">${buildDateSummary(dayEntries)}</div>
          </div>
          <div class="history-count">${count} ${count === 1 ? 'entry' : 'entries'} ›</div>
        `;
        item.addEventListener('click', () => {
          currentDate = date;
          elements.datePicker.value = date;
          loadAllData();
          switchTab('strength');
        });
        container.appendChild(item);
      });

      historyLoaded = true;
    } catch (err) {
      console.error('Failed to load history:', err);
      container.innerHTML = '<p class="empty-state">Failed to load history.</p>';
    }
  }

  // Return the Monday and Sunday of the current week, plus days elapsed since Monday
  function getWeekBounds() {
    const today = new Date();
    const day = today.getDay(); // 0=Sun, 1=Mon, …, 6=Sat
    const daysFromMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysFromMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return { weekStart: fmt(monday), weekEnd: fmt(sunday), daysFromMonday };
  }

  async function loadGoals() {
    const { weekStart, weekEnd, daysFromMonday } = getWeekBounds();
    const daysRemaining = 7 - daysFromMonday; // includes today

    UI.$('goals-list').innerHTML = '<p class="empty-state" style="padding:var(--spacing-md)">Loading...</p>';
    UI.$('goals-empty-state').style.display = 'none';

    try {
      const [goals, exerciseCounts] = await Promise.all([
        FitnessDB.getWeeklyGoals(weekStart),
        FitnessDB.getWeekExerciseCounts(weekStart, weekEnd)
      ]);
      renderGoals(goals, exerciseCounts, daysRemaining, weekStart);
    } catch (err) {
      console.error('Failed to load goals:', err);
      UI.$('goals-list').innerHTML = '<p class="empty-state">Failed to load goals.</p>';
    }
  }

  function renderGoals(goals, exerciseCounts, daysRemaining, weekStart) {
    const list = UI.$('goals-list');
    const emptyState = UI.$('goals-empty-state');
    list.innerHTML = '';

    if (goals.length === 0) {
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    goals.forEach(goal => {
      const count = exerciseCounts[goal.exercise_name.toLowerCase()] || 0;
      const sessionsRemaining = goal.target_days - count;
      const completed = count >= goal.target_days;
      const pct = Math.min(100, Math.round((count / goal.target_days) * 100));

      let message = '';
      let messageType = '';
      if (completed) {
        const spare = daysRemaining - 1;
        message = spare > 0
          ? `You hit your ${goal.exercise_name} goal for the week — with ${spare} day${spare !== 1 ? 's' : ''} to spare!`
          : `You hit your ${goal.exercise_name} goal for the week!`;
        messageType = 'goal-message-success';
      } else if (sessionsRemaining > 0 && sessionsRemaining >= daysRemaining) {
        const daysAfterToday = daysRemaining - 1;
        const daysPhrase = daysAfterToday === 0
          ? 'today is the last day'
          : `only have ${daysAfterToday} day${daysAfterToday !== 1 ? 's' : ''} left after today`;
        message = `You need ${sessionsRemaining} more ${goal.exercise_name} session${sessionsRemaining !== 1 ? 's' : ''} but ${daysPhrase} — don't let it slip!`;
        messageType = 'goal-message-warning';
      }

      const card = UI.createElement('div', { className: 'goal-card' + (completed ? ' goal-completed' : '') });

      const header = UI.createElement('div', { className: 'goal-header' }, [
        UI.createElement('div', { className: 'goal-name', textContent: goal.exercise_name }),
        UI.createElement('button', {
          className: 'btn-icon delete',
          innerHTML: '×',
          title: 'Remove goal',
          onClick: async () => {
            await FitnessDB.deleteWeeklyGoal(goal.id);
            await loadGoals();
          }
        })
      ]);

      const progressRow = UI.createElement('div', { className: 'goal-progress-row' }, [
        UI.createElement('span', { className: 'goal-count', textContent: `${count} / ${goal.target_days} day${goal.target_days !== 1 ? 's' : ''}` })
      ]);

      const barTrack = UI.createElement('div', { className: 'goal-bar-track' }, [
        UI.createElement('div', { className: 'goal-bar-fill', style: { width: pct + '%' } })
      ]);

      const children = [header, progressRow, barTrack];

      if (message) {
        children.push(UI.createElement('div', { className: `goal-message ${messageType}`, textContent: message }));
      }

      children.forEach(c => card.appendChild(c));
      list.appendChild(card);
    });
  }

  async function handleAddGoal() {
    const nameInput = UI.$('goal-exercise');
    const daysSelect = UI.$('goal-days');
    const name = nameInput.value.trim();
    if (!name) {
      UI.showToast('Enter an exercise name', 'error');
      nameInput.focus();
      return;
    }
    const targetDays = parseInt(daysSelect.value);
    const { weekStart } = getWeekBounds();

    const btn = UI.$('add-goal-btn');
    btn.disabled = true;
    btn.textContent = 'Adding...';

    try {
      await FitnessDB.addWeeklyGoal(name, targetDays, weekStart);
      nameInput.value = '';
      daysSelect.value = '3';
      await loadGoals();
    } catch (err) {
      console.error('Failed to add goal:', err);
      UI.showToast('Failed to add goal', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Add Goal';
    }
  }

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

    // Lazy-load history on first open
    if (tabName === 'history' && !historyLoaded) {
      loadHistory();
    }

    // Reload goals each time (needs fresh exercise counts)
    if (tabName === 'goals') {
      loadGoals();
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupAuth().then(loggedIn => { if (loggedIn) init(); });
    });
  } else {
    setupAuth().then(loggedIn => { if (loggedIn) init(); });
  }
})();
