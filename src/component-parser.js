<!DOCTYPE html>
<html>

<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>wpm</title>
  <meta name="description" content="">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="wpm.css">
</head>

<body>
  <!-- place holder for a view based on route -->
  <view-outlet></view-outlet>
</body>
<div style="display: none;" id="foo">
  <script src="bower_components/jquery/dist/jquery.js"></script>
  <!-- at somewhere -->
  <table-view/>

  <template component="splash-view">
    <h1>Just a test header...</h1>
    <!-- component does not handle route -->
    <viewport-spinner type="fullscreen" foo="bar"></viewport-spinner>
  </template>

  <!-- viewport-spinner is a component -->
  <template component="viewport-spinner" class="viewport-spinner">
    <!-- render as <div class="viewport-spinner">...</div> -->
    <i class="spinner">Loading...</i>
  </template>

  <!-- component can be rendered directly or dynamically (when its route is triggerred) -->
  <!-- SHOULD NOT BE RENDERED DIRECTLY, DO FROM ROUTER -->
  <splash-view/>

  <!-- will be rendered to -->
  <div component="splash-view">
    <h1>Just a test header...</h1>
    <div component="viewport-spinner" type="fullscreen" foo="bar">
      <i class="spinner">Loading...</i>
    </div>
  </div>

  <inbox-view route="inbox" class="inbox" engine="handlerbars">
    <nav>
      <ul>
        <li><a href="{{link-to 'inbox.index'}}">Messages</a>
        </li>
        <li><a href="{{link-to 'inbox.new'}}">New</a>
        </li>
        <li><a href="{{link-to 'inbox.sent'}}">Sent</a>
        </li>
      </ul>
    </nav>

    <view-outlet></view-outlet>
    <!-- place holder for sub-route -->

    <inbox-index-view route="inbox.index" class="inbox-index">
      <!-- sub-route, default /inbox -->
      <p>Inbox index page</p>
    </inbox-index-view>

    <inbox-new-view route="inbox.new" class="inbox-new">
      <!-- sub-route, /inbox/new -->
      <p>Inbox new message page</p>
    </inbox-new-view>

    <inbox-sent-view route="inbox.sent" class="inbox-sent">
      <!-- sub-route, /inbox/sent -->
      <p>Inbox sent message page</p>
    </inbox-sent-view>

  </inbox-view>

  <signup-form tag="signup-form" outputTag="section" class="signup" engine="handlerbars">
    <!-- rendered as <section class="signup">...</section> -->
    <h1>Sign Up</h1>
    <form>
      <label for="email">Email</label>
      <input type="text" name="email" value="{{ email }}">
      <input type="text" name="password">
    </form>
  </signup-form>

  <script>
    var str = $('#foo').html();
    var re = /(<)([^> ]*[a-zA-Z]-[a-zA-Z][^>]*)(>)/gi;

    var match = re.exec(str);
    var components = {};

    while (match != null) {
      var componentName = match[2].split(/\s/)[0];

      if (componentName.charAt(0) === '/') {
        componentName = componentName.slice(1);
      }

      components[componentName] = {};
      match = re.exec(str);
    }


    console.log(components);
  </script>

</div>
</html>
