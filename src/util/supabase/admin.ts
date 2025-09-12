import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase admin client with service role privileges
 * This client can perform admin operations like creating users
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables for admin client')
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Creates a new user in Supabase Auth
 * @param email - User's email address
 * @param password - User's password (optional, will generate if not provided)
 * @param userData - Additional user metadata
 * @returns Promise with user creation result
 */
export async function createAuthUser(
  email: string, 
  password?: string,
  userData?: { name?: string; role?: string }
) {
  const adminClient = createAdminClient()
  
  // Generate a temporary password if none provided
  const userPassword = password || generateTemporaryPassword()
  
  try {
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password: userPassword,
      email_confirm: true, // Auto-confirm email for admin-created users
      user_metadata: {
        name: userData?.name || '',
        role: userData?.role || '',
        created_by_admin: true
      }
    })
    
    if (error) {
      throw error
    }
    
    return {
      user: data.user,
      temporaryPassword: password ? undefined : userPassword
    }
  } catch (error) {
    console.error('Error creating Supabase auth user:', error)
    throw error
  }
}

/**
 * Updates a user in Supabase Auth
 * @param userId - Supabase user ID
 * @param updates - User updates
 * @returns Promise with user update result
 */
export async function updateAuthUser(
  userId: string,
  updates: {
    email?: string
    password?: string
    user_metadata?: Record<string, unknown>
  }
) {
  const adminClient = createAdminClient()
  
  try {
    const { data, error } = await adminClient.auth.admin.updateUserById(
      userId,
      updates
    )
    
    if (error) {
      throw error
    }
    
    return data
  } catch (error) {
    console.error('Error updating Supabase auth user:', error)
    throw error
  }
}

/**
 * Deletes a user from Supabase Auth
 * @param userId - Supabase user ID
 * @returns Promise with deletion result
 */
export async function deleteAuthUser(userId: string) {
  const adminClient = createAdminClient()
  
  try {
    const { error } = await adminClient.auth.admin.deleteUser(userId)
    
    if (error) {
      throw error
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting Supabase auth user:', error)
    throw error
  }
}

/**
 * Generates a secure temporary password
 * @returns Random password string
 */
function generateTemporaryPassword(): string {
  const length = 12
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  
  return password
}

/**
 * Sends a password reset email to a user
 * @param email - User's email address
 * @returns Promise with email send result
 */
export async function sendPasswordResetEmail(email: string) {
  const adminClient = createAdminClient()
  
  try {
    const { error } = await adminClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`
    })
    
    if (error) {
      throw error
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error sending password reset email:', error)
    throw error
  }
}