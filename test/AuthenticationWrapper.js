/*global __dirname, it, describe, require*/
"use strict";
const APP_PATH = __dirname + "/../src";

import expect from "expect.js";
import select from "snabbdom-selector";
import jwt from "jsonwebtoken";

import xs from "xstream";

const emptyListener = {
    next: () => null,
    error: () => null,
    complete: () => null
};

describe("AuthenticationWrapper", () => {
    const AuthenticationWrapper = require(APP_PATH + "/AuthenticationWrapper").default,
        token = jwt.sign({ nickname: "felix" }, "secret");

    function getDefaultSources() {
        return {
            storage: { local: { getItem: () => xs.of(null) } },
            router: { history$: xs.of({ hash: "" }) },
            auth0: xs.empty(),
            props: {
                Child: () => ({})
            }
        };
    }

    describe("Unlogged", function () {
        const { auth0, DOM } = AuthenticationWrapper(getDefaultSources());

        it("should trigger Auth0 login form", (done) => {
            auth0.addListener(Object.assign({}, emptyListener, {
                next: action => {
                    expect(action.action).to.be("show");
                    done();
                }
            }));
        });

        it("should display unlogged layout", (done) => {
            DOM.addListener(Object.assign({}, emptyListener, {
                next: vtree => {
                    expect(select(".unlogged", vtree).length).to.be(1);
                    done();
                }
            }));
        });
    });

    it("should parse token when user is logged in", (done) => {
        const sources = Object.assign({}, getDefaultSources(), {
            router: { history$: xs.of({ hash: "#id_token=b64token" }) }
        });

        const {auth0} = AuthenticationWrapper(sources);

        auth0
            .take(1)
            .addListener(Object.assign({}, emptyListener, {
                next: action => {
                    expect(action.action).to.be("parseHash");
                    done();
                }
            }));
    });

    it("should save token in local storage once parsed", (done) => {
        const sources = Object.assign({}, getDefaultSources(), {
            auth0: xs.of({
                action: { action: "parseHash" },
                response$: xs.of("b64token")
            })
        });

        const {storage} = AuthenticationWrapper(sources);

        storage
            .take(1)
            .addListener(Object.assign({}, emptyListener, {
                next: store => {
                    expect(store.key).to.be("token");
                    expect(store.value).to.be("b64token");
                    done();
                }
            }));
    });

    describe("Login success", function () {
        function Component() {
            return {
                DOM: xs.of("component DOM")
            };
        }

        const sources = Object.assign({}, getDefaultSources(), {
            router: { history$: xs.of({ pathname: "/felix", hash: "#id_token=b64token" }) },
            storage: {
                local: {
                    getItem: () => xs.of(token)
                }
            },
            props: { Child: Component }
        });

        const {DOM, router} = AuthenticationWrapper(sources);

        it("should display component when user is logged in", (done) => {
            DOM
                .take(1)
                .addListener(Object.assign({}, emptyListener, {
                    next: dom => {
                        expect(dom).to.be("component DOM");
                        done();
                    }
                }));
        });

        it("should remove id_token from location hash", (done) => {
            router
                .take(1)
                .addListener(Object.assign({}, emptyListener, {
                    next: path => {
                        expect(path).to.be("/felix");
                        done();
                    }
                }));
        });
    });


    it("should remove token when component outputs a logout", (done) => {
        function Component() {
            return {
                action$: xs.of({ type: "logout" })
            };
        }

        const sources = Object.assign({}, getDefaultSources(), {
            storage: {
                local: {
                    getItem: () => xs.of("b64token")
                }
            },
            props: { Child: Component }
        });

        const { storage } = AuthenticationWrapper(sources);

        storage
            .take(1)
            .addListener(Object.assign({}, emptyListener, {
                next: store => {
                    expect(store.action).to.be("removeItem");
                    expect(store.key).to.be("token");
                    done();
                }
            }));
    });
});
