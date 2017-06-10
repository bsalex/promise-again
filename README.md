# promise-again

Yet another wrapper for functions that return promise to retry rejected attempts.  
But this one with advanced **flexibility**.  

---

## Usage

```
import promiseAgain from 'promise-again';

function someFunctionReturningAPromise() {
    ...
}

const wrappedFunction = promiseAgain(
    /**
    * A function that returns a promise
    **/
    someFunctionReturningAPromise,
    {
        /**
        * Optional. Delay in milisecconds or a function that returns a delay 
        * or a function that returns a promise that resolves to a delay.
        * 
        * @param reason - reason of the last rejection;
        * @param attempt - number of used attempts;
        * @param ...args - last attempt arguments;
        *
        * @returns {number | Promise<number>} - modified arguments to be used in the next attempt or a promise that is resolved to such arguments;
        **/
        delay: number | ((attempt: number, ...args: any[]) => number | Promise<number>);
        
        /**
        * Required. Number of attempts or function that returns true or a Promise that resolved to true if retry is needed;
        * 
        * @param reason - reason of the last rejection;
        * @param attempt - number of used attempts;
        * @param ...args - last attempt arguments;
        *
        * @returns {boolean | Promise<any[]>} - modified arguments to be used in the next attempt or a promise that is resolved to such arguments;
        **/
        attempts: number | ((attempt: number, ...args: any[]) => boolean | Promise<boolean>);
        
        /**
        * Optional. Function that is called before every retry attempt to modify next attempt arguments;
        * 
        * @param reason - reason of the last rejection;
        * @param attempt - number of used attempts;
        * @param ...args - last attempt arguments;
        *
        * @returns {any[] | Promise<any[]>} - modified arguments to be used in the next attempt or a promise that is resolved to such arguments;
        **/
        retryArgumentsInterceptor: (reason: any, attempt: number, ...args: any[]) => any[] | Promise<any[]>;
    }
)

```
