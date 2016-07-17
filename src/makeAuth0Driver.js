import xs from "xstream";
import Auth0Lock from "auth0-lock";

var lock;
const storageKey = "auh0-driver-token";

/**
 * Contains all the available actions that can be done against the auth0 api
 *
 * @returns {Object}
 */
const actions = {
    "show": function (lock, params) {
        var promise = new Promise(resolve => {
            lock.show(params);
            resolve("ok");
        });
        return promise;
    },

    "parseHash": function (lock, locationHash) {
        var promise = new Promise((resolve, reject) => {
            var hash = lock.parseHash(locationHash);
            if (!hash) {
                return reject(false);
            }

            if (hash.error) {
                return reject(`[Auth0] There was an error logging in: ${hash.error}`);
            }

            return resolve(hash.id_token);
        });

        return promise;
    },

    "getProfile": function (lock, token) {
        return new Promise((resolve, reject) => {
            lock.getProfile(token, function (err, profile) {
                if (err) {
                    return reject(err);
                }
                return resolve(profile);
            });
        })
    },

    "logout": function () {
        var promise = new Promise(resolve => {
            localStorage.removeItem(storageKey);
            resolve(null);
        });
        return promise;
    }
};

/**
 * Generate a function that will filter responses in order to have only those selected
 *
 * @param {Stream} response$$ the response stream
 * @return {Function} selectResponse
 */
function responseSelector(response$$) {
    return function selectResponse(action) {
        return response$$
            .filter(response => response.action === action)
            .map(response => response.response$)
            .flatten();
    }
}

function auth0Driver(action$, streamAdapter) {
    const response$$ = action$
        .map(action => {
            var actionFn = actions[action.action];
            if (!actionFn) {
                console.error(`[Auth0Driver] not available method: ${action.action}`);
                return false;
            }
            var promise = actionFn(lock, action.params);
            return {
                action: action.action,
                response$: promise ? xs.fromPromise(promise) : xs.empty()
            }
        })
        .filter(response => !!response)
        .remember();

    const noop = () => {};
    response$$.addListener({ next: noop, error: noop, complete: noop })

    const select = responseSelector(response$$);

    return {
        select: select,
        token$: xs.merge(select("parseHash"), select("logout"))
            .startWith(localStorage.getItem(storageKey))
    };
}

function makeAuth0Driver(key, domain) {
    lock = new Auth0Lock(key, domain);

    return auth0Driver;
}

export default makeAuth0Driver;
