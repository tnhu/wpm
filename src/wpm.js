/*
 * Web Package Manager
 *
 * https://github.com/tnhu/wpm
 *
 * Copyright (c) Tan Nhu
 * Licensed under MIT license (https://github.com/tnhu/wpm/blob/master/LICENSE.txt)
 */
(function(global) {
  /**
   * Return a function itself or null
   * @param obj object to be checked
   * @return obj itself as a function or null
   */
  function functionOrNull(obj) {
    return (obj && typeof obj === "function" && obj) || null;
  }

  /**
   * Return a map itself or null. A map is a set of { key: value }
   * @param obj object to be checked
   * @return obj itself as a map or false
   */
  function mapOrNull(obj) {
    return (obj && typeof obj === "object" && !(typeof obj.length === "number" && !(obj.propertyIsEnumerable("length"))) && obj) || null;
  }

  /**
   * Return an array itself or null
   * @param obj object to be checked
   * @return obj itself as an array or null
   */
  function arrayOrNull(obj) {
    return (obj && typeof obj === "object" && typeof obj.length === "number" && !(obj.propertyIsEnumerable("length")) && obj) || null;
  }

  /**
   * Util to make an ajax request.
   */
  function ajax(args) {
    var url     = args.url,
        type    = args.type || "GET",
        params  = args.params || null,
        success = functionOrNull(args.success) || noop,
        error   = functionOrNull(args.error)   || noop,
        request = new XMLHttpRequest();

    url = isDebugMode ? url + "?t=" + new Date().getTime() : url;

    request.open(type, url, true); // async true
    request.onreadystatechange = function () {
      if (request.readyState === 4) {
        if (request.status === 200) {
          success(request.responseText);
        } else {
          error(request);
        }
      }
    };

    // TODO: allow to set HTTP headers to support CORS?
    request.send(params);

    return request;
  }

  function logDebug() {
    if (isDebugMode) {
      console.log("WPM: " + slice.call(arguments).join(" "));
    }
  }

  function logError(msg) {
    console.log("WPM: ERROR: " + slice.call(arguments).join(" "));
  }

  var STATE_RESOLVING          = "in progress",  // component is being resolved
      STATE_RESOLVED           = "resolved",     // component is resolved successfully
      STATE_UNRESOLVABLE       = "unresolvable", // component is not resolvable (failed)

      TYPE_JAVASCRIPT          = "js",
      TYPE_CSS                 = "css",

      PACKAGE_JSON             = "wp.json",
      SLASH                    = "/",

      noop                     = function() {},
      slice                    = Array.prototype.slice,

      body                     = document.body,
      bodyStyle                = document.body.style,
      repositoryUrl            = body.getAttribute("repository"),
      application              = body.getAttribute("application"),
      version                  = body.getAttribute("version"),
      mode                     = body.getAttribute("mode"),
      isDebugMode              = (mode === "debug"),
      applicationJsonUrl       = repositoryUrl + SLASH + application + SLASH + PACKAGE_JSON,

      packageStates            = {},
      depdendencyGraph         = {},

      finished                 = false, // when is true, wpm has done its task

      head;

  /**
   * Resolve a package by its url and identifier. A package is stored under its identifier
   * structure on server specified by attribute "repository" of body tag.
   *
   * For example, if an application is declared:
   *
   * <body application="hello-world" version="0.0.1" repository="bundles" build="build" mode="debug">
   *
   * It has:
   *   - application id: hello-world
   *   - application version: 0.0.1
   *   - repository where the application dependencies are stored: ./bundles
   *   - build bundles are store at: ./build
   *   - run wpm under debug mode
   *
   * The call:
   *
   *   resolvePackageFromUrl("./bundles/jquery/package.json", "jquery")
   *
   * fetches "package.json" for package with identifier named "jquery" at "./bundles/jquery/package.json". If
   * package.json is found and valid, wpm will start resolving "jquery" (meaning fetching its dependencies, then itself).
   *
   * @param url package url.
   * @param identifier package identifier.
   */
  function resolvePackageFromUrl(url, identifier) {
    ajax({
      url: url,
      success: function(spec) {
        spec = JSON.parse(spec);
        resolveComponentByJson(spec);
      },
      error: function() {
        packageStates[identifier].state = STATE_UNRESOLVABLE;
        logError("Package", identifier, ": spec not found at", url);
      }
    });
  }

  /**
   * Nestor cleans up itself when application is fully resolved.
   */
  function cleanup() {
    // application ready, lets show the document
    bodyStyle.display = "block";
    // TODO clean up variables
    finished = true;
  }

  /**
   * Examine a component spec, resolve its dependencies. When its dependencies are all resolved, add all
   * of its resources under "main".
   *
   * @param spec package specification as a map (parsed from package.json).
   */
  function resolveComponentByJson(spec) {
    var unresolved   = false,           // if true, component has at least one unresolved dependency
        unresolvable = false,           // if true, component has at least one unresolvable dependency (can't be resolved)
        unresolvableDependencies = [],
        dependency ;

    spec.dependencies = mapOrNull(spec.dependencies) || {};
    logDebug("[in progress]", spec.name);

    for (dependency in spec.dependencies) {
      // logDebug(spec.name, "-> dependency:", dependency);

      // remember spec is a dependent of dependency in depdendencyGraph
      depdendencyGraph[dependency]            = depdendencyGraph[dependency] || {};
      depdendencyGraph[dependency][spec.name] = spec;
      packageStates[dependency]             = packageStates[dependency]  || {};

      if ( !packageStates[dependency].state) {
        unresolved                        = true;
        packageStates[dependency].state = STATE_RESOLVING;

        // logDebug(spec.name, "->", dependency, " status:", JSON.stringify(packageStates[dependency]));

        resolvePackageFromUrl(repositoryUrl + SLASH + dependency + SLASH + PACKAGE_JSON, dependency);
      } else if (packageStates[dependency].state === STATE_RESOLVING) {
        // Add extra information into packageStates[dependency] to verify for circular dependency later
        // when dependency resolves itself
        packageStates[dependency][spec.name] = true;

        // logDebug(spec.name, "->", dependency, "status: resolving");
        unresolved = true;

        if (packageStates[spec.name] && packageStates[spec.name][dependency] === true) {
          logDebug("WARN: circular dependency found between", dependency, "and",  spec.name);
          unresolved = false;
        }
      } else if (packageStates[dependency].state === STATE_UNRESOLVABLE) {
        logDebug(spec.name, "->", dependency, " status: unresolvable");
        unresolvableDependencies.push(dependency);
        unresolvable = true;
      }
    }

    // If the component has only unresolvable dependencies left, log an error.
    // Otherwise, import its resources
    if (unresolvable && !unresolved) {
      logError("component ", spec.name, "can't be resolved since it has unresolvable dependencies", unresolvableDependencies.join(", "));
    } else if ( !unresolved) {
      importResourcesFromSpec(spec);
    }
  }

  /**
   * Add CSS content to the page.
   * @param content css content
   */
  function addCssContent(url, content, success) {
    var element;

    if (content) {
      element = document.createElement("style");
      element.type = "text/css";

      if (element.styleSheet) {
        element.styleSheet.cssText = content;
      } else {
        element.appendChild(document.createTextNode(content));
      }
    } else {
      element = document.createElement("link");
      element.setAttribute("rel", "stylesheet");
      element.setAttribute("href", isDebugMode ? url + "?t=" + new Date().getTime() : url); // temporary disable cache

      // TODO this is not working on old browsers, what are they?
      element.onload = function() {
        logDebug("[css]", url, "loaded");
        success();
      }
    }

    head.appendChild(element);
  }

  /**
   * Add JavaScript content to the page.
   * @param content JavaScript content
   */
  function addJsContent(url, content, success) {
    var element = document.createElement("script");

    if (content) {
      element.appendChild(document.createTextNode(content));
    } else {
      element.src = isDebugMode ? url + "?t=" + new Date().getTime() : url; // temporary disable cache
    }

    element.onload = function() {
      logDebug("[js]", url, "loaded");
      success();
    }

    body.appendChild(element);
    body.removeChild(element);
  }

  function handleResource(spec, resourceName, resourceUrl, success) {
    var resourceType,
        isHandleable;

    if (/.js$/.test(resourceName)) {
      resourceType = TYPE_JAVASCRIPT;
    } else if (/.css$/.test(resourceName)) {
      resourceType = TYPE_CSS;
    }

    isHandleable = !!resourceType;

    if (isHandleable) {
      if (isDebugMode) {
        if (resourceType === TYPE_JAVASCRIPT) {
          addJsContent(resourceUrl, null, success);
        } else {
          addCssContent(resourceUrl, null, success);
        }
      } else {
        ajax({
          url: resourceUrl,
          success: function(content) {
            if (resourceType === TYPE_JAVASCRIPT) {
              addJsContent(content);
            } else {
              addCssContent(content);
            }
            success();
          },
          error: function() {
            var componentName = spec.name;
            packageStates[componentName].state = STATE_UNRESOLVABLE;
            logError("Failed to resolve component:", componentName, "at sub module:", resourceName, "url:", resourceUrl);
          }
        });
      }
    }

    return isHandleable;
  }

  function handleThirdPartyResource(resourceName, resourceUrl) {
    logDebug("[ignored]", resourceUrl);
  }

  function importResourcesFromSpec(spec) {
    var main   = spec.main,
        length = main.length,
        index  = 0,
        counter = length,
        subModuleUrl = repositoryUrl + SLASH + spec.name + SLASH,
        resourceName,
        resourceUrl,
        isHandleable;

    while (index < length) {
      resourceName = main[index];
      resourceUrl  = subModuleUrl + resourceName;

      isHandleable = handleResource(spec, resourceName, resourceUrl, function() {
        counter--;
        if (counter === 0) {
          // Mark the component is resolved
          if (packageStates[spec.name]) {
            packageStates[spec.name].state = STATE_RESOLVED;
          }

          // Remove references from depdendencyGraph
          for (var dependencyName in spec.dependencies) {
            // logDebug("Remove reference", spec.name, "->", dependencyName);
            delete depdendencyGraph[dependencyName][spec.name];
          }

          if (spec.name === application) {
            cleanup();
          }

          logDebug("[resolved]", spec.name);

          // when a module is resolved, trigger back to test if its dependents can be resolved
          if (depdendencyGraph[spec.name]) {
            for (var dependentName in depdendencyGraph[spec.name]) {
              delete depdendencyGraph[spec.name][dependentName].dependencies[spec.name]; // remove dependency from dependent since spec is resolved
              resolveComponentByJson(depdendencyGraph[spec.name][dependentName]);        // resolve dependent again
            }
          }
        }
      });

      if ( !isHandleable) {
        counter--;
        handleThirdPartyResource(resourceName, resourceUrl);
      }

      index++;
    }
  }

  function use() {
  }

  // --- Initialization ---

  bodyStyle.display = "none";                                       // hide document, show it only when the application ready
  head = document.head || document.getElementsByTagName("head")[0]; // cache head element

  // Resolve application package
  resolvePackageFromUrl(applicationJsonUrl);

  // export use to global
  global.use = use;

  // force to unblock body if wpm is still resolving after 5s
  setTimeout(function() {
    if ( !finished) {
      bodyStyle.display = "block";
    }
  }, 5000);
})(this);