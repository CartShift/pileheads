importScripts('engine-v5.js','sim-core.js');
onmessage=e=>{try{postMessage({ok:true,result:SparkSim.runSimulation(e.data||{})})}catch(error){postMessage({ok:false,error:error.message})}};
