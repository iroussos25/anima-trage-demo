import { Pipe, PipeTransform } from '@angular/core';
import { TriageRecord, CaseStatus } from './triage.models';

@Pipe({
  name: 'statusCount',
  standalone: true,
  pure: true,
})
export class StatusCountPipe implements PipeTransform {
  transform(cases: TriageRecord[], status: CaseStatus): number {
    return cases.filter((c) => c.status === status).length;
  }
}
