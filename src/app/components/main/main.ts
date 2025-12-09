import { Component, OnInit } from '@angular/core';
import { ZabbixService } from '../../services/zabbix.service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [RouterOutlet,CommonModule],
  templateUrl: './main.html',
  styleUrl: './main.scss'
})
export class Main  {

}
