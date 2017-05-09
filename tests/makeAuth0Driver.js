/* global it, describe */
import xs from "xstream";
import buildDriver from "../src/makeAuth0Driver";
import expect from "expect.js";
import EventEmitter from "events";

var noop = () => {};
function Auth0LockMock(/*key, domain*/) {
}
Auth0LockMock.prototype = Object.create(EventEmitter.prototype);
Auth0LockMock.prototype.show = noop;

const failingLocalStorage = {
    getItem: () => { throw new Error("getItem should not be called") },
    setItem: () => { throw new Error("setItem should not be called") },
    removeItem: () => { throw new Error("removeItem should not be called") }
};

const location = { hash: "" }

function generateListener(overrides) {
    const defaults = {
        next: noop,
        complete: noop,
        error: console.error.bind(console)
    }

    return {
        ...defaults,
        ...overrides,
    };
}

describe("makeAuth0Driver", function () {
    const makeAuth0Driver = buildDriver(Auth0LockMock, failingLocalStorage, location);

    it("should throw if parameters are not given", () => {
        const build = () => makeAuth0Driver()
        expect(build).to.throwException(e => expect(e.message).to.contain("Auth0"));
    })

    it("should init lock if it has the needed parameters", () => {
        var lockCreated = false;
        const makeAuth0Driver = buildDriver(function (key, domain) {
            expect(key).to.be("appkey");
            expect(domain).to.be("appdomain");
            lockCreated = true;
        }, failingLocalStorage, location);

        const driver = makeAuth0Driver("appkey", "appdomain")(xs.empty());
        expect(driver).to.have.property("select")
        expect(driver).to.have.property("tokens$")
        expect(lockCreated).to.be(true);
    })

    describe("Actions", () => {

        describe("show action", () => {

            it("should show lock", () => {
                var showCalled = false;
                Auth0LockMock.prototype.show = function () {
                    showCalled = true;
                }
                makeAuth0Driver("key", "domain")(xs.of({ action: "show" }));
                expect(showCalled).to.be(true);
            });
        });

        describe("getProfile action", () => {
            var getProfileCalled = false;
            var response = { sub: "user_id" };
            Auth0LockMock.prototype.getProfile = function (token, callback) {
                getProfileCalled = true;
                return callback(null, response);
            }

            const driver = makeAuth0Driver("key", "domain")(xs.of({ action: "getProfile" }));

            it("should get profile", () => {
                expect(getProfileCalled).to.be(true);
            });

            it("should send response", (done) => {
                driver
                    .select("getProfile")
                    .addListener(generateListener({
                        next: response => {
                            expect(response).to.be(response);
                            done();
                        }
                    }));
            });
        });

        describe("getUserInfo action", () => {
            var getUserInfoCalled = false;
            var response = { sub: "user_id" };
            Auth0LockMock.prototype.getUserInfo = function (token, callback) {
                getUserInfoCalled = true;
                return callback(null, response);
            }

            const driver = makeAuth0Driver("key", "domain")(xs.of({ action: "getUserInfo" }));

            it("should get user info", () => {
                expect(getUserInfoCalled).to.be(true);
            });

            it("should send response", (done) => {
                driver
                    .select("getUserInfo")
                    .addListener(generateListener({
                        next: response => {
                            expect(response).to.be(response);
                            done();
                        },
                    }));
            });
        });

        describe("logout action", () => {
            const makeAuth0Driver = buildDriver(Auth0LockMock, failingLocalStorage, location);
            const { select } = makeAuth0Driver("key", "domain")(xs.of({ action: "logout" }));

            it("should send response", (done) => {
                select("logout")
                    .addListener(generateListener({
                        next: event => {
                            expect(event.response).to.be(null);
                            done();
                        }
                    }));
            });
        });
    });

    describe("tokens$ stream", () => {
        function makeLocalStorage(overrides) {
            var defaults = {
                getItem: () => '{ "idToken": "defaulttoken" }',
                setItem: noop,
                removeItem: noop
            }
            return Object.assign({}, defaults, overrides);
        }
        const makeAuth0Driver = buildDriver(Auth0LockMock, makeLocalStorage(), location);

        it("should send initial token", (done) => {
            const { tokens$ } = makeAuth0Driver("key", "domain")(xs.empty());

            tokens$
                .addListener({
                    next: response => {
                        expect(response.idToken).to.be("defaulttoken");
                        done();
                    },
                    error: console.error.bind(console),
                    complete: noop
                });
        });

        it("should not send any token if token is in url's hash", done => {
            const location = { hash: "access_token=jfkdlmsq&id_token=token" };
            const makeAuth0Driver = buildDriver(Auth0LockMock, makeLocalStorage(), location);

            const { tokens$ } = makeAuth0Driver("key", "domain")(xs.empty());


            tokens$
                .addListener(generateListener({
                    next: () => done("should not emit")
                }));
            setTimeout(done, 10);
        })

        describe("logout", () => {
            var itemRemoved = false;
            const localStorage = makeLocalStorage({
                removeItem: () => itemRemoved = true
            });
            const makeAuth0Driver = buildDriver(Auth0LockMock, localStorage, location);

            const driver = makeAuth0Driver("key", "domain")(xs.of({ action: "logout" }));

            it("should send empty token and remove from storage", (done) => {
                driver
                    .tokens$
                    .drop(1)
                    .addListener({
                        next: response => {
                            expect(response).to.be(null);
                            expect(itemRemoved).to.be(true);
                            done();
                        },
                        error: console.error.bind(console),
                        complete: noop
                    });
            });
        });

    });
});
