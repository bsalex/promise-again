export interface IOptions {
    delay?: number | ((reason: any, attempt: number, ...args: any[]) => number | Promise<number>);
    attempts: number | ((reason: any, attempt: number, ...args: any[]) => boolean | Promise<boolean>);
    retryArgumentsInterceptor?: (reason: any, attempt: number, ...args: any[]) => any[] | Promise<any[]>;
}
export default function promiseAgain<T>(func: (...args: any[]) => Promise<T>, options: IOptions): (...args: any[]) => Promise<T>;
