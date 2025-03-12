-- Enable the UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  btc_address TEXT UNIQUE,
  balance BIGINT DEFAULT 0, -- Stored in satoshis
  created_at TIMESTAMP DEFAULT NOW()
);

-- Games table
CREATE TABLE IF NOT EXISTS public.games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player1_id UUID REFERENCES users(id),
  player2_id UUID REFERENCES users(id),
  wager_amount BIGINT NOT NULL, -- In satoshis
  status TEXT CHECK (status IN ('pending', 'active', 'completed')),
  winner_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  amount BIGINT NOT NULL, -- In satoshis, negative for withdrawals
  type TEXT CHECK (type IN ('deposit', 'withdrawal', 'wager', 'win')),
  status TEXT CHECK (status IN ('pending', 'completed', 'failed')),
  tx_hash TEXT, -- Blockchain transaction hash when applicable
  created_at TIMESTAMP DEFAULT NOW()
);

-- Function to update balance
CREATE OR REPLACE FUNCTION update_balance(user_id UUID, amount BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE users 
  SET balance = balance + amount
  WHERE id = user_id;
  
  INSERT INTO transactions (user_id, amount, type, status)
  VALUES (user_id, amount, 
    CASE 
      WHEN amount > 0 AND EXISTS (SELECT 1 FROM games WHERE winner_id = user_id AND status = 'completed' LIMIT 1) THEN 'win'
      WHEN amount < 0 AND EXISTS (SELECT 1 FROM games WHERE (player1_id = user_id OR player2_id = user_id) AND status = 'active' LIMIT 1) THEN 'wager'
      WHEN amount > 0 THEN 'deposit'
      ELSE 'withdrawal'
    END,
    'completed');
END;
$$ LANGUAGE plpgsql;

-- Set up Row Level Security (RLS)
-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policy for users table
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy for games table
CREATE POLICY "Anyone can view games" ON games
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Players can create games" ON games
  FOR INSERT
  TO authenticated
  WITH CHECK (player1_id = auth.uid());

CREATE POLICY "Players can update their own games" ON games
  FOR UPDATE
  TO authenticated
  USING (player1_id = auth.uid() OR player2_id = auth.uid());

-- Policy for transactions table
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert transactions" ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create a trigger to cleanup old games
CREATE OR REPLACE FUNCTION cleanup_old_games()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete games older than 20 seconds
  DELETE FROM games
  WHERE status = 'completed'
  AND completed_at < NOW() - INTERVAL '20 seconds';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_completed_games
AFTER UPDATE OF status ON games
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION cleanup_old_games();

-- Function to join a game (workaround for RLS policy limitations)
CREATE OR REPLACE FUNCTION join_game(game_id UUID, player_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  updated_rows INTEGER;
BEGIN
  UPDATE games
  SET 
    player2_id = player_id,
    status = 'active'
  WHERE 
    id = game_id AND
    status = 'pending' AND
    player2_id IS NULL;
    
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  
  RETURN updated_rows > 0;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER; -- This runs with the privileges of the function creator 