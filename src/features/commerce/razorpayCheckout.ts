import { requireSupabase } from '../../services/supabase/client'

// Rollout remains server-gated by commerce_razorpay_enabled until Test Mode verification passes.

type CheckoutResponse={
  keyId:string
  orderId:string
  razorpayOrderId:string
  amount:number
  currency:string
  name:string
  description:string
  prefill:{name:string;email:string;contact:string}
}
type RazorpaySuccess={razorpay_payment_id:string;razorpay_order_id:string;razorpay_signature:string}
type RazorpayOptions={
  key:string
  amount:number
  currency:string
  name:string
  description:string
  image:string
  order_id:string
  prefill:{name:string;email:string;contact:string}
  theme:{color:string}
  retry:{enabled:boolean}
  modal:{confirm_close:boolean;ondismiss:()=>void}
  handler:(response:RazorpaySuccess)=>void|Promise<void>
}
type RazorpayInstance={open:()=>void}
type RazorpayConstructor=new(options:RazorpayOptions)=>RazorpayInstance

declare global{
  interface Window{Razorpay?:RazorpayConstructor}
}

let checkoutScript:Promise<void>|null=null

async function edgeErrorMessage(error:unknown,fallback:string){
  if(error&&typeof error==='object'&&'context' in error){
    const context=(error as {context?:unknown}).context
    if(context instanceof Response){
      try{
        const payload=await context.clone().json() as {error?:unknown}
        if(typeof payload.error==='string'&&payload.error.trim())return payload.error
      }catch{/* keep fallback */}
    }
  }
  if(error instanceof Error&&error.message)return error.message
  return fallback
}

function loadRazorpayScript(){
  if(window.Razorpay)return Promise.resolve()
  if(checkoutScript)return checkoutScript
  checkoutScript=new Promise<void>((resolve,reject)=>{
    const existing=document.querySelector<HTMLScriptElement>('script[data-statistics-lover-razorpay]')
    if(existing){
      existing.addEventListener('load',()=>resolve(),{once:true})
      existing.addEventListener('error',()=>reject(new Error('Unable to load secure payment checkout.')),{once:true})
      return
    }
    const script=document.createElement('script')
    script.src='https://checkout.razorpay.com/v1/checkout.js'
    script.async=true
    script.dataset.statisticsLoverRazorpay='true'
    script.onload=()=>resolve()
    script.onerror=()=>reject(new Error('Unable to load secure payment checkout.'))
    document.head.appendChild(script)
  })
  return checkoutScript
}

async function invokeCheckout(body:Record<string,unknown>){
  const {data,error}=await requireSupabase().functions.invoke('razorpay-checkout',{body})
  if(error)throw new Error(await edgeErrorMessage(error,'Payment service request failed.'))
  const payload=(data??{}) as {error?:string;paid?:boolean;orderId?:string;checkout?:CheckoutResponse}
  if(payload.error)throw new Error(payload.error)
  return payload
}

export async function launchRazorpayCheckout(orderId:string):Promise<'paid'|'dismissed'>{
  const created=await invokeCheckout({action:'create',orderId})
  if(created.paid)return'paid'
  if(!created.checkout)throw new Error('Payment checkout could not be prepared.')

  await loadRazorpayScript()
  const Razorpay=window.Razorpay
  if(!Razorpay)throw new Error('Secure payment checkout is unavailable.')

  const checkout=created.checkout
  return await new Promise<'paid'|'dismissed'>((resolve,reject)=>{
    let settled=false
    const finish=(value:'paid'|'dismissed')=>{if(!settled){settled=true;resolve(value)}}
    const fail=(error:unknown)=>{if(!settled){settled=true;reject(error)}}

    const instance=new Razorpay({
      key:checkout.keyId,
      amount:checkout.amount,
      currency:checkout.currency,
      name:checkout.name,
      description:checkout.description,
      image:'/brand/statistics-lover-logo-clean.jpg?v=20261004-5',
      order_id:checkout.razorpayOrderId,
      prefill:checkout.prefill,
      theme:{color:'#071f46'},
      retry:{enabled:true},
      modal:{
        confirm_close:true,
        ondismiss:()=>finish('dismissed'),
      },
      handler:async(response)=>{
        try{
          const verified=await invokeCheckout({
            action:'verify',
            orderId:checkout.orderId,
            paymentId:response.razorpay_payment_id,
            razorpayOrderId:response.razorpay_order_id,
            signature:response.razorpay_signature,
          })
          if(!verified.paid)throw new Error('Payment was not verified.')
          finish('paid')
        }catch(error){fail(error)}
      },
    })
    instance.open()
  })
}
