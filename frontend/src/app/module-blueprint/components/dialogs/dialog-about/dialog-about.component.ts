import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-dialog-about',
  templateUrl: './dialog-about.component.html',
  styleUrls: ['./dialog-about.component.css']
})
export class DialogAboutComponent implements OnInit {

  visible: boolean;

  constructor() { }

  ngOnInit() {
  }

  toggleDialog()
  {
    this.visible = !this.visible;
  }

  close() {
    this.visible = false;
  }
}
