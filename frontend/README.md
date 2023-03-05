# Blueprintnotincluded

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 8.3.8.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Localization
If you want to contribute translations to Blueprintnotincluded, you can edit files of your language in [i18n](./src/i18n). You can use Poedit to edit those XLF files. If the file for your language is not there, please create an issus. Alternatively you can add it by yourself in the following steps:
1. add your language in the `languages` field of [xliffmerge.json](./xliffmerge.json)
2. Run `npm run extract-i18n`
3. Add your language in [angular.json](./angular.json)(`projects.blueprintnotincluded.i18n.locales`)
4. To translate the in-game names (elements and buildings name etc.), an in-game string file (.po) should be added to [src\assets\strings](src\assets\strings). It should also be mentioned in [game-string-service.ts](src\app\module-blueprint\services\game-string-service.ts).
5. (Optional) To sever a localized build, a new configuration in [angular.json](./angular.json) is needed.
6. (Optional) Finally you can add the new language to the [top manual](src\app\module-blueprint\components\component-menu\component-menu.component.ts).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
