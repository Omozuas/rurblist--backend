const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcrypt'); // ADD THIS LINE
const User = require('../models/User');
const HomeSeeker = require('../models/HomeSeeker');
const SendEmails = require('../helper/email_sender');
const { nanoid } = require('nanoid');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id).then((user) => done(null, user));
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_URL}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;

        // ✅ 1. Check if user already has googleId
        let user = await User.findOne({ googleId: profile.id });
        if (user) return done(null, user);

        // ✅ 2. Check if user exists with same email (manual signup)
        user = await User.findOne({ email });

        if (user) {
          // 🔥 LINK GOOGLE ACCOUNT
          user.googleId = profile.id;

          // Optional: update profile image
          if (profile.photos?.[0]?.value) {
            user.profileImage = {
              url: profile.photos[0].value,
            };
          }

          await user.save();

          return done(null, user);
        }

        // ✅ 3. Create new user if none exists
        const randomPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        const profileImage = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

        const username = `${profile.displayName}_${nanoid(5)}`;

        const newUser = await User.create({
          googleId: profile.id,
          fullName: profile.displayName,
          email,
          password: hashedPassword,
          phoneNumber: null,
          isEmailVerified: true,
          profileImage: {
            url: profileImage,
          },
          username,
          roles: ['Home_Seeker'],
        });

        await HomeSeeker.create({
          user: newUser._id,
        });

        await SendEmails.sendWelcomeEmail(newUser.email, newUser.fullName);

        return done(null, newUser);
      } catch (error) {
        console.log(error);
        return done(error, null);
      }
    },
  ),
);
