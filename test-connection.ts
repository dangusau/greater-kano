// test-connection.ts
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.staging
config({ path: '.env.staging' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

console.log('🔗 Testing connection to CLIENT Supabase...')
console.log('URL:', supabaseUrl ? '✓ Set' : '✗ Missing')
console.log('Key:', supabaseKey ? '✓ Set' : '✗ Missing')

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ ERROR: Missing Supabase credentials in .env.staging')
  console.error('Please add:')
  console.error('VITE_SUPABASE_URL=your-client-project-url')
  console.error('VITE_SUPABASE_ANON_KEY=your-client-anon-key')
  console.error('\nGet these from:')
  console.error('Client Supabase → Project Settings → API')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runTests() {
  console.log('\n📊 Running connection tests...')
  
  try {
    // Test 1: Check profiles table
    console.log('\n1. Checking profiles table...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
    
    if (profilesError) {
      console.error('❌ Profiles query failed:', profilesError.message)
    } else {
      console.log(`✅ Profiles table accessible (${profiles?.length || 0} rows)`)
    }
    
    // Test 2: Try signup
    console.log('\n2. Testing signup (email OTP)...')
    const testEmail = `test${Date.now()}@example.com`
    const testPassword = 'TestPassword123'
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    })
    
    if (authError) {
      console.error('❌ Signup failed:', authError.message)
      console.log('\n💡 Common fixes:')
      console.log('1. Go to Supabase → Authentication → Providers')
      console.log('2. Make sure "Email" provider is ON')
      console.log('3. Enable "Confirm email"')
    } else {
      console.log('✅ Signup request sent!')
      console.log('User ID:', authData.user?.id)
      console.log('Email confirmed:', authData.user?.email_confirmed_at ? 'Yes' : 'No (check email)')
      
      // Check if profile was created
      if (authData.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_status')
          .eq('id', authData.user.id)
          .single()
        
        console.log('Profile status:', profile?.user_status || 'Not found')
        console.log('Expected: "verified"')
      }
    }
    
    // Test 3: Check if we can get session
    console.log('\n3. Checking auth session...')
    const { data: session, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError.message)
    } else {
      console.log('Session:', session.session ? 'Exists' : 'No active session')
    }
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
  }
  
  console.log('\n🎯 Test complete!')
  console.log('\nNext steps:')
  console.log('1. Check your email for confirmation link')
  console.log('2. Click link to verify email')
  console.log('3. Try logging in with the test credentials')
}

runTests()