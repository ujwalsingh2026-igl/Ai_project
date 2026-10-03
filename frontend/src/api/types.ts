export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: Record<string, unknown> | Array<unknown> | string | null;
}

export interface ApiErrorResponse {
  error: ApiErrorDetail;
}

export class ApiError extends Error {
  code: string;
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export interface TokenResponse {
  token: string;
}

export interface MessageMetadata {
  intent?: string;
  provider?: string;
  model?: string;
  tool?: string;
  tool_status?: 'executed' | 'needs_approval' | 'blocked' | 'failed' | 'not_found';
  decision?: 'allow' | 'ask' | 'block';
  pending_action_id?: string;
  pending_expires_at?: string;
  approval?: 'approve' | 'deny';
  [key: string]: unknown;
}

export interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  metadata?: MessageMetadata;
  created_at: string;
}

export interface ChatRequest {
  message: string;
  conversation_id?: string;
}

export interface ChatResponse {
  conversation_id: string;
  reply: Message;
}

export interface ConfirmRequest {
  action_id: string;
  decision: 'approve' | 'deny';
}

export interface ConfirmResponse {
  status: 'executed' | 'denied' | 'blocked' | 'failed' | 'not_found' | 'expired' | 'not_pending';
  message: string;
  reply?: Message | null;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
}

export interface ToolSpec {
  name: string;
  description: string;
  risk_level: number;
  required_permission: string;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  allowed_operations: string[];
}

export interface AuditLog {
  id: number;
  tool_name: string;
  risk_level: number | null;
  decision: string;
  status: string;
  reason: string;
  details: { arg_names?: string[] };
  created_at: string;
}

export interface PendingApproval {
  id: string;
  tool_name: string;
  args: Record<string, unknown>;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  created_at: string;
  expires_at: string;
  resolved_at?: string | null;
}

export interface AssistantStatus {
  status: string;
  ai: {
    provider: string;
    model?: string | null;
  };
  pending_approvals_count: number;
}

export interface TaskItem {
  id: number;
  title: string;
  due_date?: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed';
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ReminderItem {
  id: number;
  time: string;
  message: string;
  delivered: boolean;
  created_at: string;
}

export interface NoteItem {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface DailyBriefData {
  date: string;
  tasks_summary: {
    total: number;
    pending: number;
    completed: number;
    overdue: number;
  };
  today_tasks: TaskItem[];
  upcoming_reminders: ReminderItem[];
  security_alerts: {
    open_count: number;
    status: string;
    message: string;
  };
  system_status: {
    os: string;
    cpu_usage: number | null;
    ram_usage: number | null;
    status: string;
  };
  learning_tips: {
    terminal_shortcut: { command: string; description: string };
    security_tip: { title: string; tip: string };
    python_tip: { title: string; tip: string };
  };
}

export interface PlannerExportData {
  exported_at: string;
  user_id: string;
  tasks: TaskItem[];
  reminders: ReminderItem[];
  notes: NoteItem[];
}

export interface ToolRunResponse {
  status: 'executed' | 'needs_approval' | 'blocked' | 'invalid_input' | 'error';
  decision?: string;
  result?: Record<string, unknown>;
  summary?: string;
  pending_action_id?: string;
  pending_expires_at?: string;
  reason?: string;
}

export interface PostureCheckItem {
  id: string;
  title: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  score: number;
  max_score: number;
  details: string;
  meaning: string;
  rationale: string;
  remediation: string;
}

export interface SecurityPostureData {
  total_score: number;
  max_score: number;
  grade: string;
  checks: PostureCheckItem[];
}

export interface ProcessAnomalyFlag {
  rule: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  reason: string;
}

export interface ProcessItem {
  pid: number;
  name: string;
  exe: string;
  ppid: number;
  parent_name: string;
  username: string;
  cpu_percent: number;
  memory_mb: number;
  listening_ports: number[];
  flags: ProcessAnomalyFlag[];
}

export interface ProcessInspectData {
  total_processes: number;
  flagged_count: number;
  processes: ProcessItem[];
}

export interface ListeningPortItem {
  port: number;
  protocol: string;
  bind_ip: string;
  pid: number;
  process_name: string;
  is_public: boolean;
}

export interface ListeningPortsData {
  count: number;
  ports: ListeningPortItem[];
}

export interface SecuritySelfTestData {
  test_name: string;
  status: string;
  threat_name: string;
  hash_matched: boolean;
  signature_matched: boolean;
  explanation: string;
}

// ---- Network & DNS Types ----

export interface SubnetInfo {
  interface: string;
  ip: string;
  netmask: string;
  subnet: string;
  gateway: string;
  mac: string;
  confirmed: boolean;
  confirmed_at?: string | null;
}

export interface NetworkDeviceItem {
  id: number;
  mac_address: string;
  ip_address: string;
  hostname: string;
  vendor: string;
  label: 'mine' | 'family' | 'guest' | 'unknown';
  notes: string;
  first_seen: string;
  last_seen: string;
  is_online: boolean;
  sightings_count?: number;
  recent_sightings?: Array<{ id: number; ip_address: string; timestamp: string }>;
}

export interface NetworkAlertItem {
  id: number;
  device?: number | null;
  device_hostname?: string;
  device_mac?: string;
  alert_type: 'new_device' | 'ip_changed' | 'device_offline';
  severity: 'info' | 'low' | 'medium' | 'high';
  message: string;
  is_acknowledged: boolean;
  created_at: string;
}

export interface DnsQueryLogItem {
  id: number;
  domain: string;
  client_ip: string;
  query_type: string;
  response: string;
  timestamp: string;
  source: string;
  created_at: string;
}

export interface NetworkScanResponse {
  status: string;
  subnet: string;
  devices_found: number;
  new_devices_count: number;
  devices: Array<{
    ip: string;
    mac: string;
    hostname: string;
    vendor: string;
    is_new: boolean;
    ip_changed: boolean;
  }>;
  alerts_generated: number;
  message: string;
}

export interface NetworkExportData {
  exported_at: string;
  user: string;
  confirmed_subnets: Array<{
    subnet: string;
    gateway_ip: string;
    interface_name?: string;
    confirmed_by_user: boolean;
  }>;
  devices: NetworkDeviceItem[];
  alerts: NetworkAlertItem[];
  dns_logs: DnsQueryLogItem[];
}

export interface EvidenceItem {
  fact: string;
  source: string;
  inference: string;
  confidence: 'low' | 'medium' | 'high';
  severity?: 'info' | 'low' | 'medium' | 'high';
}

export interface ScanFindingItem {
  id: number;
  file_path: string;
  file_name: string;
  file_size: number;
  sha256: string;
  md5: string;
  entropy: number;
  verdict: 'clean' | 'suspicious' | 'likely_malicious';
  threat_score: number;
  evidence: EvidenceItem[];
  file_metadata: {
    pe_info?: {
      is_pe?: boolean;
      machine_type?: string;
      subsystem?: string;
      sections_count?: number;
      sections?: Array<{
        name: string;
        virtual_size: number;
        raw_size: number;
        entropy: number;
        characteristics: number;
      }>;
      has_packed_section?: boolean;
      max_section_entropy?: number;
      suspicious_imports_found?: string[];
    };
    script_info?: Record<string, unknown>;
    archive_info?: Record<string, unknown>;
    yara_matches?: Array<{
      rule_id: string;
      title: string;
      description: string;
      severity: string;
    }>;
    hashes?: {
      sha256: string;
      md5: string;
      sha1: string;
    };
    is_upload?: boolean;
    disclaimer?: string;
  };
  is_quarantined: boolean;
  created_at: string;
}

export interface QuarantineItem {
  id: number;
  original_path: string;
  quarantine_filename: string;
  quarantine_path: string;
  sha256: string;
  file_size: number;
  verdict: string;
  status: 'quarantined' | 'restored' | 'deleted';
  notes: string;
  created_at: string;
  restored_at?: string | null;
  deleted_at?: string | null;
}

export interface QuarantineActionResponse {
  status: 'needs_approval' | 'executed' | 'blocked' | 'error';
  decision?: string;
  reason?: string;
  pending_action_id?: string;
  pending_expires_at?: string;
  message?: string;
  result?: Record<string, unknown>;
  summary?: string;
}

export interface HashLookupResponse {
  status: 'found' | 'not_found';
  source: string;
  hash: string;
  verdict?: string;
  description?: string;
  file_name?: string;
  threat_score?: number;
  threat_level?: string;
  confidence?: string;
  scanned_at?: string;
  message?: string;
}

export interface IncidentTimelineItem {
  id: number;
  incident_id: number;
  action: string;
  actor: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface SecurityIncident {
  id: number;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'false_positive';
  source_type: string;
  source_val: string;
  evidence: Array<{
    fact: string;
    source?: string;
    inference?: string;
    confidence?: string;
    severity?: string;
  }>;
  mitre_tactics: string[];
  playbook_id?: string;
  playbook_progress: string[];
  notes: string;
  timeline?: IncidentTimelineItem[];
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
}

export interface FirewallRuleItem {
  id: number;
  rule_name: string;
  ip_address: string;
  direction: string;
  action: string;
  status: 'active' | 'removed';
  rollback_cmd: string;
  notes: string;
  created_at: string;
  removed_at?: string | null;
}

export interface SecuritySummary {
  open_incidents: number;
  critical_incidents: number;
  high_incidents: number;
  total_incidents: number;
  quarantined_files: number;
  scanned_files: number;
}

export type MemoryCategory = 'preference' | 'workflow' | 'project' | 'security_policy' | 'fact';

export interface AssistantMemoryItem {
  id: number;
  key: string;
  content: string;
  category: MemoryCategory;
  source: 'explicit' | 'chat';
  created_at: string;
  updated_at: string;
}

