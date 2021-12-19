import { createRoute } from '../src/create-route';
import { createHistoryRouter } from '../src/create-history-router';

// 1. with specifying Params in createRoute

createHistoryRouter({
  routes: [
    { path: '/posts/:postId', route: createRoute<{ postId: string }>() },
  ],
});

createHistoryRouter({
  routes: [
    { path: '/posts/:postId1', route: createRoute<{ postId1: string }>() },
    { path: '/posts/:postId2', route: createRoute<{ postId2: string }>() },
  ],
});

// 2. with inference of Params in createRoute

createHistoryRouter({
  routes: [{ path: '/posts/:postId', route: createRoute() }],
});

createHistoryRouter({
  routes: [
    { path: '/posts/:postId1', route: createRoute() },
    { path: '/posts/:postId2', route: createRoute() },
  ],
});
