#cyclejs-auth0

[![Build Status](https://travis-ci.org/atomrc/cyclejs-auth0.svg?branch=master)](https://travis-ci.org/atomrc/cyclejs-auth0)

`cyclejs-auth0` is composed of two entities (a [driver](#the-driver) and a [component wrapper](#the-component-wrapper)).

The component wrapper allows you to:
- protect any of your component from unlogged users [⬇](#protecting-a-component);
- make authenticated HTTP request to your api endpoint[⬇](#decorating-component-sinks-with-the-token).

The driver allows you to:
- init the auth0 lock [⬇](#driver-initialisation);
- send actions [⬇](#sending-action-to-the-auth0-lock) to the lock (like `show`, `getProfile` or `parseHash`);
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

The wrapper needs two things to work properly:
- the [cyclic-router](https://github.com/cyclejs-community/cyclic-router) (needed to read the token from the url hash fragment sent by Auth0);
- (of course) the [auth0 driver](#the-driver) included in this package.

so before you start, please run:

    npm install cyclic-router

Then the basic setup will look like that:

```javascript
import {makeRouterDriver} from 'cyclic-router'
import {makeAuth0Driver, protect} from "cyclejs-auth0";

function main(sources) {
    //sources include `router` and `auth0`
    const protectedComponent = protect(Component)(sources);

    return protectedComponent;
}

const drivers = {
    auth0: makeAuth0Driver("appkey", "appdomain"),
    router: makeRouterDriver(createHistory())
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
    const ProtectedComponent = protect(Component); //now the component is protected

    //when the component is initiated it will lookup for a jwt token in localStorage
    //if no token is found, it will spawn the auth0 login form
    //else it will just pass the decoded token to your component for you to consume it
    const sinks = protectedComponent(sources);

    return {
        DOM: sinks.DOM
    }
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
        //initial sink + the user's token
        HTTP: (request, token) => {
            return {
                ...request,
                headers: {
                    ...request.headers,
                    //Will add the Authorization header to
                    //any of the http request sent by the component
                    "Authorization": "Bearer " + token
                }
            }
        }
    }
});

const instance = ProtectedComponent(sources);

instance.HTTP //< this sink will be decorated with the token
instance.DOM //< this sink is the initial component's sink, untouched
```

### Customizing the Auth0 login form

You might also want to customize how the auth0 form displays. There is the `auth0ShowParams` property that you can use to achieve that.

```javascript
const ProtectedComponent = protect(Component, {
    auth0ShowParams: {
        authParams: { scope: "openid nickname" },
        responseType: "token"
    }
});
```

All the parameters you can set are documented in the [Auth0 lock documentation](https://auth0.com/docs/libraries/lock/customization)

### Retrieving user's profile

You might want to access the user's profile in your application. It's common to display, at least the user's name and it's picture.

There are two ways to do that: decoding the JSON Web Token given by Auth0 to get basic information or requesting the user's full profile from Auth0.

Both methods need the user's token. Fortunatly `protect` also passes on a `props` object that contains a `token$` stream to the component it's protecting.

You've guested it, it's the stream of the user's token.

Let's try to decode this token to get some basic information about the user:

```javascript
function Component(sources) {
    const token$ = sources.props.token$

    const user$ = token$
        .map(token => {
            return token ? // /!\ if user is not logged in, token is null
                jwtDecode(token) :
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

Or if you want to request the full user's profile to Auth0:

```diff
function Component(sources) {
    const token$ = sources.props.token$

    const getProfileRequest$ = token$
+        .filter(token => !!token)
+        .map(token => {action: "getProfile", params: token })
-        .map(token => {
-            return token ? // /!\ if user is not logged in, token is null
-                jwtDecode(token) :
-                null
-        })

+   const user$ = sources
+       .auth0
+       .select("getProfile")

    return {
        DOM: user$
            .map(user => {
                return user ?
                    div("hello " + user.nickname) : //logged
                    div("Please log in") //not logged
            }),

+        auth0: getProfileRequest$ //sending the profile request to the auth0 driver
    }
}
```

## The driver

### Driver initialisation

```javascript
const drivers = {
    auth0: makeAuth0Driver(appKey, appDomain)
}

Cycle.run(main, drivers);
```

The `makeAuth0Driver` will instantiate a lock for your app (see the lock api doc here: https://github.com/auth0/lock#documentation )

### Sending action to the Auth0 lock

Now that your lock is instantiated and the driver up, you can send action to be sent to the auth0. To send action you need to send a stream to the `auth0` driver in the sinks of your app.

Right now, the available actions are : `show`, `parseHash`, `getProfile` (+ `logout` that is not in the `lock` api)

For example:

```javascript
function main(sources) {
    return {
        auth0: xs.of({ //this will ask the auth0's lock to show the login form
            action: "show",
            params: { //the options object that will be sent to the `show` method
                authParams: { scope: "openid nickname" },
                responseType: "token"
            }
        }),

        //... The other sinks of your app
    }
}
```

### Reading responses from Auth0

Whenever an action is run against the lock, the driver is outputting a response stream. you can consume that stream using the `select` function. You can use it to filter the action you want to listen to. For example if you want to do something when the lock has shown, you can do the following:

```javascript
function main({ auth0 }) {
    return {
        DOM: auth0
            .select("show")
            .map(div("Please log in")); //ok this example is lame ...
}
```

### I want my token

Ok this whole authentication thing is here for one thing: getting the user's JSON Web Token.  
In order to get the token, the driver is giving you a `token$` stream, that you can subscribe to, that will output the user's token. In case there is no token or the user just logout, the stream will output a `null` value (in that case you probably want to send the lock a `show` action). 

Here is a typical use of the `token$`:

```javascript
function main({ auth0 }) {
    const userToken$ = auth0.token$;

    const user$ = userToken$
        .filter(token => !!token) //check that the token is not empty
        .map(token => jwtDecode(token)) //decode jwt to get the basic user's info

    return {
        auth0: userToken$
            .filter(token => !token) //if token is null
            .mapTo({ action: "show" }) //then send auth0 the show action
    }
}
```

Nice thing about the `token$` is that it handles for you the **storage of the token into `localStorage`**. That means, if the user reload the page, the `token$` will still output the token.  
To remove the token from the storage, don't forget to send the `logout` action.

Here are the features of the `token$`:

- stores the token in `localStorage` whenever a `parseHash` is run;
- removes the token from `localStorage` when you send a `logout` action;
- outputs the JWT token for you to consume.

### I want to deal with storage myself

No problem, if you want to store the token yourself you need to:
- **not** use the `token$` at all;
- get the token by subscribing to `select("parseHash")`.

Here is an example:

```javascript
function main({ auth0, storage }) {
    var token$ = storage
        .local
        .getItem("token")
        .filter(token => !!token);

    //code that consumes the token$

    return {
        storage: auth0
            .select("parseToken")
            .map(token => ({ key: "token", value: token })) //will send a store action to the storage driver
    }
}
```

## Feedback

- "OMG it's awesome, it has changed my life"
- "I use Auth0 like that, how can I do with your driver?"
- "Would you consider implementing this?"
- "You should do that instead of that"
- "You really don't know how to speak english you french guys"

As long as it is constructive and polite, any feedback will be welcomed, so please, be my guest :)
