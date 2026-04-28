const express = require('express');
const bodyPerser = require('body-parser');
// const session = require('express-session');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const dbConnect = require('./config/dbConnection');
const errorhandler = require('./middlewares/errorhandler');
const passport = require('passport');

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

//load env
dotenv.config();

//db connect
dbConnect();
require('./config/passport'); // Load Google strategy

const app = express();

app.set('query parser', 'extended');
//app use
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://192.168.1.161:3000',
      'https://rurblist.netlify.app',
      'https://rurblist-frontend.vercel.app',
    ],
    credentials: true,
  }),
);
app.use(morgan('dev'));
// 🔥🔥🔥 VERY IMPORTANT (WEBHOOK FIRST)
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(bodyPerser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
app.listen(process.env.PORT, () => {
  console.log(`rublist server is running on ${process.env.PORT}`);
});
