-- 0003 — usernames must be globally unique.
--
-- The app identifies a collector by username alone (URLs are /u/<username>, and
-- every profile lookup keys on username with no group filter). The original
-- `unique (group_id, username)` allowed the same name in two groups, so writes
-- and reads could land on different profile rows — the "saves vanish" bug.
--
-- This migration collapses any existing same-name duplicates onto a single
-- profile (the one holding the most stickers; ties broken by oldest), then
-- enforces global uniqueness so it can never happen again.

-- 1) Inspect first (read-only) — see which usernames are duplicated:
--    select username, count(*) from profiles group by username having count(*) > 1;

-- 2) Keep the richest profile per username, delete the rest.
--    Deleting a profile cascades to its holdings and requests (ON DELETE CASCADE),
--    so no orphans are left behind.
with ranked as (
  select p.id,
         row_number() over (
           partition by p.username
           order by (select count(*) from holdings h where h.profile_id = p.id) desc,
                    p.created_at asc
         ) as rn
  from profiles p
)
delete from profiles
where id in (select id from ranked where rn > 1);

-- 3) Swap the per-group constraint for a global one.
alter table profiles drop constraint if exists profiles_group_id_username_key;
alter table profiles add constraint profiles_username_key unique (username);
