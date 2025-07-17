// dashboard.js - Advanced Dashboard Functionality
class Dashboard {
  constructor() {
    this.initElements();
    this.initEventListeners();
    this.loadDashboardData();
    this.setupIntersectionObserver();
    this.setupServiceWorker();
  }

  // Initialize DOM elements
  initElements() {
    this.elements = {
      pendingTasks: document.getElementById('pending-tasks'),
      monthlyExpense: document.getElementById('monthly-expense'),
      weeklyGoals: document.getElementById('weekly-goals'),
      refreshQuoteBtn: document.getElementById('refresh-quote'),
      dailyQuote: document.getElementById('daily-quote'),
      quoteAuthor: document.getElementById('quote-author'),
      weatherSummary: document.getElementById('weather-summary'),
      smartSuggestion: document.getElementById('smart-suggestion'),
      recentTasks: document.getElementById('recent-tasks'),
      recentNotes: document.getElementById('recent-notes'),
      actionButtons: document.querySelectorAll('.action-btn'),
      dashboardGrid: document.querySelector('.dashboard-grid')
    };
  }

  // Set up event listeners
  initEventListeners() {
    // Quote refresh
    this.elements.refreshQuoteBtn.addEventListener('click', () => this.loadRandomQuote());
    
    // Quick action buttons
    this.elements.actionButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tool = e.currentTarget.getAttribute('data-tool');
        this.navigateToTool(tool);
      });
    });

    // Task completion toggling
    this.elements.recentTasks.addEventListener('click', (e) => {
      if (e.target.classList.contains('task-checkbox')) {
        this.toggleTaskCompletion(e.target);
      } else if (e.target.classList.contains('task-btn')) {
        e.preventDefault();
        const action = e.target.classList.contains('delete') ? 'delete' : 'edit';
        this.handleTaskAction(e.target.closest('.task-item'), action);
      }
    });

    // Note click handler
    this.elements.recentNotes.addEventListener('click', (e) => {
      if (e.target.closest('.note-item')) {
        const noteItem = e.target.closest('.note-item');
        if (!noteItem.classList.contains('add-note')) {
          this.openNoteEditor(noteItem.dataset.noteId);
        } else {
          this.navigateToTool('notes');
        }
      }
    });
  }

  // Load all dashboard data
  async loadDashboardData() {
    try {
      await Promise.all([
        this.loadStats(),
        this.loadRandomQuote(),
        this.loadWeatherData(),
        this.loadRecentTasks(),
        this.loadRecentNotes()
      ]);
      
      // Start periodic updates
      this.startPeriodicUpdates();
    } catch (error) {
      console.error('Dashboard initialization error:', error);
      this.showErrorState();
    }
  }

  // Load statistics data
  async loadStats() {
    try {
      const [tasks, expenses, goals] = await Promise.all([
        this.fetchTaskStats(),
        this.fetchExpenseStats(),
        this.fetchGoalStats()
      ]);

      this.elements.pendingTasks.textContent = tasks.pending;
      this.elements.monthlyExpense.textContent = `₹${expenses.monthly}`;
      this.elements.weeklyGoals.textContent = `${goals.progress}%`;
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  // Fetch task statistics
  async fetchTaskStats() {
    const tasks = await TaskManager.getAllTasks();
    const pending = tasks.filter(task => !task.completed).length;
    return { pending, total: tasks.length };
  }

  // Fetch expense statistics
  async fetchExpenseStats() {
    const now = new Date();
    const expenses = await ExpenseTracker.getMonthlyExpenses(now.getMonth(), now.getFullYear());
    const monthlyTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    return { monthly: monthlyTotal };
  }

  // Fetch goal statistics
  async fetchGoalStats() {
    const goals = await GoalTracker.getWeeklyGoals();
    if (goals.length === 0) return { progress: 0 };
    
    const completed = goals.filter(goal => goal.completed).length;
    const progress = Math.round((completed / goals.length) * 100);
    return { progress };
  }

  // Load random quote
  async loadRandomQuote() {
    try {
      this.elements.refreshQuoteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      
      const quotes = await this.fetchQuotes();
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      
      this.elements.dailyQuote.textContent = randomQuote.text;
      this.elements.quoteAuthor.textContent = randomQuote.author || 'Unknown';
      
      // Store last quote to prevent duplicates
      localStorage.setItem('lastQuote', JSON.stringify(randomQuote));
    } catch (error) {
      this.elements.dailyQuote.textContent = 'The only limit to our realization of tomorrow is our doubts of today.';
      this.elements.quoteAuthor.textContent = 'Franklin D. Roosevelt';
      console.error('Failed to load quote:', error);
    } finally {
      this.elements.refreshQuoteBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
    }
  }

  // Fetch quotes from API or fallback
  async fetchQuotes() {
    try {
      // Try to fetch from API first
      const response = await fetch('https://type.fit/api/quotes');
      if (!response.ok) throw new Error('API request failed');
      
      const quotes = await response.json();
      localStorage.setItem('cachedQuotes', JSON.stringify(quotes));
      localStorage.setItem('quotesLastUpdated', new Date().toISOString());
      return quotes;
    } catch (error) {
      // Fallback to cached quotes if available
      const cachedQuotes = localStorage.getItem('cachedQuotes');
      if (cachedQuotes) {
        const lastUpdated = new Date(localStorage.getItem('quotesLastUpdated'));
        const daysSinceUpdate = (new Date() - lastUpdated) / (1000 * 60 * 60 * 24);
        
        if (daysSinceUpdate < 7) {
          return JSON.parse(cachedQuotes);
        }
      }
      
      // Final fallback to hardcoded quotes
      return [
        { text: 'The only limit to our realization of tomorrow is our doubts of today.', author: 'Franklin D. Roosevelt' },
        { text: 'Life is what happens when you\'re busy making other plans.', author: 'John Lennon' },
        { text: 'The way to get started is to quit talking and begin doing.', author: 'Walt Disney' }
      ];
    }
  }

  // Load weather data
  async loadWeatherData() {
    try {
      const weather = await WeatherAPI.getCurrentWeather();
      this.updateWeatherDisplay(weather);
    } catch (error) {
      console.error('Failed to load weather:', error);
      this.elements.weatherSummary.textContent = 'Weather data unavailable';
      this.elements.smartSuggestion.textContent = 'Check your internet connection';
    }
  }

  // Update weather display
  updateWeatherDisplay(weather) {
    const { temp, condition, icon } = weather;
    const suggestion = this.generateWeatherSuggestion(weather);
    
    this.elements.weatherSummary.innerHTML = `
      <i class="fas ${icon}"></i> ${temp}°C, ${condition}
    `;
    
    this.elements.smartSuggestion.textContent = suggestion;
  }

  // Generate smart suggestion based on weather
  generateWeatherSuggestion(weather) {
    const { temp, condition, isDay } = weather;
    const hour = new Date().getHours();
    
    if (!isDay) {
      return 'Perfect evening for some relaxation or reading.';
    }
    
    if (temp > 30) {
      return 'Hot day! Stay hydrated and avoid prolonged sun exposure.';
    } else if (temp < 10) {
      return 'Bundle up! It\'s chilly outside.';
    }
    
    if (condition.toLowerCase().includes('rain')) {
      return 'Don\'t forget your umbrella if going out!';
    } else if (condition.toLowerCase().includes('sun')) {
      return 'Great day for outdoor activities!';
    }
    
    if (hour < 12) {
      return 'Good morning! Perfect time to tackle important tasks.';
    } else if (hour < 17) {
      return 'Afternoon energy dip? Try a short walk to refresh.';
    }
    
    return 'Nice weather! Good time to be productive.';
  }

  // Load recent tasks
  async loadRecentTasks() {
    try {
      const tasks = await TaskManager.getRecentTasks(5);
      this.renderRecentTasks(tasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      this.renderTaskError();
    }
  }

  // Render recent tasks
  renderRecentTasks(tasks) {
    if (tasks.length === 0) {
      this.elements.recentTasks.innerHTML = `
        <li class="task-item empty-state">
          <i class="fas fa-clipboard"></i>
          No recent tasks
        </li>
      `;
      return;
    }
    
    const tasksHtml = tasks.map(task => `
      <li class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
        <label class="task-label">${task.title}</label>
        <div class="task-actions">
          <button class="task-btn edit"><i class="fas fa-pencil-alt"></i></button>
          <button class="task-btn delete"><i class="fas fa-trash"></i></button>
        </div>
      </li>
    `).join('');
    
    this.elements.recentTasks.innerHTML = tasksHtml;
  }

  // Toggle task completion
  async toggleTaskCompletion(checkbox) {
    const taskItem = checkbox.closest('.task-item');
    const taskId = taskItem.dataset.taskId;
    const isCompleted = checkbox.checked;
    
    try {
      await TaskManager.updateTaskCompletion(taskId, isCompleted);
      taskItem.classList.toggle('completed', isCompleted);
      this.loadStats(); // Refresh stats
    } catch (error) {
      console.error('Failed to update task:', error);
      checkbox.checked = !isCompleted; // Revert UI on error
    }
  }

  // Handle task actions (edit/delete)
  async handleTaskAction(taskItem, action) {
    const taskId = taskItem.dataset.taskId;
    
    if (action === 'delete') {
      if (confirm('Are you sure you want to delete this task?')) {
        try {
          await TaskManager.deleteTask(taskId);
          taskItem.remove();
          this.loadStats(); // Refresh stats
          
          if (this.elements.recentTasks.children.length === 0) {
            this.renderRecentTasks([]);
          }
        } catch (error) {
          console.error('Failed to delete task:', error);
        }
      }
    } else {
      this.navigateToTool('todo', { edit: taskId });
    }
  }

  // Load recent notes
  async loadRecentNotes() {
    try {
      const notes = await NotesManager.getRecentNotes(6);
      this.renderRecentNotes(notes);
    } catch (error) {
      console.error('Failed to load notes:', error);
      this.renderNoteError();
    }
  }

  // Render recent notes
  renderRecentNotes(notes) {
    if (notes.length === 0) {
      this.elements.recentNotes.innerHTML = `
        <div class="note-item empty-state">
          <i class="fas fa-sticky-note"></i>
          No recent notes
        </div>
      `;
      return;
    }
    
    // Show max 5 notes + add button
    const notesToShow = notes.slice(0, 5);
    const notesHtml = notesToShow.map(note => `
      <div class="note-item" data-note-id="${note.id}">
        <div class="note-content">${this.truncateNoteContent(note.content)}</div>
        <div class="note-date">${this.formatNoteDate(note.updatedAt)}</div>
      </div>
    `).join('');
    
    // Add "add note" button
    const addNoteHtml = `
      <div class="note-item add-note">
        <i class="fas fa-plus"></i>
      </div>
    `;
    
    this.elements.recentNotes.innerHTML = notesHtml + addNoteHtml;
  }

  // Truncate note content for preview
  truncateNoteContent(content, maxLength = 60) {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  }

  // Format note date
  formatNoteDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return 'Today';
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Open note editor
  openNoteEditor(noteId) {
    this.navigateToTool('notes', { edit: noteId });
  }

  // Navigate to specific tool
  navigateToTool(tool, params = {}) {
    // Implementation depends on your SPA navigation system
    // Example using a router:
    // router.navigate(`/${tool}`, params);
    
    // For demo purposes, we'll just show an alert
    console.log(`Navigating to ${tool} tool`, params);
  }

  // Show error state
  showErrorState() {
    // Could show a nice error message to the user
    console.error('Dashboard failed to load completely');
  }

  // Start periodic updates
  startPeriodicUpdates() {
    // Update weather every 30 minutes
    this.weatherInterval = setInterval(() => this.loadWeatherData(), 30 * 60 * 1000);
    
    // Update stats every hour
    this.statsInterval = setInterval(() => this.loadStats(), 60 * 60 * 1000);
    
    // Update tasks/notes every 5 minutes
    this.dataInterval = setInterval(() => {
      this.loadRecentTasks();
      this.loadRecentNotes();
    }, 5 * 60 * 1000);
  }

  // Clean up intervals
  cleanup() {
    clearInterval(this.weatherInterval);
    clearInterval(this.statsInterval);
    clearInterval(this.dataInterval);
  }

  // Set up Intersection Observer for lazy loading
  setupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.dashboard-card').forEach(card => {
      observer.observe(card);
    });
  }

  // Set up service worker for offline support
  setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          console.log('ServiceWorker registration successful');
        }).catch(err => {
          console.log('ServiceWorker registration failed: ', err);
        });
      });
    }
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const dashboard = new Dashboard();
  
  // Clean up when navigating away
  window.addEventListener('beforeunload', () => {
    dashboard.cleanup();
  });
});

// Mock APIs for demonstration
class TaskManager {
  static async getAllTasks() {
    // In a real app, this would fetch from IndexedDB or backend API
    return JSON.parse(localStorage.getItem('tasks')) || [];
  }

  static async getRecentTasks(limit = 5) {
    const tasks = await this.getAllTasks();
    return tasks
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  static async updateTaskCompletion(taskId, completed) {
    const tasks = await this.getAllTasks();
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      task.completed = completed;
      task.updatedAt = new Date().toISOString();
      localStorage.setItem('tasks', JSON.stringify(tasks));
    }
  }

  static async deleteTask(taskId) {
    let tasks = await this.getAllTasks();
    tasks = tasks.filter(t => t.id !== taskId);
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }
}

class ExpenseTracker {
  static async getMonthlyExpenses(month, year) {
    // In a real app, this would fetch from IndexedDB or backend API
    return JSON.parse(localStorage.getItem('expenses')) || [];
  }
}

class GoalTracker {
  static async getWeeklyGoals() {
    // In a real app, this would fetch from IndexedDB or backend API
    return JSON.parse(localStorage.getItem('goals')) || [];
  }
}

class NotesManager {
  static async getRecentNotes(limit = 6) {
    // In a real app, this would fetch from IndexedDB or backend API
    const notes = JSON.parse(localStorage.getItem('notes')) || [];
    return notes
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, limit);
  }
}

class WeatherAPI {
  static async getCurrentWeather() {
    try {
      // Try to get precise location
      const position = await this.getPosition();
      const { latitude, longitude } = position.coords;
      
      // Fetch from weather API
      const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=YOUR_API_KEY`);
      if (!response.ok) throw new Error('Weather API failed');
      
      const data = await response.json();
      return this.formatWeatherData(data);
    } catch (error) {
      console.error('Weather fetch error:', error);
      // Return mock data as fallback
      return this.getMockWeatherData();
    }
  }

  static getPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      });
    });
  }

  static formatWeatherData(data) {
    const isDay = data.weather[0].icon.includes('d');
    const icon = this.getWeatherIcon(data.weather[0].id, isDay);
    
    return {
      temp: Math.round(data.main.temp),
      condition: data.weather[0].main,
      icon: icon,
      isDay: isDay,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed
    };
  }

  static getWeatherIcon(weatherId, isDay) {
    // Simplified icon mapping
    if (weatherId >= 200 && weatherId < 300) return 'fa-bolt';
    if (weatherId >= 300 && weatherId < 600) return 'fa-cloud-rain';
    if (weatherId >= 600 && weatherId < 700) return 'fa-snowflake';
    if (weatherId >= 700 && weatherId < 800) return 'fa-smog';
    if (weatherId === 800) return isDay ? 'fa-sun' : 'fa-moon';
    if (weatherId > 800) return 'fa-cloud';
    return 'fa-cloud-sun';
  }

  static getMockWeatherData() {
    const hour = new Date().getHours();
    const isDay = hour > 6 && hour < 20;
    
    return {
      temp: isDay ? 25 : 18,
      condition: isDay ? 'Sunny' : 'Clear',
      icon: isDay ? 'fa-sun' : 'fa-moon',
      isDay: isDay,
      humidity: 65,
      windSpeed: 12
    };
  }
}
