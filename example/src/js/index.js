import xs from "xstream";
import {run} from "@cycle/xstream-run";

import {makeAuth0Driver, protect} from "cyclejs-auth0";
import {makeDOMDriver, div, button, pre} from "@cycle/dom";
import jwt from "jwt-decode";

const appKey = null; //TODO fill your app's key here
const appDomain = null; //TODO fill your app's domain here

function App({ DOM, auth0, props }) {

    const logout$ = DOM
        .select(".logout")
        .events("click")
        .mapTo({ action: "logout" });

    const showProfile$ = auth0
        .tokens$
        .map(tokens => DOM
            .select(".show-profile")
            .events("click")
            .mapTo({ action: "getUserInfo", params: tokens.accessToken })
        )
        .flatten()

    const profile$ = auth0
        .select("getUserInfo")
        .map(({ response }) => response);

    const state$ = xs
        .combine(props.tokens$, profile$.startWith(null))
        .map(([ tokens, profile ]) => ({
            user: tokens.idToken ? jwt(tokens.idToken): null,
            profile: profile
        }))

    return {
        DOM: state$
            .map(({ user, profile }) => {

                const profileNode = profile ? 
                    pre(JSON.stringify(profile, null, 2)) :
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
