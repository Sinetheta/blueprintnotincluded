import mongoose, { Schema, Document, Model } from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto-js'
import jwt from 'jsonwebtoken'

export interface User extends Document {
  email?: string;
  username?: string;
  password?: string;
  hash?: string;
  salt: string;

  setPassword(password: string): void;
  validPassword(password: string): boolean;
  generateJwt(): string;
}

export class UserModel {
  static model: Model<User>;
  public static init() {
    let userSchema = new mongoose.Schema<User>({
      email: {
        type: String,
        unique: true,
        required: true
      },
      username: {
        type: String,
        unique: true,
        required: true
      },
      hash: String,
      salt: String
    });

    userSchema.methods.setPassword = function (this: User, password: string): void {
      this.salt = crypto.lib.WordArray.random(16).toString();
      this.hash = crypto.PBKDF2(password, this.salt, { keySize: 512 / 32 }).toString(crypto.enc.Hex);
    };

    userSchema.methods.validPassword = function (this: User, password: string): boolean {
      var hash = crypto.PBKDF2(password, this.salt, { keySize: 512 / 32 }).toString(crypto.enc.Hex);
      return this.hash === hash;
    };

    userSchema.methods.generateJwt = function (): string {
      var expiry = new Date();
      expiry.setDate(expiry.getDate() + 7);

      let userJwt: UserJwt = {
        _id: this._id,
        email: this.email || '',
        username: this.username || '',
        exp: expiry.getTime() / 1000
      }
      return jwt.sign(userJwt, process.env.JWT_SECRET as string); // DO NOT KEEP YOUR SECRET IN THE CODE!
    };

    UserModel.model = mongoose.model<User>('User', userSchema);
  }

  public static isUser(obj: User | any): obj is User {
    return (obj && obj.username && typeof obj.username === 'string');
  }
}

export interface UserJwt {
  _id: string;
  email: string;
  username: string;
  exp: number;
}
