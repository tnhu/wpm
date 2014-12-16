#!/usr/bin/env node

var USER_HOME = (process.platform === "win32") ? process.env.HOMEPATH : process.env.HOME,

    program = require("commander"),
    path    = require("path"),
		fs      = require("fs-extra"),
		shelljs = require('shelljs/global'),

		WPM_HOME         = path.join(USER_HOME, ".wpm"),
		REGISTRY_GIT_URL = "https://github.com/tnhu/wpm.git",

		cmd_git_clone    = "git clone --depth 1 " + REGISTRY_GIT_URL + " " + WPM_HOME,
		cmd_git_pull     = "git pull",

		i18n_git_required = "Sorry, wpm requires git. Please install git (http://git-scm.com/) and try again.",
		i18n_git_pulling  = "Pulling wpm updates to " + WPM_HOME,
		i18n_git_pull_failed = "Error, ",
		i18n_git_cloning  = "Fetching wpm repository to %s",

		cmd;

// -- Ensure ./wpm is created
fs.ensureDir(WPM_HOME, function(err){})

// If ./wpm/wpm-registry is not found, "git clone" it from REGISTRY_GIT_URL
// Otherwise, do "git pull"
if (fs.existsSync(WPM_HOME)) {
	if ( !which('git')) {
  	echo(i18n_git_required);
  	exit(1);
	} else {
		console.log(i18n_git_pulling);

		cd(WPM_HOME);

		cmd = exec(cmd_git_pull, { silent: true });

		if (cmd.code !== 0) {
  		echo(cmd.output);
  		exit(1);
		}
	}
} else {
	if ( !which('git')) {
  	echo(i18n_git_required);
  	exit(1);
	} else {
		console.log(i18n_git_cloning, WPM_HOME);

		cd(WPM_HOME);

		cmd = exec(cmd_git_clone, { silent: true });

		if (cmd.code !== 0) {
  		echo(cmd.output);
  		exit(1);
		}
	}
}

/*
program
  .command('new [app]')
  .description('Create a new application')
  .option("-f, --force", "Overwrite application that already exists")
  .action(function(app, options){
    if ( !app) {
      console.log("app");
    }
    console.log('setup', app, options.force);
  });

program
  .command('setup [env]')
  .description('run setup commands for all envs')
  .option("-s, --setup_mode [mode]", "Which setup mode to use")
  .action(function(env, options){
    var mode = options.setup_mode || "normal";
    env = env || 'all';
    console.log('setup for %s env(s) with %s mode', env, mode);
  });

program
  .command('exec <cmd>')
  .alias('ex')
  .description('execute the given remote cmd')
  .option("-e, --exec_mode <mode>", "Which exec mode to use")
  .action(function(cmd, options){
    console.log('exec "%s" using %s mode', cmd, options.exec_mode);
  }).on('--help', function() {
    console.log('  Examples:');
    console.log();
    console.log('    $ deploy exec sequential');
    console.log('    $ deploy exec async');
    console.log();
  });

program
  .command('*')
  .action(function(env){
    console.log('deploying "%s"', env);
  });

program
  .version('0.0.1')
  .option('-C, --chdir <path>', 'change the working directory')
  .option('-c, --config <path>', 'set config path. defaults to ./deploy.conf')
  .option('-T, --no-tests', 'ignore test hook')

program.parse(process.argv);
*/