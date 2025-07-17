document.addEventListener("DOMContentLoaded", () => {
  const taskForm = document.getElementById("todo-form");
  const taskInput = document.getElementById("todo-input");
  const dueDateInput = document.getElementById("due-date");
  const prioritySelect = document.getElementById("priority-select");
  const taskList = document.getElementById("todo-list");
  const taskCount = document.getElementById("task-count");
  const sortSelect = document.getElementById("sort-tasks");
  const filters = document.querySelectorAll(".filter-btn");
  const clearCompletedBtn = document.getElementById("clear-completed");
  const saveBtn = document.getElementById("save-tasks");
  const exportBtn = document.getElementById("export-tasks");

  const dashboardStats = {
    total: document.querySelector("#stat-total"),
    completed: document.querySelector("#stat-completed"),
    overdue: document.querySelector("#stat-overdue"),
  };

  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  let currentFilter = "all";

  function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
    renderTasks();
  }

  function generateId() {
    return Date.now().toString();
  }

  function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const overdue = tasks.filter(t => {
      return t.dueDate && !t.completed && new Date(t.dueDate) < new Date();
    }).length;

    if (dashboardStats.total) dashboardStats.total.textContent = total;
    if (dashboardStats.completed) dashboardStats.completed.textContent = completed;
    if (dashboardStats.overdue) dashboardStats.overdue.textContent = overdue;

    taskCount.textContent = `${total} task${total !== 1 ? "s" : ""}`;
  }

  function renderTasks() {
    taskList.innerHTML = "";

    const filtered = tasks.filter(task => {
      if (currentFilter === "active") return !task.completed;
      if (currentFilter === "completed") return task.completed;
      if (currentFilter === "overdue")
        return task.dueDate && !task.completed && new Date(task.dueDate) < new Date();
      return true;
    });

    if (filtered.length === 0) {
      const li = document.createElement("li");
      li.className = "todo-item empty-state";
      li.innerHTML = `<i class="fas fa-clipboard"></i>No tasks added yet`;
      taskList.appendChild(li);
      updateStats();
      return;
    }

    filtered.forEach(task => {
      const li = document.createElement("li");
      li.className = `todo-item ${task.completed ? "completed" : ""}`;
      li.dataset.taskId = task.id;
      li.dataset.priority = task.priority;

      li.innerHTML = `
        <div class="todo-priority priority-${task.priority}"></div>
        <input type="checkbox" class="todo-checkbox" ${task.completed ? "checked" : ""}>
        <label class="todo-label">${task.text}</label>
        ${task.dueDate ? `<span class="todo-due-date ${new Date(task.dueDate) < new Date() && !task.completed ? "overdue" : ""}">
          Due ${new Date(task.dueDate).toLocaleDateString()}
        </span>` : ""}
        <div class="todo-actions">
          <button class="todo-btn edit" title="Edit task"><i class="fas fa-pencil-alt"></i></button>
          <button class="todo-btn delete" title="Delete task"><i class="fas fa-trash"></i></button>
        </div>
      `;
      taskList.appendChild(li);
    });

    updateStats();
  }

  function addTask(e) {
    e.preventDefault();
    const text = taskInput.value.trim();
    const dueDate = dueDateInput.value;
    const priority = prioritySelect.value;

    if (!text) return;

    tasks.push({
      id: generateId(),
      text,
      completed: false,
      dueDate,
      priority,
      created: new Date().toISOString()
    });

    taskInput.value = "";
    dueDateInput.value = "";
    prioritySelect.value = "medium";
    saveTasks();
  }

  taskList.addEventListener("click", e => {
    const li = e.target.closest(".todo-item");
    const id = li?.dataset.taskId;
    if (!id) return;

    if (e.target.matches(".todo-checkbox")) {
      const task = tasks.find(t => t.id === id);
      task.completed = !task.completed;
      saveTasks();
    }

    if (e.target.closest(".delete")) {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
    }

    if (e.target.closest(".edit")) {
      const task = tasks.find(t => t.id === id);
      const newText = prompt("Edit Task", task.text);
      if (newText !== null && newText.trim() !== "") {
        task.text = newText.trim();
        saveTasks();
      }
    }
  });

  filters.forEach(btn =>
    btn.addEventListener("click", () => {
      filters.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderTasks();
    })
  );

  sortSelect.addEventListener("change", () => {
    const value = sortSelect.value;
    if (value === "due-date") {
      tasks.sort((a, b) => new Date(a.dueDate || Infinity) - new Date(b.dueDate || Infinity));
    } else if (value === "priority") {
      const rank = { high: 1, medium: 2, low: 3 };
      tasks.sort((a, b) => rank[a.priority] - rank[b.priority]);
    } else {
      tasks.sort((a, b) => new Date(a.created) - new Date(b.created));
    }
    renderTasks();
  });

  clearCompletedBtn.addEventListener("click", () => {
    tasks = tasks.filter(t => !t.completed);
    saveTasks();
  });

  saveBtn.addEventListener("click", () => {
    alert("Tasks saved locally.");
  });

  exportBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tasks.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  taskForm.addEventListener("submit", addTask);
  renderTasks();
});
