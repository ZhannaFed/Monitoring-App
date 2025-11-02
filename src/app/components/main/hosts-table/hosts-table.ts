import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-hosts-table',
  imports: [CommonModule, MatTableModule,RouterLink],
  templateUrl: './hosts-table.html',
  styleUrl: './hosts-table.scss'
})
export class HostsTable {
@Input() hostsData: any[] = [];
displayedColumns: string[]=['hostId', 'hostName', 'hostIp', 'status','description', 'remoteAccess'];

}
