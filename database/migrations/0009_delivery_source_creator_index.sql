-- Cover the lecture-delivery created_by foreign key for staff-management queries and deletes.
create index lecture_delivery_sources_created_by_idx
on public.lecture_delivery_sources(created_by);
