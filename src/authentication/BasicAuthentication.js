class BasicAuthentication extends require('./BaseAuthentication') {

    constructor(username, password) {
        super(null);

        this._username = username;
        this._password = password;
    }

    verify(req, relay) {
        return new Promise((res, rej) => {
            // check for basic auth header
            if (!req.headers.authorization || req.headers.authorization.indexOf('Basic ') === -1) {
                rej('Missing Authorization Header');
            }

            // verify auth credentials
            const base64Credentials = req.headers.authorization.split(' ')[1];
            const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
            const [username, password] = credentials.split(':');

            res({ verified: (username === this._username && password === this._password), id: username });
        });
    }
}

module.exports = BasicAuthentication;