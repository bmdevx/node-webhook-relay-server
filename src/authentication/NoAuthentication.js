class NoAuthorization extends require('./BaseAuthentication') {

    constructor() {
        super(null);
    }

    verify(req, relay) {
        return Promise.resolve({ verified: true, id: 0 });
    }
}

module.exports = NoAuthorization;