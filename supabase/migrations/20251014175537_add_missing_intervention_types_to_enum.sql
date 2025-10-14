/*
  # Add missing intervention types to mission_type ENUM

  1. Changes
    - Add DEVIS to mission_type ENUM
    - Add INST (Installation) to mission_type ENUM
    - Add PACS (PAC / Clim) to mission_type ENUM
    - Add CHAUDIERE to mission_type ENUM
    - Add PLOMBERIE to mission_type ENUM
  
  2. Notes
    - These types already exist in the intervention_types table
    - We need to sync the ENUM with the table data
*/

-- Add DEVIS
ALTER TYPE mission_type ADD VALUE IF NOT EXISTS 'DEVIS';

-- Add INST
ALTER TYPE mission_type ADD VALUE IF NOT EXISTS 'INST';

-- Add PACS
ALTER TYPE mission_type ADD VALUE IF NOT EXISTS 'PACS';

-- Add CHAUDIERE
ALTER TYPE mission_type ADD VALUE IF NOT EXISTS 'CHAUDIERE';

-- Add PLOMBERIE
ALTER TYPE mission_type ADD VALUE IF NOT EXISTS 'PLOMBERIE';
