import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
function setup(){let now=10000,played=0,stopped=0;const button={addEventListener(){}};const banner={hidden:true,setAttribute(){},querySelector(){return button}};const listeners={};class Audio{state='running';currentTime=0;destination={};createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}}createOscillator(){return {frequency:{},connect(){},disconnect(){},start(){played++},stop(at){if(at===undefined)stopped++}}}}
const ctx=vm.createContext({window:{AudioContext:Audio},document:{createElement(){return banner},body:{appendChild(){}},addEventListener(n,fn){listeners[n]=fn},visibilityState:'visible'},Date:{now:()=>now},Set,setInterval(){},st:{tab:'recipes',timer:{running:true,remaining:0}},timerRemaining:()=>0,save(){},render(){},updateTimerDisplays(){}});
vm.runInContext(source.slice(source.indexOf('// Reuse and unlock audio'),source.indexOf('window.FAMILY_APP=')),ctx);
return {ctx,banner,listeners,run:s=>vm.runInContext(s,ctx),advance:n=>now+=n,played:()=>played,stopped:()=>stopped};}
test('expired timer repeats until acknowledged and stops active tone',()=>{const t=setup();t.run('unlockTimerAudio();checkTimerAlarm()');assert.equal(t.played(),1);assert.equal(t.banner.hidden,false);t.advance(1000);t.run('checkTimerAlarm()');assert.equal(t.played(),1);t.advance(1000);t.run('checkTimerAlarm()');assert.equal(t.played(),2);t.run('dismissTimerAlarm()');assert.equal(t.banner.hidden,true);assert.ok(t.stopped()>0);t.advance(5000);t.run('checkTimerAlarm()');assert.equal(t.played(),2);});
test('returning to visible page processes an expired timer',()=>{const t=setup();t.listeners.visibilitychange();assert.equal(t.ctx.st.timer.alarming,true);assert.equal(t.banner.hidden,false)});
test('restored unacknowledged alarm remains visible; removing timer silences it',()=>{const t=setup();t.ctx.st.timer={alarming:true,running:false};t.run('checkTimerAlarm()');assert.equal(t.banner.hidden,false);t.ctx.st.timer=null;t.run('checkTimerAlarm()');assert.equal(t.banner.hidden,true)});
test('visual acknowledgement works without browser audio support',()=>{const t=setup();t.ctx.window={};t.run('unlockTimerAudio();checkTimerAlarm()');assert.equal(t.banner.hidden,false);t.run('dismissTimerAlarm()');assert.equal(t.banner.hidden,true)});
