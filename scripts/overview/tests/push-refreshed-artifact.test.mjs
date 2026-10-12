import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {resolve,dirname,relative} from 'node:path';
import {pushRefreshedArtifact,git,ARTIFACT_PATHS} from '../push-refreshed-artifact.mjs';
const top=resolve(import.meta.dirname,'../../..');
async function fixture(){
 await mkdir(resolve(top,'tmp'),{recursive:true});const root=await mkdtemp(resolve(top,'tmp/push-retry-test-'));
 const remote=resolve(root,'remote.git'),seed=resolve(root,'seed'),worker=resolve(root,'worker'),other=resolve(root,'other');
 const run=(cwd,args)=>{const r=git(args,cwd);assert.equal(r.status,0,r.stderr||r.error?.message);return r.stdout.trim();};
 await mkdir(seed);run(root,['init','--bare','--initial-branch=main',remote]);run(seed,['init','--initial-branch=main']);
 for(const cwd of [seed]){run(cwd,['config','user.name','Fixture']);run(cwd,['config','user.email','fixture@example.invalid']);}
 for(const path of ARTIFACT_PATHS){await mkdir(dirname(resolve(seed,path)),{recursive:true});await writeFile(resolve(seed,path),'original\n');}
 run(seed,['add','.']);run(seed,['commit','-m','fixture seed']);run(seed,['remote','add','origin',remote]);run(seed,['push','origin','main']);
 for(const path of [worker,other]){run(root,['clone',remote,path]);run(path,['config','user.name','Fixture']);run(path,['config','user.email','fixture@example.invalid']);}
 await writeFile(resolve(worker,ARTIFACT_PATHS[0]),'validated refresh\n');run(worker,['add',ARTIFACT_PATHS[0]]);run(worker,['commit','-m','validated artifact']);
 return {root,remote,worker,other,run,cleanup:async()=>{const target=relative(resolve(top,'tmp'),root);if(target.startsWith('..'))throw Error('Unsafe cleanup');await rm(root,{recursive:true,force:true});}};
}
test('server commit_refs rejection is retried and exact remote ref is verified',async()=>{
 const f=await fixture();try{let pushes=0;const delays=[];const result=await pushRefreshedArtifact({cwd:f.worker,wait:async n=>delays.push(n),log:()=>{},runGit:args=>args[0]==='push'&&++pushes===1?{status:1,stdout:'',stderr:'remote: fatal error in commit_refs\n! [remote rejected] HEAD -> main (failure)'}:git(args,f.worker)});assert.equal(pushes,2);assert.deepEqual(delays,[1000]);assert.equal(result.sha,f.run(f.remote,['rev-parse','main']));}finally{await f.cleanup()}
});
test('ambiguous push error that already updated main does not create a duplicate retry',async()=>{
 const f=await fixture();try{let pushes=0;const result=await pushRefreshedArtifact({cwd:f.worker,wait:async()=>{},log:()=>{},runGit:args=>{const r=git(args,f.worker);if(args[0]==='push'){pushes++;return {...r,status:1,stderr:'remote: fatal error in commit_refs'};}return r;}});assert.equal(pushes,1);assert.equal(result.verified,true);}finally{await f.cleanup()}
});
test('unrelated concurrent main changes are retained without force-push or artifact modification',async()=>{
 const f=await fixture();try{await writeFile(resolve(f.other,'README.txt'),'concurrent change\n');f.run(f.other,['add','README.txt']);f.run(f.other,['commit','-m','other update']);f.run(f.other,['push','origin','main']);const commands=[];const result=await pushRefreshedArtifact({cwd:f.worker,wait:async()=>{},log:()=>{},runGit:args=>{commands.push(args);return git(args,f.worker);}});assert.equal(result.attempts,2);assert.equal(f.run(f.remote,['show','main:README.txt']),'concurrent change');assert.equal(f.run(f.remote,['show',`main:${ARTIFACT_PATHS[0]}`]),'validated refresh');assert.ok(commands.every(a=>!a.includes('--force')&&!a.includes('--force-with-lease')));}finally{await f.cleanup()}
});
test('competing artifact changes require regeneration and never overwrite main',async()=>{
 const f=await fixture();try{await writeFile(resolve(f.other,ARTIFACT_PATHS[0]),'newer official data\n');f.run(f.other,['add',ARTIFACT_PATHS[0]]);f.run(f.other,['commit','-m','newer artifact']);f.run(f.other,['push','origin','main']);await assert.rejects(pushRefreshedArtifact({cwd:f.worker,wait:async()=>{},log:()=>{}}),/regenerate and revalidate/);assert.equal(f.run(f.remote,['show',`main:${ARTIFACT_PATHS[0]}`]),'newer official data');}finally{await f.cleanup()}
});
test('repository permission failures stop after one attempt',async()=>{
 const f=await fixture();try{let pushes=0;await assert.rejects(pushRefreshedArtifact({cwd:f.worker,wait:async()=>{},log:()=>{},runGit:args=>args[0]==='push'?(pushes++,{status:1,stdout:'',stderr:'remote: Permission denied HTTP 403'}):git(args,f.worker)}),/authentication or repository policy/);assert.equal(pushes,1);}finally{await f.cleanup()}
});
test('persistent server failure stops at the retry bound',async()=>{
 const f=await fixture();try{let pushes=0;await assert.rejects(pushRefreshedArtifact({cwd:f.worker,attempts:3,wait:async()=>{},log:()=>{},runGit:args=>args[0]==='push'?(pushes++,{status:1,stdout:'',stderr:'fatal error in commit_refs'}):git(args,f.worker)}),/three|3 bounded attempts/);assert.equal(pushes,3);}finally{await f.cleanup()}
});
test('unrelated commits and dirty checkouts cannot be published by the helper',async()=>{
 const f=await fixture();try{await writeFile(resolve(f.worker,'README.txt'),'unvalidated\n');await assert.rejects(pushRefreshedArtifact({cwd:f.worker,log:()=>{}}),/clean checkout/);f.run(f.worker,['add','README.txt']);f.run(f.worker,['commit','-m','unrelated']);await assert.rejects(pushRefreshedArtifact({cwd:f.worker,log:()=>{}}),/limited to validated/);}finally{await f.cleanup()}
});
