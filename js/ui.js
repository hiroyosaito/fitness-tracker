// UI Helper Functions for Fitness Tracker

const UI = {
  // Get element by ID
  $(id) {
    return document.getElementById(id);
  },

  // Create element with attributes and children
  createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);

    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'className') {
        el.className = value;
      } else if (key === 'textContent') {
        el.textContent = value;
      } else if (key === 'innerHTML') {
        el.innerHTML = value;
      } else if (key.startsWith('on')) {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value);
      } else {
        el.setAttribute(key, value);
      }
    });

    children.forEach(child => {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else if (child) {
        el.appendChild(child);
      }
    });

    return el;
  },

  // Render muscle group tags
  renderMuscleTags(muscles) {
    return muscles.map(muscle =>
      this.createElement('span', {
        className: 'muscle-tag',
        textContent: muscle.name,
        style: { backgroundColor: muscle.color }
      })
    );
  },

  // Render a single exercise item
  renderExerciseItem(exercise, onDelete, onEdit) {
    // Get muscles from predefined list or from saved custom muscles
    let muscles = window.ExerciseDB.getMuscleGroups(exercise.name);
    if (muscles.length === 0 && exercise.muscles && exercise.muscles.length > 0) {
      // Use saved custom muscles
      muscles = exercise.muscles.map(key => ({
        key: key,
        name: key.charAt(0).toUpperCase() + key.slice(1),
        color: window.ExerciseDB.MUSCLE_GROUPS[key]?.color || '#666'
      }));
    }

    const musclesContainer = this.createElement('div', { className: 'exercise-muscles' },
      this.renderMuscleTags(muscles)
    );

    const infoChildren = [
      this.createElement('div', { className: 'exercise-name', textContent: exercise.name }),
      this.createElement('div', {
        className: 'exercise-details',
        textContent: `${exercise.weight} lbs × ${exercise.reps} reps × ${exercise.sets} set${exercise.sets > 1 ? 's' : ''}`
      }),
      musclesContainer
    ];

    // Add notes if present
    if (exercise.notes) {
      infoChildren.push(this.createElement('div', {
        className: 'exercise-notes',
        textContent: exercise.notes
      }));
    }

    const infoDiv = this.createElement('div', { className: 'exercise-info' }, infoChildren);

    const editBtn = this.createElement('button', {
      className: 'btn-icon edit',
      innerHTML: '✎',
      title: 'Edit',
      onClick: () => onEdit && onEdit(exercise)
    });

    const addSetBtn = this.createElement('button', {
      className: 'btn-icon add-set',
      innerHTML: '+1',
      title: 'Add Set',
      onClick: () => {
        if (window.handleAddSet) {
          window.handleAddSet(exercise.id, exercise.sets);
        }
      }
    });

    const deleteBtn = this.createElement('button', {
      className: 'btn-icon delete',
      innerHTML: '×',
      title: 'Delete',
      onClick: () => onDelete(exercise.id)
    });

    const actionsDiv = this.createElement('div', { className: 'exercise-actions' }, [editBtn, addSetBtn, deleteBtn]);

    const children = [infoDiv, actionsDiv];

    return this.createElement('li', { className: 'exercise-item' }, children);
  },

  // Render exercise list
  renderExerciseList(exercises, container, onDelete, emptyStateId = 'empty-state', onEdit) {
    container.innerHTML = '';

    const emptyState = this.$(emptyStateId);
    if (exercises.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    // Sort by timestamp descending (newest first)
    const sorted = [...exercises].sort((a, b) => b.timestamp - a.timestamp);

    sorted.forEach(exercise => {
      container.appendChild(this.renderExerciseItem(exercise, onDelete, onEdit));
    });
  },

  // Render cardio item
  renderCardioItem(cardio, onDelete, onEdit) {
    const activityNames = {
      walking: 'Walking',
      biking: 'Biking',
      swimming: 'Swimming',
      running: 'Running',
      elliptical: 'Elliptical',
      stairmaster: 'Stairmaster',
      rowing: 'Rowing',
      other: 'Other'
    };

    const bikeTypeNames = {
      road: 'Road Bike',
      mt: 'Mountain Bike',
      gravel: 'Gravel Bike'
    };

    let name = activityNames[cardio.name] || cardio.name;
    let details = `${cardio.duration} min`;
    if (cardio.distance > 0) {
      details += ` · ${cardio.distance} mi`;
    }

    const infoChildren = [
      this.createElement('div', { className: 'exercise-name', textContent: name }),
      this.createElement('div', { className: 'exercise-details', textContent: details })
    ];

    if (cardio.notes) {
      infoChildren.push(this.createElement('div', {
        className: 'exercise-notes',
        textContent: cardio.notes
      }));
    }

    const infoDiv = this.createElement('div', { className: 'exercise-info' }, infoChildren);

    const editBtn = this.createElement('button', {
      className: 'btn-icon edit',
      innerHTML: '✎',
      title: 'Edit',
      onClick: () => onEdit && onEdit(cardio)
    });

    const deleteBtn = this.createElement('button', {
      className: 'btn-icon delete',
      innerHTML: '×',
      title: 'Delete',
      onClick: () => onDelete(cardio.id)
    });

    const actionsDiv = this.createElement('div', { className: 'exercise-actions' }, [editBtn, deleteBtn]);

    return this.createElement('li', { className: 'exercise-item' }, [infoDiv, actionsDiv]);
  },

  // Render cardio list
  renderCardioList(cardioEntries, container, onDelete, emptyStateId, onEdit) {
    container.innerHTML = '';

    const emptyState = this.$(emptyStateId);
    if (cardioEntries.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    const sorted = [...cardioEntries].sort((a, b) => b.timestamp - a.timestamp);

    sorted.forEach(cardio => {
      container.appendChild(this.renderCardioItem(cardio, onDelete, onEdit));
    });
  },

  // Render class item
  renderClassItem(classEntry, onDelete, onEdit) {
    const infoChildren = [
      this.createElement('div', { className: 'exercise-name', textContent: classEntry.name }),
      this.createElement('div', { className: 'exercise-details', textContent: `${classEntry.duration} min` })
    ];

    if (classEntry.notes) {
      infoChildren.push(this.createElement('div', {
        className: 'exercise-notes',
        textContent: classEntry.notes
      }));
    }

    const infoDiv = this.createElement('div', { className: 'exercise-info' }, infoChildren);

    const editBtn = this.createElement('button', {
      className: 'btn-icon edit',
      innerHTML: '✎',
      title: 'Edit',
      onClick: () => onEdit && onEdit(classEntry)
    });

    const deleteBtn = this.createElement('button', {
      className: 'btn-icon delete',
      innerHTML: '×',
      title: 'Delete',
      onClick: () => onDelete(classEntry.id)
    });

    const actionsDiv = this.createElement('div', { className: 'exercise-actions' }, [editBtn, deleteBtn]);

    return this.createElement('li', { className: 'exercise-item' }, [infoDiv, actionsDiv]);
  },

  // Render class list
  renderClassList(classEntries, container, onDelete, emptyStateId, onEdit) {
    container.innerHTML = '';

    const emptyState = this.$(emptyStateId);
    if (classEntries.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    const sorted = [...classEntries].sort((a, b) => b.timestamp - a.timestamp);

    sorted.forEach(classEntry => {
      container.appendChild(this.renderClassItem(classEntry, onDelete, onEdit));
    });
  },

  // Render all activities (strength, cardio, classes) combined
  renderAllActivities(activities, container, onDelete, emptyStateId, onEdit) {
    container.innerHTML = '';

    const emptyState = this.$(emptyStateId);
    if (activities.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    // Sort by timestamp descending (newest first)
    const sorted = [...activities].sort((a, b) => b.timestamp - a.timestamp);

    sorted.forEach(activity => {
      let item;
      if (activity.type === 'strength') {
        item = this.renderExerciseItem(activity, onDelete, onEdit);
      } else if (activity.type === 'cardio') {
        item = this.renderCardioItem(activity, onDelete, onEdit);
      } else if (activity.type === 'class') {
        item = this.renderClassItem(activity, onDelete, onEdit);
      }
      if (item) {
        // Add a type badge
        const badge = this.createElement('span', {
          className: 'activity-type-badge',
          textContent: activity.type === 'strength' ? 'Strength' :
                       activity.type === 'cardio' ? 'Cardio' : 'Class'
        });
        item.querySelector('.exercise-info').prepend(badge);
        container.appendChild(item);
      }
    });
  },

  // Render autocomplete suggestions
  renderSuggestions(exercises, container, onSelect) {
    container.innerHTML = '';

    if (exercises.length === 0) {
      container.classList.remove('active');
      return;
    }

    exercises.forEach((exercise, index) => {
      const li = this.createElement('li', {
        textContent: exercise.name,
        onClick: () => onSelect(exercise.name)
      });

      if (index === 0) {
        li.classList.add('selected');
      }

      container.appendChild(li);
    });

    container.classList.add('active');
  },

  // Update muscle groups display
  updateMuscleGroups(exerciseName, container) {
    container.innerHTML = '';

    const muscles = window.ExerciseDB.getMuscleGroups(exerciseName);

    if (muscles.length > 0) {
      this.renderMuscleTags(muscles).forEach(tag => container.appendChild(tag));
    }
  },

  // Show toast notification
  showToast(message, type = 'success') {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = this.createElement('div', {
      className: `toast toast-${type}`,
      textContent: message,
      style: {
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: type === 'success' ? 'var(--success)' : 'var(--accent)',
        color: 'white',
        padding: '12px 24px',
        borderRadius: '8px',
        zIndex: '1000',
        animation: 'fadeIn 0.3s ease'
      }
    });

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  },

  // Format date for display
  formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  },

  // Get today's date in YYYY-MM-DD format (local timezone)
  getTodayDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

// Export
window.UI = UI;
