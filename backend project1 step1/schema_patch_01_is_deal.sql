-- PATCH: adds one column we needed (is_deal) to distinguish the "Big Deals"
-- grid from the "Trending Rn" grid. Run this in the same SQL Editor, in a
-- new query, the same way you ran schema.sql.

alter table products
  add column if not exists is_deal boolean not null default false;
