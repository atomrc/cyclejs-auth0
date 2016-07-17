import buildDriver from "./makeAuth0Driver";
import Auth0Lock from "auth0-lock";

export default buildDriver(Auth0Lock, window.localStorage);
