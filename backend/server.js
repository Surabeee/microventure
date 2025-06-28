require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import middleware
const { adventureErrorHandler, simpleRateLimit } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration - Allow your frontend
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173', 
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Basic middleware
app.use(express.json({ limit: '10mb' }));

// Trust proxy for rate limiting (if behind a proxy)
app.set('trust proxy', 1);

// Apply rate limiting to API routes
app.use('/api', simpleRateLimit);

// Import routes
const adventureRoutes = require('./routes/adventureRoutes');
const directionsRoutes = require('./routes/directionsRoutes');

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Micro-Adventure API is running',
    version: '2.0.0',
    aiProvider: 'Google Gemini',
    status: 'healthy',
    endpoints: {
      generateAdventure: 'POST /api/adventure/generate',
      getDirections: 'POST /api/directions'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      ai: process.env.GEMINI_API_KEY ? 'configured' : 'missing',
      maps: process.env.MAPBOX_ACCESS_TOKEN ? 'configured' : 'missing'
    },
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      providers: {
        ai: 'Google Gemini',
        maps: 'Mapbox Complete',
        geocoding: 'Mapbox',
        directions: 'Mapbox', 
        places: 'Mapbox Search Box'
      }
    }
  };
  
  res.json(health);
});

// API routes
app.use('/api/adventure', adventureRoutes);
app.use('/api/directions', directionsRoutes);

// 404 handler for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The requested route ${req.originalUrl} does not exist`,
    code: 'ROUTE_NOT_FOUND'
  });
});

// Error handling middleware (must be last)
app.use(adventureErrorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🤖 AI Provider: Google Gemini`);
  console.log(`🗺️ Maps Provider: Mapbox (Complete Solution)`);
  console.log(`📍 Health Check: http://localhost:${PORT}/health`);
  
  // Validate environment variables
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  GEMINI_API_KEY not found - adventure generation will fail');
  }
  
  if (!process.env.MAPBOX_ACCESS_TOKEN) {
    console.warn('⚠️  MAPBOX_ACCESS_TOKEN not found - all location services will fail');
  }
  
  if (process.env.GEMINI_API_KEY && process.env.MAPBOX_ACCESS_TOKEN) {
    console.log('✅ All required API keys found');
    console.log('🎯 Services: Geocoding ✓ Directions ✓ Places ✓');
  }
});