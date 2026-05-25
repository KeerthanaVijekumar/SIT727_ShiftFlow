const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3003;
const publicPath = path.join(__dirname, 'public');

// Request logger
app.use((req, res, next) => {
  console.log(`[FRONTEND LOG] ${req.method} ${req.url}`);
  next();
});

// Config endpoint — empty strings so frontend uses proxy paths
app.get('/config.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`window.ENV = {
    ADMIN_API_URL: "/api/admin",
    AUTH_API_URL: "/api/auth",
    EMPLOYEE_API_URL: "/api/employee"
  };`);
});

// Proxy routes — uses internal Kubernetes DNS
app.use('/api/auth', createProxyMiddleware({
  target: process.env.AUTH_API_URL || 'http://auth-service:3000',
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '' }
}));

app.use('/api/admin', createProxyMiddleware({
  target: process.env.ADMIN_API_URL || 'http://admin-service:3000',
  changeOrigin: true,
  pathRewrite: { '^/api/admin': '' }
}));

app.use('/api/employee', createProxyMiddleware({
  target: process.env.EMPLOYEE_API_URL || 'http://employee-service:3000',
  changeOrigin: true,
  pathRewrite: { '^/api/employee': '' }
}));

// Version endpoint for liveness/readiness probes
app.get('/version', (req, res) => {
  res.json({ version: '1.0.0-frontend', updated: new Date().toISOString() });
});

// Root redirect to login
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Page routes
app.get('/login', (req, res) => {
  res.sendFile(path.join(publicPath, 'login', 'login.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(publicPath, 'admin', 'admin.html'));
});

app.get('/employee', (req, res) => {
  res.sendFile(path.join(publicPath, 'employee', 'employee.html'));
});

// Static files
app.use(express.static(publicPath));

// 404 handler
app.use((req, res) => {
  console.log(`[FRONTEND 404] ${req.method} ${req.url}`);
  res.status(404).send('404 - Not Found');
});

app.listen(PORT, () => {
  console.log(`Frontend running at http://localhost:${PORT}`);
});