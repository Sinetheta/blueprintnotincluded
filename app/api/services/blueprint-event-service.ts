import mongoose from 'mongoose';
import { BlueprintEventModel, BlueprintEventType } from '../models/blueprint-event';
import { runInBackground } from './background-tasks';

export interface BlueprintEventParams {
  blueprintId: mongoose.Types.ObjectId | string;
  actorId: mongoose.Types.ObjectId | string;
  type: BlueprintEventType;
}

export class BlueprintEventService {
  // Fire-and-forget: called from controllers after their primary action
  // succeeds. Never let event logging fail the caller's request — the
  // returned promise never rejects.
  public static log(params: BlueprintEventParams): Promise<void> {
    return runInBackground(BlueprintEventService.write(params));
  }

  private static async write(params: BlueprintEventParams): Promise<void> {
    try {
      await BlueprintEventModel.model.create({
        blueprintId: params.blueprintId,
        actorId: params.actorId,
        type: params.type,
      });
    } catch (err) {
      console.log('blueprint event create error');
      console.log(err);
    }
  }
}
