import {run} from "@cycle/xstream-run";

import {makeAuth0Driver, protect} from "cyclejs-auth0";
import {makeRouterDriver} from 'cyclic-router'
import {makeDOMDriver, div} from "@cycle/dom";
import {createHistory} from 'history';

function App({ auth0 }) {

    const token$ = auth0.token$;

    return {
        DOM: token$
            .map(token => token ? div("logged") : div("please log in")),
        auth0: token$
            .filter(token => !token)
            .mapTo({ action: "show" })
    }
}

function main(sources) {

    const app = protect(App)(sources);

    return {
        DOM: app.DOM,
        auth0: app.auth0
    };
}

var drivers = {
    DOM: makeDOMDriver("#main", { transposition: true }),
    auth0: makeAuth0Driver("yKJO1ckwuY1X8gPEhTRfhJXyObfiLxih", "mdocs.auth0.com"),
    router: makeRouterDriver(createHistory())
};

run(main, drivers);
