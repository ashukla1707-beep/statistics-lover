import { useEffect,useMemo,useState,type FormEvent } from 'react'
import { listManagedBatches,listManagedCourses,type ManagedBatch,type ManagedCourse } from './academicAdminService'
import { AdminSubnav } from './AdminSubnav'
import {
  deleteManagedCoupon,listManagedCoupons,listManagedOffers,listManagedOrders,markManagedOrderPaid,saveManagedCoupon,saveManagedOffer,
  type CommerceDiscountType,type CommerceOfferStatus,type ManagedCoupon,type ManagedOffer,type ManagedOrder,
} from './commerceAdminService'

const messageFrom=(error:unknown)=>error instanceof Error?error.message:'Something went wrong.'
const money=(minor:number,currency:string)=>new Intl.NumberFormat('en-IN',{style:'currency',currency,maximumFractionDigits:2}).format(minor/100)
const localDateTime=(value:string|null)=>value?new Date(new Date(value).getTime()-new Date(value).getTimezoneOffset()*60000).toISOString().slice(0,16):''

type OfferForm={id:string|null;batchId:string;currency:string;listPrice:string;salePrice:string;accessDays:string;status:CommerceOfferStatus}
type CouponForm={id:string|null;code:string;description:string;discountType:CommerceDiscountType;discountValue:string;maxDiscount:string;minOrder:string;startsAt:string;endsAt:string;maxRedemptions:string;perUserLimit:string;isActive:boolean}

const blankCoupon:CouponForm={id:null,code:'',description:'',discountType:'percent',discountValue:'10',maxDiscount:'',minOrder:'0',startsAt:'',endsAt:'',maxRedemptions:'',perUserLimit:'1',isActive:true}

export function CommerceManagementPage(){
  const [courses,setCourses]=useState<ManagedCourse[]>([]),[batches,setBatches]=useState<ManagedBatch[]>([])
  const [offers,setOffers]=useState<ManagedOffer[]>([]),[coupons,setCoupons]=useState<ManagedCoupon[]>([]),[orders,setOrders]=useState<ManagedOrder[]>([])
  const [offerForm,setOfferForm]=useState<OfferForm|null>(null),[couponForm,setCouponForm]=useState<CouponForm|null>(null)
  const [tab,setTab]=useState<'pricing'|'coupons'|'orders'>('pricing'),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false)
  const [error,setError]=useState<string|null>(null),[notice,setNotice]=useState<string|null>(null)

  const batchMap=useMemo(()=>new Map(batches.map((b)=>[b.id,b])),[batches])
  const courseMap=useMemo(()=>new Map(courses.map((c)=>[c.id,c])),[courses])

  async function refreshCommerce(){
    const [offerRows,couponRows,orderRows]=await Promise.all([listManagedOffers(),listManagedCoupons(),listManagedOrders()])
    setOffers(offerRows);setCoupons(couponRows);setOrders(orderRows)
  }

  useEffect(()=>{let active=true;void (async()=>{
    try{
      const courseRows=await listManagedCourses()
      const batchRows=(await Promise.all(courseRows.map((course)=>listManagedBatches(course.id)))).flat()
      const [offerRows,couponRows,orderRows]=await Promise.all([listManagedOffers(),listManagedCoupons(),listManagedOrders()])
      if(!active)return
      setCourses(courseRows);setBatches(batchRows);setOffers(offerRows);setCoupons(couponRows);setOrders(orderRows)
    }catch(e){if(active)setError(messageFrom(e))}finally{if(active)setLoading(false)}
  })();return()=>{active=false}},[])

  function startOffer(offer?:ManagedOffer){
    const firstBatch=batches[0]
    if(!offer&&!firstBatch)return
    setOfferForm(offer?{id:offer.id,batchId:offer.batchId,currency:offer.currency,listPrice:(offer.listPriceMinor/100).toString(),salePrice:offer.salePriceMinor===null?'':(offer.salePriceMinor/100).toString(),accessDays:offer.accessDays?.toString()??'',status:offer.status}:{id:null,batchId:firstBatch.id,currency:'INR',listPrice:'',salePrice:'',accessDays:'',status:'inactive'})
    setError(null);setNotice(null)
  }

  async function saveOffer(event:FormEvent){
    event.preventDefault();if(!offerForm)return
    setSaving(true);setError(null);setNotice(null)
    try{
      await saveManagedOffer({id:offerForm.id,batchId:offerForm.batchId,currency:offerForm.currency,listPriceMinor:Math.round(Number(offerForm.listPrice)*100),salePriceMinor:offerForm.salePrice===''?null:Math.round(Number(offerForm.salePrice)*100),accessDays:offerForm.accessDays===''?null:Number(offerForm.accessDays),status:offerForm.status})
      await refreshCommerce();setOfferForm(null);setNotice('Batch pricing saved.')
    }catch(e){setError(messageFrom(e))}finally{setSaving(false)}
  }

  function startCoupon(coupon?:ManagedCoupon){
    setCouponForm(coupon?{id:coupon.id,code:coupon.code,description:coupon.description??'',discountType:coupon.discountType,discountValue:coupon.discountType==='fixed'?(coupon.discountValue/100).toString():coupon.discountValue.toString(),maxDiscount:coupon.maxDiscountMinor===null?'':(coupon.maxDiscountMinor/100).toString(),minOrder:(coupon.minOrderMinor/100).toString(),startsAt:localDateTime(coupon.startsAt),endsAt:localDateTime(coupon.endsAt),maxRedemptions:coupon.maxRedemptions?.toString()??'',perUserLimit:coupon.perUserLimit.toString(),isActive:coupon.isActive}:blankCoupon)
    setError(null);setNotice(null)
  }

  async function saveCoupon(event:FormEvent){
    event.preventDefault();if(!couponForm)return
    setSaving(true);setError(null);setNotice(null)
    try{
      const discountValue=couponForm.discountType==='fixed'?Math.round(Number(couponForm.discountValue)*100):Number(couponForm.discountValue)
      await saveManagedCoupon({id:couponForm.id,code:couponForm.code,description:couponForm.description,discountType:couponForm.discountType,discountValue,maxDiscountMinor:couponForm.maxDiscount===''?null:Math.round(Number(couponForm.maxDiscount)*100),minOrderMinor:Math.round(Number(couponForm.minOrder||0)*100),startsAt:couponForm.startsAt?new Date(couponForm.startsAt).toISOString():null,endsAt:couponForm.endsAt?new Date(couponForm.endsAt).toISOString():null,maxRedemptions:couponForm.maxRedemptions===''?null:Number(couponForm.maxRedemptions),perUserLimit:Number(couponForm.perUserLimit||1),isActive:couponForm.isActive})
      await refreshCommerce();setCouponForm(null);setNotice('Coupon saved.')
    }catch(e){setError(messageFrom(e))}finally{setSaving(false)}
  }

  async function removeCoupon(id:string){
    if(!window.confirm('Delete this coupon?'))return
    setSaving(true);try{await deleteManagedCoupon(id);await refreshCommerce();setNotice('Coupon deleted.')}catch(e){setError(messageFrom(e))}finally{setSaving(false)}
  }

  async function markPaid(order:ManagedOrder){
    const reference=window.prompt('Payment reference / transaction ID (optional):','')??''
    setSaving(true);setError(null);setNotice(null)
    try{await markManagedOrderPaid(order.id,reference);await refreshCommerce();setNotice('Payment verified manually and enrollment activated.')}catch(e){setError(messageFrom(e))}finally{setSaving(false)}
  }

  return <section className="admin-page commerce-admin-page"><div className="container admin-shell">
    <AdminSubnav active="commerce"/>
    <header className="admin-page-heading"><div><span className="eyebrow">Commerce & access</span><h1>Commerce</h1><p>Set batch pricing, manage coupons, review orders and activate enrollment only after a verified payment.</p></div></header>
    {error&&<div className="admin-alert admin-alert-error">{error}</div>}{notice&&<div className="admin-alert admin-alert-success">{notice}</div>}
    <div className="commerce-tabs"><button className={tab==='pricing'?'is-active':''} onClick={()=>setTab('pricing')}>Batch Pricing</button><button className={tab==='coupons'?'is-active':''} onClick={()=>setTab('coupons')}>Coupons</button><button className={tab==='orders'?'is-active':''} onClick={()=>setTab('orders')}>Orders</button></div>

    {tab==='pricing'&&<section className="admin-panel commerce-panel"><div className="admin-panel-heading"><div><span>{offers.length} offers</span><h2>Batch pricing</h2></div><button className="button button-small" disabled={!batches.length} onClick={()=>startOffer()}>+ Add price</button></div>
      {offerForm&&<form className="admin-form commerce-inline-form" onSubmit={saveOffer}><div className="admin-form-grid">
        <label className="form-field admin-field-wide"><span>Batch</span><select value={offerForm.batchId} disabled={Boolean(offerForm.id)} onChange={e=>setOfferForm(x=>x&&({...x,batchId:e.target.value}))}>{batches.map((batch)=>{const course=courseMap.get(batch.courseId);return <option key={batch.id} value={batch.id}>{course?.title??'Course'} · {batch.title}</option>})}</select></label>
        <label className="form-field"><span>Currency</span><input maxLength={3} value={offerForm.currency} onChange={e=>setOfferForm(x=>x&&({...x,currency:e.target.value.toUpperCase()}))}/></label>
        <label className="form-field"><span>List price</span><input required type="number" min="0.01" step="0.01" value={offerForm.listPrice} onChange={e=>setOfferForm(x=>x&&({...x,listPrice:e.target.value}))}/></label>
        <label className="form-field"><span>Sale price</span><input type="number" min="0" step="0.01" value={offerForm.salePrice} onChange={e=>setOfferForm(x=>x&&({...x,salePrice:e.target.value}))}/></label>
        <label className="form-field"><span>Access days</span><input type="number" min="1" value={offerForm.accessDays} onChange={e=>setOfferForm(x=>x&&({...x,accessDays:e.target.value}))} placeholder="Until batch end"/></label>
        <label className="form-field"><span>Status</span><select value={offerForm.status} onChange={e=>setOfferForm(x=>x&&({...x,status:e.target.value as CommerceOfferStatus}))}><option value="inactive">Inactive</option><option value="active">Active</option></select></label>
      </div><div className="admin-form-actions"><button className="button button-small" disabled={saving}>{saving?'Saving…':'Save price'}</button><button type="button" className="admin-text-button" onClick={()=>setOfferForm(null)}>Cancel</button></div></form>}
      {loading?<p className="admin-empty">Loading pricing…</p>:<div className="commerce-list">{offers.map((offer)=>{const batch=batchMap.get(offer.batchId);const course=batch?courseMap.get(batch.courseId):null;return <article key={offer.id}><div><span className={`admin-status admin-status-${offer.status==='active'?'active':'archived'}`}>{offer.status}</span><strong>{course?.title??'Course'} · {batch?.title??'Batch'}</strong><small>{money(offer.salePriceMinor??offer.listPriceMinor,offer.currency)}{offer.salePriceMinor!==null&&offer.salePriceMinor!==offer.listPriceMinor?` · List ${money(offer.listPriceMinor,offer.currency)}`:''}{offer.accessDays?` · ${offer.accessDays} days access`:' · Access through batch end'}</small></div><button className="admin-text-button" onClick={()=>startOffer(offer)}>Edit</button></article>})}</div>}
    </section>}

    {tab==='coupons'&&<section className="admin-panel commerce-panel"><div className="admin-panel-heading"><div><span>{coupons.length} coupons</span><h2>Discount coupons</h2></div><button className="button button-small" onClick={()=>startCoupon()}>+ New coupon</button></div>
      {couponForm&&<form className="admin-form commerce-inline-form" onSubmit={saveCoupon}><div className="admin-form-grid">
        <label className="form-field"><span>Code</span><input required pattern="[A-Za-z0-9_-]{2,40}" value={couponForm.code} onChange={e=>setCouponForm(x=>x&&({...x,code:e.target.value.toUpperCase()}))}/></label>
        <label className="form-field"><span>Discount type</span><select value={couponForm.discountType} onChange={e=>setCouponForm(x=>x&&({...x,discountType:e.target.value as CommerceDiscountType}))}><option value="percent">Percent</option><option value="fixed">Fixed amount</option></select></label>
        <label className="form-field"><span>{couponForm.discountType==='percent'?'Discount %':'Discount amount'}</span><input required type="number" min="0.01" step="0.01" value={couponForm.discountValue} onChange={e=>setCouponForm(x=>x&&({...x,discountValue:e.target.value}))}/></label>
        <label className="form-field"><span>Max discount</span><input type="number" min="0" step="0.01" value={couponForm.maxDiscount} onChange={e=>setCouponForm(x=>x&&({...x,maxDiscount:e.target.value}))}/></label>
        <label className="form-field"><span>Min order</span><input type="number" min="0" step="0.01" value={couponForm.minOrder} onChange={e=>setCouponForm(x=>x&&({...x,minOrder:e.target.value}))}/></label>
        <label className="form-field"><span>Per-user limit</span><input type="number" min="1" value={couponForm.perUserLimit} onChange={e=>setCouponForm(x=>x&&({...x,perUserLimit:e.target.value}))}/></label>
        <label className="form-field"><span>Total redemption limit</span><input type="number" min="1" value={couponForm.maxRedemptions} onChange={e=>setCouponForm(x=>x&&({...x,maxRedemptions:e.target.value}))}/></label>
        <label className="form-field"><span>Starts at</span><input type="datetime-local" value={couponForm.startsAt} onChange={e=>setCouponForm(x=>x&&({...x,startsAt:e.target.value}))}/></label>
        <label className="form-field"><span>Ends at</span><input type="datetime-local" value={couponForm.endsAt} onChange={e=>setCouponForm(x=>x&&({...x,endsAt:e.target.value}))}/></label>
        <label className="form-field admin-field-wide"><span>Description</span><input maxLength={500} value={couponForm.description} onChange={e=>setCouponForm(x=>x&&({...x,description:e.target.value}))}/></label>
        <label className="staff-check"><input type="checkbox" checked={couponForm.isActive} onChange={e=>setCouponForm(x=>x&&({...x,isActive:e.target.checked}))}/><span>Coupon active</span></label>
      </div><div className="admin-form-actions"><button className="button button-small" disabled={saving}>{saving?'Saving…':'Save coupon'}</button><button type="button" className="admin-text-button" onClick={()=>setCouponForm(null)}>Cancel</button></div></form>}
      <div className="commerce-list">{coupons.map((coupon)=><article key={coupon.id}><div><span className={`admin-status admin-status-${coupon.isActive?'active':'archived'}`}>{coupon.isActive?'active':'inactive'}</span><strong>{coupon.code}</strong><small>{coupon.discountType==='percent'?`${coupon.discountValue}% off`:`${money(coupon.discountValue,'INR')} off`}{coupon.description?` · ${coupon.description}`:''}</small></div><div className="lecture-admin-actions"><button className="admin-text-button" onClick={()=>startCoupon(coupon)}>Edit</button><button className="admin-danger-button" disabled={saving} onClick={()=>void removeCoupon(coupon.id)}>Delete</button></div></article>)}</div>
    </section>}

    {tab==='orders'&&<section className="admin-panel commerce-panel"><div className="admin-panel-heading"><div><span>{orders.length} latest orders</span><h2>Orders & payments</h2></div></div>
      <div className="commerce-order-list">{orders.map((order)=><article key={order.id}><div><span className={`admin-status admin-status-${order.status==='paid'?'active':order.status==='pending'?'scheduled':'archived'}`}>{order.status}</span><strong>{order.orderNumber} · {order.studentName||order.studentEmail||'Student'}</strong><small>{order.courseTitle} · {order.batchTitle} · {money(order.totalMinor,order.currency)}{order.couponCode?` · Coupon ${order.couponCode}`:''}</small><small>{new Date(order.createdAt).toLocaleString()}{order.receiptNumber?` · Receipt ${order.receiptNumber}`:''}</small></div><div className="commerce-order-actions">{order.status==='pending'&&<button className="button button-small" disabled={saving} onClick={()=>void markPaid(order)}>Verify manual payment</button>}{order.paymentReference&&<small>{order.paymentReference}</small>}</div></article>)}</div>
    </section>}
  </div></section>
}
