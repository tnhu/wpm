wpm.config({
  router: {
    /* basePath is needed when application is not deployed to web server's root folder */
    //basePath: '/app-template/public',

    /* Application mounting point, default to document.body */
    appRootElement: document.body,

    /* Rewrite rules (this should be done better by web server configuration) */
    rewrite: {
      '/index.html': '/'
    }
  }
});
