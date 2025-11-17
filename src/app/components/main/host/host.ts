import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ZabbixService } from '../../../services/zabbix.service';
import { forkJoin } from 'rxjs';
import { CommonModule, NgFor } from '@angular/common';
import { BytesToGbPipe } from "../../../pipes/bytes-to-gb.pipe";
import { MatIcon, MatIconModule } from "@angular/material/icon";

interface DiskSpace {
  hostid: string;
  itemid: string;
  disk: string;
  available: number;
  used: number;
  total: number;
  usedPercentage?: number;
  availablePercentage?: number;
}

@Component({
  selector: 'app-host',
  imports: [CommonModule, BytesToGbPipe, MatIcon, NgFor],
  templateUrl: './host.html',
  styleUrl: './host.scss'
})
export class Host implements OnInit{

  Math=Math;

  id: any;
  ping:any;
  diskSpace:any;
  cpuUtil:any;
  memoryUtil:any;
  opSystemInfo:any;
  hostname:any;
  hostData:any;
  hostStatus: boolean = false;
  diskSpaceTransformed: any;

  
 
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private zabbixService: ZabbixService
  ){}

  ngOnInit(): void {
  /////////Test 
  //   this.diskSpace = [
  //     {
  //       hostid: "10652",
  //       itemid: "48689",
  //       lastvalue:"49748119552",
  //       name: "FS [(C:)]: Space: Available"
  //     },
  //     {
  //       hostid: "10652",
  //       itemid: "48689",
  //       lastvalue:"199536140288",
  //       name: "FS [(C:)]: Space: Used"
  //     },
  //     {
  //       hostid: "10652",
  //       itemid: "48689",
  //       lastvalue:"249284259840",
  //       name: "FS [(C:)]: Space: Total"
  //     },
  //     {
  //       hostid: "10652",
  //       itemid: "48689",
  //       lastvalue:"0",
  //       name: "FS [WINSETUP(D:)]: Space: Available"
  //     },
  //     {
  //       hostid: "10652",
  //       itemid: "48689",
  //       lastvalue:"0",
  //       name: "FS [WINSETUP(D:)]: Space: Used"
  //     },
  //     {
  //       hostid: "10652",
  //       itemid: "48689",
  //       lastvalue:"0",
  //       name: "FS [WINSETUP(D:)]: Space: Total"
  //     },
  //   ]

  //    this.diskSpaceTransformed = this.transformDiskSpace(this.diskSpace)
  //   console.log(this.diskSpaceTransformed)

  //   this.cpuUtil = [
  //         {
  //           lastvalue : 80.5
  //         }
  //   ]
    
  //  this.memoryUtil = [
  //         {
  //           lastvalue : 50.78
  //         }
  //  ]


    const navigation = window.history.state;
    this.hostData=navigation.hostData;
    console.log("get hostdata",this.hostData)
    this.route.paramMap.subscribe(params => {
      this.id = params.get('id');
      // console.log(this.id);
      this.getAllData();
    })
  }

  goBack() {
  this.router.navigate(['/hosts']);
}

  pingHost(){
    return this.zabbixService.pingAgentsForId(this.id);
  }

  getHostDiskSpaceInfo(){
    return this.zabbixService.getDiskSpaceInfo(this.id);
  }

  getHostCPUUtilization(){
    return this.zabbixService.getCPUUtilization(this.id);
  }

  getHostMemoryUtilization(){
    return this.zabbixService.getMemoryUtilization(this.id);
  }

  getHostOpSystemInfo(){
    return this.zabbixService.getOpSystemInfo(this.id);
  }

  getHostname(){
    return this.zabbixService.getHostname(this.id);
  }


  getAllData(){
    forkJoin({
  pingHostRes:this.pingHost(),
  diskSpaceRes: this.getHostDiskSpaceInfo(),
  memoryUtilRes:this.getHostMemoryUtilization(),
  cpuUtilRes:this.getHostCPUUtilization(),
  opSystemInfoRes: this.getHostOpSystemInfo(),
  hostnameRes:this.getHostname()
        }).subscribe({
          next:({pingHostRes,diskSpaceRes, memoryUtilRes,cpuUtilRes,opSystemInfoRes, hostnameRes})=>{
            this.ping = pingHostRes.result;
            console.log("ping Host data", pingHostRes.result)
            //Test
            this.diskSpace = diskSpaceRes.result;
            console.log("diskSpace data",this.diskSpace);
            this.cpuUtil = cpuUtilRes.result;
            console.log("cpuUtil data",this.cpuUtil);
            this.memoryUtil = memoryUtilRes.result
            console.log("memory utilization data", this.memoryUtil);
            this.opSystemInfo = opSystemInfoRes.result
            console.log("operational system info data", this.opSystemInfo);
            this.hostname = hostnameRes.result
            console.log("hostname data", this.hostname);

            this.processData();
          },
          error :(error) =>{
            console.error('Error loading data:', error);
          }
        });
      }

      processData(){
      const currentTime = Math.floor(Date.now()/1000);
      let isOk;
      isOk = (currentTime - this.ping[0].lastclock) < 100 ? true : false 
      this.hostStatus = isOk;
      console.log("host Status", this.hostStatus);

      this.diskSpaceTransformed = this.transformDiskSpace(this.diskSpace)
      console.log(this.diskSpaceTransformed)
    }

    transformDiskSpace(data: any[]): DiskSpace[] {
      const diskMap = new Map<string, DiskSpace>();
      
      data.forEach(item => {
        try {
          // More robust regex to handle different formats
          const diskMatch = item.name.match(/FS\s*\[(.*?)\]\s*:\s*Space\s*:\s*(\w+)/i);
          if (!diskMatch) {
            console.warn(`Could not parse disk name from: ${item.name}`);
            return;
          }
          
          const diskName = diskMatch[1].trim();
          const spaceType = diskMatch[2].toLowerCase();
          const value = parseInt(item.lastvalue, 10) || 0;
          
          if (!diskMap.has(diskName)) {
            diskMap.set(diskName, {
              hostid: item.hostid,
              itemid: item.itemid,
              disk: diskName,
              available: 0,
              used: 0,
              total: 0
            });
          }
          
          const disk = diskMap.get(diskName)!;
          
          switch (spaceType) {
            case 'available':
              disk.available = value;
              break;
            case 'used':
              disk.used = value;
              break;
            case 'total':
              disk.total = value;
              break;
          }
          
        } catch (error) {
          console.error('Error processing disk space item:', error, item);
        }
      });
      
      // Calculate percentages
      const result = Array.from(diskMap.values());
      result.forEach(disk => {
        if (disk.total > 0) {
          disk.usedPercentage = Math.round((disk.used / disk.total) * 100);
          disk.availablePercentage = Math.round((disk.available / disk.total) * 100);
        }
      });
      
      return result;
}

 
          
  }
