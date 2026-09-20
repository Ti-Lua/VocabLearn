-- Languages Seed
INSERT INTO languages (id, code, name, native_name, flag, status) VALUES
  (1, 'en', 'Tiếng Anh', 'English', '🇬🇧', 'active'),
  (2, 'zh', 'Tiếng Trung', '中文', '🇨🇳', 'coming_soon'),
  (3, 'ja', 'Tiếng Nhật', '日本語', '🇯🇵', 'coming_soon')
ON CONFLICT (id) DO NOTHING;

-- Books Seed (4 Cambridge Vocabulary in Use books)
INSERT INTO books (id, language_id, name, short_name, edition, level, cover_image, order_index) VALUES
  (1, 1, 'English Vocabulary in Use Elementary', 'Elementary', '3rd Edition', 'A1-A2', '/covers/elementary.svg', 1),
  (2, 1, 'English Vocabulary in Use Pre-intermediate & Intermediate', 'Pre-intermediate & Intermediate', '4th Edition', 'B1', '/covers/pre-intermediate.svg', 2),
  (3, 1, 'English Vocabulary in Use Upper-intermediate', 'Upper-intermediate', '4th Edition', 'B2', '/covers/upper-intermediate.svg', 3),
  (4, 1, 'English Vocabulary in Use Advanced', 'Advanced', '3rd Edition', 'C1-C2', '/covers/advanced.svg', 4)
ON CONFLICT (id) DO NOTHING;
