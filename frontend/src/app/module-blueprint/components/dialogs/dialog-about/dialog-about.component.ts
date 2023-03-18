import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-dialog-about',
  templateUrl: './dialog-about.component.html',
  styleUrls: ['./dialog-about.component.css']
})
export class DialogAboutComponent {

  visible: boolean;

  toggleDialog() {
    this.visible = !this.visible;
  }

  close() {
    this.visible = false;
  }
}
