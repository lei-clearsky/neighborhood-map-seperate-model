var gulp = require('gulp');
var uglify = require('gulp-uglify');
var csso = require('gulp-csso');
var concat = require('gulp-concat');

gulp.task('compressJS', function() {
	gulp.src(['js/knockout-3.2.0.js', 'js/bootstrap.js', 'js/jquery.swipebox.js', 'js/skycons.js', 'js/app.js'])
	.pipe(concat('app.min.js'))
	.pipe(uglify())
	.pipe(gulp.dest('build'));
});

gulp.task('compressCSS', function() {
	gulp.src('css/*.css')
	.pipe(concat('style.min.css'))
	.pipe(csso())
	.pipe(gulp.dest('build'));
});

gulp.task('default', ['compressCSS', 'compressJS']);