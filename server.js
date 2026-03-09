const express = require('express');
const bodyPerser=require('body-parser');
// const session = require('express-session');
const dotenv = require('dotenv');
const cors =require('cors');
const cookieParser = require('cookie-parser')
const morgan = require('morgan');
const dbConnect =require('./config/dbConnection');
const errorhandler =require('./middlewares/errorhandler');
const passport=require('passport')


//router paths
const Router=require('./routes/index');
const authRoutes = require('./routes/auth.route');
const userRoutes = require('./routes/user.route');
const propertyRoutes = require('./routes/property.route');

//load env 
dotenv.config();

//db connect
dbConnect();
require('./config/passport'); // Load Google strategy

const app=express();

//app use
app.use(cors({
    origin: [
    "http://localhost:3000",
    "http://192.168.1.161:3000"
    ],
    credentials: true
}));
app.use(morgan('dev'));
app.use(bodyPerser.json());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
app.use(passport.initialize());


//router
app.use(Router);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/property', propertyRoutes);

//error handlers
app.use(errorhandler.notfound);
app.use(errorhandler.errorHandler);



//start server
app.listen(process.env.PORT ,()=>{
    console.log(`rublist server is running on ${process.env.PORT}`)
});
