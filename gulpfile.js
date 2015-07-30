/*global require*/

var gulp = require('gulp');
var concat = require('gulp-concat');
var runSequence = require('run-sequence');
var del = require('del');

var DEST = 'app-template/frameworks/wpm';

gulp.task('build', function() {
  gulp.src([
      'bower_components/jsface/jsface.js',
      'src/wpm.js',
      'src/route-parser.js',
      'src/router.js',
      'src/route.js',
      'src/actions-dispatcher.js',
      'bower_components/observe-js/src/observe.js',
      'lib/deep-observer.js',
      'lib/es6-promise.js',
      'node_modules/html-renderer/html-renderer.js',
    ])
    .pipe(concat('wpm.js'))
    .pipe(gulp.dest(DEST));

  gulp.src([
      'src/bootstrap.js'
    ])
    .pipe(concat('bootstrap.js'))
    .pipe(gulp.dest(DEST));
});

gulp.task('clean', function (callback) {
  del([DEST], callback);
});

gulp.task('default', function() {
  runSequence('clean', 'build');
});

gulp.task('watch', function() {
  gulp.watch('src', ['build']);
});
