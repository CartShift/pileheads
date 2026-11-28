// Public website contact data is supplied at build time instead of being
// permanently committed to public Git history. These values are not secrets.
const operator = {
  name: process.env.NEXT_PUBLIC_PILEHEADS_OPERATOR_NAME?.trim(),
  address: process.env.NEXT_PUBLIC_PILEHEADS_OPERATOR_ADDRESS?.trim(),
  email: process.env.NEXT_PUBLIC_PILEHEADS_OPERATOR_EMAIL?.trim(),
};
export default function OperatorContact(){
  const {name,address,email}=operator;
  if(!name||!address||!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    return <p role="note"><strong>Draft: verified operator contact details have not been configured for this build.</strong></p>;
  }
  return <address style={{fontStyle:"normal",lineHeight:1.6,marginBottom:"1em"}}>{name}<br/>{address}<br/><a href={"mailto:"+email}>{email}</a></address>;
}
