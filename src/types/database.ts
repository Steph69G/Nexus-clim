export type MaintenanceContract = {
  id: string;
  contract_number: string;
  client_id: string;

  origin_type: 'new_installation' | 'existing_equipment';
  installation_invoice_id?: string;
  installation_date?: string;

  duration_years: 1 | 3 | 5;
  start_date: string;
  end_date: string;

  annual_price_ht: number;
  annual_price_ttc: number;
  vat_rate: number;
  vat_rate_reason?: string;

  total_price_ht: number;
  total_price_ttc: number;
  discounted_total_ht?: number;
  discounted_total_ttc?: number;

  payment_mode: 'annual_debit' | 'one_time';
  payment_status: 'pending' | 'paid' | 'partial' | 'overdue';

  sepa_mandate_id?: string;
  sepa_iban_last4?: string;
  next_debit_date?: string;

  status: 'draft' | 'active' | 'suspended' | 'cancelled' | 'expired' | 'renewed';
  status_reason?: string;

  auto_renewal: boolean;
  renewal_notice_sent_at?: string;
  renewal_reminder_sent_at?: string;
  renewed_to_contract_id?: string;

  cancellation_date?: string;
  cancellation_reason?: string;
  cancelled_by?: 'client' | 'provider';

  internal_notes?: string;
  client_notes?: string;

  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
};

export type ContractEquipment = {
  id: string;
  contract_id: string;

  equipment_type: string;
  equipment_location?: string;
  equipment_brand?: string;
  equipment_model?: string;
  equipment_serial_number?: string;
  installation_date?: string;

  annual_price_ht: number;
  annual_price_ttc: number;

  notes?: string;

  created_at: string;
  updated_at: string;
};

export type ContractScheduledIntervention = {
  id: string;
  contract_id: string;
  mission_id?: string;

  year_number: number;
  scheduled_date: string;

  status: 'scheduled' | 'assigned' | 'completed' | 'cancelled';
  completed_at?: string;

  attestation_pdf_url?: string;
  attestation_generated_at?: string;

  notes?: string;

  created_at: string;
  updated_at: string;
};

export type SepaMandate = {
  id: string;
  client_id: string;

  mandate_reference: string;

  iban: string;
  bic?: string;
  account_holder_name: string;
  bank_name?: string;

  signed_at: string;
  signature_method: 'electronic' | 'paper';
  signature_ip?: string;
  signature_document_url?: string;

  status: 'active' | 'revoked' | 'expired';
  revoked_at?: string;
  revoked_reason?: string;

  contracts_count: number;
  last_used_at?: string;

  internal_notes?: string;

  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
};

export type SubcontractorCertification = {
  id: string;
  user_id: string;

  rge_certified: boolean;
  rge_number?: string;
  rge_expiry_date?: string;
  rge_document_url?: string;
  rge_specialties?: string[];

  qualibois_certified: boolean;
  qualibois_number?: string;
  qualibois_expiry_date?: string;
  qualibois_document_url?: string;

  qualipac_certified: boolean;
  qualipac_number?: string;
  qualipac_expiry_date?: string;
  qualipac_document_url?: string;

  decennale_valid: boolean;
  decennale_insurer?: string;
  decennale_policy_number?: string;
  decennale_expiry_date?: string;
  decennale_document_url?: string;
  decennale_coverage_amount_euros?: number;

  rc_pro_valid: boolean;
  rc_pro_insurer?: string;
  rc_pro_policy_number?: string;
  rc_pro_expiry_date?: string;
  rc_pro_document_url?: string;

  status: 'valid' | 'expired' | 'expiring_soon' | 'pending_renewal' | 'incomplete';

  last_checked_at: string;
  last_checked_by?: string;
  next_check_date?: string;

  expiry_alert_sent_at?: string;
  expiry_alert_count: number;

  internal_notes?: string;

  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
};

export type InstallationChecklist = {
  id: string;
  mission_id: string;

  conforme_au_devis: boolean;
  test_etancheite_ok: boolean;
  test_pression_ok: boolean;
  cerfa_rempli: boolean;
  explication_client_ok: boolean;
  nettoyage_ok: boolean;
  photos_avant_apres_ok: boolean;
  signature_client_obtenue: boolean;

  mise_en_service_ok: boolean;
  reglages_optimaux_ok: boolean;
  documentation_remise: boolean;
  garantie_expliquee: boolean;

  photos_before: string[];
  photos_after: string[];
  photos_installation: string[];

  pression_bar?: number;
  temperature_soufflage_celsius?: number;
  puissance_electrique_watts?: number;

  observations?: string;
  client_feedback?: string;
  issues_encountered?: string;

  completed_by: string;
  completed_at: string;

  validated_by?: string;
  validated_at?: string;
  validation_status: 'pending' | 'approved' | 'rejected' | 'corrected';
  rejection_reason?: string;

  payment_released: boolean;
  payment_released_at?: string;
  payment_released_by?: string;

  client_rating?: number;
  client_comment?: string;
  client_signature_url?: string;

  created_at: string;
  updated_at: string;
  deleted_at?: string;
};

export type ClientSatisfactionSurvey = {
  id: string;
  mission_id: string;
  client_id: string;

  sent_at: string;
  sent_via: 'email' | 'sms' | 'in_person' | 'app';

  completed_at?: string;
  response_time_minutes?: number;

  overall_rating?: number;

  punctuality_rating?: number;
  quality_rating?: number;
  cleanliness_rating?: number;
  explanation_rating?: number;
  professionalism_rating?: number;

  would_recommend?: number;
  nps_category?: 'detractor' | 'passive' | 'promoter';

  comment?: string;
  positive_aspects?: string;
  improvement_suggestions?: string;

  on_time?: boolean;
  explained_work?: boolean;
  clean_workspace?: boolean;
  would_use_again?: boolean;

  response_needed: boolean;
  response_priority?: 'low' | 'medium' | 'high' | 'urgent';
  response_handled_by?: string;
  response_handled_at?: string;
  response_notes?: string;

  allow_public_review: boolean;
  published_as_testimonial: boolean;

  created_at: string;
  updated_at: string;
  deleted_at?: string;
};

export type EmergencyRequest = {
  id: string;
  client_id: string;

  request_type: 'breakdown' | 'urgent_repair' | 'no_heating' | 'no_cooling' | 'leak' | 'noise' | 'smell' | 'other';

  title: string;
  description: string;

  urgency_level: 'normal' | 'urgent' | 'critical';

  equipment_type?: string;
  equipment_location?: string;
  equipment_brand?: string;
  equipment_model?: string;
  equipment_age_years?: number;

  contract_id?: string;
  covered_by_contract: boolean;

  site_address: string;
  site_city: string;
  site_postal_code: string;
  site_coordinates?: { lat: number; lng: number };

  photos: string[];

  status: 'pending' | 'assigned' | 'in_progress' | 'resolved' | 'cancelled';

  assigned_to?: string;
  assigned_at?: string;

  promised_intervention_date?: string;
  actual_intervention_date?: string;
  resolved_at?: string;

  first_response_at?: string;
  first_response_time_minutes?: number;
  resolution_time_minutes?: number;

  mission_id?: string;
  mission_created_at?: string;

  client_rating?: number;
  client_comment?: string;

  internal_notes?: string;
  resolution_notes?: string;

  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
};

export type ClientPortalDocument = {
  id: string;
  client_id: string;

  document_type: 'quote' | 'invoice' | 'contract' | 'attestation' | 'warranty' | 'certificate' | 'report' | 'photo' | 'manual' | 'other';

  document_name: string;
  document_description?: string;
  document_url: string;
  file_size_bytes?: number;
  file_type?: string;

  related_mission_id?: string;
  related_contract_id?: string;
  related_quote_id?: string;
  related_invoice_id?: string;

  visible_to_client: boolean;
  visibility_reason?: string;

  tags: string[];

  viewed_by_client: boolean;
  first_viewed_at?: string;
  last_viewed_at?: string;
  view_count: number;
  download_count: number;

  version_number: number;
  superseded_by_document_id?: string;

  expires_at?: string;
  expiry_reminder_sent: boolean;

  uploaded_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
};

export type Notification = {
  id: string;
  user_id: string;

  notification_type:
    | 'mission_assigned' | 'mission_updated' | 'mission_completed' | 'mission_cancelled'
    | 'quote_sent' | 'quote_accepted' | 'quote_rejected' | 'quote_expiring'
    | 'invoice_sent' | 'invoice_paid' | 'invoice_overdue'
    | 'contract_created' | 'contract_renewal_reminder' | 'contract_expiring' | 'maintenance_due'
    | 'emergency_request_received' | 'emergency_assigned' | 'emergency_resolved'
    | 'survey_request' | 'survey_reminder'
    | 'certification_expiring' | 'payment_released' | 'document_available'
    | 'general';

  title: string;
  message: string;

  channels: ('email' | 'sms' | 'push' | 'in_app')[];

  priority: 'low' | 'normal' | 'high' | 'urgent';

  email_status?: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  email_sent_at?: string;
  email_delivered_at?: string;
  email_error?: string;

  sms_status?: 'pending' | 'sent' | 'delivered' | 'failed';
  sms_sent_at?: string;
  sms_delivered_at?: string;
  sms_error?: string;

  push_status?: 'pending' | 'sent' | 'delivered' | 'failed';
  push_sent_at?: string;
  push_delivered_at?: string;
  push_error?: string;

  read_at?: string;
  archived_at?: string;

  related_mission_id?: string;
  related_quote_id?: string;
  related_invoice_id?: string;
  related_contract_id?: string;
  related_request_id?: string;

  action_url?: string;
  action_label?: string;

  data: Record<string, any>;

  retry_count: number;
  max_retries: number;
  next_retry_at?: string;

  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
};

export type KpiSnapshot = {
  id: string;

  period_start: string;
  period_end: string;
  period_type: 'weekly' | 'monthly' | 'quarterly' | 'yearly';

  quotes_sent: number;
  quotes_signed: number;
  quotes_rejected: number;
  quotes_expired: number;
  quotes_pending: number;
  conversion_rate?: number;

  total_revenue_ht: number;
  total_revenue_ttc: number;
  average_transaction_value_ttc?: number;

  missions_created: number;
  missions_assigned: number;
  missions_completed: number;
  missions_cancelled: number;
  missions_delayed: number;

  average_intervention_delay_hours?: number;
  average_mission_duration_minutes?: number;
  on_time_completion_rate?: number;

  surveys_sent: number;
  surveys_completed: number;
  survey_response_rate?: number;
  average_client_rating?: number;
  nps_score?: number;
  recommendation_rate?: number;
  promoters_count: number;
  passives_count: number;
  detractors_count: number;

  active_contracts: number;
  new_contracts: number;
  expiring_contracts: number;
  cancelled_contracts: number;
  contract_renewal_rate?: number;
  maintenance_revenue_ttc: number;

  emergency_requests_received: number;
  emergency_requests_resolved: number;
  average_response_time_hours?: number;
  sla_compliance_rate?: number;

  subcontractor_missions: number;
  subcontractor_acceptance_rate?: number;
  subcontractor_completion_rate?: number;
  subcontractor_payments_released: number;

  invoices_sent: number;
  invoices_paid: number;
  invoices_overdue: number;
  average_payment_delay_days?: number;
  cash_collected_ttc: number;

  average_margin_percentage?: number;
  total_margin_euros: number;

  average_missions_per_tech?: number;
  average_revenue_per_tech?: number;

  new_clients: number;
  returning_clients: number;
  total_active_clients: number;
  client_retention_rate?: number;

  checklists_completed: number;
  checklists_approved: number;
  checklists_rejected: number;
  quality_approval_rate?: number;

  calculated_at: string;
  calculation_duration_seconds?: number;

  created_at: string;
  updated_at: string;
};

export type QualityMeeting = {
  id: string;

  meeting_date: string;
  meeting_type: 'quarterly_quality' | 'monthly_review' | 'urgent_quality' | 'training' | 'onboarding' | 'other';

  title: string;
  description?: string;
  location?: string;

  attendees: string[];
  required_attendees: string[];
  optional_attendees: string[];

  actual_attendees: string[];
  absent_attendees: string[];

  topics: Array<{
    title: string;
    notes?: string;
    duration_minutes?: number;
  }>;

  action_items: Array<{
    id: string;
    description: string;
    assignee_id: string;
    due_date: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    created_at: string;
    updated_at?: string;
  }>;

  meeting_status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';

  minutes?: string;
  key_decisions?: string;
  next_steps?: string;

  minutes_document_url?: string;
  presentation_urls: string[];
  attachment_urls: string[];

  follow_up_meeting_id?: string;
  follow_up_required: boolean;
  follow_up_date?: string;

  scheduled_duration_minutes: number;
  actual_duration_minutes?: number;

  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
};
