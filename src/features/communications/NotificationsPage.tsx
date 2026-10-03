import { useEffect,useState } from 'react'
import { Link } from 'react-router-dom'
import { loadMyNotificationPreferences,loadMyNotifications,markAllNotificationsRead,markNotificationRead,saveMyNotificationPreferences,type InAppNotification } from './announcementService'

const errorMessage=(error:unknown)=>error instanceof Error?error.message:'Unable to load notifications.'

export function NotificationsPage(){
  const [notifications,setNotifications]=useState<InAppNotification[]>([])
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null)
  const [emailEnabled,setEmailEnabled]=useState(true),[whatsappEnabled,setWhatsappEnabled]=useState(false),[preferencesSaved,setPreferencesSaved]=useState(false)

  async function refresh(){setNotifications(await loadMyNotifications())}
  useEffect(()=>{let active=true;void Promise.all([loadMyNotifications(),loadMyNotificationPreferences()]).then(([rows,prefs])=>{if(!active)return;setNotifications(rows);setEmailEnabled(prefs.emailEnabled);setWhatsappEnabled(prefs.whatsappEnabled)}).catch(e=>{if(active)setError(errorMessage(e))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[])

  async function read(item:InAppNotification){
    if(item.readAt)return
    try{await markNotificationRead(item.id);setNotifications(current=>current.map(value=>value.id===item.id?{...value,readAt:new Date().toISOString()}:value))}catch(e){setError(errorMessage(e))}
  }
  async function readAll(){
    setBusy(true);setError(null)
    try{await markAllNotificationsRead();await refresh()}catch(e){setError(errorMessage(e))}finally{setBusy(false)}
  }

  async function savePreferences(){
    setBusy(true);setError(null);setPreferencesSaved(false)
    try{await saveMyNotificationPreferences(emailEnabled,whatsappEnabled);setPreferencesSaved(true)}catch(e){setError(errorMessage(e))}finally{setBusy(false)}
  }

  const unread=notifications.filter(item=>!item.readAt).length
  return <section className="notifications-page"><div className="container notifications-shell">
    <header className="notifications-hero"><div><span className="eyebrow">Inbox</span><h1>Notifications</h1><p>Announcements and account updates that are available to you.</p></div>{unread>0&&<button className="button button-small button-secondary" disabled={busy} onClick={()=>void readAll()}>{busy?'Updating…':'Mark all read'}</button>}</header>
    {error&&<div className="admin-alert admin-alert-error">{error}</div>}
    <section className="notification-preferences"><div><strong>Delivery preferences</strong><p>In-app notifications are always available. Email is enabled by default; WhatsApp is opt-in and requires a phone number on your profile.</p></div><label><input type="checkbox" checked={emailEnabled} onChange={e=>{setEmailEnabled(e.target.checked);setPreferencesSaved(false)}}/><span>Email</span></label><label><input type="checkbox" checked={whatsappEnabled} onChange={e=>{setWhatsappEnabled(e.target.checked);setPreferencesSaved(false)}}/><span>WhatsApp</span></label><button className="button button-small button-secondary" disabled={busy} onClick={()=>void savePreferences()}>{busy?'Saving…':'Save preferences'}</button>{preferencesSaved&&<small>Preferences saved.</small>}</section>
    {loading?<div className="learning-empty-card"><h2>Loading notifications…</h2></div>:!notifications.length?<div className="learning-empty-card"><h2>You’re all caught up</h2><p>New announcements will appear here.</p></div>:<div className="notification-list">{notifications.map(item=><article className={item.readAt?'is-read':'is-unread'} key={item.id} onMouseEnter={()=>void read(item)}>
      <div className="notification-dot" aria-hidden="true"/><div><div className="notification-title-row"><strong>{item.title}</strong><span>{new Date(item.availableAt).toLocaleString()}</span></div><p>{item.body}</p><small>{item.kind.replaceAll('_',' ')}</small>{item.actionUrl&&<Link to={item.actionUrl} onClick={()=>void read(item)}>Open related page →</Link>}</div></article>)}</div>}
  </div></section>
}
