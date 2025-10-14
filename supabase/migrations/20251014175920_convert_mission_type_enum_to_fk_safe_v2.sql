/*
  # Convert mission_type from ENUM to foreign key reference (SAFE v2)

  1. Changes
    - Drop dependent views temporarily
    - Convert missions.type from ENUM to TEXT with foreign key
    - Recreate all views with identical definitions
  
  2. Security
    - No data loss (all existing mission types preserved)
    - All views recreated identically
    - RLS policies remain unchanged
  
  3. Benefits
    - New intervention types automatically available
    - Centralized type management via intervention_types table
*/

-- ============================================================================
-- Step 1: Drop all dependent views
-- ============================================================================
DROP VIEW IF EXISTS missions_public CASCADE;
DROP VIEW IF EXISTS offers_inbox CASCADE;
DROP VIEW IF EXISTS my_missions CASCADE;
DROP VIEW IF EXISTS v_admin_missions_map CASCADE;
DROP VIEW IF EXISTS v_nexus_missions_full_admin CASCADE;

-- ============================================================================
-- Step 2: Convert missions.type from ENUM to TEXT with FK
-- ============================================================================

-- Add new TEXT column
ALTER TABLE missions ADD COLUMN IF NOT EXISTS type_new TEXT;

-- Copy all existing ENUM values to TEXT
UPDATE missions SET type_new = type::TEXT;

-- Drop old ENUM column (now safe since views are gone)
ALTER TABLE missions DROP COLUMN type;

-- Rename new column
ALTER TABLE missions RENAME COLUMN type_new TO type;

-- Add NOT NULL constraint
ALTER TABLE missions ALTER COLUMN type SET NOT NULL;

-- Add foreign key to intervention_types
ALTER TABLE missions 
ADD CONSTRAINT fk_missions_intervention_type 
FOREIGN KEY (type) 
REFERENCES intervention_types(code)
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_missions_type ON missions(type);

-- ============================================================================
-- Step 3: Recreate all views (identical definitions)
-- ============================================================================

-- View: missions_public
CREATE VIEW missions_public AS
SELECT id,
    type,
    status,
    city,
        CASE
            WHEN (is_admin() OR (assigned_user_id = auth.uid()) OR (status = ANY (ARRAY['ACCEPTÉE'::text, 'PLANIFIÉE'::text, 'EN ROUTE'::text, 'EN INTERVENTION'::text, 'TERMINÉE'::text, 'FACTURABLE'::text, 'FACTURÉE'::text, 'PAYÉE'::text, 'CLOTURÉE'::text]))) THEN address
            ELSE NULL::text
        END AS address,
        CASE
            WHEN (is_admin() OR (assigned_user_id = auth.uid()) OR (status = ANY (ARRAY['ACCEPTÉE'::text, 'PLANIFIÉE'::text, 'EN ROUTE'::text, 'EN INTERVENTION'::text, 'TERMINÉE'::text, 'FACTURABLE'::text, 'FACTURÉE'::text, 'PAYÉE'::text, 'CLOTURÉE'::text]))) THEN client_name
            ELSE NULL::text
        END AS client_name,
        CASE
            WHEN (is_admin() OR (assigned_user_id = auth.uid()) OR (status = ANY (ARRAY['ACCEPTÉE'::text, 'PLANIFIÉE'::text, 'EN ROUTE'::text, 'EN INTERVENTION'::text, 'TERMINÉE'::text, 'FACTURABLE'::text, 'FACTURÉE'::text, 'PAYÉE'::text, 'CLOTURÉE'::text]))) THEN client_phone
            ELSE NULL::text
        END AS client_phone,
        CASE
            WHEN (is_admin() OR (assigned_user_id = auth.uid()) OR (status = ANY (ARRAY['ACCEPTÉE'::text, 'PLANIFIÉE'::text, 'EN ROUTE'::text, 'EN INTERVENTION'::text, 'TERMINÉE'::text, 'FACTURABLE'::text, 'FACTURÉE'::text, 'PAYÉE'::text, 'CLOTURÉE'::text]))) THEN client_email
            ELSE NULL::text
        END AS client_email,
    title,
    description,
    scheduled_start,
    estimated_duration_min,
    price_subcontractor_cents,
    currency,
    lat,
    lng,
    created_at,
    updated_at
   FROM missions m;

-- View: my_missions
CREATE VIEW my_missions AS
SELECT id,
    title,
    type,
    status,
    city,
    address,
    zip,
    lat,
    lng,
    client_name,
    description,
    scheduled_start,
    estimated_duration_min,
    price_subcontractor_cents,
    currency,
    created_at,
    updated_at
   FROM missions m
  WHERE (assigned_user_id = auth.uid());

-- View: offers_inbox
CREATE VIEW offers_inbox AS
SELECT mo.id AS offer_id,
    mo.mission_id,
    mo.sent_at,
    mo.expires_at,
    mo.expired,
    mo.accepted_at,
    mo.refused_at,
    m.title,
    m.type,
    m.status,
    m.city,
    m.scheduled_start,
    m.estimated_duration_min,
    m.price_subcontractor_cents,
    m.currency
   FROM (mission_offers mo
     JOIN missions m ON ((m.id = mo.mission_id)))
  WHERE (mo.user_id = auth.uid());

-- View: v_admin_missions_map
CREATE VIEW v_admin_missions_map AS
SELECT m.id,
    m.title,
    m.status,
    m.type,
    m.lat,
    m.lng,
    m.scheduled_start,
    m.estimated_duration_min,
    m.price_subcontractor_cents,
    m.currency,
    m.description,
    m.address,
    m.zip,
    m.city,
    m.assigned_user_id,
    p.full_name AS assigned_user_name,
    p.avatar_url AS assigned_user_avatar,
    p.phone AS assigned_user_phone
   FROM (missions m
     LEFT JOIN profiles p ON ((p.user_id = m.assigned_user_id)))
  WHERE ((m.lat IS NOT NULL) AND (m.lng IS NOT NULL));

-- View: v_nexus_missions_full_admin
CREATE VIEW v_nexus_missions_full_admin AS
SELECT m.id,
    m.title,
    m.type,
    m.status,
    m.city,
    m.address,
    m.zip,
    m.lat,
    m.lng,
    m.description,
    m.scheduled_start,
    m.scheduled_window_start,
    m.scheduled_window_end,
    m.estimated_duration_min,
    m.price_total_cents,
    m.price_subcontractor_cents,
    m.currency,
    m.accepted_at,
    m.expires_at,
    m.planned_at,
    m.finished_at,
    m.invoiced_at,
    m.paid_at,
    m.closed_at,
    m.requires_follow_up,
    m.follow_up_notes,
    m.privacy,
    m.created_at,
    m.updated_at,
    m.client_id,
    COALESCE(m.client_name, cc.name) AS client_name,
    COALESCE(m.client_phone, cc.phone) AS client_phone,
    COALESCE(m.client_email, cc.email) AS client_email,
    m.assigned_user_id,
    ap.full_name AS assigned_user_name,
    ap.avatar_url AS assigned_user_avatar,
    ap.phone AS assigned_user_phone,
    m.created_by_id,
    cp.full_name AS created_by_name
   FROM (((missions m
     LEFT JOIN client_contacts cc ON ((cc.id = m.client_id)))
     LEFT JOIN profiles ap ON ((ap.user_id = m.assigned_user_id)))
     LEFT JOIN profiles cp ON ((cp.user_id = m.created_by_id)));
