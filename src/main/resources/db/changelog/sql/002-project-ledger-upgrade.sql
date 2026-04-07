ALTER TABLE projects ADD COLUMN responsible_department VARCHAR(128);
ALTER TABLE projects ADD COLUMN undertaking_unit VARCHAR(64);
ALTER TABLE projects ADD COLUMN category VARCHAR(64);
ALTER TABLE projects ADD COLUMN contract_period VARCHAR(255);
ALTER TABLE projects ADD COLUMN payment_method VARCHAR(255);
ALTER TABLE projects ADD COLUMN remark VARCHAR(1000);

ALTER TABLE invoices ADD COLUMN invoice_no VARCHAR(128);
UPDATE invoices SET invoice_no = '历史发票-' || id WHERE invoice_no IS NULL;

ALTER TABLE payments ADD COLUMN invoice_id INTEGER;

CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);

UPDATE projects
SET undertaking_unit = '五队',
    category = '市场项目'
WHERE undertaking_unit IS NULL
   OR category IS NULL;
