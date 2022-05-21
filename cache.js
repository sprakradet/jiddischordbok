var CACHE_NAME = "cache";

const addResourcesToCache = async (resources) => {
  const cache = await caches.open("v1");
  await cache.addAll(resources);
};

self.addEventListener('install', function(event) {
    console.log("install service worker", event);
    event.waitUntil(
	addResourcesToCache([
        './',
        './kod/dictionary.js',
        './kod/jiddisch.js',
        './kod/jiddisch.css',
        './kod/current-data.js',
        './kod/bibliotek/jquery-3.3.1.min.js',
        './kod/bibliotek/underscore-1.9.1-min.js',
	])
    );
});

const putInCache = async (request, response) => {
  const cache = await caches.open("v1");
  await cache.put(request, response);
}


const fetchFirst = async (request) => {
    try {
	const responseFromNetwork = await fetch(request);
	console.log("fetch succeeded", request.url);
	putInCache(request, responseFromNetwork.clone())
	return responseFromNetwork;
    } catch (error) {
	console.log("error fetching", request.url, error);
	const responseFromCache = await caches.match(request);
	console.log("from cache", request.url, responseFromCache);
	return responseFromCache;
    }
};

this.addEventListener('fetch', function(event) {
    console.log("fetch request", event.request.url);
    event.respondWith(fetchFirst(event.request));
});

