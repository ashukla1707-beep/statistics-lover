import { useEffect,useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth'
import { loadMyOrders,type StudentOrder } from './commerceService'

const errorMessage=(error:unknown)=>error instanceof Error?error.message:'Unable to load orders.'
const money=(minor:number,currency:string)=>new Intl.NumberFormat('en-IN',{style:'currency',currency,maximumFractionDigits:2}).format(minor/100)

export function MyOrdersPage(){
  const {identity}=useAuth()
  const [orders,setOrders]=useState<StudentOrder[]>([])
  const [loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null)

  useEffect(()=>{if(!identity?.userId)return;let active=true;void loadMyOrders(identity.userId).then(rows=>{if(active)setOrders(rows)}).catch(e=>{if(active)setError(errorMessage(e))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[identity?.userId])

  return <section className="commerce-orders-page"><div className="container commerce-orders-shell">
    <header className="commerce-orders-hero"><span className="eyebrow">Billing</span><h1>My Orders</h1><p>Track payment verification, receipts and enrollment activation.</p></header>
    <div className="learning-hero-actions"><Link className="button button-small" to="/store">Browse batches</Link><Link className="button button-small button-secondary" to="/dashboard">Dashboard</Link></div>
    {error&&<div className="admin-alert admin-alert-error">{error}</div>}
    {loading?<div className="learning-empty-card"><h2>Loading orders…</h2></div>:!orders.length?<div className="learning-empty-card"><h2>No orders yet</h2><p>Your purchase history will appear here.</p><Link className="button button-small" to="/store">Browse available batches</Link></div>:<div className="commerce-student-order-list">{orders.map(order=><article className="commerce-student-order" key={order.id}>
      <div><span className={`commerce-order-status commerce-order-status-${order.status}`}>{order.status}</span><strong>{order.courseTitle} · {order.batchTitle}</strong><small>{order.orderNumber} · Created {new Date(order.createdAt).toLocaleString()}</small>{order.couponCode&&<small>Coupon: {order.couponCode}</small>}{order.status==='pending'&&<small>Payment is awaiting verification. Enrollment is not activated until payment is verified.</small>}{order.status==='paid'&&<small>Payment verified{order.paidAt?` on ${new Date(order.paidAt).toLocaleString()}`:''}. Your batch access is activated.</small>}{order.receiptNumber&&<small>Receipt: {order.receiptNumber}{order.receiptIssuedAt?` · ${new Date(order.receiptIssuedAt).toLocaleString()}`:''}</small>}</div>
      <div className="commerce-order-summary"><strong>{money(order.totalMinor,order.currency)}</strong>{order.discountMinor>0&&<small>Saved {money(order.discountMinor,order.currency)}</small>}<small>{order.provider==='manual'?'Manual verification':order.provider}</small></div>
    </article>)}</div>}
  </div></section>
}
