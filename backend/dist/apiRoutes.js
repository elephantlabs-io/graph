"use strict";
// ---------------------------------------------------------------- //
// -------------------- 7. src/apiRoutes.ts ----------------------- //
// ---------------------------------------------------------------- //
// Defines all the API endpoints for entities and associations.
// ---------------------------------------------------------------- //
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("./db");
const router = (0, express_1.Router)();
// Helper function to get data sources from the request's auth payload
const getDatasources = (req) => {
    // This is safe to assert because the checkDataSourceClaim middleware runs before this
    return req.auth.USER_DATASOURCES;
};
// --- Entity Endpoints ---
// GET /entities - Get all entities for the user's data sources
router.get('/entities', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const results = yield (0, db_1.withDatasource)(getDatasources(req), (sql) => __awaiter(void 0, void 0, void 0, function* () {
            // The string_to_array function converts the comma-separated string into a PostgreSQL array
            // The ANY operator checks if the entity's data_source_id is in that array.
            return yield sql `
        SELECT * FROM entities
        WHERE data_source_id = ANY(string_to_array(current_setting('app.user_datasources'), ','))
      `;
        }));
        res.json(results);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching entities' });
    }
}));
// GET /entities/:id - Get a single entity by ID
router.get('/entities/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const results = yield (0, db_1.withDatasource)(getDatasources(req), (sql) => __awaiter(void 0, void 0, void 0, function* () {
            return yield sql `
        SELECT * FROM entities
        WHERE id = ${id}
        AND data_source_id = ANY(string_to_array(current_setting('app.user_datasources'), ','))
      `;
        }));
        if (results.length === 0) {
            return res.status(404).json({ message: 'Entity not found or access denied' });
        }
        res.json(results[0]);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching entity' });
    }
}));
// POST /entities - Create a new entity
router.post('/entities', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const results = yield (0, db_1.withDatasource)(getDatasources(req), (sql) => __awaiter(void 0, void 0, void 0, function* () {
            return yield sql `
                INSERT INTO entities (name, data, data_source_id)
                VALUES (${name}, ${data || null}, ${data_source_id})
                RETURNING *
            `;
        }));
        res.status(201).json(results[0]);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating entity' });
    }
}));
// --- Association Endpoints ---
// GET /associations - Get all associations
router.get('/associations', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const results = yield (0, db_1.withDatasource)(getDatasources(req), (sql) => __awaiter(void 0, void 0, void 0, function* () {
            return yield sql `
                SELECT * FROM associations
                WHERE data_source_id = ANY(string_to_array(current_setting('app.user_datasources'), ','))
            `;
        }));
        res.json(results);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching associations' });
    }
}));
// POST /associations - Create a new association
router.post('/associations', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { source_entity_id, target_entity_id, type, data, data_source_id } = req.body;
    const userDatasources = getDatasources(req).split(',');
    if (!source_entity_id || !target_entity_id || !type || !data_source_id) {
        return res.status(400).json({ message: "Fields 'source_entity_id', 'target_entity_id', 'type', and 'data_source_id' are required." });
    }
    if (!userDatasources.includes(data_source_id)) {
        return res.status(403).json({ message: `You do not have permission to access data_source_id '${data_source_id}'.` });
    }
    try {
        const results = yield (0, db_1.withDatasource)(getDatasources(req), (sql) => __awaiter(void 0, void 0, void 0, function* () {
            // We should also verify that the source and target entities are accessible by the user
            const entitiesCheck = yield sql `
                SELECT id FROM entities WHERE id IN (${source_entity_id}, ${target_entity_id})
                AND data_source_id = ANY(string_to_array(current_setting('app.user_datasources'), ','))
            `;
            if (entitiesCheck.count < 2) {
                // This is a custom check, not a real status code, so we throw to catch it below.
                throw new Error('PERMISSION_DENIED_ENTITIES');
            }
            return yield sql `
                INSERT INTO associations (source_entity_id, target_entity_id, type, data, data_source_id)
                VALUES (${source_entity_id}, ${target_entity_id}, ${type}, ${data || null}, ${data_source_id})
                RETURNING *
            `;
        }));
        res.status(201).json(results[0]);
    }
    catch (error) {
        if (error.message === 'PERMISSION_DENIED_ENTITIES') {
            return res.status(404).json({ message: 'Source or target entity not found or you do not have permission to access them.' });
        }
        console.error(error);
        res.status(500).json({ message: 'Error creating association' });
    }
}));
// --- Special Graph Endpoint ---
// GET /entities/:id/associations - Get all associations for a specific entity
router.get('/entities/:id/associations', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const results = yield (0, db_1.withDatasource)(getDatasources(req), (sql) => __awaiter(void 0, void 0, void 0, function* () {
            // First, verify the user has access to the root entity
            const entityCheck = yield sql `
        SELECT id FROM entities
        WHERE id = ${id}
        AND data_source_id = ANY(string_to_array(current_setting('app.user_datasources'), ','))
      `;
            if (entityCheck.count === 0) {
                return null; // Return null to indicate not found
            }
            // If access is confirmed, fetch all associations connected to this entity
            return yield sql `
        SELECT * FROM associations
        WHERE (source_entity_id = ${id} OR target_entity_id = ${id})
        AND data_source_id = ANY(string_to_array(current_setting('app.user_datasources'), ','))
      `;
        }));
        if (results === null) {
            return res.status(404).json({ message: 'Entity not found or access denied' });
        }
        res.json(results);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching associations for entity' });
    }
}));
exports.default = router;
