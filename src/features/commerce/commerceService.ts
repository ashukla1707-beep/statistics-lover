import { requireSupabase } from '../../services/supabase/client'

export type CommercePaymentProvider='manual'|'razorpay'|'stripe'|'external'
export type CommerceOrderStatus='pending'|'paid'|'cancelled'|'failed'|'refunded'

export interface PublicBatchOffer{
  offerId:string
  batchId:string
  batchTitle:string
  batchCode:string|null
  courseId:string
  courseTitle:string
  courseSlug:string
  currency:string
  listPriceMinor:number
  salePriceMinor:number|null
  accessDays:number|null
}
export interface StudentOrder{
  id:string
  orderNumber:string
  batchId:string
  batchTitle:string
  courseTitle:string
  currency:string
  subtotalMinor:number
  discountMinor:number
  totalMinor:number
  couponCode:string|null
  status:CommerceOrderStatus
  provider:CommercePaymentProvider
  paymentReference:string|null
  expiresAt:string
  paidAt:string|null
  createdAt:string
  receiptNumber:string|null
  receiptIssuedAt:string|null
}
type OfferRow={offer_id:string;batch_id:string;batch_title:string;batch_code:string|null;course_id:string;course_title:string;course_slug:string;currency:string;list_price_minor:number;sale_price_minor:number|null;access_days:number|null}
type OrderRow={
  id:string;order_number:string;batch_id:string;currency:string;subtotal_minor:number;discount_minor:number;total_minor:number;coupon_code:string|null
  status:CommerceOrderStatus;provider:CommercePaymentProvider;provider_payment_reference:string|null;expires_at:string;paid_at:string|null;created_at:string
  batch:{title:string;course:{title:string}|null}|null
  receipt:Array<{receipt_number:string;issued_at:string}>|null
}

export async function loadPublicBatchOffers():Promise<PublicBatchOffer[]>{
  const {data,error}=await requireSupabase().rpc('get_public_batch_offers')
  if(error)throw error
  return ((data??[]) as OfferRow[]).map((r)=>({offerId:r.offer_id,batchId:r.batch_id,batchTitle:r.batch_title,batchCode:r.batch_code,courseId:r.course_id,courseTitle:r.course_title,courseSlug:r.course_slug,currency:r.currency,listPriceMinor:r.list_price_minor,salePriceMinor:r.sale_price_minor,accessDays:r.access_days}))
}
export async function createCommerceOrder(input:{batchId:string;couponCode:string;provider?:CommercePaymentProvider}){
  const {data,error}=await requireSupabase().rpc('create_commerce_order',{target_batch:input.batchId,coupon_code:input.couponCode.trim()||null,payment_provider:input.provider??'manual'})
  if(error)throw error
  return data as string
}
export async function loadMyOrders(userId:string):Promise<StudentOrder[]>{
  const {data,error}=await requireSupabase().from('commerce_orders').select(`
    id,order_number,batch_id,currency,subtotal_minor,discount_minor,total_minor,coupon_code,status,provider,
    provider_payment_reference,expires_at,paid_at,created_at,
    batch:batches!commerce_orders_batch_id_fkey(title,course:courses!batches_course_id_fkey(title)),
    receipt:commerce_receipts!commerce_receipts_order_id_fkey(receipt_number,issued_at)
  `).eq('student_id',userId).order('created_at',{ascending:false})
  if(error)throw error
  return ((data??[]) as unknown as OrderRow[]).map((r)=>({
    id:r.id,orderNumber:r.order_number,batchId:r.batch_id,batchTitle:r.batch?.title??'Batch',
    courseTitle:r.batch?.course?.title??'Course',currency:r.currency,subtotalMinor:r.subtotal_minor,discountMinor:r.discount_minor,totalMinor:r.total_minor,
    couponCode:r.coupon_code,status:r.status,provider:r.provider,paymentReference:r.provider_payment_reference,expiresAt:r.expires_at,
    paidAt:r.paid_at,createdAt:r.created_at,receiptNumber:r.receipt?.[0]?.receipt_number??null,receiptIssuedAt:r.receipt?.[0]?.issued_at??null,
  }))
}
