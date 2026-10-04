-- Cover foreign keys reported by Supabase's performance advisor.
-- These indexes are additive and do not change authorization or application behavior.

create index if not exists learning_resource_sources_created_by_idx
  on public.learning_resource_sources(created_by);

create index if not exists learning_resources_created_by_idx
  on public.learning_resources(created_by);

create index if not exists lecture_attendance_marked_by_idx
  on public.lecture_attendance(marked_by);

create index if not exists teacher_assignments_assigned_by_idx
  on public.teacher_assignments(assigned_by);
