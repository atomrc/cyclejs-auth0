import AuthenticationWrapper from "./AuthenticationWrapper";

function protect(Component, options) {
    return function (sources) {
        const decoratedSources = {
            ...sources,
            props: { ...sources.props, authWrapperParams: { Child: Component, ...options }}
        };

        return AuthenticationWrapper(decoratedSources);
    }
}

export default protect
