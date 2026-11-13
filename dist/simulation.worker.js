importScripts('engine-v5.js','sim-core.js','tilt/engine.js','tilt-sim-core.js','pilehead/engine.js','pilehead-sim-core.js');
onmessage=e=>{
 try{
  const args=e.data||{};
  const suite=['tilt','pilehead'].includes(args.suite)?args.suite:'spark';
  const result=suite==='tilt'?TiltSim.runSimulation(args):suite==='pilehead'?PileheadSim.runSimulation(args):SparkSim.runSimulation(args);
  postMessage({ok:true,suite,result});
 }catch(error){postMessage({ok:false,error:error.message})}
};
