import xs from "xstream";

const defaultAuth0ShowParams = {
    authParams: { scope: "openid" },
    responseType: "token"
};

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

/**
 * Responsible for wrapping a generic component with an authentication layer
 * Will also decorate all http sinks of the child component with the user's token
 *
 * @param {Object} sources sources (that will also be used by the child component)
 * @returns {Object} sinks
 */
function AuthenticationWrapper(sources) {
    const { auth0 } = sources;
    const {
        Child = () => { throw new Error("[Auth0Wrapper] missing child component") },
        auth0ShowParams = defaultAuth0ShowParams,
        decorators = {}
    } = sources.props.authWrapperParams;

    const token$ = auth0.token$;

    const childSources = { ...sources, props: { ...sources.props, token$ }};
    const sinks = Child(childSources);

    const showLoginRequest$ = token$
        .filter(token => !token)
        .mapTo({
            action: "show",
            params: auth0ShowParams
        });

    return decorateSinks({
        ...sinks,
        auth0: xs.merge(showLoginRequest$, sinks.auth0 || xs.empty())
    }, token$, decorators);
}

export default AuthenticationWrapper;
