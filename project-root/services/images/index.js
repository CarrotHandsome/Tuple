require('dotenv').config();
const express = require('express');
const path = require('path');
const connectDB = require('../../shared/db');
const imagesRoutes = require('./routes/images.routes');



const app = express();

app.use(express.json());

// Serve uploaded files as static assets
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/images', imagesRoutes);

// Handle multer errors
app.use((err, req, res, next) => {
  if (err.message === 'Only image files are allowed.') {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

const PORT = process.env.PORT || 3005;

if (require.main === module) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Images service running on port ${PORT}`);
    });
  });
}

module.exports = app;
