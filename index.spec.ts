import {expect} from 'chai';
import * as promiseDelay from 'delay';
import 'mocha';
import * as sinon from 'sinon';
import promiseAgain from './index';

describe('promiseAgain', () => {
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
    });

    it('should call retryArgumentsInterceptor for attempts count and original arguments', (done) => {
        const func = sinon.stub();

        func.onCall(0).rejects('Some reason 1');
        func.onCall(1).rejects('Some reason 2');
        func.onCall(2).resolves('Needed value');

        const retryArgumentsInterceptor = sinon.stub();
        retryArgumentsInterceptor.returns([1, 2, 3, 'some arg']);

        const composedFunction = promiseAgain(func, {attempts: 5, retryArgumentsInterceptor});
        composedFunction(1, 2, 3, 'some arg').then(() => {
            expect(retryArgumentsInterceptor.callCount).to.equal(2);
            expect(retryArgumentsInterceptor.calledWithExactly(1, 1, 2, 3, 'some arg')).to.equal(true);
            expect(retryArgumentsInterceptor.calledWithExactly(2, 1, 2, 3, 'some arg')).to.equal(true);
            done();
        });
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
    });

    it('should call retryArgumentsInterceptor with sequentially changing args and attempts count', (done) => {
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
            expect(retryArgumentsInterceptor.calledWithExactly(1, 1, 2, 3, 'some arg')).to.equal(true);
            expect(retryArgumentsInterceptor.calledWithExactly(2, 5, 6, 7)).to.equal(true);
            done();
        });
    });

    it('should use a delay between retry calls', (done) => {
        const clock = sinon.useFakeTimers();
        const func = sinon.stub();

        func.onCall(0).rejects('Some reason 1');
        func.onCall(1).rejects('Some reason 2');
        func.onCall(2).resolves('Needed value');

        const composedFunction = promiseAgain(func, {attempts: 5, delay: 100});
        composedFunction(1, 2, 3, 'some arg').then(() => {
            clock.restore();
            done();
        }).catch(() => {
            throw new Error('Catch');
        });

        expect(func.callCount).to.equal(1);

        promiseDelay(50).then(() => {
            expect(func.callCount).to.equal(1);
        })
        .then(() => clock.tick(30));

        promiseDelay(80).then(() => {
            expect(func.callCount).to.equal(1);
        })
        .then(() => clock.tick(75));

        promiseDelay(155).then(() => {
            expect(func.callCount).to.equal(2);
        })
        .then(() => clock.tick(105));

        promiseDelay(260).then(() => {
            expect(func.callCount).to.equal(3);
        })
        .then(() => clock.tick(105));

        clock.tick(50);
    });

    it('should use a delay function to get delay if provided', (done) => {
        const clock = sinon.useFakeTimers();
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
            clock.restore();
            done();
        }).catch(() => {
            throw new Error('Catch');
        });

        expect(func.callCount).to.equal(1);

        promiseDelay(50).then(() => {
            expect(func.callCount).to.equal(1);
        })
        .then(() => clock.tick(30));

        promiseDelay(80).then(() => {
            expect(func.callCount).to.equal(1);
        })
        .then(() => clock.tick(75));

        promiseDelay(155).then(() => {
            expect(func.callCount).to.equal(2);
        })
        .then(() => clock.tick(205));

        promiseDelay(360).then(() => {
            expect(func.callCount).to.equal(3);
        })
        .then(() => clock.tick(105));

        clock.tick(50);
    });

    it('should pass attempts count and sequential changing arguments to delay function', (done) => {
        const clock = sinon.useFakeTimers();
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
            clock.restore();

            expect(delayFunction.callCount).to.equal(2);
            expect(delayFunction.calledWithExactly(1, 1, 2, 3, 'some arg')).to.equal(true);
            expect(delayFunction.calledWithExactly(2, 5, 6, 7)).to.equal(true);

            done();
        }).catch(() => {
            throw new Error('Catch');
        });

        expect(func.callCount).to.equal(1);

        promiseDelay(50)
        .then(() => clock.tick(30));

        promiseDelay(80)
        .then(() => clock.tick(75));

        promiseDelay(155)
        .then(() => clock.tick(105));

        promiseDelay(260)
        .then(() => clock.tick(105));

        clock.tick(50);
    });

    it('should call onCatch with catch reason, attempts count and original arguments', (done) => {
        const func = sinon.stub();

        func.onCall(0).rejects('Some reason 1');
        func.onCall(1).rejects('Some reason 2');
        func.onCall(2).resolves('Needed value');

        const onCatch = sinon.spy();

        const composedFunction = promiseAgain(func, {attempts: 5, onCatch});
        composedFunction(1, 2, 3, 'some arg').then(() => {
            expect(onCatch.callCount).to.equal(2);

            expect(
                onCatch.calledWithExactly(sinon.match({name: 'Some reason 1'}), 1, 1, 2, 3, 'some arg'),
            ).to.equal(true);

            expect(
                onCatch.calledWithExactly(sinon.match({name: 'Some reason 2'}), 2, 1, 2, 3, 'some arg'),
            ).to.equal(true);
            done();
        });
    });
});
