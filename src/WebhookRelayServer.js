const express = require('express');
const expressWS = require('express-ws');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const http = require('http');
const https = require('https');
const uuidv4 = require('uuid').v4;

const Webhook = require('./subcriptions/Webhook');
const Bundle = require('./subcriptions/Bundle');
const BasicProcessor = require('./processors/BasicProcessor');
const NoAuthentication = require('./authentication/NoAuthentication');


const DEFAULT_WEBHOOK_HTTP_PORT = 80;
const DEFAULT_WEBHOOK_HTTPS_PORT = 443;
const DEFAULT_SUBSCRIPTION_HTTP_PORT = 80;
const DEFAULT_SUBSCRIPTION_HTTPS_PORT = 443;

const DEFUALT_USE_HTTPS = false;
const DEFUALT_HTTPS_ONLY = false;

const DEFAULT_MAX_SUBSCRIPTIONS = 10;

const DEFAULT_PATH_HOOKS = '/hook';
const DEFAULT_PATH_HOOK_SUBSCRIPTION = '/subscribe/hook';
const DEFAULT_PATH_BUNDLE_SUBSCRIPTION = '/subscribe/bundle';

const DEFAULT_DEBUG_MODE = false;

const ERROR_CODES = {
    'AUTHENTICATION_ERROR': {
        code: 1011,
        message: 'Authentication Error'
    },
    'AUTHORIZATION_FAILED': {
        code: 4001,
        message: 'Authentication Failed'
    },
    'INVALID_SUBSCRIPTION_ID': {
        code: 4002,
        message: 'Invalid Subscription ID'
    },
    'MAX_SUBSCRIPTIONS_REACHED': {
        code: 4003,
        message: 'Max Subscriptions Reached'
    }
};


class WebhookRelayServer {
    constructor(config = {}) {
        var hooks = {};
        var bundles = {};

        var credentials = config.credentials || {};
        const useHttps = config.useHttps || DEFUALT_USE_HTTPS;
        const httpsOnly = config.httpsOnly || DEFUALT_HTTPS_ONLY;

        const webhookPort = config.webhookPort || DEFAULT_WEBHOOK_HTTP_PORT;
        const webhookPortSecure = config.webhookPortSecure || DEFAULT_WEBHOOK_HTTPS_PORT;

        const subscriptionPort = config.subscriptionPort || DEFAULT_SUBSCRIPTION_HTTP_PORT;
        const subscriptionPortSecure = config.subscriptionPortSecure || DEFAULT_SUBSCRIPTION_HTTPS_PORT;

        const maxSubscriptions = config.maxSubscriptions || DEFAULT_MAX_SUBSCRIPTIONS;

        const PATH_HOOKS = sanitizePath(config.hooksPath || DEFAULT_PATH_HOOKS);
        const PATH_HOOKS_LEVELS = Array.from(PATH_HOOKS).filter(x => x == '/').length + 2;
        const PATH_HOOK_SUBSCRIPTION = sanitizePath(config.hooksSubscriptionPath || DEFAULT_PATH_HOOK_SUBSCRIPTION);
        const PATH_BUNDLE_SUBSCRIPTION = sanitizePath(config.bundleSubscriptionPath || DEFAULT_PATH_BUNDLE_SUBSCRIPTION);


        const debug = config.debug === true || DEFAULT_DEBUG_MODE;


        this.addWebhook = (wc) => {
            return new Promise((res, rej) => {
                const isConfig = typeof wc == 'object';
                if (isConfig) {
                    if (!wc['endpoint']) wc.endpoint = '';
                    if (!wc['id']) wc.id = null;
                    if (!wc['hookProcessor']) wc.hookProcessor = null;
                    if (!wc['hookAuthentication']) wc.hookAuthentication = null;
                    if (!wc['subscriptionAuthentication']) wc.subscriptionAuthentication = null;
                    if (!wc['maxSubscriptions']) wc.maxSubscriptions = null;
                    if (!wc['bundleId']) wc.bundleId = null;
                }

                var id = null;

                if (isConfig && wc.id && window.id.trim() !== '') {
                    if (wc.id.includes('/')) {
                        rej('Invalid ID.');
                        return;
                    } else if (wc.id in hooks) {
                        rej('ID is already in use.');
                        return;
                    } else {
                        id = wc.id;
                    }
                } else {
                    id = uuidv4();
                    while (id in hooks) {
                        id = uuidv4();
                    }
                }

                var endpoint = (isConfig ? wc.endpoint : wc);
                endpoint = (endpoint !== null && endpoint.length > 0 ? (endpoint[0] === '/' ? endpoint.substr(1, endpoint.length) : endpoint) : '');

                const hookProcessor = ((isConfig && wc.hookProcessor) ? wc.hookProcessor : new BasicProcessor(PATH_HOOKS_LEVELS));
                const hookAuthentication = ((isConfig && wc.hookAuthentication) ? wc.hookAuthentication : new NoAuthentication());
                const subscriptionAuthentication = ((isConfig && wc.subscriptionAuthentication) ? wc.subscriptionAuthentication : new NoAuthentication());
                const bundleId = isConfig ? (wc.bundleId === '' ? null : wc.bundleId) : null;

                var hook = new Webhook(id, endpoint, bundleId,
                    wc.maxSubscriptions || maxSubscriptions,
                    hookProcessor,
                    hookAuthentication, subscriptionAuthentication);

                if (bundleId in bundles) {
                    var bundle = bundles[bundleId];
                    if (id in bundle.WebhookIds) {
                        rej('Hook is already in bundle');
                        return;
                    } else {
                        bundle.addWebhook(hook);
                    }
                }

                hooks[id] = hook;

                var result = {
                    id: id,
                    hookPath: `${PATH_HOOKS}/${id}/${endpoint}`,
                    subscriptionPath: `${PATH_HOOK_SUBSCRIPTION}/${id}`
                };

                if (hook.hasWebhookToken()) {
                    data.hookAuthenticationToken = hook.getWebhookToken();
                }

                if (hook.hasSubscriptionToken()) {
                    data.subscriptionAuthenticationToken = hook.getSubscriptionToken();
                }

                res(result);
            });
        }

        this.deleteWebhook = (id) => {
            return new Promise((res, rej) => {
                if (id in hooks) {
                    const hook = hooks[id];

                    hook.runForEachSubscription(wc => wc.ws.close());

                    if (hook.BundleId !== null && hook.BundleId in bundles) {
                        bundles[hook.BundleId].removeWebhook(id);
                    }

                    delete hooks[id];

                    res();
                } else {
                    rej(`Hook '${id}' does not exist.`)
                }
            });
        }

        this.addBundle = (bc) => {
            return new Promise((res, rej) => {
                if (!bc['id']) bc.id = null;
                if (!bc['subscriptionAuthentication']) bc.subscriptionAuthentication = null;
                if (!bc['maxSubscriptions']) bc.maxSubscriptions = null;
                if (!bc['webhooks']) bc.webhooks = [];

                var id = null;

                if (bc.id !== null) {
                    if (bc.id.includes('/')) {
                        rej('Invalid ID.');
                        return;
                    } else if (bc.id in bundles) {
                        rej('ID is already in use.');
                        return;
                    } else {
                        id = bc.id;
                    }
                } else {
                    id = uuidv4();
                    while (id in bundles) {
                        id = uuidv4();
                    }
                }

                const subscriptionAuthentication = bc.subscriptionAuthentication || new NoAuthentication();

                var bundle = new Bundle(id, bc.maxSubscriptions || maxSubscriptions, subscriptionAuthentication);

                bundles[id] = bundle;


                if (bundle.hasSubscriptionToken()) {
                    data.subscriptionAuthenticationToken = bundle.getSubscriptionToken();
                }

                var result = {
                    id: id,
                    subscriptionPath: `${PATH_BUNDLE_SUBSCRIPTION}/${id}`
                };

                if (Array.isArray(bc.webhooks)) {
                    Promise.all(bc.webhooks.map(wc => {
                        if (!wc['bundleId']) wc['bundleId'] = id;
                        return this.addWebhook(wc);
                    }))
                        .then(webhooks => {
                            result.webhooks = webhooks;
                        })
                        .finally(() => res(result));
                } else {
                    res(result);
                }
            });
        }

        this.deleteBundle = (id) => {
            return new Promise((res, rej) => {
                if (id in bundles) {
                    const bundle = bundles[id];

                    Promise.all(bundle.WebhookIds.map(s => this.deleteWebhook(s.id)))
                        .catch(e => {
                            console.error(e);
                        })
                        .finally(() => {
                            bundle.runForEachSubscription(wc => wc.ws.close());
                        })

                    delete bundles[id];

                    res();
                } else {
                    rej(`Bundle '${id}' does not exist.`)
                }
            });
        };


        this.app = express();

        this.app.use(cookieParser());
        this.app.use(bodyParser.urlencoded({ extended: false }));
        this.app.use(bodyParser.json());

        if (config.expressModule) app.use(config.expressModule);

        var httpServer = null, httpSubServer = null;
        var httpsServer = null, httpsSubServer = null;

        if (!useHttps && httpsOnly) {
            throw 'useHttps set as false and httpsOnly set true, can not be set at the same time.'
        }

        //Setup Hook/Subscription HTTP Server
        if (httpsOnly === false) {
            httpServer = http.createServer(this.app);

            if (webhookPort !== subscriptionPort) {
                httpSubServer = http.createServer(this.app);
                expressWS(this.app, httpSubServer);
            } else {
                expressWS(this.app, httpServer);
            }
        }

        //Setup Hook/Subscription HTTPS Server
        if (useHttps === true) {
            if (typeof credentials === 'object') {
                if (credentials.keyFile) {
                    credentials.key = fs.readFileSync(credentials.keyFile, 'utf8');
                }

                if (credentials.certFile) {
                    credentials.cert = fs.readFileSync(credentials.certFile, 'utf8');
                }

                if (!credentials.key || !credentials.cert) {
                    throw 'No HTTPS Key and/or Certificate';
                }
            } else {
                throw 'No HTTPS Credentials';
            }

            httpsServer = https.createServer(credentials, this.app)

            if (webhookPortSecure !== subscriptionPortSecure) {
                httpsSubServer = https.createServer(credentials, this.app);
                expressWS(this.app, httpsSubServer);
            } else {
                expressWS(this.app, httpsServer);
            }
        }


        this.app.post(`${PATH_HOOKS}/:id*`, (req, res) => {
            if (req.params.id && req.params.id in hooks) {
                const hook = hooks[req.params.id];

                hook.verifyWebhookRequest(req)
                    .then(result => {
                        if (result.verified) {
                            res.send(200);

                            hook.processDataFromRequest(req, hook)
                                .then(data => {
                                    try {
                                        hook.runForEachSubscription(wc => wc.ws.send(data));

                                        if (hook.BundleId && hook.BundleId in bundles) {
                                            bundles[hook.BundleId].runForEachSubscription(wc => wc.ws.send(data));
                                        }

                                        if (debug) console.debug(`Webhook (${hook.Id}) - Processed`);
                                    } catch (e) {
                                        console.error(e);
                                    }
                                });
                        } else {
                            if (debug) console.warn(`Webhook (${hook.Id}) - Authorization Failed`);
                            res.send(401);
                        }
                    })
                    .catch(e => {
                        console.error(e);
                        res.send(500);
                    });
            } else {
                if (debug) console.warn(`Webhook (${hook.Id}) - Not Found`);
                res.send(400);
            }
        });


        function proccessSubscription(ws, req, subs) {
            const id = req.params.id;

            const closeSocket = (ws, code, message) => {
                try {
                    ws.send(`(${code}) ${message}`);
                    ws.close(code, message);
                } catch {
                    //
                }
            };

            if (id in subs) {
                const sub = subs[id];
                sub.verifySubscriptionRequest(req, sub)
                    .then(result => {
                        if (result.verified) {
                            if (sub.SubscriptionsMaxed) {
                                closeSocket(ws, ERROR_CODES.MAX_SUBSCRIPTIONS_REACHED.code, ERROR_CODES.MAX_SUBSCRIPTIONS_REACHED.message);
                                if (debug) console.debug(`Subscription (${sub.Id}) - Max Subscriptions Reached`);
                            } else {
                                const conn = {
                                    ws: ws,
                                    id: result.id,
                                    connId: uuidv4()
                                };

                                sub.addSubscription(conn);

                                ws.on('message', (msg) => {
                                    //messages do not need to be processed
                                });

                                ws.on('close', () => {
                                    sub.removeSubscription(conn.connId);
                                    if (debug) console.debug(`Subscription (${sub.Id}) - Connection Closed (${conn.id}|${conn.connId})`);
                                });

                                if (debug) console.debug(`Subscription (${sub.Id}) - Connection Opened (${conn.id}|${conn.connId})`);
                            }
                        } else {
                            closeSocket(ws, ERROR_CODES.AUTHORIZATION_FAILED.code, ERROR_CODES.AUTHORIZATION_FAILED.message);
                            if (debug) console.warn(`Subscription (${sub.Id}) - Authorization Failed`);
                        }
                    })
                    .catch(e => {
                        closeSocket(ws, ERROR_CODES.AUTHENTICATION_ERROR.code, ERROR_CODES.AUTHENTICATION_ERROR.message);
                        console.error(e);
                    });
            } else {
                closeSocket(ws, ERROR_CODES.INVALID_SUBSCRIPTION_ID.code, ERROR_CODES.INVALID_SUBSCRIPTION_ID.message);
                if (debug) console.debug(`Subscription (${sub.Id}) - Not Found`);
            }
        }

        this.app.ws(`${PATH_HOOK_SUBSCRIPTION}/:id*`, (ws, req) => proccessSubscription(ws, req, hooks));

        this.app.ws(`${PATH_BUNDLE_SUBSCRIPTION}/:id*`, (ws, req) => proccessSubscription(ws, req, bundles));

        this.app.all('*', (req, res) => {
            res.send(400);
        });


        this.listen = () => {
            //Start HTTP Server
            if (httpServer) {
                if (httpSubServer) {
                    httpServer.listen(webhookPort, () => {
                        console.debug(`HTTP Webhook Server Started on port ${webhookPort}.`);
                    });

                    httpSubServer.listen(subscriptionPort, () => {
                        console.debug(`HTTP Subscription Server Started on port ${subscriptionPort}.`);
                    });
                } else {
                    httpServer.listen(webhookPort, () => {
                        console.debug(`HTTP Webhook and Subscription Server Started on port ${webhookPort}.`);
                    });
                }
            }

            //Start HTTPS Server
            if (httpsServer) {
                if (httpsSubServer) {
                    httpsServer.listen(webhookPortSecure, () => {
                        console.debug(`HTTPS Webhook Server Started on port ${webhookPortSecure}.`);
                    });

                    httpsSubServer.listen(subscriptionPortSecure, () => {
                        console.debug(`HTTPS Subscription Server Started on port ${subscriptionPortSecure}.`);
                    });
                } else {
                    httpsServer.listen(webhookPortSecure, () => {
                        console.debug(`HTTPS Webhook and Subscription Server Started on port ${webhookPortSecure}.`);
                    });
                }
            }
        }
    }
}

function sanitizePath(path) {
    if (path == null || path == undefined) throw 'Invalid Path';
    if (path[0] !== '/') path = `/${path}`;
    if (path[path.length - 1] == '/') path = path.substr(0, path.length - 1);
    return path;
}


module.exports = WebhookRelayServer;