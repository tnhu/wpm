/** Sample ping service which has one ping() API */

wpm.registerService('ping', Class({
  $singleton: true,

  ping: function() {
    return 'pong';
  }
}));

console.log('ping is registered');
