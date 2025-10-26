import { z } from 'zod';

export const MissionCreateSchema = z.object({
  title: z.string().min(5, 'Le titre doit contenir au moins 5 caractères').max(200),
  description: z.string().optional(),
  scheduled_date: z.string().datetime('Date invalide'),
  intervention_type_id: z.string().uuid('Type d\'intervention invalide'),
  client_id: z.string().uuid('Client invalide'),
  address_line1: z.string().min(5, 'Adresse requise'),
  city: z.string().min(2, 'Ville requise'),
  postal_code: z.string().regex(/^\d{5}$/, 'Code postal invalide (5 chiffres)'),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

export const MissionUpdateSchema = MissionCreateSchema.partial();

export const InvoiceCreateSchema = z.object({
  client_id: z.string().uuid('Client invalide'),
  mission_id: z.string().uuid('Mission invalide').optional(),
  issue_date: z.string().datetime('Date d\'émission invalide'),
  due_date: z.string().datetime('Date d\'échéance invalide'),
  notes: z.string().optional(),
});

export const InvoiceItemSchema = z.object({
  description: z.string().min(3, 'Description requise'),
  quantity: z.number().positive('Quantité doit être positive'),
  unit_price_cents: z.number().int().nonnegative('Prix unitaire invalide'),
  tva_rate: z.number().min(0).max(100, 'Taux TVA invalide'),
});

export const QuoteCreateSchema = z.object({
  client_id: z.string().uuid('Client invalide'),
  issue_date: z.string().datetime('Date invalide'),
  validity_date: z.string().datetime('Date de validité invalide'),
  notes: z.string().optional(),
});

export const UserCreateSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe trop court (min 8 caractères)'),
  full_name: z.string().min(2, 'Nom complet requis'),
  phone: z.string().regex(/^(\+33|0)[1-9](\d{8})$/, 'Téléphone invalide').optional(),
  role: z.enum(['admin', 'sal', 'st', 'client', 'manager']),
  address_line1: z.string().optional(),
  postal_code: z.string().regex(/^\d{5}$/, 'Code postal invalide').optional(),
  city: z.string().optional(),
});

export const ReportSubmitSchema = z.object({
  form_data: z.record(z.any()),
  observations: z.string().optional(),
  client_signature_url: z.string().url('URL signature invalide').optional(),
});

export const ContractCreateSchema = z.object({
  client_id: z.string().uuid('Client invalide'),
  contract_number: z.string().min(3, 'Numéro contrat requis'),
  start_date: z.string().datetime('Date début invalide'),
  end_date: z.string().datetime('Date fin invalide'),
  frequency: z.enum(['mensuel', 'trimestriel', 'semestriel', 'annuel']),
  annual_price_cents: z.number().int().positive('Montant annuel requis'),
});

export const StockItemSchema = z.object({
  name: z.string().min(2, 'Nom article requis'),
  reference: z.string().optional(),
  category: z.string().optional(),
  unit_price_cents: z.number().int().nonnegative('Prix unitaire invalide'),
  quantity_available: z.number().int().nonnegative('Quantité invalide'),
  alert_threshold: z.number().int().nonnegative().optional(),
});

export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
  return result.data;
}

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; errors?: string[] } {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
    };
  }
  return { success: true, data: result.data };
}
