import { Router, Request, Response } from 'express';
import { clearDatabase, seedReportDataset } from '../scripts/seed';

const router = Router();

router.post('/reset', async (req: Request, res: Response) => {
  try {
    await clearDatabase();
    return res.json({ message: 'Database cleared to empty state successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/seed-report', async (req: Request, res: Response) => {
  try {
    await seedReportDataset();
    return res.json({ message: 'Report sample dataset (VIT Vellore Open 2026 & Players) seeded successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
