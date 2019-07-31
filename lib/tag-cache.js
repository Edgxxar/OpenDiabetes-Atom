let cache = {};

function hasTagCached(tag) {
  if (tag === null)
    tag = '__ALL';
  return cache.hasOwnProperty(tag);
}

function getTagCache(tag) {
  if (tag === null)
    tag = '__ALL';
  return cache[tag];
}

function setTagCache(tag, hash) {
  if (tag === null)
    tag = '__ALL';
  cache[tag] = hash;
}

function getCache() {
  return cache;
}

function setCache(newCache) {
  cache = newCache;
}

module.exports = {getCache, setCache, hasTagCached, getTagCache, setTagCache};
