import xs from "xstream";

const defaultAuth0ShowParams = {
    authParams: { scope: "openid" },
    responseType: "token"
};

/**
 * Will decorate all sinks outputs using the corresponding decorate function
 *
 * @param {Object} sinks the sinks to decorate 
 * @param {Stream} tokens$ the tokens that will be feeded to the decorator
 * @param {Object} decorators all the decorators, formatted like { sinkName: decorateFn }
 * @returns {Object} The decorated sinks
 */
function decorateSinks(sinks, tokens$, decorators) {
    const sinksToDecorate = Object.keys(decorators); //get all the decorators

    sinksToDecorate.map(sinkName => {
        var sink = sinks[sinkName];
        var decorate = decorators[sinkName];
        if (!sink) { return; }
        sinks[sinkName] = tokens$
            .filter(tokens => !!tokens)
            .map(tokens => {
                return sink.map(data => decorate(data, tokens.idToken))
            })
            .flatten();
    })

    return sinks;
}

/**
 * Responsible for wrapping a generic component with an authentication layer
 * Will also decorate all http sinks of the child component with the user's tokens
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

    const tokens$ = auth0.tokens$;

    const childSources = { ...sources, props: { ...sources.props, tokens$ }};
    const sinks = Child(childSources);

    const showLoginRequest$ = tokens$
        .filter(tokens => !tokens)
        .mapTo({
            action: "show",
            params: auth0ShowParams
        });

    return decorateSinks({
        ...sinks,
        auth0: xs.merge(showLoginRequest$, sinks.auth0 || xs.empty())
    }, tokens$, decorators);
}

export default AuthenticationWrapper;
