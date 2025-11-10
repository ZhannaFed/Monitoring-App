import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-networks-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Перейти в раздел Networks?</h2>
    <mat-dialog-content>
      После подтверждения откроется новая вкладка с адресом 172.30.50.100.
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Нет</button>
      <button mat-button color="primary" [mat-dialog-close]="true">Да</button>
    </mat-dialog-actions>
  `
})
export class NetworksDialogComponent {}
