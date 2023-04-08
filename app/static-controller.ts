import path from 'path';
import { Request, Response } from "express";
import isbot from 'isbot'

export class StaticController {
  public serveHtml(req: Request, res: Response) {
    if (isbot(req.get('user-agent'))) {
      res.render('index-robots');
    } else {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
  }
}
