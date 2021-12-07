
export class Subject<T> implements Observer<T>, Observable<T> {

    private observers: Observer<T>[] = [];

    subscribe(observer?: Observer<T>): Subscribtion;
    subscribe(next?: OnNext<T>, error?: OnError, completed?: OnComplete): Subscribtion;
    subscribe(observerOrNext?: Observer<T> | OnNext<T>, error?: OnError, complete?: OnComplete) {
        return null;
    }

    next(value: T): void {}

    error(error: Error): void {}

    complete(): void {}
}

export interface Subscribtion {
    unsubscribe(): void;
}

export type OnNext<T> = (value: T) => void;
export type OnError = (error: Error) => void;
export type OnComplete = () => void;

export interface Observable<T> {
    // subscribe(observer: Observer<T>): Subscribtion;
    subscribe(next?: OnNext<T>, error?: OnError, completed?: OnComplete): Subscribtion;
}

export function isObservable<T>(value: any): value is Observable<T> {
    return "subscribe" in value;
}

export interface Observer<T> {
    next(value: T): void;
    error?(error: Error): void;
    complete?(): void;
}

export function isObserver<T>(value: any): value is Observer<T> {
    return "next" in value;
}

export type ObserverFunction<T> = (onNext?: OnNext<T>, error?: OnError, complete?: OnComplete) => Subscribtion;

export function interval(period: number): Observable<number> {

    function subscribe(
        observerOrNext: ObserverOrNext<number> = _,
        error: OnError = _,
        complete: OnComplete = _
    ): Subscribtion {

        let value = 0;
        const onNext = toNext(observerOrNext);
        const interval = setInterval(() => onNext(value++), period);

        function unsubscribe() {
            clearInterval(interval);
        }

        return { unsubscribe };
    }

    return { subscribe };
}

export type Operator<TInput, TResult> = (source: Observable<TInput>) => Observable<TResult>;

export type ObserverOrNext<T> = Observer<T> | OnNext<T>;

function toNext<T>(observerOrNext?: ObserverOrNext<T>): OnNext<T> {
    return isObserver<T>(observerOrNext) ? observerOrNext.next : observerOrNext;
}

const _ = (value?: any): any => value;

export function take<T>(n: number): Operator<T, T> {

    return toOperator((value, onNext, onError, onComplete, unsubscribe) => {
        try {
            if (n > 0) {
                onNext(value);
                n--;
            } else {
                onComplete();
                unsubscribe();
            }
        } catch(e) {
            onError(e);
        }
    });
}

export function create<T>(subscribe: ObserverFunction<T>): Observable<T> {
    return { subscribe };
}

export function of<T>(...values: T[]): Observable<T> {

    return create((onNext, onError, onComplete) => {

            let unsubscribed = false;

            for (const value of values) {

                if (unsubscribed) break;

                try {
                    onNext(value);
                } catch(e) {
                    onError(e);
                }
            }

            onComplete();

            function unsubscribe() { unsubscribed = true; }

            return { unsubscribe };

        }
    );
}

export function scan<T, R>(next: (acc: R, value: T) => R, seed?: R): Operator<T, R> {
    let acc = seed;
    return toOperator((value, onNext) => onNext(acc = next(acc, value)));
}

export function toOperator<T, R>(fn: (value, next, error, complete, unsubscribe) => void): Operator<T, R> {

    return function operator(source: Observable<T>): Observable<R> {

        function subscribe(
            observerOrNext: ObserverOrNext<R> = _,
            error: OnError = _,
            complete: OnComplete = _
        ): Subscribtion {

            const onNext = toNext(observerOrNext);

            const subscribtion = source.subscribe(
                value => {
                    try {
                        fn(value, onNext, error, complete, unsubscribe);
                    } catch (e) {
                        error(e);
                    }
                },
                error,
                complete
            );

            function unsubscribe() {
                subscribtion.unsubscribe();
            }

            return { unsubscribe };
        }

        return { subscribe };
    };
}

export type OperatorOrObservable = Operator<any, any> | Observable<any>;

export function pipe(observable: Observable<any>, ...operators: Operator<any, any>[]): Observable<any> {
    return operators.reduce((acc, operator) => operator(acc), observable);
}

export function retry<T>(n: number): Operator<T, T> {

    return function retry(source: Observable<T>): Observable<T> {

        const subscribe: ObserverFunction<T> = (onNext, onError, onComplete) => {

            source.subscribe(
                onNext,
                error => {
                    n--;
                    if (n <= 0) onError(error);
                    else subscribe(onNext, onError, onComplete);
                },
                onComplete
            );

            function unsubscribe() { }

            return { unsubscribe };
        };

        return { subscribe };
    }

}

function main() {

    const stream = pipe(
        interval(100),
        take(5),
        scan((s, i) => s + i, 0)
    );

    stream.subscribe(console.log);

    of(1, 2, 3).subscribe(console.log, _, () => console.log('complete'));

    // setTimeout(() => subscribtion.unsubscribe(), 15000);
}

main();
