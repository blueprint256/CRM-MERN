const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Local Strategy
passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password'
  },
  async (email, password, done) => {
    try {
      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      // Check if user needs to change password (temp password)
      if (user.createPassword) {
        return done(null, false, {
          message: 'Password change required',
          requirePasswordChange: true
        });
      }

      const isMatch = await user.checkPassword(password);
      if (!isMatch) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Google OAuth2 Strategy
passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
    scope: ['profile', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists with this Google ID
      let user = await User.findOne({ googleId: profile.id });

      if (user) {
        return done(null, user);
      }

      // Check if user exists with the same email
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;

      if (email) {
        user = await User.findOne({ email: email.toLowerCase() });

        if (user) {
          // Link Google account to existing user
          user.googleId = profile.id;
          if (!user.profilePicture && profile.photos && profile.photos[0]) {
            user.profilePicture = profile.photos[0].value;
          }
          await user.save();
          return done(null, user);
        }
      }

      // Create new user from Google profile
      const newUser = new User({
        googleId: profile.id,
        email: email ? email.toLowerCase() : `${profile.id}@google.oauth`,
        username: profile.displayName ? profile.displayName.replace(/\s+/g, '_').toLowerCase() + '_' + Date.now() : `user_${Date.now()}`,
        firstName: profile.name?.givenName || profile.displayName?.split(' ')[0] || 'User',
        lastName: profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '',
        profilePicture: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
        role: 'client',
        passwordHash: 'oauth_no_password', // OAuth users don't need password
        authProvider: 'google'
      });

      await newUser.save();
      return done(null, newUser);
    } catch (error) {
      return done(error, null);
    }
  }
));

module.exports = passport;
