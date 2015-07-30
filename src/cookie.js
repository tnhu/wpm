/**
 * Read, write or delete cookie.
 *
 * @param name cookie name
 * @param value cookie value, if writing. Set it to null if want to delete cookie
 * @param days expired days, if writing. Default is 7
 * @param path cookie path, default is '/'
 * @param secure true if want to set secure cookie
 * @param domain domain to set cookie
 * @return cookie value
 * @examples:
 *  cookie('foo', 'bar', 7)                                         // set cookie 'foo' to value 'bar', expire in 7 days
 *  cookie('foo', 'bar', 7, '/home/login', true, 'www.gibird.net')  // set secure cookie 'foo' to value 'bar', expire in 7 days, path is '/home', for domain 'www.gibird.net'
 *  cookie('foo')                                                   // get value of cookie 'foo', return 'bar'
 *  cookie('foo', null)                                             // remove cookie 'foo'
 */
wpm.registerService('cookie', (function() {
  var EMPTY = '';

  function setCookie(name, value, days, path, secure, domain) {
    var date = new Date();
    var str, expires;

    days = (value === null) ? -1 : (days > 0 ? days : 7);
    date.setDate(date.getDate() + days);

    expires = '; expires=' + date.toUTCString();
    path = path   ? '; path=' + path : '/';
    secure = secure ? '; secure' : EMPTY;
    domain = domain ? '; domain=' + domain : EMPTY;
    str = name + '=' + value;

    str = [str, expires, path, secure, domain];

    document.cookie = str.join(EMPTY);
  }

  function getCookie(name) {
    var cookies = document.cookie.split(';');
    var i, x, y, len;

    for (i = 0, len = cookies.length; i < len; i++) {
      x = cookies[i].substr(0, cookies[i].indexOf('='));
      y = cookies[i].substr(cookies[i].indexOf('=') + 1);
      x = x.replace(/^\s+|\s+$/g, EMPTY);

      if (x == name) {
        return unescape(y);
      }
    }
  }

  var cookie = function(name, value) {
    var fn = (!value && value !== null) ? getCookie : setCookie;

    return fn.apply(this, arguments);
  };

  return cookie;
})());
