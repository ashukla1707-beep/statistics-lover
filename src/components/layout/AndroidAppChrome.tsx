import { Link,useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth'
import { siteConfig } from '../../config/site'

type NavItem={label:string;to:string;icon:'dashboard'|'courses'|'notifications'|'orders'|'workspace'}

function Icon({name}:{name:NavItem['icon']}){
  if(name==='dashboard')return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z"/></svg>
  if(name==='courses')return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V5a1 1 0 0 1 1-1Zm2 2v9.2c.31-.13.65-.2 1-.2h9V7a1 1 0 0 0-1-1H7Z"/></svg>
  if(name==='notifications')return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22a2.5 2.5 0 0 0 2.35-1.65h-4.7A2.5 2.5 0 0 0 12 22Zm7-5v-5a7 7 0 0 0-5-6.71V4a2 2 0 1 0-4 0v1.29A7 7 0 0 0 5 12v5l-2 2h18l-2-2Z"/></svg>
  if(name==='orders')return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2Zm3 5v2h6V7H9Zm0 4v2h6v-2H9Z"/></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h8v6H3V5Zm10 0h8v6h-8V5ZM3 13h8v6H3v-6Zm10 0h8v6h-8v-6Z"/></svg>
}

function titleForPath(pathname:string){
  if(pathname.startsWith('/learn/'))return 'Learning'
  if(pathname.startsWith('/teacher'))return 'Teacher'
  if(pathname.startsWith('/admin'))return 'Admin'
  if(pathname.startsWith('/notifications'))return 'Notifications'
  if(pathname.startsWith('/orders'))return 'Orders'
  if(pathname.startsWith('/store'))return 'Courses'
  if(pathname.startsWith('/login'))return 'Sign in'
  if(pathname.startsWith('/register'))return 'Create account'
  return 'Dashboard'
}

export function AndroidAppHeader(){
  const location=useLocation()
  return <header className="android-app-header">
    <div className="android-app-header-brand">
      <img src={siteConfig.logoPath} alt="" />
      <div><strong>Statistics Lover</strong><span>{titleForPath(location.pathname)}</span></div>
    </div>
  </header>
}

export function AndroidBottomNav(){
  const {status,hasAnyRole}=useAuth()
  const location=useLocation()
  if(status!=='authenticated')return null

  const items:NavItem[]=[
    {label:'Dashboard',to:'/dashboard',icon:'dashboard'},
    {label:'Courses',to:'/store',icon:'courses'},
    {label:'Alerts',to:'/notifications',icon:'notifications'},
    {label:'Orders',to:'/orders',icon:'orders'},
  ]

  if(hasAnyRole(['content_manager','admin','owner'])){
    items.push({label:'Admin',to:'/admin/overview',icon:'workspace'})
  }else if(hasAnyRole(['teacher'])){
    items.push({label:'Teacher',to:'/teacher',icon:'workspace'})
  }

  const active=(item:NavItem)=>{
    if(item.to==='/dashboard')return location.pathname==='/dashboard'
    if(item.to==='/store')return location.pathname==='/store'
    if(item.to==='/notifications')return location.pathname.startsWith('/notifications')
    if(item.to==='/orders')return location.pathname.startsWith('/orders')
    if(item.to==='/teacher')return location.pathname.startsWith('/teacher')
    if(item.to==='/admin/overview')return location.pathname.startsWith('/admin')
    return false
  }

  return <nav className="android-bottom-nav" aria-label="App navigation">
    {items.map((item)=><Link key={item.to} to={item.to} className={active(item)?'is-active':undefined}>
      <Icon name={item.icon}/>
      <span>{item.label}</span>
    </Link>)}
  </nav>
}
