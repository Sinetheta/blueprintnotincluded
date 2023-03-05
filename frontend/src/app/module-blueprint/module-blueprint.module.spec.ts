import { ModuleBlueprintModule } from './module-blueprint.module';

describe('ModuleBlueprintModule', () => {
  let moduleBlueprintModule: ModuleBlueprintModule;

  beforeEach(() => {
    moduleBlueprintModule = new ModuleBlueprintModule();
  });

  it('should create an instance', () => {
    expect(moduleBlueprintModule).toBeTruthy();
  });
});
