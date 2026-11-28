// Only an explicitly selected release build defaults these public flags on.
 // Explicit 0 remains the emergency rollback switch; local and other hosting
 // builds retain their existing environment and default-off behavior.
export function pwaBuildEnv(env,release=false){
  if(!release)return {...env};
  return {...env,
    NEXT_PUBLIC_PILEHEADS_PWA:env.NEXT_PUBLIC_PILEHEADS_PWA??"1",
    NEXT_PUBLIC_PILEHEADS_OFFLINE:env.NEXT_PUBLIC_PILEHEADS_OFFLINE??"1"
  };
}
