import { siteOperator } from "../lib/site-operator";

export default function OperatorContact(){
  const {name,street,postalCode,city,country,email}=siteOperator;
  return <address style={{fontStyle:"normal",lineHeight:1.6,marginBottom:"1em"}}>{name}<br/>{street}<br/>{postalCode} {city}<br/>{country}<br/><a href={"mailto:"+email}>{email}</a></address>;
}
