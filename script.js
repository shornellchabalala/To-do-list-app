document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const taskInput = document.getElementById('taskInput');
    const categorySelect = document.getElementById('categorySelect');
    const reminderInput = document.getElementById('reminderInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const statusBtns = document.querySelectorAll('.status-btn');
    const totalTasksSpan = document.getElementById('totalTasks');
    const completedTasksSpan = document.getElementById('completedTasks');
    const editModal = document.getElementById('editModal');
    const editTaskInput = document.getElementById('editTaskInput');
    const editCategorySelect = document.getElementById('editCategorySelect');
    const editReminderInput = document.getElementById('editReminderInput');
    const saveEditBtn = document.getElementById('saveEditBtn');
    const closeModal = document.querySelector('.close-modal');

    // State variables
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let currentFilter = 'all';
    let currentStatus = 'all';
    let taskToEdit = null;

    // Initialize the app
    function init() {
        renderTasks();
        updateStats();
        setupEventListeners();
        checkReminders();
    }

    // Set up event listeners
    function setupEventListeners() {
        // Add task
        addTaskBtn.addEventListener('click', addTask);
        taskInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') addTask();
        });

        // Filter buttons
        filterBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                filterBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentFilter = this.dataset.filter;
                renderTasks();
            });
        });

        // Status buttons
        statusBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                statusBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentStatus = this.dataset.status;
                renderTasks();
            });
        });

        // Modal events
        closeModal.addEventListener('click', closeEditModal);
        window.addEventListener('click', function(e) {
            if (e.target === editModal) {
                closeEditModal();
            }
        });
    }

    // Add a new task
    function addTask() {
        const taskText = taskInput.value.trim();
        const category = categorySelect.value;
        const reminder = reminderInput.value;
        
        if (taskText) {
            const newTask = {
                id: Date.now(),
                text: taskText,
                category: category,
                completed: false,
                reminder: reminder || null,
                createdAt: new Date().toISOString()
            };
            
            tasks.push(newTask);
            saveTasks();
            renderTasks();
            updateStats();
            
            // Reset input fields
            taskInput.value = '';
            reminderInput.value = '';
            taskInput.focus();
            
            // Check if reminder is set
            if (reminder) {
                scheduleReminderNotification(newTask);
            }
        }
    }

    // Render tasks based on filters
    function renderTasks() {
        taskList.innerHTML = '';
        
        let filteredTasks = tasks;
        
        // Apply category filter
        if (currentFilter !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.category === currentFilter);
        }
        
        // Apply status filter
        if (currentStatus === 'active') {
            filteredTasks = filteredTasks.filter(task => !task.completed);
        } else if (currentStatus === 'completed') {
            filteredTasks = filteredTasks.filter(task => task.completed);
        }
        
        // Sort tasks: incomplete first, then by creation date
        filteredTasks.sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            return new Date(a.createdAt) - new Date(b.createdAt);
        });
        
        if (filteredTasks.length === 0) {
            taskList.innerHTML = '<li class="no-tasks">No tasks found. Add a new task!</li>';
            return;
        }
        
        filteredTasks.forEach(task => {
            const taskItem = document.createElement('li');
            taskItem.className = `task-item ${task.category} ${task.completed ? 'completed' : ''}`;
            taskItem.dataset.id = task.id;
            
            const reminderDate = task.reminder ? new Date(task.reminder) : null;
            const now = new Date();
            const isReminderPassed = reminderDate && reminderDate < now;
            
            taskItem.innerHTML = `
                <div class="task-content">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                    <span class="task-text ${task.completed ? 'completed' : ''}">${task.text}</span>
                    <span class="task-category category-${task.category}">${task.category}</span>
                </div>
                ${task.reminder ? `
                    <div class="task-reminder ${isReminderPassed ? 'reminder-passed' : ''}">
                        <i class="fas fa-bell"></i>
                        ${formatReminderDate(task.reminder)}
                    </div>
                ` : ''}
                <div class="task-actions">
                    <button class="edit-btn"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn"><i class="fas fa-trash"></i></button>
                </div>
            `;
            
            taskList.appendChild(taskItem);
            
            // Add event listeners to the new task
            const checkbox = taskItem.querySelector('.task-checkbox');
            const editBtn = taskItem.querySelector('.edit-btn');
            const deleteBtn = taskItem.querySelector('.delete-btn');
            
            checkbox.addEventListener('change', function() {
                toggleTaskComplete(task.id, this.checked);
            });
            
            editBtn.addEventListener('click', function() {
                openEditModal(task);
            });
            
            deleteBtn.addEventListener('click', function() {
                deleteTask(task.id);
            });
        });
    }

    // Toggle task completion status
    function toggleTaskComplete(taskId, isCompleted) {
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
            tasks[taskIndex].completed = isCompleted;
            saveTasks();
            renderTasks();
            updateStats();
        }
    }

    // Delete a task
    function deleteTask(taskId) {
        tasks = tasks.filter(task => task.id !== taskId);
        saveTasks();
        renderTasks();
        updateStats();
    }

    // Open edit modal
    function openEditModal(task) {
        taskToEdit = task;
        editTaskInput.value = task.text;
        editCategorySelect.value = task.category;
        editReminderInput.value = task.reminder || '';
        editModal.style.display = 'block';
    }

    // Close edit modal
    function closeEditModal() {
        editModal.style.display = 'none';
        taskToEdit = null;
    }

    // Save edited task
    saveEditBtn.addEventListener('click', function() {
        if (taskToEdit) {
            const taskIndex = tasks.findIndex(task => task.id === taskToEdit.id);
            if (taskIndex !== -1) {
                tasks[taskIndex].text = editTaskInput.value.trim();
                tasks[taskIndex].category = editCategorySelect.value;
                tasks[taskIndex].reminder = editReminderInput.value || null;
                
                saveTasks();
                renderTasks();
                closeEditModal();
                
                // Reschedule reminder if changed
                if (tasks[taskIndex].reminder) {
                    scheduleReminderNotification(tasks[taskIndex]);
                }
            }
        }
    });

    // Update task statistics
    function updateStats() {
        totalTasksSpan.textContent = tasks.length;
        const completedCount = tasks.filter(task => task.completed).length;
        completedTasksSpan.textContent = completedCount;
    }

    // Save tasks to localStorage
    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    // Format reminder date for display
    function formatReminderDate(reminder) {
        const date = new Date(reminder);
        return date.toLocaleString();
    }

    // Schedule reminder notification
    function scheduleReminderNotification(task) {
        const reminderTime = new Date(task.reminder).getTime();
        const now = new Date().getTime();
        const timeUntilReminder = reminderTime - now;
        
        if (timeUntilReminder > 0) {
            setTimeout(() => {
                if (Notification.permission === 'granted') {
                    new Notification('Task Reminder', {
                        body: `Don't forget: ${task.text}`,
                        icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063188.png'
                    });
                } else if (Notification.permission !== 'denied') {
                    Notification.requestPermission().then(permission => {
                        if (permission === 'granted') {
                            new Notification('Task Reminder', {
                                body: `Don't forget: ${task.text}`,
                                icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063188.png'
                            });
                        }
                    });
                }
                
                // Play notification sound
                const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3');
                audio.play();
                
                // Update task in list to show reminder has passed
                const taskIndex = tasks.findIndex(t => t.id === task.id);
                if (taskIndex !== -1) {
                    renderTasks();
                }
            }, timeUntilReminder);
        }
    }

    // Check for passed reminders on page load
    function checkReminders() {
        tasks.forEach(task => {
            if (task.reminder) {
                const reminderTime = new Date(task.reminder).getTime();
                const now = new Date().getTime();
                
                if (reminderTime < now) {
                    // Reminder has passed
                    renderTasks();
                } else {
                    // Reschedule reminder
                    scheduleReminderNotification(task);
                }
            }
        });
    }

    // Request notification permission on page load
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }

    // Initialize the app
    init();
});