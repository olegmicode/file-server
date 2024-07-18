// ecosystem.config.js
module.exports = {
    apps: [
      {
        name: 'file-server',
        script: './src/index.js',
        instances: 'max', // Or a number of instances you want to run
        exec_mode: 'cluster', // Allows running multiple instances in cluster mode
        env: {
          NODE_ENV: 'development',
          PORT: 33333,
        },
        env_production: {
          NODE_ENV: 'production',
          PORT: 33333,
        },
        // watch: true, // Optional: to enable automatic restart if files change,
        ignore_watch: ['node_modules', 'downloads.log'], // Ignore changes in these directories
        watch_options: {
            followSymlinks: false
        }
      },
    ],
  };
  