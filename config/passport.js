const passport = require('passport');
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const bcrypt = require('bcrypt');  // ADD THIS LINE
const User = require('../models/User');
const SendEmails = require('../helper/email_sender');
const { nanoid } = require("nanoid");


passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id).then(user => done(null, user));
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.SERVER_URL}/api/auth/google/callback`  // Absolute URL
}, async (accessToken, refreshToken, profile, done) => {
  try {  // ADD TRY-CATCH
    const existingUser = await User.findOne({ googleId: profile.id });
    if (existingUser) return done(null, existingUser);
    
    const randomPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(randomPassword, 10);
    const profileImage = profile.photos && profile.photos[0] ? profile.photos[0].value : null;
    const username = `${baseUsername}_${nanoid(5)}`;
    const newUser = await User.create({
      googleId: profile.id,
      fullName: profile.displayName,
      email: profile.emails[0].value,
      password: hashedPassword,
      phoneNumber: 'google-oauth',
      isEmailVerified: true,
      profileImage:{
        url: profileImage
      },
      username:username
    });
     // send welcome email
  await SendEmails.sendWelcomeEmail(
    newUser.email,
    newUser.fullName
  );
    done(null, newUser);
  } catch (error) {
    console.log(error)
    done(error, null);  // Handle errors
  }
}));
