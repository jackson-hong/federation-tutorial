const { ApolloServer } = require('@apollo/server');
const { serializeQueryPlan } = require('@apollo/query-planner');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } = require("@apollo/gateway");

const supergraphSdl = new IntrospectAndCompose({
  // This entire subgraph list is optional when running in managed federation
  // mode, using Apollo Studio as the source of truth.  In production,
  // using a single source of truth to compose a schema is recommended and
  // prevents composition failures at runtime using schema validation using
  // real usage-based metrics.
  subgraphs: [
    { name: "fundamental", url: "http://localhost:4001/" },
    { name: "connect", url: "http://localhost:4002/" },
    
  ],
});

class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }) {
    request.http.headers.set('Authorization', context.authorization);
  }
}

const gateway = new ApolloGateway({
  supergraphSdl,
  buildService({ name, url }) {
    return new AuthenticatedDataSource({ name, url });
  },
  experimental_didResolveQueryPlan: function(options) {
    if (options.requestContext.operationName !== 'IntrospectionQuery') {
      console.log(serializeQueryPlan(options.queryPlan));
    }
  }
});

(async () => {
  const server = new ApolloServer({ gateway });

  const { url } = await startStandaloneServer(server, {
    context: ({ req }) => {
      // Get the user token from the headers
      const authorization = req.headers.authorization || '';
      
      return { authorization };
    },
  });
  console.log(`🚀  Server ready at ${url}`);
})();