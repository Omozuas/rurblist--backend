const dotenv = require('dotenv');
dotenv.config();

const dbConnect = require('./src/config/dbConnection');
const validateEnv = require('./src/config/validateEnv');

const createApp = require('./src/app');

validateEnv();

require('./src/jobs/pingServer');

// start server
const startServer = async () => {
  await dbConnect();
  require('./src/config/passport'); // Load Google strategy

  const app = createApp();

  const port = process.env.PORT || 6003;
  app.listen(port, () => {
    console.log(`rurblist server is running on ${port}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
