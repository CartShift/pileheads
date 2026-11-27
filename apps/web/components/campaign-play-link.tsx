"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {campaignFromSearch,campaignPlayHref} from "../lib/growth-api";
export default function CampaignPlayLink({href,className,children,current}:{href:string;className?:string;children:React.ReactNode;current?:boolean}){
  const [target,setTarget]=useState(href);
  useEffect(()=>setTarget(campaignPlayHref(href,campaignFromSearch(window.location.search))),[href]);
  return <Link href={target} className={className} aria-current={current?"page":undefined} prefetch={false}>{children}</Link>;
}
