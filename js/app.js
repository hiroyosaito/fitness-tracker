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
    imageInput: null,
    imagePreview: null,
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
    weekWorkoutDays: null,
    weekBalance: null,
    weekUpperBody: null,
    weekBack: null,
    weekLowerBody: null,
    weekCore: null,
    weekCardioMins: null,
    weekClassCount: null,
    progressExercise: null,
    progressChart: null,
    reportPeriod: null,
    reportPeriodTitle: null
  };

  // Current selected images (array)
  let selectedImageBlobs = [];

  // State
  let currentDate = UI.getTodayDate();
  let selectedSuggestionIndex = 0;
  let suggestions = [];
  let cachedUserExerciseNames = [];

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
      appDiv.style.display = 'none';
      loginScreen.style.display = 'flex';
      document.getElementById('auth-email').value = '';
      document.getElementById('auth-password').value = '';
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
      loginError.style.display = 'none';
      try {
        await FitnessDB.signIn(email, password);
        loginScreen.style.display = 'none';
        appDiv.style.display = 'block';
        init();
      } catch (err) {
        loginError.textContent = err.message;
        loginError.style.display = 'block';
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
          loginScreen.style.display = 'none';
          appDiv.style.display = 'block';
          init();
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
    elements.imageInput = UI.$('exercise-image');
    elements.imagePreview = UI.$('image-preview');
    elements.notesInput = UI.$('exercise-notes');
    // Cardio elements
    elements.cardioForm = UI.$('add-cardio-form');
    elements.cardioType = UI.$('cardio-type');
    elements.bikeTypeGroup = UI.$('bike-type-group');
    elements.bikeType = UI.$('bike-type');
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
    elements.weekBalance = UI.$('week-balance');
    elements.weekUpperBody = UI.$('week-upper-body');
    elements.weekBack = UI.$('week-back');
    elements.weekLowerBody = UI.$('week-lower-body');
    elements.weekCore = UI.$('week-core');
    elements.weekCardioMins = UI.$('week-cardio-mins');
    elements.weekClassCount = UI.$('week-class-count');
    elements.progressExercise = UI.$('progress-exercise');
    elements.progressChart = UI.$('progress-chart');
    elements.reportPeriod = UI.$('report-period');
    elements.reportPeriodTitle = UI.$('report-period-title');

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

    // Load today's data
    await loadAllData();

    // Cache user exercise names for autocomplete
    await loadUserExerciseNames();
  }

  // Load and cache user exercise names
  async function loadUserExerciseNames() {
    try {
      const allExercises = await FitnessDB.getAllExercises();
      cachedUserExerciseNames = [...new Set(
        allExercises
          .filter(ex => ex.type === 'strength')
          .map(ex => ex.name)
      )];
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
            elements.repsInput.value = lastExercise.reps || 10;
            elements.setsInput.value = lastExercise.sets || 1;
            if (lastExercise.notes) {
              elements.notesInput.value = lastExercise.notes;
            }
            if (lastExercise.images && lastExercise.images.length > 0 && selectedImageBlobs.length === 0) {
              selectedImageBlobs = lastExercise.images;
              elements.imagePreview.innerHTML = '';
              lastExercise.images.forEach(img => {
                const imgEl = document.createElement('img');
                imgEl.src = typeof img === 'string' ? img : URL.createObjectURL(img);
                imgEl.alt = 'Preview';
                elements.imagePreview.appendChild(imgEl);
              });
              elements.imagePreview.classList.add('has-image');
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

    // Image input change
    elements.imageInput.addEventListener('change', handleImageSelect);

    // Show/hide bike type selector
    elements.cardioType.addEventListener('change', () => {
      elements.bikeTypeGroup.style.display = elements.cardioType.value === 'biking' ? 'block' : 'none';
    });

    // Cardio form submission
    elements.cardioForm.addEventListener('submit', handleCardioSubmit);

    // Class form submission
    elements.classForm.addEventListener('submit', handleClassSubmit);

    // Progress exercise selection
    elements.progressExercise.addEventListener('change', handleProgressExerciseChange);

    // Report period selection
    elements.reportPeriod.addEventListener('change', loadReports);

    // Load reports when switching to reports tab
    elements.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        if (tab.dataset.tab === 'reports') {
          loadReports();
        }
      });
    });
  }

  // Handle cardio form submission
  async function handleCardioSubmit(e) {
    e.preventDefault();

    const type = elements.cardioType.value;
    const duration = parseInt(elements.cardioDuration.value) || 0;
    const distance = parseFloat(elements.cardioDistance.value) || 0;
    const notes = elements.cardioNotes.value.trim();

    if (!type) {
      UI.showToast('Please select an activity', 'error');
      return;
    }

    const cardio = {
      date: currentDate,
      type: 'cardio',
      name: type,
      subtype: type === 'biking' ? elements.bikeType.value : null,
      duration,
      distance,
      notes: notes || null
    };

    try {
      await FitnessDB.addExercise(cardio);
      UI.showToast('Cardio added!');
      elements.cardioForm.reset();
      elements.bikeTypeGroup.style.display = 'none';
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

  // Handle image selection (multiple)
  function handleImageSelect(e) {
    const files = Array.from(e.target.files);
    if (!files.length) {
      clearImagePreview();
      return;
    }

    // Validate file types
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    if (validFiles.length === 0) {
      UI.showToast('Please select image files', 'error');
      clearImagePreview();
      return;
    }

    // Store the blobs
    selectedImageBlobs = validFiles;

    // Show previews
    elements.imagePreview.innerHTML = '';
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = document.createElement('img');
        img.src = event.target.result;
        img.alt = 'Preview';
        elements.imagePreview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
    elements.imagePreview.classList.add('has-image');
  }

  // Clear image preview
  function clearImagePreview() {
    selectedImageBlobs = [];
    elements.imageInput.value = '';
    elements.imagePreview.innerHTML = '';
    elements.imagePreview.classList.remove('has-image');
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
      if (lastExercise) {
        // Auto-fill weight, reps, sets
        elements.weightInput.value = lastExercise.weight || 0;
        elements.repsInput.value = lastExercise.reps || 10;
        elements.setsInput.value = lastExercise.sets || 1;

        // Auto-fill notes
        if (lastExercise.notes) {
          elements.notesInput.value = lastExercise.notes;
        }

        // Auto-fill images
        if (lastExercise.images && lastExercise.images.length > 0) {
          selectedImageBlobs = lastExercise.images;
          elements.imagePreview.innerHTML = '';
          lastExercise.images.forEach(img => {
            const imgEl = document.createElement('img');
            imgEl.src = typeof img === 'string' ? img : URL.createObjectURL(img);
            imgEl.alt = 'Preview';
            elements.imagePreview.appendChild(imgEl);
          });
          elements.imagePreview.classList.add('has-image');
        }
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
      muscles: selectedMuscles,
      images: selectedImageBlobs.length > 0 ? selectedImageBlobs : null
    };

    try {
      await FitnessDB.addExercise(exercise);
      UI.showToast('Exercise added!');
      resetForm();
      await loadExercises();
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
    clearImagePreview();
    elements.exerciseNameInput.focus();
  }

  // Load all activities for current date
  async function loadExercises() {
    try {
      const allEntries = await FitnessDB.getExercisesByDate(currentDate);
      UI.renderAllActivities(allEntries, elements.allActivitiesList, handleDeleteExercise, 'all-empty-state');
    } catch (error) {
      console.error('Failed to load activities:', error);
      UI.showToast('Failed to load activities', 'error');
    }
  }

  // Load cardio for current date
  async function loadCardio() {
    try {
      const allEntries = await FitnessDB.getExercisesByDate(currentDate);
      const cardio = allEntries.filter(e => e.type === 'cardio');
      UI.renderCardioList(cardio, elements.cardioList, handleDeleteExercise, 'cardio-empty-state');
    } catch (error) {
      console.error('Failed to load cardio:', error);
    }
  }

  // Load classes for current date
  async function loadClasses() {
    try {
      const allEntries = await FitnessDB.getExercisesByDate(currentDate);
      const classes = allEntries.filter(e => e.type === 'class');
      UI.renderClassList(classes, elements.classList, handleDeleteExercise, 'class-empty-state');
    } catch (error) {
      console.error('Failed to load classes:', error);
    }
  }

  // Load all data for current date
  async function loadAllData() {
    await Promise.all([loadExercises(), loadCardio(), loadClasses()]);
  }

  // Load reports
  async function loadReports() {
    try {
      const allExercises = await FitnessDB.getAllExercises();
      const period = elements.reportPeriod.value;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calculate start date based on selected period
      let startDate = null;
      let periodTitle = '';

      switch (period) {
        case 'week':
          startDate = new Date(today);
          startDate.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
          periodTitle = 'This Week';
          break;
        case 'month':
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          periodTitle = 'This Month';
          break;
        case 'year':
          startDate = new Date(today.getFullYear(), 0, 1);
          periodTitle = 'This Year';
          break;
        case 'all':
          startDate = null; // No filter
          periodTitle = 'All Time';
          break;
      }

      // Update title
      elements.reportPeriodTitle.textContent = periodTitle;

      // Filter exercises for selected period
      const weekExercises = startDate
        ? allExercises.filter(e => new Date(e.date + 'T00:00:00') >= startDate)
        : allExercises;

      // Weekly stats
      const weekDates = [...new Set(weekExercises.map(e => e.date))];
      const weekStrength = weekExercises.filter(e => e.type === 'strength');
      const weekCardio = weekExercises.filter(e => e.type === 'cardio');
      const weekClasses = weekExercises.filter(e => e.type === 'class');
      const weekCardioMins = weekCardio.reduce((sum, e) => sum + (e.duration || 0), 0);

      // Count exercises by body part
      const upperBodyMuscles = ['chest', 'shoulders', 'biceps', 'triceps', 'forearms', 'traps'];
      const backMuscles = ['back'];
      const lowerBodyMuscles = ['quads', 'hamstrings', 'glutes', 'calves'];
      const coreMuscles = ['core'];

      // Balance exercises (single-leg, stability work)
      const balanceExercises = [
        'lunges', 'lunge', 'bulgarian split squat', 'single leg', 'one leg',
        'step up', 'pistol squat', 'balance', 'stability', 'bosu',
        'single-leg', 'unilateral'
      ];

      let balanceCount = 0;
      let upperBodyCount = 0;
      let backCount = 0;
      let lowerBodyCount = 0;
      let coreCount = 0;

      weekStrength.forEach(exercise => {
        // Get muscles from predefined or saved custom
        let muscles = ExerciseDB.getMuscleGroups(exercise.name);
        let muscleKeys = muscles.map(m => m.key);
        if (muscleKeys.length === 0 && exercise.muscles) {
          muscleKeys = exercise.muscles;
        }

        const nameLower = exercise.name.toLowerCase();

        // Check if it's a balance exercise
        if (balanceExercises.some(b => nameLower.includes(b))) balanceCount++;

        if (muscleKeys.some(m => upperBodyMuscles.includes(m))) upperBodyCount++;
        if (muscleKeys.some(m => backMuscles.includes(m))) backCount++;
        if (muscleKeys.some(m => lowerBodyMuscles.includes(m))) lowerBodyCount++;
        if (muscleKeys.some(m => coreMuscles.includes(m))) coreCount++;
      });

      elements.weekWorkoutDays.textContent = weekDates.length;
      elements.weekBalance.textContent = balanceCount;
      elements.weekUpperBody.textContent = upperBodyCount;
      elements.weekBack.textContent = backCount;
      elements.weekLowerBody.textContent = lowerBodyCount;
      elements.weekCore.textContent = coreCount;
      elements.weekCardioMins.textContent = weekCardioMins;
      elements.weekClassCount.textContent = weekClasses.length;

      // Populate exercise dropdown with unique strength exercises
      const strengthExercises = allExercises.filter(e => e.type === 'strength');
      const uniqueNames = [...new Set(strengthExercises.map(e => e.name))].sort();

      elements.progressExercise.innerHTML = '<option value="">Choose an exercise...</option>';
      uniqueNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        elements.progressExercise.appendChild(option);
      });

    } catch (error) {
      console.error('Failed to load reports:', error);
    }
  }

  // Handle progress exercise selection
  async function handleProgressExerciseChange(e) {
    const exerciseName = e.target.value;

    if (!exerciseName) {
      elements.progressChart.innerHTML = '<p class="empty-state">Select an exercise to see your progress</p>';
      return;
    }

    try {
      const allExercises = await FitnessDB.getAllExercises();
      const exerciseHistory = allExercises
        .filter(ex => ex.type === 'strength' && ex.name === exerciseName)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

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

      const dataPoints = Object.values(byDate).slice(-10); // Last 10 sessions
      const maxWeight = Math.max(...dataPoints.map(d => d.weight));

      // Render chart
      let chartHTML = '<div class="chart-container"><div class="chart-bars">';

      dataPoints.forEach(point => {
        const height = maxWeight > 0 ? (point.weight / maxWeight) * 140 : 4;
        const dateLabel = new Date(point.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        chartHTML += `
          <div class="chart-bar-wrapper">
            <span class="chart-bar-value">${point.weight}</span>
            <div class="chart-bar" style="height: ${height}px"></div>
            <span class="chart-bar-label">${dateLabel}</span>
          </div>
        `;
      });

      chartHTML += '</div></div>';
      elements.progressChart.innerHTML = chartHTML;

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
      await loadExercises();
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
