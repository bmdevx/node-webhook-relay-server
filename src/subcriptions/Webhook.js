class Webhook extends require('./Subscribable') {

    constructor(id, endpoint, bundleId, maxSubscriptions, hookProcessor, hookVerification, subscribeVerification) {
        super(id, maxSubscriptions, subscribeVerification);

        this._endpoint = endpoint;
        this._bundleId = bundleId;
        this._hookProcessor = hookProcessor;
        this._hookVerification = hookVerification;

        this._params = [];
        this._endpoint.split('/').forEach((elem, index) => {
            if (elem && elem.trim() !== '' && elem.includes(':')) {
                this._params.push({
                    key: elem.trim().replace(':', ''),
                    index: index
                });
            }
        });
    }

    get Params() { return [...this._params]; }
    get Endpoint() { return this._endpoint; }
    get BundleId() { return this._bundleId; }


    hasWebhookToken = () => this._hookVerification.hasToken();
    getWebhookToken = () => this._hookVerification.getToken();
    verifyWebhookRequest = (req) => this._hookVerification.verify(req, this);

    processDataFromRequest = (req) => this._hookProcessor.process(req, this);
}

module.exports = Webhook;