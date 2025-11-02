import { supabase } from '../lib/supabase';
import {
  notifyMissionAccepted,
  notifyMissionScheduled,
  notifyInvoiceIssued,
  notifyPaymentReceived,
} from './workflow.hooks';

export async function publishMission(missionId: string) {
  const { error } = await supabase.rpc('rpc_publish_mission', {
    _mission_id: missionId,
  });

  if (error) throw error;

  console.log('✅ Mission published');
}

export async function acceptMission(missionId: string) {
  const { error } = await supabase.rpc('rpc_accept_mission', {
    _mission_id: missionId,
  });

  if (error) throw error;

  await notifyMissionAccepted(missionId);
  console.log('✅ Mission accepted');
}

export async function scheduleMission(
  missionId: string,
  scheduledStart: string,
  scheduledEnd?: string
) {
  const { error } = await supabase.rpc('rpc_schedule_mission', {
    _mission_id: missionId,
    _scheduled_start: scheduledStart,
    _scheduled_end: scheduledEnd || null,
  });

  if (error) throw error;

  await notifyMissionScheduled(missionId);
  console.log('✅ Mission scheduled');
}

export async function startTravel(missionId: string) {
  const { error } = await supabase.rpc('rpc_start_travel', {
    _mission_id: missionId,
  });

  if (error) throw error;

  console.log('✅ Travel started');
}

export async function startIntervention(missionId: string) {
  const { error } = await supabase.rpc('rpc_start_intervention', {
    _mission_id: missionId,
  });

  if (error) throw error;

  console.log('✅ Intervention started');
}

export async function pauseMission(
  missionId: string,
  pauseReason: string,
  pauseNote?: string
) {
  const { error } = await supabase.rpc('rpc_pause_mission', {
    _mission_id: missionId,
    _pause_reason: pauseReason,
    _pause_note: pauseNote || null,
  });

  if (error) throw error;

  console.log('✅ Mission paused');
}

export async function resumeFromPause(missionId: string) {
  const { error } = await supabase.rpc('rpc_resume_from_pause', {
    _mission_id: missionId,
  });

  if (error) throw error;

  console.log('✅ Mission resumed');
}

export async function completeIntervention(missionId: string) {
  const { error } = await supabase.rpc('rpc_complete_intervention', {
    _mission_id: missionId,
  });

  if (error) throw error;

  console.log('✅ Intervention completed');
}

export async function validateReport(missionId: string) {
  const { error } = await supabase.rpc('rpc_validate_report', {
    _mission_id: missionId,
  });

  if (error) throw error;

  console.log('✅ Report validated');
}

export async function rejectReport(
  missionId: string,
  rejectionReason: string,
  details: string
) {
  const { error } = await supabase.rpc('rpc_reject_report', {
    _mission_id: missionId,
    _rejection_reason: rejectionReason,
    _details: details,
  });

  if (error) throw error;

  console.log('✅ Report rejected');
}

export async function issueInvoice(missionId: string, invoiceData: {
  lines: Array<{
    description: string;
    quantity: number;
    unit_price_cents: number;
    vat_rate: number;
  }>;
  notes?: string;
}) {
  const { data: mission } = await supabase
    .from('missions')
    .select('id')
    .eq('id', missionId)
    .single();

  if (!mission) throw new Error('Mission not found');

  const subtotal = invoiceData.lines.reduce(
    (sum, line) => sum + line.quantity * line.unit_price_cents,
    0
  );
  const vat = invoiceData.lines.reduce(
    (sum, line) =>
      sum + ((line.quantity * line.unit_price_cents * line.vat_rate) / 100),
    0
  );

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      mission_id: missionId,
      lines: invoiceData.lines,
      subtotal_ht_cents: Math.round(subtotal),
      vat_cents: Math.round(vat),
      total_ttc_cents: Math.round(subtotal + vat),
      notes: invoiceData.notes,
      issued_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from('missions')
    .update({ billing_status: 'FACTUREE' })
    .eq('id', missionId);

  await notifyInvoiceIssued(missionId);

  console.log('✅ Invoice issued:', invoice.id);
  return invoice;
}

export async function markInvoicePaid(
  missionId: string,
  paymentMethod: string,
  paymentReference?: string
) {
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id')
    .eq('mission_id', missionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!invoice) throw new Error('Invoice not found');

  const { error: invoiceError } = await supabase
    .from('invoices')
    .update({
      paid_at: new Date().toISOString(),
      payment_method: paymentMethod,
      payment_reference: paymentReference,
    })
    .eq('id', invoice.id);

  if (invoiceError) throw invoiceError;

  const { error: missionError } = await supabase
    .from('missions')
    .update({ billing_status: 'PAYEE' })
    .eq('id', missionId);

  if (missionError) throw missionError;

  await notifyPaymentReceived(missionId);

  console.log('✅ Invoice marked as paid');
}
