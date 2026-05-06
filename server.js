const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const compression = require('compression');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const dbConnect = require('./config/dbConnection');
const validateEnv = require('./config/validateEnv');
const errorhandler = require('./middlewares/errorhandler');
const passport = require('passport');

validateEnv();

//router paths
const Router = require('./routes/index');
const authRoutes = require('./routes/auth.route');
const userRoutes = require('./routes/user.route');
const propertyRoutes = require('./routes/property.route');
const agentRoutes = require('./routes/agent.route');
const paymentRoutes = require('./routes/payment.route');
const tourRoutes = require('./routes/tour.route');
const planRoutes = require('./routes/plan.route');
const verificationRoute = require('./routes/verification.route');
// require('./cron/pingServer');

const app = express();

const defaultOrigins = [
  'http://localhost:3000',
  'http://192.168.1.161:3000',
  'https://rurblist.netlify.app',
  'https://rurblist-frontend.vercel.app',
  'https://rurblist.co',
];
const envOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.set('query parser', 'extended');

//app use
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const corsError = new Error('Not allowed by CORS');
      corsError.statusCode = 403;
      return callback(corsError);
    },
    credentials: true,
  }),
);
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// VERY IMPORTANT: webhook raw body must be registered before JSON parsers.
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(passport.initialize());

//router
app.use(Router);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/property', propertyRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/tours', tourRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/verifications', verificationRoute);

//error handlers
app.use(errorhandler.notfound);
app.use(errorhandler.errorHandler);

//start server
const startServer = async () => {
  await dbConnect();
  require('./config/passport'); // Load Google strategy

  const port = process.env.PORT || 6003;
  app.listen(port, () => {
    console.log(`rurblist server is running on ${port}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
