class BasicProcessor extends require('./BaseProcessor') {

    constructor(hookBaseLevels) {
        super();
        this._hookBaseLevels = hookBaseLevels;
    }

    process(req, webhook) {
        return new Promise((res, rej) => {
            var params = req.path.split('/').splice(this._hookBaseLevels, this._hookBaseLevels);

            var data = {};

            webhook.Params.forEach(p => {
                if (p.index < params.length) {
                    data[p.key] = params[p.index];
                }
            });

            res(JSON.stringify({
                source: req.ip,
                body: req.body,
                restData: data
            }));
        });
    }
}

module.exports = BasicProcessor