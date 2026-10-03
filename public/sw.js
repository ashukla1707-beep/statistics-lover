const CACHE_NAME='statistics-lover-static-v6'
const SHELL=['/','/manifest.webmanifest','/brand/statistics-lover-logo.jpg']

self.addEventListener('install',(event)=>{
  event.waitUntil(caches.open(CACHE_NAME).then((cache)=>cache.addAll(SHELL)).then(()=>self.skipWaiting()))
})

self.addEventListener('activate',(event)=>{
  event.waitUntil(
    caches.keys()
      .then((keys)=>Promise.all(keys.filter((key)=>key!==CACHE_NAME).map((key)=>caches.delete(key))))
      .then(()=>self.clients.claim())
  )
})

self.addEventListener('fetch',(event)=>{
  const request=event.request
  if(request.method!=='GET'||request.headers.has('authorization'))return
  const url=new URL(request.url)
  if(url.origin!==self.location.origin||url.pathname==='/sw.js')return

  if(request.mode==='navigate'){
    event.respondWith(
      fetch(request).catch(async()=>{
        const cached=await caches.match('/')
        return cached||Response.error()
      })
    )
    return
  }

  if(['script','style','font','image'].includes(request.destination)){
    event.respondWith(
      caches.match(request).then((cached)=>{
        const network=fetch(request).then((response)=>{
          if(response.ok){
            const copy=response.clone()
            void caches.open(CACHE_NAME).then((cache)=>cache.put(request,copy))
          }
          return response
        }).catch(()=>cached)
        return cached||network
      })
    )
  }
})
