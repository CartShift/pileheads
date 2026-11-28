/** Serialize only trusted, static schema; escape '<' to prevent closing the script element. */
export default function SeoJsonLd({data}:{data:object}) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(data).replace(/</g,"\\u003c")}}/>;
}
