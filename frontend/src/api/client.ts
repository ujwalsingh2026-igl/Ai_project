import {
  ApiError,
  ApiErrorResponse,
  AssistantStatus,
  AuditLog,
  ChatRequest,
  ChatResponse,
  ConfirmRequest,
  ConfirmResponse,
  Conversation,
  ConversationDetail,
  DailyBriefData,
  ListeningPortsData,
  NoteItem,
  PendingApproval,
  PlannerExportData,
  ProcessInspectData,
  ReminderItem,
  SecurityPostureData,
  SecuritySelfTestData,
  TaskItem,
  TokenResponse,
  ToolRunResponse,
  ToolSpec,
  SubnetInfo,
  NetworkDeviceItem,
  NetworkAlertItem,
  DnsQueryLogItem,
  NetworkScanResponse,
  NetworkExportData,
  ScanFindingItem,
  QuarantineItem,
  QuarantineActionResponse,
  HashLookupResponse,
  SecurityIncident,
  FirewallRuleItem,
  SecuritySummary,
  AssistantMemoryItem,
} from './types';

const TOKEN_KEY = 'aegis_session_token';
const DEFAULT_BASE_URL = 'http://127.0.0.1:8001';

type AuthListener = (isAuthenticated: boolean) => void;
type RateLimitListener = (isRateLimited: boolean, message?: string) => void;

class ApiClient {
  private tokenInMemory: string | null = null;
  private baseUrl: string = DEFAULT_BASE_URL;
  private authListeners: Set<AuthListener> = new Set();
  private rateLimitListeners: Set<RateLimitListener> = new Set();

  constructor() {
    // Initialize token from sessionStorage on startup
    try {
      this.tokenInMemory = sessionStorage.getItem(TOKEN_KEY);
    } catch {
      this.tokenInMemory = null;
    }
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setToken(token: string | null) {
    this.tokenInMemory = token;
    try {
      if (token) {
        sessionStorage.setItem(TOKEN_KEY, token);
      } else {
        sessionStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      // Ignore sessionStorage errors in restricted environments
    }
    this.notifyAuthListeners(!!token);
  }

  public getToken(): string | null {
    return this.tokenInMemory;
  }

  public isAuthenticated(): boolean {
    return !!this.tokenInMemory;
  }

  public logout() {
    this.setToken(null);
  }

  public onAuthChange(listener: AuthListener): () => void {
    this.authListeners.add(listener);
    return () => this.authListeners.delete(listener);
  }

  public onRateLimit(listener: RateLimitListener): () => void {
    this.rateLimitListeners.add(listener);
    return () => this.rateLimitListeners.delete(listener);
  }

  private notifyAuthListeners(isAuth: boolean) {
    this.authListeners.forEach((fn) => fn(isAuth));
  }

  private notifyRateLimit(isRateLimited: boolean, message?: string) {
    this.rateLimitListeners.forEach((fn) => fn(isRateLimited, message));
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = new Headers(options.headers || {});

    // Ensure content type defaults to JSON if body is present and not FormData
    if (options.body && !(typeof FormData !== 'undefined' && options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // Attach token if present and not already attached
    if (this.tokenInMemory && !headers.has('Authorization')) {
      headers.set('Authorization', `Token ${this.tokenInMemory}`);
    }

    let response: Response;
    try {
      response = await fetch(url, { ...options, headers });
    } catch (networkError) {
      throw new ApiError(
        0,
        'network_error',
        networkError instanceof Error ? networkError.message : 'Unable to connect to backend server'
      );
    }

    // Handle 401 Unauthorized (session expired or invalid token)
    if (response.status === 401) {
      this.logout();
      const err = await this.parseError(response);
      throw err;
    }

    // Handle 429 Too Many Requests (throttling)
    if (response.status === 429) {
      const err = await this.parseError(response);
      this.notifyRateLimit(true, err.message || 'Rate limit exceeded. Please slow down.');
      throw err;
    }

    if (!response.ok) {
      throw await this.parseError(response);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  private async parseError(response: Response): Promise<ApiError> {
    try {
      const body = (await response.json()) as ApiErrorResponse;
      if (body && body.error) {
        return new ApiError(
          response.status,
          body.error.code || 'api_error',
          body.error.message || `Request failed with status ${response.status}`,
          body.error.details
        );
      }
    } catch {
      // Fallback if not JSON error shape
    }
    return new ApiError(response.status, `http_${response.status}`, `Server error (${response.status})`);
  }

  // ---- Endpoints ----

  public async checkHealth(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/api/health/');
  }

  public async login(username: string, password: string): Promise<TokenResponse> {
    const res = await this.request<TokenResponse>('/api/auth/token/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setToken(res.token);
    return res;
  }

  public async getStatus(): Promise<AssistantStatus> {
    return this.request<AssistantStatus>('/api/assistant/status/');
  }

  public async chat(data: ChatRequest): Promise<ChatResponse> {
    return this.request<ChatResponse>('/api/assistant/chat/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async confirm(data: ConfirmRequest): Promise<ConfirmResponse> {
    return this.request<ConfirmResponse>('/api/assistant/confirm/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async getConversations(): Promise<Conversation[]> {
    return this.request<Conversation[]>('/api/conversations/');
  }

  public async getConversation(id: string): Promise<ConversationDetail> {
    return this.request<ConversationDetail>(`/api/conversations/${id}/`);
  }

  public async getTools(): Promise<ToolSpec[]> {
    return this.request<ToolSpec[]>('/api/tools/');
  }

  public async getPendingApprovals(status: string = 'pending'): Promise<PendingApproval[]> {
    return this.request<PendingApproval[]>(`/api/assistant/approvals/?status=${encodeURIComponent(status)}`);
  }

  public async getAuditLogs(): Promise<AuditLog[]> {
    return this.request<AuditLog[]>('/api/audit/');
  }

  // ---- Planner Endpoints ----

  public async getTasks(status?: string, priority?: string): Promise<TaskItem[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (priority) params.append('priority', priority);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<TaskItem[]>(`/api/planner/tasks/${qs}`);
  }

  public async createTask(data: {
    title: string;
    priority?: 'low' | 'medium' | 'high';
    due_date?: string | null;
    tags?: string[];
  }): Promise<TaskItem> {
    return this.request<TaskItem>('/api/planner/tasks/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateTask(id: number, data: Partial<TaskItem>): Promise<TaskItem> {
    return this.request<TaskItem>(`/api/planner/tasks/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  public async deleteTask(id: number): Promise<void> {
    return this.request<void>(`/api/planner/tasks/${id}/`, {
      method: 'DELETE',
    });
  }

  public async getReminders(delivered?: boolean): Promise<ReminderItem[]> {
    const qs = delivered !== undefined ? `?delivered=${delivered}` : '';
    return this.request<ReminderItem[]>(`/api/planner/reminders/${qs}`);
  }

  public async createReminder(data: { time: string; message: string }): Promise<ReminderItem> {
    return this.request<ReminderItem>('/api/planner/reminders/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateReminder(id: number, data: Partial<ReminderItem>): Promise<ReminderItem> {
    return this.request<ReminderItem>(`/api/planner/reminders/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  public async deleteReminder(id: number): Promise<void> {
    return this.request<void>(`/api/planner/reminders/${id}/`, {
      method: 'DELETE',
    });
  }

  public async getNotes(query?: string): Promise<NoteItem[]> {
    const qs = query ? `?q=${encodeURIComponent(query)}` : '';
    return this.request<NoteItem[]>(`/api/planner/notes/${qs}`);
  }

  public async createNote(data: { title: string; content?: string }): Promise<NoteItem> {
    return this.request<NoteItem>('/api/planner/notes/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateNote(id: number, data: Partial<NoteItem>): Promise<NoteItem> {
    return this.request<NoteItem>(`/api/planner/notes/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  public async deleteNote(id: number): Promise<void> {
    return this.request<void>(`/api/planner/notes/${id}/`, {
      method: 'DELETE',
    });
  }

  public async getDailyBrief(): Promise<DailyBriefData> {
    return this.request<DailyBriefData>('/api/planner/brief/');
  }

  public async exportPlannerData(): Promise<PlannerExportData> {
    return this.request<PlannerExportData>('/api/planner/export/');
  }

  public async clearPlannerData(): Promise<{ status: string; deleted: Record<string, number> }> {
    return this.request<{ status: string; deleted: Record<string, number> }>('/api/planner/clear/', {
      method: 'POST',
    });
  }

  public async runTool(name: string, args: Record<string, unknown> = {}): Promise<ToolRunResponse> {
    return this.request<ToolRunResponse>(`/api/tools/${encodeURIComponent(name)}/run/`, {
      method: 'POST',
      body: JSON.stringify({ args }),
    });
  }

  // ---- Security Center Endpoints ----

  public async getSecurityPosture(): Promise<SecurityPostureData> {
    const res = await this.runTool('security_posture_eval');
    return res.result as unknown as SecurityPostureData;
  }

  public async inspectProcesses(filterAnomaliesOnly = false): Promise<ProcessInspectData> {
    const res = await this.runTool('security_process_inspect', {
      filter_anomalies_only: filterAnomaliesOnly,
    });
    return res.result as unknown as ProcessInspectData;
  }

  public async getListeningPorts(): Promise<ListeningPortsData> {
    const res = await this.runTool('security_listening_ports');
    return res.result as unknown as ListeningPortsData;
  }

  public async runSecuritySelfTest(): Promise<SecuritySelfTestData> {
    const res = await this.runTool('security_self_test');
    return res.result as unknown as SecuritySelfTestData;
  }

  // ---- Network & DNS Inventory Endpoints ----

  public async getSubnets(): Promise<SubnetInfo[]> {
    return this.request<SubnetInfo[]>('/api/network/subnet/');
  }

  public async confirmSubnet(data: {
    subnet: string;
    gateway_ip?: string;
    interface_name?: string;
    confirmed?: boolean;
  }): Promise<SubnetInfo> {
    return this.request<SubnetInfo>('/api/network/subnet/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async getNetworkDevices(label?: string, online?: boolean, search?: string): Promise<NetworkDeviceItem[]> {
    const params = new URLSearchParams();
    if (label && label !== 'all') params.append('label', label);
    if (online !== undefined) params.append('online', String(online));
    if (search) params.append('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<NetworkDeviceItem[]>(`/api/network/devices/${qs}`);
  }

  public async getNetworkDevice(id: number): Promise<NetworkDeviceItem> {
    return this.request<NetworkDeviceItem>(`/api/network/devices/${id}/`);
  }

  public async updateNetworkDevice(id: number, data: Partial<NetworkDeviceItem>): Promise<NetworkDeviceItem> {
    return this.request<NetworkDeviceItem>(`/api/network/devices/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  public async deleteNetworkDevice(id: number): Promise<void> {
    return this.request<void>(`/api/network/devices/${id}/`, {
      method: 'DELETE',
    });
  }

  public async scanNetwork(subnet?: string): Promise<NetworkScanResponse> {
    return this.request<NetworkScanResponse>('/api/network/scan/', {
      method: 'POST',
      body: JSON.stringify({ subnet: subnet || 'auto' }),
    });
  }

  public async getNetworkAlerts(acknowledged?: boolean): Promise<NetworkAlertItem[]> {
    const qs = acknowledged !== undefined ? `?acknowledged=${acknowledged}` : '';
    return this.request<NetworkAlertItem[]>(`/api/network/alerts/${qs}`);
  }

  public async ackNetworkAlert(id: number): Promise<NetworkAlertItem> {
    return this.request<NetworkAlertItem>(`/api/network/alerts/${id}/ack/`, {
      method: 'POST',
    });
  }

  public async ackAllNetworkAlerts(): Promise<{ acknowledged_count: number }> {
    return this.request<{ acknowledged_count: number }>('/api/network/alerts/ack-all/', {
      method: 'POST',
    });
  }

  public async getDnsLogs(search?: string, source?: string): Promise<DnsQueryLogItem[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (source && source !== 'all') params.append('source', source);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<DnsQueryLogItem[]>(`/api/network/dns/${qs}`);
  }

  public async lookupDns(query: string): Promise<{
    query: string;
    query_type: string;
    status: string;
    results: string[];
    message: string;
  }> {
    return this.request<{
      query: string;
      query_type: string;
      status: string;
      results: string[];
      message: string;
    }>('/api/network/dns/lookup/', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  }

  public async importDnsLogs(data: {
    entries?: Array<{ domain: string; client_ip?: string; query_type?: string; response?: string; timestamp?: string }>;
    csv_content?: string;
  }): Promise<{ status: string; imported_count: number; message: string }> {
    return this.request<{ status: string; imported_count: number; message: string }>('/api/network/dns/import/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async exportNetworkData(): Promise<NetworkExportData> {
    return this.request<NetworkExportData>('/api/network/export/');
  }

  public async clearNetworkData(scope: 'all' | 'devices' | 'alerts' | 'dns' | 'prune_90_days'): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('/api/network/clear/', {
      method: 'POST',
      body: JSON.stringify({ scope }),
    });
  }

  // ---- Defensive Security Center: File Scanner & Quarantine ----

  public async scanFile(fileOrPath: { file?: File; path?: string }): Promise<ScanFindingItem> {
    if (fileOrPath.file) {
      const formData = new FormData();
      formData.append('file', fileOrPath.file);
      return this.request<ScanFindingItem>('/api/security/scan/', {
        method: 'POST',
        body: formData,
      });
    }

    return this.request<ScanFindingItem>('/api/security/scan/', {
      method: 'POST',
      body: JSON.stringify({ path: fileOrPath.path }),
    });
  }

  public async getScanFindings(): Promise<ScanFindingItem[]> {
    return this.request<ScanFindingItem[]>('/api/security/findings/');
  }

  public async getScanFinding(id: number): Promise<ScanFindingItem> {
    return this.request<ScanFindingItem>(`/api/security/findings/${id}/`);
  }

  public async getQuarantineItems(): Promise<QuarantineItem[]> {
    return this.request<QuarantineItem[]>('/api/security/quarantine/');
  }

  public async quarantineFile(path: string, notes?: string): Promise<QuarantineActionResponse> {
    return this.request<QuarantineActionResponse>('/api/security/quarantine/action/', {
      method: 'POST',
      body: JSON.stringify({ path, notes }),
    });
  }

  public async restoreQuarantinedFile(id: number): Promise<QuarantineActionResponse> {
    return this.request<QuarantineActionResponse>(`/api/security/quarantine/${id}/restore/`, {
      method: 'POST',
    });
  }

  public async deleteQuarantinedFile(id: number): Promise<QuarantineActionResponse> {
    return this.request<QuarantineActionResponse>(`/api/security/quarantine/${id}/delete/`, {
      method: 'POST',
    });
  }

  public async lookupHash(hash: string): Promise<HashLookupResponse> {
    return this.request<HashLookupResponse>('/api/security/hash-lookup/', {
      method: 'POST',
      body: JSON.stringify({ hash }),
    });
  }

  // --- Threat Detection & Incident Response ---

  public async getIncidents(params?: {
    status?: string;
    severity?: string;
    category?: string;
  }): Promise<SecurityIncident[]> {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.severity) q.append('severity', params.severity);
    if (params?.category) q.append('category', params.category);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request<SecurityIncident[]>(`/api/security/incidents/${qs}`);
  }

  public async getIncident(id: number): Promise<SecurityIncident> {
    return this.request<SecurityIncident>(`/api/security/incidents/${id}/`);
  }

  public async updateIncident(
    id: number,
    data: {
      status?: string;
      notes?: string;
      playbook_progress?: string[];
    }
  ): Promise<SecurityIncident> {
    return this.request<SecurityIncident>(`/api/security/incidents/${id}/update/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  public async runThreatDetector(): Promise<{
    scanned_at: string;
    findings_count: number;
    findings: Array<{
      title: string;
      severity: string;
      category: string;
      source_val: string;
    }>;
    summary: string;
  }> {
    return this.request('/api/security/incidents/run-detector/', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  public async killProcess(
    pid: number,
    processName?: string,
    incidentId?: number
  ): Promise<QuarantineActionResponse> {
    return this.request<QuarantineActionResponse>('/api/security/actions/kill-process/', {
      method: 'POST',
      body: JSON.stringify({
        pid,
        process_name: processName,
        incident_id: incidentId,
      }),
    });
  }

  public async blockIp(
    ipAddress: string,
    direction: string = 'inbound',
    reason?: string,
    incidentId?: number
  ): Promise<QuarantineActionResponse> {
    return this.request<QuarantineActionResponse>('/api/security/actions/block-ip/', {
      method: 'POST',
      body: JSON.stringify({
        ip_address: ipAddress,
        direction,
        reason,
        incident_id: incidentId,
      }),
    });
  }

  public async getFirewallRules(status: string = 'active'): Promise<FirewallRuleItem[]> {
    const qs = status ? `?status=${status}` : '';
    return this.request<FirewallRuleItem[]>(`/api/security/firewall-rules/${qs}`);
  }

  public async rollbackFirewallRule(id: number): Promise<{
    status: string;
    rule_name: string;
    message: string;
  }> {
    return this.request(`/api/security/firewall-rules/${id}/rollback/`, {
      method: 'POST',
    });
  }

  public async getSecuritySummary(): Promise<SecuritySummary> {
    return this.request<SecuritySummary>('/api/security/summary/');
  }

  // ---- Assistant Memories & Preferences ----

  public async getMemories(category?: string, search?: string): Promise<AssistantMemoryItem[]> {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.append('category', category);
    if (search) params.append('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<AssistantMemoryItem[]>(`/api/assistant/memories/${qs}`);
  }

  public async createMemory(data: {
    key: string;
    content: string;
    category?: string;
  }): Promise<AssistantMemoryItem> {
    return this.request<AssistantMemoryItem>('/api/assistant/memories/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateMemory(
    id: number,
    data: { key?: string; content?: string; category?: string }
  ): Promise<AssistantMemoryItem> {
    return this.request<AssistantMemoryItem>(`/api/assistant/memories/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  public async deleteMemory(id: number): Promise<{ status: string; id: number }> {
    return this.request<{ status: string; id: number }>(`/api/assistant/memories/${id}/`, {
      method: 'DELETE',
    });
  }

  public async clearMemories(): Promise<{ status: string; count: number }> {
    return this.request<{ status: string; count: number }>('/api/assistant/memories/clear/', {
      method: 'POST',
    });
  }
}

export const api = new ApiClient();

