import { useEffect,useMemo,useState,type FormEvent } from 'react'
import { AdminSubnav } from './AdminSubnav'
import { listAppSettings,saveAppSetting,type AppSetting } from './operationsAdminService'

const errorMessage=(error:unknown)=>error instanceof Error?error.message:'Unable to save settings.'
const labels:Record<string,string>={
  default_timezone:'Default timezone',
  support_email:'Support email',
  support_phone:'Support phone / WhatsApp',
  student_portal_notice:'Student portal notice',
  commerce_payment_instructions:'Manual payment instructions',
}

function settingText(setting:AppSetting|undefined){
  if(setting?.value===null||setting?.value===undefined)return''
  return typeof setting.value==='string'?setting.value:String(setting.value)
}

export function AdminSettingsPage(){
  const [settings,setSettings]=useState<AppSetting[]>([])
  const [values,setValues]=useState<Record<string,string>>({})
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState<string|null>(null),[notice,setNotice]=useState<string|null>(null)

  useEffect(()=>{let active=true;void listAppSettings().then((rows)=>{if(!active)return;setSettings(rows);setValues(Object.fromEntries(rows.map((setting)=>[setting.key,settingText(setting)]))}).catch((cause)=>{if(active)setError(errorMessage(cause))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[])

  const settingMap=useMemo(()=>new Map(settings.map((setting)=>[setting.key,setting])),[settings])
  async function save(event:FormEvent){
    event.preventDefault();setSaving(true);setError(null);setNotice(null)
    try{
      for(const key of Object.keys(labels))await saveAppSetting(key,values[key]??'')
      const rows=await listAppSettings();setSettings(rows);setNotice('Operational settings saved and audited.')
    }catch(cause){setError(errorMessage(cause))}finally{setSaving(false)}
  }

  return <section className="admin-page settings-page"><div className="container admin-shell">
    <AdminSubnav active="settings"/>
    <header className="admin-page-heading"><div><span className="eyebrow">Operations configuration</span><h1>Settings</h1><p>Manage non-secret operational values. Provider/API secrets stay outside the browser and are not stored here.</p></div></header>
    {error&&<div className="admin-alert admin-alert-error">{error}</div>}{notice&&<div className="admin-alert admin-alert-success">{notice}</div>}
    {loading?<div className="auth-state">Loading settings…</div>:<form className="admin-panel settings-form" onSubmit={save}>
      <div className="settings-grid">
        <label className="form-field"><span>{labels.default_timezone}</span><input value={values.default_timezone??''} onChange={(event)=>setValues((current)=>({...current,default_timezone:event.target.value}))} placeholder="Asia/Kolkata"/><small>{settingMap.get('default_timezone')?.description}</small></label>
        <label className="form-field"><span>{labels.support_email}</span><input type="email" value={values.support_email??''} onChange={(event)=>setValues((current)=>({...current,support_email:event.target.value}))} placeholder="support@example.com"/><small>{settingMap.get('support_email')?.description}</small></label>
        <label className="form-field"><span>{labels.support_phone}</span><input value={values.support_phone??''} onChange={(event)=>setValues((current)=>({...current,support_phone:event.target.value}))} placeholder="+91…"/><small>{settingMap.get('support_phone')?.description}</small></label>
        <label className="form-field settings-wide"><span>{labels.student_portal_notice}</span><textarea rows={4} maxLength={1000} value={values.student_portal_notice??''} onChange={(event)=>setValues((current)=>({...current,student_portal_notice:event.target.value}))}/><small>{settingMap.get('student_portal_notice')?.description}</small></label>
        <label className="form-field settings-wide"><span>{labels.commerce_payment_instructions}</span><textarea rows={5} maxLength={2000} value={values.commerce_payment_instructions??''} onChange={(event)=>setValues((current)=>({...current,commerce_payment_instructions:event.target.value}))}/><small>{settingMap.get('commerce_payment_instructions')?.description}</small></label>
      </div>
      <div className="settings-security-note"><strong>Secrets are intentionally excluded.</strong><p>Payment keys, Supabase service-role keys, Resend credentials and WhatsApp tokens remain in secure provider/environment configuration.</p></div>
      <div className="admin-form-actions"><button className="button button-small" disabled={saving}>{saving?'Saving…':'Save settings'}</button></div>
    </form>}
  </div></section>
}
