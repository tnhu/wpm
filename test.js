var src = '/Users/tnhu/.wpm/registry/jquery/1.11.1/',
		dest = '/Users/tnhu/test';

var fs = require('fs-extra')

// copyAsyn does not work
fs.copy(src, dest, function(err) {
  if (err) return console.error(err)
  console.log("success!")
}) //copies fi