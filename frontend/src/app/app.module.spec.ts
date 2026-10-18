import { AppModule } from "./app.module";

// Importing AppModule (and through it ModuleBlueprintModule) is what puts the
// NgModules into the AOT spec build: without them the non-standalone
// components have no compilation scope and their specs fail to compile
// (NG8002). The assertion itself is incidental.
describe("AppModule", () => {
  it("should create an instance", () => {
    const appModule = new AppModule({} as any);
    expect(appModule).toBeTruthy();
  });
});
