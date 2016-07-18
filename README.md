#cyclejs-auth0 (WIP)

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

Ultimately, what you might want is the jwt sent by Auth0 once your user has logged in.  
To do that, the driver is giving you a `select` function that allows you to filter the responses of the Auth0 lock and get the value.  
So after I gave a `parseHash` action to the driver, I can read the response this way:

```javascript
function main(sources) {
    const token$ = sources
        .auth0
        .select("parseHash"); //< and here is my token stream
}
```

Actually you can do that in an even simplier way using the `token$` property that the driver is giving to you.  
The `token$` has another quite powerfull feature: it stores the token in the localStorage, so your user won't have to type their credential at each reload:

```javascript
function main(sources) {
    const token$ = sources.auth0.token$ //< token from the localStorage or from the `parseHash` response if local storage is empty
    //this token will be null if a `logout` action is sent to the driver
}
```

Note that token will only be stored and read from localStorage if you subscribe to the `token$` stream.  
That means the token won't be lost forever in the localStorage if you never use the `token$`.  
Last thing, if you use the `token$` don't forget to call the `logout` action to remove token from localStorage ;)

## Logging out

to log out the current user, simply send a `logout` action. It will remove the token from the localStorage and send a `null` value to the `token$` stream

```javascript
function main(sources) {
    return {
        auth0: xs.of({ action: "logout" })
    }
}
```

## Using the AuthenticationWrapper (soon to come)

This package (will) also includes an AuthenticationWrapper that handles all the common action that needs to be triggered to get an authenticated user.
