import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ZabbixService } from '../../../services/zabbix.service';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { BytesToGbPipe } from "../../../pipes/bytes-to-gb.pipe";

@Component({
  selector: 'app-host',
  imports: [CommonModule, BytesToGbPipe],
  templateUrl: './host.html',
  styleUrl: './host.scss'
})
export class Host implements OnInit{
  Math=Math;

  id: any;
  diskSpace:any;
  cpuUtil:any;
  memoryUtil:any;
  opSystemInfo:any;
  hostname:any;
 
  constructor(
    private route: ActivatedRoute,
    private zabbixService: ZabbixService
  ){}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.id = params.get('id');
      console.log(this.id);
      this.getAllData();
    })
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
  diskSpaceRes: this.getHostDiskSpaceInfo(),
  memoryUtilRes:this.getHostMemoryUtilization(),
  cpuUtilRes:this.getHostCPUUtilization(),
  opSystemInfoRes: this.getHostOpSystemInfo(),
  hostnameRes:this.getHostname()
        }).subscribe({
          next:({diskSpaceRes, memoryUtilRes,cpuUtilRes,opSystemInfoRes, hostnameRes})=>{
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

            //  this.processData();
          },
          error :(error) =>{
            console.error('Error loading data:', error);
          }
        });
      }
          
  }
