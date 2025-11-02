import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class ZabbixService{
    private apiUrl = '/api/api_jsonrpc.php';
    private tokenName = 'ZbxToken2'
    private tokenValue = '2b878818930c80188d55683badecf39a8e1f9e9cbd04b52b289b648ca59b869d';
    // private authHeader = `Bearer ${this.tokenName} ${this.tokenValue}`;
    private authHeader = `Bearer 9924cf4b3b8e8dda03f2c2a7efb85361`;
    private httpOptions={
        headers: new HttpHeaders({
            'Content-Type': 'application/json-rpc',
            'Authorization':`Bearer ${this.tokenValue}`
        })
    };
    
  constructor(private http: HttpClient){}

    getHosts():Observable<any>{
const request = {
    jsonrpc: '2.0',
    method:'host.get',
    params: {
        // output:["hostid","host","description"],
        output:'extend',
        selectInterfaces: ["interfaceid","ip"],
        selectTags: 'extend',
        // tags: [
        //    { tag: "group",
        //     value: "pltcm"
        //    } 
        // ]
    },
    // auth: 'Bearer 2b878818930c80188d55683badecf39a8e1f9e9cbd04b52b289b648ca59b869d',
    id:1
};
return this.http.post(this.apiUrl,request,this.httpOptions);
    }

    getHostsByGroup(group:string):Observable<any>{
const request = {
    jsonrpc: '2.0',
    method:'host.get',
    params: {
        // output:["hostid","host","description"],
        output:'extend',
        selectInterfaces: ["interfaceid","ip"],
        selectTags: 'extend',
        tags: [
           { tag: "group",
            value: group
           } 
        ]
    },
    id:1
};
return this.http.post(this.apiUrl,request,this.httpOptions);
    }

    pingAgents():Observable<any>{
const request = {
    jsonrpc: '2.0',
    method:'item.get',
    params: {
        // output:'extend',
        output:["hostid","itemid","name","lastvalue","lastclock"],
        search: {
            key_: 'agent.ping'
        },
        hostids:['10652','10651', '10084','10653']
    },
    id:1
};
return this.http.post(this.apiUrl,request,this.httpOptions);
    }

    pingAgentsForGroup(hostIds:any):Observable<any>{
const request = {
    jsonrpc: '2.0',
    method:'item.get',
    params: {
        // output:'extend',
        output:["hostid","itemid","name","lastvalue","lastclock"],
        search: {
            key_: 'agent.ping'
        },
        hostids:hostIds
    },
    id:1
};
return this.http.post(this.apiUrl,request,this.httpOptions);
    }

     pingAgentsForId(hostId:any):Observable<any>{
const request = {
    jsonrpc: '2.0',
    method:'item.get',
    params: {
        // output:'extend',
        output:["hostid","itemid","name","lastvalue","lastclock"],
        search: {
            key_: 'agent.ping'
        },
        hostids:hostId
    },
    id:1
};
return this.http.post(this.apiUrl,request,this.httpOptions);
    }

    getDiskSpaceInfo(hostId: string):Observable<any>{
    const request = {
        jsonrpc: '2.0',
        method:'item.get',
         params: {
            output:["hostid","itemid","name","lastvalue"],
            search: {
            //  key_: 'vfs.fs.dependent.size[C:,total]'
             key_: 'vfs.fs.dependent.size',
            },
             filter:{
            units: 'B'
        },
        hostids: hostId,
        
    },
    id:1
};
return this.http.post(this.apiUrl,request,this.httpOptions);
    }

    getCPUUtilization(hostId: string):Observable<any>{
    const request = {
        jsonrpc: '2.0',
        method:'item.get',
         params: {
            output:["hostid","itemid","name","lastvalue"],
            search: {
             key_: 'system.cpu.util',
            },
            filter:{
            name: 'CPU utilization'
        },
        hostids: hostId,
        
    },
    id:1
};
return this.http.post(this.apiUrl,request,this.httpOptions);
    }

    getMemoryUtilization(hostId: string):Observable<any>{
    const request = {
        jsonrpc: '2.0',
        method:'item.get',
         params: {
            output:["hostid","itemid","name","lastvalue"],
            search: {
             key_: 'vm.memory.util',
            },
        hostids: hostId,
        
    },
    id:1
};
return this.http.post(this.apiUrl,request,this.httpOptions);
    }

    getOpSystemInfo(hostId: string):Observable<any>{
    const request = {
        jsonrpc: '2.0',
        method:'item.get',
         params: {
            output:["hostid","itemid","name","lastvalue"],
            search: {
             key_: 'system.sw.os',
            },
        hostids: hostId,
        
    },
    id:1
};
return this.http.post(this.apiUrl,request,this.httpOptions);
    }

    getHostname(hostId: string):Observable<any>{
    const request = {
        jsonrpc: '2.0',
        method:'item.get',
         params: {
            // output:["hostid","itemid","name","lastvalue"],
            search: {
             key_: 'agent.hostname',
            },
        hostids: hostId,
        
    },
    id:1
};
return this.http.post(this.apiUrl,request,this.httpOptions);
    }

    

}