import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { ItemCollectionInfoComponent } from "./item-collection-info.component";

describe("ItemCollectionInfoComponent", () => {
  let component: ItemCollectionInfoComponent;
  let fixture: ComponentFixture<ItemCollectionInfoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ItemCollectionInfoComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ItemCollectionInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
