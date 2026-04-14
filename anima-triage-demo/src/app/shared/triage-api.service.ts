import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  TriageFormData,
  SubmitTriageResponse,
  FetchTriageResponse,
  UpdateStatusResponse,
  CaseStatus,
} from './triage.models';

@Injectable({
  providedIn: 'root',
})
export class TriageApiService {
  private readonly baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  submit(data: TriageFormData): Observable<SubmitTriageResponse> {
    return this.http.post<SubmitTriageResponse>(`${this.baseUrl}/triage`, data);
  }

  fetchAll(): Observable<FetchTriageResponse> {
    return this.http.get<FetchTriageResponse>(`${this.baseUrl}/triage`);
  }

  updateStatus(caseId: string, status: CaseStatus): Observable<UpdateStatusResponse> {
    return this.http.patch<UpdateStatusResponse>(
      `${this.baseUrl}/triage/${caseId}/status`,
      { status }
    );
  }
}
