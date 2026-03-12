import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { getPresentationMode, setPresentationMode } from '../presentation/config';

export const getPresentationModeStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const enabled = getPresentationMode();
    res.json({ enabled });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const togglePresentationMode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { enabled, password } = req.body;

    if (typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'enabled must be a boolean' });
      return;
    }

    if (!password) {
      res.status(400).json({ error: 'Password required' });
      return;
    }

    const success = setPresentationMode(enabled, password);

    if (!success) {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }

    res.json({ enabled, message: 'Presentation mode updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
