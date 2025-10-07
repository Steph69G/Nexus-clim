const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Publie (ou re-publie) une mission via une edge function.
 */
export async function publishMission(
  id: string,
  opts?: { ttlMinutes?: number; alsoEmployees?: boolean }
) {
  console.log('Publishing mission:', id, 'with options:', opts);
  
  const apiUrl = `${SUPABASE_URL}/functions/v1/publish-mission`;

  const headers = {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };

  const body = JSON.stringify({
    mission_id: id,
    ttl_minutes: opts?.ttlMinutes ?? 30,
    include_employees: opts?.alsoEmployees ?? false,
  });

  console.log('Request body:', body);
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body,
  });

  console.log('Response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error response:', errorText);
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: errorText };
    }
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return await response.json();
}
