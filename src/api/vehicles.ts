import { supabase } from '../lib/supabase';

export interface Vehicle {
  id: string;
  registration_number: string;
  brand: string;
  model: string;
  year?: number;
  vehicle_type: 'van' | 'car' | 'truck' | 'motorcycle';
  fuel_type: 'diesel' | 'petrol' | 'electric' | 'hybrid' | 'plugin_hybrid';
  status: 'available' | 'in_use' | 'maintenance' | 'retired';
  purchase_date?: string;
  purchase_price?: number;
  current_mileage: number;
  last_mileage_update: string;
  insurance_company?: string;
  insurance_policy_number?: string;
  insurance_expiry?: string;
  technical_control_expiry?: string;
  assigned_to_user_id?: string;
  vin?: string;
  color?: string;
  seats?: number;
  cargo_capacity_m3?: number;
  notes?: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface VehicleMaintenance {
  id: string;
  vehicle_id: string;
  maintenance_type: 'oil_change' | 'tire_change' | 'revision' | 'technical_control' | 'repair' | 'cleaning' | 'other';
  maintenance_date: string;
  next_maintenance_date?: string;
  next_maintenance_mileage?: number;
  mileage_at_maintenance?: number;
  cost: number;
  provider?: string;
  description: string;
  notes?: string;
  invoice_url?: string;
  performed_by_user_id?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface VehicleAssignment {
  id: string;
  vehicle_id: string;
  user_id: string;
  assigned_at: string;
  returned_at?: string;
  initial_mileage?: number;
  final_mileage?: number;
  initial_condition?: string;
  final_condition?: string;
  condition_notes?: string;
  created_at: string;
}

export interface VehicleTrip {
  id: string;
  vehicle_id: string;
  mission_id?: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  start_location?: string;
  end_location?: string;
  start_lat?: number;
  start_lng?: number;
  end_lat?: number;
  end_lng?: number;
  start_mileage?: number;
  end_mileage?: number;
  distance_km?: number;
  fuel_cost: number;
  toll_cost: number;
  parking_cost: number;
  other_costs: number;
  purpose: 'mission' | 'return' | 'supply' | 'maintenance' | 'other';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export async function getVehicles() {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('registration_number');

  if (error) throw error;
  return data as Vehicle[];
}

export async function getVehicleById(id: string) {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as Vehicle | null;
}

export async function getAvailableVehicles() {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('status', 'available')
    .order('registration_number');

  if (error) throw error;
  return data as Vehicle[];
}

export async function getVehicleFleetOverview() {
  const { data, error } = await supabase
    .from('vehicle_fleet_overview')
    .select('*')
    .order('registration_number');

  if (error) throw error;
  return data;
}

export async function createVehicle(vehicle: Partial<Vehicle>) {
  const { data, error } = await supabase
    .from('vehicles')
    .insert(vehicle)
    .select()
    .single();

  if (error) throw error;
  return data as Vehicle;
}

export async function updateVehicle(id: string, updates: Partial<Vehicle>) {
  const { data, error } = await supabase
    .from('vehicles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Vehicle;
}

export async function deleteVehicle(id: string) {
  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function assignVehicleToUser(vehicleId: string, userId: string, initialMileage?: number) {
  const { data, error } = await supabase.rpc('assign_vehicle_to_user', {
    p_vehicle_id: vehicleId,
    p_user_id: userId,
    p_initial_mileage: initialMileage
  });

  if (error) throw error;
  return data;
}

export async function returnVehicle(vehicleId: string, finalMileage: number, conditionNotes?: string) {
  const { data, error } = await supabase.rpc('return_vehicle', {
    p_vehicle_id: vehicleId,
    p_final_mileage: finalMileage,
    p_condition_notes: conditionNotes
  });

  if (error) throw error;
  return data;
}

export async function getVehicleMaintenance(vehicleId?: string) {
  let query = supabase
    .from('vehicle_maintenance')
    .select('*, vehicles(registration_number, brand, model)')
    .order('maintenance_date', { ascending: false });

  if (vehicleId) {
    query = query.eq('vehicle_id', vehicleId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function getMaintenanceAlerts() {
  const { data, error } = await supabase
    .from('vehicle_maintenance_alerts')
    .select('*')
    .order('maintenance_date');

  if (error) throw error;
  return data;
}

export async function createMaintenance(maintenance: Partial<VehicleMaintenance>) {
  const { data, error } = await supabase
    .from('vehicle_maintenance')
    .insert(maintenance)
    .select()
    .single();

  if (error) throw error;
  return data as VehicleMaintenance;
}

export async function updateMaintenance(id: string, updates: Partial<VehicleMaintenance>) {
  const { data, error } = await supabase
    .from('vehicle_maintenance')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as VehicleMaintenance;
}

export async function scheduleVehicleMaintenance(
  vehicleId: string,
  maintenanceType: string,
  maintenanceDate: string,
  description: string,
  estimatedCost: number = 0
) {
  const { data, error } = await supabase.rpc('schedule_vehicle_maintenance', {
    p_vehicle_id: vehicleId,
    p_maintenance_type: maintenanceType,
    p_maintenance_date: maintenanceDate,
    p_description: description,
    p_estimated_cost: estimatedCost
  });

  if (error) throw error;
  return data;
}

export async function getVehicleAssignments(vehicleId?: string, userId?: string) {
  let query = supabase
    .from('vehicle_assignments')
    .select('*, vehicles(registration_number, brand, model), profiles(full_name)')
    .order('assigned_at', { ascending: false });

  if (vehicleId) {
    query = query.eq('vehicle_id', vehicleId);
  }

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function getVehicleTrips(vehicleId?: string, userId?: string, missionId?: string) {
  let query = supabase
    .from('vehicle_trips')
    .select('*, vehicles(registration_number, brand, model), missions(title), profiles(full_name)')
    .order('start_time', { ascending: false });

  if (vehicleId) {
    query = query.eq('vehicle_id', vehicleId);
  }

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (missionId) {
    query = query.eq('mission_id', missionId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function createTrip(trip: Partial<VehicleTrip>) {
  const { data, error } = await supabase
    .from('vehicle_trips')
    .insert(trip)
    .select()
    .single();

  if (error) throw error;
  return data as VehicleTrip;
}

export async function updateTrip(id: string, updates: Partial<VehicleTrip>) {
  const { data, error } = await supabase
    .from('vehicle_trips')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as VehicleTrip;
}

export async function getVehicleCostsSummary() {
  const { data, error } = await supabase
    .from('vehicle_costs_summary')
    .select('*')
    .order('registration_number');

  if (error) throw error;
  return data;
}
