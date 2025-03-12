#!/usr/bin/env node

// Utility script to reset all user balances to 0 in the database
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Note: Requires service role key with admin privileges

// Validate environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing required environment variables VITE_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY')
  console.log('Make sure these are set in your .env file or environment')
  process.exit(1)
}

// Initialize Supabase client with admin privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function resetAllBalances() {
  console.log('Starting balance reset operation...')
  
  try {
    // Get current balances for logging purposes (optional)
    const { data: beforeUsers, error: fetchError } = await supabase
      .from('users')
      .select('id, email, balance')
    
    if (fetchError) {
      throw fetchError
    }
    
    // Log current balances
    console.log('Current user balances:')
    beforeUsers.forEach(user => {
      console.log(`${user.email}: ₿ ${user.balance}`)
    })
    
    // Reset all balances to 0
    const { error: updateError } = await supabase
      .from('users')
      .update({ balance: 0 })
    
    if (updateError) {
      throw updateError
    }
    
    // Optionally record transactions for the reset
    const transactions = beforeUsers
      .filter(user => user.balance > 0) // Only create transactions for positive balances
      .map(user => ({
        user_id: user.id,
        amount: -user.balance,
        type: 'withdrawal',
        status: 'completed',
        tx_hash: `admin_reset_${Date.now()}`
      }))
    
    if (transactions.length > 0) {
      const { error: txError } = await supabase
        .from('transactions')
        .insert(transactions)
      
      if (txError) {
        console.error('Warning: Failed to record transactions:', txError)
      }
    }
    
    console.log('Successfully reset all user balances to 0')
    console.log(`Reset ${beforeUsers.length} accounts`)
    
  } catch (error) {
    console.error('Error resetting balances:', error)
    process.exit(1)
  }
}

// Run the function
resetAllBalances() 