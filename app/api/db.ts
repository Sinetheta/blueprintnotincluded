import mongoose from 'mongoose'
import { UserModel } from './models/user';
import { BlueprintModel } from './models/blueprint';

export class Database {
  constructor() {
    mongoose.connect(process.env.DB_URI as string, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }).catch((reason) => {
      console.log('Mongoose connection error: ' + reason);
    });
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to database');
      UserModel.init();
      BlueprintModel.init();
    });
    mongoose.connection.on('error', (err) => {
      console.log('Mongoose connection error: ' + err);
    });
    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected');
    });
  }
}
