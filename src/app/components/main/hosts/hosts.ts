import { Component, OnDestroy, OnInit } from '@angular/core';
import { ZabbixService } from '../../../services/zabbix.service';
import { CommonModule } from '@angular/common';
import { forkJoin, map, switchMap } from 'rxjs';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { HostsTable } from "../hosts-table/hosts-table";
import { MOCK_HOSTS_BY_GROUP } from '../../../mocks/mock-hosts';

@Component({
  selector: 'app-hosts',
  imports: [CommonModule, MatTableModule, MatTabsModule, HostsTable],
  templateUrl: './hosts.html',
  styleUrl: './hosts.scss'
})
export class Hosts implements OnInit, OnDestroy{
hosts: any[] = [];
pings:any[] = [];
hostsData:any[]=[];
loading = false;
error: string = '';
hostIsAlive = true;
private refreshInterval:any;
displayedColumns: string[]=['hostId', 'hostName', 'hostIp', 'status','description', 'remoteAccess'];
el: any;
group: string = 'pltcm';
// TEST HOSTS MOCK DATA ==============================
private readonly enableMockHosts = true;
// TEST HOSTS MOCK DATA ==============================

constructor(private zabbixService: ZabbixService){}
  
ngOnInit(): void {
    
  this.loadAllData(this.group);

  //////--Test--------------------------------------------------------- 
  // this.hostsData = [
  //   {
  //     hostid: '1373778',
  //     host: 'CALHMISRV3',
  //     interfaces:[
  //       {ip: '172.30.50.120'}
  //     ],
  //     isAvailable: true,
  //     description: 'dygdyuduu'
  //   },
  //   {
  //     hostid: '2373778',
  //     host: 'CGLHMISRV3',
  //     interfaces:[
  //       {ip: '172.30.50.121'}
  //     ],
  //     isAvailable: true,
  //     description: 'dygdyuduu'
  //   },
  //   {
  //     hostid: '3373778',
  //     host: 'gyugdyudg',
  //     interfaces:[
  //       {ip: '172.40.50.121'}
  //     ],
  //     isAvailable: true,
  //     description: 'dygdyuduu'
  //   },
  //   {
  //     hostid: '4373778',
  //     host: 'gyugdyudg',
  //     interfaces:[
  //       {ip: '172.40.50.122'}
  //     ],
  //     isAvailable: false,
  //     description: 'dygdyuduu'
  //   },
  //   {
  //     hostid: '5373778',
  //     host: 'gyugdyudg',
  //     interfaces:[
  //       {ip: '172.40.50.120'}
  //     ],
  //     isAvailable: true,
  //     description: 'dygdyuduu'
  //   },
  // ]
   ///------------------------------------------- 
    
    
    //-------------------Refreshing of component hosts---------------------//

    // this.refreshInterval = setInterval(()=>{
    //   this.loadAllData();
    // }, 10000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval){
      clearInterval(this.refreshInterval);
    }
  }

   getHostsByGroup(group:string){
    return this.zabbixService.getHostsByGroup(group);
  }

  pingAllHosts(){
    return this.zabbixService.pingAgents();
  }
  pingAllHostsForGroup(hostIds:any){
    return this.zabbixService.pingAgentsForGroup(hostIds);
  }
 
  // loadAllData1(group:string){
  //   this.group = group;
  //   forkJoin({
  //     hosts: this.getHostsByGroup(group),
  //     pings: this.pingAllHosts()
  //   }).subscribe({
  //     next:({hosts,pings})=>{
  //       this.hosts = hosts.result;
  //       this.pings = pings.result;
  //       console.log("Hosts data",this.hosts);
  //       console.log("Pings data",this.pings)
  //        this.processData();
  //     },
  //     error :(error) =>{
  //       console.error('Error loading data:', error);
  //     }
  //   });
  // }

   loadAllData(group:string){
    if (this.enableMockHosts) {
      this.applyMockHosts(group);
      return;
    }
    this.group = group;
    this.getHostsByGroup(group).pipe(
      switchMap(hosts => {
        const hostIds = hosts.result.map((host: any) => host.hostid)
        console.log(hostIds)
        return this.pingAllHostsForGroup(hostIds).pipe(
          map(pings => ({hosts,pings}))
        );
      })
    ).subscribe({
      next:({hosts,pings})=>{
        this.hosts = hosts.result;
        this.pings = pings.result;
        console.log("Hosts data",this.hosts);
        console.log("Pings data",this.pings)
         this.processData();
      },
      error :(error) =>{
        console.error('Error loading data:', error);
      }
    });
   }

  processData(){
    const pingsValueMap = new Map();
    for (const val of this.pings){
      pingsValueMap.set(val.hostid, val.lastvalue);
    }
    // console.log(pingsValueMap);

   const pingsLastClokMap = new Map();
    for (const val of this.pings){
      pingsLastClokMap.set(val.hostid, val.lastclock);
    }
    // console.log(pingsLastClokMap);

    const currentTime = Math.floor(Date.now()/1000);
    const pingsIsAvailableMap = new Map();
    for (const val of this.pings){
      let isOk;
      isOk = (currentTime - val.lastclock) < 100 ? true : false 
      pingsIsAvailableMap.set(val.hostid, isOk);
    }
      // console.log(pingsIsAvailableMap) 

    this.hostsData = this.hosts.map(
    host =>({
      ...host,
      lastvalue: pingsValueMap.get(host.hostid)||null,
      lastclock: pingsLastClokMap.get(host.hostid)||null,
      isAvailable:pingsIsAvailableMap.get(host.hostid),
    }));

    
    console.log("Hosts Full Data",this.hostsData);
  }

  // TEST HOSTS MOCK DATA ==============================
  private applyMockHosts(group: string): void {
    const normalized = (group ?? 'general').toLowerCase();
    const dataset = MOCK_HOSTS_BY_GROUP[normalized] ?? MOCK_HOSTS_BY_GROUP['general'] ?? [];
    this.hostsData = dataset.map((host) => ({ ...host }));
  }
  // TEST HOSTS MOCK DATA ==============================
  
}
