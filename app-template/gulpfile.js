/*global require*/

var gulp = require('gulp');
var wrap = require('gulp-wrap');
var handlebars = require('gulp-handlebars');
var declare = require('gulp-declare');
var concat = require('gulp-concat');
var babel = require('gulp-babel');
var sourcemaps = require('gulp-sourcemaps');
var del = require('del');
var uglify = require('gulp-uglify');
var runSequence = require('run-sequence');
var sass = require('gulp-sass');
var rename = require('gulp-rename');
var path = require('path');
var merge = require('merge-stream');
var minifyCss = require('gulp-minify-css');
var gulpif = require('gulp-if');
var minifyHTML = require('gulp-minify-html');
var replace = require('gulp-replace');

var prod = false;

var MINIFY_HTML_OPTIONS = {
  empty: false,
  conditionals: true,
  spare: true,
  quotes: true
};

var packageJSON = require('./package');
var isHandlebarsSupported = packageJSON.dependencies && packageJSON.dependencies.handlebars;

gulp.task('generate:app.js', function() {
  var templates = gulp.src('UNDEFINED'); // Create an empty stream (avoid merge error)
  var partials = templates;

  if (isHandlebarsSupported) {
    templates = gulp.src([
      'app/**/[^_]*.hbs',
      'components/**/[^_]*.hbs'
    ])
    .pipe(minifyHTML(MINIFY_HTML_OPTIONS))
    .pipe(handlebars({
      handlebars: require('handlebars')
    }))
    .pipe(wrap('Handlebars.template(<%= contents %>)'))
    .pipe(declare({
      namespace: 'wpm.registry.templates',
      noRedeclare: true, // Avoid duplicate declarations
    }))
    .pipe(gulpif(prod, uglify()));
  }

  if (isHandlebarsSupported) {
    partials = gulp.src([
      'app/**/_*.hbs',
      'components/**/_*.hbs'
    ])
    .pipe(minifyHTML(MINIFY_HTML_OPTIONS))
    .pipe(handlebars({
      handlebars: require('handlebars')
    }))
    .pipe(wrap('Handlebars.registerPartial(<%= processPartialName(file.relative) %>, Handlebars.template(<%= contents %>));', {}, {
      imports: {
        processPartialName: function(fileName) {
          // Strip the extension and the underscore
          // Escape the output with JSON.stringify
          return JSON.stringify(path.basename(fileName, '.js').substr(1));
        }
      }
    }))
    .pipe(gulpif(prod, uglify()));
  }

  var html = gulp.src([
      'app/**/*.html',
      'components/**/*.html'
    ])
    .pipe(minifyHTML(MINIFY_HTML_OPTIONS))
    .pipe(replace(/`/g, '@back@tick@'))
    .pipe(wrap('function() { return `<%= contents %>`; }'))
    .pipe(declare({
      namespace: 'wpm.registry.templates',
      noRedeclare: true, // Avoid duplicate declarations
    }))
    .pipe(babel())
    .pipe(replace(/@back@tick@/g, '`'))
    .pipe(concat('template.html.js'))
    .pipe(gulpif(prod, uglify()));

  var app = gulp.src([
      'helpers/**/*.js',
      'services/**/*.js',
      'components/**/*.js',
      'app/i18n.js',
      'app/config.js',
      'app/init.js',
      'app/**/_*.js', // files start with "_" are imported first (they are mixins)
      'app/**/[^_]*.js',
      'frameworks/wpm/bootstrap.js'
    ])
    .pipe(gulpif(!prod, sourcemaps.init()))
    .pipe(babel())
    .pipe(gulpif(prod, uglify()))
    .pipe(gulpif(!prod, sourcemaps.write()));

    // Output both the partials and the templates
    return merge(partials, templates, html, app)
      .pipe(concat('app.js'))
      .pipe(gulp.dest('build/js/'));
});

gulp.task('generate:app.css', function() {
  return gulp.src([
    'components/**/*.scss',
    'components/**/*.sass',
    'components/**/*.css',
    'app/**/*.scss',
    'app/**/*.sass',
    'app/**/*.css'
  ])
    .pipe(gulpif(!prod, sourcemaps.init()))
    .pipe(sass().on('error', sass.logError))
    .pipe(concat('app.css'))
    .pipe(gulpif(prod, minifyCss()))
    .pipe(gulpif(!prod, sourcemaps.write()))
    .pipe(gulp.dest('build/css'));
});

gulp.task('generate:vendor.js', function() {
  gulp.src([
      'frameworks/wpm/wpm.js',
      'node_modules/handlebars/dist/handlebars.runtime.js'
    ])
    .pipe(gulpif(!prod, sourcemaps.init()))
    .pipe(concat('vendor.js'))
    .pipe(gulpif(prod, uglify()))
    .pipe(gulpif(!prod, sourcemaps.write()))
    .pipe(gulp.dest('build/js'));
});

gulp.task('generate:vendor.css', function() {
  return gulp.src([
    'frameworks/**/*.scss',
    'frameworks/**/*.sass',
    'frameworks/**/*.css'
  ])
    .pipe(gulpif(!prod, sourcemaps.init()))
    .pipe(sass().on('error', sass.logError))
    .pipe(concat('vendor.css'))
    .pipe(gulpif(prod, minifyCss()))
    .pipe(gulpif(!prod, sourcemaps.write()))
    .pipe(gulp.dest('build/css'));
});

gulp.task('copy-assets', function() {
  gulp.src([
    'public/**/*',
    'frameworks/**/*.swf'
    ])
    .pipe(gulp.dest('build'));

  gulp.src([
      'app/**/**/fonts/**/*.*',
      'app/**/**/font/**/*.*',
      'app/**/**/images/**/*.*',
      'app/**/**/img/**/*.*',
      'frameworks/**/**/font/**/*.*',
      'frameworks/**/**/fonts/**/*.*',
      'frameworks/**/**/images/**/*.*',
      'frameworks/**/**/img/**/*.*'
    ])
    .pipe(rename(function(path) {
      var bases = ['/font/', '/fonts/', '/images/', '/img/'];
      bases.forEach(function(base) {
        var dirname = path.dirname + '/';

        if (dirname.indexOf(base) !== -1) {
          var sub = path.dirname.split(base)[1] || '';
          path.dirname = base.substring(1) + sub;
          path.dirname = path.dirname;
          return false;
        }
      });
    }))
    .pipe(gulp.dest('build'));
});

gulp.task('clean', function (callback) {
  del(['build'], callback);
});

gulp.task('build', function(callback) {
  runSequence(
    'clean',
    [
      'generate:app.js', 'generate:vendor.js',
      'generate:app.css', 'generate:vendor.css',
      'copy-assets'
    ],
    callback
  );
});

gulp.task('default', function(callback) {
  runSequence('build', callback);
});

gulp.task('prod', function(callback) {
  prod = true;
  runSequence('build', callback);
});

gulp.task('watch', function() {
  gulp.watch('./app/**/*.*', ['build']);
  gulp.watch('./components/**/*.*', ['build']);
  gulp.watch('./frameworks/**/*.*', ['build']);
  gulp.watch('./helpers/**/*.*', ['build']);
  gulp.watch('./services/**/*.*', ['build']);

  gulp.watch('./public/**/*.*', ['copy-public']);
});
