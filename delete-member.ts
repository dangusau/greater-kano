import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }
    const token = authHeader.replace('Bearer ', '');

    // Create a Supabase client with the ANON key to verify the user
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Create an admin client with the SERVICE_ROLE_KEY (server-side only)
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!  // this is the key you set in Vercel
    );

    // Check if the requesting user is an admin (exists in admin_users)
    const { data: adminRecord, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (adminError || !adminRecord) {
      return res.status(403).json({ error: 'You are not an admin' });
    }

    // Get the target user ID from the request body
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // Delete the user from auth.users
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      return res.status(500).json({ error: `Delete failed: ${authDeleteError.message}` });
    }

    // Clean up profiles and admin_users (optional)
    await supabaseAdmin.from('profiles').delete().eq('id', userId);
    await supabaseAdmin.from('admin_users').delete().eq('auth_user_id', userId);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
}
