import { parse } from 'qs';
import { buildPath, matchPath } from './build-path';
import { History } from 'history';
import { RouteInstance, RouteParams, RouteQuery } from './types';
import {
  attach,
  createEffect,
  guard,
  sample,
  createStore,
  createEvent,
  scopeBind,
} from 'effector';
import { GetRouteParams } from './types/GetRouteParams';

type RouteObject<S extends string> = {
  route: RouteInstance<GetRouteParams<S>>;
  path: S;
};

type HistoryPushParams = {
  history: History;
  path: string;
  params: RouteParams;
  query: RouteQuery;
  method: 'replace' | 'push';
};

const historyPushFx = createEffect<HistoryPushParams, HistoryPushParams>(
  pushParams => {
    if (!pushParams.history) {
      throw new Error('[Routing] No history provided');
    }
    pushParams.history[pushParams.method](pushParams.path, {});
    return pushParams;
  }
);

type PushParams = Omit<HistoryPushParams, 'history'>;
type EnterParams<S extends string> = {
  route: RouteObject<S>;
  params: GetRouteParams<S>;
  query: RouteQuery;
};
type RecheckResult<S extends string> = {
  route: RouteObject<S>;
  params: GetRouteParams<S>;
  query: RouteQuery;
};

export const createHistoryRouter = <S extends string>(params: {
  routes: RouteObject<S>[];
}) => {
  const setHistory = createEvent<History>();

  // @ts-expect-error
  const $history = createStore<History>(null).on(
    setHistory,
    (_, nextHistory) => nextHistory
  );

  // historyPushFx for the current history
  const pushFx = attach({
    source: { history: $history },
    effect: historyPushFx,
    mapParams: (params: PushParams, { history }) => {
      return {
        history,
        ...params,
      };
    },
  });

  // Triggered whenever some route.open.doneData is triggered
  const enteredFx = createEffect<EnterParams<any>, PushParams>(
    ({ route, params, query }) => {
      const path = buildPath({ pathCreator: route.path, params, query });
      return { path, params, query, method: 'push' };
    }
  );

  // Recalculate entered/left routes
  const recheckFx = createEffect<
    { path: string; query: RouteQuery },
    { entered: RecheckResult<any>[]; left: RecheckResult<any>[] }
  >(({ path, query }) => {
    const entered = [] as RecheckResult<any>[];
    const left = [] as RecheckResult<any>[];

    for (const route of params.routes) {
      const { matches, params } = matchPath({
        pathCreator: route.path,
        actualPath: path,
      });
      // @ts-expect-error
      (matches ? entered : left).push({ route, params, query });
    }

    return { entered, left };
  });

  sample({
    clock: enteredFx.doneData,
    target: pushFx,
  });

  sample({
    clock: pushFx.doneData,
    target: recheckFx,
  });

  const routesEntered = recheckFx.doneData.map(({ entered }) => entered);
  const routesLeft = recheckFx.doneData.map(({ left }) => left);

  for (const routeObj of params.routes) {
    // Watch for route.open.doneData to build new path and push
    sample({
      clock: routeObj.route.navigate.doneData,
      fn: ({ params, query }) => ({ route: routeObj, params, query }),
      target: enteredFx,
    });

    // Trigger .updated() for already opened routes marked as "opened"
    guard({
      clock: routesEntered.filterMap(recheckResults => {
        return recheckResults.find(
          recheckResult => recheckResult.route === routeObj
        );
      }),
      filter: routeObj.route.$isOpened.map(isOpened => isOpened),
      // @ts-expect-error
      target: routeObj.route.updated,
    });

    // Trigger .opened() for the routes marked as "opened"
    guard({
      clock: routesEntered.filterMap(recheckResults => {
        return recheckResults.find(
          recheckResult => recheckResult.route === routeObj
        );
      }),
      filter: routeObj.route.$isOpened.map(isOpened => !isOpened),
      // @ts-expect-error
      target: routeObj.route.opened,
    });

    // Trigger .left() for the routes marked as "left"
    guard({
      clock: routesLeft.filterMap(recheckResults => {
        return recheckResults.find(
          recheckResult => recheckResult.route === routeObj
        );
      }),
      filter: routeObj.route.$isOpened,
      target: routeObj.route.left,
    });
  }

  // Takes current path from history and triggers recalculate
  // Triggered on every history change + once when history instance is set
  const recheck = attach({
    source: { history: $history },
    effect: async ({ history }) => {
      const [path, query] = [
        history.location.pathname,
        parse(history.location.search.slice(1)) as RouteQuery,
      ];
      return { path, query };
    },
  });

  sample({
    source: recheck.doneData,
    target: recheckFx,
  });

  // Triggered whenever history instance is set
  const subscribeHistory = attach({
    source: { history: $history },
    effect: async ({ history }) => {
      let scopedRecheck = recheck;
      try {
        // @ts-expect-error
        scopedRecheck = scopeBind(recheck);
      } catch (err) {}
      history.listen(() => {
        scopedRecheck();
      });
      return true;
    },
  });

  sample({
    clock: subscribeHistory.doneData,
    target: recheck,
  });

  sample({
    clock: $history,
    target: subscribeHistory,
  });

  return {
    $history,
    setHistory,
    push: pushFx,
    routes: params.routes,
  };
};
