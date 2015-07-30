# Web Package Manager

wpm new todos

## A route is generated inside app/{name} folder

wpm generate route {name}
wpm g r {name}
wpm generate helper {name}
wpm g h name

## Service is generated inside services/{name} folder. A service is a JavaScript file.

wpm g service {name}
wpm g s {name}

```wpm g s session``` will generate services/session.js

## Install anything

``` sh
wpm install roboto-font         # install Google Roboto fonts to public/fonts
wpm install roboto-font --save  # install and save dependency to wpm.json
wpm install jquery
wpm install jquery@2.0.0        # look into Bower for version resolving
wpm install cloudtenna-api
wpm install ionicons
wpm install wpm-babel -g        # install babel transpiler globally
wpm install wpm-babel           # install bebel for this project (javascript files will be piped to babel)

wpm install                     # install dependencies declared in wpm.json (update them if needed)
```

## Instal sub-component

wpm install wpm/flash           # flash.js will be installed to frameworks/wpm/flash.js


Each component declares itself to wpm on what its resources look like. For example:

jquery:
  wpm.json
    name: jquery
    js: jquery.js
    type: framework

materializecss
  wpm.json
    name: materialize
    js: [....]
    css: [....]
    font: [...]
    type: framework

splash-view
  wpm.json
    name: 'splash-view'
    js:
    css:
    type: component            # splash-view will be stored to components/splash-view

/components should be the place for UI components only (whatever declares custom tags).
/helpers and /services: single file helpers and services
/frameworks: frameworks and libraries like jquery, roboto-font, ionicons, etc...

## Run local server

wpm server                     # auto detect changes
wpm s
wpm s --live-reload

## Build app (output is generated in dist/ folder)

wpm build                      # generate {PROJECT-NAME}-dev-{VERSION}.zip in dist
wpm build --DEV                # generate {PROJECT-NAME}-dev-{VERSION}.zip in dist
wpm build --PROD               # generate {PROJECT-NAME}-prod-v{VERSION}.zip in dist
wpm b

## Running tests

wpm test
wpm t

# Route Development Tips

fail(error, hook) is where to capture errors

error.stack should give the location of the error.

# Terms

Route: Class to control a uri
Router: Singleton service to pass control of a uri to an instance of Route
Component: A reusable UI widget represented by a custom tag. I.e: <signin-form/>

# Lifecycle

Resume

Route1 -> Route2 -> Route1 (resume)
                    Route2's resign
                    Route1's resume
                    Route1's ready
                    Route2's pause or Route2's exit

# Test npm package locally

npm pack # under package folder to generate abc-0.0.1.tgz

then install

npm install -g abc-0.0.1.tgz

# nginx setup

Rewrite

```js
server {
    location / {
        root   your-app/build;
        index  index.html index.htm;
        try_files $uri /index.html;
    }
}
```
