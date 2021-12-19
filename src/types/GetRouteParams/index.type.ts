import { AssertTrue as Assert, IsExact } from 'conditional-type-checks';
import { GetRouteParams } from './';

type cases = [
  Assert<IsExact<GetRouteParams<'/'>, {}>>,
  Assert<IsExact<GetRouteParams<'/:id'>, { id: string }>>,
  // can repeat it twice
  Assert<IsExact<GetRouteParams<'/:id/:id'>, { id: string }>>,
  Assert<IsExact<GetRouteParams<'/:id/:type'>, { id: string; type: string }>>,
  // order doesn't matter
  Assert<IsExact<GetRouteParams<'/:type/:id'>, { id: string; type: string }>>
];
