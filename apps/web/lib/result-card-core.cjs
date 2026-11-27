"use strict";
const TITLES={first:["FIRST OUT!","The pile didn't get me."],escaped:["I ESCAPED","THE PILE!"],loss:["I'M THE","PILEHEAD!"]};
function resultCard(input){
 if(!input||input.phase!=="over"||input.drill||typeof input.kind!=="string"||!Object.hasOwn(TITLES,input.kind)||
   !Number.isInteger(input.players)||input.players<2||input.players>5||!Number.isSafeInteger(input.moves)||input.moves<0||input.moves>1000000)return null;
 return {kind:input.kind,headline:TITLES[input.kind],players:input.players,moves:input.moves};
}
module.exports={resultCard};
