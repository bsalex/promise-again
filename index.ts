import * as promiseDelay from 'delay';

export interface IOptions {
    delay?: number | ((attempt: number, ...args: any[]) => number);
    attempts: number | ((attempt: number, ...args: any[]) => boolean);
    retryArgumentsInterceptor?: (attempt: number, ...args: any[]) => any[];
    onCatch?: (reason: any, attempt: number, ...args: any[]) => void;
}

export default function promiseAgain<T>(
    func: (...args: any[]) => Promise<T>,
    options: IOptions,
) {
    return (...args: any[]) => {
        let usedAttempts: number = 0;

        return function attempt(...innerArgs: any[]): Promise<T> {
            return func(...innerArgs).catch((reason): Promise<T> => {
                usedAttempts += 1;

                if (options.onCatch) {
                    options.onCatch(reason, usedAttempts, ...innerArgs);
                }

                const newArguments = options.retryArgumentsInterceptor ?
                    (options.retryArgumentsInterceptor(usedAttempts, ...innerArgs) || []) : innerArgs;

                let shouldRetry = false;

                if (typeof options.attempts === 'number') {
                    shouldRetry = usedAttempts < options.attempts;
                } else {
                    shouldRetry = options.attempts(usedAttempts, ...innerArgs);
                }

                let nextDelay: number = 0;

                if (typeof options.delay === 'number') {
                    nextDelay = options.delay;
                } else if (typeof options.delay === 'function') {
                    nextDelay = options.delay(usedAttempts, ...innerArgs);
                }

                if (shouldRetry) {
                    return promiseDelay(nextDelay)
                            .then(() => attempt(...newArguments))
                            .catch((subReason: any) => Promise.reject(subReason));
                } else {
                    return Promise.reject(reason);
                }
            });
        }(...args);
    };
}
