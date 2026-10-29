const fs=require('fs');
for(const p of ['lib/server/household.ts','lib/server/mutations.ts']){
 let t=fs.readFileSync(p,'utf8');
 t=t.replace(/await db\.transaction\(\(tx\) => \{([\s\S]*?)\n  \}\);/g,(m,body)=>{let b=body.replace(/\btx\./g,'db.').replace(/\.run\(\);/g,';').replace(/\.get\(\)/g,''); return b;});
 t=t.replace(/const currentMembers = db\.select\(([^;]+)\);/g,'const currentMembers = await db.select($1;');
 t=t.replace(/const currentInvite = db\.select\(([^;]+)\);/g,'const currentInvite = (await db.select($1))[0];');
 t=t.replace(/if \(\(currentMembers\?\.value \?\? 0\) >=/g,'if (((currentMembers[0]?.value ?? 0)) >=');
 fs.writeFileSync(p,t);
}
