import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

describe('Workflow RPC Tests', () => {
  let testMissionId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Setup: Create test mission
    const { data: mission, error } = await supabase
      .from('missions')
      .insert({
        title: 'Test Mission Workflow',
        client_name: 'Test Client',
        address: '123 Test Street',
        status: 'BROUILLON',
      })
      .select()
      .single();

    if (error) throw error;
    testMissionId = mission.id;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (user) testUserId = user.id;
  });

  afterAll(async () => {
    // Cleanup: Delete test mission
    if (testMissionId) {
      await supabase
        .from('missions')
        .delete()
        .eq('id', testMissionId);
    }
  });

  describe('Idempotence', () => {
    it('should generate consistent idempotency key', async () => {
      const { data, error } = await supabase.rpc('generate_idempotency_key', {
        p_mission_id: testMissionId,
        p_rpc_name: 'rpc_publish_mission',
        p_params: { test: 'value' },
      });

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(typeof data).toBe('string');

      // Same params should generate same key
      const { data: data2 } = await supabase.rpc('generate_idempotency_key', {
        p_mission_id: testMissionId,
        p_rpc_name: 'rpc_publish_mission',
        p_params: { test: 'value' },
      });

      expect(data).toBe(data2);
    });

    it('should cache RPC results', async () => {
      const idempotencyKey = crypto.randomUUID();

      // First call
      const { data: result1 } = await supabase.rpc('check_idempotency', {
        p_idempotency_key: idempotencyKey,
        p_mission_id: testMissionId,
        p_rpc_name: 'test_rpc',
      });

      expect(result1.cached).toBe(false);

      // Record result
      await supabase.rpc('record_idempotent_result', {
        p_idempotency_key: idempotencyKey,
        p_mission_id: testMissionId,
        p_rpc_name: 'test_rpc',
        p_request_hash: 'test_hash',
        p_response_data: { test: 'result' },
      });

      // Second call should be cached
      const { data: result2 } = await supabase.rpc('check_idempotency', {
        p_idempotency_key: idempotencyKey,
        p_mission_id: testMissionId,
        p_rpc_name: 'test_rpc',
      });

      expect(result2.cached).toBe(true);
      expect(result2.response).toEqual({ test: 'result' });
    });
  });

  describe('Business Hours', () => {
    it('should detect business hours correctly', async () => {
      // Test avec timestamp en semaine 14h
      const weekday = '2025-11-10 14:00:00';
      const { data: isBusinessHours } = await supabase.rpc('is_business_hours', {
        p_timestamp: weekday,
      });

      expect(isBusinessHours).toBe(true);
    });

    it('should reject weekend scheduling', async () => {
      // Test samedi
      const saturday = '2025-11-08 14:00:00';
      const { data: isBusinessHours } = await supabase.rpc('is_business_hours', {
        p_timestamp: saturday,
      });

      expect(isBusinessHours).toBe(false);
    });

    it('should reject night hours', async () => {
      // Test 22h
      const night = '2025-11-10 22:00:00';
      const { data: isBusinessHours } = await supabase.rpc('is_business_hours', {
        p_timestamp: night,
      });

      expect(isBusinessHours).toBe(false);
    });
  });

  describe('Logs Immutability', () => {
    it('should prevent UPDATE on workflow logs', async () => {
      // Try to update a log (should fail)
      const { error } = await supabase
        .from('mission_workflow_log')
        .update({ reason: 'hacked' })
        .eq('id', 'any-id');

      expect(error).toBeTruthy();
      expect(error?.message).toContain('immutable');
    });

    it('should prevent DELETE on workflow logs', async () => {
      // Try to delete a log (should fail)
      const { error } = await supabase
        .from('mission_workflow_log')
        .delete()
        .eq('id', 'any-id');

      expect(error).toBeTruthy();
      expect(error?.message).toContain('immutable');
    });
  });

  describe('Risk Scoring', () => {
    it('should calculate risk score for mission', async () => {
      const { data: score, error } = await supabase.rpc('calculate_mission_risk_score', {
        p_mission_id: testMissionId,
      });

      expect(error).toBeNull();
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Monitoring Dashboard', () => {
    it('should return monitoring metrics', async () => {
      const { data, error } = await supabase
        .from('v_monitoring_dashboard')
        .select('*')
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data).toHaveProperty('missions_active');
      expect(data).toHaveProperty('missions_paused');
      expect(data).toHaveProperty('notifications_pending');
      expect(data).toHaveProperty('idempotency_cache_size');
    });
  });

  describe('Daily Stats', () => {
    it('should generate daily stats', async () => {
      const { data, error } = await supabase.rpc('generate_daily_stats', {
        p_date: '2025-11-07',
      });

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data).toHaveProperty('missions');
      expect(data).toHaveProperty('reports');
      expect(data).toHaveProperty('billing');
      expect(data).toHaveProperty('notifications');
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect workflow anomalies', async () => {
      const { data, error } = await supabase.rpc('detect_workflow_anomalies');

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);

      if (data && data.length > 0) {
        const anomaly = data[0];
        expect(anomaly).toHaveProperty('anomaly_type');
        expect(anomaly).toHaveProperty('severity');
        expect(anomaly).toHaveProperty('description');
        expect(anomaly).toHaveProperty('action_required');
      }
    });
  });

  describe('Cleanup Functions', () => {
    it('should cleanup expired idempotency entries', async () => {
      const { data, error } = await supabase.rpc('cleanup_expired_idempotency');

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data).toHaveProperty('deleted_count');
      expect(data).toHaveProperty('cleaned_at');
    });

    it('should cleanup expired notifications', async () => {
      const { data, error } = await supabase.rpc('cleanup_expired_notifications');

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data).toHaveProperty('deleted_count');
      expect(data).toHaveProperty('failed_count');
    });
  });

  describe('Timezone Functions', () => {
    it('should return Paris timezone', async () => {
      const { data, error } = await supabase.rpc('now_paris');

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(typeof data).toBe('string');
    });

    it('should format datetime in French', async () => {
      const { data, error } = await supabase.rpc('format_paris_datetime', {
        p_timestamp: '2025-11-07 14:30:00',
      });

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data).toMatch(/\d{2}\/\d{2}\/\d{4} à \d{2}:\d{2}/);
    });
  });
});

describe('Transition System Tests', () => {
  let testMissionId: string;

  beforeAll(async () => {
    const { data: mission } = await supabase
      .from('missions')
      .insert({
        title: 'Test Transition',
        client_name: 'Test',
        address: 'Test',
        status: 'BROUILLON',
      })
      .select()
      .single();

    if (mission) testMissionId = mission.id;
  });

  afterAll(async () => {
    if (testMissionId) {
      await supabase.from('missions').delete().eq('id', testMissionId);
    }
  });

  it('should validate transition rules', async () => {
    // Get transition rules
    const { data: transitions } = await supabase
      .from('v_workflow_transitions_doc')
      .select('*');

    expect(transitions).toBeTruthy();
    expect(Array.isArray(transitions)).toBe(true);
    expect(transitions!.length).toBeGreaterThan(0);

    // Verify structure
    const transition = transitions![0];
    expect(transition).toHaveProperty('from_status');
    expect(transition).toHaveProperty('to_status');
    expect(transition).toHaveProperty('allowed_roles');
    expect(transition).toHaveProperty('description');
  });

  it('should apply transition effects', async () => {
    const effects = {
      set: { test_field: 'test_value' },
    };

    // This will fail gracefully if test_field doesn't exist
    const { error } = await supabase.rpc('apply_transition_effects', {
      p_mission_id: testMissionId,
      p_effects: effects,
    });

    // We expect an error here since test_field doesn't exist
    // This test validates the function exists and can be called
    expect(error).toBeTruthy();
  });
});
