/*global __dirname, it, describe, require*/
"use strict";
const APP_PATH = __dirname + "/../src";

import expect from "expect.js";
import jwt from "jsonwebtoken";

import xs from "xstream";

function getSources(overrides) {
    const defaultSources = {
        auth0: { select: () => {}, tokens$: xs.of(null) },
        props: {
            authWrapperParams: {
                Child: () => ({})
            }
        }
    };
    return {
        ...defaultSources,
        ...overrides
    };
}

function getListener(overrides) {
    const noop = () => null;
    const emptyListener = { next: noop, error: console.error.bind(console), complete: noop };

    return {
        ...emptyListener,
        ...overrides
    };
}


describe("AuthenticationWrapper", () => {
    const AuthenticationWrapper = require(APP_PATH + "/AuthenticationWrapper").default,
        tokens = { accessToken: "accessToken", idToken: jwt.sign({ nickname: "felix" }, "secret") };

    describe("Building", function () {
        it("should throw if child component is not given", (done) => {
            const sources = getSources({
                props: { authWrapperParams: {} }
            });
            const build = () => AuthenticationWrapper(sources)

            expect(build).to.throwError((e) => {
                expect(e.message).to.contain("[Auth0Wrapper]");
                done()
            });
        });

        it("should return undecorated sinks if child is given", (done) => {
            const sources = getSources({
                props: { authWrapperParams: { Child: () => ({ childSink: xs.of("from child") }) } }
            })
            const sinks = AuthenticationWrapper(sources)

            expect(sinks).to.have.property("childSink");

            sinks
                .childSink
                .addListener(getListener({
                    next: value => {
                        expect(value).to.be("from child");
                        done();
                    }
                }))

        });

        it("should decorate child sinks with token", (done) => {
            const sources = getSources({
                auth0: { select: () => xs.empty(), tokens$: xs.of(tokens) },
                props: {
                    authWrapperParams: {
                        Child: () => ({ childSink: xs.of("from child") }),
                        decorators: {
                            childSink: (value, token) => ({ value, token })
                        }
                    }
                }
            })

            const {childSink} = AuthenticationWrapper(sources)

            childSink
                .addListener(getListener({
                    next: data => {
                        expect(data.value).to.be("from child");
                        expect(data.token).to.be(tokens.idToken);
                        done();
                    }
                }))

        });
    });

    describe("Life cycle", function () {
        describe("No token in localStorage", () => {
            const { auth0 } = AuthenticationWrapper(getSources());

            it("should trigger Auth0 login form", (done) => {
                auth0.addListener(getListener({
                    next: action => {
                        expect(action.action).to.be("show");
                        done();
                    }
                }));
            });
        });

        describe("Token given by the driver", () => {
                it("should give token to child", (done) => {
                    const sources = getSources({
                        auth0: { select: () => xs.empty(), tokens$: xs.of(tokens) },
                        props: {
                            authWrapperParams: {
                                Child: ({ props }) => {
                                    props
                                        .tokens$
                                        .addListener(getListener({
                                            next: (tok) => {
                                                expect(tok).to.be(tokens)
                                                done();
                                            }
                                        }))

                                    return {};
                                }
                            }
                        }
                    });

                    AuthenticationWrapper(sources);
                });
        });

        describe("User logs out", () => {
                it("should re show Auth0 login form", (done) => {
                    const sources = getSources({
                        auth0: { select: () => xs.empty(), tokens$: xs.of(tokens, null) }
                    });

                    const { auth0 } = AuthenticationWrapper(sources);

                    auth0
                        .addListener(getListener({
                            next: action => {
                                expect(action.action).to.be("show")
                                done();
                            }
                        }));
                });
        });
    });
});
