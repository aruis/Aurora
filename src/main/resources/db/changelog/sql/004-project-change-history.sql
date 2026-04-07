CREATE TABLE project_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    summary VARCHAR(255) NOT NULL,
    detail VARCHAR(4000) NOT NULL,
    operator_id INTEGER NOT NULL,
    operator_username VARCHAR(64) NOT NULL,
    operator_display_name VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX idx_project_changes_project_id_created_at ON project_changes (project_id, created_at DESC);
