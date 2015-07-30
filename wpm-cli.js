#!/usr/bin/env node

//--- Imports

var program = require("commander"),
    path    = require("path"),
    fs      = require("fs-extra"),
    shelljs = require("shelljs/global"),
    chalk   = require("chalk"),
    Class   = require("jsface").Class,

// --- Constants

    USER_HOME        = (process.platform === "win32") ? process.env.HOMEPATH : process.env.HOME,
    WPM_HOME         = path.join(USER_HOME, ".wpm"),

    EMPTY = "",

// --- Variables

    packageJson,

    // wpm information
    wpm = {
      git_url      : "https://github.com/tnhu/wpm.git",       // git repository where wpm lives
      home_dir     : WPM_HOME,                                // ~/.wpm where wpm will be cloned to
      build_json   : path.join(WPM_HOME, "build.json"),       // ~/.wpm/build.json
      config_json  : path.join(WPM_HOME, "config.json"),      // ~/.wpm/config.json
      registry_dir : path.join(WPM_HOME, "registry"),         // ~/.wpm/registry

      js           : "wpm.js"                                 // wpm.js
    },

    shell_commands = {
      git_clone: "git clone --depth 1 " + wpm.git_url + " " + wpm.home_dir,
      git_pull: "git pull"
    },

    app = {
      modules         : "modules",
      build           : "build",
      json            : "wp.json",

      cwd             : process.cwd()  // current working directory
    },

// --- i18n

    i18n = {
      git_required: "Sorry, wpm requires git. Please install git (http://git-scm.com/) and try again.",
      git_cloning : "Fetching wpm repository to %s"
    },

// --- Aliases
    log = console.log;

// --- Main class

Class({
  /**
   * Constructor checks for environment. Exit the app if found error.
   */
  constructor: function() {
    // ensure ~/.wpm is created
    fs.ensureDir(wpm.home_dir, function(err){})

    // Check if git exists
    if ( !which("git")) {
      echo(i18n.git_required);
      exit(1);
    }

    // If user changed config.json, use properties in it when generating apps
    if (fs.existsSync(wpm.config_json)) {
      var conf = require(wpm.config_json);

      // update "app" and "wpm" based on ~/.wpm/config.json
      app.modules  = conf.modules ? conf.modules : app.modules,
      app.build    = conf.build ? conf.build : app.build,
      wpm.git_url  = conf.registry || wpm.git_url;
    }
  },

  /**
   * Test if wpm repository is cloned locally.
   * @return true if wpm was cloned to ~/.wpm
   */
  isLocalRepoExisted: function() {
    return fs.existsSync(wpm.home_dir) && fs.existsSync(path.join(wpm.home_dir, ".git"));
  },

  /**
   * Clone wpm from github to ~/.wpm if the repo does not exist locally.
   */
  gitCloneRepoIfDoesNotExist: function() {
    var cmd;

    if ( !this.isLocalRepoExisted()) {
      console.log(i18n.git_cloning, wpm.home_dir);

      cd(wpm.home_dir);

      cmd = exec(shell_commands.git_clone, { silent: true });

      if (cmd.code !== 0) {
        echo(cmd.output);
        exit(1);
      }
    }

    // read package.json
    packageJson = require(path.join(wpm.home_dir, "package.json"));
  },

  /**
   * Pull updates from github to ~/.wpm
   */
  gitPullRepo: function() {
    var cmd;

    if (this.isLocalRepoExisted()) {
      cd(wpm.home_dir);

      cmd = exec(shell_commands.git_pull, { silent: true });

      if (cmd.code !== 0) {
        echo(cmd.output);
        exit(1);
      }
    }
  },

  /**
   * Verify if a npm based application exists in current folder
   */
  appExists: function(application) {
    cd(app.cwd);

    var app_dir     = path.join(app.cwd, application),
        app_modules = path.join(app_dir, app.modules),
        app_json    = path.join(app_dir, "wpm.json"),
        wpm_js;

    var flag = fs.existsSync(app_dir) && fs.existsSync(app_modules) && fs.existsSync(app_json);

    if ( !flag) {
      app_json = path.join(app.cwd, "wpm.json");
      wpm_js   = path.join(app.cwd, "modules", "wpm", "wpm.js");
      flag     = fs.existsSync(app_json) && fs.existsSync(wpm_js);
    }

    return flag;
  },

  /**
   * Register "wpm serve" handler: Run "python -m SimpleHTTPServer"
   */
  serve: function() {
    program
      .command("serve")
      .alias("s")
      .option("-p, --port", "Overwrite application that already exists")
      .description("Run simple HTTP server under current repository")
      .action(function(port) {
        port = port > 0 ? port : 8000;
        console.log(chalk.cyan("Serving ") + chalk.underline("http://0.0.0.0:%d/") + chalk.gray(" (press ctrl-c to stop)."), port);
        exec("python -m SimpleHTTPServer " + port, { silent: false });
      });
  },

  isRepositoryFound: function() {
    return fs.existsSync("build.json") && fs.existsSync("modules") && fs.existsSync(path.join("modules", "wpm", "wpm.js"));
  },

  proxy: function(context, fn) {
    return function() {
      fn.apply(context, arguments);
    }
  },

  shellHandlers: {
    /**
     * Handler for "wpm init [repository]"
     */
    init: function(repository, options) {
      repository = (repository ? repository + EMPTY : EMPTY).trim();

      if (repository) {
        fs.ensureDir(repository);
        cd(repository);
      }

      if ( !this.isRepositoryFound()) {
        log("Initialized empty web package repository in", process.cwd());

        fs.writeFileSync(path.join(process.cwd(), "build.json"), fs.readFileSync(path.resolve(wpm.build_json)));
        fs.ensureDir("build");
        fs.ensureDir("modules");
        fs.ensureDir(path.join("modules", "wpm"));
        fs.writeFileSync(path.join("modules", "wpm", "wpm.js"), fs.readFileSync(path.join(wpm.home_dir, "src", "wpm.js")));
      } else {
        log("Web package repository exists in", process.cwd());
      }
    },

    /**
     * Handler for "wpm install <module> [modules...]"
     */
    install: function(module, modules) {
      var th = this;

      modules.unshift(module);

      modules.forEach(function(module, index) {
        module = module.split("@");

        var name    = module[0],
            version = th.resolveVersion(module[1] || "latest");

        if ( !fs.existsSync(path.join(wpm.registry_dir, name))) {
          log("Error: module '" + name + "'' not found");
          exit(1);
        } else if (version !== "latest" && !fs.existsSync(path.join(wpm.registry_dir, name, version))) {
          log("Error: module '" + name + "' with version '" + version + "' not found");

          var moduleJson = require(path.join(wpm.registry_dir, name, "module.json"));
          log("Supported version(s):", moduleJson.versions.join(", "));
          exit(1);
        }

        var moduleJson = require(path.join(wpm.registry_dir, name, "module.json"));

        if (version === "latest") {
          version = moduleJson.latest;
        }

        fs.ensureDir(path.join("modules", name));
        fs.copy(path.join(wpm.registry_dir, name, version), path.join("modules", name), function(error) {
          if (error) {
          log(path.join(wpm.registry_dir, name, version));
            return log("Error: ", error);
          }
          log(name + "@" + version, "installed in", path.join("modules", name));
        });
      });
    },

    focus: function(module) {
      if ( !this.isRepositoryFound()) {
        log("Error: not a wpm folder");
        exit(1);
      }

      if ( !fs.existsSync(path.join("modules", modules))) {
        log("Error: module '" + name + "'' not found");
        exit(1);
      }

      // update build.json if this is the installed first module
      var buildJsonPath = path.join(process.cwd(), "build.json"),
          buildJson     = require(buildJsonPath);
      if ( !buildJson.focus) {
        buildJson.focus = modules;

        fs.writeJson(buildJsonPath, buildJson, function(err) {
          log("Error:", module, "can not be focused", error);
        });
      }
    }
  },

  /**
   * Resovle a version to a closest supported version. 2.1.1 can be used for 2.1.0
   */
  resolveVersion: function(version) {
    // TODO do actual resolving here
    return version;
  },

  /**
   * Register "wpm create <application>" handler: Create a new application.
   */
  create: function() {
    var th = this;

    program
      .command("create <application>")
      .alias("new")
      .description("Create a new application")
      //.option("-f, --force", "Overwrite application if it already exists")
      .action(function(application, options) {
        if (th.appExists(application)) {
          console.log(chalk.red("Application exists"));
        } else {
          console.log(chalk.cyan("Create application:"), application);
          th.createApplication(application);
        }
        exit(0);
      });
  },

  createApplication: function(application) {
    //fs.ensureDir(APP_MODULES);
    //fs.ensureDir(APP_BUILD);
    //fs.ensureDir(fs.join(APP_MODULES, application));
  },

  /**
   * Register unknown command: Show help.
   */
  unknown: function() {
    program.command("*")
      .description("Output usage information")
      .action(function(env) {
        program.help();
      });

    program
      .version(packageJson.version)
      .parse(process.argv);

    if ( !program.args || !program.args.length || !program.commands || !program.commands.length) {
      program.help();
    }
  },

  /**
   * Register wpm commands, parse arguments, and execute.
   */
  registerAndParseCommand: function() {
    program
      .command("init [repository]")
      .description("Create an empty web package repository or reinitialize an existing one")
      .action(this.proxy(this, this.shellHandlers.init));

    program
      .command("install <module> [modules...]")
      .description("Install a module to current repository")
      .action(this.proxy(this, this.shellHandlers.install));

    program
      .command("focus <module>")
      .description("  ")
      .action(this.proxy(this, this.shellHandlers.install));


    //this.create();
    this.serve();
    this.unknown();
  },

  /**
   * Main entry point.
   */
  main: function(WpmCli) {
    var shell = new WpmCli();

    // Clone repository to local if it does not exist
    shell.gitCloneRepoIfDoesNotExist();

    // Parse and execute command
    shell.registerAndParseCommand();
  }
});
