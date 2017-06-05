import * as promiseDelay from 'delay';
export default function promiseAgain(func, options) {
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
                    shouldRetry = options.attempts.apply(options, [usedAttempts].concat(innerArgs));
                }
                var nextDelay = 0;
                if (typeof options.delay === 'number') {
                    nextDelay = options.delay;
                }
                else if (typeof options.delay === 'function') {
                    nextDelay = options.delay.apply(options, [usedAttempts].concat(innerArgs));
                }
                if (shouldRetry) {
                    return promiseDelay(nextDelay)
                        .then(function () { return attempt.apply(void 0, newArguments); })
                        .catch(function (subReason) { return Promise.reject(subReason); });
                }
                else {
                    return Promise.reject(reason);
                }
            });
        }.apply(void 0, args);
    };
}
//# sourceMappingURL=index.js.map