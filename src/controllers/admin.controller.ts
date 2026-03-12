import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { supabaseAdmin } from '../db/supabaseAdmin';

export const listSecurityUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ error: 'Only admin can access this resource' });
      return;
    }

    const status = String((req.query as any)?.status || '').trim().toLowerCase();

    let query = supabaseAdmin
      .from('users')
      .select('id,email,name,role,security_approved,created_at')
      .eq('role', 'security')
      .order('created_at', { ascending: false });

    if (status === 'pending') {
      query = query.eq('security_approved', false);
    } else if (status === 'approved') {
      query = query.eq('security_approved', true);
    }

    const { data, error } = await query;

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ users: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to list security users' });
  }
};

export const approveSecurityUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ error: 'Only admin can access this resource' });
      return;
    }

    const id = String((req.params as any)?.id || '').trim();
    if (!id) {
      res.status(400).json({ error: 'User id is required' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ security_approved: true })
      .eq('id', id)
      .eq('role', 'security')
      .select('id,email,name,role,security_approved,created_at')
      .single();

    if (error) {
      const msg = error.message || 'Failed to approve user';
      res.status(error.code === 'PGRST116' ? 404 : 500).json({ error: msg });
      return;
    }

    res.json({ user: data });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to approve security user' });
  }
};

export const deleteSecurityUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ error: 'Only admin can access this resource' });
      return;
    }

    const id = String((req.params as any)?.id || '').trim();
    if (!id) {
      res.status(400).json({ error: 'User id is required' });
      return;
    }

    const { data: localUser, error: localFetchError } = await supabaseAdmin
      .from('users')
      .select('id,email,role')
      .eq('id', id)
      .single();

    if (localFetchError || !localUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if ((localUser as any).role !== 'security') {
      res.status(400).json({ error: 'Only security users can be deleted via this endpoint' });
      return;
    }

    const email = String((localUser as any).email || '').toLowerCase();

    try {
      const { data: usersList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        res.status(500).json({ error: listError.message });
        return;
      }

      const authUser = usersList?.users?.find((u) => u.email?.toLowerCase() === email);
      if (authUser?.id) {
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id);
        if (deleteAuthError) {
          res.status(500).json({ error: deleteAuthError.message });
          return;
        }
      }
    } catch (authDeleteErr: any) {
      res.status(500).json({ error: authDeleteErr?.message || 'Failed to delete Supabase auth user' });
      return;
    }

    const { error: deleteLocalError } = await supabaseAdmin.from('users').delete().eq('id', id);
    if (deleteLocalError) {
      res.status(500).json({ error: deleteLocalError.message });
      return;
    }

    res.json({ deleted: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to delete security user' });
  }
};
