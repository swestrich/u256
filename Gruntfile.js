module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.registerTask('default', ['browserify', 'uglify']);

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        browserify: {
            main: {
                src: [],
                dest: 'dist/u256.js',
                options: {
                    require: [
                        './index.js:u256'
                    ]
                }
            }
        },
        uglify: {
            my_target: {
                files: {
                    'dist/u256.min.js': ['u256.js']
                }
            }
        }
    });
}