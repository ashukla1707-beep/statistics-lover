import { requireSupabase } from '../../services/supabase/client'
import type { CommerceOrderStatus,CommercePaymentProvider } from '../commerce/commerceService'

export type CommerceOfferStatus='active'|'inactive'
export type CommerceDiscountType='percent'|'fixed'

export interface ManagedOffer{id:string;batchId:string;currency:string;listPriceMinor:number;salePriceMinor:number|null;accessDays:number|null;status:CommerceOfferStatus}
export interface ManagedCoupon{id:string;code:string;description:string|null;discountType:CommerceDiscountType;discountValue:number;maxDiscountMinor:number|null;minOrderMinor:number;startsAt:string|null;endsAt:string|null;maxRedemptions:number|null;perUserLimit:number;isActive:boolean}
export interface ManagedOrder{
  id:string;orderNumber:string;studentId:string;studentName:string|null;studentEmail:string|null;courseTitle:string;batchTitle:string
  currency:string;subtotalMinor:number;discountMinor:number;totalMinor:number;couponCode:string|null;status:CommerceOrderStatus
  provider:CommercePaymentProvider;paymentReference:string|null;createdAt:string;paidAt:string|null;receiptNumber:string|null
}
type OfferRow={id:string;batch_id:string;currency:string;list_price_minor:number;sale_price_minor:number|null;access_days:number|null;status:CommerceOfferStatus}
type CouponRow={id:string;code:string;description:string|null;discount_type:CommerceDiscountType;discount_value:number;max_discount_minor:number|null;min_order_minor:number;starts_at:string|null;ends_at:string|null;max_redemptions:number|null;per_user_limit:number;is_active:boolean}
type OrderRow={
  id:string;order_number:string;student_id:string;currency:string;subtotal_minor:number;discount_minor:number;total_minor:number;coupon_code:string|null
  status:CommerceOrderStatus;provider:CommercePaymentProvider;provider_payment_reference:string|null;created_at:string;paid_at:string|null
  student:{full_name:string|null;email:string|null}|null
  batch:{title:string;course:{title:string}|null}|null
  receipt:Array<{receipt_number:string}>|null
}

export async function listManagedOffers():Promise<ManagedOffer[]>{
  const {data,error}=await requireSupabase().from('batch_offers').select('id,batch_id,currency,list_price_minor,sale_price_minor,access_days,status').order('created_at',{ascending:false})
  if(error)throw error
  return ((data??[]) as OfferRow[]).map(r=>({id:r.id,batchId:r.batch_id,currency:r.currency,listPriceMinor:r.list_price_minor,salePriceMinor:r.sale_price_minor,accessDays:r.access_days,status:r.status}))
}
export async function saveManagedOffer(input:{id:string|null;batchId:string;currency:string;listPriceMinor:number;salePriceMinor:number|null;accessDays:number|null;status:CommerceOfferStatus}){
  const row={batch_id:input.batchId,currency:input.currency.trim().toUpperCase(),list_price_minor:input.listPriceMinor,sale_price_minor:input.salePriceMinor,access_days:input.accessDays,status:input.status}
  const client=requireSupabase()
  if(input.id){const {error}=await client.from('batch_offers').update(row).eq('id',input.id);if(error)throw error;return input.id}
  const {data,error}=await client.from('batch_offers').insert(row).select('id').single();if(error)throw error;return (data as {id:string}).id
}
export async function listManagedCoupons():Promise<ManagedCoupon[]>{
  const {data,error}=await requireSupabase().from('commerce_coupons').select('id,code,description,discount_type,discount_value,max_discount_minor,min_order_minor,starts_at,ends_at,max_redemptions,per_user_limit,is_active').order('created_at',{ascending:false})
  if(error)throw error
  return ((data??[]) as CouponRow[]).map(r=>({id:r.id,code:r.code,description:r.description,discountType:r.discount_type,discountValue:r.discount_value,maxDiscountMinor:r.max_discount_minor,minOrderMinor:r.min_order_minor,startsAt:r.starts_at,endsAt:r.ends_at,maxRedemptions:r.max_redemptions,perUserLimit:r.per_user_limit,isActive:r.is_active}))
}
export async function saveManagedCoupon(input:{id:string|null;code:string;description:string;discountType:CommerceDiscountType;discountValue:number;maxDiscountMinor:number|null;minOrderMinor:number;startsAt:string|null;endsAt:string|null;maxRedemptions:number|null;perUserLimit:number;isActive:boolean}){
  const row={code:input.code.trim().toUpperCase(),description:input.description.trim()||null,discount_type:input.discountType,discount_value:input.discountValue,max_discount_minor:input.maxDiscountMinor,min_order_minor:input.minOrderMinor,starts_at:input.startsAt,ends_at:input.endsAt,max_redemptions:input.maxRedemptions,per_user_limit:input.perUserLimit,is_active:input.isActive}
  const client=requireSupabase()
  if(input.id){const {error}=await client.from('commerce_coupons').update(row).eq('id',input.id);if(error)throw error;return input.id}
  const {data,error}=await client.from('commerce_coupons').insert(row).select('id').single();if(error)throw error;return (data as {id:string}).id
}
export async function deleteManagedCoupon(id:string){const {error}=await requireSupabase().from('commerce_coupons').delete().eq('id',id);if(error)throw error}
export async function listManagedOrders():Promise<ManagedOrder[]>{
  const {data,error}=await requireSupabase().from('commerce_orders').select(`
    id,order_number,student_id,currency,subtotal_minor,discount_minor,total_minor,coupon_code,status,provider,provider_payment_reference,created_at,paid_at,
    student:profiles!commerce_orders_student_id_fkey(full_name,email),
    batch:batches!commerce_orders_batch_id_fkey(title,course:courses!batches_course_id_fkey(title)),
    receipt:commerce_receipts!commerce_receipts_order_id_fkey(receipt_number)
  `).order('created_at',{ascending:false}).limit(200)
  if(error)throw error
  return ((data??[]) as unknown as OrderRow[]).map(r=>({id:r.id,orderNumber:r.order_number,studentId:r.student_id,studentName:r.student?.full_name??null,studentEmail:r.student?.email??null,courseTitle:r.batch?.course?.title??'Course',batchTitle:r.batch?.title??'Batch',currency:r.currency,subtotalMinor:r.subtotal_minor,discountMinor:r.discount_minor,totalMinor:r.total_minor,couponCode:r.coupon_code,status:r.status,provider:r.provider,paymentReference:r.provider_payment_reference,createdAt:r.created_at,paidAt:r.paid_at,receiptNumber:r.receipt?.[0]?.receipt_number??null}))
}
export async function markManagedOrderPaid(orderId:string,paymentReference:string){
  const {data,error}=await requireSupabase().rpc('mark_commerce_order_paid',{target_order:orderId,payment_reference:paymentReference.trim()||null})
  if(error)throw error
  return data as string
}
