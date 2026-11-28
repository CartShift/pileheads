"use client";
import {useEffect,useRef,useState} from "react";
import {usePathname} from "next/navigation";

type Page={page_title:string;page_location:string};
const Core=require("../lib/ga4-core.cjs") as {
  pageFor:(path:string,search?:string)=>Page|null;
  safeReferrer:(url:string)=>string;
  isProductionHost:(host:string)=>boolean;
  isMeasurementId:(id:string)=>boolean;
  isPrivacyUrl:(url:string)=>boolean;
};
const ID=process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID??"";
const PRIVACY=process.env.NEXT_PUBLIC_GA4_PRIVACY_URL??"";
const ENABLED=process.env.NEXT_PUBLIC_GA4_ENABLED==="1"&&Core.isMeasurementId(ID)&&Core.isPrivacyUrl(PRIVACY);
const KEY="pileheads-ga4-consent-v1";
type Choice="granted"|"denied";
type TagWindow=Window&{dataLayer?:unknown[];gtag?:(...args:unknown[])=>void;[key:`ga-disable-${string}`]:boolean|undefined};
const tag=()=>window as unknown as TagWindow;
const denyAds={ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied"} as const;
let initialized=false;
function disable(){tag()[`ga-disable-${ID}`]=true;}
function enable(page:Page,referrer:string){
  const w=tag();
  w[`ga-disable-${ID}`]=false;
  if(!initialized){
    w.dataLayer=w.dataLayer||[];
    w.gtag=function(){w.dataLayer!.push(arguments);};
    w.gtag("consent","default",{analytics_storage:"denied",...denyAds});
    w.gtag("consent","update",{analytics_storage:"granted",...denyAds});
    w.gtag("js",new Date());
    w.gtag("config",ID,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,page_location:page.page_location,page_title:page.page_title,page_referrer:referrer});
    const script=document.createElement("script");
    script.async=true;
    script.referrerPolicy="no-referrer";
    script.src="https://www.googletagmanager.com/gtag/js?id="+encodeURIComponent(ID);
    document.head.appendChild(script);
    initialized=true;
  }else{
    w.gtag?.("consent","update",{analytics_storage:"granted",...denyAds});
  }
}
function clearAnalyticsCookies(){
  for(const entry of document.cookie.split(";")){
    const name=entry.trim().split("=")[0];
    if(!/^_ga(?:_[A-Z0-9]+)?$/i.test(name))continue;
    for(const domain of ["","; Domain="+location.hostname,"; Domain=pileheads.com"]){
      document.cookie=name+"=; Max-Age=0; Path=/; SameSite=Lax"+domain;
    }
  }
}

export default function GoogleAnalytics(){
  const path=usePathname()??"";
  const [ready,setReady]=useState(false);
  const [choice,setChoice]=useState<Choice|null>(null);
  const [settings,setSettings]=useState(false);
  const previous=useRef("");
  const last=useRef("");
  const publicPage=Core.pageFor(path)!==null;
  useEffect(()=>{
    if(!ENABLED||!Core.isProductionHost(location.hostname))return;
    disable();
    try{const stored=localStorage.getItem(KEY);if(stored==="granted"||stored==="denied")setChoice(stored);}catch{}
    setReady(true);
    function sync(e:StorageEvent){
      if(e.key!==KEY&&e.key!==null)return;
      const next=e.newValue==="granted"?"granted":e.newValue==="denied"?"denied":null;
      if(next!=="granted"){disable();tag().gtag?.("consent","update",{analytics_storage:"denied",...denyAds});clearAnalyticsCookies();}
      setChoice(next);
    }
    window.addEventListener("storage",sync);
    return()=>{window.removeEventListener("storage",sync);disable();};
  },[]);
  useEffect(()=>{
    if(!ready)return;
    const page=Core.pageFor(path,location.search);
    if(choice!=="granted"||!page){disable();last.current="";previous.current="";return;}
    if(last.current===page.page_location){tag()[`ga-disable-${ID}`]=false;return;}
    const referrer=previous.current||Core.safeReferrer(document.referrer);
    enable(page,referrer);
    tag().gtag?.("set",{...page,page_referrer:referrer});
    tag().gtag?.("event","page_view",{...page,page_referrer:referrer,send_to:ID});
    previous.current=page.page_location.split("?")[0];
    last.current=page.page_location;
    return()=>{disable();};
  },[ready,choice,path]);
  useEffect(()=>{
    if(!ready||choice!=="granted"||!publicPage)return;
    function click(event:MouseEvent){
      const target=event.target;
      const a=target instanceof Element?target.closest("a[href]"):null;
      if(!a)return;
      const u=new URL(a.getAttribute("href")||"",location.href);
      if(u.origin!==location.origin||!["/play","/quick-play"].includes(u.pathname.replace(/\/+$/,"")))return;
      if(tag()[`ga-disable-${ID}`])return;
      tag().gtag?.("event","play_cta_click",{send_to:ID});
    }
    document.addEventListener("click",click,true);
    return()=>document.removeEventListener("click",click,true);
  },[ready,choice,publicPage]);
  function choose(next:Choice){
    if(next==="denied"){
      disable();
      tag().gtag?.("consent","update",{analytics_storage:"denied",...denyAds});
      clearAnalyticsCookies();
    }
    try{localStorage.setItem(KEY,next);}catch{}
    setChoice(next);setSettings(false);
  }
  if(!ready)return null;
  return <aside aria-label="Analytics privacy" className="ga4-privacy">
    {publicPage&&(choice===null||settings)?<section className="ga4-panel">
      <strong>Optional website analytics</strong>
      <p>Allow Google Analytics cookies to measure visits and which pages lead to play. Google receives usage and device information. Playing does not require consent. Advertising tracking is off.</p>
      <a href={PRIVACY} target="_blank" rel="noreferrer">Privacy notice</a>
      <div className="ga4-actions">
        <button type="button" onClick={()=>choose("denied")}>Reject analytics</button>
        <button type="button" onClick={()=>choose("granted")}>Allow analytics</button>
      </div>
    </section>:<button type="button" className="ga4-settings" onClick={()=>setSettings(v=>!v)} aria-expanded={settings}>Analytics preferences</button>}
    {!publicPage&&settings?<section className="ga4-panel"><p>Analytics is paused on this page.</p><a href={PRIVACY} target="_blank" rel="noreferrer">Privacy notice</a><div className="ga4-actions"><button type="button" onClick={()=>choose("denied")}>Reject analytics</button><button type="button" onClick={()=>setSettings(false)}>Close</button></div></section>:null}
  </aside>;
}
