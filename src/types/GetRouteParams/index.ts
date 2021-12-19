export type GetRouteParams<S extends string> = string extends S
    ? Record<string, string>
    : S extends `${infer _Start}:${infer Param}/${infer Rest}`
        ? { [K in Param | keyof GetRouteParams<Rest>]: string }
        : S extends `${infer _Start}:${infer Param}`
            ? { [K in Param]: string }
            : {};
