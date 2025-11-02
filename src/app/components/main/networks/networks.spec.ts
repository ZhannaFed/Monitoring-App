import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Networks } from './networks';

describe('Networks', () => {
  let component: Networks;
  let fixture: ComponentFixture<Networks>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Networks]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Networks);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
