class BaseProcessor {

    constructor() {
    }

    process(req, webhook) {
        return new Promise((res, rej) => {
            res(JSON.stringify({
                source: req.ip,
                body: req.body
            }));
        });
    }
}

module.exports = BaseProcessor