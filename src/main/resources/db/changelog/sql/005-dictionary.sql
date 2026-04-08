CREATE TABLE dictionary_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type VARCHAR(64) NOT NULL,
    code VARCHAR(64) NOT NULL,
    label VARCHAR(128) NOT NULL,
    sort_order INTEGER NOT NULL,
    enabled BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    UNIQUE (type, code)
);

CREATE INDEX idx_dictionary_entries_type_sort ON dictionary_entries(type, sort_order, id);

INSERT INTO dictionary_entries (type, code, label, sort_order, enabled, created_at, updated_at) VALUES
    ('UNDERTAKING_UNIT', 'FIFTH_TEAM', '五队', 10, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('UNDERTAKING_UNIT', 'SECOND_SURVEY_INSTITUTE', '二勘院', 20, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('PROJECT_CATEGORY', 'MARKET_PROJECT', '市场项目', 10, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('PROJECT_CATEGORY', 'PLATFORM_COMPANY', '平台公司', 20, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('PROJECT_CATEGORY', 'GOVERNMENT_FINANCE', '政府财政', 30, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
