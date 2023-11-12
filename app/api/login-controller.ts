import { Request, Response } from "express";
import { CallbackError } from "mongoose";
import { User, UserModel } from "./models/user";
import passport from 'passport';

export class LoginController {
  public login(req: Request, res: Response) {
    console.log('login' + req.clientIp);

    let reqAny = req as any;

    if (process.env.ENV_NAME != 'development' && (
      reqAny.recaptcha == null ||
      reqAny.recaptcha.error != null ||
      reqAny.recaptcha.data == null ||
      reqAny.recaptcha.data.action != 'login' ||
      !(reqAny.recaptcha.data.score > 0.5))) {
      console.log(reqAny.recaptcha);
      res.status(401).send();
    }
    else {
      passport.authenticate('local', function (err: CallbackError, user: User) {
        var token;
        // If Passport throws/catches an error
        if (err) {
          res.status(404).json(err);
          return;
        }

        // If a user is found
        if (user) {
          token = user.generateJwt();
          res.status(200);
          res.json({
            "token": token
          });
        } else {
          // If user is not found
          res.status(401).json();
        }
      })(req, res);
    }
  }
}
