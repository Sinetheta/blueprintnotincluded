import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { BlueprintItem, CameraService, DrawHelpers, Visualization } from '../../../../../../../lib/index';

@Component({
  selector: 'app-temperature-picker',
  templateUrl: './temperature-picker.component.html',
  styleUrls: ['./temperature-picker.component.css']
})
export class TemperaturePickerComponent implements OnInit {

  // temperature
  @Input() blueprintItem: BlueprintItem;
  @Input() temperatureWarning: boolean;

  @Output() changeTemperature: EventEmitter<number> = new EventEmitter<number>();

  get temperatureLabel() { return this.blueprintItem.temperatureCelcius.toFixed(0) + '°C' }
  get temperatureHex() { return DrawHelpers.colorToHex(DrawHelpers.temperatureToColor(this.blueprintItem.temperature)); }
  get temperatureThresholds() { return DrawHelpers.temperatureThresholds; }

  private cameraService: CameraService

  constructor() {
    this.cameraService = CameraService.cameraService;
  }

  temperatureOffset(index: number) {
    return DrawHelpers.temperatureToScale(DrawHelpers.temperatureThresholds[index].temperature) / 100;
  }

  temperatureColor(index: number) {
    return DrawHelpers.colorToHex(DrawHelpers.temperatureThresholds[index].color);
  }

  ngOnInit() {
  }

  onChange() {
    this.changeTemperature.emit(this.blueprintItem.temperature);
  }

  temperatureVisualization() {
    this.cameraService.visualization = Visualization.temperature
  }

}
