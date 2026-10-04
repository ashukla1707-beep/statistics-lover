import { useEffect,useState } from 'react'
import { Link,useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth'
import { loadMyOrders,loadPublicCommerceConfig,type CommerceConfig,type StudentOrder } from './commerceService'
import { launchRazorpayCheckout } from './razorpayCheckout'

const errorMessage=(error:unknown)=>error instanceof Error?error.message:'Unable to load orders.'
const money=(minor:number,currency:string)=>new Intl.NumberFormat('en-IN',{style:'currency',currency,maximumFractionDigits:2}).format(minor/100)

export function MyOrdersPage(){
  const {identity}=useAuth()
  const [searchParams]=useSearchParams()
  const [orders,setOrders]=useState<StudentOrder[]>([])
  const [config,setConfig]=useState<CommerceConfig>({razorpayEnabled:false})
  const [loading,setLoading]=useState(true),[busyId,setBusyId]=useState<string|null>(null),[error,setError]=useState<string|null>(null)

  async function reload(userId:string){
    const [rows,paymentConfig]=await Promise.all([loadMyOrders(userId),loadPublicCommerceConfig()])
    setOrders(rows);setConfig(paymentConfig)
  }

  useEffect(()=>{if(!identity?.userId)return;let active=true;void Promise.all([loadMyOrders(identity.userId),loadPublicCommerceConfig()]).then(([rows,paymentConfig])=>{if(active){setOrders(rows);setConfig(paymentConfig)}}).catch(e=>active&&setError(errorMessage(e))).finally(()=>active&&setLoading(false));return()=>{active=false}},[identity?.userId])

  async function retry(order:StudentOrder){
    if(!identity?.userId)return
    setBusyId(order.id);setError(null)
    try{
      await launchRazorpayCheckout(order.id)
      await reload(identity.userId)
    }catch(e){setError(errorMessage(e))}finally{setBusyId(null)}
  }

  return <section className="commerce-orders-page"><div className="container commerce-orders-shell">
    <header className="commerce-orders-hero"><span className="eyebrow">Billing</span><h1>My Orders</h1><p>Track payment verification, receipts and enrollment activation.</p></header>
    {searchParams.get('payment')==='success'&&<div className="admin-alert admin-alert-success">Payment verified. Your batch access is active.</div>}
    <div className="learning-hero-actions"><Link className="button button-small" to="/store">Browse batches</Link><Link className="button button-small button-secondary" to="/dashboard">Dashboard</Link></div>
    {error&&<div className="admin-alert admin-alert-error">{error}</div>}
    {loading?<div className="learning-empty-card"><h2>Loading orders…</h2></div>:!orders.length?<div className="learning-empty-card"><h2>No orders yet</h2><p>Your purchase history will appear here.</p><Link className="button button-small" to="/store">Browse available batches</Link></div>:<div className="commerce-student-order-list">{orders.map(order=><article className="commerce-student-order" key={order.id}>
      <div><span className={`commerce-order-status commerce-order-status-${order.status}`}>{order.status}</span><strong>{order.courseTitle} · {order.batchTitle}</strong><small>{order.orderNumber} · Created {new Date(order.createdAt).toLocaleString()}</small>{order.couponCode&&<small>Coupon: {order.couponCode}</small>}{order.status==='pending'&&<small>Payment is awaiting verification. Enrollment is not activated until payment is verified.</small>}{order.status==='paid'&&<small>Payment verified{order.paidAt?` on ${new Date(order.paidAt).toLocaleString()}`:''}. Your batch access is activated.</small>}{order.receiptNumber&&<small>Receipt: {order.receiptNumber}{order.receiptIssuedAt?` · ${new Date(order.receiptIssuedAt).toLocaleString()}`:''}</small>}</div>
      <div className="commerce-order-summary"><strong>{money(order.totalMinor,order.currency)}</strong>{order.discountMinor>0&&<small>Saved {money(order.discountMinor,order.currency)}</small>}<small>{order.provider==='manual'?'Manual verification':order.provider}</small>{config.razorpayEnabled&&order.provider==='razorpay'&&order.status==='pending'&&<button className="button button-small" disabled={busyId===order.id} onClick={()=>void retry(order)}>{busyId===order.id?'Opening…':'Retry payment'}</button>}</div>
    </article>)}</div>}
  </div></section>
}
