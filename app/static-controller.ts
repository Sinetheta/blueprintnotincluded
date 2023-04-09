import path from 'path';
import { Request, Response } from "express";
import isbot from 'isbot'

import { WebsiteMeta } from './websiteMeta'
export class StaticController {
  constructor() {
    this.getHome = this.getHome.bind(this);
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
