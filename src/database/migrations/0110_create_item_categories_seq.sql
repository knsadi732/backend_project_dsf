-- Backs auto-generated category_code values (format: CAT-00001), see
-- itemCategory.repository.js. Fixes a real bug: category_code is NOT NULL
-- but no auto-generation existed — leaving the frontend's "Category code"
-- field blank previously threw a raw not-null constraint violation, despite
-- the form's placeholder claiming it auto-generates (which only Items
-- actually did, via items_item_seq).
CREATE SEQUENCE IF NOT EXISTS item_categories_cat_seq START 1;
