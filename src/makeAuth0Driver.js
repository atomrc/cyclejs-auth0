import xs from "xstream";


/**
 * Generate a function that will filter responses in order to have only those selected
 *
 * @param {Stream} response$$ the response stream
 * @return {Function} selectResponse
 */
function responseSelector(response$) {
    return function selectResponse(event) {
        return response$
            .filter(response => response.event === event)
            .map(response => response.response)
            .flatten();
    }
}

/**
 * it's needed to wrapper the makeAuth0Driver in a factory for testing purposes
 * as the Auth0Lock code tries to init at import (and fails because there is no document)
 *
 * @param {class} Auth0Lock the Auth0 code
 * @returns {Function} makeAuth0Driver
 */
function buildDriver(Auth0Lock, localStorage) {
    var lock;
    const storageKey = "auh0-driver-token";

    /**
     * Contains all the available actions that can be done against the auth0 api
     *
     * @returns {Object}
     */
    const actions = {
        "show": function (lock, params) {
            lock.show(params);
        },

        "logout": function () {
            return new Promise(resolve => resolve(null));
        }
    };

    function auth0Driver(action$, streamAdapter) {
        const noop = () => {};

        action$
            .map(action => {
                var actionFn = actions[action.action];
                if (!actionFn) {
                    console.error(`[Auth0Driver] not available method: ${action.action}`);
                    return false;
                }
                actionFn(lock, action.params);
                return { action: action.action }
            })
            .addListener({ next: noop, error: noop, complete: noop })


        const response$ = xs.create({
            start: function (listener) {
                [
                    "show",
                    "hide",
                    "authenticated",
                    "hash_parsed",
                    "unrecoverable_error",
                    "authorization_error"
                ].forEach(event => {
                    lock.on(event, (response) => listener.next({ event, response }))
                })
            },
            stop: noop
        });

        const select = responseSelector(response$);

        const initialToken$ = xs
            .of(localStorage.getItem(storageKey));

        const removeToken$ = select("logout")
            .map(() => {
                localStorage.removeItem(storageKey)
                return null;
            });

        const storeToken$ = select("parseHash")
            .map((token) => {
                localStorage.setItem(storageKey, token)
                return token;
            });

        return {
            select: select,
            token$: xs
                .merge(initialToken$, storeToken$, removeToken$)
                .remember()
        };
    }

    return function makeAuth0Driver(key, domain) {
        if (!key || !domain) {
            throw new Error("[Auth0] You must provide a key and a domain");
        }
        lock = new Auth0Lock(key, domain);

        return auth0Driver;
    }
}

export default buildDriver;
