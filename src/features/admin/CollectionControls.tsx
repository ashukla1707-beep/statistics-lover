import { useEffect,useMemo,useState,type ReactNode } from 'react'

export function useCollectionPagination<T>(items:T[],initialPageSize=20,resetKey?:unknown){
  const [page,setPage]=useState(1)
  const [pageSize,setPageSize]=useState(initialPageSize)
  const totalPages=Math.max(1,Math.ceil(items.length/pageSize))
  const safePage=Math.min(page,totalPages)

  useEffect(()=>{setPage(1)},[resetKey])
  useEffect(()=>{if(page!==safePage)setPage(safePage)},[page,safePage])

  const pageItems=useMemo(()=>{
    const start=(safePage-1)*pageSize
    return items.slice(start,start+pageSize)
  },[items,pageSize,safePage])

  return{page:safePage,setPage,pageSize,setPageSize,totalPages,pageItems}
}

export function CollectionToolbar({query,onQueryChange,placeholder='Search',shown,total,children}:{query:string;onQueryChange:(value:string)=>void;placeholder?:string;shown:number;total:number;children?:ReactNode}){
  return <div className="collection-toolbar"><label className="collection-search"><span className="sr-only">Search</span><input type="search" placeholder={placeholder} value={query} onChange={(event)=>onQueryChange(event.target.value)}/></label>{children}<span className="collection-count">{shown===total?`${total} items`:`${shown} of ${total}`}</span></div>
}

export function CollectionPager({page,totalPages,pageSize,totalItems,onPageChange,onPageSizeChange}:{page:number;totalPages:number;pageSize:number;totalItems:number;onPageChange:(page:number)=>void;onPageSizeChange:(size:number)=>void}){
  if(totalItems===0)return null
  return <div className="collection-pager"><button type="button" className="admin-text-button" disabled={page<=1} onClick={()=>onPageChange(page-1)}>← Previous</button><span>Page {page} of {totalPages}</span><label><span>Rows</span><select value={pageSize} onChange={(event)=>onPageSizeChange(Number(event.target.value))}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label><button type="button" className="admin-text-button" disabled={page>=totalPages} onClick={()=>onPageChange(page+1)}>Next →</button></div>
}
