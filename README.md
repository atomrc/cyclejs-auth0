# cyclejs-auth0

[![Build Status](https://travis-ci.org/atomrc/cyclejs-auth0.svg?branch=master)](https://travis-ci.org/atomrc/cyclejs-auth0)

`cyclejs-auth0` is composed of two entities (a [driver](#the-driver) and a [component wrapper](#the-component-wrapper)).

The component wrapper allows you to:
- protect any of your component from unlogged users [⬇](#protecting-a-component);
- make authenticated HTTP request to your api endpoint[⬇](#decorating-component-sinks-with-the-token).

The driver allows you to:
- init the auth0 lock [⬇](#driver-initialisation);
- send actions [⬇](#sending-action-to-the-auth0-lock) to the lock (like `show` or `getUserInfo`);
- read responses [⬇](#reading-responses-from-auth0) from the lock;
- store token [⬇](#i-want-my-token) in `localStorage` (or you can do it yourself if you want [⬇](#i-want-to-deal-with-storage-myself)).

## Compatibility note

`cyclejs-auth0` is (for the moment) only compatible with `@cycle/xstream-run`.  
It will be compatible with any stream lib in the future, but if you are impatient, a PR will be welcomed ;)

## Installation

    npm install cyclejs-auth0

## The component wrapper

This is, by far, the simplest way to integrate Auth0 into your cyclejs app. The component wrapper will protect any of your component from unlogged users (users that don't have a token in `localStorage`).  

### Wrapper initialization

The basic setup will look like that:

```javascript
import {makeAuth0Driver, protect} from "cyclejs-auth0";

function main(sources) {
    //sources include `auth0`
    const protectedComponent = protect(Component)(sources);

    return protectedComponent;
}

const drivers = {
    auth0: makeAuth0Driver("appkey", "appdomain")
}
```

### Protecting a component

Protecting a component is as simple as calling `const ProtectedComponent = protect(MyComponent)`. You then get a new protected component. You can use it as any cyclejs component: `const sinks = ProtectedComponent(sources)`.

Here is a simple example of how to use `protect`

```javascript
import {protect} from "cyclejs-auth0";

function MyComponent(sources) {
    return {
        DOM: xs.of(div("hello fellow user"))
    };
}

function main(sources) {
    const ProtectedComponent = protect(MyComponent); //now the component is protected

    //when the component is initiated it will lookup for a jwt token in localStorage
    //if no token is found, it will spawn the auth0 login form
    //else it will just pass the decoded token to your component for you to consume it
    const sinks = protectedComponent(sources);

    return sinks;
}
```

Now if the user is not logged in when the component is instantiated, the Auth0 form will show up.

### Making authenticated HTTP calls

Authentication in a single page app is often not only about protecting a component but also about sending the authentication token to your api endpoint. There is a simple way to do that with the component wrapper, the `decorators` option of the `protect` function.

```javascript
const ProtectedComponent = protect(Component, {
    decorators: {
        //let's decorate the HTTP sink
        //the decorate function is given each produced value of the 
        //initial sink + the user's tokens (accessToken and idToken)
        HTTP: (request, tokens) => {
            return {
                ...request,
                headers: {
                    ...request.headers,
                    //Will add an Authorization header containing the user's access token to
                    //any of the http requests sent by the component
                    "Authorization": "Bearer " + tokens.accessToken
                }
            }
        }
    }
});

const instance = ProtectedComponent(sources);

instance.HTTP //< this sink will be decorated with the token
instance.DOM //< this sink is the initial component's sink, untouched
```

### Retrieving user's profile

You might want to access the user's profile in your application. It's common to display at least the user's name and picture.

There are two ways to do that: decoding the JSON Web Token given by Auth0 to get basic information, or requesting the user's full profile from Auth0.

Both methods need the user's token. Fortunately `protect` also passes a `props` object, that contains a `tokens$` stream, on to the component it's protecting.

You guessed it, it's the stream of the user's tokens (accessToken and idToken).

Let's try to decode `token$` to get some basic information about the user:

```javascript
function Component(sources) {
    const tokens$ = sources.props.tokens$

    const user$ = tokens$
        .map(tokens => {
            return tokens ? // /!\ if user is not logged in, tokens is null
                jwtDecode(tokens.idToken) :
                null
        })

    return {
        DOM: user$
            .map(user => {
                return user ?
                    div("hello " + user.nickname) : //logged
                    div("Please log in") //not logged
            })
    }
}
```

Or if you want to request the full user profile from Auth0:

```diff
function Component(sources) {
    const tokens$ = sources.props.tokens$

    const getUserInfoRequest$ = tokens$
+        .filter(tokens => !!tokens)
+        .map(tokens => {action: "getUserInfo", params: tokens.accessToken })
-        .map(tokens => {
-            return tokens ? // /!\ if user is not logged in, tokens is null
-                jwtDecode(tokens.idToken) :
-                null
-        })

+   const user$ = sources
+       .auth0
+       .select("getUserInfo")
+       .map(action => action.response)

    return {
        DOM: user$
            .map(user => {
                return user ?
                    div("hello " + user.nickname) : //logged
                    div("Please log in") //not logged
            }),

+        auth0: getUserInfoRequest$ //sending the user info request to the auth0 driver
    }
}
```

## The driver

### Driver initialization

```javascript
const drivers = {
    auth0: makeAuth0Driver(appKey, appDomain)
}

Cycle.run(main, drivers);
```

The `makeAuth0Driver` will instantiate an Auth0 lock for your app. (See [Auth0 lock API documentation](https://github.com/auth0/lock#api).)

### Customizing the Auth0 login form

You might also want to customize how the auth0 form displays. There is a config object you can pass on the the driver's constructor function to achieve that.

```javascript
const auth0Config = {
    auth: {
        params: { scope: "openid nickname" },
        responseType: "token"
    }
};

const drivers = {
    auth0: makeAuth0Driver("appkey", "appdomain", auth0Config)
}
```

The parameters you can set are documented in the [Auth0 lock documentation](https://auth0.com/docs/libraries/lock/customization).

## The Auth0 lock

### Sending action to the Auth0 lock

Now that your lock is instantiated and the driver configured, you can send an action to auth0. To do this you need to send a stream to the `auth0` driver in your app sinks.

Right now the available actions are: `show`, `getUserInfo`, and `logout` (this logout replaces the [`lock` api logout](https://auth0.com/docs/libraries/lock/v10/api#logout-)).

For example:

```javascript
function main(sources) {
    return {
        auth0: xs.of({
            action: "show", //this will ask the auth0's lock to show the login form
            params: { //the options object that will be sent to the `show` method
                authParams: { scope: "openid nickname" },
                responseType: "token"
            }
        }),

        //... The other sinks of your app
    }
}
```

### Reading responses from the Auth0 lock

Whenever an action is run against the lock, the driver outputs a response stream. You can consume this stream using the `select` function. Then you can filter for the action you want to listen to. For example, if you want to do something when the lock has "shown", you can do the following:

```javascript
function main({ auth0 }) {
    return {
        DOM: auth0
            .select("show")
            .map(div("Please log in")); //ok this example is lame ...
}
```

## The tokens$

### I want my token

Ok this whole authentication thing is here for one thing: getting the user's JSON Web Token.  
In order to get the token, the driver provides a `tokens$` stream that will output the user's idToken and accessToken. In case there are no tokens or the user is logged out the stream will output a `null` value (in that case you probably want to send the lock a `show` action). 

Here is a typical use of the `tokens$`:

```javascript
function main({ auth0 }) {
    const userTokens$ = auth0.tokens$;

    const user$ = userTokens$
        .filter(token => !!token) //check that the token is not empty
        .map(token => jwtDecode(token.idToken)) //decode jwt to get the basic user's info

    return {
        auth0: userTokens$
            .filter(token => !token) //if token is null
            .mapTo({ action: "show" }) //then send auth0 the show action
    }
}
```

Nice thing about the `tokens$` is that it handles the **storage of the token into `localStorage`** for you. That means, if the user reloads the page, the `tokens$` will still output the token.  
To remove the token from the storage, don't forget to send the `logout` action.

Here are the features of the `tokens$`:

- stores the token in `localStorage` whenever an `authenticated` event is sent by the `lock`;
- removes the token from `localStorage` when you send a `logout` action;
- outputs the JWT token for you to consume.

### I want to deal with storage myself

No problem, if you want to store the token yourself you need to:
- **not** use the `tokens$` at all;
- get the token by subscribing to `select("authenticated")`.

Here is an example:

```javascript
function main({ auth0, storage }) {
    var tokens$ = storage
        .local
        .getItem("token")
        .filter(tokens => !!tokens)
        .map(tokens => JSON.parse(tokens));

    //code that consumes the tokens$

    return {
        storage: auth0
            .select("authenticated")
            .map(response => ({ key: "token", value: JSON.stringify({
                idToken: response.idToken,
                accessToken: response.accessToken
            })})) //will send a store action to the storage driver
    }
}
```

## Cycle.js Community

To discover many awesome resources made by the community about Cycle.js (drivers, videos, components, utilities...) be sure to check [cyclejs-community/awesome-cyclejs](https://github.com/cyclejs-community/awesome-cyclejs) out. ;)

## Feedback

- "OMG it's awesome, it has changed my life!"
- "I use Auth0 like this, how can I do this with your driver?"
- "Would you consider implementing this?"
- "You should do this instead of that."
- "You really don't know how to speak english you french guys."

As long as it is constructive and polite, any feedback will be welcomed, so, please, be my guest :)
