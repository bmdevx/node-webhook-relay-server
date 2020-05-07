class Bundle extends require('./Subscribable') {

    constructor(id, maxSubscriptions, subscribeVerification) {
        super(id, maxSubscriptions, subscribeVerification);

        this._webhooks = {};
    }

    get WebhookIds() { return Object.keys(this._webhooks); }

    addWebhook = (webhook) => this._webhooks[webhook.Id] = webhook;
    removeWebhook = (id) => delete this._webhooks[id];
}

module.exports = Bundle;