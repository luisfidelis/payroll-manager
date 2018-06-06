require('babel-polyfill')
require('babel-register')({
  'presets': ['es2015'],
  'plugins': ['syntax-async-functions', 'transform-regenerator']
})


module.exports = {
  networks: {
    dev: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    }
  }
};
