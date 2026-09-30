import { requireSupabase } from '../../services/supabase/client'

export type DeliveryActionKind = 'join' | 'watch'
export type DeliveryProvider = 'google_meet' | 'google_drive' | 'cloudflare_stream' | 'external'

export interface ManagedDeliverySource {
  id: string
  lectureId: string
  actionKind: DeliveryActionKind
  provider: DeliveryProvider
  providerReference: string
  label: string | null
  availableFrom: string | null
  availableUntil: string | null
}

type DeliverySourceRow = {
  id: string
  lecture_id: string
  action_kind: DeliveryActionKind
  provider: DeliveryProvider
  provider_reference: string
  label: string | null
  available_from: string | null
  available_until: string | null
}

const sourceColumns = 'id,lecture_id,action_kind,provider,provider_reference,label,available_from,available_until'

function mapSource(row: DeliverySourceRow): ManagedDeliverySource {
  return {
    id: row.id,
    lectureId: row.lecture_id,
    actionKind: row.action_kind,
    provider: row.provider,
    providerReference: row.provider_reference,
    label: row.label,
    availableFrom: row.available_from,
    availableUntil: row.available_until,
  }
}

export async function listManagedDeliverySources(lectureId: string): Promise<ManagedDeliverySource[]> {
  const { data, error } = await requireSupabase()
    .from('lecture_delivery_sources')
    .select(sourceColumns)
    .eq('lecture_id', lectureId)
    .order('action_kind')

  if (error) throw error
  return ((data ?? []) as DeliverySourceRow[]).map(mapSource)
}

export async function saveManagedDeliverySource(input: {
  lectureId: string
  actionKind: DeliveryActionKind
  provider: DeliveryProvider
  providerReference: string
  label?: string
}): Promise<ManagedDeliverySource> {
  const client = requireSupabase()
  const reference = input.providerReference.trim()
  const label = input.label?.trim() || null

  const { data, error } = await client
    .from('lecture_delivery_sources')
    .upsert({
      lecture_id: input.lectureId,
      action_kind: input.actionKind,
      provider: input.provider,
      provider_reference: reference,
      label,
    }, { onConflict: 'lecture_id,action_kind' })
    .select(sourceColumns)
    .single()

  if (error) throw error
  return mapSource(data as DeliverySourceRow)
}

export async function deleteManagedDeliverySource(lectureId: string, actionKind: DeliveryActionKind) {
  const { error } = await requireSupabase()
    .from('lecture_delivery_sources')
    .delete()
    .eq('lecture_id', lectureId)
    .eq('action_kind', actionKind)

  if (error) throw error
}
