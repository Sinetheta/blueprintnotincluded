import mongoose, { Schema, Document, Model } from 'mongoose';

// One document per user+blueprint: "I want to find this again". The
// zero-cost engagement signal — no stars to decide on, no comment to write —
// and the seed of collections later (spec: collections). Private to the
// user: nothing exposes who saved what, and no count is denormalized onto
// the blueprint, so saving stays a bookmark rather than a vote.
export interface BlueprintBookmark extends Document {
  blueprintId: mongoose.Types.ObjectId;
  userId: string;
  createdAt: Date;
}

export class BlueprintBookmarkModel {
  static model: Model<BlueprintBookmark>;

  public static init() {
    const bookmarkSchema = new mongoose.Schema({
      blueprintId: { type: Schema.Types.ObjectId, ref: 'Blueprint', required: true },
      userId: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    });

    // One bookmark per user per blueprint; also the "did I save this" lookup
    bookmarkSchema.index({ blueprintId: 1, userId: 1 }, { unique: true });
    // "Saved" profile tab, newest first
    bookmarkSchema.index({ userId: 1, createdAt: -1 });

    BlueprintBookmarkModel.model =
      (mongoose.models['BlueprintBookmark'] as Model<BlueprintBookmark>) ??
      mongoose.model<BlueprintBookmark>('BlueprintBookmark', bookmarkSchema);
  }
}
