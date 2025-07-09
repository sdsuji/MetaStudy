const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const userRoutes = require('./routes/userRoutes');
const verifyRoutes = require('./routes/verify');
require('dotenv').config();

app.use(cors({
  origin: 'http://localhost:5173', // frontend URL
  credentials: true
}));
// Middleware
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/users', verifyRoutes);
// MongoDB connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on http://localhost:${process.env.PORT || 5000}`);
    });
  })
  .catch(err => console.error(err));
