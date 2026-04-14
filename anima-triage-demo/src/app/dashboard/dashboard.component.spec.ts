import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { TriageApiService } from '../shared/triage-api.service';
import { TriageRecord } from '../shared/triage.models';

const mockCases: TriageRecord[] = [
  {
    caseId: 'abc-low',
    submittedAt: '2026-04-14T10:00:00.000Z',
    status: 'new',
    patientInitials: 'A.B.',
    chiefComplaint: 'Mild headache',
    onset: 'today',
    severity: 2,
    fhirBundle: {} as any,
  },
  {
    caseId: 'abc-high',
    submittedAt: '2026-04-14T11:00:00.000Z',
    status: 'in-progress',
    patientInitials: 'C.D.',
    chiefComplaint: 'Severe chest pain',
    onset: '1-3-days',
    severity: 9,
    fhirBundle: {} as any,
  },
  {
    caseId: 'abc-mid',
    submittedAt: '2026-04-14T09:00:00.000Z',
    status: 'resolved',
    patientInitials: 'E.F.',
    chiefComplaint: 'Moderate back pain',
    onset: '4-7-days',
    severity: 5,
    fhirBundle: {} as any,
  },
];

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let apiSpy: jasmine.SpyObj<TriageApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj<TriageApiService>('TriageApiService', [
      'fetchAll',
      'updateStatus',
    ]);
    apiSpy.fetchAll.and.returnValue(of({ items: mockCases }));

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TriageApiService, useValue: apiSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load cases on init', () => {
    expect(apiSpy.fetchAll).toHaveBeenCalledOnceWith();
    expect(component.cases().length).toBe(3);
    expect(component.loadState()).toBe('loaded');
  });

  it('should default-sort by severity descending', () => {
    const severities = component.cases().map((c) => c.severity);
    expect(severities).toEqual([9, 5, 2]);
  });

  it('should show error state when api fails', async () => {
    apiSpy.fetchAll.and.returnValue(throwError(() => new Error('API down')));
    component.loadCases();
    expect(component.loadState()).toBe('error');
  });

  describe('severity colour mapping', () => {
    it('should return green class for severity 1-3', () => {
      expect(component.severityClass(1)).toContain('emerald');
      expect(component.severityClass(3)).toContain('emerald');
    });

    it('should return amber class for severity 4-6', () => {
      expect(component.severityClass(4)).toContain('amber');
      expect(component.severityClass(6)).toContain('amber');
    });

    it('should return red class for severity 7-10', () => {
      expect(component.severityClass(7)).toContain('red');
      expect(component.severityClass(10)).toContain('red');
    });
  });

  describe('status advancement', () => {
    it('should cycle new → in-progress → resolved → new', () => {
      expect(component.statusCycle['new']).toBe('in-progress');
      expect(component.statusCycle['in-progress']).toBe('resolved');
      expect(component.statusCycle['resolved']).toBe('new');
    });

    it('should optimistically update status in the cases list', () => {
      apiSpy.updateStatus.and.returnValue(
        of({ caseId: 'abc-low', status: 'in-progress' })
      );
      const lowCase = component.cases().find((c) => c.caseId === 'abc-low')!;
      component.advanceStatus(lowCase);
      const updated = component.cases().find((c) => c.caseId === 'abc-low')!;
      expect(updated.status).toBe('in-progress');
    });
  });

  describe('sorting', () => {
    it('should toggle sort direction when clicking same field', () => {
      component.setSort('severity');
      expect(component.sortAsc()).toBeTrue();
      component.setSort('severity');
      expect(component.sortAsc()).toBeFalse();
    });

    it('should sort by submittedAt ascending when switching to time field', () => {
      component.setSort('submittedAt');
      const times = component.cases().map((c) => c.submittedAt);
      const sorted = [...times].sort();
      expect(times).toEqual(sorted);
    });
  });
});
