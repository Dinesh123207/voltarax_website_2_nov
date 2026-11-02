const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const MAX_BYTES = 8 * 1024 * 1024, MAX_POINTS = 250000;
const keyOf = text => text.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
function stateProperties(value = 'ST_NM,state') {
  const keys = value.split(',').map(key => key.trim());
  if (!keys.length || keys.length > 8 || keys.some(key => !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key) || ['constructor', 'prototype'].includes(key))) throw Error('Invalid map property configuration');
  return keys;
}
function inspectFeature(feature, properties, stats) {
  if (feature?.type !== 'Feature' || !feature.properties || Array.isArray(feature.properties)) throw Error('Expected a GeoJSON Feature with properties');
  Object.keys(feature.properties).forEach(key => stats.propertyNames.add(key));
  const names = properties.filter(key => Object.hasOwn(feature.properties, key)).map(key => feature.properties[key]);
  if (!names.length || names.some(name => typeof name !== 'string' || !name.trim() || name.length > 120) || new Set(names.map(keyOf)).size !== 1) throw Error('Missing or conflicting configured state properties');
  const name = names[0].trim(), key = keyOf(name);
  if (stats.states.has(key)) throw Error('Duplicate state name');
  stats.states.add(key);
  const geometry = feature.geometry;
  if (!geometry || !['Polygon', 'MultiPolygon'].includes(geometry.type)) throw Error('Only Polygon and MultiPolygon boundaries are supported');
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  if (!Array.isArray(polygons) || !polygons.length) throw Error('Empty polygon');
  for (const polygon of polygons) {
    if (!Array.isArray(polygon) || !polygon.length) throw Error('Empty polygon rings');
    for (const ring of polygon) {
      if (!Array.isArray(ring) || ring.length < 4) throw Error('Invalid polygon ring');
      for (const point of ring) {
        if (!Array.isArray(point) || point.length !== 2 || point.some(n => typeof n !== 'number' || !Number.isFinite(n)) || Math.abs(point[0]) > 180 || Math.abs(point[1]) > 90) throw Error('Expected finite longitude/latitude pairs');
        if (++stats.points > stats.maxPoints) throw Error('Boundary coordinate budget exceeded');
        stats.bounds[0] = Math.min(stats.bounds[0], point[0]); stats.bounds[1] = Math.min(stats.bounds[1], point[1]);
        stats.bounds[2] = Math.max(stats.bounds[2], point[0]); stats.bounds[3] = Math.max(stats.bounds[3], point[1]);
      }
      if (ring[0][0] !== ring.at(-1)[0] || ring[0][1] !== ring.at(-1)[1]) throw Error('Polygon ring must be closed');
    }
  }
  return { name, key };
}
const newStats = (maxPoints = MAX_POINTS) => ({ propertyNames: new Set(), states: new Set(), points: 0, bounds: [Infinity, Infinity, -Infinity, -Infinity], maxPoints });
function validateCollection(data, properties = stateProperties()) {
  if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features) || !data.features.length || data.features.length > 100 || data.crs) throw Error('Expected a nonempty WGS84 GeoJSON FeatureCollection without a custom CRS');
  const stats = newStats();
  const states = data.features.map(feature => inspectFeature(feature, properties, stats));
  return { states, points: stats.points, propertyNames: [...stats.propertyNames].sort(), bounds: stats.bounds };
}
function createBoundaryReader({ env = process.env, file = path.join(__dirname, '../data/india-states.geojson') } = {}) {
  return async () => {
    if (env.MAP_BOUNDARIES_REVIEWED !== 'true') return { available: false, reason: 'Boundary publication review is incomplete.', dataQuality: 'Unavailable' };
    try {
      const stat = await fs.stat(file);
      if (!stat.isFile() || stat.size > MAX_BYTES) throw Error('Boundary file exceeds the 8 MiB web budget');
      const bytes = await fs.readFile(file);
      if (bytes.length > MAX_BYTES) throw Error('Boundary file exceeds the 8 MiB web budget');
      if (bytes.subarray(0, 150).toString().includes('git-lfs.github.com/spec/')) throw Error('Boundary file is a Git LFS pointer');
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      if (!/^[a-f0-9]{64}$/.test(env.MAP_BOUNDARY_SHA256 || '') || sha256 !== env.MAP_BOUNDARY_SHA256) throw Error('Boundary fingerprint does not match reviewed configuration');
      const properties = stateProperties(env.MAP_STATE_PROPERTIES);
      const collection = JSON.parse(bytes.toString('utf8')), info = validateCollection(collection, properties);
      // Only names and geometry reach the client; arbitrary source properties are omitted.
      const geojson = { type: 'FeatureCollection', features: collection.features.map((feature, i) => ({ type: 'Feature', properties: info.states[i], geometry: feature.geometry })) };
      const attribution = env.MAP_BOUNDARY_ATTRIBUTION?.trim();
      if (!attribution || attribution.length > 1000) throw Error('Reviewed source attribution is required');
      return { available: true, dataQuality: 'Calculated', sha256, states: info.states, geojson, attribution };
    } catch {
      return { available: false, reason: 'Map data missing or invalid. Install and verify reviewed boundaries.', dataQuality: 'Unavailable' };
    }
  };
}
module.exports = { MAX_BYTES, MAX_POINTS, keyOf, stateProperties, inspectFeature, newStats, validateCollection, createBoundaryReader };
