# 3.0.0

Auth0 is deprecating the `getProfile` method. In order to be able to use the `getUserInfo` instead, the driver now send all the tokens given by Auth0 to your application

## Breaking changes

### Driver's breaking changes
- the `token$` source is replaced with the `tokens` source
- the `tokens$` stream now emits an object instead of a single `token`

```javascript
{
    idToken: "...", // the id token
    accessToken: "..." // the access token
}
```

### Component wrapper's breaking changes

- the `decorate` method now takes the object containing all the tokens instead of the single idToken

## New feature

- the `getUserInfo` method is now available

