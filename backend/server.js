require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
const adventureRoutes = require('./routes/adventureRoutes');
app.use('/api/adventure', adventureRoutes);

// Routes
app.get('/', (req, res) => {
  res.send('Micro-Adventure API is running');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const directionsRoutes = require('./routes/directionsRoutes');
app.use('/api/directions', directionsRoutes);