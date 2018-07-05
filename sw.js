/* global importScripts Promise workbox */

/*
 * This is an example of using different caching strategies provided by
 * Google's Workbox library.
 */

importScripts('workbox-sw.js');

workbox.core.setCacheNameDetails({
    prefix: 'my-cache'
});

workbox.skipWaiting();

const { routing, strategies } = workbox;

// Define the network strategies
const cacheFirst = strategies.cacheFirst();
const networkFirst = strategies.networkFirst();
const staleWhileRevalidate = strategies.staleWhileRevalidate();

const swUtilsObj = {

    logOutURL: '/api/auth/logout',

    cacheFirstURLs: [
    ],

    networkFirstURLs: [
    ],

    staleWhileRevalidateURLs: [
    ],

    cacheName: workbox.core.cacheNames.runtime,

    /*
     * An example how to handle PUT requests by updating the cache
     * and carrying on with the request
     */
    updateChallengeCache(event) {
        'use strict';

        event.respondWith(
            caches.open(this.cacheName).then((cache) => {
                const request = event.request;
                const challengeURL = this.staleWhileRevalidateURLs.find((url) => {
                    return url.indexOf('challenges/current') !== -1;
                });
                const challengeRequest = new Request(challengeURL);
                const requestToRead = request.clone();
                const challengeFetch = fetch(request).then((networkResponse) => {
                    return networkResponse;
                });

                return cache.match(challengeRequest).then((response) => {
                    if (response) {
                        const responseToRead = response.clone();
                        return requestToRead.json().then((newData) => {

                            return responseToRead.json().then((data) => {
                                /*
                                 * Update the current cache data based on
                                 * data from the new request
                                */
                                Object.keys(newData).forEach((key) => {
                                    data[key] = newData[key];
                                });

                                const updatedChallengeResponse
                                    = new Response(JSON.stringify(data), {
                                        'status': 200,
                                        'statusText': 'OK',
                                        headers: {
                                            'content-type': 'application/json'
                                        }
                                });

                                return cache.put(challengeRequest, updatedChallengeResponse).then(() => {
                                    return challengeFetch;
                                });
                              });
                        });
                    } else {
                        return challengeFetch;
                    }
                });
            })
        );
    },

    processLogout(event) {
        'use strict';

        event.respondWith(
            caches.open(this.cacheName).then((cache) => {
                // Clean up the cache
                this.cacheFirstURLs.forEach((url) =>
                    cache.delete(new Request(url)));

                this.networkFirstURLs.forEach((url) =>
                    cache.delete(new Request(url)));

                this.staleWhileRevalidateURLs.forEach((url) =>
                    cache.delete(new Request(url)));

                // Continue with the request
                return fetch(event.request)
                    .then((networkResponse) => networkResponse);
            })
        );
    }

};

routing.registerRoute(({ url, event }) => {
    return event.request.method === 'GET'
        && swUtilsObj.cacheFirstURLs.includes(url.pathname);
}, cacheFirst);

routing.registerRoute(({ url, event }) => {
    return event.request.method === 'GET'
        && swUtilsObj.networkFirstURLs
            .forEach((networkFirstURL) => url.pathname.startsWith(networkFirstURL));
}, networkFirst);

routing.registerRoute(({ url, event }) => {
    return event.request.method === 'GET'
        && swUtilsObj.staleWhileRevalidateURLs.includes(url.pathname);
}, staleWhileRevalidate);

routing.registerRoute(
    ({ url, event }) => {
        return event.request.method === 'GET'
            && swUtilsObj.logOutURL === url.pathname;
    },
    ({ event }) => swUtilsObj.processLogout(event)
);

self.addEventListener('activate', (event) => {
    'use strict';

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((cacheName) => cacheName === workbox.core.cacheNames.runtime)
                    .map((cacheName) => caches.delete(cacheName))
            );
        }).then(() => {
            // To claim currently open clients.
            self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;

    if (request.method === 'PUT'
        && /\/api\/challenges\/\d+$/.test(request.url)) {
        swUtilsObj.updateChallengeCache(event);
    }
});
