importScripts('engine-v5.js','sim-core.js','tilt/engine.js','tilt-sim-core.js');
onmessage=e=>{
 try{
  const args=e.data||{};
  const suite=args.suite==='tilt'?'tilt':'spark';
  const result=suite==='tilt'?TiltSim.runSimulation(args):SparkSim.runSimulation(args);
  postMessage({ok:true,suite,result});
 }catch(error){postMessage({ok:false,error:error.message})}
};
