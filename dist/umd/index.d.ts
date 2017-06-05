export interface IOptions {
    delay?: number | ((attempt: number, ...args: any[]) => number);
    attempts: number | ((attempt: number, ...args: any[]) => boolean);
    retryArgumentsInterceptor?: (attempt: number, ...args: any[]) => any[];
    onCatch?: (reason: any, attempt: number, ...args: any[]) => void;
}
export default function promiseAgain<T>(func: (...args: any[]) => Promise<T>, options: IOptions): (...args: any[]) => Promise<T>;
