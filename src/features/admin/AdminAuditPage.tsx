import { useEffect,useMemo,useState } from 'react'
import { AdminSubnav } from './AdminSubnav'
import { CollectionPager,CollectionToolbar,useCollectionPagination } from './CollectionControls'
import { listAuditLogs,type AuditLogEntry } from './operationsAdminService'

const humanize=(value:string)=>value.replaceAll('_',' ').replace(/\b\w/g,(letter)=>letter.toUpperCase())
const errorMessage=(error:unknown)=>error instanceof Error?error.message:'Unable to load audit logs.'

export function AdminAuditPage(){
  const [entries,setEntries]=useState<AuditLogEntry[]>([])
  const [query,setQuery]=useState(''),[entityFilter,setEntityFilter]=useState('all'),[actionFilter,setActionFilter]=useState('all')
  const [loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null)

  useEffect(()=>{let active=true;void listAuditLogs().then((rows)=>{if(active)setEntries(rows)}).catch((cause)=>{if(active)setError(errorMessage(cause))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[])

  const entityTypes=useMemo(()=>[...new Set(entries.map((entry)=>entry.entityType))].sort(),[entries])
  const actions=useMemo(()=>[...new Set(entries.map((entry)=>entry.action))].sort(),[entries])
  const filtered=useMemo(()=>{const search=query.trim().toLowerCase();return entries.filter((entry)=>(entityFilter==='all'||entry.entityType===entityFilter)&&(actionFilter==='all'||entry.action===actionFilter)&&(!search||[entry.actorName??'',entry.actorEmail??'',entry.actorRole??'',entry.action,entry.entityType,entry.entityId??''].some((value)=>value.toLowerCase().includes(search))))},[entries,query,entityFilter,actionFilter])
  const pager=useCollectionPagination(filtered,20,`${query}|${entityFilter}|${actionFilter}`)

  return <section className="admin-page audit-page"><div className="container admin-shell">
    <AdminSubnav active="audit"/>
    <header className="admin-page-heading"><div><span className="eyebrow">Security & accountability</span><h1>Audit Log</h1><p>Review critical database changes without storing full private row snapshots.</p></div></header>
    {error&&<div className="admin-alert admin-alert-error">{error}</div>}
    <section className="admin-panel audit-panel"><div className="admin-panel-heading"><div><span>Latest {entries.length}</span><h2>Operational activity</h2></div></div>
      <CollectionToolbar query={query} onQueryChange={setQuery} placeholder="Search actor, entity or ID" shown={filtered.length} total={entries.length}>
        <select aria-label="Entity type" value={entityFilter} onChange={(event)=>setEntityFilter(event.target.value)}><option value="all">All entities</option>{entityTypes.map((type)=><option key={type} value={type}>{humanize(type)}</option>)}</select>
        <select aria-label="Action" value={actionFilter} onChange={(event)=>setActionFilter(event.target.value)}><option value="all">All actions</option>{actions.map((action)=><option key={action} value={action}>{humanize(action)}</option>)}</select>
      </CollectionToolbar>
      {loading?<p className="admin-empty">Loading audit history…</p>:!filtered.length?<p className="admin-empty">No matching audit events.</p>:<div className="audit-list">{pager.pageItems.map((entry)=><article key={entry.id}><div><span className={`audit-action audit-action-${entry.action}`}>{entry.action}</span><strong>{humanize(entry.entityType)}{entry.entityId?` · ${entry.entityId}`:''}</strong><small>{entry.actorName||entry.actorEmail||entry.actorRole||'System'} · {new Date(entry.occurredAt).toLocaleString()}</small></div><div>{Array.isArray(entry.metadata.changed_columns)&&entry.metadata.changed_columns.length>0&&<><span>Changed</span><p>{entry.metadata.changed_columns.join(', ')}</p></>}</div></article>)}</div>}
      <CollectionPager page={pager.page} totalPages={pager.totalPages} pageSize={pager.pageSize} totalItems={filtered.length} onPageChange={pager.setPage} onPageSizeChange={pager.setPageSize}/>
    </section>
  </div></section>
}
