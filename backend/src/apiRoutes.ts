// ---------------------------------------------------------------- //
// -------------------- 7. src/apiRoutes.ts ----------------------- //
// ---------------------------------------------------------------- //
// Defines all the API endpoints for entities and associations.
// ---------------------------------------------------------------- //

import { Router, Request, Response } from 'express';
import { withDatasource } from './db';
import { AppJWTPayload } from './auth';

const router = Router();

// Helper function to get data sources from the request's auth payload
const getDatasources = (req: Request): string => {
    // This is safe to assert because the checkDataSourceClaim middleware runs before this
    return (req.auth as AppJWTPayload).USER_DATASOURCES;
};

// --- Entity Endpoints ---

// GET /entities - Get all entities for the user's data sources
router.get('/entities', async (req: Request, res: Response) => {
  try {
    const results = await withDatasource(getDatasources(req), async (sql) => {
      // The string_to_array function converts the comma-separated string into a PostgreSQL array
      // The ANY operator checks if the entity's data_source_id is in that array.
      return await sql`
        SELECT * FROM entities
        WHERE data_source_id = ANY(string_to_array(current_setting('app.user_datasources'), ','))
      `;
    });
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching entities' });
  }
});

// GET /entities/:id - Get a single entity by ID
router.get('/entities/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const results = await withDatasource(getDatasources(req), async (sql) => {
      return await sql`
        SELECT * FROM entities
        WHERE id = ${id}
        AND data_source_id = ANY(string_to_array(current_setting('app.user_datasources'), ','))
      `;
    });
    if (results.length === 0) {
      return res.status(404).json({ message: 'Entity not found or access denied' });
    }
    res.json(results[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching entity' });
  }
});

// POST /entities - Create a new entity
router.post('/entities', async (req: Request, res: Response) => {
    const { name, data, data_source_id } = req.body;
    const userDatasources = getDatasources(req).split(',');

    if (!name || !data_source_id) {
        return res.status(400).json({ message: "Fields 'name' and 'data_source_id' are required." });
    }

    // Security check: Ensure the user is allowed to create an entity in this data source
    if (!userDatasources.includes(data_source_id)) {
        return res.status(403).json({ message: `You do not have permission to access data_source_id '${data_source_id}'.` });
    }

    try {
        const results = await withDatasource(getDatasources(req), async (sql) => {
            return await sql`
                INSERT INTO entities (name, data, data_source_id)
                VALUES (${name}, ${data || null}, ${data_source_id})
                RETURNING *
            `;
        });
        res.status(201).json(results[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating entity' });
    }
});


// --- Association Endpoints ---

// GET /associations - Get all associations
router.get('/associations', async (req: Request, res: Response) => {
    try {
        const results = await withDatasource(getDatasources(req), async (sql) => {
            return await sql`
                SELECT * FROM associations
                WHERE data_source_id = ANY(string_to_array(current_setting('app.user_datasources'), ','))
            `;
        });
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching associations' });
    }
});

// POST /associations - Create a new association
router.post('/associations', async (req: Request, res: Response) => {
    const { source_entity_id, target_entity_id, type, data, data_source_id } = req.body;
    const userDatasources = getDatasources(req).split(',');

    if (!source_entity_id || !target_entity_id || !type || !data_source_id) {
        return res.status(400).json({ message: "Fields 'source_entity_id', 'target_entity_id', 'type', and 'data_source_id' are required." });
    }

    if (!userDatasources.includes(data_source_id)) {
        return res.status(403).json({ message: `You do not have permission to access data_source_id '${data_source_id}'.` });
    }
    
    try {
        const results = await withDatasource(getDatasources(req), async (sql) => {
            // We should also verify that the source and target entities are accessible by the user
            const entitiesCheck = await sql`
                SELECT id FROM entities WHERE id IN (${source_entity_id}, ${target_entity_id})
                AND data_source_id = ANY(string_to_array(current_setting('app.user_datasources'), ','))
            `;
            if (entitiesCheck.count < 2) {
                // This is a custom check, not a real status code, so we throw to catch it below.
                throw new Error('PERMISSION_DENIED_ENTITIES');
            }

            return await sql`
                INSERT INTO associations (source_entity_id, target_entity_id, type, data, data_source_id)
                VALUES (${source_entity_id}, ${target_entity_id}, ${type}, ${data || null}, ${data_source_id})
                RETURNING *
            `;
        });
        res.status(201).json(results[0]);
    } catch (error: any) {
        if (error.message === 'PERMISSION_DENIED_ENTITIES') {
            return res.status(404).json({ message: 'Source or target entity not found or you do not have permission to access them.' });
        }
        console.error(error);
        res.status(500).json({ message: 'Error creating association' });
    }
});


// --- Special Graph Endpoint ---

// GET /entities/:id/associations - Get all associations for a specific entity
router.get('/entities/:id/associations', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const results = await withDatasource(getDatasources(req), async (sql) => {
      // First, verify the user has access to the root entity
      const entityCheck = await sql`
        SELECT id FROM entities
        WHERE id = ${id}
        AND data_source_id = ANY(string_to_array(current_setting('app.user_datasources'), ','))
      `;

      if (entityCheck.count === 0) {
        return null; // Return null to indicate not found
      }

      // If access is confirmed, fetch all associations connected to this entity
      return await sql`
        SELECT * FROM associations
        WHERE (source_entity_id = ${id} OR target_entity_id = ${id})
        AND data_source_id = ANY(string_to_array(current_setting('app.user_datasources'), ','))
      `;
    });

    if (results === null) {
        return res.status(404).json({ message: 'Entity not found or access denied' });
    }

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching associations for entity' });
  }
});

export default router;