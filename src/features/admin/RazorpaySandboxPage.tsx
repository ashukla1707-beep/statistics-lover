import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requireSupabase } from '../../services/supabase/client'
import { launchRazorpayCheckout } from '../commerce/razorpayCheckout'

const message=(value:unknown)=>value instanceof Error?value.message:'Unable to complete sandbox checkout.'

export function RazorpaySandboxPage(){
  const [busy,setBusy]=useState(false)
  const [notice,setNotice]=useState<string|null>(null)
  const [error,setError]=useState<string|null>(null)

  async function startTest(){
    setBusy(true)
    setNotice(null)
    setError(null)
    try{
      const {data,error:orderError}=await requireSupabase().rpc('create_razorpay_sandbox_order')
      if(orderError)throw orderError
      if(typeof data!=='string'||!data)throw new Error('Unable to prepare the private sandbox order.')
      const result=await launchRazorpayCheckout(data)
      setNotice(result==='paid'
        ? 'Test payment verified. Check My Orders for the receipt and sandbox enrollment.'
        : 'Test checkout closed. You can retry the same pending test order.')
    }catch(err){setError(message(err))}
    finally{setBusy(false)}
  }

  return <section className="commerce-store-page"><div className="container commerce-store-shell">
    <header className="commerce-store-hero">
      <span className="eyebrow">Owner-only · Sandbox</span>
      <h1>Razorpay ₹1 checkout test</h1>
      <p>This unpublished test batch is invisible to customers. Razorpay is in Test Mode: no real payment is collected. The public Razorpay rollout is still disabled.</p>
    </header>
    <div className="learning-empty-card">
      <h2>Private test order — ₹1.00</h2>
      <p>Use Razorpay’s simulator/test card only. This will create a sandbox order, receipt and test enrollment under your signed-in Owner account.</p>
      {error&&<p role="alert" className="admin-alert admin-alert-error">{error}</p>}
      {notice&&<p role="status" className="admin-alert admin-alert-success">{notice}</p>}
      <button type="button" className="button button-small" onClick={()=>void startTest()} disabled={busy}>
        {busy?'Opening test checkout…':'Start ₹1 test checkout'}
      </button>
      <p><Link to="/orders">View My Orders</Link></p>
    </div>
  </div></section>
}
