import protectComponent from "./protectComponent";
import buildDriver from "./makeAuth0Driver";
import Auth0Lock from "auth0-lock";

export const makeAuth0Driver = buildDriver(Auth0Lock, window.localStorage, window.location);
export const protect = protectComponent;
export default buildDriver(Auth0Lock, window.localStorage, window.location);
