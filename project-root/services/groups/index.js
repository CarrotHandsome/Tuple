require('dotenv').config();
const express = require('express');
const connectDB = require('../../shared/db');
const groupsRoutes = require('./routes/groups.routes');

const app = express();

app.use(express.json());
app.use('/groups', groupsRoutes);

const PORT = process.env.PORT || 3002;

if (require.main === module) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Groups service running on port ${PORT}`);
    });
  });
}

module.exports = app;
