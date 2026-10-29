const fs=require('fs');
for(const p of ['lib/server/household.ts','lib/server/mutations.ts']){let t=fs.readFileSync(p,'utf8');t=t.replace(/(^\s*)(db\.(?:insert|update|delete)\([^;]+;)/gm,'$1await $2');fs.writeFileSync(p,t)}
