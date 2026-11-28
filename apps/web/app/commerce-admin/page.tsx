import type {Metadata} from "next";
import CommerceAdmin from "../../components/commerce-admin";
export const metadata:Metadata={title:"Commerce operations sandbox",robots:{index:false,follow:false}};
export default function Page(){return <CommerceAdmin/>;}
