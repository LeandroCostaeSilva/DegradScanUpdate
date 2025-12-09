-- Views for analytics and convenience

CREATE OR REPLACE VIEW search_statistics AS
SELECT 
    s.name as substance_name,
    s.dcb_name,
    COUNT(sh.id) as search_count,
    MAX(sh.search_timestamp) as last_searched,
    COUNT(DISTINCT sh.user_ip) as unique_users
FROM substances s
LEFT JOIN search_history sh ON s.id = sh.substance_id
GROUP BY s.id, s.name, s.dcb_name
ORDER BY search_count DESC;

CREATE OR REPLACE VIEW substances_complete AS
SELECT 
    s.id,
    s.name,
    s.cas_number,
    s.dcb_name,
    s.created_at,
    s.updated_at,
    COUNT(dp.id) as products_count,
    COUNT(r.id) as references_count
FROM substances s
LEFT JOIN degradation_products dp ON s.id = dp.substance_id
LEFT JOIN "references" r ON s.id = r.substance_id
GROUP BY s.id, s.name, s.cas_number, s.dcb_name, s.created_at, s.updated_at
ORDER BY s.name;

CREATE OR REPLACE VIEW recent_searches AS
SELECT 
    sh.id,
    s.name as substance_name,
    sh.search_term,
    sh.search_timestamp,
    sh.user_ip
FROM search_history sh
JOIN substances s ON sh.substance_id = s.id
ORDER BY sh.search_timestamp DESC
LIMIT 100;

