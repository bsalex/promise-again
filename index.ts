import * as promiseDelay from 'delay';

export interface IOptions {
    delay?: number | ((attempt: number, ...args: any[]) => number | Promise<number>);
    attempts: number | ((attempt: number, ...args: any[]) => boolean | Promise<boolean>);
    retryArgumentsInterceptor?: (reason: any, attempt: number, ...args: any[]) => any[] | Promise<any[]>;
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

                const newArguments = options.retryArgumentsInterceptor ?
                    (options.retryArgumentsInterceptor(reason, usedAttempts, ...innerArgs) || []) : innerArgs;

                let shouldRetry: boolean | Promise<boolean> = false;

                if (typeof options.attempts === 'number') {
                    shouldRetry = usedAttempts < options.attempts;
                } else {
                    shouldRetry = options.attempts(usedAttempts, ...innerArgs);
                }

                let nextDelay: number | Promise<number> = 0;

                if (typeof options.delay === 'number') {
                    nextDelay = options.delay;
                } else if (typeof options.delay === 'function') {
                    nextDelay = options.delay(usedAttempts, ...innerArgs);
                }

                return Promise.all([shouldRetry, nextDelay, newArguments]).then(
                    ([resolvedShouldRetry, resolvedNextDelay, resolvedNewArguments = []]) => {
                        if (resolvedShouldRetry) {
                            return promiseDelay(resolvedNextDelay)
                                .then(() => attempt(...resolvedNewArguments))
                                .catch((subReason: any) => Promise.reject(subReason));
                        } else {
                            return Promise.reject(reason);
                        }
                    },
                );
            });
        }(...args);
    };
}
