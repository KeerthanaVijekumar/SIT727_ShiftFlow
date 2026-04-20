const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3003;

const publicPath = path.join(__dirname, 'public');

app.use((req, res, next) => {
  console.log(`[FRONTEND LOG] ${req.method} ${req.url}`);
  next();
});

// Inject environment config for frontend JS
app.get('/config.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`window.ENV = {
    ADMIN_API_URL: "${process.env.ADMIN_API_URL || 'http://admin-service:3000'}",
    AUTH_API_URL: "${process.env.AUTH_API_URL || 'http://auth-service:3000'}",
    EMPLOYEE_API_URL: "${process.env.EMPLOYEE_API_URL || 'http://employee-service:3000'}"
  };`);
});

app.use(express.static(publicPath));

app.get('/login', (req, res) => {
  res.sendFile(path.join(publicPath, 'login', 'login.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(publicPath, 'admin', 'admin.html'));
});

app.get('/employee', (req, res) => {
  res.sendFile(path.join(publicPath, 'employee', 'employee.html'));
});

// Version endpoint for liveness/readiness probes
app.get('/version', (req, res) => {
  res.json({ version: '1.0.0-frontend', updated: new Date().toISOString() });
});

app.use((req, res) => {
  console.log(`[FRONTEND 404] ${req.method} ${req.url}`);
  res.status(404).send('404 - Not Found');
});

app.listen(PORT, () => {
  console.log(`Frontend running at http://localhost:${PORT}`);
});