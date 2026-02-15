-- Replay script for inventory and PUMP
-- WARNING: run on a copy or during maintenance window. This will rebuild stock_movements and recompute products.stock_actuel and prix_achat_moyen from purchases/sales history.

BEGIN;

-- optional: archive or backup current stock_movements
-- CREATE TABLE stock_movements_backup AS TABLE stock_movements;

-- empty stock_movements
TRUNCATE TABLE stock_movements RESTART IDENTITY;

-- reset product stock and pump
UPDATE products SET stock_actuel = 0, prix_achat_moyen = 0, prix_achat = 0;

-- replay purchases chronologically
FOR purchase_rec IN
  SELECT id, date_achat
  FROM purchases
  WHERE COALESCE(is_void,false) = false
  ORDER BY date_achat ASC
LOOP
  FOR pi IN
    SELECT * FROM purchase_items WHERE purchase_id = purchase_rec.id
  LOOP
    -- current values
    SELECT stock_actuel, COALESCE(prix_achat_moyen,0), prix_achat INTO cur_stock, cur_pump, cur_last FROM products WHERE id = pi.product_id;
    IF cur_stock IS NULL THEN
      cur_stock := 0;
      cur_pump := 0;
      cur_last := 0;
    END IF;

    new_stock := cur_stock + pi.quantite;
    IF (cur_stock + pi.quantite) = 0 THEN
      new_pump := pi.prix_achat_unitaire;
    ELSE
      new_pump := ((cur_stock * cur_pump) + (pi.quantite * pi.prix_achat_unitaire))::numeric / (cur_stock + pi.quantite);
    END IF;

    INSERT INTO stock_movements(product_id, type_mouvement, quantite, reference_id, ancien_stock, nouveau_stock, created_at)
    VALUES (pi.product_id, 'ACHAT', pi.quantite, purchase_rec.id, cur_stock, new_stock, purchase_rec.date_achat);

    UPDATE products SET stock_actuel = new_stock, prix_achat_moyen = new_pump, prix_achat = pi.prix_achat_unitaire WHERE id = pi.product_id;
  END LOOP;
END LOOP;

-- replay sales chronologically
FOR sale_rec IN
  SELECT id, date_vente
  FROM sales
  WHERE COALESCE(is_void,false) = false
  ORDER BY date_vente ASC
LOOP
  FOR si IN
    SELECT * FROM sale_items WHERE sale_id = sale_rec.id
  LOOP
    SELECT stock_actuel INTO cur_stock FROM products WHERE id = si.product_id;
    IF cur_stock IS NULL THEN cur_stock := 0; END IF;
    new_stock := cur_stock - si.quantite;

    INSERT INTO stock_movements(product_id, type_mouvement, quantite, reference_id, ancien_stock, nouveau_stock, created_at)
    VALUES (si.product_id, 'VENTE', -si.quantite, sale_rec.id, cur_stock, new_stock, sale_rec.date_vente);

    UPDATE products SET stock_actuel = new_stock WHERE id = si.product_id;
  END LOOP;
END LOOP;

COMMIT;

-- Note: This script is a guideline. Please test on staging and adapt to your environment. It uses PL/pgSQL control structures and requires to be executed in a plpgsql block or psql script with variable declarations.
