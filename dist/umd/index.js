(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "delay"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var promiseDelay = require("delay");
    function promiseAgain(func, options) {
        return function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var usedAttempts = 0;
            return function attempt() {
                var innerArgs = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    innerArgs[_i] = arguments[_i];
                }
                return func.apply(void 0, innerArgs).catch(function (reason) {
                    usedAttempts += 1;
                    var newArguments = options.retryArgumentsInterceptor ?
                        (options.retryArgumentsInterceptor.apply(options, [reason, usedAttempts].concat(innerArgs)) || []) : innerArgs;
                    var shouldRetry = false;
                    if (typeof options.attempts === 'number') {
                        shouldRetry = usedAttempts < options.attempts;
                    }
                    else {
                        shouldRetry = options.attempts.apply(options, [reason, usedAttempts].concat(innerArgs));
                    }
                    var nextDelay = 0;
                    if (typeof options.delay === 'number') {
                        nextDelay = options.delay;
                    }
                    else if (typeof options.delay === 'function') {
                        nextDelay = options.delay.apply(options, [reason, usedAttempts].concat(innerArgs));
                    }
                    return Promise.all([shouldRetry, nextDelay, newArguments]).then(function (_a) {
                        var resolvedShouldRetry = _a[0], resolvedNextDelay = _a[1], _b = _a[2], resolvedNewArguments = _b === void 0 ? [] : _b;
                        if (resolvedShouldRetry) {
                            return promiseDelay(resolvedNextDelay)
                                .then(function () { return attempt.apply(void 0, resolvedNewArguments); })
                                .catch(function (subReason) { return Promise.reject(subReason); });
                        }
                        else {
                            return Promise.reject(reason);
                        }
                    });
                });
            }.apply(void 0, args);
        };
    }
    exports.default = promiseAgain;
});
//# sourceMappingURL=index.js.map