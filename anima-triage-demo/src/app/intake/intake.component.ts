import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TriageApiService } from '../shared/triage-api.service';
import { TriageFormData, OnsetPeriod } from '../shared/triage.models';

type SubmitState = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-intake',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './intake.component.html',
})
export class IntakeComponent {
  private fb = inject(FormBuilder);
  private api = inject(TriageApiService);

  submitState = signal<SubmitState>('idle');
  confirmedCaseId = signal<string>('');

  readonly onsetOptions: { value: OnsetPeriod; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: '1-3-days', label: '1–3 days ago' },
    { value: '4-7-days', label: '4–7 days ago' },
    { value: '1-plus-weeks', label: '1+ weeks ago' },
  ];

  form = this.fb.group({
    patientInitials: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(5),
        Validators.pattern(/^[A-Za-z.]+$/),
      ],
    ],
    chiefComplaint: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(300)]],
    onset: ['' as OnsetPeriod | '', Validators.required],
    severity: [5, [Validators.required, Validators.min(1), Validators.max(10)]],
    allergies: ['', Validators.maxLength(300)],
  });

  get severity() {
    return this.form.get('severity')!;
  }

  get severityValue(): number {
    return this.severity.value ?? 5;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitState.set('loading');

    const raw = this.form.value;
    const payload: TriageFormData = {
      patientInitials: raw.patientInitials!,
      chiefComplaint: raw.chiefComplaint!,
      onset: raw.onset as OnsetPeriod,
      severity: raw.severity!,
      ...(raw.allergies ? { allergies: raw.allergies } : {}),
    };

    this.api.submit(payload).subscribe({
      next: (res) => {
        this.confirmedCaseId.set(res.caseId);
        this.submitState.set('success');
        this.form.reset({ severity: 5 });
      },
      error: () => {
        this.submitState.set('error');
      },
    });
  }

  reset(): void {
    this.submitState.set('idle');
    this.confirmedCaseId.set('');
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }
}
