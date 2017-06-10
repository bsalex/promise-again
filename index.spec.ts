import {expect} from 'chai';
import * as promiseDelay from 'delay';
import 'mocha';
import * as sinon from 'sinon';
import promiseAgain from './index';

function freePromisesQueue(clock: sinon.SinonFakeTimers, n: number = 10) {
    return () => {
        let result = promiseDelay(0);

        for (let i = 0; i < n; i++) {
            result = result.then(() => { const pr = promiseDelay(0); clock.tick(0); return pr; });
        }

        clock.tick(0);

        return result;
    };
}

function promiseDelayAndFreeQueue(delay: number, clock: sinon.SinonFakeTimers, n: number = 10): Promise<any> {
    return freePromisesQueue(clock, n)().then(promiseDelay(delay)).then(freePromisesQueue(clock, n));
}

describe('promiseAgain', () => {
    let clock: sinon.SinonFakeTimers;

    beforeEach(() => {
        clock = sinon.useFakeTimers();
    });

    afterEach(() => {
        clock.restore();
    });

    it('should get value using attempts', (done) => {
        const func = sinon.stub();

        func.onCall(0).rejects('Some reason');
        func.onCall(1).rejects('Some reason');
        func.onCall(2).resolves('Needed value');

        const composedFunction = promiseAgain(func, {attempts: 5});
        composedFunction().then((value) => {
            expect(value).to.equal('Needed value');
            done();
        });

        freePromisesQueue(clock)();
    });

    it('should not get value if there are not anough attempts', (done) => {
        const func = sinon.stub();

        func.onCall(0).rejects('Some reason 1');
        func.onCall(1).rejects('Some reason 2');
        func.onCall(2).resolves('Needed value');

        const composedFunction = promiseAgain(func, {attempts: 2});
        composedFunction().then(() => {
            throw new Error('Should not succeed');
        }).catch((reason) => {
            expect(reason.toString()).to.equal('Some reason 2');
            done();
        });

        freePromisesQueue(clock)();
    });

    it('should use attempts function to decide if retry needed', (done) => {
        const func = sinon.stub();

        func.onCall(0).rejects('Some reason 1');
        func.onCall(1).rejects('Some reason 2');
        func.onCall(2).resolves('Needed value');

        const attempts = sinon.stub();

        attempts.onCall(0).returns(true);
        attempts.onCall(1).returns(false);

        const composedFunction = promiseAgain(func, {attempts});
        composedFunction().then(() => {
            throw new Error('Should not succeed');
        }).catch((reason) => {
            expect(reason.toString()).to.equal('Some reason 2');
            done();
        });

        freePromisesQueue(clock)();
    });

    it('should use attempts function returning a promise to decide if retry needed', (done) => {
        const func = sinon.stub();

        func.onCall(0).rejects('Some reason 1');
        func.onCall(1).rejects('Some reason 2');
        func.onCall(2).resolves('Needed value');

        const attempts = sinon.stub();

        attempts.onCall(0).resolves(true);
        attempts.onCall(1).resolves(false);

        const composedFunction = promiseAgain(func, {attempts});
        composedFunction().then(() => {
            throw new Error('Should not succeed');
        }).catch((reason) => {
            expect(reason.toString()).to.equal('Some reason 2');
            done();
        });

        freePromisesQueue(clock)();
    });

    it('should call attempts dunction with reason, sequentially changing args and attempts count', (done) => {
        const func = sinon.stub();

        func.onCall(0).rejects('Some reason 1');
        func.onCall(1).rejects('Some reason 2');
        func.onCall(2).resolves('Needed value');

        const attempts = sinon.stub();
        attempts.onCall(0).returns(true);
        attempts.onCall(1).returns(true);

        const composedFunction = promiseAgain(func, {attempts});
        composedFunction(1, 2, 3, 'some arg').then(() => {
            expect(attempts.callCount).to.equal(2);

            expect(
                attempts.calledWithExactly(
                    sinon.match({name: 'Some reason 1'}), 1, 1, 2, 3, 'some arg',
                ),
            ).to.equal(true);

            expect(
                attempts.calledWithExactly(
                    sinon.match({name: 'Some reason 2'}), 2, 1, 2, 3, 'some arg',
                ),
            ).to.equal(true);

            done();
        });

        freePromisesQueue(clock)();
    });

    it('should pass all function arguments to wrapped function', (done) => {
        const func = sinon.stub();

        func.onCall(0).rejects('Some reason 1');
        func.onCall(1).rejects('Some reason 2');
        func.onCall(2).resolves('Needed value');

        const composedFunction = promiseAgain(func, {attempts: 5});
        composedFunction(1, 2, 3, 'some arg').then(() => {
            expect(func.alwaysCalledWith(1, 2, 3, 'some arg')).to.equal(true);
            done();
        });

        freePromisesQueue(clock)();
    });

    it('should call the original function with result of retryArgumentsInterceptor', (done) => {
        const func = sinon.stub();

        func.onCall(0).rejects('Some reason 1');
        func.onCall(1).rejects('Some reason 2');
        func.onCall(2).resolves('Needed value');

        const retryArgumentsInterceptor = sinon.stub();
        retryArgumentsInterceptor.onCall(0).returns([5, 6, 7]);
        retryArgumentsInterceptor.onCall(1).returns([8, 9, 10]);

        const composedFunction = promiseAgain(func, {attempts: 5, retryArgumentsInterceptor});
        composedFunction(1, 2, 3, 'some arg').then(() => {
            expect(func.callCount).to.equal(3);
            expect(func.calledWithExactly(1, 2, 3, 'some arg')).to.equal(true);
            expect(func.calledWithExactly(5, 6, 7)).to.equal(true);
            expect(func.calledWithExactly(8, 9, 10)).to.equal(true);
            done();
        });

        freePromisesQueue(clock)();
    });

    it('should call the original function with result of retryArgumentsInterceptor returning a promise', (done) => {
        const func = sinon.stub();

        func.onCall(0).rejects('Some reason 1');
        func.onCall(1).rejects('Some reason 2');
        func.onCall(2).resolves('Needed value');

        const retryArgumentsInterceptor = sinon.stub();
        retryArgumentsInterceptor.onCall(0).resolves([5, 6, 7]);
        retryArgumentsInterceptor.onCall(1).resolves([8, 9, 10]);

        const composedFunction = promiseAgain(func, {attempts: 5, retryArgumentsInterceptor});
        composedFunction(1, 2, 3, 'some arg').then(() => {
            expect(func.callCount).to.equal(3);
            expect(func.calledWithExactly(1, 2, 3, 'some arg')).to.equal(true);
            expect(func.calledWithExactly(5, 6, 7)).to.equal(true);
            expect(func.calledWithExactly(8, 9, 10)).to.equal(true);
            done();
        });

        freePromisesQueue(clock)();
    });

    it('should call retryArgumentsInterceptor with reason, sequentially changing args and attempts count', (done) => {
        const func = sinon.stub();

        func.onCall(0).rejects('Some reason 1');
        func.onCall(1).rejects('Some reason 2');
        func.onCall(2).resolves('Needed value');

        const retryArgumentsInterceptor = sinon.stub();
        retryArgumentsInterceptor.onCall(0).returns([5, 6, 7]);
        retryArgumentsInterceptor.onCall(1).returns([8, 9, 10]);

        const composedFunction = promiseAgain(func, {attempts: 5, retryArgumentsInterceptor});
        composedFunction(1, 2, 3, 'some arg').then(() => {
            expect(retryArgumentsInterceptor.callCount).to.equal(2);

            expect(
                retryArgumentsInterceptor.calledWithExactly(
                    sinon.match({name: 'Some reason 1'}), 1, 1, 2, 3, 'some arg',
                ),
            ).to.equal(true);

            expect(
                retryArgumentsInterceptor.calledWithExactly(
                    sinon.match({name: 'Some reason 2'}), 2, 5, 6, 7,
                ),
            ).to.equal(true);

            done();
        });

        freePromisesQueue(clock)();
    });

    it('should use a delay between retry calls', (done) => {
        const func = sinon.stub();

        func.onCall(0).rejects('Some reason 1');
        func.onCall(1).rejects('Some reason 2');
        func.onCall(2).resolves('Needed value');

        const composedFunction = promiseAgain(func, {attempts: 5, delay: 100});
        composedFunction(1, 2, 3, 'some arg').then(() => {
            done();
        }).catch(() => {
            throw new Error('Catch');
        });

        expect(func.callCount).to.equal(1);

        promiseDelayAndFreeQueue(50, clock).then(() => {
            expect(func.callCount).to.equal(1);
        })
        .then(() => clock.tick(30));

        promiseDelayAndFreeQueue(80, clock).then(() => {
            expect(func.callCount).to.equal(1);
        })
        .then(() => clock.tick(75));

        promiseDelayAndFreeQueue(155, clock).then(() => {
            expect(func.callCount).to.equal(2);
        })
        .then(() => clock.tick(105));

        promiseDelayAndFreeQueue(260, clock).then(() => {
            expect(func.callCount).to.equal(3);
        })
        .then(() => clock.tick(105));

        clock.tick(50);
    });

    it('should use a delay function to get delay if provided', (done) => {
        const func = sinon.stub();

        func.onCall(0).rejects('Some reason 1');
        func.onCall(1).rejects('Some reason 2');
        func.onCall(2).resolves('Needed value');

        const delayFunction = sinon.stub();

        delayFunction.onCall(0).returns(100);
        delayFunction.onCall(1).returns(150);
        delayFunction.onCall(2).returns(250);

        const composedFunction = promiseAgain(func, {attempts: 5, delay: delayFunction});
        composedFunction(1, 2, 3, 'some arg').then(() => {
            done();
        }).catch(() => {
            throw new Error('Catch');
        });

        expect(func.callCount).to.equal(1);

        promiseDelayAndFreeQueue(50, clock).then(() => {
            expect(func.callCount).to.equal(1);
        })
        .then(() => clock.tick(30));

        promiseDelayAndFreeQueue(80, clock).then(() => {
            expect(func.callCount).to.equal(1);
        })
        .then(() => clock.tick(75));

        promiseDelayAndFreeQueue(155, clock).then(() => {
            expect(func.callCount).to.equal(2);
        })
        .then(() => clock.tick(205));

        promiseDelayAndFreeQueue(360, clock).then(() => {
            expect(func.callCount).to.equal(3);
        })
        .then(() => clock.tick(105));

        clock.tick(50);
    });

    it('should use a delay function returning a promise to get delay if provided', (done) => {
        const func = sinon.stub();

        func.onCall(0).rejects('Some reason 1');
        func.onCall(1).rejects('Some reason 2');
        func.onCall(2).resolves('Needed value');

        const delayFunction = sinon.stub();

        delayFunction.onCall(0).resolves(100);
        delayFunction.onCall(1).resolves(150);
        delayFunction.onCall(2).resolves(250);

        const composedFunction = promiseAgain(func, {attempts: 5, delay: delayFunction});
        composedFunction(1, 2, 3, 'some arg').then(() => {
            done();
        }).catch(() => {
            throw new Error('Catch');
        });

        expect(func.callCount).to.equal(1);

        promiseDelayAndFreeQueue(50, clock).then(() => {
            expect(func.callCount).to.equal(1);
        })
        .then(() => clock.tick(30));

        promiseDelayAndFreeQueue(80, clock).then(() => {
            expect(func.callCount).to.equal(1);
        })
        .then(() => clock.tick(75));

        promiseDelayAndFreeQueue(155, clock).then(() => {
            expect(func.callCount).to.equal(2);
        })
        .then(() => clock.tick(205));

        promiseDelayAndFreeQueue(360, clock).then(() => {
            expect(func.callCount).to.equal(3);
        })
        .then(() => clock.tick(105));

        clock.tick(50);
    });

    it('should pass reason, attempts count and sequential changing arguments to delay function', (done) => {
        const func = sinon.stub();

        func.onCall(0).rejects('Some reason 1');
        func.onCall(1).rejects('Some reason 2');
        func.onCall(2).resolves('Needed value');

        const retryArgumentsInterceptor = sinon.stub();
        retryArgumentsInterceptor.onCall(0).returns([5, 6, 7]);
        retryArgumentsInterceptor.onCall(1).returns([8, 9, 10]);

        const delayFunction = sinon.stub();
        delayFunction.returns(100);

        const composedFunction = promiseAgain(func, {
            attempts: 5,
            delay: delayFunction,
            retryArgumentsInterceptor,
        });
        composedFunction(1, 2, 3, 'some arg').then(() => {
            expect(delayFunction.callCount).to.equal(2);
            expect(
                delayFunction.calledWithExactly(sinon.match({name: 'Some reason 1'}), 1, 1, 2, 3, 'some arg'),
            ).to.equal(true);

            expect(
                delayFunction.calledWithExactly(sinon.match({name: 'Some reason 2'}), 2, 5, 6, 7),
            ).to.equal(true);

            done();
        }).catch(() => {
            throw new Error('Catch');
        });

        expect(func.callCount).to.equal(1);

        promiseDelayAndFreeQueue(50, clock)
        .then(() => clock.tick(30));

        promiseDelayAndFreeQueue(80, clock)
        .then(() => clock.tick(75));

        promiseDelayAndFreeQueue(155, clock)
        .then(() => clock.tick(105));

        promiseDelayAndFreeQueue(260, clock)
        .then(() => clock.tick(105));

        clock.tick(50);
    });
});
