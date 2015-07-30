Class({
  main: function() {
    var Router = wpm.Router;
    var Route = wpm.Route;
    var rewriteRules = wpm.config('router').rewrite;

    for (var rule in rewriteRules) {
      console.log('wpm: Rewrite:', rule, ' to:', rewriteRules[rule]);

      Class(Route, {
        path: rule,
        enter: function() {
          // TODO This is not correct implementation, should construct uri from args, queryParams, and hash
          // not from route path
          var rewriteURI = rewriteRules[rule];

          Router.replaceWith(rewriteURI);
        }
      });
    }

    Router.replaceWith(Router.routeURIFromLocation());
  }
});
