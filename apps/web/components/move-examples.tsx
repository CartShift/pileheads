"use client";
import {useState} from "react";
import art from "../app/official-home.module.css";
import styles from "./move-examples.module.css";

const examples=[
 {id:"dump",name:"DUMP",title:"Make it their problem.",card:15,pile:[4,6,8],description:"Send the existing pile to any active opponent. Watch out: their own DUMP can send it back.",result:"Your opponent received all three cards. DUMP itself is spent. They can counter if they already hold DUMP."},
 {id:"burn",name:"BURN",title:"Burn it all.",card:14,pile:[4,6,8],description:"Clear the pile and immediately play again. A fresh start when you need it most.",result:"The pile and BURN are gone. It is your turn again."},
 {id:"slam",name:"SLAM",title:"Make a SLAM.",card:6,pile:[6,6,6],description:"Complete four matching numbers to burn the pile, even out of turn.",result:"Four sevens! The pile burns and you take the turn."}
] as const;
type Example=typeof examples[number];
function Face({index}:{index:number}){return <span className={art.card+" "+styles.face} style={{backgroundPosition:(index%4*100/3)+"% "+(Math.floor(index/4)*100/3)+"%"}}/>}
function Pile({example,complete=false}:{example:Example;complete?:boolean}){return <span className={styles.pile}>{[...example.pile,...(complete?[example.card]:[])].map((index,i)=><span className={styles.layer} key={i} style={{transform:"translate("+i*7+"px,"+(-i*3)+"px) rotate("+(-8+i*6)+"deg)"}}><Face index={index}/></span>)}</span>}
export default function MoveExamples(){
 const [active,setActive]=useState<Example["id"]>("dump");
 const [played,setPlayed]=useState(false);
 const e=examples.find(x=>x.id===active)!;
 return <div className={styles.demo} data-testid="move-examples">
   <div className={styles.choices} role="group" aria-label="Choose a move example">
    {examples.map(x=><button type="button" className={styles.choice} aria-pressed={x.id===active} key={x.id} onClick={()=>{setActive(x.id);setPlayed(false);}}><span aria-hidden="true" className={styles.choiceArt}><Face index={x.card}/></span><span><strong>{x.name}</strong><small>{x.title}</small></span></button>)}
   </div>
   <div className={styles.panel}>
    <div className={styles.copy}><p className={styles.eyebrow}>TRY A MOVE · INTERACTIVE EXAMPLE</p><h3>{e.title}</h3><p>{e.description}</p><button className={styles.trigger} type="button" onClick={()=>setPlayed(x=>!x)}>{played?"Reset example":e.id==="slam"?"Complete the SLAM":"Play "+e.name}</button><p className={styles.result} role="status">{played?e.result:"See what happens when you play this move."}</p></div>
    <div className={styles.board} aria-hidden="true" data-move={active} data-played={played?"true":"false"}>
      <div className={styles.boardTop}><span>THE TABLE</span><strong>{played?e.id==="dump"?"DUMP!":e.id==="slam"?"SLAM!":"BURN!":"YOUR MOVE"}</strong></div>
      <div className={styles.zones}>
        <div className={styles.zone}><span>THE PILE</span><div className={styles.slot}>{played?<span className={styles.empty}>EMPTY</span>:<Pile example={e}/>}</div></div>
        <div className={styles.zone}><span>{e.id==="dump"?"YOUR OPPONENT":"BURN PILE"}</span><div className={styles.slot}>{played?(e.id==="dump"?<span className={styles.arrival}><Pile example={e}/></span>:<span className={styles.burst}><span>POW!</span><small>{e.id==="slam"?"4 MATCHING CARDS":"PILE CLEARED"}</small></span>):<span className={styles.empty}>—</span>}</div></div>
      </div>
      <div className={styles.hand}><span>{played?"MOVE PLAYED":"YOUR CARD"}</span>{played?<span className={styles.spent}>✓</span>:<Face index={e.card}/>}</div>
    </div>
   </div>
 </div>;
}
