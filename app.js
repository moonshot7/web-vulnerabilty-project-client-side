// Import required modules
const express = require('express');
const session = require('express-session');
const fs = require('fs');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 3001;
const DATA_FILE = "./database.json";

app.use(express.json());
app.use(
  session({
    secret: 'mysecretkey',
    resave: false,
    saveUninitialized: true,
  })
);

// Serve static files
app.use('/public', express.static('public'));
app.use('/private/protected', express.static('private/protected')); // For /private/protected/style.css

app.use('/protected', (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).send('Unauthorized');
  }
  next();
});
app.use('/protected', express.static('private/protected'));

// Helper function to read data from JSON file
const readData = async () => {
  try {
    const data = await fs.promises.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading data:', err);
    return { users: [], tasks: [] };
  }
};

// Helper function to write data to JSON file
const writeData = async (data) => {
  try {
    await fs.promises.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing data:', err);
    throw err;
  }
};

// Home route
app.get('/', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/public/login.html');
  }
  res.redirect('/protected/index.html');
});

// Register route
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const data = await readData();
    const userExists = data.users.find((u) => u.username === username);

    if (userExists) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);
    data.users.push({ username, password: hashedPassword });
    await writeData(data);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const data = await readData();
    const user = data.users.find((u) => u.username === username);

    if (user && (await bcrypt.compare(password, user.password))) {
      req.session.user = user;
      return res.status(200).json({ message: 'Login successful' });
    } else {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/public/login.html');
});

// Get dashboard page (protected)
app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.status(401).send('Unauthorized');
  }
  res.redirect('/protected/dashboard.html');
});

// Get tasks for logged-in user
app.get('/tasks', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const data = await readData();
    const userTasks = data.tasks.filter(task => task.user === req.session.user.username);
    res.json(userTasks);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add task
app.post('/add', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { task } = req.body;
  if (!task) {
    return res.status(400).json({ error: 'Task description is required' });
  }

  try {
    const data = await readData();
    const taskId = Date.now();
    data.tasks.push({ id: taskId, task, user: req.session.user.username });
    await writeData(data);

    res.status(201).json({ message: 'Task added', taskId });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Edit task
app.put('/tasks/:id', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const taskId = parseInt(req.params.id, 10);
  const { task } = req.body;

  try {
    const data = await readData();
    const taskIndex = data.tasks.findIndex(t => t.id === taskId && t.user === req.session.user.username);

    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    data.tasks[taskIndex].task = task;
    await writeData(data);

    res.status(200).json({ message: 'Task updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete task
app.delete('/tasks/:id', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const taskId = parseInt(req.params.id, 10);

  try {
    const data = await readData();
    const filteredTasks = data.tasks.filter(t => t.id !== taskId || t.user !== req.session.user.username);

    if (filteredTasks.length === data.tasks.length) {
      return res.status(404).json({ error: 'Task not found or unauthorized' });
    }

    data.tasks = filteredTasks;
    await writeData(data);

    res.status(200).json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
