import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Main } from "./components/main/main";
import { Sidebar } from "./components/sidebar/sidebar";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Sidebar, Main],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'monitoring-app';
  sidebarCollapsed: boolean = false;

  // Обработчик события от app-sidebar
  onSidebarToggled(isCollapsed: boolean): void {
    this.sidebarCollapsed = isCollapsed;
  }
}
