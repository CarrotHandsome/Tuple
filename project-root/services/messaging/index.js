require('dotenv').config();
const express = require('express');
const connectDB = require('../../shared/db');
const messagingRoutes = require('./routes/messaging.routes');

const app = express();

app.use(express.json());
app.use('/messages', messagingRoutes);

const PORT = process.env.PORT || 3003;

if (require.main === module) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Messaging service running on port ${PORT}`);
    });
  });
}

module.exports = app;
