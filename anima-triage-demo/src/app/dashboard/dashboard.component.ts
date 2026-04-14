import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TriageApiService } from '../shared/triage-api.service';
import { StatusCountPipe } from '../shared/status-count.pipe';
import {
  TriageRecord,
  CaseStatus,
  STATUS_LABELS,
  ONSET_LABELS,
} from '../shared/triage.models';

type LoadState = 'loading' | 'loaded' | 'error';
type SortField = 'severity' | 'submittedAt';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, StatusCountPipe],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  loadState = signal<LoadState>('loading');
  cases = signal<TriageRecord[]>([]);
  updatingCaseId = signal<string | null>(null);

  sortField = signal<SortField>('severity');
  sortAsc = signal(false);

  private api = inject(TriageApiService);

  readonly statusLabels = STATUS_LABELS;
  readonly onsetLabels = ONSET_LABELS;

  readonly statusCycle: Record<CaseStatus, CaseStatus> = {
    'new': 'in-progress',
    'in-progress': 'resolved',
    'resolved': 'new',
  };

  constructor() {}

  ngOnInit(): void {
    this.loadCases();
  }

  loadCases(): void {
    this.loadState.set('loading');
    this.api.fetchAll().subscribe({
      next: (res) => {
        this.cases.set(res.items);
        this.applySort();
        this.loadState.set('loaded');
      },
      error: () => this.loadState.set('error'),
    });
  }

  severityClass(severity: number): string {
    if (severity <= 3) return 'bg-emerald-900/60 text-emerald-300 border border-emerald-700';
    if (severity <= 6) return 'bg-amber-900/60 text-amber-300 border border-amber-700';
    return 'bg-red-900/60 text-red-300 border border-red-700';
  }

  severityDotClass(severity: number): string {
    if (severity <= 3) return 'bg-emerald-400';
    if (severity <= 6) return 'bg-amber-400';
    return 'bg-red-400';
  }

  statusClass(status: CaseStatus): string {
    const base = 'px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors';
    switch (status) {
      case 'new':
        return `${base} bg-sky-900/60 text-sky-300 border border-sky-700 hover:bg-sky-800/60`;
      case 'in-progress':
        return `${base} bg-violet-900/60 text-violet-300 border border-violet-700 hover:bg-violet-800/60`;
      case 'resolved':
        return `${base} bg-slate-700/60 text-slate-400 border border-slate-600 hover:bg-slate-600/60`;
    }
  }

  advanceStatus(record: TriageRecord): void {
    const next = this.statusCycle[record.status];
    this.updatingCaseId.set(record.caseId);
    this.api.updateStatus(record.caseId, next).subscribe({
      next: () => {
        this.cases.update((items) =>
          items.map((c) => (c.caseId === record.caseId ? { ...c, status: next } : c))
        );
        this.updatingCaseId.set(null);
      },
      error: () => this.updatingCaseId.set(null),
    });
  }

  setSort(field: SortField): void {
    if (this.sortField() === field) {
      this.sortAsc.update((v) => !v);
    } else {
      this.sortField.set(field);
      this.sortAsc.set(field === 'submittedAt'); // time: oldest first by default
    }
    this.applySort();
  }

  private applySort(): void {
    const field = this.sortField();
    const asc = this.sortAsc();
    this.cases.update((items) =>
      [...items].sort((a, b) => {
        let diff = 0;
        if (field === 'severity') {
          diff = a.severity - b.severity;
        } else {
          diff = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
        }
        return asc ? diff : -diff;
      })
    );
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  trackByCase(_: number, c: TriageRecord): string {
    return c.caseId;
  }
}
