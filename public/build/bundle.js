
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.30.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn, basedir, module) {
    	return module = {
    		path: basedir,
    		exports: {},
    		require: function (path, base) {
    			return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
    		}
    	}, fn(module, module.exports), module.exports;
    }

    function commonjsRequire () {
    	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
    }

    var page = createCommonjsModule(function (module, exports) {
    (function (global, factory) {
    	 module.exports = factory() ;
    }(commonjsGlobal, (function () {
    var isarray = Array.isArray || function (arr) {
      return Object.prototype.toString.call(arr) == '[object Array]';
    };

    /**
     * Expose `pathToRegexp`.
     */
    var pathToRegexp_1 = pathToRegexp;
    var parse_1 = parse;
    var compile_1 = compile;
    var tokensToFunction_1 = tokensToFunction;
    var tokensToRegExp_1 = tokensToRegExp;

    /**
     * The main path matching regexp utility.
     *
     * @type {RegExp}
     */
    var PATH_REGEXP = new RegExp([
      // Match escaped characters that would otherwise appear in future matches.
      // This allows the user to escape special characters that won't transform.
      '(\\\\.)',
      // Match Express-style parameters and un-named parameters with a prefix
      // and optional suffixes. Matches appear as:
      //
      // "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?", undefined]
      // "/route(\\d+)"  => [undefined, undefined, undefined, "\d+", undefined, undefined]
      // "/*"            => ["/", undefined, undefined, undefined, undefined, "*"]
      '([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^()])+)\\))?|\\(((?:\\\\.|[^()])+)\\))([+*?])?|(\\*))'
    ].join('|'), 'g');

    /**
     * Parse a string for the raw tokens.
     *
     * @param  {String} str
     * @return {Array}
     */
    function parse (str) {
      var tokens = [];
      var key = 0;
      var index = 0;
      var path = '';
      var res;

      while ((res = PATH_REGEXP.exec(str)) != null) {
        var m = res[0];
        var escaped = res[1];
        var offset = res.index;
        path += str.slice(index, offset);
        index = offset + m.length;

        // Ignore already escaped sequences.
        if (escaped) {
          path += escaped[1];
          continue
        }

        // Push the current path onto the tokens.
        if (path) {
          tokens.push(path);
          path = '';
        }

        var prefix = res[2];
        var name = res[3];
        var capture = res[4];
        var group = res[5];
        var suffix = res[6];
        var asterisk = res[7];

        var repeat = suffix === '+' || suffix === '*';
        var optional = suffix === '?' || suffix === '*';
        var delimiter = prefix || '/';
        var pattern = capture || group || (asterisk ? '.*' : '[^' + delimiter + ']+?');

        tokens.push({
          name: name || key++,
          prefix: prefix || '',
          delimiter: delimiter,
          optional: optional,
          repeat: repeat,
          pattern: escapeGroup(pattern)
        });
      }

      // Match any characters still remaining.
      if (index < str.length) {
        path += str.substr(index);
      }

      // If the path exists, push it onto the end.
      if (path) {
        tokens.push(path);
      }

      return tokens
    }

    /**
     * Compile a string to a template function for the path.
     *
     * @param  {String}   str
     * @return {Function}
     */
    function compile (str) {
      return tokensToFunction(parse(str))
    }

    /**
     * Expose a method for transforming tokens into the path function.
     */
    function tokensToFunction (tokens) {
      // Compile all the tokens into regexps.
      var matches = new Array(tokens.length);

      // Compile all the patterns before compilation.
      for (var i = 0; i < tokens.length; i++) {
        if (typeof tokens[i] === 'object') {
          matches[i] = new RegExp('^' + tokens[i].pattern + '$');
        }
      }

      return function (obj) {
        var path = '';
        var data = obj || {};

        for (var i = 0; i < tokens.length; i++) {
          var token = tokens[i];

          if (typeof token === 'string') {
            path += token;

            continue
          }

          var value = data[token.name];
          var segment;

          if (value == null) {
            if (token.optional) {
              continue
            } else {
              throw new TypeError('Expected "' + token.name + '" to be defined')
            }
          }

          if (isarray(value)) {
            if (!token.repeat) {
              throw new TypeError('Expected "' + token.name + '" to not repeat, but received "' + value + '"')
            }

            if (value.length === 0) {
              if (token.optional) {
                continue
              } else {
                throw new TypeError('Expected "' + token.name + '" to not be empty')
              }
            }

            for (var j = 0; j < value.length; j++) {
              segment = encodeURIComponent(value[j]);

              if (!matches[i].test(segment)) {
                throw new TypeError('Expected all "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
              }

              path += (j === 0 ? token.prefix : token.delimiter) + segment;
            }

            continue
          }

          segment = encodeURIComponent(value);

          if (!matches[i].test(segment)) {
            throw new TypeError('Expected "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
          }

          path += token.prefix + segment;
        }

        return path
      }
    }

    /**
     * Escape a regular expression string.
     *
     * @param  {String} str
     * @return {String}
     */
    function escapeString (str) {
      return str.replace(/([.+*?=^!:${}()[\]|\/])/g, '\\$1')
    }

    /**
     * Escape the capturing group by escaping special characters and meaning.
     *
     * @param  {String} group
     * @return {String}
     */
    function escapeGroup (group) {
      return group.replace(/([=!:$\/()])/g, '\\$1')
    }

    /**
     * Attach the keys as a property of the regexp.
     *
     * @param  {RegExp} re
     * @param  {Array}  keys
     * @return {RegExp}
     */
    function attachKeys (re, keys) {
      re.keys = keys;
      return re
    }

    /**
     * Get the flags for a regexp from the options.
     *
     * @param  {Object} options
     * @return {String}
     */
    function flags (options) {
      return options.sensitive ? '' : 'i'
    }

    /**
     * Pull out keys from a regexp.
     *
     * @param  {RegExp} path
     * @param  {Array}  keys
     * @return {RegExp}
     */
    function regexpToRegexp (path, keys) {
      // Use a negative lookahead to match only capturing groups.
      var groups = path.source.match(/\((?!\?)/g);

      if (groups) {
        for (var i = 0; i < groups.length; i++) {
          keys.push({
            name: i,
            prefix: null,
            delimiter: null,
            optional: false,
            repeat: false,
            pattern: null
          });
        }
      }

      return attachKeys(path, keys)
    }

    /**
     * Transform an array into a regexp.
     *
     * @param  {Array}  path
     * @param  {Array}  keys
     * @param  {Object} options
     * @return {RegExp}
     */
    function arrayToRegexp (path, keys, options) {
      var parts = [];

      for (var i = 0; i < path.length; i++) {
        parts.push(pathToRegexp(path[i], keys, options).source);
      }

      var regexp = new RegExp('(?:' + parts.join('|') + ')', flags(options));

      return attachKeys(regexp, keys)
    }

    /**
     * Create a path regexp from string input.
     *
     * @param  {String} path
     * @param  {Array}  keys
     * @param  {Object} options
     * @return {RegExp}
     */
    function stringToRegexp (path, keys, options) {
      var tokens = parse(path);
      var re = tokensToRegExp(tokens, options);

      // Attach keys back to the regexp.
      for (var i = 0; i < tokens.length; i++) {
        if (typeof tokens[i] !== 'string') {
          keys.push(tokens[i]);
        }
      }

      return attachKeys(re, keys)
    }

    /**
     * Expose a function for taking tokens and returning a RegExp.
     *
     * @param  {Array}  tokens
     * @param  {Array}  keys
     * @param  {Object} options
     * @return {RegExp}
     */
    function tokensToRegExp (tokens, options) {
      options = options || {};

      var strict = options.strict;
      var end = options.end !== false;
      var route = '';
      var lastToken = tokens[tokens.length - 1];
      var endsWithSlash = typeof lastToken === 'string' && /\/$/.test(lastToken);

      // Iterate over the tokens and create our regexp string.
      for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];

        if (typeof token === 'string') {
          route += escapeString(token);
        } else {
          var prefix = escapeString(token.prefix);
          var capture = token.pattern;

          if (token.repeat) {
            capture += '(?:' + prefix + capture + ')*';
          }

          if (token.optional) {
            if (prefix) {
              capture = '(?:' + prefix + '(' + capture + '))?';
            } else {
              capture = '(' + capture + ')?';
            }
          } else {
            capture = prefix + '(' + capture + ')';
          }

          route += capture;
        }
      }

      // In non-strict mode we allow a slash at the end of match. If the path to
      // match already ends with a slash, we remove it for consistency. The slash
      // is valid at the end of a path match, not in the middle. This is important
      // in non-ending mode, where "/test/" shouldn't match "/test//route".
      if (!strict) {
        route = (endsWithSlash ? route.slice(0, -2) : route) + '(?:\\/(?=$))?';
      }

      if (end) {
        route += '$';
      } else {
        // In non-ending mode, we need the capturing groups to match as much as
        // possible by using a positive lookahead to the end or next path segment.
        route += strict && endsWithSlash ? '' : '(?=\\/|$)';
      }

      return new RegExp('^' + route, flags(options))
    }

    /**
     * Normalize the given path string, returning a regular expression.
     *
     * An empty array can be passed in for the keys, which will hold the
     * placeholder key descriptions. For example, using `/user/:id`, `keys` will
     * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
     *
     * @param  {(String|RegExp|Array)} path
     * @param  {Array}                 [keys]
     * @param  {Object}                [options]
     * @return {RegExp}
     */
    function pathToRegexp (path, keys, options) {
      keys = keys || [];

      if (!isarray(keys)) {
        options = keys;
        keys = [];
      } else if (!options) {
        options = {};
      }

      if (path instanceof RegExp) {
        return regexpToRegexp(path, keys)
      }

      if (isarray(path)) {
        return arrayToRegexp(path, keys, options)
      }

      return stringToRegexp(path, keys, options)
    }

    pathToRegexp_1.parse = parse_1;
    pathToRegexp_1.compile = compile_1;
    pathToRegexp_1.tokensToFunction = tokensToFunction_1;
    pathToRegexp_1.tokensToRegExp = tokensToRegExp_1;

    /**
       * Module dependencies.
       */

      

      /**
       * Short-cuts for global-object checks
       */

      var hasDocument = ('undefined' !== typeof document);
      var hasWindow = ('undefined' !== typeof window);
      var hasHistory = ('undefined' !== typeof history);
      var hasProcess = typeof process !== 'undefined';

      /**
       * Detect click event
       */
      var clickEvent = hasDocument && document.ontouchstart ? 'touchstart' : 'click';

      /**
       * To work properly with the URL
       * history.location generated polyfill in https://github.com/devote/HTML5-History-API
       */

      var isLocation = hasWindow && !!(window.history.location || window.location);

      /**
       * The page instance
       * @api private
       */
      function Page() {
        // public things
        this.callbacks = [];
        this.exits = [];
        this.current = '';
        this.len = 0;

        // private things
        this._decodeURLComponents = true;
        this._base = '';
        this._strict = false;
        this._running = false;
        this._hashbang = false;

        // bound functions
        this.clickHandler = this.clickHandler.bind(this);
        this._onpopstate = this._onpopstate.bind(this);
      }

      /**
       * Configure the instance of page. This can be called multiple times.
       *
       * @param {Object} options
       * @api public
       */

      Page.prototype.configure = function(options) {
        var opts = options || {};

        this._window = opts.window || (hasWindow && window);
        this._decodeURLComponents = opts.decodeURLComponents !== false;
        this._popstate = opts.popstate !== false && hasWindow;
        this._click = opts.click !== false && hasDocument;
        this._hashbang = !!opts.hashbang;

        var _window = this._window;
        if(this._popstate) {
          _window.addEventListener('popstate', this._onpopstate, false);
        } else if(hasWindow) {
          _window.removeEventListener('popstate', this._onpopstate, false);
        }

        if (this._click) {
          _window.document.addEventListener(clickEvent, this.clickHandler, false);
        } else if(hasDocument) {
          _window.document.removeEventListener(clickEvent, this.clickHandler, false);
        }

        if(this._hashbang && hasWindow && !hasHistory) {
          _window.addEventListener('hashchange', this._onpopstate, false);
        } else if(hasWindow) {
          _window.removeEventListener('hashchange', this._onpopstate, false);
        }
      };

      /**
       * Get or set basepath to `path`.
       *
       * @param {string} path
       * @api public
       */

      Page.prototype.base = function(path) {
        if (0 === arguments.length) return this._base;
        this._base = path;
      };

      /**
       * Gets the `base`, which depends on whether we are using History or
       * hashbang routing.

       * @api private
       */
      Page.prototype._getBase = function() {
        var base = this._base;
        if(!!base) return base;
        var loc = hasWindow && this._window && this._window.location;

        if(hasWindow && this._hashbang && loc && loc.protocol === 'file:') {
          base = loc.pathname;
        }

        return base;
      };

      /**
       * Get or set strict path matching to `enable`
       *
       * @param {boolean} enable
       * @api public
       */

      Page.prototype.strict = function(enable) {
        if (0 === arguments.length) return this._strict;
        this._strict = enable;
      };


      /**
       * Bind with the given `options`.
       *
       * Options:
       *
       *    - `click` bind to click events [true]
       *    - `popstate` bind to popstate [true]
       *    - `dispatch` perform initial dispatch [true]
       *
       * @param {Object} options
       * @api public
       */

      Page.prototype.start = function(options) {
        var opts = options || {};
        this.configure(opts);

        if (false === opts.dispatch) return;
        this._running = true;

        var url;
        if(isLocation) {
          var window = this._window;
          var loc = window.location;

          if(this._hashbang && ~loc.hash.indexOf('#!')) {
            url = loc.hash.substr(2) + loc.search;
          } else if (this._hashbang) {
            url = loc.search + loc.hash;
          } else {
            url = loc.pathname + loc.search + loc.hash;
          }
        }

        this.replace(url, null, true, opts.dispatch);
      };

      /**
       * Unbind click and popstate event handlers.
       *
       * @api public
       */

      Page.prototype.stop = function() {
        if (!this._running) return;
        this.current = '';
        this.len = 0;
        this._running = false;

        var window = this._window;
        this._click && window.document.removeEventListener(clickEvent, this.clickHandler, false);
        hasWindow && window.removeEventListener('popstate', this._onpopstate, false);
        hasWindow && window.removeEventListener('hashchange', this._onpopstate, false);
      };

      /**
       * Show `path` with optional `state` object.
       *
       * @param {string} path
       * @param {Object=} state
       * @param {boolean=} dispatch
       * @param {boolean=} push
       * @return {!Context}
       * @api public
       */

      Page.prototype.show = function(path, state, dispatch, push) {
        var ctx = new Context(path, state, this),
          prev = this.prevContext;
        this.prevContext = ctx;
        this.current = ctx.path;
        if (false !== dispatch) this.dispatch(ctx, prev);
        if (false !== ctx.handled && false !== push) ctx.pushState();
        return ctx;
      };

      /**
       * Goes back in the history
       * Back should always let the current route push state and then go back.
       *
       * @param {string} path - fallback path to go back if no more history exists, if undefined defaults to page.base
       * @param {Object=} state
       * @api public
       */

      Page.prototype.back = function(path, state) {
        var page = this;
        if (this.len > 0) {
          var window = this._window;
          // this may need more testing to see if all browsers
          // wait for the next tick to go back in history
          hasHistory && window.history.back();
          this.len--;
        } else if (path) {
          setTimeout(function() {
            page.show(path, state);
          });
        } else {
          setTimeout(function() {
            page.show(page._getBase(), state);
          });
        }
      };

      /**
       * Register route to redirect from one path to other
       * or just redirect to another route
       *
       * @param {string} from - if param 'to' is undefined redirects to 'from'
       * @param {string=} to
       * @api public
       */
      Page.prototype.redirect = function(from, to) {
        var inst = this;

        // Define route from a path to another
        if ('string' === typeof from && 'string' === typeof to) {
          page.call(this, from, function(e) {
            setTimeout(function() {
              inst.replace(/** @type {!string} */ (to));
            }, 0);
          });
        }

        // Wait for the push state and replace it with another
        if ('string' === typeof from && 'undefined' === typeof to) {
          setTimeout(function() {
            inst.replace(from);
          }, 0);
        }
      };

      /**
       * Replace `path` with optional `state` object.
       *
       * @param {string} path
       * @param {Object=} state
       * @param {boolean=} init
       * @param {boolean=} dispatch
       * @return {!Context}
       * @api public
       */


      Page.prototype.replace = function(path, state, init, dispatch) {
        var ctx = new Context(path, state, this),
          prev = this.prevContext;
        this.prevContext = ctx;
        this.current = ctx.path;
        ctx.init = init;
        ctx.save(); // save before dispatching, which may redirect
        if (false !== dispatch) this.dispatch(ctx, prev);
        return ctx;
      };

      /**
       * Dispatch the given `ctx`.
       *
       * @param {Context} ctx
       * @api private
       */

      Page.prototype.dispatch = function(ctx, prev) {
        var i = 0, j = 0, page = this;

        function nextExit() {
          var fn = page.exits[j++];
          if (!fn) return nextEnter();
          fn(prev, nextExit);
        }

        function nextEnter() {
          var fn = page.callbacks[i++];

          if (ctx.path !== page.current) {
            ctx.handled = false;
            return;
          }
          if (!fn) return unhandled.call(page, ctx);
          fn(ctx, nextEnter);
        }

        if (prev) {
          nextExit();
        } else {
          nextEnter();
        }
      };

      /**
       * Register an exit route on `path` with
       * callback `fn()`, which will be called
       * on the previous context when a new
       * page is visited.
       */
      Page.prototype.exit = function(path, fn) {
        if (typeof path === 'function') {
          return this.exit('*', path);
        }

        var route = new Route(path, null, this);
        for (var i = 1; i < arguments.length; ++i) {
          this.exits.push(route.middleware(arguments[i]));
        }
      };

      /**
       * Handle "click" events.
       */

      /* jshint +W054 */
      Page.prototype.clickHandler = function(e) {
        if (1 !== this._which(e)) return;

        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        if (e.defaultPrevented) return;

        // ensure link
        // use shadow dom when available if not, fall back to composedPath()
        // for browsers that only have shady
        var el = e.target;
        var eventPath = e.path || (e.composedPath ? e.composedPath() : null);

        if(eventPath) {
          for (var i = 0; i < eventPath.length; i++) {
            if (!eventPath[i].nodeName) continue;
            if (eventPath[i].nodeName.toUpperCase() !== 'A') continue;
            if (!eventPath[i].href) continue;

            el = eventPath[i];
            break;
          }
        }

        // continue ensure link
        // el.nodeName for svg links are 'a' instead of 'A'
        while (el && 'A' !== el.nodeName.toUpperCase()) el = el.parentNode;
        if (!el || 'A' !== el.nodeName.toUpperCase()) return;

        // check if link is inside an svg
        // in this case, both href and target are always inside an object
        var svg = (typeof el.href === 'object') && el.href.constructor.name === 'SVGAnimatedString';

        // Ignore if tag has
        // 1. "download" attribute
        // 2. rel="external" attribute
        if (el.hasAttribute('download') || el.getAttribute('rel') === 'external') return;

        // ensure non-hash for the same path
        var link = el.getAttribute('href');
        if(!this._hashbang && this._samePath(el) && (el.hash || '#' === link)) return;

        // Check for mailto: in the href
        if (link && link.indexOf('mailto:') > -1) return;

        // check target
        // svg target is an object and its desired value is in .baseVal property
        if (svg ? el.target.baseVal : el.target) return;

        // x-origin
        // note: svg links that are not relative don't call click events (and skip page.js)
        // consequently, all svg links tested inside page.js are relative and in the same origin
        if (!svg && !this.sameOrigin(el.href)) return;

        // rebuild path
        // There aren't .pathname and .search properties in svg links, so we use href
        // Also, svg href is an object and its desired value is in .baseVal property
        var path = svg ? el.href.baseVal : (el.pathname + el.search + (el.hash || ''));

        path = path[0] !== '/' ? '/' + path : path;

        // strip leading "/[drive letter]:" on NW.js on Windows
        if (hasProcess && path.match(/^\/[a-zA-Z]:\//)) {
          path = path.replace(/^\/[a-zA-Z]:\//, '/');
        }

        // same page
        var orig = path;
        var pageBase = this._getBase();

        if (path.indexOf(pageBase) === 0) {
          path = path.substr(pageBase.length);
        }

        if (this._hashbang) path = path.replace('#!', '');

        if (pageBase && orig === path && (!isLocation || this._window.location.protocol !== 'file:')) {
          return;
        }

        e.preventDefault();
        this.show(orig);
      };

      /**
       * Handle "populate" events.
       * @api private
       */

      Page.prototype._onpopstate = (function () {
        var loaded = false;
        if ( ! hasWindow ) {
          return function () {};
        }
        if (hasDocument && document.readyState === 'complete') {
          loaded = true;
        } else {
          window.addEventListener('load', function() {
            setTimeout(function() {
              loaded = true;
            }, 0);
          });
        }
        return function onpopstate(e) {
          if (!loaded) return;
          var page = this;
          if (e.state) {
            var path = e.state.path;
            page.replace(path, e.state);
          } else if (isLocation) {
            var loc = page._window.location;
            page.show(loc.pathname + loc.search + loc.hash, undefined, undefined, false);
          }
        };
      })();

      /**
       * Event button.
       */
      Page.prototype._which = function(e) {
        e = e || (hasWindow && this._window.event);
        return null == e.which ? e.button : e.which;
      };

      /**
       * Convert to a URL object
       * @api private
       */
      Page.prototype._toURL = function(href) {
        var window = this._window;
        if(typeof URL === 'function' && isLocation) {
          return new URL(href, window.location.toString());
        } else if (hasDocument) {
          var anc = window.document.createElement('a');
          anc.href = href;
          return anc;
        }
      };

      /**
       * Check if `href` is the same origin.
       * @param {string} href
       * @api public
       */
      Page.prototype.sameOrigin = function(href) {
        if(!href || !isLocation) return false;

        var url = this._toURL(href);
        var window = this._window;

        var loc = window.location;

        /*
           When the port is the default http port 80 for http, or 443 for
           https, internet explorer 11 returns an empty string for loc.port,
           so we need to compare loc.port with an empty string if url.port
           is the default port 80 or 443.
           Also the comparition with `port` is changed from `===` to `==` because
           `port` can be a string sometimes. This only applies to ie11.
        */
        return loc.protocol === url.protocol &&
          loc.hostname === url.hostname &&
          (loc.port === url.port || loc.port === '' && (url.port == 80 || url.port == 443)); // jshint ignore:line
      };

      /**
       * @api private
       */
      Page.prototype._samePath = function(url) {
        if(!isLocation) return false;
        var window = this._window;
        var loc = window.location;
        return url.pathname === loc.pathname &&
          url.search === loc.search;
      };

      /**
       * Remove URL encoding from the given `str`.
       * Accommodates whitespace in both x-www-form-urlencoded
       * and regular percent-encoded form.
       *
       * @param {string} val - URL component to decode
       * @api private
       */
      Page.prototype._decodeURLEncodedURIComponent = function(val) {
        if (typeof val !== 'string') { return val; }
        return this._decodeURLComponents ? decodeURIComponent(val.replace(/\+/g, ' ')) : val;
      };

      /**
       * Create a new `page` instance and function
       */
      function createPage() {
        var pageInstance = new Page();

        function pageFn(/* args */) {
          return page.apply(pageInstance, arguments);
        }

        // Copy all of the things over. In 2.0 maybe we use setPrototypeOf
        pageFn.callbacks = pageInstance.callbacks;
        pageFn.exits = pageInstance.exits;
        pageFn.base = pageInstance.base.bind(pageInstance);
        pageFn.strict = pageInstance.strict.bind(pageInstance);
        pageFn.start = pageInstance.start.bind(pageInstance);
        pageFn.stop = pageInstance.stop.bind(pageInstance);
        pageFn.show = pageInstance.show.bind(pageInstance);
        pageFn.back = pageInstance.back.bind(pageInstance);
        pageFn.redirect = pageInstance.redirect.bind(pageInstance);
        pageFn.replace = pageInstance.replace.bind(pageInstance);
        pageFn.dispatch = pageInstance.dispatch.bind(pageInstance);
        pageFn.exit = pageInstance.exit.bind(pageInstance);
        pageFn.configure = pageInstance.configure.bind(pageInstance);
        pageFn.sameOrigin = pageInstance.sameOrigin.bind(pageInstance);
        pageFn.clickHandler = pageInstance.clickHandler.bind(pageInstance);

        pageFn.create = createPage;

        Object.defineProperty(pageFn, 'len', {
          get: function(){
            return pageInstance.len;
          },
          set: function(val) {
            pageInstance.len = val;
          }
        });

        Object.defineProperty(pageFn, 'current', {
          get: function(){
            return pageInstance.current;
          },
          set: function(val) {
            pageInstance.current = val;
          }
        });

        // In 2.0 these can be named exports
        pageFn.Context = Context;
        pageFn.Route = Route;

        return pageFn;
      }

      /**
       * Register `path` with callback `fn()`,
       * or route `path`, or redirection,
       * or `page.start()`.
       *
       *   page(fn);
       *   page('*', fn);
       *   page('/user/:id', load, user);
       *   page('/user/' + user.id, { some: 'thing' });
       *   page('/user/' + user.id);
       *   page('/from', '/to')
       *   page();
       *
       * @param {string|!Function|!Object} path
       * @param {Function=} fn
       * @api public
       */

      function page(path, fn) {
        // <callback>
        if ('function' === typeof path) {
          return page.call(this, '*', path);
        }

        // route <path> to <callback ...>
        if ('function' === typeof fn) {
          var route = new Route(/** @type {string} */ (path), null, this);
          for (var i = 1; i < arguments.length; ++i) {
            this.callbacks.push(route.middleware(arguments[i]));
          }
          // show <path> with [state]
        } else if ('string' === typeof path) {
          this['string' === typeof fn ? 'redirect' : 'show'](path, fn);
          // start [options]
        } else {
          this.start(path);
        }
      }

      /**
       * Unhandled `ctx`. When it's not the initial
       * popstate then redirect. If you wish to handle
       * 404s on your own use `page('*', callback)`.
       *
       * @param {Context} ctx
       * @api private
       */
      function unhandled(ctx) {
        if (ctx.handled) return;
        var current;
        var page = this;
        var window = page._window;

        if (page._hashbang) {
          current = isLocation && this._getBase() + window.location.hash.replace('#!', '');
        } else {
          current = isLocation && window.location.pathname + window.location.search;
        }

        if (current === ctx.canonicalPath) return;
        page.stop();
        ctx.handled = false;
        isLocation && (window.location.href = ctx.canonicalPath);
      }

      /**
       * Escapes RegExp characters in the given string.
       *
       * @param {string} s
       * @api private
       */
      function escapeRegExp(s) {
        return s.replace(/([.+*?=^!:${}()[\]|/\\])/g, '\\$1');
      }

      /**
       * Initialize a new "request" `Context`
       * with the given `path` and optional initial `state`.
       *
       * @constructor
       * @param {string} path
       * @param {Object=} state
       * @api public
       */

      function Context(path, state, pageInstance) {
        var _page = this.page = pageInstance || page;
        var window = _page._window;
        var hashbang = _page._hashbang;

        var pageBase = _page._getBase();
        if ('/' === path[0] && 0 !== path.indexOf(pageBase)) path = pageBase + (hashbang ? '#!' : '') + path;
        var i = path.indexOf('?');

        this.canonicalPath = path;
        var re = new RegExp('^' + escapeRegExp(pageBase));
        this.path = path.replace(re, '') || '/';
        if (hashbang) this.path = this.path.replace('#!', '') || '/';

        this.title = (hasDocument && window.document.title);
        this.state = state || {};
        this.state.path = path;
        this.querystring = ~i ? _page._decodeURLEncodedURIComponent(path.slice(i + 1)) : '';
        this.pathname = _page._decodeURLEncodedURIComponent(~i ? path.slice(0, i) : path);
        this.params = {};

        // fragment
        this.hash = '';
        if (!hashbang) {
          if (!~this.path.indexOf('#')) return;
          var parts = this.path.split('#');
          this.path = this.pathname = parts[0];
          this.hash = _page._decodeURLEncodedURIComponent(parts[1]) || '';
          this.querystring = this.querystring.split('#')[0];
        }
      }

      /**
       * Push state.
       *
       * @api private
       */

      Context.prototype.pushState = function() {
        var page = this.page;
        var window = page._window;
        var hashbang = page._hashbang;

        page.len++;
        if (hasHistory) {
            window.history.pushState(this.state, this.title,
              hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
        }
      };

      /**
       * Save the context state.
       *
       * @api public
       */

      Context.prototype.save = function() {
        var page = this.page;
        if (hasHistory) {
            page._window.history.replaceState(this.state, this.title,
              page._hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
        }
      };

      /**
       * Initialize `Route` with the given HTTP `path`,
       * and an array of `callbacks` and `options`.
       *
       * Options:
       *
       *   - `sensitive`    enable case-sensitive routes
       *   - `strict`       enable strict matching for trailing slashes
       *
       * @constructor
       * @param {string} path
       * @param {Object=} options
       * @api private
       */

      function Route(path, options, page) {
        var _page = this.page = page || globalPage;
        var opts = options || {};
        opts.strict = opts.strict || _page._strict;
        this.path = (path === '*') ? '(.*)' : path;
        this.method = 'GET';
        this.regexp = pathToRegexp_1(this.path, this.keys = [], opts);
      }

      /**
       * Return route middleware with
       * the given callback `fn()`.
       *
       * @param {Function} fn
       * @return {Function}
       * @api public
       */

      Route.prototype.middleware = function(fn) {
        var self = this;
        return function(ctx, next) {
          if (self.match(ctx.path, ctx.params)) {
            ctx.routePath = self.path;
            return fn(ctx, next);
          }
          next();
        };
      };

      /**
       * Check if this route matches `path`, if so
       * populate `params`.
       *
       * @param {string} path
       * @param {Object} params
       * @return {boolean}
       * @api private
       */

      Route.prototype.match = function(path, params) {
        var keys = this.keys,
          qsIndex = path.indexOf('?'),
          pathname = ~qsIndex ? path.slice(0, qsIndex) : path,
          m = this.regexp.exec(decodeURIComponent(pathname));

        if (!m) return false;

        delete params[0];

        for (var i = 1, len = m.length; i < len; ++i) {
          var key = keys[i - 1];
          var val = this.page._decodeURLEncodedURIComponent(m[i]);
          if (val !== undefined || !(hasOwnProperty.call(params, key.name))) {
            params[key.name] = val;
          }
        }

        return true;
      };


      /**
       * Module exports.
       */

      var globalPage = createPage();
      var page_js = globalPage;
      var default_1 = globalPage;

    page_js.default = default_1;

    return page_js;

    })));
    });

    var wordList = [
      // Borrowed from xkcd password generator which borrowed it from wherever
      "ability","able","aboard","about","above","accept","accident","according",
      "account","accurate","acres","across","act","action","active","activity",
      "actual","actually","add","addition","additional","adjective","adult","adventure",
      "advice","affect","afraid","after","afternoon","again","against","age",
      "ago","agree","ahead","aid","air","airplane","alike","alive",
      "all","allow","almost","alone","along","aloud","alphabet","already",
      "also","although","am","among","amount","ancient","angle","angry",
      "animal","announced","another","answer","ants","any","anybody","anyone",
      "anything","anyway","anywhere","apart","apartment","appearance","apple","applied",
      "appropriate","are","area","arm","army","around","arrange","arrangement",
      "arrive","arrow","art","article","as","aside","ask","asleep",
      "at","ate","atmosphere","atom","atomic","attached","attack","attempt",
      "attention","audience","author","automobile","available","average","avoid","aware",
      "away","baby","back","bad","badly","bag","balance","ball",
      "balloon","band","bank","bar","bare","bark","barn","base",
      "baseball","basic","basis","basket","bat","battle","be","bean",
      "bear","beat","beautiful","beauty","became","because","become","becoming",
      "bee","been","before","began","beginning","begun","behavior","behind",
      "being","believed","bell","belong","below","belt","bend","beneath",
      "bent","beside","best","bet","better","between","beyond","bicycle",
      "bigger","biggest","bill","birds","birth","birthday","bit","bite",
      "black","blank","blanket","blew","blind","block","blood","blow",
      "blue","board","boat","body","bone","book","border","born",
      "both","bottle","bottom","bound","bow","bowl","box","boy",
      "brain","branch","brass","brave","bread","break","breakfast","breath",
      "breathe","breathing","breeze","brick","bridge","brief","bright","bring",
      "broad","broke","broken","brother","brought","brown","brush","buffalo",
      "build","building","built","buried","burn","burst","bus","bush",
      "business","busy","but","butter","buy","by","cabin","cage",
      "cake","call","calm","came","camera","camp","can","canal",
      "cannot","cap","capital","captain","captured","car","carbon","card",
      "care","careful","carefully","carried","carry","case","cast","castle",
      "cat","catch","cattle","caught","cause","cave","cell","cent",
      "center","central","century","certain","certainly","chain","chair","chamber",
      "chance","change","changing","chapter","character","characteristic","charge","chart",
      "check","cheese","chemical","chest","chicken","chief","child","children",
      "choice","choose","chose","chosen","church","circle","circus","citizen",
      "city","class","classroom","claws","clay","clean","clear","clearly",
      "climate","climb","clock","close","closely","closer","cloth","clothes",
      "clothing","cloud","club","coach","coal","coast","coat","coffee",
      "cold","collect","college","colony","color","column","combination","combine",
      "come","comfortable","coming","command","common","community","company","compare",
      "compass","complete","completely","complex","composed","composition","compound","concerned",
      "condition","congress","connected","consider","consist","consonant","constantly","construction",
      "contain","continent","continued","contrast","control","conversation","cook","cookies",
      "cool","copper","copy","corn","corner","correct","correctly","cost",
      "cotton","could","count","country","couple","courage","course","court",
      "cover","cow","cowboy","crack","cream","create","creature","crew",
      "crop","cross","crowd","cry","cup","curious","current","curve",
      "customs","cut","cutting","daily","damage","dance","danger","dangerous",
      "dark","darkness","date","daughter","dawn","day","dead","deal",
      "dear","death","decide","declared","deep","deeply","deer","definition",
      "degree","depend","depth","describe","desert","design","desk","detail",
      "determine","develop","development","diagram","diameter","did","die","differ",
      "difference","different","difficult","difficulty","dig","dinner","direct","direction",
      "directly","dirt","dirty","disappear","discover","discovery","discuss","discussion",
      "disease","dish","distance","distant","divide","division","do","doctor",
      "does","dog","doing","doll","dollar","done","donkey","door",
      "dot","double","doubt","down","dozen","draw","drawn","dream",
      "dress","drew","dried","drink","drive","driven","driver","driving",
      "drop","dropped","drove","dry","duck","due","dug","dull",
      "during","dust","duty","each","eager","ear","earlier","early",
      "earn","earth","easier","easily","east","easy","eat","eaten",
      "edge","education","effect","effort","egg","eight","either","electric",
      "electricity","element","elephant","eleven","else","empty","end","enemy",
      "energy","engine","engineer","enjoy","enough","enter","entire","entirely",
      "environment","equal","equally","equator","equipment","escape","especially","essential",
      "establish","even","evening","event","eventually","ever","every","everybody",
      "everyone","everything","everywhere","evidence","exact","exactly","examine","example",
      "excellent","except","exchange","excited","excitement","exciting","exclaimed","exercise",
      "exist","expect","experience","experiment","explain","explanation","explore","express",
      "expression","extra","eye","face","facing","fact","factor","factory",
      "failed","fair","fairly","fall","fallen","familiar","family","famous",
      "far","farm","farmer","farther","fast","fastened","faster","fat",
      "father","favorite","fear","feathers","feature","fed","feed","feel",
      "feet","fell","fellow","felt","fence","few","fewer","field",
      "fierce","fifteen","fifth","fifty","fight","fighting","figure","fill",
      "film","final","finally","find","fine","finest","finger","finish",
      "fire","fireplace","firm","first","fish","five","fix","flag",
      "flame","flat","flew","flies","flight","floating","floor","flow",
      "flower","fly","fog","folks","follow","food","foot","football",
      "for","force","foreign","forest","forget","forgot","forgotten","form",
      "former","fort","forth","forty","forward","fought","found","four",
      "fourth","fox","frame","free","freedom","frequently","fresh","friend",
      "friendly","frighten","frog","from","front","frozen","fruit","fuel",
      "full","fully","fun","function","funny","fur","furniture","further",
      "future","gain","game","garage","garden","gas","gasoline","gate",
      "gather","gave","general","generally","gentle","gently","get","getting",
      "giant","gift","girl","give","given","giving","glad","glass",
      "globe","go","goes","gold","golden","gone","good","goose",
      "got","government","grabbed","grade","gradually","grain","grandfather","grandmother",
      "graph","grass","gravity","gray","great","greater","greatest","greatly",
      "green","grew","ground","group","grow","grown","growth","guard",
      "guess","guide","gulf","gun","habit","had","hair","half",
      "halfway","hall","hand","handle","handsome","hang","happen","happened",
      "happily","happy","harbor","hard","harder","hardly","has","hat",
      "have","having","hay","he","headed","heading","health","heard",
      "hearing","heart","heat","heavy","height","held","hello","help",
      "helpful","her","herd","here","herself","hidden","hide","high",
      "higher","highest","highway","hill","him","himself","his","history",
      "hit","hold","hole","hollow","home","honor","hope","horn",
      "horse","hospital","hot","hour","house","how","however","huge",
      "human","hundred","hung","hungry","hunt","hunter","hurried","hurry",
      "hurt","husband","ice","idea","identity","if","ill","image",
      "imagine","immediately","importance","important","impossible","improve","in","inch",
      "include","including","income","increase","indeed","independent","indicate","individual",
      "industrial","industry","influence","information","inside","instance","instant","instead",
      "instrument","interest","interior","into","introduced","invented","involved","iron",
      "is","island","it","its","itself","jack","jar","jet",
      "job","join","joined","journey","joy","judge","jump","jungle",
      "just","keep","kept","key","kids","kill","kind","kitchen",
      "knew","knife","know","knowledge","known","label","labor","lack",
      "lady","laid","lake","lamp","land","language","large","larger",
      "largest","last","late","later","laugh","law","lay","layers",
      "lead","leader","leaf","learn","least","leather","leave","leaving",
      "led","left","leg","length","lesson","let","letter","level",
      "library","lie","life","lift","light","like","likely","limited",
      "line","lion","lips","liquid","list","listen","little","live",
      "living","load","local","locate","location","log","lonely","long",
      "longer","look","loose","lose","loss","lost","lot","loud",
      "love","lovely","low","lower","luck","lucky","lunch","lungs",
      "lying","machine","machinery","mad","made","magic","magnet","mail",
      "main","mainly","major","make","making","man","managed","manner",
      "manufacturing","many","map","mark","market","married","mass","massage",
      "master","material","mathematics","matter","may","maybe","me","meal",
      "mean","means","meant","measure","meat","medicine","meet","melted",
      "member","memory","men","mental","merely","met","metal","method",
      "mice","middle","might","mighty","mile","military","milk","mill",
      "mind","mine","minerals","minute","mirror","missing","mission","mistake",
      "mix","mixture","model","modern","molecular","moment","money","monkey",
      "month","mood","moon","more","morning","most","mostly","mother",
      "motion","motor","mountain","mouse","mouth","move","movement","movie",
      "moving","mud","muscle","music","musical","must","my","myself",
      "mysterious","nails","name","nation","national","native","natural","naturally",
      "nature","near","nearby","nearer","nearest","nearly","necessary","neck",
      "needed","needle","needs","negative","neighbor","neighborhood","nervous","nest",
      "never","new","news","newspaper","next","nice","night","nine",
      "no","nobody","nodded","noise","none","noon","nor","north",
      "nose","not","note","noted","nothing","notice","noun","now",
      "number","numeral","nuts","object","observe","obtain","occasionally","occur",
      "ocean","of","off","offer","office","officer","official","oil",
      "old","older","oldest","on","once","one","only","onto",
      "open","operation","opinion","opportunity","opposite","or","orange","orbit",
      "order","ordinary","organization","organized","origin","original","other","ought",
      "our","ourselves","out","outer","outline","outside","over","own",
      "owner","oxygen","pack","package","page","paid","pain","paint",
      "pair","palace","pale","pan","paper","paragraph","parallel","parent",
      "park","part","particles","particular","particularly","partly","parts","party",
      "pass","passage","past","path","pattern","pay","peace","pen",
      "pencil","people","per","percent","perfect","perfectly","perhaps","period",
      "person","personal","pet","phrase","physical","piano","pick","picture",
      "pictured","pie","piece","pig","pile","pilot","pine","pink",
      "pipe","pitch","place","plain","plan","plane","planet","planned",
      "planning","plant","plastic","plate","plates","play","pleasant","please",
      "pleasure","plenty","plural","plus","pocket","poem","poet","poetry",
      "point","pole","police","policeman","political","pond","pony","pool",
      "poor","popular","population","porch","port","position","positive","possible",
      "possibly","post","pot","potatoes","pound","pour","powder","power",
      "powerful","practical","practice","prepare","present","president","press","pressure",
      "pretty","prevent","previous","price","pride","primitive","principal","principle",
      "printed","private","prize","probably","problem","process","produce","product",
      "production","program","progress","promised","proper","properly","property","protection",
      "proud","prove","provide","public","pull","pupil","pure","purple",
      "purpose","push","put","putting","quarter","queen","question","quick",
      "quickly","quiet","quietly","quite","rabbit","race","radio","railroad",
      "rain","raise","ran","ranch","range","rapidly","rate","rather",
      "raw","rays","reach","read","reader","ready","real","realize",
      "rear","reason","recall","receive","recent","recently","recognize","record",
      "red","refer","refused","region","regular","related","relationship","religious",
      "remain","remarkable","remember","remove","repeat","replace","replied","report",
      "represent","require","research","respect","rest","result","return","review",
      "rhyme","rhythm","rice","rich","ride","riding","right","ring",
      "rise","rising","river","road","roar","rock","rocket","rocky",
      "rod","roll","roof","room","root","rope","rose","rough",
      "round","route","row","rubbed","rubber","rule","ruler","run",
      "running","rush","sad","saddle","safe","safety","said","sail",
      "sale","salmon","salt","same","sand","sang","sat","satellites",
      "satisfied","save","saved","saw","say","scale","scared","scene",
      "school","science","scientific","scientist","score","screen","sea","search",
      "season","seat","second","secret","section","see","seed","seeing",
      "seems","seen","seldom","select","selection","sell","send","sense",
      "sent","sentence","separate","series","serious","serve","service","sets",
      "setting","settle","settlers","seven","several","shade","shadow","shake",
      "shaking","shall","shallow","shape","share","sharp","she","sheep",
      "sheet","shelf","shells","shelter","shine","shinning","ship","shirt",
      "shoe","shoot","shop","shore","short","shorter","shot","should",
      "shoulder","shout","show","shown","shut","sick","sides","sight",
      "sign","signal","silence","silent","silk","silly","silver","similar",
      "simple","simplest","simply","since","sing","single","sink","sister",
      "sit","sitting","situation","six","size","skill","skin","sky",
      "slabs","slave","sleep","slept","slide","slight","slightly","slip",
      "slipped","slope","slow","slowly","small","smaller","smallest","smell",
      "smile","smoke","smooth","snake","snow","so","soap","social",
      "society","soft","softly","soil","solar","sold","soldier","solid",
      "solution","solve","some","somebody","somehow","someone","something","sometime",
      "somewhere","son","song","soon","sort","sound","source","south",
      "southern","space","speak","special","species","specific","speech","speed",
      "spell","spend","spent","spider","spin","spirit","spite","split",
      "spoken","sport","spread","spring","square","stage","stairs","stand",
      "standard","star","stared","start","state","statement","station","stay",
      "steady","steam","steel","steep","stems","step","stepped","stick",
      "stiff","still","stock","stomach","stone","stood","stop","stopped",
      "store","storm","story","stove","straight","strange","stranger","straw",
      "stream","street","strength","stretch","strike","string","strip","strong",
      "stronger","struck","structure","struggle","stuck","student","studied","studying",
      "subject","substance","success","successful","such","sudden","suddenly","sugar",
      "suggest","suit","sum","summer","sun","sunlight","supper","supply",
      "support","suppose","sure","surface","surprise","surrounded","swam","sweet",
      "swept","swim","swimming","swing","swung","syllable","symbol","system",
      "table","tail","take","taken","tales","talk","tall","tank",
      "tape","task","taste","taught","tax","tea","teach","teacher",
      "team","tears","teeth","telephone","television","tell","temperature","ten",
      "tent","term","terrible","test","than","thank","that","thee",
      "them","themselves","then","theory","there","therefore","these","they",
      "thick","thin","thing","think","third","thirty","this","those",
      "thou","though","thought","thousand","thread","three","threw","throat",
      "through","throughout","throw","thrown","thumb","thus","thy","tide",
      "tie","tight","tightly","till","time","tin","tiny","tip",
      "tired","title","to","tobacco","today","together","told","tomorrow",
      "tone","tongue","tonight","too","took","tool","top","topic",
      "torn","total","touch","toward","tower","town","toy","trace",
      "track","trade","traffic","trail","train","transportation","trap","travel",
      "treated","tree","triangle","tribe","trick","tried","trip","troops",
      "tropical","trouble","truck","trunk","truth","try","tube","tune",
      "turn","twelve","twenty","twice","two","type","typical","uncle",
      "under","underline","understanding","unhappy","union","unit","universe","unknown",
      "unless","until","unusual","up","upon","upper","upward","us",
      "use","useful","using","usual","usually","valley","valuable","value",
      "vapor","variety","various","vast","vegetable","verb","vertical","very",
      "vessels","victory","view","village","visit","visitor","voice","volume",
      "vote","vowel","voyage","wagon","wait","walk","wall","want",
      "war","warm","warn","was","wash","waste","watch","water",
      "wave","way","we","weak","wealth","wear","weather","week",
      "weigh","weight","welcome","well","went","were","west","western",
      "wet","whale","what","whatever","wheat","wheel","when","whenever",
      "where","wherever","whether","which","while","whispered","whistle","white",
      "who","whole","whom","whose","why","wide","widely","wife",
      "wild","will","willing","win","wind","window","wing","winter",
      "wire","wise","wish","with","within","without","wolf","women",
      "won","wonder","wonderful","wood","wooden","wool","word","wore",
      "work","worker","world","worried","worry","worse","worth","would",
      "wrapped","write","writer","writing","written","wrong","wrote","yard",
      "year","yellow","yes","yesterday","yet","you","young","younger",
      "your","yourself","youth","zero","zebra","zipper","zoo","zulu"
    ];

    function words(options) {

      function word() {
        if (options && options.maxLength > 1) {
          return generateWordWithMaxLength();
        } else {
          return generateRandomWord();
        }
      }

      function generateWordWithMaxLength() {
        var rightSize = false;
        var wordUsed;
        while (!rightSize) {  
          wordUsed = generateRandomWord();
          if(wordUsed.length <= options.maxLength) {
            rightSize = true;
          }

        }
        return wordUsed;
      }

      function generateRandomWord() {
        return wordList[randInt(wordList.length)];
      }

      function randInt(lessThan) {
        return Math.floor(Math.random() * lessThan);
      }

      // No arguments = generate one word
      if (typeof(options) === 'undefined') {
        return word();
      }

      // Just a number = return that many words
      if (typeof(options) === 'number') {
        options = { exactly: options };
      }

      // options supported: exactly, min, max, join
      if (options.exactly) {
        options.min = options.exactly;
        options.max = options.exactly;
      }
      
      // not a number = one word par string
      if (typeof(options.wordsPerString) !== 'number') {
        options.wordsPerString = 1;
      }

      //not a function = returns the raw word
      if (typeof(options.formatter) !== 'function') {
        options.formatter = (word) => word;
      }

      //not a string = separator is a space
      if (typeof(options.separator) !== 'string') {
        options.separator = ' ';
      }

      var total = options.min + randInt(options.max + 1 - options.min);
      var results = [];
      var token = '';
      var relativeIndex = 0;

      for (var i = 0; (i < total * options.wordsPerString); i++) {
        if (relativeIndex === options.wordsPerString - 1) {
          token += options.formatter(word(), relativeIndex);
        }
        else {
          token += options.formatter(word(), relativeIndex) + options.separator;
        }
        relativeIndex++;
        if ((i + 1) % options.wordsPerString === 0) {
          results.push(token);
          token = ''; 
          relativeIndex = 0;
        }
       
      }
      if (typeof options.join === 'string') {
        results = results.join(options.join);
      }

      return results;
    }

    var randomWords = words;
    // Export the word list as it is often useful
    words.wordList = wordList;

    /* src/pages/Home.svelte generated by Svelte v3.30.0 */
    const file = "src/pages/Home.svelte";

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let h2;
    	let t3;
    	let form;
    	let label;
    	let t4;
    	let input;
    	let t5;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Join Room";
    			t1 = space();
    			h2 = element("h2");
    			h2.textContent = "Create or join a room";
    			t3 = space();
    			form = element("form");
    			label = element("label");
    			t4 = text("Room ID:\n\t\t\t");
    			input = element("input");
    			t5 = space();
    			button = element("button");
    			button.textContent = "Submit";
    			attr_dev(h1, "class", "svelte-1tky8bj");
    			add_location(h1, file, 13, 1, 266);
    			add_location(h2, file, 15, 1, 287);
    			attr_dev(input, "id", "roomId");
    			attr_dev(input, "name", "roomId");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "maxlength", "100");
    			input.required = true;
    			add_location(input, file, 22, 3, 357);
    			add_location(label, file, 20, 2, 334);
    			attr_dev(button, "type", "submit");
    			add_location(button, file, 24, 2, 461);
    			add_location(form, file, 19, 1, 325);
    			attr_dev(main, "class", "svelte-1tky8bj");
    			add_location(main, file, 12, 0, 258);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, h2);
    			append_dev(main, t3);
    			append_dev(main, form);
    			append_dev(form, label);
    			append_dev(label, t4);
    			append_dev(label, input);
    			set_input_value(input, /*roomId*/ ctx[0]);
    			append_dev(form, t5);
    			append_dev(form, button);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[2]),
    					listen_dev(button, "click", /*joinRoom*/ ctx[1], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*roomId*/ 1 && input.value !== /*roomId*/ ctx[0]) {
    				set_input_value(input, /*roomId*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Home", slots, []);

    	let roomId = randomWords({
    		exactly: 1,
    		wordsPerString: 3,
    		separator: "-",
    		maxLength: 5
    	});

    	function joinRoom(e) {
    		e.preventDefault();
    		page(`/room/${roomId}`);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		roomId = this.value;
    		$$invalidate(0, roomId);
    	}

    	$$self.$capture_state = () => ({ router: page, randomWords, roomId, joinRoom });

    	$$self.$inject_state = $$props => {
    		if ("roomId" in $$props) $$invalidate(0, roomId = $$props.roomId);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [roomId, joinRoom, input_input_handler];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src/pages/Room.svelte generated by Svelte v3.30.0 */
    const file$1 = "src/pages/Room.svelte";

    function create_fragment$1(ctx) {
    	let main;
    	let h1;
    	let t0_value = /*params*/ ctx[0].id + "";
    	let t0;
    	let t1;
    	let h2;
    	let t3;
    	let form;
    	let label;
    	let t4;
    	let input;
    	let t5;
    	let button0;
    	let t7;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			t0 = text(t0_value);
    			t1 = space();
    			h2 = element("h2");
    			h2.textContent = "What is your name:";
    			t3 = space();
    			form = element("form");
    			label = element("label");
    			t4 = text("Name:\n\t\t\t");
    			input = element("input");
    			t5 = space();
    			button0 = element("button");
    			button0.textContent = "Join Audience";
    			t7 = space();
    			button1 = element("button");
    			button1.textContent = "Join as Player";
    			attr_dev(h1, "class", "svelte-1tky8bj");
    			add_location(h1, file$1, 17, 1, 262);
    			add_location(h2, file$1, 19, 1, 285);
    			attr_dev(input, "id", "name");
    			attr_dev(input, "name", "name");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "maxlength", "100");
    			input.required = true;
    			add_location(input, file$1, 26, 3, 349);
    			add_location(label, file$1, 24, 2, 329);
    			attr_dev(button0, "type", "submit");
    			add_location(button0, file$1, 28, 2, 454);
    			attr_dev(button1, "type", "submit");
    			add_location(button1, file$1, 29, 2, 525);
    			add_location(form, file$1, 23, 1, 320);
    			attr_dev(main, "class", "svelte-1tky8bj");
    			add_location(main, file$1, 16, 0, 254);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(h1, t0);
    			append_dev(main, t1);
    			append_dev(main, h2);
    			append_dev(main, t3);
    			append_dev(main, form);
    			append_dev(form, label);
    			append_dev(label, t4);
    			append_dev(label, input);
    			set_input_value(input, /*params*/ ctx[0].name);
    			append_dev(form, t5);
    			append_dev(form, button0);
    			append_dev(form, t7);
    			append_dev(form, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[3]),
    					listen_dev(button0, "click", /*joinAudience*/ ctx[1], false, false, false),
    					listen_dev(button1, "click", /*joinPlayers*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*params*/ 1 && t0_value !== (t0_value = /*params*/ ctx[0].id + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*params*/ 1 && input.value !== /*params*/ ctx[0].name) {
    				set_input_value(input, /*params*/ ctx[0].name);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Room", slots, []);
    	let { params } = $$props;

    	function joinAudience(e) {
    		e.preventDefault();
    		page(`/room/${params.id}/audience`);
    	}

    	function joinPlayers() {
    		e.preventDefault();
    		page(`/room/${params.id}/player`);
    	}

    	const writable_props = ["params"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Room> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		params.name = this.value;
    		$$invalidate(0, params);
    	}

    	$$self.$$set = $$props => {
    		if ("params" in $$props) $$invalidate(0, params = $$props.params);
    	};

    	$$self.$capture_state = () => ({
    		router: page,
    		params,
    		joinAudience,
    		joinPlayers
    	});

    	$$self.$inject_state = $$props => {
    		if ("params" in $$props) $$invalidate(0, params = $$props.params);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [params, joinAudience, joinPlayers, input_input_handler];
    }

    class Room extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { params: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Room",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*params*/ ctx[0] === undefined && !("params" in props)) {
    			console.warn("<Room> was created without expected prop 'params'");
    		}
    	}

    	get params() {
    		throw new Error("<Room>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set params(value) {
    		throw new Error("<Room>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/pages/Audience.svelte generated by Svelte v3.30.0 */
    const file$2 = "src/pages/Audience.svelte";

    function create_fragment$2(ctx) {
    	let main;
    	let h1;
    	let t0_value = /*params*/ ctx[0].id + "";
    	let t0;
    	let t1;
    	let h2;

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			t0 = text(t0_value);
    			t1 = space();
    			h2 = element("h2");
    			h2.textContent = "Participants";
    			attr_dev(h1, "class", "svelte-1tky8bj");
    			add_location(h1, file$2, 11, 1, 111);
    			add_location(h2, file$2, 13, 1, 134);
    			attr_dev(main, "class", "svelte-1tky8bj");
    			add_location(main, file$2, 10, 0, 103);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(h1, t0);
    			append_dev(main, t1);
    			append_dev(main, h2);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*params*/ 1 && t0_value !== (t0_value = /*params*/ ctx[0].id + "")) set_data_dev(t0, t0_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Audience", slots, []);
    	let { params } = $$props;

    	onMount(async () => {
    		
    	});

    	const writable_props = ["params"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Audience> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("params" in $$props) $$invalidate(0, params = $$props.params);
    	};

    	$$self.$capture_state = () => ({ onMount, params });

    	$$self.$inject_state = $$props => {
    		if ("params" in $$props) $$invalidate(0, params = $$props.params);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [params];
    }

    class Audience extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { params: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Audience",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*params*/ ctx[0] === undefined && !("params" in props)) {
    			console.warn("<Audience> was created without expected prop 'params'");
    		}
    	}

    	get params() {
    		throw new Error("<Audience>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set params(value) {
    		throw new Error("<Audience>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/pages/Player.svelte generated by Svelte v3.30.0 */

    const { console: console_1 } = globals;
    const file$3 = "src/pages/Player.svelte";

    function create_fragment$3(ctx) {
    	let main;
    	let h1;
    	let t0_value = /*params*/ ctx[0].id + "";
    	let t0;
    	let t1;
    	let h2;

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			t0 = text(t0_value);
    			t1 = space();
    			h2 = element("h2");
    			h2.textContent = "Participants";
    			attr_dev(h1, "class", "svelte-1tky8bj");
    			add_location(h1, file$3, 16, 1, 350);
    			add_location(h2, file$3, 18, 1, 373);
    			attr_dev(main, "class", "svelte-1tky8bj");
    			add_location(main, file$3, 15, 0, 342);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(h1, t0);
    			append_dev(main, t1);
    			append_dev(main, h2);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*params*/ 1 && t0_value !== (t0_value = /*params*/ ctx[0].id + "")) set_data_dev(t0, t0_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Player", slots, []);
    	let { params } = $$props;

    	onMount(async () => {
    		var channel = pusher.subscribe(params.id);
    		var presenceChannel = pusher.subscribe("presence-" + params.id);
    		console.log(presenceChannel.members);

    		channel.bind("my-event", function (data) {
    			alert(JSON.stringify(data));
    		});
    	});

    	const writable_props = ["params"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Player> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("params" in $$props) $$invalidate(0, params = $$props.params);
    	};

    	$$self.$capture_state = () => ({ onMount, params });

    	$$self.$inject_state = $$props => {
    		if ("params" in $$props) $$invalidate(0, params = $$props.params);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [params];
    }

    class Player extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { params: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Player",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*params*/ ctx[0] === undefined && !("params" in props)) {
    			console_1.warn("<Player> was created without expected prop 'params'");
    		}
    	}

    	get params() {
    		throw new Error("<Player>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set params(value) {
    		throw new Error("<Player>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.30.0 */

    function create_fragment$4(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*page*/ ctx[0];

    	function switch_props(ctx) {
    		return {
    			props: { params: /*params*/ ctx[1] },
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const switch_instance_changes = {};
    			if (dirty & /*params*/ 2) switch_instance_changes.params = /*params*/ ctx[1];

    			if (switch_value !== (switch_value = /*page*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let page$1;
    	let params;
    	page("/", () => $$invalidate(0, page$1 = Home));

    	page(
    		"/room/:id",
    		(ctx, next) => {
    			$$invalidate(1, params = ctx.params);
    			next();
    		},
    		() => $$invalidate(0, page$1 = Room)
    	);

    	page(
    		"/room/:id/audience",
    		(ctx, next) => {
    			$$invalidate(1, params = ctx.params);
    			next();
    		},
    		() => $$invalidate(0, page$1 = Audience)
    	);

    	page(
    		"/room/:id/player",
    		(ctx, next) => {
    			$$invalidate(1, params = ctx.params);
    			next();
    		},
    		() => $$invalidate(0, page$1 = Player)
    	);

    	page.start();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		router: page,
    		Home,
    		Room,
    		Audience,
    		Player,
    		page: page$1,
    		params
    	});

    	$$self.$inject_state = $$props => {
    		if ("page" in $$props) $$invalidate(0, page$1 = $$props.page);
    		if ("params" in $$props) $$invalidate(1, params = $$props.params);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [page$1, params];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
