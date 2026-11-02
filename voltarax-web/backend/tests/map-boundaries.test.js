const test = require('node:test'), assert = require('node:assert/strict');
const {mkdtemp, writeFile} = require('node:fs/promises'), os = require('node:os'), path = require('node:path'), {createHash} = require('node:crypto');
const {validateCollection, createBoundaryReader} = require('../services/mapBoundaries');
const {execFileSync}=require('node:child_process');
// Arbitrary square is a schema fixture only; it is never shipped as an India boundary.
const feature = name => ({type:'Feature', properties:{ST_NM:name, private:'must be omitted'}, geometry:{type:'Polygon',coordinates:[[[1,1],[2,1],[2,2],[1,1]]]}});
test('boundary validation rejects missing/conflicting states, invalid coordinates, duplicates and CRS', () => {
  const valid = {type:'FeatureCollection',features:[feature('Synthetic A')]};
  assert.equal(validateCollection(valid).points,4);
  for (const invalid of [ {...valid,crs:{}}, {...valid,features:[feature('A'),feature('A')]}, {...valid,features:[{...feature('A'),properties:{id:1}}]}, {...valid,features:[{...feature('A'),properties:{ST_NM:'A',state:'B'}}]} ]) assert.throws(()=>validateCollection(invalid));
  valid.features[0].geometry.coordinates[0][0][0] = 181; assert.throws(()=>validateCollection(valid));
});
test('boundary reader is review/hash/budget guarded and exposes only state names and geometry', async () => {
  const directory=await mkdtemp(path.join(os.tmpdir(),'voltarax-map-')), file=path.join(directory,'synthetic.geojson');
  const bytes=JSON.stringify({type:'FeatureCollection',features:[feature('Synthetic A')]}); await writeFile(file,bytes);
  assert.equal((await createBoundaryReader({file,env:{}})()).available,false);
  const env={MAP_BOUNDARIES_REVIEWED:'true',MAP_BOUNDARY_SHA256:createHash('sha256').update(bytes).digest('hex'),MAP_BOUNDARY_ATTRIBUTION:'Synthetic schema test only'};
  const result=await createBoundaryReader({file,env})(); assert.equal(result.available,true); assert.deepEqual(result.geojson.features[0].properties,{name:'Synthetic A',key:'synthetic a'});
  assert.equal((await createBoundaryReader({file,env:{...env,MAP_BOUNDARY_SHA256:'0'.repeat(64)}})()).available,false);
  await writeFile(file,'version https://git-lfs.github.com/spec/v1'); assert.equal((await createBoundaryReader({file,env})()).available,false);
});
test('offline verifier rejects LFS pointers and wrong collection type with clear failures', async()=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'voltarax-map-cli-')), file=path.join(directory,'synthetic.geojson');
  await writeFile(file,'version https://git-lfs.github.com/spec/v1\noid sha256:synthetic\nsize 12\n');
  const run=()=>execFileSync(process.execPath,[path.join(__dirname,'../scripts/verify-geojson.mjs'),file],{encoding:'utf8',timeout:10000,stdio:'pipe'});
  assert.throws(run,error=>error.status===1 && error.stderr.includes('Git LFS pointer'));
  await writeFile(file,JSON.stringify({type:'Invalid',features:[feature('Synthetic')]}));
  assert.throws(run,error=>error.status===1 && error.stderr.includes('FeatureCollection'));
  await writeFile(file,JSON.stringify({type:'FeatureCollection',features:[feature('Synthetic')]}));
  assert.equal(JSON.parse(run()).featureCount,1);
});
