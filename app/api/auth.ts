import { CallbackError } from 'mongoose';
import passport from 'passport';
import { Strategy } from 'passport-local'
import { User, UserModel } from './models/user';

export class Auth {
  constructor() {
    let localStrategy = new Strategy(
      function (username, password, done) {
        UserModel.model.findOne({ username: username }, function (err: CallbackError, user: User) {

          if (err) { return done(err); }

          // Return if user not found in database
          if (!user) {
            return done(null, false, {
              message: 'User not found'
            });
          }

          // Return if password is wrong
          if (!user.validPassword(password)) {
            return done(null, false, {
              message: 'Password is wrong'
            });
          }

          // If credentials are correct, return the user object
          return done(null, user);
        });
      }
    );

    passport.use(localStrategy);
  }
}
