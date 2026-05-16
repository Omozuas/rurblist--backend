const bcrypt = require('bcrypt');
const { nanoid } = require('nanoid');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const HomeSeeker = require('../models/HomeSeeker');
const User = require('../models/User');
const SendEmails = require('../services/email/emailService');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_URL}/api/v1/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(new Error('Google account did not provide an email'), null);
        }

        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          return done(null, user);
        }

        user = await User.findOne({ email });

        if (user) {
          user.googleId = profile.id;

          if (profile.photos?.[0]?.value) {
            user.profileImage = {
              url: profile.photos[0].value,
            };
          }

          await user.save();

          return done(null, user);
        }

        const randomPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
        const profileImage = profile.photos?.[0]?.value || null;
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
        return done(error, null);
      }
    },
  ),
);
