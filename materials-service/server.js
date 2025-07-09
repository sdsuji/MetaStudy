const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const materialRoutes = require('./routes/materialRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/materials', materialRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/materialsdb')
  .then(() => console.log('MongoDB connected (materials-service)'))
  .catch((err) => console.error(err));

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`Materials service running on port ${PORT}`));
