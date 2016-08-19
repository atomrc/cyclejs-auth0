import xs from "xstream";
import {run} from "@cycle/xstream-run";

import {makeAuth0Driver, protect} from "cyclejs-auth0";
import {makeDOMDriver, div, button} from "@cycle/dom";
import jwt from "jwt-decode";

const appKey = null; //TODO fill your app's key here
const appDomain = null; //TODO fill your app's domain here

function App({ DOM, auth0, props }) {

    const logout$ = DOM
        .select(".logout")
        .events("click")
        .mapTo({ action: "logout" });

    const showProfile$ = auth0
        .token$
        .map(token => DOM
            .select(".show-profile")
            .events("click")
            .mapTo({ action: "getProfile", params: token })
        )
        .flatten();

    const profile$ = auth0
        .select("getProfile")
        .map(({ response }) => response);

    const state$ = xs
        .combine(props.token$, profile$.startWith(null))
        .map(([ token, profile ]) => ({
            user: token ? jwt(token): null,
            profile: profile
        }))

    return {
        DOM: state$
            .map(({ user, profile }) => {

                const profileNode = profile ? 
                    div(JSON.stringify(profile)) :
                    null;

                return user ?
                    div([
                        div("hello " + user.nickname),
                        button(".logout", "logout"),
                        button(".show-profile", "Show profile"),
                        profileNode
                    ]) :
                    div("please log in")
            }),

        auth0: xs.merge(logout$, showProfile$)
    }
}

function main(sources) {
    var app = protect(App)(sources);

    return {
        DOM: app.DOM,
        auth0: app.auth0
    };
}

var drivers = {
    DOM: makeDOMDriver("#main"),
    auth0: makeAuth0Driver(appKey, appDomain, {
         auth: {
             params: { scope: "openid nickname" },
             responseType: "token"
         }
     })
};

run(main, drivers);
