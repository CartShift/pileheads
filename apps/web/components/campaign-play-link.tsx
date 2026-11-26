"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {campaignFromSearch,campaignPlayHref} from "../lib/growth-api";
export default function CampaignPlayLink({href,className,children}:{href:string;className?:string;children:React.ReactNode}){
  const [target,setTarget]=useState(href);
  useEffect(()=>setTarget(campaignPlayHref(href,campaignFromSearch(window.location.search))),[href]);
  return <Link href={target} className={className} prefetch={false}>{children}</Link>;
}
