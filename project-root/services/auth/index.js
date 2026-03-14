require('dotenv').config();
const express = require('express');
const connectDB = require('../../shared/db');
const authRoutes = require('./routes/auth.routes');

const app = express();

app.use(express.json());
app.use('/auth', authRoutes);

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Auth service running on port ${PORT}`);
    });
  });
}

module.exports = app;
