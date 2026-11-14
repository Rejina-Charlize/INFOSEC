INSERT INTO categories (name, description) VALUES
    ('Analgesics', 'Medicines used for pain relief'),
    ('Antibiotics', 'Medicines used to treat bacterial infections'),
    ('Chronic Care', 'Medicines used to manage long-term conditions'),
    ('Antihistamines', 'Medicines used to relieve allergy symptoms')
ON CONFLICT (name) DO NOTHING;
