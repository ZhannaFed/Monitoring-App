import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-hosts-table',
  imports: [CommonModule, MatTableModule],
  templateUrl: './hosts-table.html',
  styleUrl: './hosts-table.scss'
})

export class HostsTable {
@Input() hostsData: any[] = [];
displayedColumns: string[]=['hostId', 'hostName', 'hostIp', 'status','description', 'remoteAccess'];
hostData:any;
constructor(private router: Router){}

navigateToHost(id:any, hostName:string, ip: string, desc: any){
  this.hostData = {
    id: id,
    hostName: hostName,
    ip: ip,
    desc: desc
  }
  console.log(this.hostData);
this.router.navigate(['/host', id],{
  state:{
hostData: this.hostData
  }
})
}
}
