async function fetchTasks() {
    const res = await fetch('/tasks');
    const tasks = await res.json();
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';
  
    tasks.forEach(task => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>ID: ${task.id} - ${task.task}</span>
        <button onclick="selectTask(${task.id}, '${task.task}')">Select</button>
      `;
      taskList.appendChild(li);
    });
  }
  
  document.getElementById('task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const taskDesc = document.getElementById('task-desc').value;
  
    await fetch('/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: taskDesc }) });
    fetchTasks();
  });
  
  function selectTask(id, task) {
    document.getElementById('task-id').value = id;
    document.getElementById('task-desc').value = task;
    document.getElementById('edit-btn').disabled = false;
    document.getElementById('delete-btn').disabled = false;
  }
  
  document.getElementById('edit-btn').addEventListener('click', async () => {
    const taskId = document.getElementById('task-id').value;
    const taskDesc = document.getElementById('task-desc').value;
  
    await fetch(`/tasks/${taskId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: taskDesc }) });
    fetchTasks();
  });
  
  document.getElementById('delete-btn').addEventListener('click', async () => {
    const taskId = document.getElementById('task-id').value;
  
    await fetch(`/tasks/${taskId}`, { method: 'DELETE' });
    fetchTasks();
  });
  
  fetchTasks();
  