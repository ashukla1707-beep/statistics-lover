-- Statistics Lover: keep delivery authorization in a non-exposed SECURITY DEFINER helper.
-- The public RPC remains SECURITY INVOKER and only delegates to the private helper.

create or replace function private.get_batch_delivery_actions(target_batch uuid)
returns table (
  lecture_id uuid,
  action_kind public.delivery_action_kind,
  provider public.delivery_provider,
  action_url text,
  label text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    l.id,
    ds.action_kind,
    ds.provider,
    ds.provider_reference,
    coalesce(
      ds.label,
      case ds.action_kind
        when 'join'::public.delivery_action_kind then 'Join live class'
        when 'watch'::public.delivery_action_kind then 'Watch recording'
      end
    )
  from public.lecture_delivery_sources ds
  join public.lectures l on l.id = ds.lecture_id
  join public.modules m on m.id = l.module_id
  join public.subjects s on s.id = m.subject_id
  where s.batch_id = target_batch
    and private.has_batch_access(target_batch)
    and s.status = 'published'::public.academic_content_status
    and m.status = 'published'::public.academic_content_status
    and l.status in (
      'scheduled'::public.lecture_status,
      'live'::public.lecture_status,
      'published'::public.lecture_status
    )
    and (l.release_at is null or l.release_at <= now())
    and (ds.available_from is null or ds.available_from <= now())
    and (ds.available_until is null or ds.available_until > now())
    and (
      (ds.action_kind = 'join'::public.delivery_action_kind
        and l.delivery_mode in ('live'::public.lecture_delivery_mode, 'hybrid'::public.lecture_delivery_mode))
      or
      (ds.action_kind = 'watch'::public.delivery_action_kind
        and l.delivery_mode in ('recorded'::public.lecture_delivery_mode, 'hybrid'::public.lecture_delivery_mode)
        and l.status = 'published'::public.lecture_status)
    );
$$;

revoke all on function private.get_batch_delivery_actions(uuid) from public;
grant execute on function private.get_batch_delivery_actions(uuid) to authenticated;

create or replace function public.get_batch_delivery_actions(target_batch uuid)
returns table (
  lecture_id uuid,
  action_kind public.delivery_action_kind,
  provider public.delivery_provider,
  action_url text,
  label text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.get_batch_delivery_actions(target_batch);
$$;

revoke all on function public.get_batch_delivery_actions(uuid) from public;
grant execute on function public.get_batch_delivery_actions(uuid) to authenticated;

comment on function private.get_batch_delivery_actions(uuid) is
  'Non-exposed authorization helper that resolves protected delivery actions for the enrolled authenticated student.';
comment on function public.get_batch_delivery_actions(uuid) is
  'SECURITY INVOKER RPC wrapper for the private lecture-delivery authorization helper.';
