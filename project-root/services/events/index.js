require('dotenv').config();
const express = require('express');
const connectDB = require('../../shared/db');
const eventsRoutes = require('./routes/events.routes');

const app = express();

app.use(express.json());
app.use('/events', eventsRoutes);

const PORT = process.env.PORT || 3004;

if (require.main === module) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Events service running on port ${PORT}`);
    });
  });
}

module.exports = app;
