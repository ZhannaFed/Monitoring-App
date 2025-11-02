import { Routes } from '@angular/router';
import { Main } from './components/main/main';
import { Hosts } from './components/main/hosts/hosts';
import { Instructions } from './components/main/instructions/instructions';
import { Networks } from './components/main/networks/networks';
import { Host } from './components/main/host/host';

export const routes: Routes = [
   {path:'',  redirectTo:'hosts',pathMatch:'full'},
   {path:'hosts', component:Hosts},
   {path:'host/:id', component:Host},
   {path:'instructions', component:Instructions},
   {path:'networks', component:Networks}
];
