#cyclejs-auth0

[![Build Status](https://travis-ci.org/atomrc/cyclejs-auth0.svg?branch=master)](https://travis-ci.org/atomrc/cyclejs-auth0)

`cyclejs-auth0` contains a cyclejs driver and a component wrapper (not yet available) that allow you to:
- init the auth0 lock;
- send actions (and read responses) to the lock (like `show`, `getProfile` or `parseHash`);
- store token in the localStorage (or you can do it yourself if you want);
- add a security layer to your components that need authentication (will be available with the component wrapper).

## Installation

    npm i cyclejs-auth0

then in your source file:

    import makeAuth0Driver from "cyclejs-auth0";

## Driver initialisation

```javascript
const drivers = {
    auth0: makeAuth0Driver(appKey, appDomain)
}

Cycle.run(main, drivers);
```

The `makeAuth0Driver` will instanciate a lock for your app (see the lock api doc here: https://github.com/auth0/lock#documentation )

## Sending action to the Auth0 lock

Now that your lock is instanciated and the driver up, you can send action to be sent to the auth0. To send action you need to send a stream to the `auth0` driver in the sinks of your app.

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

## Reading responses from Auth0

Whenever an action is run against the lock, the driver is outputing a response stream. you can consume that stream using the `select` function. You can use it to filter the action you want to listen to. For example if you want to do something when the lock has shown, you can do the following:

```javascript
function main({ auth0 }) {
    return {
        DOM: auth0
            .select("show")
            .map(div("Please log in")); //ok this example is lame ...
}
```

## I want my token

Ok this whole authentication thing is here for one thing: getting the user's jwt.  
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

Nice thing about the `token$` is that it handles for you the **storage of the token into localStorage**. That means, if the user reload the page, the `token$` will still output the token.  
To remove the token from the storage, don't forget to send the `logout` action.

Here are the features of the `token$`:

- stores the token in localStorage whenever a `parseHash` is run;
- removes the token from localStorage when you send a `logout` action;
- outputs the jwt token for you to consume.

## I want to deal with the token's storage myself

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

## Using the AuthenticationWrapper (soon to come)

This package (will) also includes an AuthenticationWrapper that handles all the common action that needs to be triggered to get an authenticated user.
