import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive, RouterModule } from '@angular/router';
import { NetworksDialogComponent } from '../networks-dialog/networks-dialog.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class Sidebar {
  isCollapsed = false;

  @Output() sidebarToggled = new EventEmitter<boolean>();

  constructor(private dialog: MatDialog) {}

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
    this.sidebarToggled.emit(this.isCollapsed);
  }

  openNetworksDialog(): void {
    const dialogRef = this.dialog.open(NetworksDialogComponent, {
      width: '320px'
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        window.open('http://172.30.50.100/ip', '_blank');
      }
    });
  }
}
