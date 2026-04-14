import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { IntakeComponent } from './intake.component';
import { TriageApiService } from '../shared/triage-api.service';

describe('IntakeComponent', () => {
  let component: IntakeComponent;
  let fixture: ComponentFixture<IntakeComponent>;
  let apiSpy: jasmine.SpyObj<TriageApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj<TriageApiService>('TriageApiService', ['submit']);

    await TestBed.configureTestingModule({
      imports: [IntakeComponent, ReactiveFormsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TriageApiService, useValue: apiSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IntakeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('form validation', () => {
    it('should be invalid when empty', () => {
      expect(component.form.valid).toBeFalse();
    });

    it('should reject empty chief complaint', () => {
      component.form.patchValue({ patientInitials: 'J.D.', onset: 'today', severity: 5 });
      expect(component.form.get('chiefComplaint')?.valid).toBeFalse();
    });

    it('should reject short chief complaint', () => {
      component.form.patchValue({ chiefComplaint: 'ab' });
      expect(component.form.get('chiefComplaint')?.hasError('minlength')).toBeTrue();
    });

    it('should reject severity below 1', () => {
      component.form.patchValue({ severity: 0 });
      expect(component.form.get('severity')?.hasError('min')).toBeTrue();
    });

    it('should reject severity above 10', () => {
      component.form.patchValue({ severity: 11 });
      expect(component.form.get('severity')?.hasError('max')).toBeTrue();
    });

    it('should reject initials with numbers', () => {
      component.form.patchValue({ patientInitials: 'J3D' });
      expect(component.form.get('patientInitials')?.hasError('pattern')).toBeTrue();
    });

    it('should be valid with all required fields correctly filled', () => {
      component.form.patchValue({
        patientInitials: 'J.D.',
        chiefComplaint: 'Chest pain on exertion',
        onset: 'today',
        severity: 8,
      });
      expect(component.form.valid).toBeTrue();
    });
  });

  describe('submission', () => {
    const validFormValues = {
      patientInitials: 'A.B.',
      chiefComplaint: 'Shortness of breath',
      onset: 'today' as const,
      severity: 7,
      allergies: '',
    };

    it('should not call api if form is invalid on submit', () => {
      component.onSubmit();
      expect(apiSpy.submit).not.toHaveBeenCalled();
    });

    it('should show success state after successful submission', () => {
      apiSpy.submit.and.returnValue(
        of({ caseId: 'test-uuid-1234', message: 'received' })
      );
      component.form.patchValue(validFormValues);
      component.onSubmit();
      expect(component.submitState()).toBe('success');
      expect(component.confirmedCaseId()).toBe('test-uuid-1234');
    });

    it('should show error state on api failure', () => {
      apiSpy.submit.and.returnValue(throwError(() => new Error('Network error')));
      component.form.patchValue(validFormValues);
      component.onSubmit();
      expect(component.submitState()).toBe('error');
    });

    it('should reset to idle after calling reset()', () => {
      apiSpy.submit.and.returnValue(
        of({ caseId: 'test-uuid-5678', message: 'received' })
      );
      component.form.patchValue(validFormValues);
      component.onSubmit();
      expect(component.submitState()).toBe('success');
      component.reset();
      expect(component.submitState()).toBe('idle');
    });
  });
});
