-- DegradScan Supabase Initialization Migration
-- Tables, cache, logging, and essential functions

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core domain tables
-- substances, degradation_products, references, search_history
CREATE TABLE IF NOT EXISTS substances (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    cas_number VARCHAR(50),
    dcb_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS degradation_products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    substance_id UUID NOT NULL REFERENCES substances(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    degradation_route TEXT NOT NULL,
    environmental_conditions TEXT NOT NULL,
    toxicity_data TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "references" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    substance_id UUID NOT NULL REFERENCES substances(id) ON DELETE CASCADE,
    reference_text TEXT NOT NULL,
    reference_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS search_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    substance_id UUID NOT NULL REFERENCES substances(id) ON DELETE CASCADE,
    search_term VARCHAR(255) NOT NULL,
    user_ip VARCHAR(45),
    user_agent TEXT,
    search_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_substances_name ON substances(name);
CREATE INDEX IF NOT EXISTS idx_substances_cas_number ON substances(cas_number);
CREATE INDEX IF NOT EXISTS idx_degradation_products_substance_id ON degradation_products(substance_id);
CREATE INDEX IF NOT EXISTS idx_references_substance_id ON "references"(substance_id);
CREATE INDEX IF NOT EXISTS idx_references_order ON "references"(substance_id, reference_order);
CREATE INDEX IF NOT EXISTS idx_search_history_substance_id ON search_history(substance_id);
CREATE INDEX IF NOT EXISTS idx_search_history_timestamp ON search_history(search_timestamp);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_substances_updated_at 
    BEFORE UPDATE ON substances 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Simple cache and logs (definitive solution)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'simple_cache') THEN
        CREATE TABLE simple_cache (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            cache_key VARCHAR(255) NOT NULL UNIQUE,
            substance_name VARCHAR(255) NOT NULL,
            cached_data JSONB NOT NULL,
            cache_source VARCHAR(50) NOT NULL DEFAULT 'unknown',
            hit_count INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
            last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX idx_simple_cache_key ON simple_cache(cache_key);
        CREATE INDEX idx_simple_cache_substance ON simple_cache(substance_name);
        CREATE INDEX idx_simple_cache_expires ON simple_cache(expires_at);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'simple_logs') THEN
        CREATE TABLE simple_logs (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            log_level VARCHAR(20) NOT NULL DEFAULT 'INFO',
            component VARCHAR(50) NOT NULL,
            message TEXT NOT NULL,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX idx_simple_logs_level ON simple_logs(log_level);
        CREATE INDEX idx_simple_logs_component ON simple_logs(component);
        CREATE INDEX idx_simple_logs_created_at ON simple_logs(created_at);
    END IF;
END $$;

CREATE OR REPLACE FUNCTION get_cache_data(p_cache_key VARCHAR(255))
RETURNS JSONB AS $$
DECLARE
    cached_record RECORD;
BEGIN
    SELECT * INTO cached_record FROM simple_cache WHERE cache_key = p_cache_key AND expires_at > NOW();
    IF cached_record IS NOT NULL THEN
        UPDATE simple_cache SET hit_count = hit_count + 1, last_accessed = NOW() WHERE id = cached_record.id;
        RETURN cached_record.cached_data;
    ELSE
        RETURN NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_cache_data(
    p_cache_key VARCHAR(255),
    p_substance_name VARCHAR(255),
    p_data JSONB,
    p_source VARCHAR(50) DEFAULT 'unknown'
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO simple_cache (cache_key, substance_name, cached_data, cache_source, expires_at)
    VALUES (p_cache_key, p_substance_name, p_data, p_source, NOW() + INTERVAL '24 hours')
    ON CONFLICT (cache_key) DO UPDATE SET
        cached_data = EXCLUDED.cached_data,
        cache_source = EXCLUDED.cache_source,
        expires_at = NOW() + INTERVAL '24 hours',
        last_accessed = NOW();
    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION simple_log(
    p_level VARCHAR(20),
    p_component VARCHAR(50),
    p_message TEXT,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE log_id UUID;
BEGIN
    INSERT INTO simple_logs (log_level, component, message, metadata)
    VALUES (p_level, p_component, p_message, p_metadata)
    RETURNING id INTO log_id;
    RETURN log_id;
EXCEPTION WHEN OTHERS THEN
    RETURN uuid_generate_v4();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_cache()
RETURNS INTEGER AS $$
DECLARE deleted_count INTEGER;
BEGIN
    DELETE FROM simple_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Data functions used by the app
CREATE OR REPLACE FUNCTION get_substance_data(substance_name TEXT)
RETURNS JSON AS $$
DECLARE result JSON; substance_record RECORD;
BEGIN
    SELECT * INTO substance_record FROM substances WHERE LOWER(name) = LOWER(substance_name) OR LOWER(dcb_name) = LOWER(substance_name);
    IF substance_record IS NULL THEN RETURN NULL; END IF;
    SELECT json_build_object(
        'substance', json_build_object('id', substance_record.id, 'name', substance_record.name, 'cas_number', substance_record.cas_number, 'dcb_name', substance_record.dcb_name),
        'products', (SELECT json_agg(json_build_object('substance', product_name,'degradationRoute', degradation_route,'environmentalConditions', environmental_conditions,'toxicityData', toxicity_data)) FROM degradation_products WHERE substance_id = substance_record.id),
        'references', (SELECT json_agg(reference_text ORDER BY reference_order) FROM "references" WHERE substance_id = substance_record.id)
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION log_search_simple(
    substance_name TEXT,
    search_term TEXT DEFAULT NULL,
    user_ip TEXT DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    response_source TEXT DEFAULT 'unknown',
    was_cached BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE substance_record RECORD; search_id UUID;
BEGIN
    SELECT * INTO substance_record FROM substances WHERE LOWER(name) = LOWER(substance_name);
    IF substance_record IS NULL THEN
        INSERT INTO substances (name, dcb_name) VALUES (LOWER(substance_name), substance_name) RETURNING * INTO substance_record;
    END IF;
    INSERT INTO search_history (substance_id, search_term, user_ip, user_agent)
    VALUES (substance_record.id, COALESCE(search_term, substance_name), user_ip, user_agent) RETURNING id INTO search_id;
    RETURN search_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION save_data_simple(
    substance_name TEXT,
    products JSON DEFAULT NULL,
    references_list JSON DEFAULT NULL,
    response_source TEXT DEFAULT 'unknown'
)
RETURNS UUID AS $$
DECLARE substance_record RECORD; product_item JSON; reference_item TEXT; reference_order INT := 1;
BEGIN
    INSERT INTO substances (name, dcb_name)
    VALUES (LOWER(substance_name), substance_name)
    ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
    RETURNING * INTO substance_record;
    DELETE FROM degradation_products WHERE substance_id = substance_record.id;
    DELETE FROM "references" WHERE substance_id = substance_record.id;
    IF products IS NOT NULL AND json_typeof(products) = 'array' THEN
        FOR product_item IN SELECT * FROM json_array_elements(products) LOOP
            INSERT INTO degradation_products (substance_id, product_name, degradation_route, environmental_conditions, toxicity_data)
            VALUES (
                substance_record.id,
                COALESCE(product_item->>'substance', 'Não especificado'),
                COALESCE(product_item->>'degradationRoute', 'Não especificado'),
                COALESCE(product_item->>'environmentalConditions', 'Não especificado'),
                COALESCE(product_item->>'toxicityData', 'Não especificado')
            );
        END LOOP;
    END IF;
    IF references_list IS NOT NULL AND json_typeof(references_list) = 'array' THEN
        FOR reference_item IN SELECT value::text FROM json_array_elements_text(references_list) LOOP
            INSERT INTO "references" (substance_id, reference_text, reference_order)
            VALUES (substance_record.id, reference_item, reference_order);
            reference_order := reference_order + 1;
        END LOOP;
    END IF;
    RETURN substance_record.id;
END;
$$ LANGUAGE plpgsql;
