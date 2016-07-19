import xs from "xstream";
import jwtDecode from "jwt-decode";

const defaultAuth0ShowParams = {
    authParams: { scope: "openid" },
    responseType: "token"
};

function containsAuthenticationToken(location) {
    return location.hash.indexOf("id_token") > -1;
}

/**
 * Will decorate all sinks outputs using the corresponding decorate function
 *
 * @param {Object} sinks the sinks to decorate 
 * @param {Stream} token$ the token that will be feeded to the decorator
 * @param {Object} decorators all the decorators, formatted like { sinkName: decorateFn }
 * @returns {Object} The decorated sinks
 */
function decorateSinks(sinks, token$, decorators) {
    const sinksToDecorate = Object.keys(decorators); //get all the decorators

    sinksToDecorate.map(sinkName => {
        var sink = sinks[sinkName];
        var decorate = decorators[sinkName];
        if (!sink) { return; }
        sinks[sinkName] = token$
            .filter(token => !!token)
            .map(token => {
                return sink.map(data => decorate(data, token))
            })
            .flatten();
    })

    return sinks;
}

function model(auth0, router) {
    const token$ = auth0.token$;

    const user$ = token$
        .map(token => token ? jwtDecode(token) : null)
        .remember()

    const location$ = router
        .history$
        //decorate location with the token status
        .map(location => ({ ...location, hasToken: containsAuthenticationToken(location) }))

    const state$ = xs
            .combine(token$, location$)
            .map(([ token, location ]) => ({ token, location }))
            .remember()

    return { user$, token$, state$ };
}

/**
 * Responsible for wrapping a generic component with an authentication layer
 * Will also decorate all http sinks of the child component with the user's token
 *
 * @param {Object} sources sources (that will also be used by the child component)
 * @returns {Object} sinks
 */
function AuthenticationWrapper(sources) {
    const { router, auth0 } = sources;
    const {
        Child = () => { throw new Error("[Auth0Wrapper] missing child component") },
        auth0ShowParams = defaultAuth0ShowParams,
        decorators = {}
    } = sources.props.authWrapperParams;

    const { user$, token$, state$ } = model(auth0, router);

    const childSources = { ...sources, props: { ...sources.props, user$ }};
    const sinks = Child(childSources);

    const showLoginRequest$ = state$
        .filter(({ token, location }) => !token && !location.hasToken)
        .mapTo({
            action: "show",
            params: auth0ShowParams
        });

    const parseHashRequest$ = state$
        .filter(({ token, location }) => !token && location.hasToken)
        .map(({ location }) => ({ action: "parseHash", params: location.hash }));

    const cleanHash$ = state$
        .filter(state => state.location.hasToken && state.token)
        .map(state => state.location.pathname)

    return decorateSinks({
        ...sinks,
        router: xs.merge(cleanHash$, sinks.router || xs.empty()),
        auth0: xs.merge(showLoginRequest$, parseHashRequest$, sinks.auth0 || xs.empty())
    }, token$, decorators);
}

export default AuthenticationWrapper;
