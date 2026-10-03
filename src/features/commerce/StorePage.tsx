import { useEffect,useState } from 'react'
import { Link,useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { createCommerceOrder,loadPublicBatchOffers,type PublicBatchOffer } from './commerceService'

const errorMessage=(error:unknown)=>error instanceof Error?error.message:'Unable to create order.'
const money=(minor:number,currency:string)=>new Intl.NumberFormat('en-IN',{style:'currency',currency,maximumFractionDigits:2}).format(minor/100)

export function StorePage(){
  const navigate=useNavigate()
  const {status}=useAuth()
  const [offers,setOffers]=useState<PublicBatchOffer[]>([])
  const [coupons,setCoupons]=useState<Record<string,string>>({})
  const [loading,setLoading]=useState(true),[busyId,setBusyId]=useState<string|null>(null),[error,setError]=useState<string|null>(null)

  useEffect(()=>{let active=true;void loadPublicBatchOffers().then(rows=>{if(active)setOffers(rows)}).catch(e=>{if(active)setError(errorMessage(e))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[])

  async function order(offer:PublicBatchOffer){
    if(status!=='authenticated')return
    setBusyId(offer.offerId);setError(null)
    try{
      await createCommerceOrder({batchId:offer.batchId,couponCode:coupons[offer.offerId]??'',provider:'manual'})
      navigate('/orders',{replace:false})
    }catch(e){setError(errorMessage(e))}finally{setBusyId(null)}
  }

  return <section className="commerce-store-page"><div className="container commerce-store-shell">
    <header className="commerce-store-hero"><span className="eyebrow">Statistics Lover courses</span><h1>Choose your batch.</h1><p>Prices and discounts are calculated on the server. Course access activates only after payment verification.</p></header>
    {error&&<div className="admin-alert admin-alert-error">{error}</div>}
    {loading?<div className="learning-empty-card"><h2>Loading available batches…</h2></div>:!offers.length?<div className="learning-empty-card"><h2>No batches on sale right now</h2><p>New enrollment windows will appear here when they open.</p></div>:<div className="commerce-offer-grid">{offers.map(offer=>{
      const price=offer.salePriceMinor??offer.listPriceMinor
      return <article className="commerce-offer-card" key={offer.offerId}>
        <div><span className="eyebrow">{offer.courseTitle}</span><h2>{offer.batchTitle}</h2>{offer.batchCode&&<p>{offer.batchCode}</p>}</div>
        <div className="commerce-price"><strong>{money(price,offer.currency)}</strong>{offer.salePriceMinor!==null&&offer.salePriceMinor!==offer.listPriceMinor&&<del>{money(offer.listPriceMinor,offer.currency)}</del>}</div>
        <div className="commerce-offer-meta"><span>{offer.accessDays?`${offer.accessDays} days access`:'Access through batch end'}</span><span>Verified enrollment</span></div>
        {status==='authenticated'?<>
          <div className="commerce-coupon-box"><input aria-label="Coupon code" placeholder="Coupon code" value={coupons[offer.offerId]??''} onChange={e=>setCoupons(current=>({...current,[offer.offerId]:e.target.value.toUpperCase()}))}/></div>
          <button className="button button-small" disabled={busyId===offer.offerId} onClick={()=>void order(offer)}>{busyId===offer.offerId?'Creating order…':'Create order'}</button>
        </>:<Link className="button button-small" to="/login">Sign in to enroll</Link>}
      </article>
    })}</div>}
  </div></section>
}
