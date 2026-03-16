require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use(cors());

app.use('/auth', createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
  on: {
    proxyReq: (proxyReq, req) => {
      proxyReq.path = '/auth' + req.path;
    }
  }
}));

app.use('/groups', createProxyMiddleware({
  target: 'http://localhost:3002',
  changeOrigin: true,
  on: {
    proxyReq: (proxyReq, req) => {
      proxyReq.path = '/groups' + req.path;
    }
  }
}));

app.use('/messages', createProxyMiddleware({
  target: 'http://localhost:3003',
  changeOrigin: true,
  on: {
    proxyReq: (proxyReq, req) => {
      proxyReq.path = '/messages' + req.path;
    }
  }
}));

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

const PORT = 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
  });
}

module.exports = app;