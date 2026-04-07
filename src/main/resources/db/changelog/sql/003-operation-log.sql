CREATE TABLE operation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_name VARCHAR(64) NOT NULL,
    action_name VARCHAR(64) NOT NULL,
    target_type VARCHAR(64),
    target_id VARCHAR(64),
    target_name VARCHAR(255),
    detail VARCHAR(1000),
    operator_id INTEGER,
    operator_username VARCHAR(64),
    operator_display_name VARCHAR(64),
    operator_roles VARCHAR(255),
    ip_address VARCHAR(64),
    request_method VARCHAR(16),
    request_path VARCHAR(255),
    success BOOLEAN NOT NULL,
    operated_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_operation_logs_operated_at ON operation_logs (operated_at DESC);
CREATE INDEX idx_operation_logs_operator_username ON operation_logs (operator_username);
CREATE INDEX idx_operation_logs_module_action ON operation_logs (module_name, action_name);
