import type {TableStandings as Score} from "../../../packages/game-protocol";
export default function TableStandings({score,me,nameForSeat}:{score:Score;me:number;nameForSeat:(seat:number)=>string}){
 if(score.completedRounds===0)return null;
 const sorted=[...score.seats].sort((a,b)=>b.points-a.points||b.wins-a.wins||a.seat-b.seat);
 const rank=(index:number)=>{const item=sorted[index];return sorted.findIndex(row=>row.points===item.points&&row.wins===item.wins)+1;};
 const own=sorted.findIndex(row=>row.seat===me);
 return <details className="table-standings" style={{width:"100%",minWidth:0,padding:"8px 10px",border:"1px solid currentColor",borderRadius:8}}>
  <summary style={{cursor:"pointer",minHeight:36,fontWeight:800}}>Table standings · {score.completedRounds} {score.completedRounds===1?"round":"rounds"}{own>=0?" · You: #"+rank(own):""}</summary>
  <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13,textAlign:"left"}} aria-label="Private table standings">
    <thead><tr>{["Rank","Player","Points","Wins","Last"].map(label=><th key={label} scope="col" style={{padding:4}}>{label}</th>)}</tr></thead>
    <tbody>{sorted.map((row,index)=><tr key={row.seat} aria-current={row.seat===me?"true":undefined}>
      <td style={{padding:4}}>{rank(index)}</td><th scope="row" style={{padding:4,overflowWrap:"anywhere"}}>{nameForSeat(row.seat)}{row.seat===me?" (you)":""}</th><td style={{padding:4}}>{row.points}</td><td style={{padding:4}}>{row.wins}</td><td style={{padding:4}}>{row.lastPlace??"—"}</td></tr>)}</tbody>
  </table></div>
  <p style={{fontSize:12,margin:"8px 0 0"}}>First out earns the most points. Last earns zero. Ties share a rank after comparing wins. Scores belong to this private room{score.trackedFrom>1?" (tracked since round "+score.trackedFrom+")":""}.</p>
 </details>
}
