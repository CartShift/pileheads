import type {TableStandings as Score} from "../../../packages/game-protocol";
export default function TableStandings({score,me,nameForSeat,final=false}:{score:Score;me:number;nameForSeat:(seat:number)=>string;final?:boolean}){
 if(score.completedRounds===0)return null;
 const sorted=[...score.seats].sort((a,b)=>b.points-a.points||b.wins-a.wins||a.seat-b.seat);
 const rank=(index:number)=>{const item=sorted[index];return sorted.findIndex(row=>row.points===item.points&&row.wins===item.wins)+1;};
 const own=sorted.findIndex(row=>row.seat===me),leaders=sorted.filter((_,i)=>rank(i)===1);
 return <section className="table-standings" aria-label="Private table standings">
  <div className="standings-heading"><div><div className="eyebrow">{final?"TOURNAMENT COMPLETE":"THE BIG PICTURE"}</div><h3>{final?(leaders.length===1?nameForSeat(leaders[0].seat)+" wins!":"Shared victory!"):"Table standings"}</h3></div><span className="standings-rounds">{score.completedRounds} {score.completedRounds===1?"round":"rounds"}</span></div>
  {final&&leaders.length>1&&<p>{leaders.map(x=>nameForSeat(x.seat)).join(", ")}</p>}
  {own>=0&&<p className="standings-personal">You: #{rank(own)} · {sorted[own].points} pts</p>}
  <table aria-label="Cumulative scores"><thead><tr>{["Rank","Player","Pts","Wins"].map(label=><th key={label} scope="col">{label}</th>)}</tr></thead>
  <tbody>{sorted.map((row,index)=><tr key={row.seat} data-self={row.seat===me}>
    <td>{rank(index)}</td><th scope="row">{nameForSeat(row.seat)}{row.seat===me?" (you)":""}</th><td><strong>{row.points}</strong></td><td>{row.wins}</td></tr>)}</tbody></table>
  <p className="standings-note">First out earns the most points. Last earns zero. Wins break ties; otherwise rank is shared.{score.trackedFrom>1?" Tracked since round "+score.trackedFrom+".":""}</p>
 </section>
}
