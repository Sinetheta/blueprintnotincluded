import * as fs from 'fs';
import {
  copySync // fs.cpSync available in Node v16.7.0
} from 'fs-extra';
import path from 'path';
import AdmZip from 'adm-zip';
import { BExport } from "../../../lib/index";
import { FixHtmlLabels } from "./fix-html-labels";
import { AddInfoIcons } from './add-info-icons';
import { GenerateIcons } from './generate-icons';
import { GenerateGroups } from './generate-groups';
import { GenerateWhite } from './generate-white';
import { GenerateRepack } from './generate-repack';
import { renameBuildings, updateJsonFile } from './database-massager';


const projectRoot = path.join(__dirname, '../../../../');
// Transform project relative path to absolute paths
const absolutePath = (projectPathFromRoot: string) => path.join(projectRoot, projectPathFromRoot);
const databasePath = absolutePath('export/database/database.json');
// Clean working export dir and unzip extract export.zip
const freshExport = () => {
  fs.rmdirSync(absolutePath('export'), { recursive: true });
  const zip = new AdmZip(absolutePath('export.zip'));
  zip.extractAllTo(absolutePath('/'));
}

// Move newly extracted images to the backend images directory
const replaceImages = () => {
  fs.rmdirSync(absolutePath('assets/images'), { recursive: true });
  fs.renameSync(absolutePath('export/images'), absolutePath('assets/images'))
  copySync(absolutePath('assets/manual'), absolutePath('assets/images'));
}

const generateDatabase = () => {
  new FixHtmlLabels(databasePath);
  new AddInfoIcons(databasePath);
  updateJsonFile(databasePath, (database: BExport) => {
    return renameBuildings(database, absolutePath('assets/manual-buildMenuRename.json'));
  })
}

const processImages = () => {
  new GenerateIcons(databasePath);
  new GenerateGroups(databasePath);
  new GenerateWhite(databasePath);
  new GenerateRepack(databasePath);
}

const replaceDatabase = () => {
  var zip = new AdmZip();
  zip.addLocalFile(databasePath);
  zip.writeZip('assets/database/database.zip');
  fs.copyFileSync('assets/database/database.zip', 'frontend/src/assets/database/database.zip');
  fs.copyFileSync('assets/database/database-repack.json', 'frontend/src/assets/database.json');
}

export const extractExport = () => {
  freshExport();
  replaceImages();
  generateDatabase();
  processImages();
  replaceDatabase();
}

// Only execute this script if loaded directly with node
if (require.main === module) {
  extractExport();
  console.log('extractExport complete')
}
