import path from 'path';
import { Request, Response } from "express";
import isbot from 'isbot'

import { WebsiteMeta } from './websiteMeta'
import { BlueprintModel } from './api/models/blueprint'
export class StaticController {
  constructor() {
    this.getHome = this.getHome.bind(this);
  }

  public getBlueprintThumbnail(req: Request, res: Response) {
    let id = req.params.blueprintId;
    BlueprintModel.model.findById(id)
      .then((blueprint) => {
        if (!blueprint) return res.status(404).send();
        var base64Data = blueprint.thumbnail.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
        var img = Buffer.from(base64Data, 'base64');
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': img.length
        });
        res.end(img);
      })
      .catch((err) => {
        console.log('Blueprint find error');
        console.log(err);
        res.status(500).json({ getBlueprint: 'ERROR' });
      });
  }

  public getHome(req: Request, res: Response) {
    const metaTags = new WebsiteMeta().getHtmlTags()
    this.serveHtml(req, res, { metaTags })
  }

  public serveHtml(req: Request, res: Response, locals = {}) {
    if (isbot(req.get('user-agent'))) {
      res.render('index-robots', locals);
    } else {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
  }
}
