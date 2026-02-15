-- Migration: Ajouter support pour remises forfaitaires
-- Cette migration ajoute les colonnes remise_flat pour supporter les remises en montant DA

-- Ajouter remise_flat à la table sales (remise générale au niveau du bon)
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS remise_flat NUMERIC(12, 2) DEFAULT 0;

-- Ajouter remise_flat à la table sale_items (remise forfaitaire par article)
ALTER TABLE sale_items 
ADD COLUMN IF NOT EXISTS remise_flat NUMERIC(12, 2) DEFAULT 0;

-- Ajouter remise_flat aux tables d'achats pour cohérence
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS remise_flat NUMERIC(12, 2) DEFAULT 0;

ALTER TABLE purchase_items 
ADD COLUMN IF NOT EXISTS remise_flat NUMERIC(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS remise_pourcentage NUMERIC(5, 2) DEFAULT 0;

-- Ajouter indice pour la performance (optionnel)
CREATE INDEX IF NOT EXISTS idx_sales_remise_flat ON sales(remise_flat) WHERE remise_flat > 0;
CREATE INDEX IF NOT EXISTS idx_sale_items_remise_flat ON sale_items(remise_flat) WHERE remise_flat > 0;

-- Commenter: Les migrations pour les achats (purchases) utiliseront la même structure
