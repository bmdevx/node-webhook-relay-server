class Subscribable {

    constructor(id, maxSubscriptions, subscribeVerification) {
        this._id = id;
        this._maxSubscriptions = maxSubscriptions;
        this._subscribeVerification = subscribeVerification;

        this._subscriptions = {};
    }

    get Id() { return this._id; }
    get BundleId() { return this._bundleId; }
    get MaxSubscriptions() { return this._maxSubscriptions; }
    get HookVerification() { return this._hookVerification; }
    get SubscribeVerificationId() { return this._subscribeVerification; }

    get SubscriptionIds() { return Object.keys(this._subscriptions); }

    get SubscriptionsMaxed() { return Object.keys(this._subscriptions).length >= this._maxSubscriptions; }

    hasSubscriptionToken = () => this._subscribeVerification.hasToken();
    getSubscriptionToken = () => this._subscribeVerification.getToken();
    verifySubscriptionRequest = (req) => this._subscribeVerification.verify(req, this);

    runForEachSubscription = (func) => Object.values(this._subscriptions).forEach(func);

    addSubscription = (conn) => this._subscriptions[conn.connId] = conn;
    removeSubscription = (connId) => { delete this._subscriptions[connId]; }
}

module.exports = Subscribable;