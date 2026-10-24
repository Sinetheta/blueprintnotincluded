import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { BlueprintModel } from './models/blueprint';
import { BlueprintBookmarkModel } from './models/blueprint-bookmark';
import { UserJwt } from './models/user';
import { apiError } from './utils/apiError';
import { canViewBlueprint } from './utils/blueprint-visibility';
import { BookmarkResponse } from '../../lib/index';

// PUT / DELETE /api/blueprints/:id/bookmark — save a blueprint for later, or
// forget it. Idempotent both ways (an upsert and a delete), so a double
// click or a retry converges on the state the user last asked for.
export class BookmarkController {
  constructor() {
    this.add = this.add.bind(this);
    this.remove = this.remove.bind(this);
  }

  public async add(req: Request, res: Response): Promise<void> {
    await this.set(req, res, true);
  }

  public async remove(req: Request, res: Response): Promise<void> {
    await this.set(req, res, false);
  }

  private async set(req: Request, res: Response, saved: boolean): Promise<void> {
    try {
      if (BlueprintModel.model == null || BlueprintBookmarkModel.model == null) {
        res.status(503).send();
        return;
      }
      const user = req.user as UserJwt | undefined;
      if (user == null) {
        res.status(401).json(apiError(401, 'Authentication required'));
        return;
      }
      const blueprintId = String(req.params.id);
      if (!mongoose.Types.ObjectId.isValid(blueprintId)) {
        res.status(400).json(apiError(400, 'Invalid blueprint id'));
        return;
      }

      // Drafts are invisible to everyone but owner/admin — 404 (not 403) so
      // draft ids can't be probed via this endpoint, same as rating.
      const target = await BlueprintModel.model
        .findOne({ _id: blueprintId, deletedAt: null })
        .select('owner isPublished')
        .lean();
      if (target == null || !canViewBlueprint(target, user)) {
        res.status(404).json(apiError(404, 'Blueprint not found'));
        return;
      }

      const key = { blueprintId: new mongoose.Types.ObjectId(blueprintId), userId: user._id };
      if (saved) {
        await BlueprintBookmarkModel.model.updateOne(
          key,
          { $setOnInsert: { ...key, createdAt: new Date() } },
          { upsert: true }
        );
      } else {
        await BlueprintBookmarkModel.model.deleteOne(key);
      }
      const response: BookmarkResponse = { blueprintId, saved };
      res.json(response);
    } catch (err) {
      console.log('bookmark error');
      console.log(err);
      res.status(500).json(apiError(500, 'Failed to update bookmark'));
    }
  }

  // Batch "did I save this" lookup for a page of list items; one indexed
  // query, same shape as BlueprintController.getMyRatings.
  public static async getMySaved(
    blueprintIds: mongoose.Types.ObjectId[],
    userId: string
  ): Promise<Set<string>> {
    if (userId === '' || blueprintIds.length === 0 || BlueprintBookmarkModel.model == null)
      return new Set();
    const rows = await BlueprintBookmarkModel.model
      .find({ blueprintId: { $in: blueprintIds }, userId })
      .select('blueprintId')
      .lean();
    return new Set(rows.map(row => row.blueprintId.toString()));
  }
}
