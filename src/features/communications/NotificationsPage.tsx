import { useEffect,useState } from 'react'
import { Link } from 'react-router-dom'
import { loadMyNotifications,markAllNotificationsRead,markNotificationRead,type InAppNotification } from './announcementService'

const errorMessage=(error:unknown)=>error instanceof Error?error.message:'Unable to load notifications.'

export function NotificationsPage(){
  const [notifications,setNotifications]=useState<InAppNotification[]>([])
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null)

  async function refresh(){setNotifications(await loadMyNotifications())}
  useEffect(()=>{let active=true;void loadMyNotifications().then(rows=>{if(active)setNotifications(rows)}).catch(e=>{if(active)setError(errorMessage(e))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[])

  async function read(item:InAppNotification){
    if(item.readAt)return
    try{await markNotificationRead(item.id);setNotifications(current=>current.map(value=>value.id===item.id?{...value,readAt:new Date().toISOString()}:value))}catch(e){setError(errorMessage(e))}
  }
  async function readAll(){
    setBusy(true);setError(null)
    try{await markAllNotificationsRead();await refresh()}catch(e){setError(errorMessage(e))}finally{setBusy(false)}
  }

  const unread=notifications.filter(item=>!item.readAt).length
  return <section className="notifications-page"><div className="container notifications-shell">
    <header className="notifications-hero"><div><span className="eyebrow">Inbox</span><h1>Notifications</h1><p>Announcements and account updates that are available to you.</p></div>{unread>0&&<button className="button button-small button-secondary" disabled={busy} onClick={()=>void readAll()}>{busy?'Updating…':'Mark all read'}</button>}</header>
    {error&&<div className="admin-alert admin-alert-error">{error}</div>}
    {loading?<div className="learning-empty-card"><h2>Loading notifications…</h2></div>:!notifications.length?<div className="learning-empty-card"><h2>You’re all caught up</h2><p>New announcements will appear here.</p></div>:<div className="notification-list">{notifications.map(item=><article className={item.readAt?'is-read':'is-unread'} key={item.id} onMouseEnter={()=>void read(item)}>
      <div className="notification-dot" aria-hidden="true"/><div><div className="notification-title-row"><strong>{item.title}</strong><span>{new Date(item.availableAt).toLocaleString()}</span></div><p>{item.body}</p><small>{item.kind.replaceAll('_',' ')}</small>{item.actionUrl&&<Link to={item.actionUrl} onClick={()=>void read(item)}>Open related page →</Link>}</div></article>)}</div>}
  </div></section>
}
