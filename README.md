# Webhook Relay Server (node-webhook-relay-server)

![David](https://img.shields.io/david/bmdevx/node-webhook-relay-server?style=flat-square)  ![npm](https://img.shields.io/npm/dt/node-webhook-relay-server?style=flat-square) ![npm](https://img.shields.io/npm/v/node-webhook-relay-server?style=flat-square) ![GitHub](https://img.shields.io/github/license/bmdevx/node-webhook-relay-server?style=flat-square)

## Webhook Relay Server is a sever in which webhooks can be redirected to websockets for monitoring. The server's goal was to be able to expose web services without exposing LAN networks in a secure fashion

### Features

* Create webhooks for monitoring
* Create bundles of webhooks to monitor
* Subscribe to webhooks or bundles
* Support for HTTP and HTTPS with custom ports
* Limit max subscriptions per hook or bundle

### Config

```js
{
    hooksPath: '/hooks',            //Path to post Webhooks
    hooksSubscriptionPath: '/subscribe/hooks', //Path to subscribe to Hooks
    bundleSubscriptionPath: '/subscribe/bundle', //Path to subscribe to Bundles
    maxSubscriptions: 10,           //Default Max Number of Subscriptions for Hooks/Bundles
    webhookPort: 80,                //Port to Listen for Webhooks
    subscriptionPort: 80,           //Port to Listen for Subscriptions
    useHttps: true,                 //Enable HTTPS
    credentials: {                  //Required for HTTPS
        key: 'secure key',          //Key for HTTPS
        keyFile: 'credentials.key', //Alternatively can load from file
        cert: 'certificate',        //Certificate for HTTPS
        certFile: 'cerdentials.cert'//Alternatively can load from file
    },
    webhookPortSecure: 443,         //Port to Listen for Webhooks on HTTPS
    subscriptionPortSecure: 443,    //Port to Listen for Subscriptions on HTTPS
    httpsOnly: false,               //Only use HTTPS,
    debug: false                    //Enables debug mode
}
```

### Methods

``` js
addWebhook({                        // Config and all fields are optional
    endpoint: '/location/:data/:id',   //Custom path for webhook. Fields that start with a colon can be parsed using the BasicProcessor as 'restData' in the subscription response.
    id: 'my-hook',                      //ID of webhook. UUID is created when blank
    hookProcessor: processor,           //Processor that handles webhook request. Default is BasicProcessor.
    hookAuthentication: atuhentication, //Webhook Authenticator. Default is NoAuthentication
    subscriptionAuthentication: atuhentication, //Subscription Authenticator. Default is NoAuthentication
    maxSubscriptions: 10,               //Max number of subscriptions for hook
    bundleId: ''                        //ID of bundle to put webhook in. Leaving blank does not put webhook in a bundle
});
returns Promise({
    id: 'my-hook',
    hookPath: '/hooks/location/:data/:id'
    subscriptionPath: '/subscribe/hook/my-hook',
    hookAuthenticationToken: 'token',           //If Hook Authentication reutrns token
    subscriptionAuthenticationToken: 'token',   //If Subscription Authentication reutrns token
})

deleteWebhook(id);                      //Deletes Webhook
returns Promise()

addBundle({                         // Config and all fields are optional
    id: 'my-bundle',                    //ID of bundle. UUID is created when blank
    subscriptionAuthentication: atuhentication, //Subscription Authenticator. Default is NoAuthentication
    maxSubscriptions: 10,               //Max number of subscriptions for bundle
    subscriptionAuthenticationToken: 'token',   //If Subscription Authentication reutrns token
    webhooks: [],                       //Array of webhooks to create
});
returns Promise({
    id: 'my-bundle',
    subscriptionPath: '/subscribe/bundle/my-bundle',
    webhooks: []
})

deleteBundle(id);                       //Deletes Bundle
returns Promise()

listen();                               //Starts Server
```

### Processors

```js
Processors.Basic();                     //Default Processor which can turn endpoints with colons into restData. POST data is automatically returned as 'body'.
returns Promise(JSON.stringify({
    source: req.ip,
    body: req.body,
    restData: {} //processed endpoint data
}));


//Custom processors can be created with this format
class CustomProcessor extends Processors.Base {
    process(req, webhook) {
        return Promise((res, rej) => {
            var dataToSendToWebsockSubscription = 'Webhook Data';
            res(dataToSendToWebsockSubscription)
        });
    }
}
```

### Authentication

```js
Authentication.None();                          //Default Authentication
Authentication.Basic('username', 'password');   //Basic Username and Password authentication

//Custom authenticators can be created with this format from BaseAuhentication
class CustomAuthentication extends Authentication.Base {
    constructor(token = null) { super(token); }
    verify(req, relay) { return Promise.resolve({ verified: false, id: 0 }); }
    hasToken() { return true; }
    getToken() { return this.token; }
}
```
