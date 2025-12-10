const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const OAuth2Strategy = require('passport-oauth2').Strategy;
const User = require('../models/User');
const logger = require('../utils/logger');

// Serialize user for session
passport.serializeUser((user, done) => {
  logger.debug('Serializing user', { userId: user.id });
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    logger.debug('Deserializing user', { userId: id });
    const user = await User.findById(id);

    if (!user) {
      logger.warn('User not found during deserialization', { userId: id });
      return done(null, false);
    }

    done(null, user);
  } catch (error) {
    logger.logError(error, { context: 'passport.deserializeUser', userId: id });
    done(error, null);
  }
});

// Local Strategy
passport.use('local', new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
  },
  async (req, email, password, done) => {
    try {
      logger.debug('Local strategy authentication attempt', { email });

      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        logger.logAuth('login_attempt', null, false, { email, reason: 'user_not_found' });
        return done(null, false, { message: 'Invalid email or password' });
      }

      // Check if user needs to change password (temp password)
      if (user.createPassword) {
        logger.logAuth('login_attempt', user._id, false, { reason: 'password_change_required' });
        return done(null, false, {
          message: 'Password change required',
          requirePasswordChange: true
        });
      }

      // Check if user is OAuth-only (no password set)
      if (!user.canUsePasswordLogin()) {
        logger.logAuth('login_attempt', user._id, false, { reason: 'oauth_only_account' });
        return done(null, false, { message: 'This account uses social login. Please login with Google.' });
      }

      const isMatch = await user.checkPassword(password);
      if (!isMatch) {
        logger.logAuth('login_attempt', user._id, false, { reason: 'invalid_password' });
        return done(null, false, { message: 'Invalid email or password' });
      }

      logger.logAuth('login', user._id, true);
      return done(null, user);
    } catch (error) {
      logger.logError(error, { context: 'LocalStrategy', email });
      return done(error);
    }
  }
));

// Google OAuth2 Strategy using passport-oauth2
passport.use('google', new OAuth2Strategy(
  {
    authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenURL: 'https://oauth2.googleapis.com/token',
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
    scope: ['profile', 'email'],
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, params, profile, done) => {
    try {
      logger.debug('OAuth2 callback received', { hasAccessToken: !!accessToken });

      // Fetch user profile from Google's userinfo endpoint
      const https = require('https');

      const userProfile = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'www.googleapis.com',
          path: '/oauth2/v3/userinfo',
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        };

        const request = https.request(options, (response) => {
          let data = '';

          response.on('data', (chunk) => {
            data += chunk;
          });

          response.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              if (response.statusCode !== 200) {
                logger.error('Google userinfo API error', {
                  statusCode: response.statusCode,
                  response: parsed
                });
                reject(new Error(`Google API error: ${parsed.error?.message || 'Unknown error'}`));
              } else {
                resolve(parsed);
              }
            } catch (parseError) {
              logger.logError(parseError, { context: 'Google userinfo parse', data });
              reject(parseError);
            }
          });
        });

        request.on('error', (error) => {
          logger.logError(error, { context: 'Google userinfo request' });
          reject(error);
        });

        request.setTimeout(10000, () => {
          request.destroy();
          reject(new Error('Google userinfo request timeout'));
        });

        request.end();
      });

      logger.debug('Google profile fetched', {
        sub: userProfile.sub,
        email: userProfile.email
      });

      // Check if user already exists with this Google ID
      let user = await User.findOne({ googleId: userProfile.sub });

      if (user) {
        logger.logAuth('oauth_login', user._id, true, { provider: 'google', action: 'existing_user' });
        return done(null, user);
      }

      // Check if user exists with the same email
      const email = userProfile.email;

      if (email) {
        user = await User.findOne({ email: email.toLowerCase() });

        if (user) {
          // Link Google account to existing user
          logger.info('Linking Google account to existing user', { userId: user._id, email });

          user.googleId = userProfile.sub;
          if (!user.profilePicture && userProfile.picture) {
            user.profilePicture = userProfile.picture;
          }

          try {
            await user.save();
            logger.logAuth('oauth_link', user._id, true, { provider: 'google' });
            return done(null, user);
          } catch (saveError) {
            logger.logError(saveError, { context: 'OAuth user link save', userId: user._id });
            return done(saveError, null);
          }
        }
      }

      // Create new user from Google profile
      logger.info('Creating new user from Google OAuth', { email });

      const username = userProfile.name
        ? userProfile.name.replace(/\s+/g, '_').toLowerCase() + '_' + Date.now()
        : `user_${Date.now()}`;

      const newUser = new User({
        googleId: userProfile.sub,
        email: email ? email.toLowerCase() : `${userProfile.sub}@google.oauth`,
        username,
        firstName: userProfile.given_name || userProfile.name?.split(' ')[0] || 'User',
        lastName: userProfile.family_name || userProfile.name?.split(' ').slice(1).join(' ') || '',
        profilePicture: userProfile.picture || null,
        role: 'client',
        passwordHash: 'oauth_no_password',
        authProvider: 'google'
      });

      try {
        await newUser.save();
        logger.logAuth('oauth_signup', newUser._id, true, { provider: 'google', email });
        return done(null, newUser);
      } catch (saveError) {
        // Handle duplicate key errors
        if (saveError.code === 11000) {
          logger.warn('Duplicate key error during OAuth signup', {
            email,
            keyPattern: saveError.keyPattern
          });
          return done(null, false, { message: 'An account with this email already exists' });
        }
        logger.logError(saveError, { context: 'OAuth new user save', email });
        return done(saveError, null);
      }
    } catch (error) {
      logger.logError(error, { context: 'OAuth2Strategy verify' });
      return done(error, null);
    }
  }
));

// Custom error handler for passport
passport.handleError = (error, req, res) => {
  logger.logError(error, {
    context: 'passport.handleError',
    url: req.originalUrl,
    method: req.method
  });

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Authentication error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

module.exports = passport;
