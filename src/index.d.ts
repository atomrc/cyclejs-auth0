import { Stream, MemoryStream } from 'xstream'

export interface Auth0LockOptions {
    [key: string]: any
}
export interface Auth0ShowOptions {
    [key: string]: any
}

export interface GetUserInfo {
    action: 'getUserInfo'
    params: string
} // params = idToken
export interface Show {
    action: 'show'
    params: Auth0ShowOptions
}
export interface Logout {
    action: 'logout'
}
export type Auth0Request = GetUserInfo | Show | Logout

export interface Auth0Tokens {
    idToken: string
    accessToken: string
}
export interface Auth0Source {
    select(selector: string): Stream<any>
    token$: Stream<Auth0Tokens>
}
export declare type Auth0Sink = Stream<Auth0Request>
export declare type Auth0Driver = (sink: Auth0Sink) => Auth0Source

export declare function makeAuth0Driver(
    auth0AppKey: string,
    auth0AppDomain: string,
    options?: Auth0LockOptions
): Auth0Driver

export interface Sources {
    [key: string]: any
}
export interface Sinks {
    [key: string]: any
}
export type Component = (s: Sources) => Sinks

export interface DecoratedSources extends Sources {
    props: {
        authWrapperParams: { Child: Component, [propName: string]: any; }
        tokens$: MemoryStream<Auth0Tokens>
    }
}

export interface ProtectOptions { 
    decorators: {
        [driverKey: string]: (sinkData: any, tokens: Auth0Tokens) => any
    }
    [propName: string]: any 
}

export declare function protect(
    component: Component,
    options?: ProtectOptions
): (sources: DecoratedSources) => Sinks
