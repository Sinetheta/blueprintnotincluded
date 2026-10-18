import { AddMassUnitPipe } from "./add-mass-unit.pipe";

describe("AddMassUnitPipe", () => {
  const pipe = new AddMassUnitPipe();

  // Input is kilograms; the unit switches at 5 kg and at 5 tonnes.
  it.each([
    [0.25, "250 Grams"],
    [4.999, "4999 Grams"],
    [5, "5 Kg"],
    [4999.9, "4999.9 Kg"],
    [5000, "5 Tons"],
    [1234567, "1234.6 Tons"],
  ])("formats %s kg as %s", (kg, text) => {
    expect(pipe.transform(kg)).toBe(text);
  });
});
