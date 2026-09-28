const dns = require('dns');
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const screeningRoutes = require('./routes/screeningRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();


const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

if (process.env.CLIENT_URL) {
  process.env.CLIENT_URL.split(',').map(s => s.trim()).filter(Boolean).forEach(url => {
    allowedOrigins.push(url);
  });
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(origin) ||
      /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/screening', screeningRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'DermaScan AI Backend API is running successfully',
    health: '/health'
  });
});

const { getSmtpDiagnosticStatus, verifySmtpOnStartup } = require('./config/emailService');

app.get('/health', async (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  const smtp = await getSmtpDiagnosticStatus();
  res.json({
    status: isConnected && smtp.configured && smtp.verifyStatus === 'connected' ? 'ok' : 'degraded',
    message: isConnected
      ? 'DermaScan AI backend is running and connected to database'
      : 'DermaScan AI backend is running but database is disconnected',
    database: isConnected ? 'connected' : 'disconnected',
    readyState: mongoose.connection.readyState,
    smtp: {
      configured: smtp.configured,
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      ipFamily: smtp.ipFamily,
      resolvedIp: smtp.resolvedIp,
      sender: smtp.sender,
      status: smtp.verifyStatus,
      detail: smtp.verifyMessage,
    },
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
  res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});

app.listen(PORT, () => {
  console.log(`[Server] DermaScan AI backend is running on http://localhost:${PORT}`);
  verifySmtpOnStartup();
});

