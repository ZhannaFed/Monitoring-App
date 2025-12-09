import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataModeService {
  private readonly testModeSubject = new BehaviorSubject<boolean>(true);
  readonly testMode$ = this.testModeSubject.asObservable();
  private readonly refreshHostsSubject = new Subject<void>();
  readonly refreshHosts$ = this.refreshHostsSubject.asObservable();

  setTestMode(value: boolean): void {
    this.testModeSubject.next(value);
  }

  toggleTestMode(): void {
    this.testModeSubject.next(!this.testModeSubject.value);
  }

  refreshHosts(): void {
    this.refreshHostsSubject.next();
  }

  get isTestMode(): boolean {
    return this.testModeSubject.value;
  }
}
