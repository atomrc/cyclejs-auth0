import {run} from "@cycle/xstream-run";

import {makeAuth0Driver, protect} from "cyclejs-auth0";
import {makeDOMDriver, div} from "@cycle/dom";

function App({ props }) {

    return {
        DOM: props
            .token$
            .debug("app token")
            .map(token => token ? div("logged") : div("please log in"))
    }
}

var drivers = {
    DOM: makeDOMDriver("#main", { transposition: true }),
    auth0: makeAuth0Driver("tDjcxZrzyKB8a5SPqwn4XqJfdSvW4FXi", "atomrc.eu.auth0.com")
};

run(protect(App), drivers);
