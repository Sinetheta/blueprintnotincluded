import { Blueprint } from '../models/blueprint';
import { Vector2, MdbBlueprint } from '../../../lib/index';

export class BatchUtils {
  static UpdateBasedOn(suspect: Blueprint, blueprints: Blueprint[], indexMax: number) {
    let suspectData = suspect.data as MdbBlueprint;

    suspect.isCopy = undefined;
    suspect.copyOf = undefined;

    let isCopy: boolean = false;
    for (let indexOriginal = 0; indexOriginal < indexMax; indexOriginal++) {
      //console.log('====> Comparing with blueprint : ' + blueprints[indexOriginal].name);
      let originalData = blueprints[indexOriginal].data as MdbBlueprint;

      let nbPresent = 0;
      for (
        let indexOriginalBuilding = 0;
        indexOriginalBuilding < originalData.blueprintItems.length;
        indexOriginalBuilding++
      ) {
        let originalBuilding = originalData.blueprintItems[indexOriginalBuilding];

        for (let suspectBuilding of suspectData.blueprintItems) {
          if (
            suspectBuilding.id == originalBuilding.id &&
            Vector2.compare(suspectBuilding.position, originalBuilding.position)
          ) {
            nbPresent++;
            break;
          }
        }
      }

      if (
        originalData.blueprintItems.length > 15 &&
        nbPresent >= 0.75 * originalData.blueprintItems.length
      ) {
        isCopy = true;
        console.log(
          '====> Probably a copy of  : ' + indexOriginal + ' : ' + blueprints[indexOriginal].name
        );
        suspect.isCopy = true;
        suspect.copyOf = blueprints[indexOriginal].id;
        suspect
          .save()
          .then(() => {})
          .catch(() => {
            console.log('====> Save Error ');
          });
      }

      //console.log('====> ' + nbPresent);
      if (isCopy) break;
    }
  }

  // Shifts building positions past the ±8000 bounds back by 9999, in place.
  // Returns whether anything moved. Tolerates data with no blueprintItems.
  static correctPositions(data: MdbBlueprint | null | undefined): boolean {
    const items = data?.blueprintItems;
    if (!Array.isArray(items)) return false;

    let corrected = false;
    for (let building of items) {
      if (building.position != null && building.position.x > 8000) {
        building.position.x = building.position.x - 9999;
        corrected = true;
      }

      if (building.position != null && building.position.y < -8000) {
        building.position.y = building.position.y + 9999;
        corrected = true;
      }
    }
    return corrected;
  }

  static UpdatePositionCorrection(toCorrect: Blueprint) {
    console.log('Analysing blueprints : ' + toCorrect.name);

    let toCorrectData = toCorrect.data as MdbBlueprint;

    if (BatchUtils.correctPositions(toCorrectData)) {
      toCorrect.data = toCorrectData;
      toCorrect.markModified('data');
      toCorrect
        .save()
        .then(() => {
          console.log('Save OK : ' + toCorrect.name);
        })
        .catch(() => {
          console.log('====> Save Error ');
        });
    }
  }
}
