import { supabase } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function callEdgeFunction(functionName: string, payload: Record<string, unknown>) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Edge function ${functionName} failed: ${error}`);
  }

  return response.json();
}

export async function notifyMissionAccepted(missionId: string) {
  try {
    await callEdgeFunction('on-mission-accepted', { mission_id: missionId });
    console.log('✅ Mission accepted notification sent');
  } catch (error) {
    console.error('❌ Failed to send mission accepted notification:', error);
  }
}

export async function notifyMissionScheduled(missionId: string) {
  try {
    await callEdgeFunction('on-mission-scheduled', { mission_id: missionId });
    console.log('✅ Mission scheduled notification sent');
  } catch (error) {
    console.error('❌ Failed to send mission scheduled notification:', error);
  }
}

export async function notifyInvoiceIssued(missionId: string) {
  try {
    await callEdgeFunction('on-invoice-issued', { mission_id: missionId });
    console.log('✅ Invoice issued notification sent');
  } catch (error) {
    console.error('❌ Failed to send invoice notification:', error);
  }
}

export async function notifyPaymentReceived(missionId: string) {
  try {
    await callEdgeFunction('on-payment-received', { mission_id: missionId });
    console.log('✅ Payment received notification sent');
  } catch (error) {
    console.error('❌ Failed to send payment notification:', error);
  }
}
