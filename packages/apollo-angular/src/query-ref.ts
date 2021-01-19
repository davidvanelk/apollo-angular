import {NgZone} from '@angular/core';
import {
  ApolloQueryResult,
  ObservableQuery,
  ApolloError,
  FetchMoreQueryOptions,
  FetchMoreOptions,
  SubscribeToMoreOptions,
  UpdateQueryOptions,
  NetworkStatus,
} from '@apollo/client/core';
import {Observable, from} from 'rxjs';

import {wrapWithZone, fixObservable} from './utils';
import {WatchQueryOptions, EmptyObject} from './types';

function useInitialLoading<T, V>(obsQuery: ObservableQuery<T, V>) {
  return function useInitialLoadingOperator<T>(
    source: Observable<T>,
  ): Observable<T> {
    return new Observable(function useInitialLoadingSubscription(subscriber) {
      const currentResult = obsQuery.getCurrentResult();
      const {loading, errors, error, partial, data} = currentResult;
      const {partialRefetch, fetchPolicy} = obsQuery.options;

      const hasError = errors || error;

      if (
        partialRefetch &&
        partial &&
        (!data || Object.keys(data).length === 0) &&
        fetchPolicy !== 'cache-only' &&
        !loading &&
        !hasError
      ) {
        subscriber.next({
          ...currentResult,
          loading: true,
          networkStatus: NetworkStatus.loading,
        } as any);
      }

      return source.subscribe(subscriber);
    });
  };
}

export class QueryRef<T, V = EmptyObject> {
  public valueChanges: Observable<ApolloQueryResult<T>>;
  public options: ObservableQuery<T, V>['options'];
  public queryId: ObservableQuery<T, V>['queryId'];
  public variables: V;

  constructor(
    private obsQuery: ObservableQuery<T, V>,
    ngZone: NgZone,
    options: WatchQueryOptions<V, T>,
  ) {
    const wrapped = wrapWithZone(from(fixObservable(this.obsQuery)), ngZone);

    this.valueChanges = options.useInitialLoading
      ? wrapped.pipe(useInitialLoading(this.obsQuery))
      : wrapped;
    this.queryId = this.obsQuery.queryId;
  }

  // ObservableQuery's methods

  public result(): Promise<ApolloQueryResult<T>> {
    return this.obsQuery.result();
  }

  public getCurrentResult(): ApolloQueryResult<T> {
    return this.obsQuery.getCurrentResult();
  }

  public getLastResult(): ApolloQueryResult<T> {
    return this.obsQuery.getLastResult();
  }

  public getLastError(): ApolloError {
    return this.obsQuery.getLastError();
  }

  public resetLastResults(): void {
    return this.obsQuery.resetLastResults();
  }

  public refetch(variables?: V): Promise<ApolloQueryResult<T>> {
    return this.obsQuery.refetch(variables);
  }

  public fetchMore<K extends keyof V>(
    fetchMoreOptions: FetchMoreQueryOptions<V, K> & FetchMoreOptions<T, V>,
  ): Promise<ApolloQueryResult<T>> {
    return this.obsQuery.fetchMore(fetchMoreOptions);
  }

  public subscribeToMore<MT = any, MV = EmptyObject>(
    options: SubscribeToMoreOptions<T, MV, MT>,
  ): () => void {
    // XXX: there's a bug in apollo-client typings
    // it should not inherit types from ObservableQuery
    return this.obsQuery.subscribeToMore(options as any);
  }
  public updateQuery(
    mapFn: (previousQueryResult: T, options: UpdateQueryOptions<V>) => T,
  ): void {
    return this.obsQuery.updateQuery(mapFn);
  }

  public stopPolling(): void {
    return this.obsQuery.stopPolling();
  }

  public startPolling(pollInterval: number): void {
    return this.obsQuery.startPolling(pollInterval);
  }

  public setOptions(opts: any) {
    return this.obsQuery.setOptions(opts);
  }

  public setVariables(variables: V) {
    return this.obsQuery.setVariables(variables);
  }
}
