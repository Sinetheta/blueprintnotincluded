import { Request, Response } from "express";
import { CallbackError } from "mongoose";
import { User, UserModel } from "./models/user";

export class DuplicateCheckController {

  public checkUsername(req: Request, res: Response) {
    // If we can't access mongoose, assume the username is not present
    if (UserModel.model == null) res.json({ usernameExists: false });
    else UserModel.model.find({ username: String(req.query.username) }, (err: CallbackError, users: User[]) => {
      if (users.length) res.json({ usernameExists: true });
      else res.json({ usernameExists: false });
    });
  }
}
