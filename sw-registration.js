/*
 * This is a stardard/boilerplate Service worker registration code.
 * sw.js is the Service worker file
 */

import RSVP from 'rsvp';

export function initialize(/* appInstance */) {
    // Fastboot compatibility check
    if (window && window.navigator) {
        if ('serviceWorker' in window.navigator) {
            window.navigator.serviceWorker.register('sw.js', { scope: '/' })
                .then((reg) => {
                    console.info('Service Worker successfully registered.');

                    if (reg.waiting) {
                        console.info('Update is waiting');
                        this.updateReady();
                    }

                    if (reg.installing) {
                        console.info('Update is in progress');

                        this.trackInstalling(reg.installing).then(() => this.updateReady());

                        return;
                    }

                    reg.onupdatefound = () =>  {
                        console.info('Update has been found.');

                        this.trackInstalling(reg.installing).then(() => this.updateReady());
                    };
                }).catch((error) => {
                    console.error(`An error occured registering Service Worker: ${error}.`);
                });

            window.navigator.serviceWorker.oncontrollerchange = () => {
                console.info('Reloading page...');
                window.location.reload();
            };
        } else {
            console.info('Service Worker is not supported.');
        }
    }
}

export default {
    initialize,

    trackInstalling(worker) {
        'use strict';

        return new RSVP.Promise((resolve) => {
            worker.onstatechange = () => {
                if (worker.state === 'installed') {
                    resolve(worker);
                }
            };
        });
    },

    updateReady() {
        'use strict';

        console.info('Service Worker update is ready.');
    }
};
