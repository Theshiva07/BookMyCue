import { Router, Request, Response } from 'express';
import { Neo4jService, VenueNode, embeddedGraph } from '../graph/neo4jService';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const venues = await Neo4jService.getAllVenues();
    return res.json(venues);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { venueId, name, city, tableCount = 4 } = req.body;
    if (!name || !city) {
      return res.status(400).json({ error: 'Venue name and city are required' });
    }

    const vId = venueId || `V${String(embeddedGraph.venues.size + 1).padStart(3, '0')}`;
    const venue: VenueNode = {
      venueId: vId,
      name,
      city,
      tableCount: Number(tableCount) || 4
    };

    const created = await Neo4jService.upsertVenue(venue);
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
