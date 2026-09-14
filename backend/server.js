const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from current or root folder
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

const authRoutes = require('./routes/authRoutes');
const User = require('./models/User');
const gmailRoutes = require('./routes/gmailRoutes');
const emailRoutes = require('./routes/emailRoutes');
const aiRoutes = require('./routes/aiRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

const DEMO_ACCOUNT = {
  name: 'Demo User',
  email: 'demo@emailassistant.ai',
  password: 'DemoPass123!',
};

// Security & Parsing Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'Intelligent Email Assistant Backend',
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here'),
    googleOAuthConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/gmail', gmailRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/ai', aiRoutes);

// Centralized Error Handling
app.use(errorHandler);

async function ensureDemoAccount() {
  if (process.env.NODE_ENV === 'production') return;

  const existingUser = await User.findOne({ email: DEMO_ACCOUNT.email });
  if (!existingUser) {
    try {
      await User.create(DEMO_ACCOUNT);
      console.log(`✅ Development demo account created for ${DEMO_ACCOUNT.email}`);
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
  }
}

// Database Connection & Server Initialization
async function startServer() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/emailAssistant';

  try {
    console.log(`Connecting to MongoDB at: ${mongoUri}...`);
    // Connect with a 5 second timeout to quickly failover if no local daemon
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 4000 });
    console.log('✅ Connected to MongoDB successfully.');
  } catch (err) {
    console.warn('⚠️  Could not connect to external/local MongoDB instance:', err.message);
    console.log('🔄 Initializing in-memory MongoDB fallback (zero-config dev mode)...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const memoryUri = mongod.getUri();
      await mongoose.connect(memoryUri);
      console.log(`✅ Connected to in-memory MongoDB at: ${memoryUri}`);
    } catch (memErr) {
      console.error('❌ Failed to start in-memory MongoDB fallback:', memErr.message);
    }
  }

  await ensureDemoAccount();

  app.listen(PORT, () => {
    console.log(`🚀 Intelligent Email Assistant Backend running on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;
