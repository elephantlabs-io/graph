/**
 * This references an external system which is used to resolve entities
 **/
CREATE TABLE resolved_entities(
    id BIGINT NOT NULL PRIMARY KEY,
    label text NOT NULL,
    datasource INTEGER NOT NULL,
    security_label INTEGER NOT NULL
);

CREATE TABLE entities(
    id VARCHAR(22) NOT NULL PRIMARY KEY,
    type VARCHAR(255) NOT NULL,
    label text NOT NULL,
    resolved_entity_id BIGINT REFERENCES resolved_entities(id), -- if the entity has been resolved lets look at the resolved entity
    attributes JSON NOT NULL DEFAULT '{}',
    security_label INTEGER NOT NULL,
    datasource INTEGER NOT NULL, -- references the datasource that this id comes from
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE associations(
    id BIGSERIAL NOT NULL PRIMARY KEY,
    source_entity VARCHAR(22) NOT NULL REFERENCES entities(id),
    destination_entity VARCHAR(22) NOT NULL REFERENCES entities(id),
    attributes JSON NOT NULL DEFAULT '{}',
    security_label INTEGER NOT NULL,
    datasource INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
