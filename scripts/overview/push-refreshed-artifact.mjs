import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {appendFile} from 'node:fs/promises';
export const ARTIFACT_PATHS=['scripts/overview/overview_source_snapshot.json','scripts/overview/overview_source_snapshot.diff_report.json','apps/policy-ui/public/data/overview.json'];
const transient=/fatal error in commit_refs|remote rejected.*\(failure\)|(?:HTTP|error:)\s*5\d\d|RPC failed|connection.*(?:reset|timed out)|could not resolve host|early EOF/i;
const refusal=/GH00[16]|GH013|protected branch|permission denied|authentication failed|403|401|secret scanning|repository rule/i;
const race=/non-fast-forward|fetch first|\[rejected\]/i;
const sha=/^[a-f0-9]{40,64}$/;
export function git(args,cwd){return spawnSync('git',args,{cwd,encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:1024*1024});}
export async function pushRefreshedArtifact({cwd=process.cwd(),runGit=args=>git(args,cwd),wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),attempts=4,log=console.log}={}){
  if(!Number.isInteger(attempts)||attempts<1||attempts>5)throw Error('Retry bound must be between one and five');
  const required=args=>{const r=runGit(args);if(r.status!==0)throw Error(`Git ${args[0]} failed: ${r.stderr||r.error?.message||'unknown error'}`);return r.stdout.trim()};
  if(required(['status','--porcelain']))throw Error('Artifact publication requires a clean checkout');
  const changed=required(['diff-tree','--no-commit-id','--name-only','-r','HEAD']).split('\n').filter(Boolean);
  if(!changed.length||changed.some(p=>!ARTIFACT_PATHS.includes(p)))throw Error('Latest commit is not limited to validated Overview artifacts');
  let head=required(['rev-parse','HEAD']);if(!sha.test(head))throw Error('Invalid local commit identity');
  const expected=Object.fromEntries(changed.map(p=>[p,required(['rev-parse',`HEAD:${p}`])]));
  const remoteHead=()=>{const r=runGit(['ls-remote','--exit-code','origin','refs/heads/main']);if(r.status!==0)return null;const id=r.stdout.trim().split(/\s+/)[0];return sha.test(id)?id:null;};
  for(let attempt=1;attempt<=attempts;attempt++){
    const result=runGit(['push','origin','HEAD:refs/heads/main']);
    const remote=remoteHead();
    if(remote===head){log(`Verified Overview artifact commit on main after attempt ${attempt}.`);return {sha:head,attempts:attempt,verified:true};}
    const error=String(result.stderr??'')+' '+String(result.stdout??'');
    if(result.status===0&&remote===null)throw Error('Push returned success but remote commit identity remains unverified');
    if(refusal.test(error))throw Error('Artifact push refused by authentication or repository policy; retry stopped');
    if(result.status!==0&&!transient.test(error)&&!race.test(error))throw Error('Artifact push failed for an unsupported reason; retry stopped');
    if(remote&&remote!==head){
      required(['fetch','--no-tags','origin','main']);
      const ancestor=runGit(['merge-base','--is-ancestor',head,'origin/main']);
      if(ancestor.status===0){log('Overview commit is already included in main; no duplicate push needed.');return {sha:head,attempts:attempt,verified:true};}
      const parent=required(['rev-parse','HEAD^']);
      if(runGit(['merge-base','--is-ancestor',parent,'origin/main']).status!==0)throw Error('Main history diverged from the validated base; retry stopped');
      const moved=required(['diff','--name-only',`${parent}..origin/main`]).split('\n');
      if(moved.some(p=>ARTIFACT_PATHS.includes(p)))throw Error('Main changed Overview artifacts; regenerate and revalidate before publishing');
      const rebased=runGit(['rebase','origin/main']);
      if(rebased.status!==0){runGit(['rebase','--abort']);throw Error('Main advanced and artifact rebase conflicted; retry stopped');}
      head=required(['rev-parse','HEAD']);
      for(const p of changed)if(required(['rev-parse',`HEAD:${p}`])!==expected[p])throw Error('Validated artifact bytes changed during rebase');
    }
    if(attempt===attempts)throw Error(`Overview artifact push not verified after ${attempts} bounded attempts`);
    log(`Artifact ref update not verified; retry ${attempt+1}/${attempts}.`);
    await wait(Math.min(1000*3**(attempt-1),9000));
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{const result=await pushRefreshedArtifact();if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,`artifact_committed=true\nartifact_sha=${result.sha}\n`);console.log(JSON.stringify(result));}catch(error){console.error(error.message);process.exitCode=1;}}
