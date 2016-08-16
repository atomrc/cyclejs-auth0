import {run} from "@cycle/xstream-run";

import {makeAuth0Driver, protect} from "cyclejs-auth0";
import {makeDOMDriver, div, button} from "@cycle/dom";
import jwt from "jwt-decode";

function App({ DOM, props }) {

    const logout$ = DOM
        .select(".logout")
        .events("click")
        .mapTo({ action: "logout" });

    return {
        DOM: props
            .token$
            .map(token => token ? jwt(token) : null)
            .map(user => {
                return user ?
                    div([
                        div("hello " + user.nickname),
                        button(".logout", "logout")
                    ]) :
                    div("please log in")
            }),

        auth0: logout$
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
    auth0: makeAuth0Driver("tDjcxZrzyKB8a5SPqwn4XqJfdSvW4FXi", "atomrc.eu.auth0.com", {
         auth: {
             params: { scope: "openid nickname" }
         },
         responseType: "token"
     })
};

run(main, drivers);
