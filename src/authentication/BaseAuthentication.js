class BaseAuthentication {

    constructor(token = null) {
        this.token = token;
    }

    verify(req, relay) {
        return Promise.resolve({ verified: false, id: 0 });
    }

    hasToken() {
        return false;
    }

    getToken() {
        return this.token;
    }
}

module.exports = BaseAuthentication