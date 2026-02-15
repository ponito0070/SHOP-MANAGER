-- Create a secure function to record payments (bypasses RLS)
-- This function has SECURITY DEFINER so it runs with table owner privileges

CREATE OR REPLACE FUNCTION record_payment(
  p_party_type TEXT,
  p_party_id UUID,
  p_amount NUMERIC,
  p_note TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, new_balance NUMERIC) AS $$
DECLARE
  v_user_id UUID;
  v_new_balance NUMERIC;
  v_table_name TEXT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'User not authenticated', NULL::NUMERIC;
    RETURN;
  END IF;
  
  -- Validate inputs
  IF p_party_type NOT IN ('client', 'supplier') THEN
    RETURN QUERY SELECT FALSE, 'Invalid party_type', NULL::NUMERIC;
    RETURN;
  END IF;
  
  IF p_party_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'party_id required', NULL::NUMERIC;
    RETURN;
  END IF;
  
  IF p_amount <= 0 THEN
    RETURN QUERY SELECT FALSE, 'Amount must be positive', NULL::NUMERIC;
    RETURN;
  END IF;
  
  -- Insert the payment
  INSERT INTO payments (party_type, party_id, amount, note, created_by)
  VALUES (p_party_type, p_party_id, p_amount, p_note, v_user_id);
  
  -- Determine table name
  v_table_name := CASE WHEN p_party_type = 'client' THEN 'clients' ELSE 'suppliers' END;
  
  -- Update balance
  -- For clients: Add the amount (payment received increases balance, reduces debt)
  -- For suppliers: Subtract the amount (payment reduces what we owe)
  IF p_party_type = 'client' THEN
    EXECUTE format(
      'UPDATE %I SET solde = solde + $1 WHERE id = $2 RETURNING solde',
      v_table_name
    ) USING p_amount, p_party_id INTO v_new_balance;
  ELSE
    EXECUTE format(
      'UPDATE %I SET solde = solde - $1 WHERE id = $2 RETURNING solde',
      v_table_name
    ) USING p_amount, p_party_id INTO v_new_balance;
  END IF;
  
  -- Return success
  RETURN QUERY SELECT TRUE, 'Payment recorded successfully', v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION record_payment TO authenticated;
GRANT EXECUTE ON FUNCTION record_payment TO anon;
