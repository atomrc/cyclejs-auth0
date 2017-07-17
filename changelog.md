# 4.0.0

- fix https://github.com/atomrc/cyclejs-auth0/issues/6 (access token in not available) (thanks @pauldailly)

## Breaking changes

### Component Wrapper's breaking changes

- the signature of the decorator function has changed. Initialy, only the `idToken` was given to the function, now all the tokens are given (`idToken` + `accessToken`). To migrate your decorators, you just need to use the `idToken` of the `tokens` object

```diff
const ProtectedComponent = protect(Component, {
    decorators: {
-       HTTP: (request, token) => {
+       HTTP: (request, tokens) => {
            return {
                ...request,
                headers: {
                    ...request.headers,
-                   "Authorization": "Bearer:" + token
+                   "Authorization": "Bearer:" + tokens.accessToken
                }
            }
        }
    }
});
```


# 3.0.0

Auth0 is deprecating the `getProfile` method. In order to be able to use the `getUserInfo` instead, the driver now send all the tokens given by Auth0 to your application

## Breaking changes

### Driver's breaking changes
- the `token$` source is replaced with the `tokens$` source
- the `tokens$` stream now emits an object instead of a single `token`

```javascript
{
    idToken: "...", // the id token
    accessToken: "..." // the access token
}
```

## New feature

- the `getUserInfo` method is now available

