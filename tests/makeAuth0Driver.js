/* global it, describe */
import xs from "xstream";
import buildDriver from "../src/makeAuth0Driver";
import expect from "expect.js";

var noop = () => {};
function Auth0LockMock(/*key, domain*/) {
}
Auth0LockMock.prototype = {
    show: noop,
    on: noop
};

const failingLocalStorage = {
    getItem: () => { throw new Error("getItem should not be called") },
    setItem: () => { throw new Error("setItem should not be called") },
    removeItem: () => { throw new Error("removeItem should not be called") }
};

const location = { hash: "" }

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
        expect(driver).to.have.property("token$")
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
                    .addListener({
                        next: response => {
                            expect(response).to.be(response);
                            done();
                        },
                        error: noop,
                        complete: noop
                    });
            });
        });

        describe("logout action", () => {
            var itemRemoved = false
            const makeAuth0Driver = buildDriver(Auth0LockMock, {
                removeItem: () => itemRemoved = true,
                getItem: () => null
            }, location);
            const driver = makeAuth0Driver("key", "domain")(xs.of({ action: "logout" }));

            it("should send response", (done) => {
                driver
                    .select("logout")
                    .addListener({
                        next: response => {
                            expect(response).to.be(null);
                            done();
                        },
                        error: noop,
                        complete: noop
                    });
            });
        });
    });

    describe("token$ stream", () => {
        function makeLocalStorage(overrides) {
            var defaults = {
                getItem: () => "defaulttoken",
                setItem: noop,
                removeItem: noop
            }
            return Object.assign({}, defaults, overrides);
        }
        const makeAuth0Driver = buildDriver(Auth0LockMock, makeLocalStorage(), location);

        it("should send initial token", (done) => {
            const driver = makeAuth0Driver("key", "domain")(xs.empty());

            driver
                .token$
                .addListener({
                    next: response => {
                        expect(response).to.be("defaulttoken");
                        done();
                    },
                    error: noop,
                    complete: noop
                });
        });

        describe("logout", () => {
            var itemRemoved = false;
            const localStorage = makeLocalStorage({
                removeItem: () => itemRemoved = true
            });
            const makeAuth0Driver = buildDriver(Auth0LockMock, localStorage, location);

            const driver = makeAuth0Driver("key", "domain")(xs.of({ action: "logout" }));

            it("should send empty token and remove from storage", (done) => {
                driver
                    .token$
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
