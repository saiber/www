


/***************************************************
 * library/prototype/prototype.js
 ***************************************************/

/*  Prototype JavaScript framework, version 1.5.2_pre0
 *  (c) 2005-2007 Sam Stephenson
 *
 *  Prototype is freely distributable under the terms of an MIT-style license.
 *  For details, see the Prototype web site: http://www.prototypejs.org/
 *
/*--------------------------------------------------------------------------*/

var Prototype = {
  Version: '1.5.2_pre0',

  Browser: {
    IE:     !!(window.attachEvent && !window.opera),
    Opera:  !!window.opera,
    WebKit: navigator.userAgent.indexOf('AppleWebKit/') > -1,
    Gecko:  navigator.userAgent.indexOf('Gecko') > -1 && navigator.userAgent.indexOf('KHTML') == -1
  },

  BrowserFeatures: {
    XPath: !!document.evaluate,
    ElementExtensions: !!window.HTMLElement,
    SpecificElementExtensions:
      (document.createElement('div').__proto__ !==
       document.createElement('form').__proto__)
  },

  ScriptFragment: '<script[^>]*>([\\S\\s]*?)<\/script>',
  JSONFilter: /^\/\*-secure-([\s\S]*)\*\/\s*$/,

  emptyFunction: function() { },
  K: function(x) { return x }
}

var Class = {
  create: function() {
    return function() {
      this.initialize.apply(this, arguments);
    }
  }
}

var Abstract = new Object();

Object.extend = function(destination, source) {
  for (var property in source) {
    destination[property] = source[property];
  }
  return destination;
}

Object.extend(Object, {
  inspect: function(object) {
    try {
      if (object === undefined) return 'undefined';
      if (object === null) return 'null';
      return object.inspect ? object.inspect() : object.toString();
    } catch (e) {
      if (e instanceof RangeError) return '...';
      throw e;
    }
  },

  toJSON: function(object) {
    var type = typeof object;
    switch(type) {
      case 'undefined':
      case 'function':
      case 'unknown': return;
      case 'boolean': return object.toString();
    }
    if (object === null) return 'null';
    if (object.toJSON) return object.toJSON();
    if (object.ownerDocument === document) return;
    var results = [];
    for (var property in object) {
      var value = Object.toJSON(object[property]);
      if (value !== undefined)
        results.push(property.toJSON() + ': ' + value);
    }
    return '{' + results.join(', ') + '}';
  },

  keys: function(object) {
    var keys = [];
    for (var property in object)
      keys.push(property);
    return keys;
  },

  values: function(object) {
    var values = [];
    for (var property in object)
      values.push(object[property]);
    return values;
  },

  clone: function(object) {
    return Object.extend({}, object);
  }
});

Object.extend(Function.prototype, {
  bind: function() {
    var __method = this, args = $A(arguments), object = args.shift();
    return function() {
      return __method.apply(object, args.concat($A(arguments)));
    }
  },

  bindAsEventListener: function() {
    var __method = this, args = $A(arguments), object = args.shift();
    return function(event) {
      return __method.apply(object, [event || window.event].concat(args));
    }
  },

  curry: function() {
    var __method = this, args = $A(arguments);
    return function() {
      return __method.apply(this, args.concat($A(arguments)));
    }
  },

  delay: function() {
    var __method = this, args = $A(arguments), timeout = args.shift() * 1000;
    return window.setTimeout(function() {
      return __method.apply(__method, args);
    }, timeout);
  },

  wrap: function(wrapper) {
    var __method = this;
    return function() {
      return wrapper.apply(this, [__method.bind(this)].concat($A(arguments)));
    }
  },

  methodize: function() {
    if (this._methodized) return this._methodized;
    var __method = this;
    return this._methodized = function() {
      return __method.apply(null, [this].concat($A(arguments)));
    };
  }
});

Function.prototype.defer = Function.prototype.delay.curry(0.01);

Date.prototype.toJSON = function() {
  return '"' + this.getFullYear() + '-' +
    (this.getMonth() + 1).toPaddedString(2) + '-' +
    this.getDate().toPaddedString(2) + 'T' +
    this.getHours().toPaddedString(2) + ':' +
    this.getMinutes().toPaddedString(2) + ':' +
    this.getSeconds().toPaddedString(2) + '"';
};

var Try = {
  these: function() {
    var returnValue;

    for (var i = 0, length = arguments.length; i < length; i++) {
      var lambda = arguments[i];
      try {
        returnValue = lambda();
        break;
      } catch (e) {}
    }

    return returnValue;
  }
}

/*--------------------------------------------------------------------------*/

var PeriodicalExecuter = Class.create();
PeriodicalExecuter.prototype = {
  initialize: function(callback, frequency) {
    this.callback = callback;
    this.frequency = frequency;
    this.currentlyExecuting = false;

    this.registerCallback();
  },

  registerCallback: function() {
    this.timer = setInterval(this.onTimerEvent.bind(this), this.frequency * 1000);
  },

  stop: function() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  },

  onTimerEvent: function() {
    if (!this.currentlyExecuting) {
      try {
        this.currentlyExecuting = true;
        this.callback(this);
      } finally {
        this.currentlyExecuting = false;
      }
    }
  }
}
Object.extend(String, {
  interpret: function(value) {
    return value == null ? '' : String(value);
  },
  specialChar: {
    '\b': '\\b',
    '\t': '\\t',
    '\n': '\\n',
    '\f': '\\f',
    '\r': '\\r',
    '\\': '\\\\'
  }
});

Object.extend(String.prototype, {
  gsub: function(pattern, replacement) {
    var result = '', source = this, match;
    replacement = arguments.callee.prepareReplacement(replacement);

    while (source.length > 0) {
      if (match = source.match(pattern)) {
        result += source.slice(0, match.index);
        result += String.interpret(replacement(match));
        source  = source.slice(match.index + match[0].length);
      } else {
        result += source, source = '';
      }
    }
    return result;
  },

  sub: function(pattern, replacement, count) {
    replacement = this.gsub.prepareReplacement(replacement);
    count = count === undefined ? 1 : count;

    return this.gsub(pattern, function(match) {
      if (--count < 0) return match[0];
      return replacement(match);
    });
  },

  scan: function(pattern, iterator) {
    this.gsub(pattern, iterator);
    return this;
  },

  truncate: function(length, truncation) {
    length = length || 30;
    truncation = truncation === undefined ? '...' : truncation;
    return this.length > length ?
      this.slice(0, length - truncation.length) + truncation : String(this);
  },

  strip: function() {
    return this.replace(/^\s+/, '').replace(/\s+$/, '');
  },

  stripTags: function() {
    return this.replace(/<\/?[^>]+>/gi, '');
  },

  stripScripts: function() {
    return this.replace(new RegExp(Prototype.ScriptFragment, 'img'), '');
  },

  extractScripts: function() {
    var matchAll = new RegExp(Prototype.ScriptFragment, 'img');
    var matchOne = new RegExp(Prototype.ScriptFragment, 'im');
    return (this.match(matchAll) || []).map(function(scriptTag) {
      return (scriptTag.match(matchOne) || ['', ''])[1];
    });
  },

  evalScripts: function() {
    return this.extractScripts().map(function(script) { return eval(script) });
  },

  escapeHTML: function() {
    var self = arguments.callee;
    self.text.data = this;
    return self.div.innerHTML;
  },

  unescapeHTML: function() {
    var div = new Element('div');
    div.innerHTML = this.stripTags();
    return div.childNodes[0] ? (div.childNodes.length > 1 ?
      $A(div.childNodes).inject('', function(memo, node) { return memo+node.nodeValue }) :
      div.childNodes[0].nodeValue) : '';
  },

  toQueryParams: function(separator) {
    var match = this.strip().match(/([^?#]*)(#.*)?$/);
    if (!match) return {};

    return match[1].split(separator || '&').inject({}, function(hash, pair) {
      if ((pair = pair.split('='))[0]) {
        var key = decodeURIComponent(pair.shift());
        var value = pair.length > 1 ? pair.join('=') : pair[0];
        if (value != undefined) value = decodeURIComponent(value);

        if (key in hash) {
          if (hash[key].constructor != Array) hash[key] = [hash[key]];
          hash[key].push(value);
        }
        else hash[key] = value;
      }
      return hash;
    });
  },

  toArray: function() {
    return this.split('');
  },

  succ: function() {
    return this.slice(0, this.length - 1) +
      String.fromCharCode(this.charCodeAt(this.length - 1) + 1);
  },

  times: function(count) {
    var result = '';
    for (var i = 0; i < count; i++) result += this;
    return result;
  },

  camelize: function() {
    var parts = this.split('-'), len = parts.length;
    if (len == 1) return parts[0];

    var camelized = this.charAt(0) == '-'
      ? parts[0].charAt(0).toUpperCase() + parts[0].substring(1)
      : parts[0];

    for (var i = 1; i < len; i++)
      camelized += parts[i].charAt(0).toUpperCase() + parts[i].substring(1);

    return camelized;
  },

  capitalize: function() {
    return this.charAt(0).toUpperCase() + this.substring(1).toLowerCase();
  },

  underscore: function() {
    return this.gsub(/::/, '/').gsub(/([A-Z]+)([A-Z][a-z])/,'#{1}_#{2}').gsub(/([a-z\d])([A-Z])/,'#{1}_#{2}').gsub(/-/,'_').toLowerCase();
  },

  dasherize: function() {
    return this.gsub(/_/,'-');
  },

  inspect: function(useDoubleQuotes) {
    var escapedString = this.gsub(/[\x00-\x1f\\]/, function(match) {
      var character = String.specialChar[match[0]];
      return character ? character : '\\u00' + match[0].charCodeAt().toPaddedString(2, 16);
    });
    if (useDoubleQuotes) return '"' + escapedString.replace(/"/g, '\\"') + '"';
    return "'" + escapedString.replace(/'/g, '\\\'') + "'";
  },

  toJSON: function() {
    return this.inspect(true);
  },

  unfilterJSON: function(filter) {
    return this.sub(filter || Prototype.JSONFilter, '#{1}');
  },

  isJSON: function() {
    var str = this.replace(/\\./g, '@').replace(/"[^"\\\n\r]*"/g, '');
    return (/^[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]*$/).test(str);
  },

  evalJSON: function(sanitize) {
    var json = this.unfilterJSON();
    try {
      if (!sanitize || json.isJSON()) return eval('(' + json + ')');
    } catch (e) { }
    throw new SyntaxError('Badly formed JSON string: ' + this.inspect());
  },

  include: function(pattern) {
    return this.indexOf(pattern) > -1;
  },

  startsWith: function(pattern) {
    return this.indexOf(pattern) === 0;
  },

  endsWith: function(pattern) {
    var d = this.length - pattern.length;
    return d >= 0 && this.lastIndexOf(pattern) === d;
  },

  empty: function() {
    return this == '';
  },

  blank: function() {
    return /^\s*$/.test(this);
  }
});

if (Prototype.Browser.WebKit || Prototype.Browser.IE) Object.extend(String.prototype, {
  escapeHTML: function() {
    return this.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  },
  unescapeHTML: function() {
    return this.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
  }
});

String.prototype.gsub.prepareReplacement = function(replacement) {
  if (typeof replacement == 'function') return replacement;
  var template = new Template(replacement);
  return function(match) { return template.evaluate(match) };
}

String.prototype.parseQuery = String.prototype.toQueryParams;

Object.extend(String.prototype.escapeHTML, {
  div:  document.createElement('div'),
  text: document.createTextNode('')
});

with (String.prototype.escapeHTML) div.appendChild(text);

var Template = Class.create();
Template.Pattern = /(^|.|\r|\n)(#\{(.*?)\})/;
Template.prototype = {
  initialize: function(template, pattern) {
    this.template = template.toString();
    this.pattern  = pattern || Template.Pattern;
  },

  evaluate: function(object) {
    return this.template.gsub(this.pattern, function(match) {
      var before = match[1];
      if (before == '\\') return match[2];
      return before + String.interpret(object[match[3]]);
    });
  }
}

var $break = {};

var Enumerable = {
  each: function(iterator) {
    var index = 0;
    try {
      this._each(function(value) {
        iterator(value, index++);
      });
    } catch (e) {
      if (e != $break) throw e;
    }
    return this;
  },

  eachSlice: function(number, iterator) {
    var index = -number, slices = [], array = this.toArray();
    while ((index += number) < array.length)
      slices.push(array.slice(index, index+number));
    return slices.map(iterator);
  },

  all: function(iterator) {
    var result = true;
    this.each(function(value, index) {
      result = result && !!(iterator || Prototype.K)(value, index);
      if (!result) throw $break;
    });
    return result;
  },

  any: function(iterator) {
    var result = false;
    this.each(function(value, index) {
      if (result = !!(iterator || Prototype.K)(value, index))
        throw $break;
    });
    return result;
  },

  collect: function(iterator) {
    var results = [];
    this.each(function(value, index) {
      results.push((iterator || Prototype.K)(value, index));
    });
    return results;
  },

  detect: function(iterator) {
    var result;
    this.each(function(value, index) {
      if (iterator(value, index)) {
        result = value;
        throw $break;
      }
    });
    return result;
  },

  findAll: function(iterator) {
    var results = [];
    this.each(function(value, index) {
      if (iterator(value, index))
        results.push(value);
    });
    return results;
  },

  grep: function(pattern, iterator) {
    var results = [];
    this.each(function(value, index) {
      var stringValue = value.toString();
      if (stringValue.match(pattern))
        results.push((iterator || Prototype.K)(value, index));
    })
    return results;
  },

  include: function(object) {
    var found = false;
    this.each(function(value) {
      if (value == object) {
        found = true;
        throw $break;
      }
    });
    return found;
  },

  inGroupsOf: function(number, fillWith) {
    fillWith = fillWith === undefined ? null : fillWith;
    return this.eachSlice(number, function(slice) {
      while(slice.length < number) slice.push(fillWith);
      return slice;
    });
  },

  inject: function(memo, iterator) {
    this.each(function(value, index) {
      memo = iterator(memo, value, index);
    });
    return memo;
  },

  invoke: function(method) {
    var args = $A(arguments).slice(1);
    return this.map(function(value) {
      return value[method].apply(value, args);
    });
  },

  max: function(iterator) {
    var result;
    this.each(function(value, index) {
      value = (iterator || Prototype.K)(value, index);
      if (result == undefined || value >= result)
        result = value;
    });
    return result;
  },

  min: function(iterator) {
    var result;
    this.each(function(value, index) {
      value = (iterator || Prototype.K)(value, index);
      if (result == undefined || value < result)
        result = value;
    });
    return result;
  },

  partition: function(iterator) {
    var trues = [], falses = [];
    this.each(function(value, index) {
      ((iterator || Prototype.K)(value, index) ?
        trues : falses).push(value);
    });
    return [trues, falses];
  },

  pluck: function(property) {
    var results = [];
    this.each(function(value, index) {
      results.push(value[property]);
    });
    return results;
  },

  reject: function(iterator) {
    var results = [];
    this.each(function(value, index) {
      if (!iterator(value, index))
        results.push(value);
    });
    return results;
  },

  sortBy: function(iterator) {
    return this.map(function(value, index) {
      return {value: value, criteria: iterator(value, index)};
    }).sort(function(left, right) {
      var a = left.criteria, b = right.criteria;
      return a < b ? -1 : a > b ? 1 : 0;
    }).pluck('value');
  },

  toArray: function() {
    return this.map();
  },

  zip: function() {
    var iterator = Prototype.K, args = $A(arguments);
    if (typeof args.last() == 'function')
      iterator = args.pop();

    var collections = [this].concat(args).map($A);
    return this.map(function(value, index) {
      return iterator(collections.pluck(index));
    });
  },

  size: function() {
    return this.toArray().length;
  },

  inspect: function() {
    return '#<Enumerable:' + this.toArray().inspect() + '>';
  }
}

Object.extend(Enumerable, {
  map:     Enumerable.collect,
  find:    Enumerable.detect,
  select:  Enumerable.findAll,
  member:  Enumerable.include,
  entries: Enumerable.toArray
});
function $A(iterable) {
  if (!iterable) return [];
  if (iterable.toArray) {
    return iterable.toArray();
  } else {
    var results = [];
    for (var i = 0, length = iterable.length; i < length; i++)
      results.push(iterable[i]);
    return results;
  }
}

if (Prototype.Browser.WebKit) {
  function $A(iterable) {
    if (!iterable) return [];
    if (!(typeof iterable == 'function' && iterable == '[object NodeList]') &&
      iterable.toArray) {
      return iterable.toArray();
    } else {
      var results = [];
      for (var i = 0, length = iterable.length; i < length; i++)
        results.push(iterable[i]);
      return results;
    }
  }
}

Array.from = $A;

Object.extend(Array.prototype, Enumerable);

if (!Array.prototype._reverse)
  Array.prototype._reverse = Array.prototype.reverse;

Object.extend(Array.prototype, {
  _each: function(iterator) {
    for (var i = 0, length = this.length; i < length; i++)
      iterator(this[i]);
  },

  clear: function() {
    this.length = 0;
    return this;
  },

  first: function() {
    return this[0];
  },

  last: function() {
    return this[this.length - 1];
  },

  compact: function() {
    return this.select(function(value) {
      return value != null;
    });
  },

  flatten: function() {
    return this.inject([], function(array, value) {
      return array.concat(value && value.constructor == Array ?
        value.flatten() : [value]);
    });
  },

  without: function() {
    var values = $A(arguments);
    return this.select(function(value) {
      return !values.include(value);
    });
  },

  indexOf: function(object) {
    for (var i = 0, length = this.length; i < length; i++)
      if (this[i] == object) return i;
    return -1;
  },

  reverse: function(inline) {
    return (inline !== false ? this : this.toArray())._reverse();
  },

  reduce: function() {
    return this.length > 1 ? this : this[0];
  },

  uniq: function(sorted) {
    return this.inject([], function(array, value, index) {
      if (0 == index || (sorted ? array.last() != value : !array.include(value)))
        array.push(value);
      return array;
    });
  },

  clone: function() {
    return [].concat(this);
  },

  size: function() {
    return this.length;
  },

  inspect: function() {
    return '[' + this.map(Object.inspect).join(', ') + ']';
  },

  toJSON: function() {
    var results = [];
    this.each(function(object) {
      var value = Object.toJSON(object);
      if (value !== undefined) results.push(value);
    });
    return '[' + results.join(', ') + ']';
  }
});

Array.prototype.toArray = Array.prototype.clone;

function $w(string) {
  string = string.strip();
  return string ? string.split(/\s+/) : [];
}

if (Prototype.Browser.Opera){
  Array.prototype.concat = function() {
    var array = [];
    for (var i = 0, length = this.length; i < length; i++) array.push(this[i]);
    for (var i = 0, length = arguments.length; i < length; i++) {
      if (arguments[i].constructor == Array) {
        for (var j = 0, arrayLength = arguments[i].length; j < arrayLength; j++)
          array.push(arguments[i][j]);
      } else {
        array.push(arguments[i]);
      }
    }
    return array;
  }
}
Object.extend(Number.prototype, {
  toColorPart: function() {
    return this.toPaddedString(2, 16);
  },

  succ: function() {
    return this + 1;
  },

  times: function(iterator) {
    $R(0, this, true).each(iterator);
    return this;
  },

  toPaddedString: function(length, radix) {
    var string = this.toString(radix || 10);
    return '0'.times(length - string.length) + string;
  },

  toJSON: function() {
    return isFinite(this) ? this.toString() : 'null';
  }
});

$w('abs round ceil floor').each(function(method){
  Number.prototype[method] = Math[method].methodize()
});
var Hash = function(object) {
  if (object instanceof Hash) this.merge(object);
  else Object.extend(this, object || {});
};

Object.extend(Hash, {
  toQueryString: function(obj) {
    var parts = [];
    parts.add = arguments.callee.addPair;

    this.prototype._each.call(obj, function(pair) {
      if (!pair.key) return;
      var value = pair.value;

      if (value && typeof value == 'object') {
        if (value.constructor == Array) value.each(function(value) {
          parts.add(pair.key, value);
        });
        return;
      }
      parts.add(pair.key, value);
    });

    return parts.join('&');
  },

  toJSON: function(object) {
    var results = [];
    this.prototype._each.call(object, function(pair) {
      var value = Object.toJSON(pair.value);
      if (value !== undefined) results.push(pair.key.toJSON() + ': ' + value);
    });
    return '{' + results.join(', ') + '}';
  }
});

Hash.toQueryString.addPair = function(key, value, prefix) {
  key = encodeURIComponent(key);
  if (value === undefined) this.push(key);
  else this.push(key + '=' + (value == null ? '' : encodeURIComponent(value)));
}

Object.extend(Hash.prototype, Enumerable);
Object.extend(Hash.prototype, {
  _each: function(iterator) {
    for (var key in this) {
      var value = this[key];
      if (value && value == Hash.prototype[key]) continue;

      var pair = [key, value];
      pair.key = key;
      pair.value = value;
      iterator(pair);
    }
  },

  keys: function() {
    return this.pluck('key');
  },

  values: function() {
    return this.pluck('value');
  },

  index: function(value) {
    var match = this.detect(function(pair) {
      return pair.value === value;
    });
    return match && match.key;
  },

  merge: function(hash) {
    return $H(hash).inject(this, function(mergedHash, pair) {
      mergedHash[pair.key] = pair.value;
      return mergedHash;
    });
  },

  remove: function() {
    var result;
    for(var i = 0, length = arguments.length; i < length; i++) {
      var value = this[arguments[i]];
      if (value !== undefined){
        if (result === undefined) result = value;
        else {
          if (result.constructor != Array) result = [result];
          result.push(value)
        }
      }
      delete this[arguments[i]];
    }
    return result;
  },

  toQueryString: function() {
    return Hash.toQueryString(this);
  },

  inspect: function() {
    return '#<Hash:{' + this.map(function(pair) {
      return pair.map(Object.inspect).join(': ');
    }).join(', ') + '}>';
  },

  toJSON: function() {
    return Hash.toJSON(this);
  }
});

function $H(object) {
  if (object instanceof Hash) return object;
  return new Hash(object);
};

// Safari iterates over shadowed properties
if (function() {
  var i = 0, Test = function(value) { this.key = value };
  Test.prototype.key = 'foo';
  for (var property in new Test('bar')) i++;
  return i > 1;
}()) Hash.prototype._each = function(iterator) {
  var cache = [];
  for (var key in this) {
    var value = this[key];
    if ((value && value == Hash.prototype[key]) || cache.include(key)) continue;
    cache.push(key);
    var pair = [key, value];
    pair.key = key;
    pair.value = value;
    iterator(pair);
  }
};
ObjectRange = Class.create();
Object.extend(ObjectRange.prototype, Enumerable);
Object.extend(ObjectRange.prototype, {
  initialize: function(start, end, exclusive) {
    this.start = start;
    this.end = end;
    this.exclusive = exclusive;
  },

  _each: function(iterator) {
    var value = this.start;
    while (this.include(value)) {
      iterator(value);
      value = value.succ();
    }
  },

  include: function(value) {
    if (value < this.start)
      return false;
    if (this.exclusive)
      return value < this.end;
    return value <= this.end;
  }
});

var $R = function(start, end, exclusive) {
  return new ObjectRange(start, end, exclusive);
}

var Ajax = {
  getTransport: function() {
    return Try.these(
      function() {return new XMLHttpRequest()},
      function() {return new ActiveXObject('Msxml2.XMLHTTP')},
      function() {return new ActiveXObject('Microsoft.XMLHTTP')}
    ) || false;
  },

  activeRequestCount: 0
}

Ajax.Responders = {
  responders: [],

  _each: function(iterator) {
    this.responders._each(iterator);
  },

  register: function(responder) {
    if (!this.include(responder))
      this.responders.push(responder);
  },

  unregister: function(responder) {
    this.responders = this.responders.without(responder);
  },

  dispatch: function(callback, request, transport, json) {
    this.each(function(responder) {
      if (typeof responder[callback] == 'function') {
        try {
          responder[callback].apply(responder, [request, transport, json]);
        } catch (e) {}
      }
    });
  }
};

Object.extend(Ajax.Responders, Enumerable);

Ajax.Responders.register({
  onCreate: function() {
    Ajax.activeRequestCount++;
  },
  onComplete: function() {
    Ajax.activeRequestCount--;
  }
});

Ajax.Base = function() {};
Ajax.Base.prototype = {
  setOptions: function(options) {
    this.options = {
      method:       'post',
      asynchronous: true,
      contentType:  'application/x-www-form-urlencoded',
      encoding:     'UTF-8',
      parameters:   ''
    }
    Object.extend(this.options, options || {});

    this.options.method = this.options.method.toLowerCase();
    if (typeof this.options.parameters == 'string')
      this.options.parameters = this.options.parameters.toQueryParams();
  }
}

Ajax.Request = Class.create();
Ajax.Request.Events =
  ['Uninitialized', 'Loading', 'Loaded', 'Interactive', 'Complete'];

Ajax.Request.prototype = Object.extend(new Ajax.Base(), {
  _complete: false,

  initialize: function(url, options) {
    this.transport = Ajax.getTransport();
    this.setOptions(options);
    this.request(url);
  },

  request: function(url) {
    this.url = url;
    this.method = this.options.method;
    var params = Object.clone(this.options.parameters);

    if (!['get', 'post'].include(this.method)) {
      // simulate other verbs over post
      params['_method'] = this.method;
      this.method = 'post';
    }

    this.parameters = params;

    if (params = Hash.toQueryString(params)) {
      // when GET, append parameters to URL
      if (this.method == 'get')
        this.url += (this.url.include('?') ? '&' : '?') + params;
      else if (/Konqueror|Safari|KHTML/.test(navigator.userAgent))
        params += '&_=';
    }

    try {
      if (this.options.onCreate) this.options.onCreate(this.transport);
      Ajax.Responders.dispatch('onCreate', this, this.transport);

      this.transport.open(this.method.toUpperCase(), this.url,
        this.options.asynchronous);

      if (this.options.asynchronous) this.respondToReadyState.bind(this).defer(1);

      this.transport.onreadystatechange = this.onStateChange.bind(this);
      this.setRequestHeaders();

      this.body = this.method == 'post' ? (this.options.postBody || params) : null;
      this.transport.send(this.body);

      /* Force Firefox to handle ready state 4 for synchronous requests */
      if (!this.options.asynchronous && this.transport.overrideMimeType)
        this.onStateChange();

    }
    catch (e) {
      this.dispatchException(e);
    }
  },

  onStateChange: function() {
    var readyState = this.transport.readyState;
    if (readyState > 1 && !((readyState == 4) && this._complete))
      this.respondToReadyState(this.transport.readyState);
  },

  setRequestHeaders: function() {
    var headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'X-Prototype-Version': Prototype.Version,
      'Accept': 'text/javascript, text/html, application/xml, text/xml, */*'
    };

    if (this.method == 'post') {
      headers['Content-type'] = this.options.contentType +
        (this.options.encoding ? '; charset=' + this.options.encoding : '');

      /* Force "Connection: close" for older Mozilla browsers to work
       * around a bug where XMLHttpRequest sends an incorrect
       * Content-length header. See Mozilla Bugzilla #246651.
       */
      if (this.transport.overrideMimeType &&
          (navigator.userAgent.match(/Gecko\/(\d{4})/) || [0,2005])[1] < 2005)
            headers['Connection'] = 'close';
    }

    // user-defined headers
    if (typeof this.options.requestHeaders == 'object') {
      var extras = this.options.requestHeaders;

      if (typeof extras.push == 'function')
        for (var i = 0, length = extras.length; i < length; i += 2)
          headers[extras[i]] = extras[i+1];
      else
        $H(extras).each(function(pair) { headers[pair.key] = pair.value });
    }

    for (var name in headers)
      this.transport.setRequestHeader(name, headers[name]);
  },

  success: function() {
    return !this.transport.status
        || (this.transport.status >= 200 && this.transport.status < 300);
  },

  respondToReadyState: function(readyState) {
    var state = Ajax.Request.Events[readyState];
    var transport = this.transport, json = this.evalJSON();

    if (state == 'Complete') {
      try {
        this._complete = true;
        (this.options['on' + this.transport.status]
         || this.options['on' + (this.success() ? 'Success' : 'Failure')]
         || Prototype.emptyFunction)(transport, json);
      } catch (e) {
        this.dispatchException(e);
      }

      var contentType = this.getHeader('Content-type');
      if (contentType && contentType.strip().
        match(/^(text|application)\/(x-)?(java|ecma)script(;.*)?$/i))
          this.evalResponse();
    }

    try {
      (this.options['on' + state] || Prototype.emptyFunction)(transport, json);
      Ajax.Responders.dispatch('on' + state, this, transport, json);
    } catch (e) {
      this.dispatchException(e);
    }

    if (state == 'Complete') {
      // avoid memory leak in MSIE: clean up
      this.transport.onreadystatechange = Prototype.emptyFunction;
    }
  },

  getHeader: function(name) {
    try {
      return this.transport.getResponseHeader(name);
    } catch (e) { return null }
  },

  evalJSON: function() {
    try {
      var json = this.getHeader('X-JSON');
      return json ? json.evalJSON() : null;
    } catch (e) { return null }
  },

  evalResponse: function() {
    try {
      return eval((this.transport.responseText || '').unfilterJSON());
    } catch (e) {
      this.dispatchException(e);
    }
  },

  dispatchException: function(exception) {
    (this.options.onException || Prototype.emptyFunction)(this, exception);
    Ajax.Responders.dispatch('onException', this, exception);
  }
});

Ajax.Updater = Class.create();

Object.extend(Object.extend(Ajax.Updater.prototype, Ajax.Request.prototype), {
  initialize: function(container, url, options) {
    this.container = {
      success: (container.success || container),
      failure: (container.failure || (container.success ? null : container))
    }

    this.transport = Ajax.getTransport();
    this.setOptions(options);

    var onComplete = this.options.onComplete || Prototype.emptyFunction;
    this.options.onComplete = (function(transport, param) {
      this.updateContent();
      onComplete(transport, param);
    }).bind(this);

    this.request(url);
  },

  updateContent: function() {
    var receiver = this.container[this.success() ? 'success' : 'failure'];
    var response = this.transport.responseText, options = this.options;

    if (!options.evalScripts) response = response.stripScripts();

    if (receiver = $(receiver)) {
      if (options.insertion) {
        if (typeof options.insertion == 'string') {
          var insertion = {}; insertion[options.insertion] = response;
          receiver.insert(insertion);
        }
        else options.insertion(receiver, response);
      }
      else receiver.update(response);
    }

    if (this.success()) {
      if (this.onComplete) this.onComplete.bind(this).defer();
    }
  }
});

Ajax.PeriodicalUpdater = Class.create();
Ajax.PeriodicalUpdater.prototype = Object.extend(new Ajax.Base(), {
  initialize: function(container, url, options) {
    this.setOptions(options);
    this.onComplete = this.options.onComplete;

    this.frequency = (this.options.frequency || 2);
    this.decay = (this.options.decay || 1);

    this.updater = {};
    this.container = container;
    this.url = url;

    this.start();
  },

  start: function() {
    this.options.onComplete = this.updateComplete.bind(this);
    this.onTimerEvent();
  },

  stop: function() {
    this.updater.options.onComplete = undefined;
    clearTimeout(this.timer);
    (this.onComplete || Prototype.emptyFunction).apply(this, arguments);
  },

  updateComplete: function(request) {
    if (this.options.decay) {
      this.decay = (request.responseText == this.lastText ?
        this.decay * this.options.decay : 1);

      this.lastText = request.responseText;
    }
    this.timer = this.onTimerEvent.bind(this).delay(this.decay * this.frequency);
  },

  onTimerEvent: function() {
    this.updater = new Ajax.Updater(this.container, this.url, this.options);
  }
});
function $(element) {
  if (arguments.length > 1) {
    for (var i = 0, elements = [], length = arguments.length; i < length; i++)
      elements.push($(arguments[i]));
    return elements;
  }
  if (typeof element == 'string')
    element = document.getElementById(element);
  return Element.extend(element);
}

if (Prototype.BrowserFeatures.XPath) {
  document._getElementsByXPath = function(expression, parentElement) {
    var results = [];
    var query = document.evaluate(expression, $(parentElement) || document,
      null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (var i = 0, length = query.snapshotLength; i < length; i++)
      results.push(query.snapshotItem(i));
    return results;
  };

  document.getElementsByClassName = function(className, parentElement) {
    var q = ".//*[contains(concat(' ', @class, ' '), ' " + className + " ')]";
    return document._getElementsByXPath(q, parentElement);
  }

} else document.getElementsByClassName = function(className, parentElement) {
  var children = ($(parentElement) || document.body).getElementsByTagName('*');
  var elements = [], child;
  for (var i = 0, length = children.length; i < length; i++) {
    child = children[i];
    if (Element.hasClassName(child, className))
      elements.push(Element.extend(child));
  }
  return elements;
};

/*--------------------------------------------------------------------------*/

(function() {
  var element = this.Element;
  this.Element = function(tagName, attributes) {
    attributes = attributes || {};
    tagName = tagName.toLowerCase();
    var cache = Element.cache;
    if (Prototype.Browser.IE && attributes.name) {
      tagName = '<' + tagName + ' name="' + attributes.name + '">';
      delete attributes.name;
      return Element.writeAttribute(document.createElement(tagName), attributes);
    }
    if (!cache[tagName]) cache[tagName] = Element.extend(document.createElement(tagName));
    return Element.writeAttribute(cache[tagName].cloneNode(false), attributes);
  };
  Object.extend(this.Element, element || {});
}).call(window);

Element.cache = {};

Element.Methods = {
  visible: function(element) {
    return $(element).style.display != 'none';
  },

  toggle: function(element) {
    element = $(element);
    Element[Element.visible(element) ? 'hide' : 'show'](element);
    return element;
  },

  hide: function(element) {
    $(element).style.display = 'none';
    return element;
  },

  show: function(element) {
    $(element).style.display = '';
    return element;
  },

  remove: function(element) {
    element = $(element);
    element.parentNode.removeChild(element);
    return element;
  },

  update: function(element, html) {
    html = typeof html == 'undefined' ? '' : html.toString();
    $(element).innerHTML = html.stripScripts();
    html.evalScripts.bind(html).defer();
    return element;
  },

  replace: function(element, html) {
    element = $(element);
    html = typeof html == 'undefined' ? '' : html.toString();
    if (element.outerHTML) {
      element.outerHTML = html.stripScripts();
    } else {
      var range = element.ownerDocument.createRange();
      range.selectNode(element);
      element.parentNode.replaceChild(
        range.createContextualFragment(html.stripScripts()), element);
    }
    html.evalScripts.bind(html).defer();
    return element;
  },

  insert: function(element, insertions) {
    element = $(element);

    if (typeof insertions == 'string' || typeof insertions == 'number' ||
        (insertions && insertions.ownerDocument === document))
          insertions = {bottom:insertions};

    var content, t, range;

    for (position in insertions) {
      content  = insertions[position];
      position = position.toLowerCase();
      t = Element._insertionTranslations[position];

      if (content && content.ownerDocument === document) {
        t.insert(element, content);
        continue;
      }

      content = String.interpret(content);

      range = element.ownerDocument.createRange();
      t.initializeRange(element, range);
      t.insert(element, range.createContextualFragment(content.stripScripts()));

      content.evalScripts.bind(content).defer();
    }

    return element;
  },

  wrap: function(element, wrapper) {
    element = $(element);
    wrapper = wrapper || 'div';
    if (typeof wrapper == 'string') wrapper = new Element(wrapper);
    else Element.extend(wrapper);
    element.parentNode.replaceChild(wrapper, element);
    wrapper.appendChild(element);
    return element;
  },

  inspect: function(element) {
    element = $(element);
    var result = '<' + element.tagName.toLowerCase();
    $H({'id': 'id', 'className': 'class'}).each(function(pair) {
      var property = pair.first(), attribute = pair.last();
      var value = (element[property] || '').toString();
      if (value) result += ' ' + attribute + '=' + value.inspect(true);
    });
    return result + '>';
  },

  recursivelyCollect: function(element, property) {
    element = $(element);
    var elements = [];
    while (element = element[property])
      if (element.nodeType == 1)
        elements.push(Element.extend(element));
    return elements;
  },

  ancestors: function(element) {
    return $(element).recursivelyCollect('parentNode');
  },

  descendants: function(element) {
    return $A($(element).getElementsByTagName('*')).each(Element.extend);
  },

  firstDescendant: function(element) {
    element = $(element).firstChild;
    while (element && element.nodeType != 1) element = element.nextSibling;
    return $(element);
  },

  immediateDescendants: function(element) {
    if (!(element = $(element).firstChild)) return [];
    while (element && element.nodeType != 1) element = element.nextSibling;
    if (element) return [element].concat($(element).nextSiblings());
    return [];
  },

  previousSiblings: function(element) {
    return $(element).recursivelyCollect('previousSibling');
  },

  nextSiblings: function(element) {
    return $(element).recursivelyCollect('nextSibling');
  },

  siblings: function(element) {
    element = $(element);
    return element.previousSiblings().reverse().concat(element.nextSiblings());
  },

  match: function(element, selector) {
    if (typeof selector == 'string')
      selector = new Selector(selector);
    return selector.match($(element));
  },

  up: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(element.parentNode);
    var ancestors = element.ancestors();
    return expression ? Selector.findElement(ancestors, expression, index) :
      ancestors[index || 0];
  },

  down: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return element.firstDescendant();
    var descendants = element.descendants();
    return expression ? Selector.findElement(descendants, expression, index) :
      descendants[index || 0];
  },

  previous: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(Selector.handlers.previousElementSibling(element));
    var previousSiblings = element.previousSiblings();
    return expression ? Selector.findElement(previousSiblings, expression, index) :
      previousSiblings[index || 0];
  },

  next: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(Selector.handlers.nextElementSibling(element));
    var nextSiblings = element.nextSiblings();
    return expression ? Selector.findElement(nextSiblings, expression, index) :
      nextSiblings[index || 0];
  },

  getElementsBySelector: function() {
    var args = $A(arguments), element = $(args.shift());
    return Selector.findChildElements(element, args);
  },

  getElementsByClassName: function(element, className) {
    return document.getElementsByClassName(className, element);
  },

  readAttribute: function(element, name) {
    element = $(element);
    if (Prototype.Browser.IE) {
      if (!element.attributes) return null;
      var t = Element._attributeTranslations.read;
      if (t.values[name]) return t.values[name](element, name);
      if (t.names[name])  name = t.names[name];
      var attribute = element.attributes[name];
      return attribute ? attribute.nodeValue : null;
    }
    return element.getAttribute(name);
  },

  writeAttribute: function(element, name, value) {
    element = $(element);
    var attributes = {}, t = Element._attributeTranslations.write;

    if (typeof name == 'object') attributes = name;
    else attributes[name] = value === undefined ? true : value;

    for (var attr in attributes) {
      var name = t.names[attr] || attr, value = attributes[attr];
      if (t.values[attr]) name = t.values[attr](element, value);
      if (value === false || value === null)
        element.removeAttribute(name);
      else if (value === true)
        element.setAttribute(name, name);
      else element.setAttribute(name, value);
    }
    return element;
  },

  getHeight: function(element) {
    return $(element).getDimensions().height;
  },

  getWidth: function(element) {
    return $(element).getDimensions().width;
  },

  classNames: function(element) {
    return new Element.ClassNames(element);
  },

  hasClassName: function(element, className) {
    if (!(element = $(element))) return;
    var elementClassName = element.className;
    if (elementClassName.length == 0) return false;
    if (elementClassName == className ||
        elementClassName.match(new RegExp("(^|\\s)" + className + "(\\s|$)")))
      return true;
    return false;
  },

  addClassName: function(element, className) {
    if (!(element = $(element))) return;
    Element.classNames(element).add(className);
    return element;
  },

  removeClassName: function(element, className) {
    if (!(element = $(element))) return;
    Element.classNames(element).remove(className);
    return element;
  },

  toggleClassName: function(element, className) {
    if (!(element = $(element))) return;
    Element.classNames(element)[element.hasClassName(className) ? 'remove' : 'add'](className);
    return element;
  },

  observe: function() {
    Event.observe.apply(Event, arguments);
    return $A(arguments).first();
  },

  stopObserving: function() {
    Event.stopObserving.apply(Event, arguments);
    return $A(arguments).first();
  },

  // removes whitespace-only text node children
  cleanWhitespace: function(element) {
    element = $(element);
    var node = element.firstChild;
    while (node) {
      var nextNode = node.nextSibling;
      if (node.nodeType == 3 && !/\S/.test(node.nodeValue))
        element.removeChild(node);
      node = nextNode;
    }
    return element;
  },

  empty: function(element) {
    return $(element).innerHTML.blank();
  },

  descendantOf: function(element, ancestor) {
    element = $(element), ancestor = $(ancestor);
    while (element = element.parentNode)
      if (element == ancestor) return true;
    return false;
  },

  scrollTo: function(element) {
    element = $(element);
    var pos = element.cumulativeOffset();
    window.scrollTo(pos[0], pos[1]);
    return element;
  },

  getStyle: function(element, style) {
    element = $(element);
    style = style == 'float' ? 'cssFloat' : style.camelize();
    var value = element.style[style];
    if (!value) {
      var css = document.defaultView.getComputedStyle(element, null);
      value = css ? css[style] : null;
    }
    if (style == 'opacity') return value ? parseFloat(value) : 1.0;
    return value == 'auto' ? null : value;
  },

  getOpacity: function(element) {
    return $(element).getStyle('opacity');
  },

  setStyle: function(element, styles, camelized) {
    element = $(element);
    var elementStyle = element.style;

    for (var property in styles)
      if (property == 'opacity') element.setOpacity(styles[property])
      else
        elementStyle[(property == 'float' || property == 'cssFloat') ?
          (elementStyle.styleFloat === undefined ? 'cssFloat' : 'styleFloat') :
          (camelized ? property : property.camelize())] = styles[property];

    return element;
  },

  setOpacity: function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1 || value === '') ? '' :
      (value < 0.00001) ? 0 : value;
    return element;
  },

  getDimensions: function(element) {
    element = $(element);
    var display = $(element).getStyle('display');
    if (display != 'none' && display != null) // Safari bug
      return {width: element.offsetWidth, height: element.offsetHeight};

    // All *Width and *Height properties give 0 on elements with display none,
    // so enable the element temporarily
    var els = element.style;
    var originalVisibility = els.visibility;
    var originalPosition = els.position;
    var originalDisplay = els.display;
    els.visibility = 'hidden';
    els.position = 'absolute';
    els.display = 'block';
    var originalWidth = element.clientWidth;
    var originalHeight = element.clientHeight;
    els.display = originalDisplay;
    els.position = originalPosition;
    els.visibility = originalVisibility;
    return {width: originalWidth, height: originalHeight};
  },

  makePositioned: function(element) {
    element = $(element);
    var pos = Element.getStyle(element, 'position');
    if (pos == 'static' || !pos) {
      element._madePositioned = true;
      element.style.position = 'relative';
      // Opera returns the offset relative to the positioning context, when an
      // element is position relative but top and left have not been defined
      if (window.opera) {
        element.style.top = 0;
        element.style.left = 0;
      }
    }
    return element;
  },

  undoPositioned: function(element) {
    element = $(element);
    if (element._madePositioned) {
      element._madePositioned = undefined;
      element.style.position =
        element.style.top =
        element.style.left =
        element.style.bottom =
        element.style.right = '';
    }
    return element;
  },

  makeClipping: function(element) {
    element = $(element);
    if (element._overflow) return element;
    element._overflow = element.style.overflow || 'auto';
    if ((Element.getStyle(element, 'overflow') || 'visible') != 'hidden')
      element.style.overflow = 'hidden';
    return element;
  },

  undoClipping: function(element) {
    element = $(element);
    if (!element._overflow) return element;
    element.style.overflow = element._overflow == 'auto' ? '' : element._overflow;
    element._overflow = null;
    return element;
  },

  cumulativeOffset: function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      element = element.offsetParent;
    } while (element);
    return Element._returnOffset(valueL, valueT);
  },

  positionedOffset: function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      element = element.offsetParent;
      if (element) {
        if (element.tagName == 'BODY') break;
        var p = Element.getStyle(element, 'position');
        if (p == 'relative' || p == 'absolute') break;
      }
    } while (element);
    return Element._returnOffset(valueL, valueT);
  },

  absolutize: function(element) {
    element = $(element);
    if (element.getStyle('position') == 'absolute') return;
    // Position.prepare(); // To be done manually by Scripty when it needs it.

    var offsets = element.positionedOffset();
    var top     = offsets[1];
    var left    = offsets[0];
    var width   = element.clientWidth;
    var height  = element.clientHeight;

    element._originalLeft   = left - parseFloat(element.style.left  || 0);
    element._originalTop    = top  - parseFloat(element.style.top || 0);
    element._originalWidth  = element.style.width;
    element._originalHeight = element.style.height;

    element.style.position = 'absolute';
    element.style.top    = top + 'px';
    element.style.left   = left + 'px';
    element.style.width  = width + 'px';
    element.style.height = height + 'px';
    return element;
  },

  relativize: function(element) {
    element = $(element);
    if (element.getStyle('position') == 'relative') return;
    // Position.prepare(); // To be done manually by Scripty when it needs it.

    element.style.position = 'relative';
    var top  = parseFloat(element.style.top  || 0) - (element._originalTop || 0);
    var left = parseFloat(element.style.left || 0) - (element._originalLeft || 0);

    element.style.top    = top + 'px';
    element.style.left   = left + 'px';
    element.style.height = element._originalHeight;
    element.style.width  = element._originalWidth;
    return element;
  },

  cumulativeScrollOffset: function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.scrollTop  || 0;
      valueL += element.scrollLeft || 0;
      element = element.parentNode;
    } while (element);
    return Element._returnOffset(valueL, valueT);
  },

  getOffsetParent: function(element) {
    if (element.offsetParent) return $(element.offsetParent);
    if (element == document.body) return $(element);

    while ((element = element.parentNode) && element != document.body)
      if (Element.getStyle(element, 'position') != 'static')
        return $(element);

    return $(document.body);
  },

  viewportOffset: function(forElement) {
    var valueT = 0, valueL = 0;

    var element = forElement;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;

      // Safari fix
      if (element.offsetParent == document.body &&
        Element.getStyle(element, 'position') == 'absolute') break;

    } while (element = element.offsetParent);

    element = forElement;
    do {
      if (!Prototype.Browser.Opera || element.tagName == 'BODY') {
        valueT -= element.scrollTop  || 0;
        valueL -= element.scrollLeft || 0;
      }
    } while (element = element.parentNode);

    return Element._returnOffset(valueL, valueT);
  },

  clonePosition: function(element, source) {
    var options = Object.extend({
      setLeft:    true,
      setTop:     true,
      setWidth:   true,
      setHeight:  true,
      offsetTop:  0,
      offsetLeft: 0
    }, arguments[2] || {});

    // find page position of source
    source = $(source);
    var p = source.viewportOffset();

    // find coordinate system to use
    element = $(element);
    var delta = [0, 0];
    var parent = null;
    // delta [0,0] will do fine with position: fixed elements,
    // position:absolute needs offsetParent deltas
    if (Element.getStyle(element, 'position') == 'absolute') {
      parent = element.getOffsetParent();
      delta = parent.viewportOffset();
    }

    // correct by body offsets (fixes Safari)
    if (parent == document.body) {
      delta[0] -= document.body.offsetLeft;
      delta[1] -= document.body.offsetTop;
    }

    // set position
    if (options.setLeft)   element.style.left  = (p[0] - delta[0] + options.offsetLeft) + 'px';
    if (options.setTop)    element.style.top   = (p[1] - delta[1] + options.offsetTop) + 'px';
    if (options.setWidth)  element.style.width = source.offsetWidth + 'px';
    if (options.setHeight) element.style.height = source.offsetHeight + 'px';
    return element;
  }
};

Object.extend(Element.Methods, {
  childElements: Element.Methods.immediateDescendants
});

Element._attributeTranslations = {
  write: {
    names: {
      className: 'class',
      htmlFor:   'for'
    },
    values: {}
  }
};


if (!document.createRange || Prototype.Browser.Opera) {
  Element.Methods.insert = function(element, insertions) {
    element = $(element);

    if (typeof insertions == 'string' || typeof insertions == 'number' ||
        (insertions && insertions.ownerDocument === document))
          insertions = {bottom:insertions};

    var t = Element._insertionTranslations, content, position, pos, tagName;

    for (position in insertions) {
      content  = insertions[position];
      position = position.toLowerCase();
      pos      = t[position];

      if (content && content.ownerDocument === document) {
        pos.insert(element, content);
        continue;
      }

      content = String.interpret(content);
      tagName = ((position == 'before' || position == 'after')
        ? element.parentNode : element).tagName.toUpperCase();

      if (t.tags[tagName]) {
        var fragments = Element._getContentFromAnonymousElement(tagName, content.stripScripts());
        if (position == 'top' || position == 'after') fragments.reverse();
        fragments.each(pos.insert.curry(element));
      }
      else element.insertAdjacentHTML(pos.adjacency, content.stripScripts());

      content.evalScripts.bind(content).defer();
    }

    return element;
  }
}

if (Prototype.Browser.Opera) {
  Element.Methods._getStyle = Element.Methods.getStyle;
  Element.Methods.getStyle = function(element, style) {
    switch(style) {
      case 'left':
      case 'top':
      case 'right':
      case 'bottom':
        if (Element._getStyle(element, 'position') == 'static') return null;
      default: return Element._getStyle(element, style);
    }
  };
  Element.Methods._readAttribute = Element.Methods.readAttribute;
  Element.Methods.readAttribute = function(element, attribute) {
    if (attribute == 'title') return element.title;
    return Element._readAttribute(element, attribute);
  };
}

else if (Prototype.Browser.IE) {
  Element.Methods.getStyle = function(element, style) {
    element = $(element);
    style = (style == 'float' || style == 'cssFloat') ? 'styleFloat' : style.camelize();
    var value = element.style[style];
    if (!value && element.currentStyle) value = element.currentStyle[style];

    if (style == 'opacity') {
      if (value = (element.getStyle('filter') || '').match(/alpha\(opacity=(.*)\)/))
        if (value[1]) return parseFloat(value[1]) / 100;
      return 1.0;
    }

    if (value == 'auto') {
      if ((style == 'width' || style == 'height') && (element.getStyle('display') != 'none'))
        return element['offset' + style.capitalize()] + 'px';
      return null;
    }
    return value;
  };

  Element.Methods.setOpacity = function(element, value) {
    function stripAlpha(filter){
      return filter.replace(/alpha\([^\)]*\)/gi,'');
    }
    element = $(element);
    var filter = element.getStyle('filter'), style = element.style;
    if (value == 1 || value === '') {
      (filter = stripAlpha(filter)) ?
        style.filter = filter : style.removeAttribute('filter');
      return element;
    } else if (value < 0.00001) value = 0;
    style.filter = stripAlpha(filter) +
      'alpha(opacity=' + (value * 100) + ')';
    return element;
  };

  Element._attributeTranslations = {
    read: {
      names: {
        colspan:   "colSpan",
        rowspan:   "rowSpan",
        valign:    "vAlign",
        datetime:  "dateTime",
        accesskey: "accessKey",
        tabindex:  "tabIndex",
        enctype:   "encType",
        maxlength: "maxLength",
        readonly:  "readOnly",
        longdesc:  "longDesc"
      },
      values: {
        _getAttr: function(element, attribute) {
          return element.getAttribute(attribute, 2);
        },
        _flag: function(element, attribute) {
          return $(element).hasAttribute(attribute) ? attribute : null;
        },
        style: function(element) {
          return element.style.cssText.toLowerCase();
        },
        title: function(element) {
          var node = element.getAttributeNode('title');
          return node.specified ? node.nodeValue : null;
        }
      }
    }
  };

  Element._attributeTranslations.write = {
    names: Object.extend({
        'class': 'className',
        'for':   'htmlFor'
      }, Element._attributeTranslations.read.names),
    values: {
      checked: function(element, value) {
        element.checked = !!value;
      },

      style: function(element, value) {
        element.style.cssText = value ? value : '';
      }
    }
  };

  (function() {
    Object.extend(this, {
      href: this._getAttr,
      src:  this._getAttr,
      type: this._getAttr,
      disabled: this._flag,
      checked:  this._flag,
      readonly: this._flag,
      multiple: this._flag
    });
  }).call(Element._attributeTranslations.read.values);
}

else if (Prototype.Browser.Gecko) {
  Element.Methods.setOpacity = function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1) ? 0.999999 :
      (value === '') ? '' : (value < 0.00001) ? 0 : value;
    return element;
  };
}

else if (Prototype.Browser.WebKit) {
  Element.Methods.setOpacity = function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1 || value === '') ? '' :
      (value < 0.00001) ? 0 : value;

    if (value == 1)
      if(element.tagName == 'IMG' && element.width) {
        element.width++; element.width--;
      } else try {
        var n = document.createTextNode(' ');
        element.appendChild(n);
        element.removeChild(n);
      } catch (e) {}

    return element;
  }

  // Safari returns margins on body which is incorrect if the child is absolutely
  // positioned.  For performance reasons, redefine Position.cumulativeOffset for
  // KHTML/WebKit only.
  Element.Methods.cumulativeOffset = function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      if (element.offsetParent == document.body)
        if (Element.getStyle(element, 'position') == 'absolute') break;

      element = element.offsetParent;
    } while (element);

    return [valueL, valueT];
  }
}

if (Prototype.Browser.IE || Prototype.Browser.Opera) {
  // IE and Opera are missing .innerHTML support for TABLE-related and SELECT elements
  Element.Methods.update = function(element, html) {
    element = $(element);
    html = typeof html == 'undefined' ? '' : html.toString();
    var tagName = element.tagName.toUpperCase();

    if (Element._insertionTranslations.tags[tagName]) {
      $A(element.childNodes).each(function(node) { element.removeChild(node) });
      Element._getContentFromAnonymousElement(tagName, html.stripScripts())
        .each(function(node) { element.appendChild(node) });
    }
    else element.innerHTML = html.stripScripts();

    html.evalScripts.bind(html).defer();
    return element;
  };
}

Element._returnOffset = function(l, t) {
  var result = [l, t];
  result.left = l;
  result.top = t;
  return result;
};

Element._getContentFromAnonymousElement = function(tagName, html) {
  var div = new Element('div'); t = Element._insertionTranslations.tags[tagName]
  div.innerHTML = t[0] + html + t[1];
  t[2].times(function() { div = div.firstChild });
  return $A(div.childNodes);
};

Element._insertionTranslations = {
  before: {
    adjacency: 'beforeBegin',
    insert: function(element, node) {
      element.parentNode.insertBefore(node, element);
    },
    initializeRange: function(element, range) {
      range.setStartBefore(element);
    }
  },
  top: {
    adjacency: 'afterBegin',
    insert: function(element, node) {
      element.insertBefore(node, element.firstChild);
    },
    initializeRange: function(element, range) {
      range.selectNodeContents(element);
      range.collapse(true);
    }
  },
  bottom: {
    adjacency: 'beforeEnd',
    insert: function(element, node) {
      element.appendChild(node);
    }
  },
  after: {
    adjacency: 'afterEnd',
    insert: function(element, node) {
      element.parentNode.insertBefore(node, element.nextSibling);
    },
    initializeRange: function(element, range) {
      range.setStartAfter(element);
    }
  },
  tags: {
    TABLE:  ['<table>',                '</table>',                   1],
    TBODY:  ['<table><tbody>',         '</tbody></table>',           2],
    TR:     ['<table><tbody><tr>',     '</tr></tbody></table>',      3],
    TD:     ['<table><tbody><tr><td>', '</td></tr></tbody></table>', 4],
    SELECT: ['<select>',               '</select>',                  1]
  }
};

(function() {
  this.bottom.initializeRange = this.top.initializeRange;
  Object.extend(this.tags, {
    THEAD: this.tags.TBODY,
    TFOOT: this.tags.TBODY,
    TH:    this.tags.TD
  });
}).call(Element._insertionTranslations);

Element.Methods.Simulated = {
  hasAttribute: function(element, attribute) {
    var t = Element._attributeTranslations.read, node;
    attribute = t.names[attribute] || attribute;
    node = $(element).getAttributeNode(attribute);
    return node && node.specified;
  }
};

Element.Methods.ByTag = {};

Object.extend(Element, Element.Methods);

if (!Prototype.BrowserFeatures.ElementExtensions &&
    document.createElement('div').__proto__) {
  window.HTMLElement = {};
  window.HTMLElement.prototype = document.createElement('div').__proto__;
  Prototype.BrowserFeatures.ElementExtensions = true;
}

Element.extend = (function() {
  if (Prototype.BrowserFeatures.SpecificElementExtensions)
    return Prototype.K;

  var Methods = {}, ByTag = Element.Methods.ByTag;

  var extend = Object.extend(function(element) {
    if (!element || element._extendedByPrototype ||
        element.nodeType != 1 || element == window) return element;

    var methods = Object.clone(Methods),
      tagName = element.tagName, property, value;

    // extend methods for specific tags
    if (ByTag[tagName]) Object.extend(methods, ByTag[tagName]);

    for (property in methods) {
      value = methods[property];
      if (typeof value == 'function' && !(property in element))
        element[property] = value.methodize();
    }

    element._extendedByPrototype = Prototype.emptyFunction;
    return element;

  }, {
    refresh: function() {
      // extend methods for all tags (Safari doesn't need this)
      if (!Prototype.BrowserFeatures.ElementExtensions) {
        Object.extend(Methods, Element.Methods);
        Object.extend(Methods, Element.Methods.Simulated);
      }
    }
  });

  extend.refresh();
  return extend;
})();

Element.hasAttribute = function(element, attribute) {
  if (element.hasAttribute) return element.hasAttribute(attribute);
  return Element.Methods.Simulated.hasAttribute(element, attribute);
};

Element.addMethods = function(methods) {
  var F = Prototype.BrowserFeatures, T = Element.Methods.ByTag;

  if (!methods) {
    Object.extend(Form, Form.Methods);
    Object.extend(Form.Element, Form.Element.Methods);
    Object.extend(Element.Methods.ByTag, {
      "FORM":     Object.clone(Form.Methods),
      "INPUT":    Object.clone(Form.Element.Methods),
      "SELECT":   Object.clone(Form.Element.Methods),
      "TEXTAREA": Object.clone(Form.Element.Methods)
    });
  }

  if (arguments.length == 2) {
    var tagName = methods;
    methods = arguments[1];
  }

  if (!tagName) Object.extend(Element.Methods, methods || {});
  else {
    if (tagName.constructor == Array) tagName.each(extend);
    else extend(tagName);
  }

  function extend(tagName) {
    tagName = tagName.toUpperCase();
    if (!Element.Methods.ByTag[tagName])
      Element.Methods.ByTag[tagName] = {};
    Object.extend(Element.Methods.ByTag[tagName], methods);
  }

  function copy(methods, destination, onlyIfAbsent) {
    onlyIfAbsent = onlyIfAbsent || false;
    for (var property in methods) {
      var value = methods[property];
      if (typeof value != 'function') continue;
      if (!onlyIfAbsent || !(property in destination))
        destination[property] = value.methodize();
    }
  }

  function findDOMClass(tagName) {
    var klass;
    var trans = {
      "OPTGROUP": "OptGroup", "TEXTAREA": "TextArea", "P": "Paragraph",
      "FIELDSET": "FieldSet", "UL": "UList", "OL": "OList", "DL": "DList",
      "DIR": "Directory", "H1": "Heading", "H2": "Heading", "H3": "Heading",
      "H4": "Heading", "H5": "Heading", "H6": "Heading", "Q": "Quote",
      "INS": "Mod", "DEL": "Mod", "A": "Anchor", "IMG": "Image", "CAPTION":
      "TableCaption", "COL": "TableCol", "COLGROUP": "TableCol", "THEAD":
      "TableSection", "TFOOT": "TableSection", "TBODY": "TableSection", "TR":
      "TableRow", "TH": "TableCell", "TD": "TableCell", "FRAMESET":
      "FrameSet", "IFRAME": "IFrame"
    };
    if (trans[tagName]) klass = 'HTML' + trans[tagName] + 'Element';
    if (window[klass]) return window[klass];
    klass = 'HTML' + tagName + 'Element';
    if (window[klass]) return window[klass];
    klass = 'HTML' + tagName.capitalize() + 'Element';
    if (window[klass]) return window[klass];

    window[klass] = {};
    window[klass].prototype = document.createElement(tagName).__proto__;
    return window[klass];
  }

  if (F.ElementExtensions) {
    copy(Element.Methods, HTMLElement.prototype);
    copy(Element.Methods.Simulated, HTMLElement.prototype, true);
  }

  if (F.SpecificElementExtensions) {
    for (var tag in Element.Methods.ByTag) {
      var klass = findDOMClass(tag);
      if (typeof klass == "undefined") continue;
      copy(T[tag], klass.prototype);
    }
  }

  Object.extend(Element, Element.Methods);
  delete Element.ByTag;

  if (Element.extend.refresh) Element.extend.refresh();
  Element.cache = {};
};

/*--------------------------------------------------------------------------*/

Element.ClassNames = Class.create();
Element.ClassNames.prototype = {
  initialize: function(element) {
    this.element = $(element);
  },

  _each: function(iterator) {
    this.element.className.split(/\s+/).select(function(name) {
      return name.length > 0;
    })._each(iterator);
  },

  set: function(className) {
    this.element.className = className;
  },

  add: function(classNameToAdd) {
    if (this.include(classNameToAdd)) return;
    this.set($A(this).concat(classNameToAdd).join(' '));
  },

  remove: function(classNameToRemove) {
    if (!this.include(classNameToRemove)) return;
    this.set($A(this).without(classNameToRemove).join(' '));
  },

  toString: function() {
    return $A(this).join(' ');
  }
};

Object.extend(Element.ClassNames.prototype, Enumerable);
/* Portions of the Selector class are derived from Jack Slocum’s DomQuery,
 * part of YUI-Ext version 0.40, distributed under the terms of an MIT-style
 * license.  Please see http://www.yui-ext.com/ for more information. */

var Selector = Class.create();

Selector.prototype = {
  initialize: function(expression) {
    this.expression = expression.strip();
    this.compileMatcher();
  },

  compileMatcher: function() {
    // Selectors with namespaced attributes can't use the XPath version
    if (Prototype.BrowserFeatures.XPath && !(/\[[\w-]*?:/).test(this.expression))
      return this.compileXPathMatcher();

    var e = this.expression, ps = Selector.patterns, h = Selector.handlers,
        c = Selector.criteria, le, p, m;

    if (Selector._cache[e]) {
      this.matcher = Selector._cache[e]; return;
    }
    this.matcher = ["this.matcher = function(root) {",
                    "var r = root, h = Selector.handlers, c = false, n;"];

    while (e && le != e && (/\S/).test(e)) {
      le = e;
      for (var i in ps) {
        p = ps[i];
        if (m = e.match(p)) {
          this.matcher.push(typeof c[i] == 'function' ? c[i](m) :
    	      new Template(c[i]).evaluate(m));
          e = e.replace(m[0], '');
          break;
        }
      }
    }

    this.matcher.push("return h.unique(n);\n}");
    eval(this.matcher.join('\n'));
    Selector._cache[this.expression] = this.matcher;
  },

  compileXPathMatcher: function() {
    var e = this.expression, ps = Selector.patterns,
        x = Selector.xpath, le,  m;

    if (Selector._cache[e]) {
      this.xpath = Selector._cache[e]; return;
    }

    this.matcher = ['.//*'];
    while (e && le != e && (/\S/).test(e)) {
      le = e;
      for (var i in ps) {
        if (m = e.match(ps[i])) {
          this.matcher.push(typeof x[i] == 'function' ? x[i](m) :
            new Template(x[i]).evaluate(m));
          e = e.replace(m[0], '');
          break;
        }
      }
    }

    this.xpath = this.matcher.join('');
    Selector._cache[this.expression] = this.xpath;
  },

  findElements: function(root) {
    root = root || document;
    if (this.xpath) return document._getElementsByXPath(this.xpath, root);
    return this.matcher(root);
  },

  match: function(element) {
    return this.findElements(document).include(element);
  },

  toString: function() {
    return this.expression;
  },

  inspect: function() {
    return "#<Selector:" + this.expression.inspect() + ">";
  }
};

Object.extend(Selector, {
  _cache: {},

  xpath: {
    descendant:   "//*",
    child:        "/*",
    adjacent:     "/following-sibling::*[1]",
    laterSibling: '/following-sibling::*',
    tagName:      function(m) {
      if (m[1] == '*') return '';
      return "[local-name()='" + m[1].toLowerCase() +
             "' or local-name()='" + m[1].toUpperCase() + "']";
    },
    className:    "[contains(concat(' ', @class, ' '), ' #{1} ')]",
    id:           "[@id='#{1}']",
    attrPresence: "[@#{1}]",
    attr: function(m) {
      m[3] = m[5] || m[6];
      return new Template(Selector.xpath.operators[m[2]]).evaluate(m);
    },
    pseudo: function(m) {
      var h = Selector.xpath.pseudos[m[1]];
      if (!h) return '';
      if (typeof h === 'function') return h(m);
      return new Template(Selector.xpath.pseudos[m[1]]).evaluate(m);
    },
    operators: {
      '=':  "[@#{1}='#{3}']",
      '!=': "[@#{1}!='#{3}']",
      '^=': "[starts-with(@#{1}, '#{3}')]",
      '$=': "[substring(@#{1}, (string-length(@#{1}) - string-length('#{3}') + 1))='#{3}']",
      '*=': "[contains(@#{1}, '#{3}')]",
      '~=': "[contains(concat(' ', @#{1}, ' '), ' #{3} ')]",
      '|=': "[contains(concat('-', @#{1}, '-'), '-#{3}-')]"
    },
    pseudos: {
      'first-child': '[not(preceding-sibling::*)]',
      'last-child':  '[not(following-sibling::*)]',
      'only-child':  '[not(preceding-sibling::* or following-sibling::*)]',
      'empty':       "[count(*) = 0 and (count(text()) = 0 or translate(text(), ' \t\r\n', '') = '')]",
      'checked':     "[@checked]",
      'disabled':    "[@disabled]",
      'enabled':     "[not(@disabled)]",
      'not': function(m) {
        var e = m[6], p = Selector.patterns,
            x = Selector.xpath, le, m, v;

        var exclusion = [];
        while (e && le != e && (/\S/).test(e)) {
          le = e;
          for (var i in p) {
            if (m = e.match(p[i])) {
              v = typeof x[i] == 'function' ? x[i](m) : new Template(x[i]).evaluate(m);
              exclusion.push("(" + v.substring(1, v.length - 1) + ")");
              e = e.replace(m[0], '');
              break;
            }
          }
        }
        return "[not(" + exclusion.join(" and ") + ")]";
      },
      'nth-child':      function(m) {
        return Selector.xpath.pseudos.nth("(count(./preceding-sibling::*) + 1) ", m);
      },
      'nth-last-child': function(m) {
        return Selector.xpath.pseudos.nth("(count(./following-sibling::*) + 1) ", m);
      },
      'nth-of-type':    function(m) {
        return Selector.xpath.pseudos.nth("position() ", m);
      },
      'nth-last-of-type': function(m) {
        return Selector.xpath.pseudos.nth("(last() + 1 - position()) ", m);
      },
      'first-of-type':  function(m) {
        m[6] = "1"; return Selector.xpath.pseudos['nth-of-type'](m);
      },
      'last-of-type':   function(m) {
        m[6] = "1"; return Selector.xpath.pseudos['nth-last-of-type'](m);
      },
      'only-of-type':   function(m) {
        var p = Selector.xpath.pseudos; return p['first-of-type'](m) + p['last-of-type'](m);
      },
      nth: function(fragment, m) {
        var mm, formula = m[6], predicate;
        if (formula == 'even') formula = '2n+0';
        if (formula == 'odd')  formula = '2n+1';
        if (mm = formula.match(/^(\d+)$/)) // digit only
          return '[' + fragment + "= " + mm[1] + ']';
        if (mm = formula.match(/^(-?\d*)?n(([+-])(\d+))?/)) { // an+b
          if (mm[1] == "-") mm[1] = -1;
          var a = mm[1] ? Number(mm[1]) : 1;
          var b = mm[2] ? Number(mm[2]) : 0;
          predicate = "[((#{fragment} - #{b}) mod #{a} = 0) and " +
          "((#{fragment} - #{b}) div #{a} >= 0)]";
          return new Template(predicate).evaluate({
            fragment: fragment, a: a, b: b });
        }
      }
    }
  },

  criteria: {
    tagName:      'n = h.tagName(n, r, "#{1}", c);   c = false;',
    className:    'n = h.className(n, r, "#{1}", c); c = false;',
    id:           'n = h.id(n, r, "#{1}", c);        c = false;',
    attrPresence: 'n = h.attrPresence(n, r, "#{1}"); c = false;',
    attr: function(m) {
      m[3] = (m[5] || m[6]);
      return new Template('n = h.attr(n, r, "#{1}", "#{3}", "#{2}"); c = false;').evaluate(m);
    },
    pseudo:       function(m) {
      if (m[6]) m[6] = m[6].replace(/"/g, '\\"');
      return new Template('n = h.pseudo(n, "#{1}", "#{6}", r, c); c = false;').evaluate(m);
    },
    descendant:   'c = "descendant";',
    child:        'c = "child";',
    adjacent:     'c = "adjacent";',
    laterSibling: 'c = "laterSibling";'
  },

  patterns: {
    // combinators must be listed first
    // (and descendant needs to be last combinator)
    laterSibling: /^\s*~\s*/,
    child:        /^\s*>\s*/,
    adjacent:     /^\s*\+\s*/,
    descendant:   /^\s/,

    // selectors follow
    tagName:      /^\s*(\*|[\w\-]+)(\b|$)?/,
    id:           /^#([\w\-\*]+)(\b|$)/,
    className:    /^\.([\w\-\*]+)(\b|$)/,
    pseudo:       /^:((first|last|nth|nth-last|only)(-child|-of-type)|empty|checked|(en|dis)abled|not)(\((.*?)\))?(\b|$|\s|(?=:))/,
    attrPresence: /^\[([\w]+)\]/,
    attr:         /\[((?:[\w-]*:)?[\w-]+)\s*(?:([!^$*~|]?=)\s*((['"])([^\]]*?)\4|([^'"][^\]]*?)))?\]/
  },

  handlers: {
    // UTILITY FUNCTIONS
    // joins two collections
    concat: function(a, b) {
      for (var i = 0, node; node = b[i]; i++)
        a.push(node);
      return a;
    },

    // marks an array of nodes for counting
    mark: function(nodes) {
      for (var i = 0, node; node = nodes[i]; i++)
        node._counted = true;
      return nodes;
    },

    unmark: function(nodes) {
      for (var i = 0, node; node = nodes[i]; i++)
        node._counted = undefined;
      return nodes;
    },

    // mark each child node with its position (for nth calls)
    // "ofType" flag indicates whether we're indexing for nth-of-type
    // rather than nth-child
    index: function(parentNode, reverse, ofType) {
      parentNode._counted = true;
      if (reverse) {
        for (var nodes = parentNode.childNodes, i = nodes.length - 1, j = 1; i >= 0; i--) {
          node = nodes[i];
          if (node.nodeType == 1 && (!ofType || node._counted)) node.nodeIndex = j++;
        }
      } else {
        for (var i = 0, j = 1, nodes = parentNode.childNodes; node = nodes[i]; i++)
          if (node.nodeType == 1 && (!ofType || node._counted)) node.nodeIndex = j++;
      }
    },

    // filters out duplicates and extends all nodes
    unique: function(nodes) {
      if (nodes.length == 0) return nodes;
      var results = [], n;
      for (var i = 0, l = nodes.length; i < l; i++)
        if (!(n = nodes[i])._counted) {
          n._counted = true;
          results.push(Element.extend(n));
        }
      return Selector.handlers.unmark(results);
    },

    // COMBINATOR FUNCTIONS
    descendant: function(nodes) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        h.concat(results, node.getElementsByTagName('*'));
      return results;
    },

    child: function(nodes) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        for (var j = 0, children = [], child; child = node.childNodes[j]; j++)
          if (child.nodeType == 1 && child.tagName != '!') results.push(child);
      }
      return results;
    },

    adjacent: function(nodes) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        var next = this.nextElementSibling(node);
        if (next) results.push(next);
      }
      return results;
    },

    laterSibling: function(nodes) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        h.concat(results, Element.nextSiblings(node));
      return results;
    },

    nextElementSibling: function(node) {
      while (node = node.nextSibling)
	      if (node.nodeType == 1) return node;
      return null;
    },

    previousElementSibling: function(node) {
      while (node = node.previousSibling)
        if (node.nodeType == 1) return node;
      return null;
    },

    // TOKEN FUNCTIONS
    tagName: function(nodes, root, tagName, combinator) {
      tagName = tagName.toUpperCase();
      var results = [], h = Selector.handlers;
      if (nodes) {
        if (combinator) {
          // fastlane for ordinary descendant combinators
          if (combinator == "descendant") {
            for (var i = 0, node; node = nodes[i]; i++)
              h.concat(results, node.getElementsByTagName(tagName));
            return results;
          } else nodes = this[combinator](nodes);
          if (tagName == "*") return nodes;
        }
        for (var i = 0, node; node = nodes[i]; i++)
          if (node.tagName.toUpperCase() == tagName) results.push(node);
        return results;
      } else return root.getElementsByTagName(tagName);
    },

    id: function(nodes, root, id, combinator) {
      var targetNode = $(id), h = Selector.handlers;
      if (!targetNode) return [];
      if (!nodes && root == document) return [targetNode];
      if (nodes) {
        if (combinator) {
          if (combinator == 'child') {
            for (var i = 0, node; node = nodes[i]; i++)
              if (targetNode.parentNode == node) return [targetNode];
          } else if (combinator == 'descendant') {
            for (var i = 0, node; node = nodes[i]; i++)
              if (Element.descendantOf(targetNode, node)) return [targetNode];
          } else if (combinator == 'adjacent') {
            for (var i = 0, node; node = nodes[i]; i++)
              if (Selector.handlers.previousElementSibling(targetNode) == node)
                return [targetNode];
          } else nodes = h[combinator](nodes);
        }
        for (var i = 0, node; node = nodes[i]; i++)
          if (node == targetNode) return [targetNode];
        return [];
      }
      return (targetNode && Element.descendantOf(targetNode, root)) ? [targetNode] : [];
    },

    className: function(nodes, root, className, combinator) {
      if (nodes && combinator) nodes = this[combinator](nodes);
      return Selector.handlers.byClassName(nodes, root, className);
    },

    byClassName: function(nodes, root, className) {
      if (!nodes) nodes = Selector.handlers.descendant([root]);
      var needle = ' ' + className + ' ';
      for (var i = 0, results = [], node, nodeClassName; node = nodes[i]; i++) {
        nodeClassName = node.className;
        if (nodeClassName.length == 0) continue;
        if (nodeClassName == className || (' ' + nodeClassName + ' ').include(needle))
          results.push(node);
      }
      return results;
    },

    attrPresence: function(nodes, root, attr) {
      var results = [];
      for (var i = 0, node; node = nodes[i]; i++)
        if (Element.hasAttribute(node, attr)) results.push(node);
      return results;
    },

    attr: function(nodes, root, attr, value, operator) {
      if (!nodes) nodes = root.getElementsByTagName("*");
      var handler = Selector.operators[operator], results = [];
      for (var i = 0, node; node = nodes[i]; i++) {
        var nodeValue = Element.readAttribute(node, attr);
        if (nodeValue === null) continue;
        if (handler(nodeValue, value)) results.push(node);
      }
      return results;
    },

    pseudo: function(nodes, name, value, root, combinator) {
      if (nodes && combinator) nodes = this[combinator](nodes);
      if (!nodes) nodes = root.getElementsByTagName("*");
      return Selector.pseudos[name](nodes, value, root);
    }
  },

  pseudos: {
    'first-child': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        if (Selector.handlers.previousElementSibling(node)) continue;
          results.push(node);
      }
      return results;
    },
    'last-child': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        if (Selector.handlers.nextElementSibling(node)) continue;
          results.push(node);
      }
      return results;
    },
    'only-child': function(nodes, value, root) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (!h.previousElementSibling(node) && !h.nextElementSibling(node))
          results.push(node);
      return results;
    },
    'nth-child':        function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root);
    },
    'nth-last-child':   function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root, true);
    },
    'nth-of-type':      function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root, false, true);
    },
    'nth-last-of-type': function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root, true, true);
    },
    'first-of-type':    function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, "1", root, false, true);
    },
    'last-of-type':     function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, "1", root, true, true);
    },
    'only-of-type':     function(nodes, formula, root) {
      var p = Selector.pseudos;
      return p['last-of-type'](p['first-of-type'](nodes, formula, root), formula, root);
    },

    // handles the an+b logic
    getIndices: function(a, b, total) {
      if (a == 0) return b > 0 ? [b] : [];
      return $R(1, total).inject([], function(memo, i) {
        if (0 == (i - b) % a && (i - b) / a >= 0) memo.push(i);
        return memo;
      });
    },

    // handles nth(-last)-child, nth(-last)-of-type, and (first|last)-of-type
    nth: function(nodes, formula, root, reverse, ofType) {
      if (nodes.length == 0) return [];
      if (formula == 'even') formula = '2n+0';
      if (formula == 'odd')  formula = '2n+1';
      var h = Selector.handlers, results = [], indexed = [], m;
      h.mark(nodes);
      for (var i = 0, node; node = nodes[i]; i++) {
        if (!node.parentNode._counted) {
          h.index(node.parentNode, reverse, ofType);
          indexed.push(node.parentNode);
        }
      }
      if (formula.match(/^\d+$/)) { // just a number
        formula = Number(formula);
        for (var i = 0, node; node = nodes[i]; i++)
          if (node.nodeIndex == formula) results.push(node);
      } else if (m = formula.match(/^(-?\d*)?n(([+-])(\d+))?/)) { // an+b
        if (m[1] == "-") m[1] = -1;
        var a = m[1] ? Number(m[1]) : 1;
        var b = m[2] ? Number(m[2]) : 0;
        var indices = Selector.pseudos.getIndices(a, b, nodes.length);
        for (var i = 0, node, l = indices.length; node = nodes[i]; i++) {
          for (var j = 0; j < l; j++)
            if (node.nodeIndex == indices[j]) results.push(node);
        }
      }
      h.unmark(nodes);
      h.unmark(indexed);
      return results;
    },

    'empty': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        // IE treats comments as element nodes
        if (node.tagName == '!' || (node.firstChild && !node.innerHTML.match(/^\s*$/))) continue;
        results.push(node);
      }
      return results;
    },

    'not': function(nodes, selector, root) {
      var h = Selector.handlers, selectorType, m;
      var exclusions = new Selector(selector).findElements(root);
      h.mark(exclusions);
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (!node._counted) results.push(node);
      h.unmark(exclusions);
      return results;
    },

    'enabled': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (!node.disabled) results.push(node);
      return results;
    },

    'disabled': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (node.disabled) results.push(node);
      return results;
    },

    'checked': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (node.checked) results.push(node);
      return results;
    }
  },

  operators: {
    '=':  function(nv, v) { return nv == v; },
    '!=': function(nv, v) { return nv != v; },
    '^=': function(nv, v) { return nv.startsWith(v); },
    '$=': function(nv, v) { return nv.endsWith(v); },
    '*=': function(nv, v) { return nv.include(v); },
    '~=': function(nv, v) { return (' ' + nv + ' ').include(' ' + v + ' '); },
    '|=': function(nv, v) { return ('-' + nv.toUpperCase() + '-').include('-' + v.toUpperCase() + '-'); }
  },

  matchElements: function(elements, expression) {
    var matches = new Selector(expression).findElements(), h = Selector.handlers;
    h.mark(matches);
    for (var i = 0, results = [], element; element = elements[i]; i++)
      if (element._counted) results.push(element);
    h.unmark(matches);
    return results;
  },

  findElement: function(elements, expression, index) {
    if (typeof expression == 'number') {
      index = expression; expression = false;
    }
    return Selector.matchElements(elements, expression || '*')[index || 0];
  },

  findChildElements: function(element, expressions) {
    var exprs = expressions.join(','), expressions = [];
    exprs.scan(/(([\w#:.~>+()\s-]+|\*|\[.*?\])+)\s*(,|$)/, function(m) {
      expressions.push(m[1].strip());
    });
    var results = [], h = Selector.handlers;
    for (var i = 0, l = expressions.length, selector; i < l; i++) {
      selector = new Selector(expressions[i].strip());
      h.concat(results, selector.findElements(element));
    }
    return (l > 1) ? h.unique(results) : results;
  }
});

function $$() {
  return Selector.findChildElements(document, $A(arguments));
}
var Form = {
  reset: function(form) {
    $(form).reset();
    return form;
  },

  serializeElements: function(elements, getHash) {
    var data = elements.inject({}, function(result, element) {
      if (!element.disabled && element.name) {
        var key = element.name, value = $(element).getValue();
        if (value != null) {
         	if (key in result) {
            if (result[key].constructor != Array) result[key] = [result[key]];
            result[key].push(value);
          }
          else result[key] = value;
        }
      }
      return result;
    });

    return getHash ? data : Hash.toQueryString(data);
  }
};

Form.Methods = {
  serialize: function(form, getHash) {
    return Form.serializeElements(Form.getElements(form), getHash);
  },

  getElements: function(form) {
    return $A($(form).getElementsByTagName('*')).inject([],
      function(elements, child) {
        if (Form.Element.Serializers[child.tagName.toLowerCase()])
          elements.push(Element.extend(child));
        return elements;
      }
    );
  },

  getInputs: function(form, typeName, name) {
    form = $(form);
    var inputs = form.getElementsByTagName('input');

    if (!typeName && !name) return $A(inputs).map(Element.extend);

    for (var i = 0, matchingInputs = [], length = inputs.length; i < length; i++) {
      var input = inputs[i];
      if ((typeName && input.type != typeName) || (name && input.name != name))
        continue;
      matchingInputs.push(Element.extend(input));
    }

    return matchingInputs;
  },

  disable: function(form) {
    form = $(form);
    Form.getElements(form).invoke('disable');
    return form;
  },

  enable: function(form) {
    form = $(form);
    Form.getElements(form).invoke('enable');
    return form;
  },

  findFirstElement: function(form) {
    return $(form).getElements().find(function(element) {
      return element.type != 'hidden' && !element.disabled &&
        ['input', 'select', 'textarea'].include(element.tagName.toLowerCase());
    });
  },

  focusFirstElement: function(form) {
    form = $(form);
    form.findFirstElement().activate();
    return form;
  },

  request: function(form, options) {
    form = $(form), options = Object.clone(options || {});

    var params = options.parameters;
    options.parameters = form.serialize(true);

    if (params) {
      if (typeof params == 'string') params = params.toQueryParams();
      Object.extend(options.parameters, params);
    }

    if (form.hasAttribute('method') && !options.method)
      options.method = form.method;

    return new Ajax.Request(form.readAttribute('action'), options);
  }
}

/*--------------------------------------------------------------------------*/

Form.Element = {
  focus: function(element) {
    $(element).focus();
    return element;
  },

  select: function(element) {
    $(element).select();
    return element;
  }
}

Form.Element.Methods = {
  serialize: function(element) {
    element = $(element);
    if (!element.disabled && element.name) {
      var value = element.getValue();
      if (value != undefined) {
        var pair = {};
        pair[element.name] = value;
        return Hash.toQueryString(pair);
      }
    }
    return '';
  },

  getValue: function(element) {
    element = $(element);
    var method = element.tagName.toLowerCase();
    return Form.Element.Serializers[method](element);
  },

  clear: function(element) {
    $(element).value = '';
    return element;
  },

  present: function(element) {
    return $(element).value != '';
  },

  activate: function(element) {
    element = $(element);
    try {
      element.focus();
      if (element.select && (element.tagName.toLowerCase() != 'input' ||
        !['button', 'reset', 'submit'].include(element.type)))
        element.select();
    } catch (e) {}
    return element;
  },

  disable: function(element) {
    element = $(element);
    element.blur();
    element.disabled = true;
    return element;
  },

  enable: function(element) {
    element = $(element);
    element.disabled = false;
    return element;
  }
}

/*--------------------------------------------------------------------------*/

var Field = Form.Element;
var $F = Form.Element.Methods.getValue;

/*--------------------------------------------------------------------------*/

Form.Element.Serializers = {
  input: function(element) {
    switch (element.type.toLowerCase()) {
      case 'checkbox':
      case 'radio':
        return Form.Element.Serializers.inputSelector(element);
      default:
        return Form.Element.Serializers.textarea(element);
    }
  },

  inputSelector: function(element) {
    return element.checked ? element.value : null;
  },

  textarea: function(element) {
    return element.value;
  },

  select: function(element) {
    return this[element.type == 'select-one' ?
      'selectOne' : 'selectMany'](element);
  },

  selectOne: function(element) {
    var index = element.selectedIndex;
    return index >= 0 ? this.optionValue(element.options[index]) : null;
  },

  selectMany: function(element) {
    var values, length = element.length;
    if (!length) return null;

    for (var i = 0, values = []; i < length; i++) {
      var opt = element.options[i];
      if (opt.selected) values.push(this.optionValue(opt));
    }
    return values;
  },

  optionValue: function(opt) {
    // extend element because hasAttribute may not be native
    return Element.extend(opt).hasAttribute('value') ? opt.value : opt.text;
  }
}

/*--------------------------------------------------------------------------*/

Abstract.TimedObserver = function() {}
Abstract.TimedObserver.prototype = {
  initialize: function(element, frequency, callback) {
    this.frequency = frequency;
    this.element   = $(element);
    this.callback  = callback;

    this.lastValue = this.getValue();
    this.registerCallback();
  },

  registerCallback: function() {
    setInterval(this.onTimerEvent.bind(this), this.frequency * 1000);
  },

  onTimerEvent: function() {
    var value = this.getValue();
    var changed = ('string' == typeof this.lastValue && 'string' == typeof value
      ? this.lastValue != value : String(this.lastValue) != String(value));
    if (changed) {
      this.callback(this.element, value);
      this.lastValue = value;
    }
  }
}

Form.Element.Observer = Class.create();
Form.Element.Observer.prototype = Object.extend(new Abstract.TimedObserver(), {
  getValue: function() {
    return Form.Element.getValue(this.element);
  }
});

Form.Observer = Class.create();
Form.Observer.prototype = Object.extend(new Abstract.TimedObserver(), {
  getValue: function() {
    return Form.serialize(this.element);
  }
});

/*--------------------------------------------------------------------------*/

Abstract.EventObserver = function() {}
Abstract.EventObserver.prototype = {
  initialize: function(element, callback) {
    this.element  = $(element);
    this.callback = callback;

    this.lastValue = this.getValue();
    if (this.element.tagName.toLowerCase() == 'form')
      this.registerFormCallbacks();
    else
      this.registerCallback(this.element);
  },

  onElementEvent: function() {
    var value = this.getValue();
    if (this.lastValue != value) {
      this.callback(this.element, value);
      this.lastValue = value;
    }
  },

  registerFormCallbacks: function() {
    Form.getElements(this.element).each(this.registerCallback.bind(this));
  },

  registerCallback: function(element) {
    if (element.type) {
      switch (element.type.toLowerCase()) {
        case 'checkbox':
        case 'radio':
          Event.observe(element, 'click', this.onElementEvent.bind(this));
          break;
        default:
          Event.observe(element, 'change', this.onElementEvent.bind(this));
          break;
      }
    }
  }
}

Form.Element.EventObserver = Class.create();
Form.Element.EventObserver.prototype = Object.extend(new Abstract.EventObserver(), {
  getValue: function() {
    return Form.Element.getValue(this.element);
  }
});

Form.EventObserver = Class.create();
Form.EventObserver.prototype = Object.extend(new Abstract.EventObserver(), {
  getValue: function() {
    return Form.serialize(this.element);
  }
});
if (!window.Event) {
  var Event = new Object();
}

Object.extend(Event, {
  KEY_BACKSPACE: 8,
  KEY_TAB:       9,
  KEY_RETURN:   13,
  KEY_ESC:      27,
  KEY_LEFT:     37,
  KEY_UP:       38,
  KEY_RIGHT:    39,
  KEY_DOWN:     40,
  KEY_DELETE:   46,
  KEY_HOME:     36,
  KEY_END:      35,
  KEY_PAGEUP:   33,
  KEY_PAGEDOWN: 34,

  element: function(event) {
    return $(event.target || event.srcElement);
  },

  isLeftClick: function(event) {
    return (((event.which) && (event.which == 1)) ||
            ((event.button) && (event.button == 1)));
  },

  pointerX: function(event) {
    return event.pageX || (event.clientX +
      (document.documentElement.scrollLeft || document.body.scrollLeft));
  },

  pointerY: function(event) {
    return event.pageY || (event.clientY +
      (document.documentElement.scrollTop || document.body.scrollTop));
  },

  stop: function(event) {
    if (event.preventDefault) {
      event.preventDefault();
      event.stopPropagation();
    } else {
      event.returnValue = false;
      event.cancelBubble = true;
    }
  },

  findElement: function(event, expression) {
    var element = Event.element(event);
    return element.match(expression) ? element : element.up(expression);
  },

  observers: false,

  _observeAndCache: function(element, name, observer, useCapture) {
    if (!this.observers) this.observers = [];
    if (element.addEventListener) {
      this.observers.push([element, name, observer, useCapture]);
      element.addEventListener(name, observer, useCapture);
    } else if (element.attachEvent) {
      this.observers.push([element, name, observer, useCapture]);
      element.attachEvent('on' + name, observer);
    }
  },

  unloadCache: function() {
    if (!Event.observers) return;
    for (var i = 0, length = Event.observers.length; i < length; i++) {
      Event.stopObserving.apply(this, Event.observers[i]);
      Event.observers[i][0] = null;
    }
    Event.observers = false;
  },

  observe: function(element, name, observer, useCapture) {
    element = $(element);
    useCapture = useCapture || false;

    if (name == 'keypress' &&
      (Prototype.Browser.WebKit || element.attachEvent))
      name = 'keydown';

    Event._observeAndCache(element, name, observer, useCapture);
  },

  stopObserving: function(element, name, observer, useCapture) {
    element = $(element);
    useCapture = useCapture || false;

    if (name == 'keypress' &&
        (Prototype.Browser.WebKit || element.attachEvent))
      name = 'keydown';

    if (element.removeEventListener) {
      element.removeEventListener(name, observer, useCapture);
    } else if (element.detachEvent) {
      try {
        element.detachEvent('on' + name, observer);
      } catch (e) {}
    }
  }
});

/* prevent memory leaks in IE */
if (Prototype.Browser.IE)
  Event.observe(window, 'unload', Event.unloadCache, false);
/*------------------------------- DEPRECATED -------------------------------*/

var Toggle = { display: Element.toggle };

Element.Methods.childOf = Element.Methods.descendantOf;

var Insertion = {
  Before: function(element, content) {
    return Element.insert(element, {before:content});
  },

  Top: function(element, content) {
    return Element.insert(element, {top:content});
  },

  Bottom: function(element, content) {
    return Element.insert(element, {bottom:content});
  },

  After: function(element, content) {
    return Element.insert(element, {after:content});
  }
}

var $continue = new Error('"throw $continue" is deprecated, use "return" instead');

// This should be moved to script.aculo.us; notice the deprecated methods
// further below, that map to the newer Element methods.
var Position = {
  // set to true if needed, warning: firefox performance problems
  // NOT neeeded for page scrolling, only if draggable contained in
  // scrollable elements
  includeScrollOffsets: false,

  // must be called before calling withinIncludingScrolloffset, every time the
  // page is scrolled
  prepare: function() {
    this.deltaX =  window.pageXOffset
                || document.documentElement.scrollLeft
                || document.body.scrollLeft
                || 0;
    this.deltaY =  window.pageYOffset
                || document.documentElement.scrollTop
                || document.body.scrollTop
                || 0;
  },

  // caches x/y coordinate pair to use with overlap
  within: function(element, x, y) {
    if (this.includeScrollOffsets)
      return this.withinIncludingScrolloffsets(element, x, y);
    this.xcomp = x;
    this.ycomp = y;
    this.offset = Element.cumulativeOffset(element);

    return (y >= this.offset[1] &&
            y <  this.offset[1] + element.offsetHeight &&
            x >= this.offset[0] &&
            x <  this.offset[0] + element.offsetWidth);
  },

  withinIncludingScrolloffsets: function(element, x, y) {
    var offsetcache = Element.cumulativeScrollOffset(element);

    this.xcomp = x + offsetcache[0] - this.deltaX;
    this.ycomp = y + offsetcache[1] - this.deltaY;
    this.offset = Element.cumulativeOffset(element);

    return (this.ycomp >= this.offset[1] &&
            this.ycomp <  this.offset[1] + element.offsetHeight &&
            this.xcomp >= this.offset[0] &&
            this.xcomp <  this.offset[0] + element.offsetWidth);
  },

  // within must be called directly before
  overlap: function(mode, element) {
    if (!mode) return 0;
    if (mode == 'vertical')
      return ((this.offset[1] + element.offsetHeight) - this.ycomp) /
        element.offsetHeight;
    if (mode == 'horizontal')
      return ((this.offset[0] + element.offsetWidth) - this.xcomp) /
        element.offsetWidth;
  },

  // Deprecation layer -- use newer Element methods now (1.5.2).

  cumulativeOffset: Element.Methods.cumulativeOffset,

  positionedOffset: Element.Methods.positionedOffset,

  absolutize: function(element) {
    Position.prepare();
    return Element.absolutize(element);
  },

  relativize: function(element) {
    Position.prepare();
    return Element.relativize(element);
  },

  realOffset: Element.Methods.cumulativeScrollOffset,

  offsetParent: Element.Methods.getOffsetParent,

  page: Element.Methods.viewportOffset,

  clone: function(source, target, options) {
    options = options || {};
    return Element.clonePosition(target, source, options);
  }
}
/*--------------------------------------------------------------------------*/

Element.addMethods();


/***************************************************
 * library/scriptaculous/effects.js
 ***************************************************/

// Copyright (c) 2005-2007 Thomas Fuchs (http://script.aculo.us, http://mir.aculo.us)
// Contributors:
//  Justin Palmer (http://encytemedia.com/)
//  Mark Pilgrim (http://diveintomark.org/)
//  Martin Bialasinki
// 
// script.aculo.us is freely distributable under the terms of an MIT-style license.
// For details, see the script.aculo.us web site: http://script.aculo.us/ 

// converts rgb() and #xxx to #xxxxxx format,  
// returns self (or first argument) if not convertable  
String.prototype.parseColor = function() {  
  var color = '#';
  if(this.slice(0,4) == 'rgb(') {  
    var cols = this.slice(4,this.length-1).split(',');  
    var i=0; do { color += parseInt(cols[i]).toColorPart() } while (++i<3);  
  } else {  
    if(this.slice(0,1) == '#') {  
      if(this.length==4) for(var i=1;i<4;i++) color += (this.charAt(i) + this.charAt(i)).toLowerCase();  
      if(this.length==7) color = this.toLowerCase();  
    }  
  }  
  return(color.length==7 ? color : (arguments[0] || this));  
}

/*--------------------------------------------------------------------------*/

Element.collectTextNodes = function(element) {  
  return $A($(element).childNodes).collect( function(node) {
    return (node.nodeType==3 ? node.nodeValue : 
      (node.hasChildNodes() ? Element.collectTextNodes(node) : ''));
  }).flatten().join('');
}

Element.collectTextNodesIgnoreClass = function(element, className) {  
  return $A($(element).childNodes).collect( function(node) {
    return (node.nodeType==3 ? node.nodeValue : 
      ((node.hasChildNodes() && !Element.hasClassName(node,className)) ? 
        Element.collectTextNodesIgnoreClass(node, className) : ''));
  }).flatten().join('');
}

Element.setContentZoom = function(element, percent) {
  element = $(element);  
  element.setStyle({fontSize: (percent/100) + 'em'});   
  if(Prototype.Browser.WebKit) window.scrollBy(0,0);
  return element;
}

Element.getInlineOpacity = function(element){
  return $(element).style.opacity || '';
}

Element.forceRerendering = function(element) {
  try {
    element = $(element);
    var n = document.createTextNode(' ');
    element.appendChild(n);
    element.removeChild(n);
  } catch(e) { }
};

/*--------------------------------------------------------------------------*/

Array.prototype.call = function() {
  var args = arguments;
  this.each(function(f){ f.apply(this, args) });
}

/*--------------------------------------------------------------------------*/

var Effect = {
  _elementDoesNotExistError: {
    name: 'ElementDoesNotExistError',
    message: 'The specified DOM element does not exist, but is required for this effect to operate'
  },
  tagifyText: function(element) {
    if(typeof Builder == 'undefined')
      throw("Effect.tagifyText requires including script.aculo.us' builder.js library");
      
    var tagifyStyle = 'position:relative';
    if(Prototype.Browser.IE) tagifyStyle += ';zoom:1';
    
    element = $(element);
    $A(element.childNodes).each( function(child) {
      if(child.nodeType==3) {
        child.nodeValue.toArray().each( function(character) {
          element.insertBefore(
            Builder.node('span',{style: tagifyStyle},
              character == ' ' ? String.fromCharCode(160) : character), 
              child);
        });
        Element.remove(child);
      }
    });
  },
  multiple: function(element, effect) {
    var elements;
    if(((typeof element == 'object') || 
        (typeof element == 'function')) && 
       (element.length))
      elements = element;
    else
      elements = $(element).childNodes;
      
    var options = Object.extend({
      speed: 0.1,
      delay: 0.0
    }, arguments[2] || {});
    var masterDelay = options.delay;

    $A(elements).each( function(element, index) {
      new effect(element, Object.extend(options, { delay: index * options.speed + masterDelay }));
    });
  },
  PAIRS: {
    'slide':  ['SlideDown','SlideUp'],
    'blind':  ['BlindDown','BlindUp'],
    'appear': ['Appear','Fade']
  },
  toggle: function(element, effect) {
    element = $(element);
    effect = (effect || 'appear').toLowerCase();
    var options = Object.extend({
      queue: { position:'end', scope:(element.id || 'global'), limit: 1 }
    }, arguments[2] || {});
    Effect[element.visible() ? 
      Effect.PAIRS[effect][1] : Effect.PAIRS[effect][0]](element, options);
  }
};

var Effect2 = Effect; // deprecated

/* ------------- transitions ------------- */

Effect.Transitions = {
  linear: Prototype.K,
  sinoidal: function(pos) {
    return (-Math.cos(pos*Math.PI)/2) + 0.5;
  },
  reverse: function(pos) {
    return 1-pos;
  },
  flicker: function(pos) {
    var pos = ((-Math.cos(pos*Math.PI)/4) + 0.75) + Math.random()/4;
    return (pos > 1 ? 1 : pos);
  },
  wobble: function(pos) {
    return (-Math.cos(pos*Math.PI*(9*pos))/2) + 0.5;
  },
  pulse: function(pos, pulses) { 
    pulses = pulses || 5; 
    return (
      Math.round((pos % (1/pulses)) * pulses) == 0 ? 
            ((pos * pulses * 2) - Math.floor(pos * pulses * 2)) : 
        1 - ((pos * pulses * 2) - Math.floor(pos * pulses * 2))
      );
  },
  spring: function(pos) { 
    return 1 - (Math.cos(pos * 4.5 * Math.PI) * Math.exp(-pos * 6)); 
  },
  none: function(pos) {
    return 0;
  },
  full: function(pos) {
    return 1;
  }
};

/* ------------- core effects ------------- */

Effect.ScopedQueue = Class.create();
Object.extend(Object.extend(Effect.ScopedQueue.prototype, Enumerable), {
  initialize: function() {
    this.effects  = [];
    this.interval = null;    
  },
  _each: function(iterator) {
    this.effects._each(iterator);
  },
  add: function(effect) {
    var timestamp = new Date().getTime();
    
    var position = (typeof effect.options.queue == 'string') ? 
      effect.options.queue : effect.options.queue.position;
    
    switch(position) {
      case 'front':
        // move unstarted effects after this effect  
        this.effects.findAll(function(e){ return e.state=='idle' }).each( function(e) {
            e.startOn  += effect.finishOn;
            e.finishOn += effect.finishOn;
          });
        break;
      case 'with-last':
        timestamp = this.effects.pluck('startOn').max() || timestamp;
        break;
      case 'end':
        // start effect after last queued effect has finished
        timestamp = this.effects.pluck('finishOn').max() || timestamp;
        break;
    }
    
    effect.startOn  += timestamp;
    effect.finishOn += timestamp;

    if(!effect.options.queue.limit || (this.effects.length < effect.options.queue.limit))
      this.effects.push(effect);
    
    if(!this.interval)
      this.interval = setInterval(this.loop.bind(this), 15);
  },
  remove: function(effect) {
    this.effects = this.effects.reject(function(e) { return e==effect });
    if(this.effects.length == 0) {
      clearInterval(this.interval);
      this.interval = null;
    }
  },
  loop: function() {
    var timePos = new Date().getTime();
    for(var i=0, len=this.effects.length;i<len;i++) 
      this.effects[i] && this.effects[i].loop(timePos);
  }
});

Effect.Queues = {
  instances: $H(),
  get: function(queueName) {
    if(typeof queueName != 'string') return queueName;
    
    if(!this.instances[queueName])
      this.instances[queueName] = new Effect.ScopedQueue();
      
    return this.instances[queueName];
  }
}
Effect.Queue = Effect.Queues.get('global');

Effect.DefaultOptions = {
  transition: Effect.Transitions.sinoidal,
  duration:   1.0,   // seconds
  fps:        100,   // 100= assume 66fps max.
  sync:       false, // true for combining
  from:       0.0,
  to:         1.0,
  delay:      0.0,
  queue:      'parallel'
}

Effect.Base = function() {};
Effect.Base.prototype = {
  position: null,
  start: function(options) {
    function codeForEvent(options,eventName){
      return (
        (options[eventName+'Internal'] ? 'this.options.'+eventName+'Internal(this);' : '') +
        (options[eventName] ? 'this.options.'+eventName+'(this);' : '')
      );
    }
    if(options && options.transition === false) options.transition = Effect.Transitions.linear;
    this.options      = Object.extend(Object.extend({},Effect.DefaultOptions), options || {});
    this.currentFrame = 0;
    this.state        = 'idle';
    this.startOn      = this.options.delay*1000;
    this.finishOn     = this.startOn+(this.options.duration*1000);
    this.fromToDelta  = this.options.to-this.options.from;
    this.totalTime    = this.finishOn-this.startOn;
    this.totalFrames  = this.options.fps*this.options.duration;
    
    eval('this.render = function(pos){ '+
      'if(this.state=="idle"){this.state="running";'+
      codeForEvent(this.options,'beforeSetup')+
      (this.setup ? 'this.setup();':'')+ 
      codeForEvent(this.options,'afterSetup')+
      '};if(this.state=="running"){'+
      'pos=this.options.transition(pos)*'+this.fromToDelta+'+'+this.options.from+';'+
      'this.position=pos;'+
      codeForEvent(this.options,'beforeUpdate')+
      (this.update ? 'this.update(pos);':'')+
      codeForEvent(this.options,'afterUpdate')+
      '}}');
    
    this.event('beforeStart');
    if(!this.options.sync)
      Effect.Queues.get(typeof this.options.queue == 'string' ? 
        'global' : this.options.queue.scope).add(this);
  },
  loop: function(timePos) {
    if(timePos >= this.startOn) {
      if(timePos >= this.finishOn) {
        this.render(1.0);
        this.cancel();
        this.event('beforeFinish');
        if(this.finish) this.finish(); 
        this.event('afterFinish');
        return;  
      }
      var pos   = (timePos - this.startOn) / this.totalTime,
          frame = Math.round(pos * this.totalFrames);
      if(frame > this.currentFrame) {
        this.render(pos);
        this.currentFrame = frame;
      }
    }
  },
  cancel: function() {
    if(!this.options.sync)
      Effect.Queues.get(typeof this.options.queue == 'string' ? 
        'global' : this.options.queue.scope).remove(this);
    this.state = 'finished';
  },
  event: function(eventName) {
    if(this.options[eventName + 'Internal']) this.options[eventName + 'Internal'](this);
    if(this.options[eventName]) this.options[eventName](this);
  },
  inspect: function() {
    var data = $H();
    for(property in this)
      if(typeof this[property] != 'function') data[property] = this[property];
    return '#<Effect:' + data.inspect() + ',options:' + $H(this.options).inspect() + '>';
  }
}

Effect.Parallel = Class.create();
Object.extend(Object.extend(Effect.Parallel.prototype, Effect.Base.prototype), {
  initialize: function(effects) {
    this.effects = effects || [];
    this.start(arguments[1]);
  },
  update: function(position) {
    this.effects.invoke('render', position);
  },
  finish: function(position) {
    this.effects.each( function(effect) {
      effect.render(1.0);
      effect.cancel();
      effect.event('beforeFinish');
      if(effect.finish) effect.finish(position);
      effect.event('afterFinish');
    });
  }
});

Effect.Event = Class.create();
Object.extend(Object.extend(Effect.Event.prototype, Effect.Base.prototype), {
  initialize: function() {
    var options = Object.extend({
      duration: 0
    }, arguments[0] || {});
    this.start(options);
  },
  update: Prototype.emptyFunction
});

Effect.Opacity = Class.create();
Object.extend(Object.extend(Effect.Opacity.prototype, Effect.Base.prototype), {
  initialize: function(element) {
    this.element = $(element);
    if(!this.element) throw(Effect._elementDoesNotExistError);
    // make this work on IE on elements without 'layout'
    if(Prototype.Browser.IE && (!this.element.currentStyle.hasLayout))
      this.element.setStyle({zoom: 1});
    var options = Object.extend({
      from: this.element.getOpacity() || 0.0,
      to:   1.0
    }, arguments[1] || {});
    this.start(options);
  },
  update: function(position) {
    this.element.setOpacity(position);
  }
});

Effect.Move = Class.create();
Object.extend(Object.extend(Effect.Move.prototype, Effect.Base.prototype), {
  initialize: function(element) {
    this.element = $(element);
    if(!this.element) throw(Effect._elementDoesNotExistError);
    var options = Object.extend({
      x:    0,
      y:    0,
      mode: 'relative'
    }, arguments[1] || {});
    this.start(options);
  },
  setup: function() {
    // Bug in Opera: Opera returns the "real" position of a static element or
    // relative element that does not have top/left explicitly set.
    // ==> Always set top and left for position relative elements in your stylesheets 
    // (to 0 if you do not need them) 
    this.element.makePositioned();
    this.originalLeft = parseFloat(this.element.getStyle('left') || '0');
    this.originalTop  = parseFloat(this.element.getStyle('top')  || '0');
    if(this.options.mode == 'absolute') {
      // absolute movement, so we need to calc deltaX and deltaY
      this.options.x = this.options.x - this.originalLeft;
      this.options.y = this.options.y - this.originalTop;
    }
  },
  update: function(position) {
    this.element.setStyle({
      left: Math.round(this.options.x  * position + this.originalLeft) + 'px',
      top:  Math.round(this.options.y  * position + this.originalTop)  + 'px'
    });
  }
});

// for backwards compatibility
Effect.MoveBy = function(element, toTop, toLeft) {
  return new Effect.Move(element, 
    Object.extend({ x: toLeft, y: toTop }, arguments[3] || {}));
};

Effect.Scale = Class.create();
Object.extend(Object.extend(Effect.Scale.prototype, Effect.Base.prototype), {
  initialize: function(element, percent) {
    this.element = $(element);
    if(!this.element) throw(Effect._elementDoesNotExistError);
    var options = Object.extend({
      scaleX: true,
      scaleY: true,
      scaleContent: true,
      scaleFromCenter: false,
      scaleMode: 'box',        // 'box' or 'contents' or {} with provided values
      scaleFrom: 100.0,
      scaleTo:   percent
    }, arguments[2] || {});
    this.start(options);
  },
  setup: function() {
    this.restoreAfterFinish = this.options.restoreAfterFinish || false;
    this.elementPositioning = this.element.getStyle('position');
    
    this.originalStyle = {};
    ['top','left','width','height','fontSize'].each( function(k) {
      this.originalStyle[k] = this.element.style[k];
    }.bind(this));
      
    this.originalTop  = this.element.offsetTop;
    this.originalLeft = this.element.offsetLeft;
    
    var fontSize = this.element.getStyle('font-size') || '100%';
    ['em','px','%','pt'].each( function(fontSizeType) {
      if(fontSize.indexOf(fontSizeType)>0) {
        this.fontSize     = parseFloat(fontSize);
        this.fontSizeType = fontSizeType;
      }
    }.bind(this));
    
    this.factor = (this.options.scaleTo - this.options.scaleFrom)/100;
    
    this.dims = null;
    if(this.options.scaleMode=='box')
      this.dims = [this.element.offsetHeight, this.element.offsetWidth];
    if(/^content/.test(this.options.scaleMode))
      this.dims = [this.element.scrollHeight, this.element.scrollWidth];
    if(!this.dims)
      this.dims = [this.options.scaleMode.originalHeight,
                   this.options.scaleMode.originalWidth];
  },
  update: function(position) {
    var currentScale = (this.options.scaleFrom/100.0) + (this.factor * position);
    if(this.options.scaleContent && this.fontSize)
      this.element.setStyle({fontSize: this.fontSize * currentScale + this.fontSizeType });
    this.setDimensions(this.dims[0] * currentScale, this.dims[1] * currentScale);
  },
  finish: function(position) {
    if(this.restoreAfterFinish) this.element.setStyle(this.originalStyle);
  },
  setDimensions: function(height, width) {
    var d = {};
    if(this.options.scaleX) d.width = Math.round(width) + 'px';
    if(this.options.scaleY) d.height = Math.round(height) + 'px';
    if(this.options.scaleFromCenter) {
      var topd  = (height - this.dims[0])/2;
      var leftd = (width  - this.dims[1])/2;
      if(this.elementPositioning == 'absolute') {
        if(this.options.scaleY) d.top = this.originalTop-topd + 'px';
        if(this.options.scaleX) d.left = this.originalLeft-leftd + 'px';
      } else {
        if(this.options.scaleY) d.top = -topd + 'px';
        if(this.options.scaleX) d.left = -leftd + 'px';
      }
    }
    this.element.setStyle(d);
  }
});

Effect.Highlight = Class.create();
Object.extend(Object.extend(Effect.Highlight.prototype, Effect.Base.prototype), {
  initialize: function(element) {
    this.element = $(element);
    if(!this.element) throw(Effect._elementDoesNotExistError);
    var options = Object.extend({ startcolor: '#ffff99' }, arguments[1] || {});
    this.start(options);
  },
  setup: function() {
    // Prevent executing on elements not in the layout flow
    if(this.element.getStyle('display')=='none') { this.cancel(); return; }
    // Disable background image during the effect
    this.oldStyle = {};
    if (!this.options.keepBackgroundImage) {
      this.oldStyle.backgroundImage = this.element.getStyle('background-image');
      this.element.setStyle({backgroundImage: 'none'});
    }
    if(!this.options.endcolor)
      this.options.endcolor = this.element.getStyle('background-color').parseColor('#ffffff');
    if(!this.options.restorecolor)
      this.options.restorecolor = this.element.getStyle('background-color');
    // init color calculations
    this._base  = $R(0,2).map(function(i){ return parseInt(this.options.startcolor.slice(i*2+1,i*2+3),16) }.bind(this));
    this._delta = $R(0,2).map(function(i){ return parseInt(this.options.endcolor.slice(i*2+1,i*2+3),16)-this._base[i] }.bind(this));
  },
  update: function(position) {
    this.element.setStyle({backgroundColor: $R(0,2).inject('#',function(m,v,i){
      return m+(Math.round(this._base[i]+(this._delta[i]*position)).toColorPart()); }.bind(this)) });
  },
  finish: function() {
    this.element.setStyle(Object.extend(this.oldStyle, {
      backgroundColor: this.options.restorecolor
    }));
  }
});

Effect.ScrollTo = Class.create();
Object.extend(Object.extend(Effect.ScrollTo.prototype, Effect.Base.prototype), {
  initialize: function(element) {
    this.element = $(element);
    this.start(arguments[1] || {});
  },
  setup: function() {
    Position.prepare();
    var offsets = Position.cumulativeOffset(this.element);
    if(this.options.offset) offsets[1] += this.options.offset;
    var max = window.innerHeight ? 
      window.height - window.innerHeight :
      document.body.scrollHeight - 
        (document.documentElement.clientHeight ? 
          document.documentElement.clientHeight : document.body.clientHeight);
    this.scrollStart = Position.deltaY;
    this.delta = (offsets[1] > max ? max : offsets[1]) - this.scrollStart;
  },
  update: function(position) {
    Position.prepare();
    window.scrollTo(Position.deltaX, 
      this.scrollStart + (position*this.delta));
  }
});

/* ------------- combination effects ------------- */

Effect.Fade = function(element) {
  element = $(element);
  var oldOpacity = element.getInlineOpacity();
  var options = Object.extend({
  from: element.getOpacity() || 1.0,
  to:   0.0,
  afterFinishInternal: function(effect) { 
    if(effect.options.to!=0) return;
    effect.element.hide().setStyle({opacity: oldOpacity}); 
  }}, arguments[1] || {});
  return new Effect.Opacity(element,options);
}

Effect.Appear = function(element) {
  element = $(element);
  var options = Object.extend({
  from: (element.getStyle('display') == 'none' ? 0.0 : element.getOpacity() || 0.0),
  to:   1.0,
  // force Safari to render floated elements properly
  afterFinishInternal: function(effect) {
    effect.element.forceRerendering();
  },
  beforeSetup: function(effect) {
    effect.element.setOpacity(effect.options.from).show(); 
  }}, arguments[1] || {});
  return new Effect.Opacity(element,options);
}

Effect.Puff = function(element) {
  element = $(element);
  var oldStyle = { 
    opacity: element.getInlineOpacity(), 
    position: element.getStyle('position'),
    top:  element.style.top,
    left: element.style.left,
    width: element.style.width,
    height: element.style.height
  };
  return new Effect.Parallel(
   [ new Effect.Scale(element, 200, 
      { sync: true, scaleFromCenter: true, scaleContent: true, restoreAfterFinish: true }), 
     new Effect.Opacity(element, { sync: true, to: 0.0 } ) ], 
     Object.extend({ duration: 1.0, 
      beforeSetupInternal: function(effect) {
        Position.absolutize(effect.effects[0].element)
      },
      afterFinishInternal: function(effect) {
         effect.effects[0].element.hide().setStyle(oldStyle); }
     }, arguments[1] || {})
   );
}

Effect.BlindUp = function(element) {
  element = $(element);
  element.makeClipping();
  return new Effect.Scale(element, 0,
    Object.extend({ scaleContent: false, 
      scaleX: false, 
      restoreAfterFinish: true,
      afterFinishInternal: function(effect) {
        effect.element.hide().undoClipping();
      } 
    }, arguments[1] || {})
  );
}

Effect.BlindDown = function(element) {
  element = $(element);
  var elementDimensions = element.getDimensions();
  return new Effect.Scale(element, 100, Object.extend({ 
    scaleContent: false, 
    scaleX: false,
    scaleFrom: 0,
    scaleMode: {originalHeight: elementDimensions.height, originalWidth: elementDimensions.width},
    restoreAfterFinish: true,
    afterSetup: function(effect) {
      effect.element.makeClipping().setStyle({height: '0px'}).show(); 
    },  
    afterFinishInternal: function(effect) {
      effect.element.undoClipping();
    }
  }, arguments[1] || {}));
}

Effect.SwitchOff = function(element) {
  element = $(element);
  var oldOpacity = element.getInlineOpacity();
  return new Effect.Appear(element, Object.extend({
    duration: 0.4,
    from: 0,
    transition: Effect.Transitions.flicker,
    afterFinishInternal: function(effect) {
      new Effect.Scale(effect.element, 1, { 
        duration: 0.3, scaleFromCenter: true,
        scaleX: false, scaleContent: false, restoreAfterFinish: true,
        beforeSetup: function(effect) { 
          effect.element.makePositioned().makeClipping();
        },
        afterFinishInternal: function(effect) {
          effect.element.hide().undoClipping().undoPositioned().setStyle({opacity: oldOpacity});
        }
      })
    }
  }, arguments[1] || {}));
}

Effect.DropOut = function(element) {
  element = $(element);
  var oldStyle = {
    top: element.getStyle('top'),
    left: element.getStyle('left'),
    opacity: element.getInlineOpacity() };
  return new Effect.Parallel(
    [ new Effect.Move(element, {x: 0, y: 100, sync: true }), 
      new Effect.Opacity(element, { sync: true, to: 0.0 }) ],
    Object.extend(
      { duration: 0.5,
        beforeSetup: function(effect) {
          effect.effects[0].element.makePositioned(); 
        },
        afterFinishInternal: function(effect) {
          effect.effects[0].element.hide().undoPositioned().setStyle(oldStyle);
        } 
      }, arguments[1] || {}));
}

Effect.Shake = function(element) {
  element = $(element);
  var oldStyle = {
    top: element.getStyle('top'),
    left: element.getStyle('left') };
    return new Effect.Move(element, 
      { x:  20, y: 0, duration: 0.05, afterFinishInternal: function(effect) {
    new Effect.Move(effect.element,
      { x: -40, y: 0, duration: 0.1,  afterFinishInternal: function(effect) {
    new Effect.Move(effect.element,
      { x:  40, y: 0, duration: 0.1,  afterFinishInternal: function(effect) {
    new Effect.Move(effect.element,
      { x: -40, y: 0, duration: 0.1,  afterFinishInternal: function(effect) {
    new Effect.Move(effect.element,
      { x:  40, y: 0, duration: 0.1,  afterFinishInternal: function(effect) {
    new Effect.Move(effect.element,
      { x: -20, y: 0, duration: 0.05, afterFinishInternal: function(effect) {
        effect.element.undoPositioned().setStyle(oldStyle);
  }}) }}) }}) }}) }}) }});
}

Effect.SlideDown = function(element) {
  element = $(element).cleanWhitespace();
  // SlideDown need to have the content of the element wrapped in a container element with fixed height!
  var oldInnerBottom = element.down().getStyle('bottom');
  var elementDimensions = element.getDimensions();
  return new Effect.Scale(element, 100, Object.extend({ 
    scaleContent: false, 
    scaleX: false, 
    scaleFrom: window.opera ? 0 : 1,
    scaleMode: {originalHeight: elementDimensions.height, originalWidth: elementDimensions.width},
    restoreAfterFinish: true,
    afterSetup: function(effect) {
      effect.element.makePositioned();
      effect.element.down().makePositioned();
      if(window.opera) effect.element.setStyle({top: ''});
      effect.element.makeClipping().setStyle({height: '0px'}).show(); 
    },
    afterUpdateInternal: function(effect) {
      effect.element.down().setStyle({bottom:
        (effect.dims[0] - effect.element.clientHeight) + 'px' }); 
    },
    afterFinishInternal: function(effect) {
      effect.element.undoClipping().undoPositioned();
      effect.element.down().undoPositioned().setStyle({bottom: oldInnerBottom}); }
    }, arguments[1] || {})
  );
}

Effect.SlideUp = function(element) {
  element = $(element).cleanWhitespace();
  var oldInnerBottom = element.down().getStyle('bottom');
  return new Effect.Scale(element, window.opera ? 0 : 1,
   Object.extend({ scaleContent: false, 
    scaleX: false, 
    scaleMode: 'box',
    scaleFrom: 100,
    restoreAfterFinish: true,
    beforeStartInternal: function(effect) {
      effect.element.makePositioned();
      effect.element.down().makePositioned();
      if(window.opera) effect.element.setStyle({top: ''});
      effect.element.makeClipping().show();
    },  
    afterUpdateInternal: function(effect) {
      effect.element.down().setStyle({bottom:
        (effect.dims[0] - effect.element.clientHeight) + 'px' });
    },
    afterFinishInternal: function(effect) {
      effect.element.hide().undoClipping().undoPositioned().setStyle({bottom: oldInnerBottom});
      effect.element.down().undoPositioned();
    }
   }, arguments[1] || {})
  );
}

// Bug in opera makes the TD containing this element expand for a instance after finish 
Effect.Squish = function(element) {
  return new Effect.Scale(element, window.opera ? 1 : 0, { 
    restoreAfterFinish: true,
    beforeSetup: function(effect) {
      effect.element.makeClipping(); 
    },  
    afterFinishInternal: function(effect) {
      effect.element.hide().undoClipping(); 
    }
  });
}

Effect.Grow = function(element) {
  element = $(element);
  var options = Object.extend({
    direction: 'center',
    moveTransition: Effect.Transitions.sinoidal,
    scaleTransition: Effect.Transitions.sinoidal,
    opacityTransition: Effect.Transitions.full
  }, arguments[1] || {});
  var oldStyle = {
    top: element.style.top,
    left: element.style.left,
    height: element.style.height,
    width: element.style.width,
    opacity: element.getInlineOpacity() };

  var dims = element.getDimensions();    
  var initialMoveX, initialMoveY;
  var moveX, moveY;
  
  switch (options.direction) {
    case 'top-left':
      initialMoveX = initialMoveY = moveX = moveY = 0; 
      break;
    case 'top-right':
      initialMoveX = dims.width;
      initialMoveY = moveY = 0;
      moveX = -dims.width;
      break;
    case 'bottom-left':
      initialMoveX = moveX = 0;
      initialMoveY = dims.height;
      moveY = -dims.height;
      break;
    case 'bottom-right':
      initialMoveX = dims.width;
      initialMoveY = dims.height;
      moveX = -dims.width;
      moveY = -dims.height;
      break;
    case 'center':
      initialMoveX = dims.width / 2;
      initialMoveY = dims.height / 2;
      moveX = -dims.width / 2;
      moveY = -dims.height / 2;
      break;
  }
  
  return new Effect.Move(element, {
    x: initialMoveX,
    y: initialMoveY,
    duration: 0.01, 
    beforeSetup: function(effect) {
      effect.element.hide().makeClipping().makePositioned();
    },
    afterFinishInternal: function(effect) {
      new Effect.Parallel(
        [ new Effect.Opacity(effect.element, { sync: true, to: 1.0, from: 0.0, transition: options.opacityTransition }),
          new Effect.Move(effect.element, { x: moveX, y: moveY, sync: true, transition: options.moveTransition }),
          new Effect.Scale(effect.element, 100, {
            scaleMode: { originalHeight: dims.height, originalWidth: dims.width }, 
            sync: true, scaleFrom: window.opera ? 1 : 0, transition: options.scaleTransition, restoreAfterFinish: true})
        ], Object.extend({
             beforeSetup: function(effect) {
               effect.effects[0].element.setStyle({height: '0px'}).show(); 
             },
             afterFinishInternal: function(effect) {
               effect.effects[0].element.undoClipping().undoPositioned().setStyle(oldStyle); 
             }
           }, options)
      )
    }
  });
}

Effect.Shrink = function(element) {
  element = $(element);
  var options = Object.extend({
    direction: 'center',
    moveTransition: Effect.Transitions.sinoidal,
    scaleTransition: Effect.Transitions.sinoidal,
    opacityTransition: Effect.Transitions.none
  }, arguments[1] || {});
  var oldStyle = {
    top: element.style.top,
    left: element.style.left,
    height: element.style.height,
    width: element.style.width,
    opacity: element.getInlineOpacity() };

  var dims = element.getDimensions();
  var moveX, moveY;
  
  switch (options.direction) {
    case 'top-left':
      moveX = moveY = 0;
      break;
    case 'top-right':
      moveX = dims.width;
      moveY = 0;
      break;
    case 'bottom-left':
      moveX = 0;
      moveY = dims.height;
      break;
    case 'bottom-right':
      moveX = dims.width;
      moveY = dims.height;
      break;
    case 'center':  
      moveX = dims.width / 2;
      moveY = dims.height / 2;
      break;
  }
  
  return new Effect.Parallel(
    [ new Effect.Opacity(element, { sync: true, to: 0.0, from: 1.0, transition: options.opacityTransition }),
      new Effect.Scale(element, window.opera ? 1 : 0, { sync: true, transition: options.scaleTransition, restoreAfterFinish: true}),
      new Effect.Move(element, { x: moveX, y: moveY, sync: true, transition: options.moveTransition })
    ], Object.extend({            
         beforeStartInternal: function(effect) {
           effect.effects[0].element.makePositioned().makeClipping(); 
         },
         afterFinishInternal: function(effect) {
           effect.effects[0].element.hide().undoClipping().undoPositioned().setStyle(oldStyle); }
       }, options)
  );
}

Effect.Pulsate = function(element) {
  element = $(element);
  var options    = arguments[1] || {};
  var oldOpacity = element.getInlineOpacity();
  var transition = options.transition || Effect.Transitions.sinoidal;
  var reverser   = function(pos){ return transition(1-Effect.Transitions.pulse(pos, options.pulses)) };
  reverser.bind(transition);
  return new Effect.Opacity(element, 
    Object.extend(Object.extend({  duration: 2.0, from: 0,
      afterFinishInternal: function(effect) { effect.element.setStyle({opacity: oldOpacity}); }
    }, options), {transition: reverser}));
}

Effect.Fold = function(element) {
  element = $(element);
  var oldStyle = {
    top: element.style.top,
    left: element.style.left,
    width: element.style.width,
    height: element.style.height };
  element.makeClipping();
  return new Effect.Scale(element, 5, Object.extend({   
    scaleContent: false,
    scaleX: false,
    afterFinishInternal: function(effect) {
    new Effect.Scale(element, 1, { 
      scaleContent: false, 
      scaleY: false,
      afterFinishInternal: function(effect) {
        effect.element.hide().undoClipping().setStyle(oldStyle);
      } });
  }}, arguments[1] || {}));
};

Effect.Morph = Class.create();
Object.extend(Object.extend(Effect.Morph.prototype, Effect.Base.prototype), {
  initialize: function(element) {
    this.element = $(element);
    if(!this.element) throw(Effect._elementDoesNotExistError);
    var options = Object.extend({
      style: {}
    }, arguments[1] || {});
    if (typeof options.style == 'string') {
      if(options.style.indexOf(':') == -1) {
        var cssText = '', selector = '.' + options.style;
        $A(document.styleSheets).reverse().each(function(styleSheet) {
          if (styleSheet.cssRules) cssRules = styleSheet.cssRules;
          else if (styleSheet.rules) cssRules = styleSheet.rules;
          $A(cssRules).reverse().each(function(rule) {
            if (selector == rule.selectorText) {
              cssText = rule.style.cssText;
              throw $break;
            }
          });
          if (cssText) throw $break;
        });
        this.style = cssText.parseStyle();
        options.afterFinishInternal = function(effect){
          effect.element.addClassName(effect.options.style);
          effect.transforms.each(function(transform) {
            if(transform.style != 'opacity')
              effect.element.style[transform.style] = '';
          });
        }
      } else this.style = options.style.parseStyle();
    } else this.style = $H(options.style)
    this.start(options);
  },
  setup: function(){
    function parseColor(color){
      if(!color || ['rgba(0, 0, 0, 0)','transparent'].include(color)) color = '#ffffff';
      color = color.parseColor();
      return $R(0,2).map(function(i){
        return parseInt( color.slice(i*2+1,i*2+3), 16 ) 
      });
    }
    this.transforms = this.style.map(function(pair){
      var property = pair[0], value = pair[1], unit = null;

      if(value.parseColor('#zzzzzz') != '#zzzzzz') {
        value = value.parseColor();
        unit  = 'color';
      } else if(property == 'opacity') {
        value = parseFloat(value);
        if(Prototype.Browser.IE && (!this.element.currentStyle.hasLayout))
          this.element.setStyle({zoom: 1});
      } else if(Element.CSS_LENGTH.test(value)) {
          var components = value.match(/^([\+\-]?[0-9\.]+)(.*)$/);
          value = parseFloat(components[1]);
          unit = (components.length == 3) ? components[2] : null;
      }

      var originalValue = this.element.getStyle(property);
      return { 
        style: property.camelize(), 
        originalValue: unit=='color' ? parseColor(originalValue) : parseFloat(originalValue || 0), 
        targetValue: unit=='color' ? parseColor(value) : value,
        unit: unit
      };
    }.bind(this)).reject(function(transform){
      return (
        (transform.originalValue == transform.targetValue) ||
        (
          transform.unit != 'color' &&
          (isNaN(transform.originalValue) || isNaN(transform.targetValue))
        )
      )
    });
  },
  update: function(position) {
    var style = {}, transform, i = this.transforms.length;
    while(i--)
      style[(transform = this.transforms[i]).style] = 
        transform.unit=='color' ? '#'+
          (Math.round(transform.originalValue[0]+
            (transform.targetValue[0]-transform.originalValue[0])*position)).toColorPart() +
          (Math.round(transform.originalValue[1]+
            (transform.targetValue[1]-transform.originalValue[1])*position)).toColorPart() +
          (Math.round(transform.originalValue[2]+
            (transform.targetValue[2]-transform.originalValue[2])*position)).toColorPart() :
        transform.originalValue + Math.round(
          ((transform.targetValue - transform.originalValue) * position) * 1000)/1000 + transform.unit;
    this.element.setStyle(style, true);
  }
});

Effect.Transform = Class.create();
Object.extend(Effect.Transform.prototype, {
  initialize: function(tracks){
    this.tracks  = [];
    this.options = arguments[1] || {};
    this.addTracks(tracks);
  },
  addTracks: function(tracks){
    tracks.each(function(track){
      var data = $H(track).values().first();
      this.tracks.push($H({
        ids:     $H(track).keys().first(),
        effect:  Effect.Morph,
        options: { style: data }
      }));
    }.bind(this));
    return this;
  },
  play: function(){
    return new Effect.Parallel(
      this.tracks.map(function(track){
        var elements = [$(track.ids) || $$(track.ids)].flatten();
        return elements.map(function(e){ return new track.effect(e, Object.extend({ sync:true }, track.options)) });
      }).flatten(),
      this.options
    );
  }
});

Element.CSS_PROPERTIES = $w(
  'backgroundColor backgroundPosition borderBottomColor borderBottomStyle ' + 
  'borderBottomWidth borderLeftColor borderLeftStyle borderLeftWidth ' +
  'borderRightColor borderRightStyle borderRightWidth borderSpacing ' +
  'borderTopColor borderTopStyle borderTopWidth bottom clip color ' +
  'fontSize fontWeight height left letterSpacing lineHeight ' +
  'marginBottom marginLeft marginRight marginTop markerOffset maxHeight '+
  'maxWidth minHeight minWidth opacity outlineColor outlineOffset ' +
  'outlineWidth paddingBottom paddingLeft paddingRight paddingTop ' +
  'right textIndent top width wordSpacing zIndex');
  
Element.CSS_LENGTH = /^(([\+\-]?[0-9\.]+)(em|ex|px|in|cm|mm|pt|pc|\%))|0$/;

String.__parseStyleElement = document.createElement('div');
String.prototype.parseStyle = function(){
  String.__parseStyleElement.innerHTML = '<div style="' + this + '"></div>';
  var style = String.__parseStyleElement.childNodes[0].style, styleRules = $H();
  
  Element.CSS_PROPERTIES.each(function(property){
    if(style[property]) styleRules[property] = style[property]; 
  });
  
  if(Prototype.Browser.IE && this.indexOf('opacity') > -1)
    styleRules.opacity = this.match(/opacity:\s*((?:0|1)?(?:\.\d*)?)/)[1];

  return styleRules;
};

Effect.Methods = {
  morph: function(element, style) {
    element = $(element);
    new Effect.Morph(element, Object.extend({ style: style }, arguments[2] || {}));
    return element;
  },
  visualEffect: function(element, effect, options) {
    element = $(element)
    var s = effect.dasherize().camelize(), klass = s.charAt(0).toUpperCase() + s.substring(1);
    new Effect[klass](element, options);
    return element;
  },
  highlight: function(element, options) {
    element = $(element);
    new Effect.Highlight(element, options);
    return element;
  }
};

$w('fade appear grow shrink fold blindUp blindDown slideUp slideDown '+
  'pulsate shake puff squish switchOff dropOut').each(
  function(effect) { 
    Effect.Methods[effect] = function(element, options){
      element = $(element);
      Effect[effect.charAt(0).toUpperCase() + effect.substring(1)](element, options);
      return element;
    }
  }
);

$w('getInlineOpacity forceRerendering setContentZoom collectTextNodes collectTextNodesIgnoreClass').each( 
  function(f) { Effect.Methods[f] = Element[f]; }
);

Element.addMethods(Effect.Methods);


/***************************************************
 * library/scriptaculous/builder.js
 ***************************************************/

// Copyright (c) 2005-2007 Thomas Fuchs (http://script.aculo.us, http://mir.aculo.us)
//
// script.aculo.us is freely distributable under the terms of an MIT-style license.
// For details, see the script.aculo.us web site: http://script.aculo.us/

var Builder = {
  NODEMAP: {
    AREA: 'map',
    CAPTION: 'table',
    COL: 'table',
    COLGROUP: 'table',
    LEGEND: 'fieldset',
    OPTGROUP: 'select',
    OPTION: 'select',
    PARAM: 'object',
    TBODY: 'table',
    TD: 'table',
    TFOOT: 'table',
    TH: 'table',
    THEAD: 'table',
    TR: 'table'
  },
  // note: For Firefox < 1.5, OPTION and OPTGROUP tags are currently broken,
  //       due to a Firefox bug
  node: function(elementName) {
    elementName = elementName.toUpperCase();
    
    // try innerHTML approach
    var parentTag = this.NODEMAP[elementName] || 'div';
    var parentElement = document.createElement(parentTag);
    try { // prevent IE "feature": http://dev.rubyonrails.org/ticket/2707
      parentElement.innerHTML = "<" + elementName + "></" + elementName + ">";
    } catch(e) {}
    var element = parentElement.firstChild || null;
      
    // see if browser added wrapping tags
    if(element && (element.tagName.toUpperCase() != elementName))
      element = element.getElementsByTagName(elementName)[0];
    
    // fallback to createElement approach
    if(!element) element = document.createElement(elementName);
    
    // abort if nothing could be created
    if(!element) return;

    // attributes (or text)
    if(arguments[1])
      if(this._isStringOrNumber(arguments[1]) ||
        (arguments[1] instanceof Array) ||
        arguments[1].tagName) {
          this._children(element, arguments[1]);
        } else {
          var attrs = this._attributes(arguments[1]);
          if(attrs.length) {
            try { // prevent IE "feature": http://dev.rubyonrails.org/ticket/2707
              parentElement.innerHTML = "<" +elementName + " " +
                attrs + "></" + elementName + ">";
            } catch(e) {}
            element = parentElement.firstChild || null;
            // workaround firefox 1.0.X bug
            if(!element) {
              element = document.createElement(elementName);
              for(attr in arguments[1]) 
                element[attr == 'class' ? 'className' : attr] = arguments[1][attr];
            }
            if(element.tagName.toUpperCase() != elementName)
              element = parentElement.getElementsByTagName(elementName)[0];
          }
        } 

    // text, or array of children
    if(arguments[2])
      this._children(element, arguments[2]);

     return element;
  },
  _text: function(text) {
     return document.createTextNode(text);
  },

  ATTR_MAP: {
    'className': 'class',
    'htmlFor': 'for'
  },

  _attributes: function(attributes) {
    var attrs = [];
    for(attribute in attributes)
      attrs.push((attribute in this.ATTR_MAP ? this.ATTR_MAP[attribute] : attribute) +
          '="' + attributes[attribute].toString().escapeHTML().gsub(/"/,'&quot;') + '"');
    return attrs.join(" ");
  },
  _children: function(element, children) {
    if(children.tagName) {
      element.appendChild(children);
      return;
    }
    if(typeof children=='object') { // array can hold nodes and text
      children.flatten().each( function(e) {
        if(typeof e=='object')
          element.appendChild(e)
        else
          if(Builder._isStringOrNumber(e))
            element.appendChild(Builder._text(e));
      });
    } else
      if(Builder._isStringOrNumber(children))
        element.appendChild(Builder._text(children));
  },
  _isStringOrNumber: function(param) {
    return(typeof param=='string' || typeof param=='number');
  },
  build: function(html) {
    var element = this.node('div');
    $(element).update(html.strip());
    return element.down();
  },
  dump: function(scope) { 
    if(typeof scope != 'object' && typeof scope != 'function') scope = window; //global scope 
  
    var tags = ("A ABBR ACRONYM ADDRESS APPLET AREA B BASE BASEFONT BDO BIG BLOCKQUOTE BODY " +
      "BR BUTTON CAPTION CENTER CITE CODE COL COLGROUP DD DEL DFN DIR DIV DL DT EM FIELDSET " +
      "FONT FORM FRAME FRAMESET H1 H2 H3 H4 H5 H6 HEAD HR HTML I IFRAME IMG INPUT INS ISINDEX "+
      "KBD LABEL LEGEND LI LINK MAP MENU META NOFRAMES NOSCRIPT OBJECT OL OPTGROUP OPTION P "+
      "PARAM PRE Q S SAMP SCRIPT SELECT SMALL SPAN STRIKE STRONG STYLE SUB SUP TABLE TBODY TD "+
      "TEXTAREA TFOOT TH THEAD TITLE TR TT U UL VAR").split(/\s+/);
  
    tags.each( function(tag){ 
      scope[tag] = function() { 
        return Builder.node.apply(Builder, [tag].concat($A(arguments)));  
      } 
    });
  }
}



/***************************************************
 * library/scriptaculous/controls.js
 ***************************************************/

// Copyright (c) 2005-2007 Thomas Fuchs (http://script.aculo.us, http://mir.aculo.us)
//           (c) 2005-2007 Ivan Krstic (http://blogs.law.harvard.edu/ivan)
//           (c) 2005-2007 Jon Tirsen (http://www.tirsen.com)
// Contributors:
//  Richard Livsey
//  Rahul Bhargava
//  Rob Wills
// 
// script.aculo.us is freely distributable under the terms of an MIT-style license.
// For details, see the script.aculo.us web site: http://script.aculo.us/

// Autocompleter.Base handles all the autocompletion functionality 
// that's independent of the data source for autocompletion. This
// includes drawing the autocompletion menu, observing keyboard
// and mouse events, and similar.
//
// Specific autocompleters need to provide, at the very least, 
// a getUpdatedChoices function that will be invoked every time
// the text inside the monitored textbox changes. This method 
// should get the text for which to provide autocompletion by
// invoking this.getToken(), NOT by directly accessing
// this.element.value. This is to allow incremental tokenized
// autocompletion. Specific auto-completion logic (AJAX, etc)
// belongs in getUpdatedChoices.
//
// Tokenized incremental autocompletion is enabled automatically
// when an autocompleter is instantiated with the 'tokens' option
// in the options parameter, e.g.:
// new Ajax.Autocompleter('id','upd', '/url/', { tokens: ',' });
// will incrementally autocomplete with a comma as the token.
// Additionally, ',' in the above example can be replaced with
// a token array, e.g. { tokens: [',', '\n'] } which
// enables autocompletion on multiple tokens. This is most 
// useful when one of the tokens is \n (a newline), as it 
// allows smart autocompletion after linebreaks.

if(typeof Effect == 'undefined')
  throw("controls.js requires including script.aculo.us' effects.js library");

var Autocompleter = {}
Autocompleter.Base = function() {};
Autocompleter.Base.prototype = {
  baseInitialize: function(element, update, options) {
    element          = $(element)
    this.element     = element; 
    this.update      = $(update);  
    this.hasFocus    = false; 
    this.changed     = false; 
    this.active      = false; 
    this.index       = 0;     
    this.entryCount  = 0;
    this.oldElementValue = this.element.value;

    if(this.setOptions)
      this.setOptions(options);
    else
      this.options = options || {};

    this.options.paramName    = this.options.paramName || this.element.name;
    this.options.tokens       = this.options.tokens || [];
    this.options.frequency    = this.options.frequency || 0.4;
    this.options.minChars     = this.options.minChars || 1;
    this.options.onShow       = this.options.onShow || 
      function(element, update){ 
        if(!update.style.position || update.style.position=='absolute') {
          update.style.position = 'absolute';
          Position.clone(element, update, {
            setHeight: false, 
            offsetTop: element.offsetHeight
          });
        }
        Effect.Appear(update,{duration:0.15});
      };
    this.options.onHide = this.options.onHide || 
      function(element, update){ new Effect.Fade(update,{duration:0.15}) };

    if(typeof(this.options.tokens) == 'string') 
      this.options.tokens = new Array(this.options.tokens);
    // Force carriage returns as token delimiters anyway
    if (!this.options.tokens.include('\n'))
      this.options.tokens.push('\n');

    this.observer = null;
    
    this.element.setAttribute('autocomplete','off');

    Element.hide(this.update);

    Event.observe(this.element, 'blur', this.onBlur.bindAsEventListener(this));
    Event.observe(this.element, 'keypress', this.onKeyPress.bindAsEventListener(this));

    // Turn autocomplete back on when the user leaves the page, so that the
    // field's value will be remembered on Mozilla-based browsers.
    if(Prototype.Browser.Gecko)
      Event.observe(window, 'beforeunload', function(){
        element.setAttribute('autocomplete', 'on');
      });
  },

  show: function() {
    if(Element.getStyle(this.update, 'display')=='none') this.options.onShow(this.element, this.update);
    if(!this.iefix && 
      (Prototype.Browser.IE) &&
      (Element.getStyle(this.update, 'position')=='absolute')) {
      new Insertion.After(this.update, 
       '<iframe id="' + this.update.id + '_iefix" '+
       'style="display:none;position:absolute;filter:progid:DXImageTransform.Microsoft.Alpha(opacity=0);" ' +
       'src="javascript:false;" frameborder="0" scrolling="no"></iframe>');
      this.iefix = $(this.update.id+'_iefix');
    }
    if(this.iefix) setTimeout(this.fixIEOverlapping.bind(this), 50);
  },
  
  fixIEOverlapping: function() {
    Position.clone(this.update, this.iefix, {setTop:(!this.update.style.height)});
    this.iefix.style.zIndex = 1;
    this.update.style.zIndex = 2;
    Element.show(this.iefix);
  },

  hide: function() {
    this.stopIndicator();
    if(Element.getStyle(this.update, 'display')!='none') this.options.onHide(this.element, this.update);
    if(this.iefix) Element.hide(this.iefix);
  },

  startIndicator: function() {
    if(this.options.indicator) Element.show(this.options.indicator);
  },

  stopIndicator: function() {
    if(this.options.indicator) Element.hide(this.options.indicator);
  },

  onKeyPress: function(event) {
    if(this.active)
      switch(event.keyCode) {
       case Event.KEY_TAB:
       case Event.KEY_RETURN:
         this.selectEntry();
         Event.stop(event);
       case Event.KEY_ESC:
         this.hide();
         this.active = false;
         Event.stop(event);
         return;
       case Event.KEY_LEFT:
       case Event.KEY_RIGHT:
         return;
       case Event.KEY_UP:
         this.markPrevious();
         this.render();
         if(Prototype.Browser.WebKit) Event.stop(event);
         return;
       case Event.KEY_DOWN:
         this.markNext();
         this.render();
         if(Prototype.Browser.WebKit) Event.stop(event);
         return;
      }
     else 
       if(event.keyCode==Event.KEY_TAB || event.keyCode==Event.KEY_RETURN || 
         (Prototype.Browser.WebKit > 0 && event.keyCode == 0)) return;

    this.changed = true;
    this.hasFocus = true;

    if(this.observer) clearTimeout(this.observer);
      this.observer = 
        setTimeout(this.onObserverEvent.bind(this), this.options.frequency*1000);
  },

  activate: function() {
    this.changed = false;
    this.hasFocus = true;
    this.getUpdatedChoices();
  },

  onHover: function(event) {
    var element = Event.findElement(event, 'LI');
    if(this.index != element.autocompleteIndex) 
    {
        this.index = element.autocompleteIndex;
        this.render();
    }
    Event.stop(event);
  },
  
  onClick: function(event) {
    var element = Event.findElement(event, 'LI');
    this.index = element.autocompleteIndex;
    this.selectEntry();
    this.hide();
  },
  
  onBlur: function(event) {
    // needed to make click events working
    setTimeout(this.hide.bind(this), 250);
    this.hasFocus = false;
    this.active = false;     
  }, 
  
  render: function() {
    if(this.entryCount > 0) {
      for (var i = 0; i < this.entryCount; i++)
        this.index==i ? 
          Element.addClassName(this.getEntry(i),"selected") : 
          Element.removeClassName(this.getEntry(i),"selected");
      if(this.hasFocus) { 
        this.show();
        this.active = true;
      }
    } else {
      this.active = false;
      this.hide();
    }
  },
  
  markPrevious: function() {
    if(this.index > 0) this.index--
      else this.index = this.entryCount-1;
    this.getEntry(this.index).scrollIntoView(true);
  },
  
  markNext: function() {
    if(this.index < this.entryCount-1) this.index++
      else this.index = 0;
    this.getEntry(this.index).scrollIntoView(false);
  },
  
  getEntry: function(index) {
    return this.update.firstChild.childNodes[index];
  },
  
  getCurrentEntry: function() {
    return this.getEntry(this.index);
  },
  
  selectEntry: function() {
    this.active = false;
    this.updateElement(this.getCurrentEntry());
  },

  updateElement: function(selectedElement) {
    if (this.options.updateElement) {
      this.options.updateElement(selectedElement);
      return;
    }
    var value = '';
    if (this.options.select) {
      var nodes = document.getElementsByClassName(this.options.select, selectedElement) || [];
      if(nodes.length>0) value = Element.collectTextNodes(nodes[0], this.options.select);
    } else
      value = Element.collectTextNodesIgnoreClass(selectedElement, 'informal');
    
    var bounds = this.getTokenBounds();
    if (bounds[0] != -1) {
      var newValue = this.element.value.substr(0, bounds[0]);
      var whitespace = this.element.value.substr(bounds[0]).match(/^\s+/);
      if (whitespace)
        newValue += whitespace[0];
      this.element.value = newValue + value + this.element.value.substr(bounds[1]);
    } else {
      this.element.value = value;
    }
    this.oldElementValue = this.element.value;
    this.element.focus();
    
    if (this.options.afterUpdateElement)
      this.options.afterUpdateElement(this.element, selectedElement);
  },

  updateChoices: function(choices) {
    if(!this.changed && this.hasFocus) {
      this.update.innerHTML = choices;
      Element.cleanWhitespace(this.update);
      Element.cleanWhitespace(this.update.down());

      if(this.update.firstChild && this.update.down().childNodes) {
        this.entryCount = 
          this.update.down().childNodes.length;
        for (var i = 0; i < this.entryCount; i++) {
          var entry = this.getEntry(i);
          entry.autocompleteIndex = i;
          this.addObservers(entry);
        }
      } else { 
        this.entryCount = 0;
      }

      this.stopIndicator();
      this.index = 0;
      
      if(this.entryCount==1 && this.options.autoSelect) {
        this.selectEntry();
        this.hide();
      } else {
        this.render();
      }
    }
  },

  addObservers: function(element) {
    Event.observe(element, "mouseover", this.onHover.bindAsEventListener(this));
    Event.observe(element, "click", this.onClick.bindAsEventListener(this));
  },

  onObserverEvent: function() {
    this.changed = false;   
    this.tokenBounds = null;
    if(this.getToken().length>=this.options.minChars) {
      this.getUpdatedChoices();
    } else {
      this.active = false;
      this.hide();
    }
    this.oldElementValue = this.element.value;
  },

  getToken: function() {
    var bounds = this.getTokenBounds();
    return this.element.value.substring(bounds[0], bounds[1]).strip();
  },

  getTokenBounds: function() {
    if (null != this.tokenBounds) return this.tokenBounds;
    var value = this.element.value;
    if (value.strip().empty()) return [-1, 0];
    var diff = arguments.callee.getFirstDifferencePos(value, this.oldElementValue);
    var offset = (diff == this.oldElementValue.length ? 1 : 0);
    var prevTokenPos = -1, nextTokenPos = value.length;
    var tp;
    for (var index = 0, l = this.options.tokens.length; index < l; ++index) {
      tp = value.lastIndexOf(this.options.tokens[index], diff + offset - 1);
      if (tp > prevTokenPos) prevTokenPos = tp;
      tp = value.indexOf(this.options.tokens[index], diff + offset);
      if (-1 != tp && tp < nextTokenPos) nextTokenPos = tp;
    }
    return (this.tokenBounds = [prevTokenPos + 1, nextTokenPos]);
  }
}

Autocompleter.Base.prototype.getTokenBounds.getFirstDifferencePos = function(newS, oldS) {
  var boundary = Math.min(newS.length, oldS.length);
  for (var index = 0; index < boundary; ++index)
    if (newS[index] != oldS[index])
      return index;
  return boundary;
};

Ajax.Autocompleter = Class.create();
Object.extend(Object.extend(Ajax.Autocompleter.prototype, Autocompleter.Base.prototype), {
  initialize: function(element, update, url, options) {
    this.baseInitialize(element, update, options);
    this.options.asynchronous  = true;
    this.options.onComplete    = this.onComplete.bind(this);
    this.options.defaultParams = this.options.parameters || null;
    this.url                   = url;
  },

  getUpdatedChoices: function() {
    this.startIndicator();
    
    var entry = encodeURIComponent(this.options.paramName) + '=' + 
      encodeURIComponent(this.getToken());

    this.options.parameters = this.options.callback ?
      this.options.callback(this.element, entry) : entry;

    if(this.options.defaultParams) 
      this.options.parameters += '&' + this.options.defaultParams;
    
    new Ajax.Request(this.url, this.options);
  },

  onComplete: function(request) {
    this.updateChoices(request.responseText);
  }

});

// The local array autocompleter. Used when you'd prefer to
// inject an array of autocompletion options into the page, rather
// than sending out Ajax queries, which can be quite slow sometimes.
//
// The constructor takes four parameters. The first two are, as usual,
// the id of the monitored textbox, and id of the autocompletion menu.
// The third is the array you want to autocomplete from, and the fourth
// is the options block.
//
// Extra local autocompletion options:
// - choices - How many autocompletion choices to offer
//
// - partialSearch - If false, the autocompleter will match entered
//                    text only at the beginning of strings in the 
//                    autocomplete array. Defaults to true, which will
//                    match text at the beginning of any *word* in the
//                    strings in the autocomplete array. If you want to
//                    search anywhere in the string, additionally set
//                    the option fullSearch to true (default: off).
//
// - fullSsearch - Search anywhere in autocomplete array strings.
//
// - partialChars - How many characters to enter before triggering
//                   a partial match (unlike minChars, which defines
//                   how many characters are required to do any match
//                   at all). Defaults to 2.
//
// - ignoreCase - Whether to ignore case when autocompleting.
//                 Defaults to true.
//
// It's possible to pass in a custom function as the 'selector' 
// option, if you prefer to write your own autocompletion logic.
// In that case, the other options above will not apply unless
// you support them.

Autocompleter.Local = Class.create();
Autocompleter.Local.prototype = Object.extend(new Autocompleter.Base(), {
  initialize: function(element, update, array, options) {
    this.baseInitialize(element, update, options);
    this.options.array = array;
  },

  getUpdatedChoices: function() {
    this.updateChoices(this.options.selector(this));
  },

  setOptions: function(options) {
    this.options = Object.extend({
      choices: 10,
      partialSearch: true,
      partialChars: 2,
      ignoreCase: true,
      fullSearch: false,
      selector: function(instance) {
        var ret       = []; // Beginning matches
        var partial   = []; // Inside matches
        var entry     = instance.getToken();
        var count     = 0;

        for (var i = 0; i < instance.options.array.length &&  
          ret.length < instance.options.choices ; i++) { 

          var elem = instance.options.array[i];
          var foundPos = instance.options.ignoreCase ? 
            elem.toLowerCase().indexOf(entry.toLowerCase()) : 
            elem.indexOf(entry);

          while (foundPos != -1) {
            if (foundPos == 0 && elem.length != entry.length) { 
              ret.push("<li><strong>" + elem.substr(0, entry.length) + "</strong>" + 
                elem.substr(entry.length) + "</li>");
              break;
            } else if (entry.length >= instance.options.partialChars && 
              instance.options.partialSearch && foundPos != -1) {
              if (instance.options.fullSearch || /\s/.test(elem.substr(foundPos-1,1))) {
                partial.push("<li>" + elem.substr(0, foundPos) + "<strong>" +
                  elem.substr(foundPos, entry.length) + "</strong>" + elem.substr(
                  foundPos + entry.length) + "</li>");
                break;
              }
            }

            foundPos = instance.options.ignoreCase ? 
              elem.toLowerCase().indexOf(entry.toLowerCase(), foundPos + 1) : 
              elem.indexOf(entry, foundPos + 1);

          }
        }
        if (partial.length)
          ret = ret.concat(partial.slice(0, instance.options.choices - ret.length))
        return "<ul>" + ret.join('') + "</ul>";
      }
    }, options || {});
  }
});

// AJAX in-place editor
//
// see documentation on http://wiki.script.aculo.us/scriptaculous/show/Ajax.InPlaceEditor

// Use this if you notice weird scrolling problems on some browsers,
// the DOM might be a bit confused when this gets called so do this
// waits 1 ms (with setTimeout) until it does the activation
Field.scrollFreeActivate = function(field) {
  setTimeout(function() {
    Field.activate(field);
  }, 1);
}

Ajax.InPlaceEditor = Class.create();
Ajax.InPlaceEditor.defaultHighlightColor = "#FFFF99";
Ajax.InPlaceEditor.prototype = {
  initialize: function(element, url, options) {
    this.url = url;
    this.element = $(element);

    this.options = Object.extend({
      paramName: "value",
      okButton: true,
      okLink: false,
      okText: "ok",
      cancelButton: false,
      cancelLink: true,
      cancelText: "cancel",
      textBeforeControls: '',
      textBetweenControls: '',
      textAfterControls: '',
      savingText: "Saving...",
      clickToEditText: "Click to edit",
      okText: "ok",
      rows: 1,
      onComplete: function(transport, element) {
        new Effect.Highlight(element, {startcolor: this.options.highlightcolor});
      },
      onFailure: function(transport) {
        alert("Error communicating with the server: " + transport.responseText.stripTags());
      },
      callback: function(form) {
        return Form.serialize(form);
      },
      handleLineBreaks: true,
      loadingText: 'Loading...',
      savingClassName: 'inplaceeditor-saving',
      loadingClassName: 'inplaceeditor-loading',
      formClassName: 'inplaceeditor-form',
      highlightcolor: Ajax.InPlaceEditor.defaultHighlightColor,
      highlightendcolor: "#FFFFFF",
      externalControl: null,
      submitOnBlur: false,
      ajaxOptions: {},
      evalScripts: false
    }, options || {});

    if(!this.options.formId && this.element.id) {
      this.options.formId = this.element.id + "-inplaceeditor";
      if ($(this.options.formId)) {
        // there's already a form with that name, don't specify an id
        this.options.formId = null;
      }
    }
    
    if (this.options.externalControl) {
      this.options.externalControl = $(this.options.externalControl);
    }
    
    this.originalBackground = Element.getStyle(this.element, 'background-color');
    if (!this.originalBackground) {
      this.originalBackground = "transparent";
    }
    
    this.element.title = this.options.clickToEditText;
    
    this.onclickListener = this.enterEditMode.bindAsEventListener(this);
    this.mouseoverListener = this.enterHover.bindAsEventListener(this);
    this.mouseoutListener = this.leaveHover.bindAsEventListener(this);
    Event.observe(this.element, 'click', this.onclickListener);
    Event.observe(this.element, 'mouseover', this.mouseoverListener);
    Event.observe(this.element, 'mouseout', this.mouseoutListener);
    if (this.options.externalControl) {
      Event.observe(this.options.externalControl, 'click', this.onclickListener);
      Event.observe(this.options.externalControl, 'mouseover', this.mouseoverListener);
      Event.observe(this.options.externalControl, 'mouseout', this.mouseoutListener);
    }
  },
  enterEditMode: function(evt) {
    if (this.saving) return;
    if (this.editing) return;
    this.editing = true;
    this.onEnterEditMode();
    if (this.options.externalControl) {
      Element.hide(this.options.externalControl);
    }
    Element.hide(this.element);
    this.createForm();
    this.element.parentNode.insertBefore(this.form, this.element);
    if (!this.options.loadTextURL) Field.scrollFreeActivate(this.editField);
    // stop the event to avoid a page refresh in Safari
    if (evt) {
      Event.stop(evt);
    }
    return false;
  },
  createForm: function() {
    this.form = document.createElement("form");
    this.form.id = this.options.formId;
    Element.addClassName(this.form, this.options.formClassName)
    this.form.onsubmit = this.onSubmit.bind(this);

    this.createEditField();

    if (this.options.textarea) {
      var br = document.createElement("br");
      this.form.appendChild(br);
    }
    
    if (this.options.textBeforeControls)
      this.form.appendChild(document.createTextNode(this.options.textBeforeControls));

    if (this.options.okButton) {
      var okButton = document.createElement("input");
      okButton.type = "submit";
      okButton.value = this.options.okText;
      okButton.className = 'editor_ok_button';
      this.form.appendChild(okButton);
    }
    
    if (this.options.okLink) {
      var okLink = document.createElement("a");
      okLink.href = "#";
      okLink.appendChild(document.createTextNode(this.options.okText));
      okLink.onclick = this.onSubmit.bind(this);
      okLink.className = 'editor_ok_link';
      this.form.appendChild(okLink);
    }
    
    if (this.options.textBetweenControls && 
      (this.options.okLink || this.options.okButton) && 
      (this.options.cancelLink || this.options.cancelButton))
      this.form.appendChild(document.createTextNode(this.options.textBetweenControls));
      
    if (this.options.cancelButton) {
      var cancelButton = document.createElement("input");
      cancelButton.type = "submit";
      cancelButton.value = this.options.cancelText;
      cancelButton.onclick = this.onclickCancel.bind(this);
      cancelButton.className = 'editor_cancel_button';
      this.form.appendChild(cancelButton);
    }

    if (this.options.cancelLink) {
      var cancelLink = document.createElement("a");
      cancelLink.href = "#";
      cancelLink.appendChild(document.createTextNode(this.options.cancelText));
      cancelLink.onclick = this.onclickCancel.bind(this);
      cancelLink.className = 'editor_cancel editor_cancel_link';      
      this.form.appendChild(cancelLink);
    }
    
    if (this.options.textAfterControls)
      this.form.appendChild(document.createTextNode(this.options.textAfterControls));
  },
  hasHTMLLineBreaks: function(string) {
    if (!this.options.handleLineBreaks) return false;
    return string.match(/<br/i) || string.match(/<p>/i);
  },
  convertHTMLLineBreaks: function(string) {
    return string.replace(/<br>/gi, "\n").replace(/<br\/>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<p>/gi, "");
  },
  createEditField: function() {
    var text;
    if(this.options.loadTextURL) {
      text = this.options.loadingText;
    } else {
      text = this.getText();
    }

    var obj = this;
    
    if (this.options.rows == 1 && !this.hasHTMLLineBreaks(text)) {
      this.options.textarea = false;
      var textField = document.createElement("input");
      textField.obj = this;
      textField.type = "text";
      textField.name = this.options.paramName;
      textField.value = text;
      textField.style.backgroundColor = this.options.highlightcolor;
      textField.className = 'editor_field';
      var size = this.options.size || this.options.cols || 0;
      if (size != 0) textField.size = size;
      if (this.options.submitOnBlur)
        textField.onblur = this.onSubmit.bind(this);
      this.editField = textField;
    } else {
      this.options.textarea = true;
      var textArea = document.createElement("textarea");
      textArea.obj = this;
      textArea.name = this.options.paramName;
      textArea.value = this.convertHTMLLineBreaks(text);
      textArea.rows = this.options.rows;
      textArea.cols = this.options.cols || 40;
      textArea.className = 'editor_field';      
      if (this.options.submitOnBlur)
        textArea.onblur = this.onSubmit.bind(this);
      this.editField = textArea;
    }
    
    if(this.options.loadTextURL) {
      this.loadExternalText();
    }
    this.form.appendChild(this.editField);
  },
  getText: function() {
    return this.element.innerHTML;
  },
  loadExternalText: function() {
    Element.addClassName(this.form, this.options.loadingClassName);
    this.editField.disabled = true;
    new Ajax.Request(
      this.options.loadTextURL,
      Object.extend({
        asynchronous: true,
        onComplete: this.onLoadedExternalText.bind(this)
      }, this.options.ajaxOptions)
    );
  },
  onLoadedExternalText: function(transport) {
    Element.removeClassName(this.form, this.options.loadingClassName);
    this.editField.disabled = false;
    this.editField.value = transport.responseText.stripTags();
    Field.scrollFreeActivate(this.editField);
  },
  onclickCancel: function() {
    this.onComplete();
    this.leaveEditMode();
    return false;
  },
  onFailure: function(transport) {
    this.options.onFailure(transport);
    if (this.oldInnerHTML) {
      this.element.innerHTML = this.oldInnerHTML;
      this.oldInnerHTML = null;
    }
    return false;
  },
  onSubmit: function() {
    // onLoading resets these so we need to save them away for the Ajax call
    var form = this.form;
    var value = this.editField.value;
    
    // do this first, sometimes the ajax call returns before we get a chance to switch on Saving...
    // which means this will actually switch on Saving... *after* we've left edit mode causing Saving...
    // to be displayed indefinitely
    this.onLoading();
    
    if (this.options.evalScripts) {
      new Ajax.Request(
        this.url, Object.extend({
          parameters: this.options.callback(form, value),
          onComplete: this.onComplete.bind(this),
          onFailure: this.onFailure.bind(this),
          asynchronous:true, 
          evalScripts:true
        }, this.options.ajaxOptions));
    } else  {
      new Ajax.Updater(
        { success: this.element,
          // don't update on failure (this could be an option)
          failure: null }, 
        this.url, Object.extend({
          parameters: this.options.callback(form, value),
          onComplete: this.onComplete.bind(this),
          onFailure: this.onFailure.bind(this)
        }, this.options.ajaxOptions));
    }
    // stop the event to avoid a page refresh in Safari
    if (arguments.length > 1) {
      Event.stop(arguments[0]);
    }
    return false;
  },
  onLoading: function() {
    this.saving = true;
    this.removeForm();
    this.leaveHover();
    this.showSaving();
  },
  showSaving: function() {
    this.oldInnerHTML = this.element.innerHTML;
    this.element.innerHTML = this.options.savingText;
    Element.addClassName(this.element, this.options.savingClassName);
    this.element.style.backgroundColor = this.originalBackground;
    Element.show(this.element);
  },
  removeForm: function() {
    if(this.form) {
      if (this.form.parentNode) Element.remove(this.form);
      this.form = null;
    }
  },
  enterHover: function() {
    if (this.saving) return;
    this.element.style.backgroundColor = this.options.highlightcolor;
    if (this.effect) {
      this.effect.cancel();
    }
    Element.addClassName(this.element, this.options.hoverClassName)
  },
  leaveHover: function() {
    if (this.options.backgroundColor) {
      this.element.style.backgroundColor = this.oldBackground;
    }
    Element.removeClassName(this.element, this.options.hoverClassName)
    if (this.saving) return;
    this.effect = new Effect.Highlight(this.element, {
      startcolor: this.options.highlightcolor,
      endcolor: this.options.highlightendcolor,
      restorecolor: this.originalBackground
    });
  },
  leaveEditMode: function() {
    Element.removeClassName(this.element, this.options.savingClassName);
    this.removeForm();
    this.leaveHover();
    this.element.style.backgroundColor = this.originalBackground;
    Element.show(this.element);
    if (this.options.externalControl) {
      Element.show(this.options.externalControl);
    }
    this.editing = false;
    this.saving = false;
    this.oldInnerHTML = null;
    this.onLeaveEditMode();
  },
  onComplete: function(transport) {
    this.leaveEditMode();
    this.options.onComplete.bind(this)(transport, this.element);
  },
  onEnterEditMode: function() {},
  onLeaveEditMode: function() {},
  dispose: function() {
    if (this.oldInnerHTML) {
      this.element.innerHTML = this.oldInnerHTML;
    }
    this.leaveEditMode();
    Event.stopObserving(this.element, 'click', this.onclickListener);
    Event.stopObserving(this.element, 'mouseover', this.mouseoverListener);
    Event.stopObserving(this.element, 'mouseout', this.mouseoutListener);
    if (this.options.externalControl) {
      Event.stopObserving(this.options.externalControl, 'click', this.onclickListener);
      Event.stopObserving(this.options.externalControl, 'mouseover', this.mouseoverListener);
      Event.stopObserving(this.options.externalControl, 'mouseout', this.mouseoutListener);
    }
  }
};

Ajax.InPlaceCollectionEditor = Class.create();
Object.extend(Ajax.InPlaceCollectionEditor.prototype, Ajax.InPlaceEditor.prototype);
Object.extend(Ajax.InPlaceCollectionEditor.prototype, {
  createEditField: function() {
    if (!this.cached_selectTag) {
      var selectTag = document.createElement("select");
      var collection = this.options.collection || [];
      var optionTag;
      collection.each(function(e,i) {
        optionTag = document.createElement("option");
        optionTag.value = (e instanceof Array) ? e[0] : e;
        if((typeof this.options.value == 'undefined') && 
          ((e instanceof Array) ? this.element.innerHTML == e[1] : e == optionTag.value)) optionTag.selected = true;
        if(this.options.value==optionTag.value) optionTag.selected = true;
        optionTag.appendChild(document.createTextNode((e instanceof Array) ? e[1] : e));
        selectTag.appendChild(optionTag);
      }.bind(this));
      this.cached_selectTag = selectTag;
    }

    this.editField = this.cached_selectTag;
    if(this.options.loadTextURL) this.loadExternalText();
    this.form.appendChild(this.editField);
    this.options.callback = function(form, value) {
      return "value=" + encodeURIComponent(value);
    }
  }
});

// Delayed observer, like Form.Element.Observer, 
// but waits for delay after last key input
// Ideal for live-search fields

Form.Element.DelayedObserver = Class.create();
Form.Element.DelayedObserver.prototype = {
  initialize: function(element, delay, callback) {
    this.delay     = delay || 0.5;
    this.element   = $(element);
    this.callback  = callback;
    this.timer     = null;
    this.lastValue = $F(this.element); 
    Event.observe(this.element,'keyup',this.delayedListener.bindAsEventListener(this));
  },
  delayedListener: function(event) {
    if(this.lastValue == $F(this.element)) return;
    if(this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(this.onTimerEvent.bind(this), this.delay * 1000);
    this.lastValue = $F(this.element);
  },
  onTimerEvent: function() {
    this.timer = null;
    this.callback(this.element, $F(this.element));
  }
};



/***************************************************
 * library/scriptaculous/slider.js
 ***************************************************/

// Copyright (c) 2005-2007 Marty Haught, Thomas Fuchs 
//
// script.aculo.us is freely distributable under the terms of an MIT-style license.
// For details, see the script.aculo.us web site: http://script.aculo.us/

if(!Control) var Control = {};
Control.Slider = Class.create();

// options:
//  axis: 'vertical', or 'horizontal' (default)
//
// callbacks:
//  onChange(value)
//  onSlide(value)
Control.Slider.prototype = {
  initialize: function(handle, track, options) {
    var slider = this;
    
    if(handle instanceof Array) {
      this.handles = handle.collect( function(e) { return $(e) });
    } else {
      this.handles = [$(handle)];
    }
    
    this.track   = $(track);
    this.options = options || {};

    this.axis      = this.options.axis || 'horizontal';
    this.increment = this.options.increment || 1;
    this.step      = parseInt(this.options.step || '1');
    this.range     = this.options.range || $R(0,1);
    
    this.value     = 0; // assure backwards compat
    this.values    = this.handles.map( function() { return 0 });
    this.spans     = this.options.spans ? this.options.spans.map(function(s){ return $(s) }) : false;
    this.options.startSpan = $(this.options.startSpan || null);
    this.options.endSpan   = $(this.options.endSpan || null);

    this.restricted = this.options.restricted || false;

    this.maximum   = this.options.maximum || this.range.end;
    this.minimum   = this.options.minimum || this.range.start;

    // Will be used to align the handle onto the track, if necessary
    this.alignX = parseInt(this.options.alignX || '0');
    this.alignY = parseInt(this.options.alignY || '0');
    
    this.trackLength = this.maximumOffset() - this.minimumOffset();

    this.handleLength = this.isVertical() ? 
      (this.handles[0].offsetHeight != 0 ? 
        this.handles[0].offsetHeight : this.handles[0].style.height.replace(/px$/,"")) : 
      (this.handles[0].offsetWidth != 0 ? this.handles[0].offsetWidth : 
        this.handles[0].style.width.replace(/px$/,""));

    this.active   = false;
    this.dragging = false;
    this.disabled = false;

    if(this.options.disabled) this.setDisabled();

    // Allowed values array
    this.allowedValues = this.options.values ? this.options.values.sortBy(Prototype.K) : false;
    if(this.allowedValues) {
      this.minimum = this.allowedValues.min();
      this.maximum = this.allowedValues.max();
    }

    this.eventMouseDown = this.startDrag.bindAsEventListener(this);
    this.eventMouseUp   = this.endDrag.bindAsEventListener(this);
    this.eventMouseMove = this.update.bindAsEventListener(this);

    // Initialize handles in reverse (make sure first handle is active)
    this.handles.each( function(h,i) {
      i = slider.handles.length-1-i;
      slider.setValue(parseFloat(
        (slider.options.sliderValue instanceof Array ? 
          slider.options.sliderValue[i] : slider.options.sliderValue) || 
         slider.range.start), i);
      Element.makePositioned(h); // fix IE
      Event.observe(h, "mousedown", slider.eventMouseDown);
    });
    
    Event.observe(this.track, "mousedown", this.eventMouseDown);
    Event.observe(document, "mouseup", this.eventMouseUp);
    Event.observe(document, "mousemove", this.eventMouseMove);
    
    this.initialized = true;
  },
  dispose: function() {
    var slider = this;    
    Event.stopObserving(this.track, "mousedown", this.eventMouseDown);
    Event.stopObserving(document, "mouseup", this.eventMouseUp);
    Event.stopObserving(document, "mousemove", this.eventMouseMove);
    this.handles.each( function(h) {
      Event.stopObserving(h, "mousedown", slider.eventMouseDown);
    });
  },
  setDisabled: function(){
    this.disabled = true;
  },
  setEnabled: function(){
    this.disabled = false;
  },  
  getNearestValue: function(value){
    if(this.allowedValues){
      if(value >= this.allowedValues.max()) return(this.allowedValues.max());
      if(value <= this.allowedValues.min()) return(this.allowedValues.min());
      
      var offset = Math.abs(this.allowedValues[0] - value);
      var newValue = this.allowedValues[0];
      this.allowedValues.each( function(v) {
        var currentOffset = Math.abs(v - value);
        if(currentOffset <= offset){
          newValue = v;
          offset = currentOffset;
        } 
      });
      return newValue;
    }
    if(value > this.range.end) return this.range.end;
    if(value < this.range.start) return this.range.start;
    return value;
  },
  setValue: function(sliderValue, handleIdx){
    if(!this.active) {
      this.activeHandleIdx = handleIdx || 0;
      this.activeHandle    = this.handles[this.activeHandleIdx];
      this.updateStyles();
    }
    handleIdx = handleIdx || this.activeHandleIdx || 0;
    if(this.initialized && this.restricted) {
      if((handleIdx>0) && (sliderValue<this.values[handleIdx-1]))
        sliderValue = this.values[handleIdx-1];
      if((handleIdx < (this.handles.length-1)) && (sliderValue>this.values[handleIdx+1]))
        sliderValue = this.values[handleIdx+1];
    }
    sliderValue = this.getNearestValue(sliderValue);
    this.values[handleIdx] = sliderValue;
    this.value = this.values[0]; // assure backwards compat
    
    this.handles[handleIdx].style[this.isVertical() ? 'top' : 'left'] = 
      this.translateToPx(sliderValue);
    
    this.drawSpans();
    if(!this.dragging || !this.event) this.updateFinished();
  },
  setValueBy: function(delta, handleIdx) {
    this.setValue(this.values[handleIdx || this.activeHandleIdx || 0] + delta, 
      handleIdx || this.activeHandleIdx || 0);
  },
  translateToPx: function(value) {
    return Math.round(
      ((this.trackLength-this.handleLength)/(this.range.end-this.range.start)) * 
      (value - this.range.start)) + "px";
  },
  translateToValue: function(offset) {
    return ((offset/(this.trackLength-this.handleLength) * 
      (this.range.end-this.range.start)) + this.range.start);
  },
  getRange: function(range) {
    var v = this.values.sortBy(Prototype.K); 
    range = range || 0;
    return $R(v[range],v[range+1]);
  },
  minimumOffset: function(){
    return(this.isVertical() ? this.alignY : this.alignX);
  },
  maximumOffset: function(){
    return(this.isVertical() ? 
      (this.track.offsetHeight != 0 ? this.track.offsetHeight :
        this.track.style.height.replace(/px$/,"")) - this.alignY : 
      (this.track.offsetWidth != 0 ? this.track.offsetWidth : 
        this.track.style.width.replace(/px$/,"")) - this.alignY);
  },  
  isVertical:  function(){
    return (this.axis == 'vertical');
  },
  drawSpans: function() {
    var slider = this;
    if(this.spans)
      $R(0, this.spans.length-1).each(function(r) { slider.setSpan(slider.spans[r], slider.getRange(r)) });
    if(this.options.startSpan)
      this.setSpan(this.options.startSpan,
        $R(0, this.values.length>1 ? this.getRange(0).min() : this.value ));
    if(this.options.endSpan)
      this.setSpan(this.options.endSpan, 
        $R(this.values.length>1 ? this.getRange(this.spans.length-1).max() : this.value, this.maximum));
  },
  setSpan: function(span, range) {
    if(this.isVertical()) {
      span.style.top = this.translateToPx(range.start);
      span.style.height = this.translateToPx(range.end - range.start + this.range.start);
    } else {
      span.style.left = this.translateToPx(range.start);
      span.style.width = this.translateToPx(range.end - range.start + this.range.start);
    }
  },
  updateStyles: function() {
    this.handles.each( function(h){ Element.removeClassName(h, 'selected') });
    Element.addClassName(this.activeHandle, 'selected');
  },
  startDrag: function(event) {
    if(Event.isLeftClick(event)) {
      if(!this.disabled){
        this.active = true;
        
        var handle = Event.element(event);
        var pointer  = [Event.pointerX(event), Event.pointerY(event)];
        var track = handle;
        if(track==this.track) {
          var offsets  = Position.cumulativeOffset(this.track); 
          this.event = event;
          this.setValue(this.translateToValue( 
           (this.isVertical() ? pointer[1]-offsets[1] : pointer[0]-offsets[0])-(this.handleLength/2)
          ));
          var offsets  = Position.cumulativeOffset(this.activeHandle);
          this.offsetX = (pointer[0] - offsets[0]);
          this.offsetY = (pointer[1] - offsets[1]);
        } else {
          // find the handle (prevents issues with Safari)
          while((this.handles.indexOf(handle) == -1) && handle.parentNode) 
            handle = handle.parentNode;
            
          if(this.handles.indexOf(handle)!=-1) {
            this.activeHandle    = handle;
            this.activeHandleIdx = this.handles.indexOf(this.activeHandle);
            this.updateStyles();
            
            var offsets  = Position.cumulativeOffset(this.activeHandle);
            this.offsetX = (pointer[0] - offsets[0]);
            this.offsetY = (pointer[1] - offsets[1]);
          }
        }
      }
      Event.stop(event);
    }
  },
  update: function(event) {
   if(this.active) {
      if(!this.dragging) this.dragging = true;
      this.draw(event);
      if(Prototype.Browser.WebKit) window.scrollBy(0,0);
      Event.stop(event);
   }
  },
  draw: function(event) {
    var pointer = [Event.pointerX(event), Event.pointerY(event)];
    var offsets = Position.cumulativeOffset(this.track);
    pointer[0] -= this.offsetX + offsets[0];
    pointer[1] -= this.offsetY + offsets[1];
    this.event = event;
    this.setValue(this.translateToValue( this.isVertical() ? pointer[1] : pointer[0] ));
    if(this.initialized && this.options.onSlide)
      this.options.onSlide(this.values.length>1 ? this.values : this.value, this);
  },
  endDrag: function(event) {
    if(this.active && this.dragging) {
      this.finishDrag(event, true);
      Event.stop(event);
    }
    this.active = false;
    this.dragging = false;
  },  
  finishDrag: function(event, success) {
    this.active = false;
    this.dragging = false;
    this.updateFinished();
  },
  updateFinished: function() {
    if(this.initialized && this.options.onChange) 
      this.options.onChange(this.values.length>1 ? this.values : this.value, this);
    this.event = null;
  }
}


/***************************************************
 * library/scriptaculous/dragdrop.js
 ***************************************************/

// Copyright (c) 2005-2007 Thomas Fuchs (http://script.aculo.us, http://mir.aculo.us)
//           (c) 2005-2007 Sammi Williams (http://www.oriontransfer.co.nz, sammi@oriontransfer.co.nz)
// 
// script.aculo.us is freely distributable under the terms of an MIT-style license.
// For details, see the script.aculo.us web site: http://script.aculo.us/

if(typeof Effect == 'undefined')
  throw("dragdrop.js requires including script.aculo.us' effects.js library");

var Droppables = {
  drops: [],

  remove: function(element) {
    this.drops = this.drops.reject(function(d) { return d.element==$(element) });
  },

  add: function(element) {
    element = $(element);
    var options = Object.extend({
      greedy:     true,
      hoverclass: null,
      tree:       false
    }, arguments[1] || {});

    // cache containers
    if(options.containment) {
      options._containers = [];
      var containment = options.containment;
      if((typeof containment == 'object') && 
        (containment.constructor == Array)) {
        containment.each( function(c) { options._containers.push($(c)) });
      } else {
        options._containers.push($(containment));
      }
    }
    
    if(options.accept) options.accept = [options.accept].flatten();

    Element.makePositioned(element); // fix IE
    options.element = element;

    this.drops.push(options);
  },
  
  findDeepestChild: function(drops) {
    deepest = drops[0];
      
    for (i = 1; i < drops.length; ++i)
      if (Element.isParent(drops[i].element, deepest.element))
        deepest = drops[i];
    
    return deepest;
  },

  isContained: function(element, drop) {
    var containmentNode;
    if(drop.tree) {
      containmentNode = element.treeNode; 
    } else {
      containmentNode = element.parentNode;
    }
    return drop._containers.detect(function(c) { return containmentNode == c });
  },
  
  isAffected: function(point, element, drop) {
    return (
      (drop.element!=element) &&
      ((!drop._containers) ||
        this.isContained(element, drop)) &&
      ((!drop.accept) ||
        (Element.classNames(element).detect( 
          function(v) { return drop.accept.include(v) } ) )) &&
      Position.within(drop.element, point[0], point[1]) );
  },

  deactivate: function(drop) {
    if(drop.hoverclass)
      Element.removeClassName(drop.element, drop.hoverclass);
    this.last_active = null;
  },

  activate: function(drop) {
    if(drop.hoverclass)
      Element.addClassName(drop.element, drop.hoverclass);
    this.last_active = drop;
  },

  show: function(point, element) {
    if(!this.drops.length) return;
    var affected = [];
    
    if(this.last_active) this.deactivate(this.last_active);
    this.drops.each( function(drop) {
      if(Droppables.isAffected(point, element, drop))
        affected.push(drop);
    });
        
    if(affected.length>0) {
      drop = Droppables.findDeepestChild(affected);
      Position.within(drop.element, point[0], point[1]);
      if(drop.onHover)
        drop.onHover(element, drop.element, Position.overlap(drop.overlap, drop.element));
      
      Droppables.activate(drop);
    }
  },

  fire: function(event, element) {
    if(!this.last_active) return;
    Position.prepare();

    if (this.isAffected([Event.pointerX(event), Event.pointerY(event)], element, this.last_active))
      if (this.last_active.onDrop) {
        this.last_active.onDrop(element, this.last_active.element, event); 
        return true; 
      }
  },

  reset: function() {
    if(this.last_active)
      this.deactivate(this.last_active);
  }
}

var Draggables = {
  drags: [],
  observers: [],
  
  register: function(draggable) {
    if(this.drags.length == 0) {
      this.eventMouseUp   = this.endDrag.bindAsEventListener(this);
      this.eventMouseMove = this.updateDrag.bindAsEventListener(this);
      this.eventKeypress  = this.keyPress.bindAsEventListener(this);
      
      Event.observe(document, "mouseup", this.eventMouseUp);
      Event.observe(document, "mousemove", this.eventMouseMove);
      Event.observe(document, "keypress", this.eventKeypress);
    }
    this.drags.push(draggable);
  },
  
  unregister: function(draggable) {
    this.drags = this.drags.reject(function(d) { return d==draggable });
    if(this.drags.length == 0) {
      Event.stopObserving(document, "mouseup", this.eventMouseUp);
      Event.stopObserving(document, "mousemove", this.eventMouseMove);
      Event.stopObserving(document, "keypress", this.eventKeypress);
    }
  },
  
  activate: function(draggable) {
    if(draggable.options.delay) { 
      this._timeout = setTimeout(function() { 
        Draggables._timeout = null; 
        window.focus(); 
        Draggables.activeDraggable = draggable; 
      }.bind(this), draggable.options.delay); 
    } else {
      window.focus(); // allows keypress events if window isn't currently focused, fails for Safari
      this.activeDraggable = draggable;
    }
  },
  
  deactivate: function() {
    this.activeDraggable = null;
  },
  
  updateDrag: function(event) {
    if(!this.activeDraggable) return;
    var pointer = [Event.pointerX(event), Event.pointerY(event)];
    // Mozilla-based browsers fire successive mousemove events with
    // the same coordinates, prevent needless redrawing (moz bug?)
    if(this._lastPointer && (this._lastPointer.inspect() == pointer.inspect())) return;
    this._lastPointer = pointer;
    
    this.activeDraggable.updateDrag(event, pointer);
  },
  
  endDrag: function(event) {
    if(this._timeout) { 
      clearTimeout(this._timeout); 
      this._timeout = null; 
    }
    if(!this.activeDraggable) return;
    this._lastPointer = null;
    this.activeDraggable.endDrag(event);
    this.activeDraggable = null;
  },
  
  keyPress: function(event) {
    if(this.activeDraggable)
      this.activeDraggable.keyPress(event);
  },
  
  addObserver: function(observer) {
    this.observers.push(observer);
    this._cacheObserverCallbacks();
  },
  
  removeObserver: function(element) {  // element instead of observer fixes mem leaks
    this.observers = this.observers.reject( function(o) { return o.element==element });
    this._cacheObserverCallbacks();
  },
  
  notify: function(eventName, draggable, event) {  // 'onStart', 'onEnd', 'onDrag'
    if(this[eventName+'Count'] > 0)
      this.observers.each( function(o) {
        if(o[eventName]) o[eventName](eventName, draggable, event);
      });
    if(draggable.options[eventName]) draggable.options[eventName](draggable, event);
  },
  
  _cacheObserverCallbacks: function() {
    ['onStart','onEnd','onDrag'].each( function(eventName) {
      Draggables[eventName+'Count'] = Draggables.observers.select(
        function(o) { return o[eventName]; }
      ).length;
    });
  }
}

/*--------------------------------------------------------------------------*/

var Draggable = Class.create();
Draggable._dragging    = {};

Draggable.prototype = {
  initialize: function(element) {
    var defaults = {
      handle: false,
      reverteffect: function(element, top_offset, left_offset) {
        var dur = Math.sqrt(Math.abs(top_offset^2)+Math.abs(left_offset^2))*0.02;
        new Effect.Move(element, { x: -left_offset, y: -top_offset, duration: dur,
          queue: {scope:'_draggable', position:'end'}
        });
      },
      endeffect: function(element) {
        var toOpacity = typeof element._opacity == 'number' ? element._opacity : 1.0;
        new Effect.Opacity(element, {duration:0.2, from:0.7, to:toOpacity, 
          queue: {scope:'_draggable', position:'end'},
          afterFinish: function(){ 
            Draggable._dragging[element] = false 
          }
        }); 
      },
      zindex: 1000,
      revert: false,
      quiet: false,
      scroll: false,
      scrollSensitivity: 20,
      scrollSpeed: 15,
      snap: false,  // false, or xy or [x,y] or function(x,y){ return [x,y] }
      delay: 0
    };
    
    if(!arguments[1] || typeof arguments[1].endeffect == 'undefined')
      Object.extend(defaults, {
        starteffect: function(element) {
          element._opacity = Element.getOpacity(element);
          Draggable._dragging[element] = true;
          new Effect.Opacity(element, {duration:0.2, from:element._opacity, to:0.7}); 
        }
      });
    
    var options = Object.extend(defaults, arguments[1] || {});

    this.element = $(element);
    
    if(options.handle && (typeof options.handle == 'string'))
      this.handle = this.element.down('.'+options.handle, 0);
    
    if(!this.handle) this.handle = $(options.handle);
    if(!this.handle) this.handle = this.element;
    
    if(options.scroll && !options.scroll.scrollTo && !options.scroll.outerHTML) {
      options.scroll = $(options.scroll);
      this._isScrollChild = Element.childOf(this.element, options.scroll);
    }

    Element.makePositioned(this.element); // fix IE    

    this.delta    = this.currentDelta();
    this.options  = options;
    this.dragging = false;   

    this.eventMouseDown = this.initDrag.bindAsEventListener(this);
    Event.observe(this.handle, "mousedown", this.eventMouseDown);
    
    Draggables.register(this);
  },
  
  destroy: function() {
    Event.stopObserving(this.handle, "mousedown", this.eventMouseDown);
    Draggables.unregister(this);
  },
  
  currentDelta: function() {
    return([
      parseInt(Element.getStyle(this.element,'left') || '0'),
      parseInt(Element.getStyle(this.element,'top') || '0')]);
  },
  
  initDrag: function(event) {
    if(typeof Draggable._dragging[this.element] != 'undefined' &&
      Draggable._dragging[this.element]) return;
    if(Event.isLeftClick(event)) {    
      // abort on form elements, fixes a Firefox issue
      var src = Event.element(event);
      if((tag_name = src.tagName.toUpperCase()) && (
        tag_name=='INPUT' ||
        tag_name=='SELECT' ||
        tag_name=='OPTION' ||
        tag_name=='BUTTON' ||
        tag_name=='TEXTAREA')) return;
        
      var pointer = [Event.pointerX(event), Event.pointerY(event)];
      var pos     = Position.cumulativeOffset(this.element);
      this.offset = [0,1].map( function(i) { return (pointer[i] - pos[i]) });
      
      Draggables.activate(this);
      Event.stop(event);
    }
  },
  
  startDrag: function(event) {
    this.dragging = true;
    
    if(this.options.zindex) {
      this.originalZ = parseInt(Element.getStyle(this.element,'z-index') || 0);
      this.element.style.zIndex = this.options.zindex;
    }
    
    if(this.options.ghosting) {
      this._clone = this.element.cloneNode(true);
      this.element._originallyAbsolute = (this.element.getStyle('position') == 'absolute');
      if (!this.element._originallyAbsolute)
        Position.absolutize(this.element);
      this.element.parentNode.insertBefore(this._clone, this.element);
    }
    
    if(this.options.scroll) {
      if (this.options.scroll == window) {
        var where = this._getWindowScroll(this.options.scroll);
        this.originalScrollLeft = where.left;
        this.originalScrollTop = where.top;
      } else {
        this.originalScrollLeft = this.options.scroll.scrollLeft;
        this.originalScrollTop = this.options.scroll.scrollTop;
      }
    }
    
    Draggables.notify('onStart', this, event);
        
    if(this.options.starteffect) this.options.starteffect(this.element);
  },
  
  updateDrag: function(event, pointer) {
    if(!this.dragging) this.startDrag(event);
    
    if(!this.options.quiet){
      Position.prepare();
      Droppables.show(pointer, this.element);
    }
    
    Draggables.notify('onDrag', this, event);
    
    this.draw(pointer);
    if(this.options.change) this.options.change(this);
    
    if(this.options.scroll) {
      this.stopScrolling();
      
      var p;
      if (this.options.scroll == window) {
        with(this._getWindowScroll(this.options.scroll)) { p = [ left, top, left+width, top+height ]; }
      } else {
        p = Position.page(this.options.scroll);
        p[0] += this.options.scroll.scrollLeft + Position.deltaX;
        p[1] += this.options.scroll.scrollTop + Position.deltaY;
        p.push(p[0]+this.options.scroll.offsetWidth);
        p.push(p[1]+this.options.scroll.offsetHeight);
      }
      var speed = [0,0];
      if(pointer[0] < (p[0]+this.options.scrollSensitivity)) speed[0] = pointer[0]-(p[0]+this.options.scrollSensitivity);
      if(pointer[1] < (p[1]+this.options.scrollSensitivity)) speed[1] = pointer[1]-(p[1]+this.options.scrollSensitivity);
      if(pointer[0] > (p[2]-this.options.scrollSensitivity)) speed[0] = pointer[0]-(p[2]-this.options.scrollSensitivity);
      if(pointer[1] > (p[3]-this.options.scrollSensitivity)) speed[1] = pointer[1]-(p[3]-this.options.scrollSensitivity);
      this.startScrolling(speed);
    }
    
    // fix AppleWebKit rendering
    if(Prototype.Browser.WebKit) window.scrollBy(0,0);
    
    Event.stop(event);
  },
  
  finishDrag: function(event, success) {
    this.dragging = false;
    
    if(this.options.quiet){
      Position.prepare();
      var pointer = [Event.pointerX(event), Event.pointerY(event)];
      Droppables.show(pointer, this.element);
    }

    if(this.options.ghosting) {
      if (!this.element._originallyAbsolute)
        Position.relativize(this.element);
      delete this.element._originallyAbsolute;
      Element.remove(this._clone);
      this._clone = null;
    }

    var dropped = false; 
    if(success) { 
      dropped = Droppables.fire(event, this.element); 
      if (!dropped) dropped = false; 
    }
    if(dropped && this.options.onDropped) this.options.onDropped(this.element);
    Draggables.notify('onEnd', this, event);

    var revert = this.options.revert;
    if(revert && typeof revert == 'function') revert = revert(this.element);
    
    var d = this.currentDelta();
    if(revert && this.options.reverteffect) {
      if (dropped == 0 || revert != 'failure')
        this.options.reverteffect(this.element,
          d[1]-this.delta[1], d[0]-this.delta[0]);
    } else {
      this.delta = d;
    }

    if(this.options.zindex)
      this.element.style.zIndex = this.originalZ;

    if(this.options.endeffect) 
      this.options.endeffect(this.element);
      
    Draggables.deactivate(this);
    Droppables.reset();
  },
  
  keyPress: function(event) {
    if(event.keyCode!=Event.KEY_ESC) return;
    this.finishDrag(event, false);
    Event.stop(event);
  },
  
  endDrag: function(event) {
    if(!this.dragging) return;
    this.stopScrolling();
    this.finishDrag(event, true);
    Event.stop(event);
  },
  
  draw: function(point) {
    var pos = Position.cumulativeOffset(this.element);
    if(this.options.ghosting) {
      var r   = Position.realOffset(this.element);
      pos[0] += r[0] - Position.deltaX; pos[1] += r[1] - Position.deltaY;
    }
    
    var d = this.currentDelta();
    pos[0] -= d[0]; pos[1] -= d[1];
    
    if(this.options.scroll && (this.options.scroll != window && this._isScrollChild)) {
      pos[0] -= this.options.scroll.scrollLeft-this.originalScrollLeft;
      pos[1] -= this.options.scroll.scrollTop-this.originalScrollTop;
    }
    
    var p = [0,1].map(function(i){ 
      return (point[i]-pos[i]-this.offset[i]) 
    }.bind(this));
    
    if(this.options.snap) {
      if(typeof this.options.snap == 'function') {
        p = this.options.snap(p[0],p[1],this);
      } else {
      if(this.options.snap instanceof Array) {
        p = p.map( function(v, i) {
          return Math.round(v/this.options.snap[i])*this.options.snap[i] }.bind(this))
      } else {
        p = p.map( function(v) {
          return Math.round(v/this.options.snap)*this.options.snap }.bind(this))
      }
    }}
    
    var style = this.element.style;
    if((!this.options.constraint) || (this.options.constraint=='horizontal'))
      style.left = p[0] + "px";
    if((!this.options.constraint) || (this.options.constraint=='vertical'))
      style.top  = p[1] + "px";
    
    if(style.visibility=="hidden") style.visibility = ""; // fix gecko rendering
  },
  
  stopScrolling: function() {
    if(this.scrollInterval) {
      clearInterval(this.scrollInterval);
      this.scrollInterval = null;
      Draggables._lastScrollPointer = null;
    }
  },
  
  startScrolling: function(speed) {
    if(!(speed[0] || speed[1])) return;
    this.scrollSpeed = [speed[0]*this.options.scrollSpeed,speed[1]*this.options.scrollSpeed];
    this.lastScrolled = new Date();
    this.scrollInterval = setInterval(this.scroll.bind(this), 10);
  },
  
  scroll: function() {
    var current = new Date();
    var delta = current - this.lastScrolled;
    this.lastScrolled = current;
    if(this.options.scroll == window) {
      with (this._getWindowScroll(this.options.scroll)) {
        if (this.scrollSpeed[0] || this.scrollSpeed[1]) {
          var d = delta / 1000;
          this.options.scroll.scrollTo( left + d*this.scrollSpeed[0], top + d*this.scrollSpeed[1] );
        }
      }
    } else {
      this.options.scroll.scrollLeft += this.scrollSpeed[0] * delta / 1000;
      this.options.scroll.scrollTop  += this.scrollSpeed[1] * delta / 1000;
    }
    
    Position.prepare();
    Droppables.show(Draggables._lastPointer, this.element);
    Draggables.notify('onDrag', this);
    if (this._isScrollChild) {
      Draggables._lastScrollPointer = Draggables._lastScrollPointer || $A(Draggables._lastPointer);
      Draggables._lastScrollPointer[0] += this.scrollSpeed[0] * delta / 1000;
      Draggables._lastScrollPointer[1] += this.scrollSpeed[1] * delta / 1000;
      if (Draggables._lastScrollPointer[0] < 0)
        Draggables._lastScrollPointer[0] = 0;
      if (Draggables._lastScrollPointer[1] < 0)
        Draggables._lastScrollPointer[1] = 0;
      this.draw(Draggables._lastScrollPointer);
    }
    
    if(this.options.change) this.options.change(this);
  },
  
  _getWindowScroll: function(w) {
    var T, L, W, H;
    with (w.document) {
      if (w.document.documentElement && documentElement.scrollTop) {
        T = documentElement.scrollTop;
        L = documentElement.scrollLeft;
      } else if (w.document.body) {
        T = body.scrollTop;
        L = body.scrollLeft;
      }
      if (w.innerWidth) {
        W = w.innerWidth;
        H = w.innerHeight;
      } else if (w.document.documentElement && documentElement.clientWidth) {
        W = documentElement.clientWidth;
        H = documentElement.clientHeight;
      } else {
        W = body.offsetWidth;
        H = body.offsetHeight
      }
    }
    return { top: T, left: L, width: W, height: H };
  }
}

/*--------------------------------------------------------------------------*/

var SortableObserver = Class.create();
SortableObserver.prototype = {
  initialize: function(element, observer) {
    this.element   = $(element);
    this.observer  = observer;
    this.lastValue = Sortable.serialize(this.element);
  },
  
  onStart: function() {
    this.lastValue = Sortable.serialize(this.element);
  },
  
  onEnd: function() {
    Sortable.unmark();
    if(this.lastValue != Sortable.serialize(this.element))
      this.observer(this.element)
  }
}

var Sortable = {
  SERIALIZE_RULE: /^[^_\-](?:[A-Za-z0-9\-\_]*)[_](.*)$/,
  
  sortables: {},
  
  _findRootElement: function(element) {
    while (element.tagName.toUpperCase() != "BODY") {  
      if(element.id && Sortable.sortables[element.id]) return element;
      element = element.parentNode;
    }
  },

  options: function(element) {
    element = Sortable._findRootElement($(element));
    if(!element) return;
    return Sortable.sortables[element.id];
  },
  
  destroy: function(element){
    var s = Sortable.options(element);
    
    if(s) {
      Draggables.removeObserver(s.element);
      s.droppables.each(function(d){ Droppables.remove(d) });
      s.draggables.invoke('destroy');
      
      delete Sortable.sortables[s.element.id];
    }
  },

  create: function(element) {
    element = $(element);
    var options = Object.extend({ 
      element:     element,
      tag:         'li',       // assumes li children, override with tag: 'tagname'
      dropOnEmpty: false,
      tree:        false,
      treeTag:     'ul',
      overlap:     'vertical', // one of 'vertical', 'horizontal'
      constraint:  'vertical', // one of 'vertical', 'horizontal', false
      containment: element,    // also takes array of elements (or id's); or false
      handle:      false,      // or a CSS class
      only:        false,
      delay:       0,
      hoverclass:  null,
      ghosting:    false,
      quiet:       false, 
      scroll:      false,
      scrollSensitivity: 20,
      scrollSpeed: 15,
      format:      this.SERIALIZE_RULE,
      
      // these take arrays of elements or ids and can be 
      // used for better initialization performance
      elements:    false,
      handles:     false,
      
      onChange:    Prototype.emptyFunction,
      onUpdate:    Prototype.emptyFunction
    }, arguments[1] || {});

    // clear any old sortable with same element
    this.destroy(element);

    // build options for the draggables
    var options_for_draggable = {
      revert:      true,
      quiet:       options.quiet,
      scroll:      options.scroll,
      scrollSpeed: options.scrollSpeed,
      scrollSensitivity: options.scrollSensitivity,
      delay:       options.delay,
      ghosting:    options.ghosting,
      constraint:  options.constraint,
      handle:      options.handle };

    if(options.starteffect)
      options_for_draggable.starteffect = options.starteffect;

    if(options.reverteffect)
      options_for_draggable.reverteffect = options.reverteffect;
    else
      if(options.ghosting) options_for_draggable.reverteffect = function(element) {
        element.style.top  = 0;
        element.style.left = 0;
      };

    if(options.endeffect)
      options_for_draggable.endeffect = options.endeffect;

    if(options.zindex)
      options_for_draggable.zindex = options.zindex;

    // build options for the droppables  
    var options_for_droppable = {
      overlap:     options.overlap,
      containment: options.containment,
      tree:        options.tree,
      hoverclass:  options.hoverclass,
      onHover:     Sortable.onHover
    }
    
    var options_for_tree = {
      onHover:      Sortable.onEmptyHover,
      overlap:      options.overlap,
      containment:  options.containment,
      hoverclass:   options.hoverclass
    }

    // fix for gecko engine
    Element.cleanWhitespace(element); 

    options.draggables = [];
    options.droppables = [];

    // drop on empty handling
    if(options.dropOnEmpty || options.tree) {
      Droppables.add(element, options_for_tree);
      options.droppables.push(element);
    }

    (options.elements || this.findElements(element, options) || []).each( function(e,i) {
      var handle = options.handles ? $(options.handles[i]) :
        (options.handle ? $(e).getElementsByClassName(options.handle)[0] : e); 
      options.draggables.push(
        new Draggable(e, Object.extend(options_for_draggable, { handle: handle })));
      Droppables.add(e, options_for_droppable);
      if(options.tree) e.treeNode = element;
      options.droppables.push(e);      
    });
    
    if(options.tree) {
      (Sortable.findTreeElements(element, options) || []).each( function(e) {
        Droppables.add(e, options_for_tree);
        e.treeNode = element;
        options.droppables.push(e);
      });
    }

    // keep reference
    this.sortables[element.id] = options;

    // for onupdate
    Draggables.addObserver(new SortableObserver(element, options.onUpdate));

  },

  // return all suitable-for-sortable elements in a guaranteed order
  findElements: function(element, options) {
    return Element.findChildren(
      element, options.only, options.tree ? true : false, options.tag);
  },
  
  findTreeElements: function(element, options) {
    return Element.findChildren(
      element, options.only, options.tree ? true : false, options.treeTag);
  },

  onHover: function(element, dropon, overlap) {
    if(Element.isParent(dropon, element)) return;

    if(overlap > .33 && overlap < .66 && Sortable.options(dropon).tree) {
      return;
    } else if(overlap>0.5) {
      Sortable.mark(dropon, 'before');
      if(dropon.previousSibling != element) {
        var oldParentNode = element.parentNode;
        element.style.visibility = "hidden"; // fix gecko rendering
        dropon.parentNode.insertBefore(element, dropon);
        if(dropon.parentNode!=oldParentNode) 
          Sortable.options(oldParentNode).onChange(element);
        Sortable.options(dropon.parentNode).onChange(element);
      }
    } else {
      Sortable.mark(dropon, 'after');
      var nextElement = dropon.nextSibling || null;
      if(nextElement != element) {
        var oldParentNode = element.parentNode;
        element.style.visibility = "hidden"; // fix gecko rendering
        dropon.parentNode.insertBefore(element, nextElement);
        if(dropon.parentNode!=oldParentNode) 
          Sortable.options(oldParentNode).onChange(element);
        Sortable.options(dropon.parentNode).onChange(element);
      }
    }
  },
  
  onEmptyHover: function(element, dropon, overlap) {
    var oldParentNode = element.parentNode;
    var droponOptions = Sortable.options(dropon);
        
    if(!Element.isParent(dropon, element)) {
      var index;
      
      var children = Sortable.findElements(dropon, {tag: droponOptions.tag, only: droponOptions.only});
      var child = null;
            
      if(children) {
        var offset = Element.offsetSize(dropon, droponOptions.overlap) * (1.0 - overlap);
        
        for (index = 0; index < children.length; index += 1) {
          if (offset - Element.offsetSize (children[index], droponOptions.overlap) >= 0) {
            offset -= Element.offsetSize (children[index], droponOptions.overlap);
          } else if (offset - (Element.offsetSize (children[index], droponOptions.overlap) / 2) >= 0) {
            child = index + 1 < children.length ? children[index + 1] : null;
            break;
          } else {
            child = children[index];
            break;
          }
        }
      }
      
      dropon.insertBefore(element, child);
      
      Sortable.options(oldParentNode).onChange(element);
      droponOptions.onChange(element);
    }
  },

  unmark: function() {
    if(Sortable._marker) Sortable._marker.hide();
  },

  mark: function(dropon, position) {
    // mark on ghosting only
    var sortable = Sortable.options(dropon.parentNode);
    if(sortable && !sortable.ghosting) return; 

    if(!Sortable._marker) {
      Sortable._marker = 
        ($('dropmarker') || Element.extend(document.createElement('DIV'))).
          hide().addClassName('dropmarker').setStyle({position:'absolute'});
      document.getElementsByTagName("body").item(0).appendChild(Sortable._marker);
    }    
    var offsets = Position.cumulativeOffset(dropon);
    Sortable._marker.setStyle({left: offsets[0]+'px', top: offsets[1] + 'px'});
    
    if(position=='after')
      if(sortable.overlap == 'horizontal') 
        Sortable._marker.setStyle({left: (offsets[0]+dropon.clientWidth) + 'px'});
      else
        Sortable._marker.setStyle({top: (offsets[1]+dropon.clientHeight) + 'px'});
    
    Sortable._marker.show();
  },
  
  _tree: function(element, options, parent) {
    var children = Sortable.findElements(element, options) || [];
  
    for (var i = 0; i < children.length; ++i) {
      var match = children[i].id.match(options.format);

      if (!match) continue;
      
      var child = {
        id: encodeURIComponent(match ? match[1] : null),
        element: element,
        parent: parent,
        children: [],
        position: parent.children.length,
        container: $(children[i]).down(options.treeTag)
      }
      
      /* Get the element containing the children and recurse over it */
      if (child.container)
        this._tree(child.container, options, child)
      
      parent.children.push (child);
    }

    return parent; 
  },

  tree: function(element) {
    element = $(element);
    var sortableOptions = this.options(element);
    var options = Object.extend({
      tag: sortableOptions.tag,
      treeTag: sortableOptions.treeTag,
      only: sortableOptions.only,
      name: element.id,
      format: sortableOptions.format
    }, arguments[1] || {});
    
    var root = {
      id: null,
      parent: null,
      children: [],
      container: element,
      position: 0
    }
    
    return Sortable._tree(element, options, root);
  },

  /* Construct a [i] index for a particular node */
  _constructIndex: function(node) {
    var index = '';
    do {
      if (node.id) index = '[' + node.position + ']' + index;
    } while ((node = node.parent) != null);
    return index;
  },

  sequence: function(element) {
    element = $(element);
    var options = Object.extend(this.options(element), arguments[1] || {});
    
    return $(this.findElements(element, options) || []).map( function(item) {
      return item.id.match(options.format) ? item.id.match(options.format)[1] : '';
    });
  },

  setSequence: function(element, new_sequence) {
    element = $(element);
    var options = Object.extend(this.options(element), arguments[2] || {});
    
    var nodeMap = {};
    this.findElements(element, options).each( function(n) {
        if (n.id.match(options.format))
            nodeMap[n.id.match(options.format)[1]] = [n, n.parentNode];
        n.parentNode.removeChild(n);
    });
   
    new_sequence.each(function(ident) {
      var n = nodeMap[ident];
      if (n) {
        n[1].appendChild(n[0]);
        delete nodeMap[ident];
      }
    });
  },
  
  serialize: function(element) {
    element = $(element);
    var options = Object.extend(Sortable.options(element), arguments[1] || {});
    var name = encodeURIComponent(
      (arguments[1] && arguments[1].name) ? arguments[1].name : element.id);
    
    if (options.tree) {
      return Sortable.tree(element, arguments[1]).children.map( function (item) {
        return [name + Sortable._constructIndex(item) + "[id]=" + 
                encodeURIComponent(item.id)].concat(item.children.map(arguments.callee));
      }).flatten().join('&');
    } else {
      return Sortable.sequence(element, arguments[1]).map( function(item) {
        return name + "[]=" + encodeURIComponent(item);
      }).join('&');
    }
  }
}

// Returns true if child is contained within element
Element.isParent = function(child, element) {
  if (!child.parentNode || child == element) return false;
  if (child.parentNode == element) return true;
  return Element.isParent(child.parentNode, element);
}

Element.findChildren = function(element, only, recursive, tagName) {   
  if(!element.hasChildNodes()) return null;
  tagName = tagName.toUpperCase();
  if(only) only = [only].flatten();
  var elements = [];
  $A(element.childNodes).each( function(e) {
    if(e.tagName && e.tagName.toUpperCase()==tagName &&
      (!only || (Element.classNames(e).detect(function(v) { return only.include(v) }))))
        elements.push(e);
    if(recursive) {
      var grandchildren = Element.findChildren(e, only, recursive, tagName);
      if(grandchildren) elements.push(grandchildren);
    }
  });

  return (elements.length>0 ? elements.flatten() : []);
}

Element.offsetSize = function (element, type) {
  return element['offset' + ((type=='vertical' || type=='height') ? 'Height' : 'Width')];
}



/***************************************************
 * library/livecart.js
 ***************************************************/

/**
 *	@author Integry Systems
 */

Function.prototype.inheritsFrom = function( parentClassOrObject )
{
	if ( parentClassOrObject.constructor == Function )
	{
		//Normal Inheritance
		var c = function() {}
		c.prototype = parentClassOrObject.prototype;
		this.prototype = new c();
		this.prototype.constructor = this;
		this.prototype.parent = parentClassOrObject.prototype;
	}
	else
	{
		//Pure Virtual Inheritance
		this.prototype = parentClassOrObject;
		this.prototype.constructor = this;
		this.prototype.parent = parentClassOrObject;
	}

	this.parent = this.prototype.parent;
	this.prototype.parentConstructor = parentClassOrObject;

	this.prototype.callConstructor = function(args)
	{
		return this.parentConstructor.apply(this, args);
	};

	if (this.methods)
	{
		$H(this.methods).each(function(func)
		{
			this.prototype[func[0]] = func[1];
		}.bind(this)
		);
	}

	return this;
}

// not really working yet
Function.prototype.inherit = function()
{
	var extendedClass = function()
	{
		this.callConstructor(arguments);
	}

	var c = function() {}
	c.prototype = this.prototype;
	extendedClass.prototype = new c();
	extendedClass.prototype.constructor = this;
	extendedClass.prototype.parent = this.prototype;

	extendedClass.parent = this.prototype.parent;
	this.prototype.parentConstructor = this;

	return extendedClass;
}

var LiveCart = {
	ajaxUpdaterInstance: null
}

LiveCart.AjaxRequest = Class.create();
LiveCart.AjaxRequest.prototype = {
	requestCount: 0,

	onComplete: false,

	indicatorContainerId: false,

	request: false,

	initialize: function(formOrUrl, indicatorId, onComplete, options)
	{
		var url = "";
		var method = "";
		var params = "";

		this.onComplete = onComplete;

		if (typeof formOrUrl == "object")
		{
			if (window.tinyMCE)
			{
				Element.saveTinyMceFields();
			}

			var form = formOrUrl;
			url = form.action;
			method = form.method;
			params = Form.serialize(form);

			if (!indicatorId)
			{
				var controls = form.down('fieldset.controls');
				if (controls)
				{
					indicatorId = controls.down('.progressIndicator');
				}
				else
				{
					indicatorId = form.down('.progressIndicator');
				}
			}
		}
		else
		{
			url = formOrUrl;
			method = "post";
		}

		url = this.fixUrl(url);

		if (indicatorId && $(indicatorId))
		{
			this.adjustIndicatorVisibility = ($(indicatorId).style.visibility == 'hidden');

			if ('SELECT' == indicatorId.tagName)
			{
				var selectIndicator = document.createElement('span');
				selectIndicator.className = 'progressIndicator';
				var nextSibling = indicatorId.nextSibling;
				if (nextSibling)
				{
					nextSibling.parentNode.insertBefore(selectIndicator, nextSibling);
				}
				else
				{
					indicatorId.parentNode.appendChild(selectIndicator);
				}

				indicatorId = selectIndicator;

				this.adjustIndicatorVisibility = true;
			}
			else if (('INPUT' == indicatorId.tagName) && (('checkbox' == indicatorId.type) || ('radio' == indicatorId.type)))
			{
				this.replacedIndicator = indicatorId;
				indicatorId = $(document.createElement('span'));
				indicatorId.className = this.replacedIndicator.className;
				indicatorId.id = this.replacedIndicator.id;
				indicatorId.addClassName('checkbox');
				indicatorId.checked = this.replacedIndicator.checked;

				if (this.replacedIndicator.parentNode)
				{
					this.replacedIndicator.parentNode.replaceChild(indicatorId, this.replacedIndicator);
				}
			}

			this.indicatorContainerId = indicatorId;
			this.showIndicator();
		}

		if (!options)
		{
			options = {};
		}

		options.method = method;

		if (!options.parameters)
		{
			options.parameters = params;
		}

		options.parameters += (escape(options.parameters) ? '&' : '') + 'ajax=true';

		options.onComplete = this.postProcessResponse.bind(this, this.parseURI(url));
		options.onFailure = this.reportError;

		document.body.style.cursor = 'progress';

		this.request = new Ajax.Request(url, options);
	},

	fixUrl: function(url)
	{
		if (!url) { return; }

		// fix repeting ? in URLs
		var urlParts = url.split(/\?/);
		var url = urlParts.shift();
		if (urlParts.length)
		{
			url += '?' + urlParts.join('&');
		}

		// fix &amp;s
		url = url.replace(/&amp;/, '&');

		return url;
	},

	parseURI: function(URI)
	{
		if(!URI) return {};

		var splitedURI = URI.split("?");
		var URL = splitedURI[0];
		var queryString = splitedURI[1];
		var query = {};

		if(queryString)
		{
			$A(queryString.split("&")).each(function(paramString) {
				var params = paramString.split("=");

				var match = params[0].match(/(.*)\[(\d*)\]$/);
				if(match)
				{
					if(!query[match[1]]) query[match[1]] = $H({});

					if(match[2] == "")
					{
						match[2] = query[match[1]].size();
					}

					query[match[1]][match[2]] = params[1];
				}
				else
				{
					query[params[0]] = params[1];
				}
			});
		}

		return {
			'url': URL,
			'queryString': queryString,
			'query': query
		};
	},

	hideIndicator: function()
	{
		if (!this.indicatorContainerId)
		{
			return;
		}

		if (this.replacedIndicator && this.indicatorContainerId.parentNode)
		{
			this.indicatorContainerId.parentNode.replaceChild(this.replacedIndicator, this.indicatorContainerId);
			this.replacedIndicator.checked = this.indicatorContainerId.checked;
			Element.show(this.replacedIndicator);
			this.adjustIndicatorVisibility = true;
		}

		if (this.adjustIndicatorVisibility)
		{
			Element.hide(this.indicatorContainerId);
		}

		$(this.indicatorContainerId).removeClassName('progressIndicator');
	},

	showIndicator: function()
	{
		if (this.indicatorContainerId)
		{
			$(this.indicatorContainerId).addClassName('progressIndicator');
			Element.show(this.indicatorContainerId);
		}
	},

	postProcessResponse: function(url, response)
	{
		document.body.style.cursor = 'default';
		this.hideIndicator();

		var contentType = response.getResponseHeader('Content-type');

		if (contentType && contentType.match(/text\/javascript/))
		{
			var responseData = response.responseText.evalJSON();
			try
			{
				response.responseData = responseData;
			}
			catch (e)
			{
				// IE 6 won't let add new properties to the request object
				response = { responseData: responseData }
			}

			if (responseData.__redirect)
			{
				window.location.href = responseData.__redirect;
			}

			Observer.processArray(responseData);
		}

		if (contentType && contentType.match(/text\/javascript/) && $('confirmations'))
		{
			var confirmations = $('confirmations');
			if(!confirmations.down('#yellowZone')) new Insertion.Top('confirmations', '<div id="yellowZone"></div>');
			if(!confirmations.down('#redZone')) new Insertion.Top('confirmations', '<div id="redZone"></div>');
			if(!confirmations.down('#bugZone')) new Insertion.Top('confirmations', '<div id="bugZone"></div>');

			try
			{
				if(window.selectPopupWindow && window.selectPopupWindow.document)
				{
					var win = window.selectPopupWindow;

					var confirmations = win.$('confirmations');
					if(confirmations)
					{
						if(!confirmations.down('#yellowZone')) new win.Insertion.Top('confirmations', '<div id="yellowZone"></div>');
						if(!confirmations.down('#redZone')) new win.Insertion.Top('confirmations', '<div id="redZone"></div>');
						if(!confirmations.down('#bugZone')) new win.Insertion.Top('confirmations', '<div id="bugZone"></div>');
					}
				}
			}
			catch(e)
			{

			}

			try
			{
				// Show confirmation
				if(response.responseData.status)
				{
					this.showConfirmation(response.responseData);
				}
			}
			catch (e)  { this.showBug(); }
		}

		if (this.onComplete)
		{
			this.onComplete(response, url);
		}
	},

	showBug: function()
	{
		new Insertion.Top('bugZone',
		'<div style="display: none;" id="confirmation_' + (++LiveCart.AjaxRequest.prototype.requestCount) + '" class="bugMessage">' +
			'<img class="closeMessage" src="image/silk/cancel.png"/>' +
			'<div>' + Backend.internalErrorMessage + '</div>' +
		'</div>');

		new Backend.SaveConfirmationMessage($('confirmation_' + LiveCart.AjaxRequest.prototype.requestCount));

		try
		{
			if(window.selectPopupWindow)
			{
				var win = window.selectPopupWindow;
				if(win.$('confirmations'))
				{
					new win.Insertion.Top('bugZone',
					'<div style="display: none;" id="confirmation_' + (++LiveCart.AjaxRequest.prototype.requestCount) + '" class="bugMessage">' +
						'<img class="closeMessage" src="image/silk/cancel.png"/>' +
						'<div>' + Backend.internalErrorMessage + '</div>' +
					'</div>');

					new Backend.SaveConfirmationMessage(win.$('confirmation_' + LiveCart.AjaxRequest.prototype.requestCount));
				}
			}
		}
		catch(e)
		{

		}
	},

	showConfirmation: function(responseData)
	{
		if(!responseData.message) return;

		var color = null;
		if('success' == responseData.status) color = 'yellow';
		if('failure' == responseData.status) color = 'red';

		new Insertion.Top('confirmations',
		'<div style="display: none;" id="confirmation_' + (++LiveCart.AjaxRequest.prototype.requestCount) + '" class="' + color + 'Message">' +
			'<img class="closeMessage" src="image/silk/cancel.png"/>' +
			'<div>' + responseData.message + '</div>' +
		'</div>');

		new Backend.SaveConfirmationMessage($('confirmation_' + LiveCart.AjaxRequest.prototype.requestCount));

		try
		{
			if(window.selectPopupWindow && window.selectPopupWindow.document)
			{
				var win = window.selectPopupWindow;

				new win.Insertion.Top(color + 'Zone',
				'<div style="display: none;" id="confirmation_' + (++LiveCart.AjaxRequest.prototype.requestCount) + '" class="' + color + 'Message">' +
					'<img class="closeMessage" src="image/silk/cancel.png"/>' +
					'<div>' + responseData.message + '</div>' +
				'</div>');

				new win.Backend.SaveConfirmationMessage(win.$('confirmation_' + LiveCart.AjaxRequest.prototype.requestCount));
			}
		}
		catch(e)
		{

		}
	},

	getResponseChunks: function(originalRequest)
	{
		if (!originalRequest.formerLength)
		{
			originalRequest.formerLength = 0;
		}

		var response = originalRequest.responseText.substr(originalRequest.formerLength);
		originalRequest.formerLength = originalRequest.responseText.length;

		var ret = [];
		var portions = response.split('|');

		for (var k = 0; k < portions.length; k++)
		{
			if (0 == portions[k].length)
			{
				continue;
			}

			ret.push(eval('(' + decode64(portions[k]) + ')'));
		}

		return ret;
	},

	reportError: function(response)
	{
		alert('Error!\n\n' + response.responseText);
	}
}

LiveCart.AjaxUpdater = Class.create();
LiveCart.AjaxUpdater.prototype = {

	indicatorContainerId: null,

	initialize: function(formOrUrl, container, indicator, insertionPosition, onComplete, options)
	{
		var url = "";
		var method = "";
		var params = options ? (options.parameters || '') : '';
		this.onComplete = onComplete;

		var containerId = $(container);
		var indicatorId = $(indicator);

		if (typeof formOrUrl == "object")
		{
			if (window.tinyMCE)
			{
				tinyMCE.triggerSave();
			}

			var form = formOrUrl;
			url = form.action;
			method = form.method;
			params = Form.serialize(form);

			if (!indicatorId)
			{
				var controls = form.down('fieldset.controls');
				if (controls)
				{
					indicatorId = controls.down('.progressIndicator');
					if(indicatorId.style.visibility == 'hidden')
					{
						this.adjustIndicatorVisibility = true;
					}
				}
			}
		}
		else
		{
			url = formOrUrl;
			method = "post";
		}

		url = LiveCart.AjaxRequest.prototype.fixUrl(url);

		LiveCart.ajaxUpdaterInstance = this;

		if (indicatorId)
		{
			this.indicatorContainerId = indicatorId;
			this.adjustIndicatorVisibility = !Element.visible(this.indicatorContainerId);
			this.showIndicator();
		}

		if (!options)
		{
			options = {};
		}

		options.method = method;
		options.parameters = params;
		options.onComplete = this.postProcessResponse.bind(this);
		options.onFailure = this.reportError.bind(this);
		options.onSuccess = function()
			{
				if (window.ActiveForm && $(container))
				{
					ActiveForm.prototype.destroyTinyMceFields($(container));
				}
			}

		options.parameters += (options.parameters ? '&' : '') + 'ajax=true';

		if (insertionPosition != undefined && insertionPosition != false)
		{
			switch(insertionPosition)
			{
				case 'top':
					options.insertion = Insertion.Top;
				break;

				case 'bottom':
					options.insertion = Insertion.Bottom;
				break;

				case 'before':
					options.insertion = Insertion.Before;
				break;

				case 'after':
					options.insertion = Insertion.After;
				break;

				default:
					alert('Invalid insertion position value in AjaxUpdater'); // ?
				break;
			}
		}

		document.body.style.cursor = 'progress';

		var ajax = new Ajax.Updater({success: containerId},
						 url,
						 options);

	},

	hideIndicator: function()
	{
		if (!this.indicatorContainerId)
		{
			return;
		}

		$(this.indicatorContainerId).removeClassName('progressIndicator');

		if (this.adjustIndicatorVisibility)
		{
			Element.hide(this.indicatorContainerId);
		}
	},

	showIndicator: function()
	{
		if (this.indicatorContainerId)
		{
			$(this.indicatorContainerId).addClassName('progressIndicator');
			Element.show(this.indicatorContainerId);
		}
	},

	postProcessResponse: function(response)
	{
		document.body.style.cursor = 'default';
		response.responseText.evalScripts();
		this.hideIndicator();

		if (this.onComplete)
		{
		  	this.onComplete(response);
		}
	},

	reportError: function(response)
	{
		alert('Error!\n\n' + response.responseText);
	}
}

LiveCart.FileUpload = Class.create();
LiveCart.FileUpload.prototype =
{
	upload: null,
	url: null,
	onComplete: null,
	cloned: null,

	initialize: function(upload, url, onComplete)
	{
		this.upload = upload;
		this.url = url;
		this.onComplete = onComplete;

		Event.observe(upload, 'change', this.submit.bindAsEventListener(this));
	},

	submit: function(el)
	{
		var upload = this.upload;

		var target = document.createElement('iframe');
		target.setAttribute('name', 'upload_iframe_' + Math.round(Math.random() * 1000000000000000));
		target.setAttribute('style', 'display: none;');

		document.body.appendChild(target);

		target.onload =
			function()
			{
				var oDoc = target.contentWindow || target.contentDocument;
				if (oDoc.document)
				{
					oDoc = oDoc.document;
    			}

				var res = oDoc.body.innerHTML;
				if (res.substr(0, 5) == '<pre>')
				{
					res = res.substr(5, res.length - 11);
				}

				res = res.length > 0 ? res.evalJSON() : {}

				if (this.onComplete)
				{
					this.onComplete(this.cloned, res);
				}
			}.bind(this);

		var uploadForm = document.createElement('form');
		uploadForm.setAttribute('method', 'POST');
		uploadForm.setAttribute('enctype', 'multipart/form-data');
		uploadForm.setAttribute('action', this.url.replace(/\&amp\;/g, '&'));
		uploadForm.setAttribute('target', target.getAttribute('name'));
		$(uploadForm).hide();

		document.body.appendChild(uploadForm);

		var cloned = this.upload.cloneNode(true);
		cloned.id += Math.round(Math.random() * 1000);

		$(upload).hide();
		upload.parentNode.insertBefore(cloned, upload);
		$(cloned).show();

		uploadForm.appendChild(upload);

		uploadForm.submit();

		new LiveCart.FileUpload(cloned, this.url, this.onComplete);
		this.cloned = cloned;
	}
}

/********************************************************************
 * Router / Url manipulator
 ********************************************************************/
Router =
{
	urlTemplate: '',

	setUrlTemplate: function(url)
	{
		url = url.replace(/controller/, '__c__');
		this.urlTemplate = url.replace(/action/, '__a__');
	},

	createUrl: function(controller, action, params)
	{
		var url = this.urlTemplate.replace(/__c__/, controller);
		url = url.replace(/__a__/, action);

		if (params)
		{
			$H(params).each(function(param)
			{
				url = this.setUrlQueryParam(url, param[0], param[1])
			}.bind(this));
		}

		return url;
	},

	setUrlQueryParam: function(url, key, value)
	{
		return url + (url.match(/\?/) ? '&' : '?') + key + '=' + value;
	}
}


Observer =
{
	observers: {},

	add: function(key, method, params)
	{
		if (!this.observers[key])
		{
			this.observers[key] = [];
		}

		this.observers[key].push([method, params]);
	},

	process: function(key, value)
	{
		if (!this.observers[key])
		{
			return;
		}

		$A(this.observers[key]).each(function(observer)
		{
			observer[0](value, observer[1]);
		});
	},

	processArray: function(responseData)
	{
		$H(responseData).each(function(v)
		{
			this.process(v[0], v[1]);
		}.bind(this));
	}
}

function decode64(inp)
{

var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" + //all caps
"abcdefghijklmnopqrstuvwxyz" + //all lowercase
"0123456789+/=";

var out = ""; //This is the output
var chr1, chr2, chr3 = ""; //These are the 3 decoded bytes
var enc1, enc2, enc3, enc4 = ""; //These are the 4 bytes to be decoded
var i = 0; //Position counter

// remove all characters that are not A-Z, a-z, 0-9, +, /, or =
var base64test = /[^A-Za-z0-9\+\/\=]/g;

if (base64test.exec(inp)) { //Do some error checking

	return false;

}
inp = inp.replace(/[^A-Za-z0-9\+\/\=]/g, "");

do { //Here?s the decode loop.

//Grab 4 bytes of encoded content.
enc1 = keyStr.indexOf(inp.charAt(i++));
enc2 = keyStr.indexOf(inp.charAt(i++));
enc3 = keyStr.indexOf(inp.charAt(i++));
enc4 = keyStr.indexOf(inp.charAt(i++));

//Heres the decode part. There?s really only one way to do it.
chr1 = (enc1 << 2) | (enc2 >> 4);
chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
chr3 = ((enc3 & 3) << 6) | enc4;

//Start to output decoded content
out = out + String.fromCharCode(chr1);

if (enc3 != 64) {
out = out + String.fromCharCode(chr2);
}
if (enc4 != 64) {
out = out + String.fromCharCode(chr3);
}

//now clean out the variables used
chr1 = chr2 = chr3 = "";
enc1 = enc2 = enc3 = enc4 = "";

} while (i < inp.length); //finish off the loop

//Now return the decoded values.
//return out;
return _utf8_decode(out);
}

 // private method for UTF-8 decoding
function _utf8_decode(utftext) {
	 var string = "";
	 var i = 0;
	 var c, c1, c2 = 0;

	 while ( i < utftext.length ) {

		 c = utftext.charCodeAt(i);

		 if (c < 128) {
			 string += String.fromCharCode(c);
			 i++;
		 }
		 else if((c > 191) && (c < 224)) {
			 c2 = utftext.charCodeAt(i+1);
			 string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
			 i += 2;
		 }
		 else {
			 c2 = utftext.charCodeAt(i+1);
			 c3 = utftext.charCodeAt(i+2);
			 string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
			 i += 3;
		 }

	 }

	 return string;
}

function sendEvent(element,event)
{
    if (document.createEventObject)
    {
        // dispatch for IE
        var evt = document.createEventObject();
        return element.fireEvent('on'+event/*,  evt */)
    }
    else
    {
        // dispatch for firefox + others
        var evt = document.createEvent("HTMLEvents");
        evt.initEvent(event, true, true ); // event type,bubbling,cancelable
        return !element.dispatchEvent(evt);
    }
}

Prototype.Browser.IE6 = Prototype.Browser.IE && parseInt(navigator.userAgent.substring(navigator.userAgent.indexOf("MSIE")+5)) == 6;
Prototype.Browser.IE7 = Prototype.Browser.IE && parseInt(navigator.userAgent.substring(navigator.userAgent.indexOf("MSIE")+5)) == 7;
Prototype.Browser.IE8 = Prototype.Browser.IE && !Prototype.Browser.IE6 && !Prototype.Browser.IE7;


/***************************************************
 * library/FooterToolbar.js
 ***************************************************/

//
//   API requires:
//  - ability to call hide on all menus.
//

var FooterToolbar = Class.create();
FooterToolbar.prototype = {
	nodes : {},

	properties: {},

	// draggable menu items contains <a> tags, clicking on them reloads page
	// this flag is used for workround
	draggingItem: false,

	isBackend: false,

	afterInit: function()
	{
	},

	nodes: function()
	{
	},

	initialize: function(rootNode, properties)
	{
		this.nodes.root = $(rootNode);
		this.nodes.mainpanel = this.nodes.root.down("ul");
		this.properties = $H(properties || null);

		this.nodes(); // find nodes used only by frontend or backend.
		this.afterInit(); // constructor only for frontend or backend.
	},

	getPorperty: function(key)
	{
		return this.properties[key];
	},

	getSubPanels: function(node)
	{
		return $A(node.getElementsByClassName("subpanel"));
	},

	adjustPanel: function (panel)
	{
		panel = $(panel);
		var
			windowHeight = window.innerHeight || (window.document.documentElement.clientHeight || window.document.body.clientHeight),
			subpanel = $(panel.getElementsBySelector(".subpanel")[0]),
			ul = $(panel.getElementsBySelector("ul")[0]);

		subpanel.style.height="auto";
		ul.style.height="auto";

		var
			panelsub = subpanel.getHeight(),
			panelAdjust = windowHeight - 196,
			ulAdjust =  panelAdjust - 25;

		if (panelsub > panelAdjust)
		{
			subpanel.style.height=panelAdjust+"px";
			ul.style.height=panelAdjust+"px";
		}
		else
		{
			ul.style.height="auto";
		}
	},

	cancelClickEventOnDrag: function(event)
	{
		if (this.draggingItem == true)
		{
			// drag fires only one click event, setting flag to false will allow next clicks on menu to operate normally
			this.draggingItem = false;
			Event.stop(event);
		}
	}
}


/***************************************************
 * backend/Backend.js
 ***************************************************/

/**
 *	@author Integry Systems
 */

var Backend =
{
	idCounter: 0,

	setTranslations: function(translations)
	{
		Backend.translations = translations;
	},

	getTranslation: function(key)
	{
		return this.translations[key];
	},

	sendKeepAlivePing: function()
	{
		new LiveCart.AjaxRequest(Backend.Router.createUrl('backend.index', 'keepAlive'));
	},

	setUniqueID: function(element)
	{
		element.id = 'generatedId_' + ++this.idCounter;
		return element.id;
	},

	getHash: function()
	{
		return Backend.AjaxNavigationHandler.prototype.getHash();
	},

	onLoad: function()
	{
		// AJAX navigation
		dhtmlHistory.initialize();
		dhtmlHistory.addListener(Backend.ajaxNav.handle);
		dhtmlHistory.handleBookmark();

		setInterval("Backend.sendKeepAlivePing();", 300 * 1000);
		if (!$('confirmations'))
		{
			var el = document.createElement('div');
			el.id = 'confirmations';
			document.body.appendChild(el);
		}
	}
};

// set default locale
Backend.locale = 'en';

Backend.openedContainersStack = [];
Backend.showContainer = function(containerID)
{
	if(Backend.openedContainersStack.length == 0)
	{
		Backend.openedContainersStack[0] = containerID;
	}
	else if(Backend.openedContainersStack[Backend.openedContainersStack.length - 1] != containerID)
	{
		Backend.openedContainersStack[Backend.openedContainersStack.length] = containerID;
		$(Backend.openedContainersStack[Backend.openedContainersStack.length - 2]).hide();
	}

	$(Backend.openedContainersStack[Backend.openedContainersStack.length - 1]).show();
}

Backend.hideContainer = function()
{
	if(Backend.openedContainersStack.length  > 0) $(Backend.openedContainersStack[Backend.openedContainersStack.length - 1]).hide();
	Backend.openedContainersStack.splice(Backend.openedContainersStack.length - 1, 1);

	var lastContainer = $(Backend.openedContainersStack[Backend.openedContainersStack.length - 1]);
	if(lastContainer)
	{
		lastContainer.show();
	}
}

/*************************************************
	Help context handler
**************************************************/
Backend.setHelpContext = function(context)
{
	var help = $('help');
	if (help)
	{
		help.href = 'http://doc.livecart.com/help/' + context;
	}
}

/*************************************************
	AJAX back/forward navigation
**************************************************/
Backend.AjaxNavigationHandler = Class.create();
Backend.AjaxNavigationHandler.prototype =
{
	ignoreNextAdd: false,

	initialize: function()
	{
	},

	/**
	 * The AJAX history consists of clicks on certain elements (traditional history uses URL's)
	 * To register a history event, you only have to pass in an element ID, which was clicked. When
	 * the user navigates backward or forward using the browser navigation, these clicks are simply
	 * repeated by calling the onclick() function for the particular element.
	 *
	 * Sometimes it is necessary to perform more than one "click" to return to previous state. In such case
	 * you can pass in several element ID's delimited with # sign. For example: cat_44#tabImages - would first
	 * emulate a click on cat_44 element and then on tabImages element. This is also useful for bookmarking,
	 * which allows to easily reference certain content on complex pages.
	 *
	 * @param element string Element ID, which would be clicked
	 * @param params Probably obsolete, but perhaps we'll find some use for it
	 */
	add: function(element, params)
	{
		if (true == this.ignoreNextAdd)
		{
			this.ignoreNextAdd = false;
			return false;
		}

		dhtmlHistory.add(element + '__');
		return true;
	},

	getHash: function()
	{
		var hash = document.location.hash;

		// Safari
		hash = hash.replace(/%23/, '#');

		return ("#" == hash[0]) ? ('__' == hash.substring(-2) ? hash.substring(1, hash.length - 2) : hash) : hash.substring(0, hash.length - 1);
	},

	handle: function(element, params)
	{
		if(!params) params = {};
		if(!params.recoverFromIndex) params.recoverFromIndex = 0;

		var elementId = element.substr(0, element.length - 2);

		// Safari
		elementId = elementId.replace(/%23/, '#');

		var hashElements = elementId.split('#');

		for (var hashPart = params.recoverFromIndex; hashPart < hashElements.length; hashPart++)
		{
			if ($(hashElements[hashPart]))
			{
				// only register the click for the last element
				if (hashPart < hashElements.length - 1)
				{
					Backend.ajaxNav.ignoreNext();
				}

				if ($(hashElements[hashPart]).onclick)
				{
					$(hashElements[hashPart]).onclick();
				}
			}

			/*
			// This is in case element is not yet loaded. If so we wait for all requests to finish and the continue.
			else if(Ajax.activeRequestCount > 0)
			{
				setInterval(function()
				{
					if(this.handle)
					{
						this.handle(element, { recoverFromIndex: hashPart });
					}
				}.bind(this), 10);

				return;
			}
			*/

		}
	},


	ignoreNext: function()
	{
		this.ignoreNextAdd = true;
	}
}

Backend.ajaxNav = new Backend.AjaxNavigationHandler();

/*************************************************
	Layout Control
**************************************************/
Backend.LayoutManager = Class.create();

/**
 * Manage 100% heights
 *
 * IE does this pretty good natively (only the main content div height is changed on window resize),
 * however FF won't handle cascading 100% heights unless the page is being rendered in quirks mode.
 *
 * You can specify a block to take 100% height by assigning a "maxHeight" CSS class to it
 * This class also simulates an "extension" of CSS, that allows to add or substract some height
 * in pixels from percentage defined height (for example 100% minus 40px). This will often be needed
 * to compensate for parent elements padding. For example, if the parent element has a top and bottom
 * padding of 10px, you'll have to substract 20px from child block size. This will also be needed when
 * there are other siblings that consume some known height (like TabControl, which contains a
 * tab bar with known height and content div, which must take 100% of the rest of the available height).
 *
 * Example:
 *
 * <code>
 *	  <div class="maxHeight h--50">
 *		  This div will take 100% of available space minus 50 pixels
 *	  </div>
 * </code>
 *
 * @todo automatically substract parent padding
 */
Backend.LayoutManager.prototype =
{
	initialize: function()
	{
		window.onresize = this.onresize.bindAsEventListener(this);
		this.onresize();
	},

	redraw: function()
	{
		document.body.hide();
		document.body.show();
	},

	/**
	 * Set the minimum possible height to all involved elements, so that
	 * their height could be enlarged to necessary size
	 */
	collapseAll: function(cont)
	{
		var el = document.getElementsByClassName("maxHeight", document);

		for (k = 0; k < el.length; k++)
		{
			el[k].style.minHeight = '0px';

			if (document.all)
			{
				el[k].style.height = '0px';
			}
			else
			{
				el[k].style.minHeight = '0px';
			}

		}
	},

	/**
	 * @todo Figure out why IE needs additional 2px offset
	 * @todo Figure out a better way to determine the body height for all browsers
	 */
	onresize: function()
	{
		if(BrowserDetect.browser == 'Explorer' && BrowserDetect.version == 7) return;

		if (document.all)
		{
			$('pageContentContainer').style.height = '0px';
		}

		// calculate content area height
		var ph = new PopupMenuHandler();
		var w = ph.getWindowHeight();
		var h = w - 185 - (document.all ? 1 : 0);
		var cont = $('pageContentContainer');

		if (BrowserDetect.browser == 'Explorer')
		{
			cont.style.height = h + 'px';

			// force re-render for IE
			$('pageContainer').style.display = 'none';
			$('pageContainer').style.display = 'block';
			$('nav').style.display = 'none';
			$('nav').style.display = 'block';
		}
		else // Good browsers
		{
			cont.style.minHeight = h + 'px';

			this.collapseAll(cont);
			this.setMaxHeight(cont);
		}
	},

	setMaxHeight: function(parent)
	{
		var el = document.getElementsByClassName('maxHeight', parent);
		for (k = 0; k < el.length; k++)
		{
			var parentHeight = el[k].parentNode.offsetHeight;

			offset = 0;
			if (el[k].className.indexOf(' h-') > 0)
			{
				offset = el[k].className.substr(el[k].className.indexOf(' h-') + 3, 10);
				if (offset.indexOf(' ') > 0)
				{
					offset = offset.substr(0, offset.indexOf(' '));
				}
			}
			offset = parseInt(offset);
			newHeight = parentHeight + offset;
			el[k].style.minHeight = newHeight + 'px';
		}
	}
}

/*************************************************
	Breadcrumb navigation
**************************************************/
Backend.Breadcrumb =
{
	loadedIDs: $A([]),
	selectedItemId: 0,
	pageTitle: $("pageTitle"),
	template: $("breadcrumb_template"),

	display: function(id, additional)
	{
		if (!Backend.Breadcrumb.pageTitle)
		{
			Backend.Breadcrumb.pageTitle = $("pageTitle");
		}

		Backend.Breadcrumb.template = $("breadcrumb_template");
		Backend.Breadcrumb.createPath(id, additional);
	},

	createPath: function(id, additional)
	{
		if(!Backend.Breadcrumb.treeBrowser && Backend.Breadcrumb.treeBrowser.getSelectedItemId) return;
		var parentId = id;

		if (!Backend.Breadcrumb.treeBrowser)
		{
			return false;
		}

		Backend.Breadcrumb.selectedItemId = Backend.Breadcrumb.treeBrowser.getSelectedItemId();

		if (!Backend.Breadcrumb.pageTitle)
		{
			return false;
		}

		Backend.Breadcrumb.pageTitle.innerHTML = "";

		if(typeof(id) != 'object')
		{
			do
			{
				Backend.Breadcrumb.addCrumb(Backend.Breadcrumb.treeBrowser.getItemText(parentId), parentId, true);
				parentId = Backend.Breadcrumb.treeBrowser.getParentId(parentId);
			}
			while(parentId != 0);
		}
		else
		{
			$A(id).each(function(node) {
				Backend.Breadcrumb.addCrumb(node.name, node.ID);
			});
		}

		if(additional)
		{
			if(typeof(additional) != "object")
			{
				new Insertion.Bottom(Backend.Breadcrumb.pageTitle, "<span class=\"breadcrumb\">" + Backend.Breadcrumb.template.innerHTML + "</span>");
				$$("#pageTitle a").last().innerHTML = additional;
			}
			else
			{
				$A(additional).each(function(crumb)
				{
					if(typeof(crumb) == "string")
					{
						Backend.Breadcrumb.addCrumb(crumb, false)
					}
					else
					{
					   Backend.Breadcrumb.addCrumb(crumb[0], crumb[1])
					}
				});
			}
		}

		var lastSeparator = $$("#pageTitle .breadcrumb").last().down('.breadcrumb_separator');
		if(lastSeparator)
		{
			lastSeparator.hide();
		}

		var lastLink = $$("#pageTitle .breadcrumb").last().down('a');
		if(lastLink)
		{
			Backend.Breadcrumb.convertLinkToText(lastLink);
		}
	},

	addCrumb: function(nodeStr, parentId, reverse) {
		var template = "<span class=\"breadcrumb\">" + Backend.Breadcrumb.template.innerHTML + "</span>";
		var link = null;

		if(reverse)
		{
			new Insertion.Top(Backend.Breadcrumb.pageTitle, template);
			link = Backend.Breadcrumb.pageTitle.childElements().first().down('a');
		}
		else
		{
			new Insertion.Bottom(Backend.Breadcrumb.pageTitle, template);
			link = Backend.Breadcrumb.pageTitle.childElements().last().down('a');
		}


		link.innerHTML = nodeStr;

		if(typeof(parentId) == "function")
		{
			Event.observe(link, "click", parentId);
		}
		else if(parentId !== false)
		{
			link.catId = parentId;
			link.href = "#cat_" + parentId;
			Event.observe(link, "click", function(e) {
				Event.stop(e);
				Backend.hideContainer();

				if(Backend.Breadcrumb.treeBrowser.getIndexById(this.catId) == null)
				{
					Backend.Category.treeBrowser.loadXML(Backend.Router.setUrlQueryParam(Backend.Category.links.categoryRecursiveAutoloading, "id", this.catId));
				}
				else
				{
					Backend.Breadcrumb.treeBrowser.selectItem(this.catId, true);
				}
			});
		}
	},

	setTree: function(treeBrowser) {
		Backend.Breadcrumb.treeBrowser = treeBrowser;
	},

	convertLinkToText: function(link) {
		new Insertion.After(link, link.innerHTML);
		Element.remove(link);
	}
}

/*************************************************
	Backend menu
**************************************************/
Backend.NavMenu = Class.create();

/**
 * Builds navigation menu from passed JSON array
 */
Backend.NavMenu.prototype =
{
	initialize: function(menuArray, controller, action)
	{
		var index = -1;
		var subIndex = 0;
		var subItemIndex = 0;
		var match = false;

		// find current menu items
		for (topIndex in menuArray)
		{
			if('object' == typeof menuArray[topIndex])
			{
				mItem = menuArray[topIndex];

				if (mItem['controller'] == controller)
				{
					index = topIndex;
				}

				if (mItem['controller'] == controller && mItem['action'] == action)
				{
					index = topIndex;
					subItemIndex = 0;
					match = true;
					break;
				}

				match = false;

				if ('object' == typeof mItem['items'])
				{
					for (subIndex in mItem['items'])
					{
						subItem = mItem['items'][subIndex];

						if (subItem['controller'] == controller && subItem['action'] == action)
						{
							index = topIndex;
							subItemIndex = subIndex;
							match = true;
							break;
						}
						else if (controller == subItem['controller'])
						{
							index = topIndex;
							subItemIndex = subIndex;
						}
					}

					if (match)
					{
						break;
					}
				}
			}
		}

		// add current menu items to breadcrumb
		/*
		breadcrumb.addItem(menuArray[index]['title'], menuArray[index]['url']);
		if (subItemIndex > 0)
		{
			breadcrumb.addItem(menuArray[index]['items'][subItemIndex]['title'],
							   menuArray[index]['items'][subItemIndex]['url']);
		}
		*/

		// build menu
		var topItem = $('navTopItem-template');
		var subItem = $('navSubItem-template');
		var nr = 0, subNr;
		navCont = $('nav');

		for (topIndex in menuArray)
		{
			if('object' == typeof menuArray[topIndex])
			{
				mItem = menuArray[topIndex];

				menuItem = topItem.cloneNode(true);

				var a = menuItem.getElementsByTagName('a')[0];
				a.href = mItem['url'];
				a.descr = mItem['descr'];
				a.id="menu_"+nr;
				if(!mItem['url'])
				{
					a.onclick = function() { return false; }
					a.className = 'topItem';
				}
				a.innerHTML = mItem['title'];
				menuItem.style.display = 'block';
				if ('' != mItem['icon'])
				{
					a.style.backgroundImage = 'url(' + mItem['icon'] + ')';
				}

				if (topIndex == index)
				{
					menuItem.id = 'navSelected';
				}
				else
				{
					Event.observe(menuItem, 'mouseover', this.hideCurrentSubMenu);
					Event.observe(menuItem, 'mouseout', this.showCurrentSubMenu);
				}

				// submenu container
				ul = menuItem.getElementsByTagName('ul')[0];

				if ('object' == typeof mItem['items'])
				{
					subNr = 0;
					for (subIndex in mItem['items'])
					{
						sub = mItem['items'][subIndex];

						if ('object' == typeof sub)
						{
							subNode = subItem.cloneNode(true);
							var a = subNode.getElementsByTagName('a')[0];
							if ('' != sub['icon'])
							{
								a.style.backgroundImage = 'url(' + sub['icon'] + ')';
							}

							a.href = sub['url'];
							a.innerHTML = sub['title'];
							a.descr = sub['descr'];
							a.id="menu_"+nr+"_"+subNr;
							subNr++;
							if ((topIndex == index) && (subIndex == subItemIndex))
							{
								subNode.id = 'navSubSelected';
							}

							ul.appendChild(subNode);
						}
					}
				}
				else
				{
					// no subitems
					ul.parentNode.removeChild(ul);
				}

				// do not show empty menus
				if (menuItem.getElementsByTagName('ul').length || mItem['url'])
				{
					navCont.appendChild(menuItem);
				}
			}
			nr++;
		}

		Event.observe(navCont, 'mouseover', this.showDescription.bind(this));
		Event.observe(navCont, 'mouseout', this.hideDescription.bind(this));
	},

	hideCurrentSubMenu: function()
	{
		if ($('navSelected') && $('navSelected').getElementsByTagName('ul')[0])
		{
			$('navSelected').getElementsByTagName('ul')[0].style.visibility = 'hidden';
		}
	},

	showCurrentSubMenu: function()
	{
		if ($('navSelected') && $('navSelected').getElementsByTagName('ul')[0])
		{
			$('navSelected').getElementsByTagName('ul')[0].style.visibility = 'visible';
		}
	},

	showDescription: function(e)
	{
		var a = Event.element(e);
		if ((a.tagName != 'A') || !a.descr)
		{
			this.hideDescription();
			return;
		}

		this.getDescrContainer().update(a.descr);
		this.getDescrContainer().show();
	},

	hideDescription: function()
	{
		this.getDescrContainer().hide();
	},

	getDescrContainer: function()
	{
		if (!this.descrContainer)
		{
			this.descrContainer = $('menuDescription');
		}

		return this.descrContainer;
	}
}

Backend.ThemePreview = Class.create();
Backend.ThemePreview.prototype =
{
	initialize: function(container, select)
	{
		var img = document.createElement('img');
		img.addClassName('themePreview');
		container.appendChild(img);
		select.image = img;

		var change =
			function()
			{
				var img = this.image;

				if (!this.value || 0 == this.value)
				{
					img.hide();
					return;
				}
				else
				{
					img.show();
				}

				img.href = 'theme' + (this.value != 'barebone' ? '/' + this.value : '') + '/preview.png';
				img.title = this.value;
				img.onclick =
					function()
					{
						img.rel = 'lightbox';
						Lightbox.prototype.getInstance().start(img.href);
					}

				img.onload =
					function()
					{
						this.show();
					}

				img.onerror =
					function()
					{
						this.hide();
					}

				img.src = 'theme' + (this.value != 'barebone' ? '/' + this.value : '') + '/preview_small.png';
			}

		change.bind(select)();

		Event.observe(select, 'change', change);
	}
}

/*************************************************
	Language switch menu
*************************************************/
function showLangMenu(display) {
	menu = $('langMenuContainer');
	if (display)
	{
		menu.style.display = 'block';
		new Ajax.Updater('langMenuContainer', langMenuUrl);

		setTimeout("Event.observe(document, 'click', hideLangMenu, true);", 500);
	}
	else
	{
		menu.style.display = 'none';
		Event.stopObserving(document, 'click', hideLangMenu, true);
	}
}

function hideLangMenu()
{
	showLangMenu(false);
}

/*************************************************
	Popup Menu Handler
*************************************************/
/**
 * Popup menu (absolutely positioned DIV's) position handling
 * This class calculates the optimal menu position, so that the
 * menu would always be within visible window boundaries
 **/
PopupMenuHandler = Class.create();
PopupMenuHandler.prototype =
{
	x: 0,
	y: 0,

	initialize: function(xPos, yPos, width, height)
	{
		scrollX = this.getScrollX();
		scrollY = this.getScrollY();

		if ((xPos + width) > (scrollX + this.getWindowWidth()))
		{
			xPos = scrollX + this.getWindowWidth() - width - 40;
		}

		if (xPos < scrollX)
		{
			xPos = scrollX + 1;
		}

		if ((yPos + height) > (scrollY + this.getWindowHeight()))
		{
			yPos = scrollY + this.getWindowHeight() - height - 40;
		}

		if (yPos < scrollY)
		{
			yPos = scrollY + 1;
		}

		this.x = xPos;
		this.y = yPos;
	},

	getByElement: function(element, x, y)
	{
		var inst = new PopupMenuHandler(x, y, element.offsetWidth, element.offsetHeight);
		element.style.left = inst.x + 'px';
		element.style.top = inst.y + 'px';
	},

	getScrollX: function()
	{
		var scrOfX = 0;
		if( typeof( window.pageYOffset ) == 'number' ) {
			//Netscape compliant
			scrOfX = window.pageXOffset;
		}
		else if( document.body && ( document.body.scrollLeft || document.body.scrollTop ) )
		{
			//DOM compliant
			scrOfX = document.body.scrollLeft;
		} else if( document.documentElement && ( document.documentElement.scrollLeft || document.documentElement.scrollTop ) )
		{
			//IE6 standards compliant mode
			scrOfX = document.documentElement.scrollLeft;
		}
		return scrOfX;
	},

	getScrollY: function()
	{
		var scrOfY = 0;
		if( typeof( window.pageYOffset ) == 'number' ) {
			//Netscape compliant
			scrOfY = window.pageYOffset;
		}
		else if( document.body && ( document.body.scrollLeft || document.body.scrollTop ) )
		{
			//DOM compliant
			scrOfY = document.body.scrollTop;
		} else if( document.documentElement && ( document.documentElement.scrollLeft || document.documentElement.scrollTop ) )
		{
			//IE6 standards compliant mode
			scrOfY = document.documentElement.scrollTop;
		}
		return scrOfY;
	},

	getWindowWidth: function()
	{
		var myWidth = 0;
		if( typeof( window.innerWidth ) == 'number' )
		{
			//Non-IE
			myWidth = window.innerWidth;
		}
		else if( document.documentElement && ( document.documentElement.clientWidth || document.documentElement.clientHeight ) )
		{
			//IE 6+ in 'standards compliant mode'
			myWidth = document.documentElement.clientWidth;
		}
		else if( document.body && ( document.body.clientWidth || document.body.clientHeight ) )
		{
			//IE 4 compatible
			myWidth = document.body.clientWidth;
		}
		return myWidth;
	},

	getWindowHeight: function()
	{
		var myHeight = 0;
		if( typeof( window.innerWidth ) == 'number' )
		{
			//Non-IE
			myHeight = window.innerHeight;
		}
		else if( document.documentElement && ( document.documentElement.clientWidth || document.documentElement.clientHeight ) )
		{
			//IE 6+ in 'standards compliant mode'
			myHeight = document.documentElement.clientHeight;
		}
		else if( document.body && ( document.body.clientWidth || document.body.clientHeight ) )
		{
			//IE 4 compatible
			myHeight = document.body.clientHeight;
		}
		return myHeight;
	}
}


/*************************************************
	Browser detector
*************************************************/

/**
 * Browser detector
 * @link http://www.quirksmode.org/js/detect.html
 */
var BrowserDetect = {
	init: function () {
		this.browser = this.searchString(this.dataBrowser) || "An unknown browser";
		this.version = this.searchVersion(navigator.userAgent)
			|| this.searchVersion(navigator.appVersion)
			|| "an unknown version";
		this.OS = this.searchString(this.dataOS) || "an unknown OS";
	},
	searchString: function (data) {
		for (var i=0;i<data.length;i++) {
			var dataString = data[i].string;
			var dataProp = data[i].prop;
			this.versionSearchString = data[i].versionSearch || data[i].identity;
			if (dataString) {
				if (dataString.indexOf(data[i].subString) != -1)
					return data[i].identity;
			}
			else if (dataProp)
				return data[i].identity;
		}
	},
	searchVersion: function (dataString) {
		var index = dataString.indexOf(this.versionSearchString);
		if (index == -1) return;
		return parseFloat(dataString.substring(index+this.versionSearchString.length+1));
	},
	dataBrowser: [
		{   string: navigator.userAgent,
			subString: "OmniWeb",
			versionSearch: "OmniWeb/",
			identity: "OmniWeb"
		},
		{
			string: navigator.vendor,
			subString: "Apple",
			identity: "Safari"
		},
		{
			prop: window.opera,
			identity: "Opera"
		},
		{
			string: navigator.vendor,
			subString: "iCab",
			identity: "iCab"
		},
		{
			string: navigator.vendor,
			subString: "KDE",
			identity: "Konqueror"
		},
		{
			string: navigator.userAgent,
			subString: "Firefox",
			identity: "Firefox"
		},
		{
			string: navigator.vendor,
			subString: "Camino",
			identity: "Camino"
		},
		{	   // for newer Netscapes (6+)
			string: navigator.userAgent,
			subString: "Netscape",
			identity: "Netscape"
		},
		{
			string: navigator.userAgent,
			subString: "MSIE",
			identity: "Explorer",
			versionSearch: "MSIE"
		},
		{
			string: navigator.userAgent,
			subString: "Gecko",
			identity: "Mozilla",
			versionSearch: "rv"
		},
		{	   // for older Netscapes (4-)
			string: navigator.userAgent,
			subString: "Mozilla",
			identity: "Netscape",
			versionSearch: "Mozilla"
		}
	],
	dataOS : [
		{
			string: navigator.platform,
			subString: "Win",
			identity: "Windows"
		},
		{
			string: navigator.platform,
			subString: "Mac",
			identity: "Mac"
		},
		{
			string: navigator.platform,
			subString: "Linux",
			identity: "Linux"
		}
	]

};

BrowserDetect.init();

/*************************************************
	Save confirmation message animation
*************************************************/
Backend.SaveConfirmationMessage = Class.create();
Backend.SaveConfirmationMessage.prototype =
{
	counter: 0,
	timers: {},
	options: {},

	initialize: function(element, options)
	{
		this.element = $(element);

		if(!this.element.id)
		{
			this.element.id = this.getGeneratedId();
		}

		if(!Backend.SaveConfirmationMessage.prototype.timers[this.element.id])
		{
			Backend.SaveConfirmationMessage.prototype.timers[this.element.id] = {};
		}

		if(!this.element.down('div')) this.element.appendChild(document.createElement('div'));
		this.innerElement = this.element.down('div');

		if(options && options.type)
		{
			Element.addClassName(this.element, options.type + 'Message')
		}

		if(options && options.message)
		{
			if(this.innerElement.firstChild) this.innerElement.firstChild.value = options.message;
			else this.innerElement.appendChild(document.createTextNode(options.message));
		}

		var closeButton = this.element.down('.closeMessage');
		if(closeButton)
		{
			this.hideCloseButton(closeButton);

			Event.observe(closeButton, 'mouseover', function(e) { this.showCloseButton(closeButton) }.bind(this) )
			Event.observe(closeButton, 'mouseout', function(e) { this.hideCloseButton(closeButton) }.bind(this) )
			Event.observe(closeButton, 'click', function(e) { this.hide() }.bind(this) )
		}

		this.options = options;

		this.show();
	},

	showCloseButton: function(closeButton)
	{
		try {
			closeButton.setOpacity(1);
		} catch(e) {
			closeButton.style.visibility = 'visible';
		}
	},

	hideCloseButton: function(closeButton)
	{
		try {
			closeButton.setOpacity(0.5);
		} catch(e) {
			closeButton.style.visibility = 'hidden';
		}
	},

	show: function()
	{
		this.stopTimers();
		this.element.hide();

		this.displaying = true;

		//Backend.SaveConfirmationMessage.prototype.timers[this.element.id].scrollEffect = new Effect.ScrollTo(this.element, {offset: -24});
		Backend.SaveConfirmationMessage.prototype.timers[this.element.id].appearEffect = new Effect.Appear(this.element, {duration: 0.4, afterFinish: this.highlight.bind(this)});
	},

	highlight: function()
	{
		//this.innerElement.focus();
		Backend.SaveConfirmationMessage.prototype.timers[this.element.id].effectHighlight = new Effect.Highlight(this.innerElement, { duration: 0.4 });

		// do not hide error or permanent confirmation messages
		if (!this.element.hasClassName('redMessage') && !this.element.hasClassName('bugMessage') && !this.element.hasClassName('stick'))
		{
			Backend.SaveConfirmationMessage.prototype.timers[this.element.id].hideTimeout = setTimeout(function() { this.hide() }.bind(this), 4000);
		}
	},

	hide: function()
	{
		Backend.SaveConfirmationMessage.prototype.timers[this.element.id].fadeEffect = Effect.Fade(this.element, {duration: 0.4});
		Backend.SaveConfirmationMessage.prototype.timers[this.element.id].fadeTimeout = setTimeout(function() { this.displaying = false; }.bind(this), 4000);

		if (this.options && this.options.del/* && this.options.delete !KONQUEROR */)
		{
			this.element.parentNode.removeChild(this.element);
		}
	},

	stopTimers: function()
	{
		if(Backend.SaveConfirmationMessage.prototype.timers[this.element.id].hideTimeout) clearTimeout(Backend.SaveConfirmationMessage.prototype.timers[this.element.id].hideTimeout);
		if(Backend.SaveConfirmationMessage.prototype.timers[this.element.id].fadeTimeout) clearTimeout(Backend.SaveConfirmationMessage.prototype.timers[this.element.id].fadeTimeout);
		if(Backend.SaveConfirmationMessage.prototype.timers[this.element.id].appearEffect) Backend.SaveConfirmationMessage.prototype.timers[this.element.id].appearEffect.cancel();
		if(Backend.SaveConfirmationMessage.prototype.timers[this.element.id].fadeEffect) Backend.SaveConfirmationMessage.prototype.timers[this.element.id].fadeEffect.cancel();
		if(Backend.SaveConfirmationMessage.prototype.timers[this.element.id].effectHighlight) Backend.SaveConfirmationMessage.prototype.timers[this.element.id].effectHighlight.cancel();
	},

	getGeneratedId: function()
	{
		return 'saveConfirmationMessage_' + (Backend.SaveConfirmationMessage.prototype.counter++);
	},

	showMessage: function(message, type)
	{
		if (!type)
		{
			type = 'yellow';
		}

		var el = document.createElement('div');
		el.className = type + 'Message';
		var close = document.createElement('img');
		close.className = 'closeMessage';
		close.src = 'image/silk/cancel.png';

		var confirmations = $('confirmations');
		if (!confirmations)
		{
			confirmations = document.createElement('div');
			confirmations.id = 'confirmations';
			document.body.appendChild(confirmations);
		}

		confirmations.appendChild(el);
		el.appendChild(close);
		new Backend.SaveConfirmationMessage(el, {del: true, message: message});
	}
}

/**
 * Converts between metric and English units
 */
Backend.UnitConventer = Class.create();
Backend.UnitConventer.prototype =
{
	Instances: {},

	initialize: function(root)
	{
		// Get all nodes
		this.nodes = {};
		this.nodes.root = $(root);
		this.nodes.normalizedWeightField = this.nodes.root.down(".UnitConventer_NormalizedWeight");
		this.nodes.unitsTypeField = this.nodes.root.down(".UnitConventer_UnitsType");
		this.nodes.hiValue = this.nodes.root.down('.UnitConventer_HiValue');
		this.nodes.loValue = this.nodes.root.down('.UnitConventer_LoValue');
		this.nodes.switchUnits = this.nodes.root.down('.UnitConventer_SwitchUnits');

		// Add units after fields
		if(!this.nodes.root.down('.UnitConventer_HiUnit'))
		{
		   new Insertion.After(this.nodes.hiValue, '<span class="UnitConventer_HiUnit"> </span>');
		}

		if(!this.nodes.root.down('.UnitConventer_LoUnit'))
		{
			new Insertion.After(this.nodes.loValue, '<span class="UnitConventer_LoUnit"> </span>');
		}

		this.reset();

		// Bind events
		Event.observe(this.nodes.hiValue, "keyup", function(e){ NumericFilter(this); });
		Event.observe(this.nodes.loValue, "keyup", function(e){ NumericFilter(this); });

		Event.observe(this.nodes.hiValue, 'keyup', function(e) { this.updateShippingWeight() }.bind(this));
		Event.observe(this.nodes.loValue, 'keyup', function(e) { this.updateShippingWeight() }.bind(this));
		Event.observe(this.nodes.switchUnits, 'click', function(e) { Event.stop(e); this.switchUnitTypes() }.bind(this));

		this.switchUnitTypes();
		this.switchUnitTypes();
	},

	reset: function()
	{
		this.nodes.switchUnits.update(this.nodes.root.down('.UnitConventer_SwitcgTo' + (this.nodes.unitsTypeField.value == 'ENGLISH' ? 'METRIC' : 'ENGLISH').capitalize() + 'Title').innerHTML);
		this.nodes.root.down('.UnitConventer_HiUnit').innerHTML = this.nodes.root.down('.UnitConventer_'  + this.nodes.unitsTypeField.value.capitalize() + 'HiUnit').innerHTML;
		this.nodes.root.down('.UnitConventer_LoUnit').innerHTML = this.nodes.root.down('.UnitConventer_'  + this.nodes.unitsTypeField.value.capitalize() + 'LoUnit').innerHTML;

		this.nodes.hiValue.value = 0;
		this.nodes.loValue.value = 0;
	},

	getInstance: function(root)
	{
		if (!$(root))
		{
			return false;
		}

		if(!Backend.UnitConventer.prototype.Instances[$(root).id])
		{
			Backend.UnitConventer.prototype.Instances[$(root).id] = new Backend.UnitConventer(root);
		}

		return Backend.UnitConventer.prototype.Instances[$(root).id];
	},

	switchUnitTypes: function()
	{
		this.nodes.switchUnits.update(this.nodes.root.down('.UnitConventer_SwitcgTo' + this.nodes.unitsTypeField.value.capitalize() + 'Title').innerHTML);

		this.nodes.unitsTypeField.value = (this.nodes.unitsTypeField.value == 'ENGLISH') ? 'METRIC' : 'ENGLISH';

		// Change captions
		this.nodes.root.down('.UnitConventer_HiUnit').innerHTML = this.nodes.root.down('.UnitConventer_'  + this.nodes.unitsTypeField.value.capitalize() + 'HiUnit').innerHTML;
		this.nodes.root.down('.UnitConventer_LoUnit').innerHTML = this.nodes.root.down('.UnitConventer_'  + this.nodes.unitsTypeField.value.capitalize() + 'LoUnit').innerHTML;

		var multipliers = this.getWeightMultipliers();

		var hiValue = Math.floor(this.nodes.normalizedWeightField.value / multipliers[0]);
		var loValue = (this.nodes.normalizedWeightField.value - (hiValue * multipliers[0])) / multipliers[1];

		// allow to enter one decimal number for ounces
		var precision = 'ENGLISH' == this.nodes.unitsTypeField.value ? 10 : 1;

		loValue = Math.round(loValue * precision) / precision;

		if ('english' == this.nodes.unitsTypeField.value)
		{
			loValue = loValue.toFixed(0);
		}

		this.nodes.hiValue.value = hiValue;
		this.nodes.loValue.value = loValue;
	},

	getWeightMultipliers: function()
	{
		switch(this.nodes.unitsTypeField.value)
		{
			case 'ENGLISH':
				return [0.45359237, 0.0283495231];

			case 'METRIC':
			default:
				return [1, 0.001]
		}
	},

	updateShippingWeight: function(field)
	{
		var multipliers = this.getWeightMultipliers();
		this.nodes.normalizedWeightField.value = (this.nodes.hiValue.value * multipliers[0]) + (this.nodes.loValue.value * multipliers[1]);
	}
}

/*************************************************
	...
*************************************************/

function slideForm(id, menuId)
{
	Effect.Appear(id, {duration: 0.50});
	Element.hide($(menuId));
}

function restoreMenu(blockId, menuId)
{
	Element.hide($(blockId));
	Element.show($(menuId));
}

/***************************************************
 * Language form
 **************************************************/
Backend.LanguageForm = Class.create();
Backend.LanguageForm.prototype =
{
	initialize: function(root)
	{
		if (root && root.hasClassName('languageForm'))
		{
			var forms = [root];
		}
		else
		{
			var forms = document.getElementsByClassName('languageForm', root);
		}

		for (var k = 0; k < forms.length; k++)
		{
			new TabCustomize(forms[k]);
			var tabs = forms[k].down('ul.languageFormTabs').getElementsByTagName('li');
			for (var t = 0; t < tabs.length; t++)
			{
				if (tabs[t].hasClassName('langTab'))
				{
					tabs[t].onclick = this.handleTabClick.bindAsEventListener(this);
				}
			}
		}
	},

	handleTabClick: function(e)
	{
		var tab = e.innerHTML ? e : Event.element(e);

		// make other tabs inactive
		var tabs = tab.parentNode.getElementsByTagName('li');
		for (var k = 0; k < tabs.length; k++)
		{
			if (tabs[k] != tab)
			{
				Element.removeClassName(tabs[k], 'active');
			}
		}

		Element.toggleClassName(tab, 'active');

		// hide tab contents
		var cont = tab.up('.languageForm').down('.languageFormContent');
		if (cont)
		{
			cont = cont.getElementsByClassName('languageFormContainer');
			for (var k = 0; k < cont.length; k++)
			{
				Element.removeClassName(cont[k], 'active');
			}
		}

		if (Element.hasClassName(tab, 'langTab') && Element.hasClassName(tab, 'active'))
		{
			// get language code
			var id = tab.className.match(/languageFormTabs_([a-z]{2})/)[1];
			Element.addClassName(tab.up('.languageForm').down('.languageFormContainer_' + id), 'active');
		}
	},

	closeTabs: function(container)
	{
		// make other tabs inactive
		var tabs = container.getElementsByTagName('li');
		for (var k = 0; k < tabs.length; k++)
		{
			Element.removeClassName(tabs[k], 'active');
		}

		// hide tab contents
		var cont = container.down('.languageFormContent');
		if (cont)
		{
			cont = cont.getElementsByClassName('languageFormContainer');
			for (var k = 0; k < cont.length; k++)
			{
				Element.removeClassName(cont[k], 'active');
			}
		}
	}
}

/***************************************************
 * MVC
 **************************************************/

MVC = {}
MVC.Model = function() {}
MVC.Model.prototype =
{
	controller: null,

	setController: function(controller)
	{
		this.controller = controller;
		this.notifyAllData(this.controller);
	},

	store: function(name, value)
	{
		if(arguments.length == 1)
		{
			this._data = name;
			if (this.controller)
			{
				this.notifyAllData(this.controller);
			}
		}
		else
		{
			this._data[name] = value;
			if (this.controller)
			{
				this.controller.notifyDataChange(name, value);
			}
		}
	},

	/**
	 *	Notify observers (controllers) that all data has been changed (usually on initial state)
	 */
	notifyAllData: function(recipient, data, prefix)
	{
		if (!data)
		{
			data = this._data;
		}

		if (!prefix)
		{
			prefix = '';
		}

		$H(data).each(function(val)
		{
			if (val[1] instanceof Object)
			{
				this.notifyAllData(recipient, val[1], prefix + val[0] + '.');
			}
			recipient.notifyDataChange(prefix + val[0], val[1]);
		}.bind(this));
	},

	save: function(form, onSaveResponse)
	{
		if(true == this.saving) return;
		this.saving = true;
		this.serverError = false;

		var self = this;

		new LiveCart.AjaxRequest(
			form,
			false,
			function(response)
			{
				var responseHash = {};
				try
				{
					responseHash = eval("(" + response.responseText + ")");
				}
				catch(e)
				{
					responseHash['status'] = 'serverError';
					responseHash['responseText'] = response.responseText;
				}

				this.afterSave(responseHash, onSaveResponse);
			}.bind(this)
		);
	},

	afterSave: function(response, onSaveResponse)
	{
		switch(response.status)
		{
			case 'success':
				this.store('ID', response.ID);
				if (response.data)
				{
					this.store(response.data);
				}
				break;
			case 'failure':
				this.errors = response.errors;
				break;
			case 'serverError':
				this.serverError = response.responseText;
				break;
		}

		onSaveResponse.call(this, response.status);
		this.saving = false;
	}
}

MVC.View = function() {}
MVC.View.prototype =
{
	form: null,

	boundVariables: {},

	assign: function(name, value)
	{
		if(arguments.length == 1)
		{
			this._data = name;
		}
		else
		{
			this._data[name] = value;
		}
	},

	bindForm: function(form)
	{
		this.form = form;
	},

	bindVariable: function(element, variableName)
	{
		if (!element)
		{
			return false;
		}

		this.boundVariables[variableName] = element;
	},

	notifyDataChange: function(name, value)
	{
		if (this.form)
		{
			var element = this.form.elements.namedItem(name);

			if (element)
			{
				element.value = value;
			}
		}

		if (this.boundVariables[name])
		{
			var element = this.boundVariables[name];

			// set value to form elements
			if (element instanceof HTMLInputElement ||
				element instanceof HTMLTextAreaElement ||
				element instanceof HTMLSelectElement ||
				element instanceof HTMLButtonElement)
			{
				element.value = value;
			}

			// innerHTML to others
			else
			{
				element.innerHTML = value;
			}
		}
	}
}

Backend.RegisterMVC = function(MVC)
{
	MVC.Messages = {};
	MVC.Links = {};

	MVC.Model.prototype.defaultLanguage = false;

	MVC.Controller.prototype.notifyDataChange = function(name, value)
	{
		if(this.view)
		{
			this.view.notifyDataChange(name, value);
		}
	}

	MVC.Model.prototype.clear = MVC.View.prototype.clear = function()
	{
		this._data = {};
	}

	MVC.Model.prototype.get = MVC.View.prototype.get = function(name, defaultValue)
	{
		var keys = name.split('.');
		var destination = this._data;
		var found = true;

		try
		{
			$A(keys).each(function(key)
			{
				if(destination[key] === undefined) throw new Error('not found');
				destination = destination[key];
			});
		}
		catch(e)
		{
			found = false;
		}

		return found ? destination : defaultValue;
	}
}

/********************************************************************
 * Select popup
 ********************************************************************/
Backend.SelectPopup = Class.create();
Backend.SelectPopup.prototype = {
	height: 520,
	width:  1000,
	location:  0,
	toolbar:  0,
	onObjectSelect: function() {},

	initialize: function(link, title, options)
	{
		this.link = link;
		this.title = title;

		if(options.onObjectSelect) this.onObjectSelect = options.onObjectSelect;
		this.height = options.height || this.height;
		this.width = options.width || this.width;
		this.location = options.location || this.location;
		this.toolbar = options.toolbar || this.toolbar;

		this.createPopup();
	},

	createPopup: function()
	{
		var createWindow = true;

		try
		{
			if(window.selectPopupWindow && this.link == window.selectPopupWindow.location.pathname)
			{
			   window.selectPopupWindow.focus();
			   createWindow = false;
			}
		}
		catch(e) { }

		if(createWindow)
		{
			Backend.SelectPopup.prototype.popup = window.open(this.link, this.title, 'resizable=1,toolbar=' + this.toolbar + ',location=' + this.location + ',width=' + this.width + ',height=' + this.height);

			Event.observe(window, 'unload', function()
			{
				if(window.selectPopupWindow)
				{
					window.selectPopupWindow.close();
				}
			}, false);

			Backend.SelectPopup.prototype.popup.focus();

			var interval = setInterval(function()
			{
				if(!Backend.SelectPopup.prototype.popup || !Backend.SelectPopup.prototype.popup.Event || !Backend.SelectPopup.prototype.popup.Event.observe)
				{
					return;
				}
				else
				{
					clearInterval(interval)
				}

				Backend.SelectPopup.prototype.popup.Event.observe(Backend.SelectPopup.prototype.popup, "unload", function()
				{
					window.selectPopupWindow = null;
				}.bind(this));

				window.selectPopupWindow = Backend.SelectPopup.prototype.popup;
				window.selectProductPopup = this;


			}.bind(this), 500);
		}
	},

	getSelectedObject: function(objectID, downloadable, indicator)
	{
		this.objectID = objectID;
		this.downloadable = downloadable;
		this.onObjectSelect.call(this, objectID, downloadable, indicator);
	}
}

/********************************************************************
 * Router / Url manipulator
 ********************************************************************/
Backend.Router = Router;

/********************************************************************
 * Progress bar
 ********************************************************************/
Backend.ProgressBar = Class.create();
Backend.ProgressBar.prototype =
{
	container: null,
	counter: null,
	total: null,
	progressBar: null,
	progressBarIndicator: null,

	initialize: function(container)
	{
		this.container = container;

		if (!container.down('.progressCount'))
		{
			this.createHTML();
		}

		this.counter = container.down('.progressCount');
		this.total = container.down('.progressTotal');
		this.progressBar = container.down('.progressBar');
		this.progressBarIndicator = container.down('.progressBarIndicator');
		this.update(0, 0);
	},

	createHTML: function()
	{
		this.container.innerHTML = '<div class="progressBarIndicator"></div><div class="progressBar"><span class="progressCount"></span><span class="progressSeparator"> / </span><span class="progressTotal"></span></div>';
	},

	update: function(progress, total)
	{
		if (progress < 0)
		{
			progress = 0;
		}

		this.counter.update(progress);
		this.total.update(total);

		if (parseFloat(total))
		{
			var progressWidth = (parseFloat(progress) / parseFloat(total)) * this.progressBar.clientWidth;
		}
		else
		{
			var progressWidth = 0;
		}

		this.progressBarIndicator.style.width = progressWidth + 'px';
	},

	getProgress: function()
	{
		return this.counter.innerHTML;
	},

	getTotal: function()
	{
		return this.total.innerHTML;
	},

	rewind: function(progress, total, step, onComplete)
	{
		if (progress > 0)
		{
			progress -= step;
			this.update(progress, total);
			setTimeout(function() { this.rewind(progress, total, step, onComplete) }.bind(this), 40);
		}
		else
		{
			if (onComplete)
			{
				onComplete();
			}
		}
	},

}

/*****************************************
	Multi-instance editor
******************************************/

Backend.MultiInstanceEditor = function(id, owner)
{
	this.id = id ? id : '';
	this.owner = owner;

	this.findUsedNodes();
	this.bindEvents();

	Form.State.backup(this.nodes.form, false, false);
}

Backend.MultiInstanceEditor.prototype =
{
	Links: {},
	Messages: {},
	Instances: {},
	CurrentId: null,

	namespace: null,

	hasInstance: function(id)
	{
		return this.Instances[id] ? true : false;
	},

	getCurrentId: function()
	{
		return this.namespace.prototype.CurrentId;
	},

	setCurrentId: function(id)
	{
		this.namespace.prototype.CurrentId = id;
	},

	craftTabUrl: function(url)
	{
		return url.replace(/_id_/, this.namespace.prototype.getCurrentId());
	},

	craftContentId: function(tabId)
	{
		return tabId + '_' +  this.namespace.prototype.getCurrentId() + 'Content'
	},

	getInstance: function(id, doInit, owner)
	{
		var root = this.namespace.prototype;

		if(!root.Instances[id])
		{
			root.Instances[id] = new this.namespace(id, owner);
		}

		if(doInit !== false)
		{
			root.Instances[id].init();
		}

		root.setCurrentId(id);

		return root.Instances[id];
	},

	getAddInstance: function()
	{
		return new this.namespace('');
	},

	getInstanceContainer: function(id)
	{
		throw 'Implement me';
	},

	getMainContainerId: function()
	{
		throw 'Implement me';
	},

	getAddContainerId: function()
	{
		throw 'Implement me';
	},

	getNavHashPrefix: function()
	{
		throw 'Implement me';
	},

	getListContainer: function()
	{
		throw 'Implement me';
	},

	getActiveGrid: function()
	{
		return false;
	},

	getNavHash: function(id)
	{
		var prefix = this.getNavHashPrefix();
		if (prefix)
		{
			return prefix + id;
		}
	},

	findUsedNodes: function()
	{
		this.nodes = {};
		this.nodes.parent = this.getInstanceContainer(this.id);
		this.nodes.form = this.nodes.parent.down("form");
		this.nodes.cancel = this.nodes.form.down('a.cancel');
		this.nodes.submit = this.nodes.form.down('input.submit');
	},

	bindEvents: function(args)
	{
		Event.observe(this.nodes.cancel, 'click', function(e) { Event.stop(e); this.cancelForm()}.bind(this));
	},

	init: function(args)
	{
		this.namespace.prototype.setCurrentId(this.id);

		Backend.showContainer(this.getMainContainerId());
		this.getListContainer(this.owner).hide();

		this.tabControl = TabControl.prototype.getInstance(this.getMainContainerId(), false);

		this.setPath();
	},

	setPath: function()
	{

	},

	cancelForm: function()
	{
		ActiveForm.prototype.resetErrorMessages(this.nodes.form);
		//Form.restore(this.nodes.form, false, false);

		Backend.hideContainer(this.getMainContainerId());
		this.getListContainer(this.owner).show();

		this.namespace.prototype.setCurrentId(0);
	},

	submitForm: function()
	{
		new LiveCart.AjaxRequest(
			this.nodes.form,
			false,
			function(responseJSON) {
				ActiveForm.prototype.resetErrorMessages(this.nodes.form);
				var responseObject = eval("(" + responseJSON.responseText + ")");
				this.afterSubmitForm(responseObject);
		   }.bind(this)
		);
	},

	afterSubmitForm: function(response)
	{
		if(response.status == 'success')
		{
			var grid = this.getActiveGrid();
			if (grid)
			{
				grid.reloadGrid();
			}

			Form.State.backup(this.nodes.form, false, false);
		}
		else
		{
			ActiveForm.prototype.setErrorMessages(this.nodes.form, response.errors)
		}
	},

	open: function(id, e, onComplete, owner)
	{
		if (e)
		{
			Event.stop(e);

			if(!e.target)
			{
				e.target = e.srcElement
			}

			var progressIndicator = e.target.up('td').down('.progressIndicator');

			progressIndicator.show();
		}

		if (window.opener && window.opener.selectProductPopup)
		{
			window.opener.selectProductPopup.getSelectedObject(id);
			return;
		}

		var root = this.namespace.prototype;

		root.setCurrentId(id);

		var tabControl = TabControl.prototype.getInstance(
			root.getMainContainerId(owner),
			root.craftTabUrl.bind(this),
			root.craftContentId.bind(this)
		);

		tabControl.activateTab(null,
								   function(response)
								   {
										root.getInstance(id, true, owner);
										var navHash = root.getNavHash(id);
										if (navHash)
										{
											Backend.ajaxNav.add(navHash);
										}

										if (progressIndicator)
										{
											progressIndicator.hide();
										}
								   });

		if(root.hasInstance(id))
		{
			root.getInstance(id);
		}
	},

	resetEditors: function()
	{
		this.namespace.prototype.Instances = {};
		this.namespace.prototype.CurrentId = null;

		$(this.getMainContainerId(this.ownerID)).down('.sectionContainer').innerHTML = '';

		TabControl.prototype.__instances__ = {};
	},

	showAddForm: function(caller)
	{
		var container = $(this.getAddContainerId());

		// product form has already been downloaded
		if (this.formTabCopy)
		{
			container.update('');
			container.appendChild(this.formTabCopy);
			this.initAddForm();
		}

		// retrieve product form
		else
		{
			var url = this.Links.add;
			new LiveCart.AjaxUpdater(url, container, caller.up('.menu').down('.progressIndicator'), null, this.initAddForm.bind(this));
		}
	},

	hideAddForm: function()
	{
		if ($(this.getAddContainerId()))
		{
			Element.hide($(this.getAddContainerId()));
		}

		if (this.getListContainer())
		{
			Element.show(this.getListContainer());
		}
	},

	cancelAdd: function(noHide)
	{
		container = $(this.getAddContainerId());

		if (!noHide)
		{
			Element.hide(container);
			Element.show(this.getListContainer());
		}

		ActiveForm.prototype.destroyTinyMceFields(container);
		this.formTabCopy = container.down('form');
	},

	resetAddForm: function(form)
	{
		ActiveForm.prototype.resetTinyMceFields(form);
	},

	initAddForm: function()
	{
		container = $(this.getAddContainerId());

		Element.hide(this.getListContainer());
		Element.show(container);

		if (window.tinyMCE)
		{
			tinyMCE.idCounter = 0;
		}

		ActiveForm.prototype.initTinyMceFields(container);

		this.reInitAddForm(container);

		ActiveForm.prototype.resetErrorMessages(container.down('form'));

		var cancel = container.down('a.cancel');
		if (cancel)
		{
			Event.observe(cancel, 'click', function(e) { this.cancelAdd(); Event.stop(e); }.bind(this));
		}
	},

	saveAdd: function(e)
	{
		Event.stop(e);
		var instance = this.getAddInstance();
		instance.submitForm();
		return instance;
	},

	reInitAddForm: function(container)
	{
	}
}

var TabCustomize = Class.create();
TabCustomize.prototype =
{
	tabList: null,

	moreTabs: null,

	moreTabsMenu: null,

	saveUrl: null,

	initialize: function(tabList)
	{
		this.tabList = tabList;

		if (!(this.tabList instanceof HTMLUListElement))
		{
			this.tabList = this.tabList.down('ul');
		}

		this.moreTabs = tabList.parentNode.down('.moreTabs');

		if (this.moreTabs)
		{
			this.moreTabsMenu = this.moreTabs.down('.moreTabsMenu');
			Event.observe(this.moreTabs, 'click', this.toggleMenu.bindAsEventListener(this));

			// set background for moreTabs
			var el = this.moreTabs.parentNode;
			while (el && el.getStyle('background-color') == 'transparent')
			{
				el = el.parentNode;
			}

			if (el)
			{
				this.moreTabs.style.backgroundColor = el.getStyle('background-color');
			}
		}

		this.setPrefsSaveUrl(Backend.Router.createUrl('backend.index', 'setUserPreference'));
	},

	setPrefsSaveUrl: function(url)
	{
		this.saveUrl = url;
	},

	toggleMenu: function(e)
	{
		Event.stop(e);

		this.moreTabsMenu.innerHTML = '';
		var cloned = this.tabList.cloneNode(true);
		this.moreTabsMenu.appendChild(cloned);
		cloned.removeClassName('languageFormTabs');

		$A(cloned.getElementsBySelector('li.hidden')).reverse().each(function(el)
		{
			el.parentNode.insertBefore(el, el.parentNode.firstChild);
		});

		$A(cloned.getElementsBySelector('li')).each(function(el)
		{
			var anchor = el.down('a');
			if (anchor)
			{
				anchor.parentNode.replaceChild(document.createTextNode(anchor.firstChild.data), anchor);
			}

			el.id = 'toggle_' + el.id;
			Event.observe(el, 'click', this.toggleVisibility.bindAsEventListener(this));

			if (el.hasClassName('languageFormCaption'))
			{
				el.parentNode.removeChild(el);
			}
		}.bind(this));

		this.moreTabsMenu.show();

		Event.observe(document, 'click', this.hideMenu.bindAsEventListener(this), true);
	},

	toggleVisibility: function(e)
	{
		Event.stop(e);

		var li = Event.element(e);
		if ('LI' != li.tagName)
		{
			li = li.up('li');
		}

		var id = li.id.substr(7);

		var tab = this.tabList.down('#' + id);

		if (li.hasClassName('hidden'))
		{
			this.setVisible(tab, e);
		}
		else
		{
			this.setHidden(tab);
		}

		this.setPreference(tab);
		this.hideMenu();
	},

	setVisible: function(tab, e)
	{
		tab.removeClassName('hidden');
		tab.onclick(tab);
	},

	setHidden: function(tab)
	{
		tab.addClassName('hidden');
	},

	hideMenu: function()
	{
		this.moreTabsMenu.hide();
		this.moreTabsMenu.innerHTML = '';

		Event.stopObserving(document, 'click', this.hideMenu.bindAsEventListener(this), true);
	},

	setPreference: function(li)
	{
		var id = li.id.split(/__/).pop();

		var url = Backend.Router.setUrlQueryParam(this.saveUrl, 'key', 'tab_' + id);
		var url = Backend.Router.setUrlQueryParam(url, 'value', !li.hasClassName('hidden'));
		new LiveCart.AjaxRequest(url);
	}
}

/************* Tooltips **************/

var tooltip=function(){
 var id = 'tt';
 var top = 3;
 var left = 3;
 var maxw = 350;
 var speed = 10;
 var timer = 20;
 var endalpha = 95;
 var alpha = 0;
 var tt,t,c,b,h;
 var ie = document.all ? true : false;
 return{
  show:function(v,w){
   if(tt == null){
    tt = document.createElement('div');
    tt.setAttribute('id',id);
    t = document.createElement('div');
    t.setAttribute('id',id + 'top');
    c = document.createElement('div');
    c.setAttribute('id',id + 'cont');
    b = document.createElement('div');
    b.setAttribute('id',id + 'bot');
    tt.appendChild(t);
    tt.appendChild(c);
    tt.appendChild(b);
    document.body.appendChild(tt);
    tt.style.opacity = 0;
    tt.style.filter = 'alpha(opacity=0)';
    document.onmousemove = this.pos;
   }
   tt.style.display = 'block';
   c.innerHTML = v;
   tt.style.width = w ? w + 'px' : 'auto';
   if(!w && ie){
    t.style.display = 'none';
    b.style.display = 'none';
    tt.style.width = tt.offsetWidth;
    t.style.display = 'block';
    b.style.display = 'block';
   }
  if(tt.offsetWidth > maxw){tt.style.width = maxw + 'px'}
  h = parseInt(tt.offsetHeight) + top;
  clearInterval(tt.timer);
  tt.timer = setInterval(function(){tooltip.fade(1)},timer);
  },
  pos:function(e){
   var u = ie ? event.clientY + document.documentElement.scrollTop : e.pageY;
   var l = ie ? event.clientX + document.documentElement.scrollLeft : e.pageX;
   var y = u - h;
   var x = l + left;

   if (y < 0)
   {
	   y = 0;
   }

   if (x < 0)
   {
	   x = 0;
   }

   tt.style.top = y + 'px';
   tt.style.left = x + 'px';
  },
  fade:function(d){
   var a = alpha;
   if((a != endalpha && d == 1) || (a != 0 && d == -1)){
    var i = speed;
   if(endalpha - a < speed && d == 1){
    i = endalpha - a;
   }else if(alpha < speed && d == -1){
     i = a;
   }
   alpha = a + (i * d);
   tt.style.opacity = alpha * .01;
   tt.style.filter = 'alpha(opacity=' + alpha + ')';
  }else{
    clearInterval(tt.timer);
     if(d == -1){tt.style.display = 'none'}
  }
 },
 hide:function(){
  clearInterval(tt.timer);
   tt.timer = setInterval(function(){tooltip.fade(-1)},timer);
  }
 };
}();



/***************************************************
 * library/KeyboardEvent.js
 ***************************************************/

/**
 * KeyboardEvent's task is to provide cross-browser suport for handling keyboard
 * events. It provides function to get current button code and char, shift status, etc
 *
 * @todo Caps lock support
 *
 * @author   Integry Systems
 *
 */
var KeyboardEvent = Class.create();
KeyboardEvent.prototype = {
	/**
	 * Tab key
	 *
	 * @var int
	 */
	KEY_TAB:	9,

	/**
	 * Enter key
	 *
	 * @var int
	 */
	KEY_ENTER:  13,

	/**
	 * Shift key
	 *
	 * @var int
	 */
	KEY_SHIFT:  16,

	/**
	 * Escape key
	 *
	 * @var int
	 */
	KEY_ESC:	27,

	/**
	 * Up key
	 *
	 * @var int
	 */
	KEY_UP:	 38,

	/**
	 * Down key
	 *
	 * @var int
	 */
	KEY_DOWN:   40,

	/**
	 * Left key
	 *
	 * @var int
	 */
	KEY_LEFT:	 37,

	/**
	 * Right key
	 *
	 * @var int
	 */
	KEY_RIGHT:   39,

	/**
	 * Delete key
	 *
	 * @var int
	 */
	KEY_DEL:	46,

	/**
	 * Constructor
	 *
	 * @param WindowEvent e Event object (for explorer it will be auto-detected. If you decide to pass it anyway then passed event will be used)
	 *
	 * @access public
	 */
	initialize: function(e)
	{
		if (!e && window.event)
		{
			e = window.event; // IE
			e.target = e.srcElement;
		}

		this.event = e;
	},
	
	init: function(e)
	{
		return new KeyboardEvent(e);
	},

	/**
	 * Determines which key (number) was pressed
	 *
	 * @access public
	 *
	 * @return int Key number
	 */
	getKey: function()
	{
		return this.event.which ? this.event.which : ( this.event.keyCode ? this.event.keyCode : ( this.event.charCode ? this.event.charCode : 0 ) );
	},


	/**
	 * Determines which char was pressed. It will also check if shift button
	 * was hold and return upercase if it was. So far no support for caps lock
	 *
	 * @access public
	 *
	 * @todo Caps lock support
	 *
	 * @return int Key number
	 */
	getChar: function()
	{
		var string = String.fromCharCode(this.getKey());

		if(!this.isShift()) string = string.toLowerCase();

		return string;
	},

	/**
	 * Check if shift was pressed while inputing the letter
	 *
	 * @access public
	 *
	 * @return bool
	 */
	isShift: function()
	{
		return this.event.shiftKey || ( this.event.modifiers && ( this.event.modifiers & 4 ) );;
	},

	isPrintable: function()
	{
		var key = this.getKey();

		// [A-Za-z0-9]
		return (key > 64 && key < 91) || (key > 96 && key < 123) || (key > 47 && key < 58);
	},

	/**
	 * Deselects any window text (except in controls)
	 *
	 * @access public
	 */
	deselectText: function()
	{
		if (document.selection)
		{
			document.selection.empty();
		}
		else if (window.getSelection)
		{
			window.getSelection().removeAllRanges();
		}
	},

	/**
	 * Get cursor position in the text
	 *
	 * @access public
	 */
	getCursorPosition: function()
	{
		if(document.selection)
		{
			return document.selection;
		}
		else if(this.event.target.selectionStart)
		{
			return this.event.target.selectionStart;
		}
		else
		{
			return false;
		}
	},
	
	isEnter: function()
	{
		return this.getKey() == this.KEY_ENTER;
	}
}




/***************************************************
 * library/form/Validator.js
 ***************************************************/

/**
 *	@author Integry Systems
 */

function validateForm(form)
{
	Element.saveTinyMceFields(form);
	ActiveForm.prototype.resetErrorMessages(form);

	var isFormValid = true;
	var focusField = true;

	$H(form._validator.value.evalJSON()).each(function(checks)
	{
		var formElement = form[checks.key];
		if (!formElement) return;

		$H(checks.value).each(function(formElement, check)
		{
			if (window[check.key] && !window[check.key](formElement, check.value.param)) // If element is not valid
			{
				// radio button group
				if (!formElement.parentNode && formElement.length)
				{
					formElement = formElement[formElement.length - 1];
				}

				ActiveForm.prototype.setErrorMessage(formElement, check.value.error, focusField);
				isFormValid = false;
				focusField = false;
				throw $break;
			}
		}.bind(this, formElement));
	}.bind(this));

	return isFormValid;
}

function applyFilters(form, ev)
{
	if(!ev || !ev.target)
	{
		ev = window.event;
		ev.target = ev.srcElement;
	}

	var filterData = form.elements.namedItem('_filter').value;
	var filter = filterData.evalJSON();

	var element = ev.target;
	elementFilters = filter[element.name];

	if ('undefined' == elementFilters)
	{
	  	return false;
	}

	for (k in elementFilters)
	{
		if (typeof elementFilters[k] == 'object' && window[k])
		{
			eval(k + '(element, elementFilters[k]);');
		}
	}
}

/*********************************************
	Checks (validators)
*********************************************/
function trim(strValue)
{
 	var objRegExp = /^(\s*)$/;
	//check for all spaces
	if(objRegExp.test(strValue))
	{
		strValue = strValue.replace(objRegExp, '');
	   	if( strValue.length == 0)
	   	{
			return strValue;
	   	}
	}
   	//check for leading & trailing spaces
   	objRegExp = /^(\s*)([\W\w]*)(\b\s*$)/;
   	if(objRegExp.test(strValue))
   	{
	   //remove leading and trailing whitespace characters
	   strValue = strValue.replace(objRegExp, '$2');
	}
  	return strValue;
}

function IsNotEmptyCheck(element, params)
{
	// radio buttons
	if (!element.parentNode && element.length)
	{
		for (k = 0; k < element.length; k++)
		{
			if (element[k].checked)
			{
				return true;
			}
		}
	}

	else
	{
		if (element.getAttribute("type") == "checkbox")
		{
			return element.checked;
		}

		return (element.value.length > 0);
	}
}

function IsEmptyCheck(element, params)
{
	return !IsNotEmptyCheck(element, params);
}

function MinLengthCheck(element, params)
{
	return (element.value.length >= params.minLength);
}

function IsLengthBetweenCheck(element, params)
{
	var len = element.value.length;
	return ((len >= params.minLength && len <= params.maxLength) || (len == 0 && params.allowEmpty));
}

function PasswordEqualityCheck(element, params)
{
	return (element.value == element.form.elements.namedItem(params.secondPasswordFieldname).value);
}

function MaxLengthCheck(element, params)
{
	return (element.value.length <= params.maxLength);
}

function IsValidEmailCheck(el, params)
{
	var pattern = /^[a-zA-Z0-9][a-zA-Z0-9\._\-]+@[a-zA-Z0-9_\-][a-zA-Z0-9\._\-]+\.[a-zA-Z]{2,}$/;
	return el.value.match(pattern);
}

function IsValueInSetCheck(element, params)
{

}

function IsNumericCheck(element, constraint)
{
  	if (element.value == '')
  	{
  		return true;
  	}
	re = new RegExp(/(^-?\d+\.\d+$)|(^-?\d+$)|(^-?\.\d+$)/);
	return(re.exec(element.value));
}

function IsIntegerCheck(element, constraint)
{
  	if (constraint.letEmptyString && element.value == '')
  	{
  		return true;
  	}
	re = new RegExp(/^-?\d+$/);
	return(re.exec(element.value));
}

function MinValueCheck(element, constraint)
{
  	return element.value >= constraint.minValue || element.value == '';
}

function MaxValueCheck(element, constraint)
{
  	return element.value <= constraint.maxValue || element.value == '';
}

function IsEqualCheck(element, params)
{
	return (element.value == params.value);
}

function IsNotEqualCheck(element, params)
{
	return (element.value != params.value);
}

function IsFileTypeValidCheck(element, params)
{
	if (!element.value)
	{
		return true;
	}

	var ext = element.value.split(/\./).pop().toLowerCase();
	return params.extensions.indexOf(ext) > -1;
}

function IsFileUploadedCheck(element, params)
{
	if (element.value.length > 0)
	{
		return true;
	}
}

function OrCheck(element, constraints)
{
	var form = element.form ? element.form : $A(element)[0].form;

	var pass = false;
	constraints.each(function(constraint)
	{
		if (!window[constraint[1]])
		{
			pass = true;
			return;
		}

		var valFunc = eval(constraint[1]);
		var el = form.elements.namedItem(constraint[0]);
		var params = constraint[2];

		if (el && valFunc(el, params))
		{
			pass = true;
		}
	});

	return pass;
}

/*********************************************
	Filters
*********************************************/
function NumericFilter(elm, params)
{
	var value = elm.value;

	// Remove leading zeros
	value = value.replace(/^0+/, '');
	if(!value) return;

	value = value.replace(',' , '.');

	// only keep the last comma
	parts = value.split('.');

	value = '';
	for (k = 0; k < parts.length; k++)
	{
		value += parts[k] + ((k == (parts.length - 2)) && (parts.length > 1) ? '.' : '');
	}

	// split digits and decimal part
	parts = value.split('.');

	// leading comma (for example: .5 converted to 0.5)
	if ('' == parts[0] && 2 == parts.length)
	{
	  	parts[0] = '0';
	}

	//next remove all characters save 0 though 9
	//in both elms of the array
	dollars = parts[0].replace(/^-?[^0-9]-/gi, '');

	if ('' != dollars && '-' != dollars)
	{
		dollars = parseInt(dollars);

		if(!dollars) dollars = 0;
	}

	if (2 == parts.length)
	{
		cents = parts[1].replace(/[^0-9]/gi, '');
		dollars += '.' + cents;
	}

	elm.value = dollars;
}

function IntegerFilter(element, params)
{
	element.value = element.value.replace(/[^\d]/, '');
	element.value = element.value.replace(/^0/, '');

	if(element.value == '')
	{
		element.value = 0;
	}
}

function RegexFilter(element, params)
{
	var regex = new RegExp(params['regex'], 'gi');
	element.value = element.value.replace(regex, '');
}


/***************************************************
 * library/form/ActiveForm.js
 ***************************************************/

/**
 * ActiveForm will most likely work in pair with ActiveList. While ActiveList handles ActiveRecords ActiveForm handles new instances, which are not yet saved in database.
 *
 * It's main feature is to show/hide the new form and the link to this form. It allso show/hide
 * the progress indicator for new forms and generates valid handle from title
 *
 * @author   Integry Systems
 */
ActiveForm = Class.create();
ActiveForm.prototype = {


	/**
	 * Generate valid handle from item title
	 *
	 * @param string title Input title
	 * @return string valid handle
	 */
	generateHandle: function(title)
	{
		var handle = title.toLowerCase();
		var sep = '_';

		handle = handle.replace(/(?:(?:^|\n)\s+|\s+(?:$|\n))/g,""); // trim
		handle = handle.replace(/[^a-z_\d \.]/g, ""); // remove all illegal simbols
		// handle = handle.replace(/^[\d\_]+/g, "."); // replace first digits with "."
		handle = handle.replace(/ /g, sep); // replace spaces with "."

		// replace repeating dots with one
		var oldHandle = '';
		while (oldHandle != handle)
		{
		  	oldHandle = handle;
		  	handle = handle.replace(/\_+/g, "_");
		}

		// replace leading and ending dots
		handle = handle.replace(/^\_/g, "");
		handle = handle.replace(/\_$/g, "");

		return handle;
	},

	resetErrorMessages: function(form)
	{
		if ('form' != form.tagName.toLowerCase())
		{
			form = form.down('form');
		}

		if (!form.elements)
		{
			return;
		}

		var messages = document.getElementsByClassName('errorText', form);
		for (var k = 0; k < messages.length; k++)
		{
			messages[k].innerHTML = '';
			messages[k].style.display = 'none';
		}

		for (var k = 0; k < form.elements.length; k++)
		{
			form.elements.item(k).removeClassName('hasError');
		}
	},

	resetErrorMessage: function(formElement)
	{
		formElement.removeClassName('hasError');
		var parent = $($(formElement).up());
		if (!parent)
		{
			return;
		}

		var errorText = parent.down(".errorText");

		if (errorText)
		{
		  	errorText.innerHTML = '';
		  	errorText.style.display = 'none';
		  	Element.addClassName(errorText, 'hidden');
		}
	},

	setErrorMessages: function(form, errorMessages)
	{
		if ('form' != form.tagName.toLowerCase()) form = form.down('form');

		var focusField = true;
		$H(errorMessages).each(function(error)
		{
			if (form.elements.namedItem(error.key))
		  	{
				var formElement = form.elements.namedItem(error.key);
				var errorMessage = error.value;

				ActiveForm.prototype.setErrorMessage(formElement, errorMessage, focusField);
				focusField = false;
			}
		});
	},

	setErrorMessage: function(formElement, errorMessage, focusField)
	{
		if (focusField)
		{
			Element.focus(formElement);
		}

		formElement.addClassName('hasError');

		var errorContainer = $(formElement.parentNode).down(".errorText");
		if (errorContainer)
		{
			errorContainer.innerHTML = errorMessage;
		  	Element.removeClassName(errorContainer, 'hidden');
			Effect.Appear(errorContainer);
		}
		else
		{
			console.info("Please add \n...\n <div class=\"errorText hidden\"></div> \n...\n after " + formElement.name);
		}
	},

	updateNewFields: function(className, ids, parent)
	{
		ids = $H(ids);
		ids.each(function(transformation) { transformation.value = new RegExp(transformation.value);   });
		var attributes = ['class', 'name', 'id', 'for'];
		var attributesLength = attributes.length;
		var fields = $A(document.getElementsByClassName(className));

		fields.each(function(element)
		{
			for(var a = 0; a < attributesLength; a++)
			{
			   var attr = attributes[a];
			   ids.each(function(transformation) {
				   if (element[attr]) element[attr] = element[attr].replace(transformation.value, transformation.key);
			   });
			};
		});
	},

	lastTinyMceId: 0,

	disabledTextareas: {},
	lastDisabledTextareaId: 1,
	idleTinyMCEFields: {},

	initTinyMceFields: function(container)
	{
		if (!window.tinyMCE)
		{
			return false;
		}

		if ($(container).down('.mceEditor'))
		{
			return;
		}

		var textareas = $(container).getElementsBySelector('textarea.tinyMCE');
		for (k = 0; k < textareas.length; k++)
		{
			if (textareas[k].readOnly)
			{
				textareas[k].style.display = 'none';
				new Insertion.After(textareas[k], '<div class="disabledTextarea" id="disabledTextareas_' + (ActiveForm.prototype.lastDisabledTextareaId++) + '">' + textareas[k].value + '</div>');
				var disabledTextarea = textareas[k].up().down('.disabledTextarea');
				ActiveForm.prototype.disabledTextareas[disabledTextarea.id] = disabledTextarea;

				var hoverFunction = function()
				{
					$H(ActiveForm.prototype.disabledTextareas).each(function(iter)
					{
						iter.value.style.backgroundColor = '';
						iter.value.style.borderStyle = '';
						iter.value.style.borderWidth = '';
					});
				}

				Event.observe(document.body, 'mousedown', hoverFunction, true);
				Event.observe(disabledTextarea, 'click', function()
				{
					this.style.backgroundColor = '#ffc';
					this.style.borderStyle = 'inset';
					this.style.borderWidth = '2px';
				}, true);

			}
			else
			{
				textareas[k].tinyMCEId = (this.lastTinyMceId++);
				if (!textareas[k].id)
				{
					textareas[k].id = 'tinyMceControll_' + textareas[k].tinyMCEId;
				}

				if (!ActiveForm.prototype.idleTinyMCEFields[textareas[k].id])
				{
					ActiveForm.prototype.idleTinyMCEFields[textareas[k].id] = window.setInterval(function(tinyMCEField)
					{
						if(!tinyMCEField || 0 >= tinyMCEField.offsetHeight) return;
						window.clearInterval(ActiveForm.prototype.idleTinyMCEFields[tinyMCEField.id]);
						tinyMCE.execCommand('mceAddControl', true, tinyMCEField.id);
						ActiveForm.prototype.idleTinyMCEFields[tinyMCEField.id] = null;
					}.bind(this, textareas[k]), 100);
				}
			}
		}
	},

	destroyTinyMceFields: function(container)
	{
		if (!window.tinyMCE)
		{
			return false;
		}

		var textareas = container.getElementsBySelector('textarea.tinyMCE');
		for (k = 0; k < textareas.length; k++)
		{
			if (textareas[k].readOnly)
			{
				textareas[k].style.display = 'block';
				var disabledTextarea = textareas[k].up().down('.disabledTextarea');
				if (disabledTextarea)
				{
					Element.remove(disabledTextarea);
					delete ActiveForm.prototype.disabledTextareas[disabledTextarea.id];
				}

			}
			else
			{
				if (tinyMCE.getInstanceById(textareas[k].id))
				{
					tinyMCE.execCommand('mceRemoveControl', false, textareas[k].id);
					window.clearInterval(ActiveForm.prototype.idleTinyMCEFields[textareas[k].id]);
				}
			}
		}
	},

	resetTinyMceFields: function(container)
	{
		if (!window.tinyMCE)
		{
			return false;
		}

		var textareas = container.getElementsBySelector('textarea.tinyMCE');
		for(k = 0; k < textareas.length; k++)
		{
			if (textareas[k].readonly)
			{
				continue;
			}
			tinyMCE.execInstanceCommand(textareas[k].id, 'mceSetContent', true, '', true);
		}
	}
}


ActiveForm.Slide = Class.create();
ActiveForm.Slide.prototype = {
	initialize: function(ul)
	{
		this.ul = $(ul);
	},

	show: function(className, form, ignoreFields, onCompleteCallback)
	{
		// Show progress indicator
		this.ul.getElementsBySelector(".progressIndicator").invoke("show");

		setTimeout(function(className, form, ignoreFields, onCompleteCallback)
		{
			if(typeof(ignoreFields) == 'function')
			{
				onCompleteCallback = ignoreFields;
				ignoreFields = [];
			}

			if(form)
			{
				Effect.BlindDown(form, {duration: 0.3});
				Effect.Appear(form, {duration: 0.66});

				setTimeout(function() {
					form.style.display = 'block';
					form.style.height = 'auto';
				}, 700);
			}

			ignoreFields = ignoreFields || [];
			var form = $(form);
			var cancel = this.ul.down("." + className + 'Cancel');

			this.ul.childElements().invoke("hide");
			if(cancel)
			{
				Element.show(this.ul.down("." + className + 'Cancel'));
			}

			$A(form.getElementsByTagName("input")).each(function(input)
			{
				if(input.type == 'text')
				{
					input.focus();
					throw $break;
				}
			});

			if(window.Form.State && !Form.State.hasBackup(form)) Form.State.backup(form, ignoreFields);
			if(window.ActiveList) ActiveList.prototype.collapseAll();
			ActiveForm.prototype.initTinyMceFields(form);

			if(onCompleteCallback)
			{
				onCompleteCallback();
			}
		}.bind(this, className, form, ignoreFields, onCompleteCallback), 10);
	},

	hide: function(className, form, ignoreFields, onCompleteCallback)
	{
		// Hide progress indicator
		this.ul.getElementsBySelector(".progressIndicator").invoke("hide");

		setTimeout(function(className, form, ignoreFields, onCompleteCallback)
		{
			if(typeof(ignoreFields) == 'function')
			{
				onCompleteCallback = ignoreFields;
				ignoreFields = [];
			}

			ignoreFields = ignoreFields || [];
			var form = $(form);

			if(window.Form.State) Form.State.restore(form, ignoreFields);
			ActiveForm.prototype.destroyTinyMceFields(form);

			if(form)
			{
				Effect.Fade(form, {duration: 0.2});
				Effect.BlindUp(form, {duration: 0.3});
				setTimeout(
					function()
					{
						form.style.display = 'none';

						if (onCompleteCallback)
						{
							onCompleteCallback();
						}

					}, 300);
			}

			this.ul.childElements().each(function(element)
			{
				if(!element.className.match(/Cancel/))
				{
					Element.show(element);
				}
				else
				{
					Element.hide(element);
				}
			});

		}.bind(this, className, form, ignoreFields, onCompleteCallback), 10);
	}
}


/**
 * Extend focus to use it with TinyMce fields.
 *
 * @example
 *	 <code> Element.focus(element) </code>
 *
 *   This won't work
 *	 <code>
 *		 $(element).focus();
 *		 element.focus();
 *	 </code>
 *
 * @param HTMLElement element
 */
Element.focus = function(element)
{
	var styleDisplay = element.style.display;
	var styleHeight = element.style.height;
	var styleVisibility = element.style.visibility;
	var elementType = element.type;

	if ('none' == element.style.display || "hidden" == element.type)
	{
		if (Element.isTinyMce(element)) element.style.height = '80px';

		element.style.visibility = 'hidden';
		element.style.display = 'block';
		try { element.type = elementType; } catch(e) {}
		element.focus();
		element.style.display = styleDisplay;
		element.style.height = styleHeight;
		element.style.visibility = styleVisibility;
		try { element.type = elementType; } catch(e) {}

		if (Element.isTinyMce(element)) element.style.height = '1px';
	}
	else
	{
		element.focus();
	}

	if (Element.isTinyMce(element))
	{
		var inst = tinyMCE.getInstanceById(element.nextSibling.down(".mceEditorIframe").id);
		tinyMCE.execCommand("mceStartTyping");
		inst.contentWindow.focus();
	}
}

/**
 * Check if field is tinyMce field
 *
 * @example
 *	 <code> Element.isTinyMce(element) </code>
 *
 * @param HTMLElement element
 */
Element.isTinyMce = function(element)
{
	if (!window.tinyMCE)
	{
		return false;
	}

	return element.nextSibling && element.nextSibling.nodeType != 3 && Element.hasClassName(element.nextSibling, "mceEditorContainer");
}

/**
 * Copies data from TinyMce to textarea.
 *
 * Normally it would be copied automatically on form submit, but since validator overrides
 * form.submit() we should submit all fields ourself. Note that I'm calling this funciton
 * from validation, so most of the time there is no need to worry.
 *
 * @example
 *	 <code> Element.saveTinyMceFields(element) </code>
 *
 * @param HTMLElement element
 */
Element.saveTinyMceFields = function(element)
{
	if (!window.tinyMCE)
	{
		return false;
	}

	tinyMCE.triggerSave();

	document.getElementsByClassName("mceEditor", element).each(function(mceControl)
	{
		 var id = mceControl.id.substr(0, mceControl.id.length - 7);
		 var mce = tinyMCE.get(id);
		 if (mce)
		 {
		 	mce.save();
		 }
	});
}

Form.focus = function(form)
{
	form = $(form);

	if(form.tagName != 'FORM')
	{
		form = form.down('form');
	}

	if(form)
	{
		var firstElement = form.down('input[type=text]');

		if(firstElement)
		{
			firstElement.focus();
		}
	}
}


/***************************************************
 * library/form/State.js
 ***************************************************/

/**
 * Form.State - is used to remember last valid form state.
 *
 * @example Assume you have changed original form values and then saved it with ajax request.
 *		  Now if you hit the reset button form fields will be set to original values which are
 *		  out of date because you have saved form with ajax.
 *
 *		  The solution is to save form (Form.backup(form);) state (all form values) when you click save and get success
 *		  response. Later when you click reset button you should prevent it's default action and restore last valid
 *		  form values (Form.restore(form);)
 *
 *
 * This class etends "Prototype" framework's Form class with these static methods:
 *	 Form.backup(form)	 - Create form's backup copy
 *	 Form.restore(form)	- Restore form's backup copy
 *	 Form.hasBackup(form)  - Check if form has a backup copy
 *
 * Be aware as the backup does not store all form elemens (only values), so if you dinamically removed form field
 * after backup was done there is no way to restore.
 *
 * @author   Integry Systems
 *
 */
if (Form == undefined)
{
	var Form = {}
}

Form.State = {
	/**
	 * Hash table of all backups. Every backed up form should store it's backup id (this is done in backup method)
	 * Also fields are indexed by field name and not the id, s therefore there is no need to add id to every field
	 *
	 * @var array
	 *
	 * @access private
	 * @static
	 */
	backups: [],

	/**
	 * Backup id autoincrementing value
	 *
	 * @var int
	 *
	 * @access private
	 * @static
	 */
	counter: 1,

	/**
	 * Get new ID for the form
	 */
	getNewId: function()
	{
		return this.counter++;
	},


	/**
	 * Backup form values
	 *
	 * @param HtmlFormElement form Form node
	 *
	 * @access public
	 * @static
	 */
	backup: function(form, ignoreFields, backupOptions)
	{
		ignoreFields = $A(ignoreFields || []);
		backupOptions = backupOptions === undefined ? true : backupOptions;
		
		
		if(!this.hasBackup(form))
		{
			form.backupId = this.getNewId();
		}

		this.backups[form.backupId] = {};

		Form.getElements(form).each(function(form, ignoreFields, element)
		{
			if(element.name == '') return;
			if(ignoreFields.member(element.name)) return;
			
			var name = element.name;

			var value = {}
			value.value = element.value;
			value.selectedIndex = element.selectedIndex;
			value.checked = element.checked;
			value.style = {}
			value.style.display = element.style.display;
			value.style.visibility = element.style.visibility;

			if(element.options && backupOptions)
			{
				value.options = $H({});
				var size = 0;
				$A(element.options).each(function(value, option)
				{
					value.options[option.value + "_marker_" + (size++)] = option.text ? option.text : option.value;
				}.bind(this, value));
			}

			if(!this.backups[form.backupId][element.name])
			{
				this.backups[form.backupId][element.name] = [];
				this.backups[form.backupId][element.name][0] = value;
			}
			else
			{
				this.backups[form.backupId][element.name][this.backups[form.backupId][element.name].length] = value;
			}
		}.bind(this, form, ignoreFields));
	},


	/**
	 * Create form backup from json object.
	 *
	 * @param HTMLElementForm Form node
	 * @param Object Backup data. This object should be organized so that keys would be form fields names (not ids)
	 *		and values vould be arrays of field values
	 *
	 * @example
	 *		json = {
	 *			  id: [{ value: 15}],
	 *			name: [{ value: test}],
	 *		   radio: [
	 *					  {value: 1, checked: false },
	 *					  {value: 2, checked: true },
	 *					  {value: 3, checked: false },
	 *				  ],
	 *		  select: [
	 *					  {
	 *								value: 5,
	 *						selectedIndex: 2, // you should precalculate it yourself
	 *							  options: { // keys here are values and values are the text which appears in dropdown box
	 *								 3: "text",
	 *								 4: "processor",
	 *								 5: "selector",
	 *								 6: "date"
	 *							   }
	 *					  }
	 *				  ]
	 *			 }
	 *
	 */
	backupFromJson: function(form, json)
	{
		if(!this.hasBackup(form))
		{
			form.backupId = this.getNewId();
		}

		this.backups[form.backupId] = {};
		this.backups[form.backupId] = json;
	},


	/**
	 * Check if form has a backup
	 *
	 * @param HtmlFormElement form Form node
	 * @return bool
	 *
	 * @access public
	 * @static
	 */
	hasBackup: function(form)
	{
		return form.backupId && this.backups[form.backupId];
	},


	/**
	 * Restore form values
	 *
	 * @param HtmlFormElement form Form node
	 *
	 * @access public
	 * @static
	 */
	restore: function(form, ignoreFields, restoreOptions)
	{
		ignoreFields = $A(ignoreFields || []);
		backupOptions = restoreOptions === undefined ? true : restoreOptions;
		
		
		if(!this.hasBackup(form)) return;
		var occurencies = {};
		
		$A(Form.getElements(form)).each(function(form, ignoreFields, occurencies, element)
		{
			if(ignoreFields.member(element.name)) return;
			if(element.name == '' || !this.backups[form.backupId][element.name]) return;

			occurencies[element.name] = (occurencies[element.name] == undefined) ? 0 : occurencies[element.name] + 1;

			var value = this.backups[form.backupId][element.name][occurencies[element.name]];

			if(value)
			{
				element.value = value.value;
				element.checked = value.checked;
				element.style.display = value.style.display;
				element.style.visibility = value.style.visibility;

				if(element.options && value.options && restoreOptions)
				{
					element.options.length = 0;
					$H(value.options).each(function(element, option) {
						var key = option.key.match(/([\w\W]*)_marker_\d+/)[1];
						element.options[element.options.length] = new Option(option.value, key);
					}.bind(this, element));
				}

				element.selectedIndex = value.selectedIndex;
			}
		}.bind(this, form, ignoreFields, occurencies));
	}
}

Object.extend(Form, Form.State);


/***************************************************
 * library/TabControl.js
 ***************************************************/

/**
 *	@author Integry Systems
 */

Event.fire = function(element, event)
{
   Event.observers.each(function(observer)
   {
		if(observer[1] == event && observer[0] == element)
		{
			var func = observer[2];
			func();
		}
   });
};


var TabControl = Class.create();
TabControl.prototype = {
	__instances__: {},
	activeTab: null,
	indicatorImageName: "image/indicator.gif",

	initialize: function(tabContainerName, urlParserCallback, idParserCallback, callbacks)
	{
		this.tabContainerName = tabContainerName;
		this.urlParserCallback = urlParserCallback || this.getTabUrl;
		this.idParserCallback = idParserCallback || this.getContentTabId;
		this.callbacks = callbacks ? callbacks : {};
		this.loadedContents = {};

		this.__nodes__();
		this.__bind__();

		this.decorateTabs();
		this.countersCache = {};
	},

	__nodes__: function()
	{
		this.nodes = {};
		this.nodes.tabContainer = $(this.tabContainerName);
		this.nodes.tabList = this.nodes.tabContainer.down(".tabList");
		this.nodes.tabListElements = document.getElementsByClassName("tab", this.nodes.tabList);
		this.nodes.sectionContainer = this.nodes.tabContainer.down(".sectionContainer");
		this.nodes.notabsContainer = this.nodes.tabContainer.down(".notabsContainer");
	},

	__bind__: function()
	{
		var self = this;
		this.nodes.tabListElements.each(function(li)
		{
			var link = li.down('a');
			var indicator = '<img src="' + self.indicatorImageName + '" class="tabIndicator" alt="Tab indicator" style="display: none" /> ';

			if(link.hasClassName("observed") == false)
			{
				Event.observe(link, 'click', function(e) { if(e) Event.stop(e); });
				link.addClassName("observed");
			}

			if(li.hasClassName("observed"))
			{
				return;
			}
			link.addClassName("li");
			li.onclick = function(e) {
				if(!e) e = window.event;
				if(e) Event.stop(e);

				if (e)
				{
					var keyboard = new KeyboardEvent(e);
					if (keyboard.isShift())
					{
						self.resetContent(Event.element(e).up('li'));
					}
				}

				self.handleTabClick({'target': li});

				if(Backend.Produc)
				{
					Backend.Product.hideAddForm();
				}
			}

			Event.observe(li, 'mouseover', function(e) {
				if(e) Event.stop(e);
				self.handleTabMouseOver({'target': li})
			});
			Event.observe(li, 'mouseout', function(e) {
				if(e) Event.stop(e);
				self.handleTabMouseOut({'target': li})
			});

			li.update(indicator + li.innerHTML);
		});
	},

	decorateTabs: function()
	{
		this.nodes.tabListElements.each(function(tab)
		{
			if (!tab.down('.tabCounter'))
			{
				var firstLink = tab.down('a');
				new Insertion.After(firstLink, '<span class="tabCounter"> </span>');
			}
		});
	},

	getInstance: function(tabContainerName, urlParserCallback, idParserCallback, callbacks)
	{
		if(!TabControl.prototype.__instances__[tabContainerName])
		{
			TabControl.prototype.__instances__[tabContainerName] = new TabControl(tabContainerName, urlParserCallback, idParserCallback, callbacks);
		}

		return TabControl.prototype.__instances__[tabContainerName];
	},

	handleTabMouseOver: function(args)
	{
		if (this.activeTab != args.target)
		{
			Element.removeClassName(args.target, 'inactive');
			Element.addClassName(args.target, 'hover');
		}
	},

	handleTabMouseOut: function(args)
	{
		if (this.activeTab != args.target)
		{
			Element.removeClassName(args.target, 'hover');
			Element.addClassName(args.target, 'inactive');
		}
	},

	handleTabClick: function(args)
	{
		// hide all error messages within a background process (to avoid potential tab switching delays)
		window.setTimeout(function()
			{
				document.getElementsByClassName('redMessage').each(function(message){ message.hide(); });
				document.getElementsByClassName('bugMessage').each(function(message){ message.hide(); });
			}, 10);

		if(this.callbacks.beforeClick) this.callbacks.beforeClick.call(this);
		this.activateTab(args.target);
		if(this.callbacks.afterClick) this.callbacks.afterClick.call(this);
	},

	addHistory: function()
	{
		setTimeout(function()
		{
			var locationHash = "#" + Backend.ajaxNav.getHash();
			var updateHistory = false;
			this.nodes.tabListElements.each(function(tab)
			{
				if(locationHash.indexOf("#" + tab.id) !== -1)
				{
					locationHash = locationHash.substring(0, locationHash.indexOf(tab.id) - 1);
					updateHistory = true;
					throw $break;
				}
			});

			if(locationHash.match(/__/))
			{
				locationHash = locationHash.substr(0, locationHash.length - 2);
			}

			Backend.ajaxNav.add(locationHash.substring(1) + "#" + this.activeTab.id);
		}.bind(this), dhtmlHistory.currentWaitTime * 2);
	},

	/**
	 * Reloades tab content in background (does not activate tab)
	 * 
	 * When reloading:
	 *              Existing tab content container is removed
	 *              If not active tab, content container is set to absolute position and positioned
	 *                                 outside page, because some controls can't initalize in invisible
	 *                                 container (for example editArea)
	 *              AjaxUpdater request is executed.
	 * 
	 * If tab content is not yet loaded, this will load tab content.
	 * 
	 */
	reloadTabContent: function(targetTab, onComplete)
	{
		targetTab = $(targetTab);
		if(!targetTab)
		{
			targetTab = this.nodes.tabListElements[0];
		}
		var contentId = this.idParserCallback(targetTab.id);
		if(!contentId)
		{
			return;
		}
		this.resetContent(targetTab);
		if ($(contentId))
		{
			$(contentId).remove();
		}
		new Insertion.Top(this.nodes.sectionContainer, '<div id="' + contentId + '" class="tabPageContainer ' + targetTab.id + 'Content loadedInBackgroundTab"></div>');
		this.activeContent = $(contentId);
		
		if (this.activeTab.id == targetTab.id )
		{
			this.activeContent.removeClassName("loadedInBackgroundTab");
		}
		if(!onComplete && this.callbacks.onComplete)
		{
			onComplete = this.callbacks.onComplete;
		}
		this.loadedContents[this.urlParserCallback(targetTab.down('a').href) + contentId] = true;
		new LiveCart.AjaxUpdater(
			this.urlParserCallback(targetTab.down('a').href),
			contentId, 
			targetTab.down('.tabIndicator'),
			'bottom',
			function(activeContent, onComplete, response)
			{
				if (onComplete)
				{
					onComplete(response);
				}
			}.bind(this, this.activeContent, onComplete)
		);
	},

	activateTab: function(targetTab, onComplete)
	{
		targetTab = $(targetTab);

		if(!targetTab)
		{
			targetTab = this.nodes.tabListElements[0];
		}

		// get help context
		var helpContext = document.getElementsByClassName('tabHelp', targetTab);
		if ((helpContext.length > 0) && helpContext[0].firstChild)
		{
			Backend.setHelpContext(helpContext[0].firstChild.nodeValue);
		}

		var contentId = this.idParserCallback(targetTab.id);

		// Cancel loading tab if false was returned
		if(!contentId)
		{
			return;
		}

		if(!$(contentId)) new Insertion.Top(this.nodes.sectionContainer, '<div id="' + contentId + '" class="tabPageContainer ' + targetTab.id + 'Content"></div>');

		var self = this;
		$A(this.nodes.tabListElements).each(function(tab) {
			if (tab.hasClassName('tab'))
			{
				Element.removeClassName(tab, 'active');
				Element.addClassName(tab, 'inactive');
			}
		});

		document.getElementsByClassName("tabPageContainer", this.nodes.sectionContainer).each(function(container) {
			Element.hide(container);
		})

		this.activeTab = targetTab;
		this.activeContent = $(contentId);
		this.activeContent.removeClassName("loadedInBackgroundTab");

		Element.removeClassName(this.activeTab, 'hover');
		Element.addClassName(this.activeTab, 'active');
		Element.show(contentId);

		if(!onComplete && this.callbacks.onComplete)
		{
			onComplete = this.callbacks.onComplete;
		}

		if (!this.loadedContents[this.urlParserCallback(targetTab.down('a').href) + contentId] && Element.empty($(contentId)))
		{
			this.loadedContents[this.urlParserCallback(targetTab.down('a').href) + contentId] = true;
			new LiveCart.AjaxUpdater(this.urlParserCallback(targetTab.down('a').href), contentId, targetTab.down('.tabIndicator'), 'bottom', function(activeContent, onComplete, response)
			{
				if (Form.focus)
				{
					setTimeout(function() { Form.focus(activeContent) }.bind(this, activeContent), 20);
				}

				if (onComplete)
				{
					onComplete(response);
				}

			}.bind(this, this.activeContent, onComplete));
			
			
		}
		else if(onComplete)
		{
			if (Form.focus)
			{
				Form.focus(this.activeContent);
			}

			onComplete();
		}
		else
		{
			if (Form.focus)
			{
				Form.focus(this.activeContent);
			}
		}

		this.addHistory();

		// Hide tabs if only one is visible
		this.nodes.tabList.show();
		this.hideAllTabs = true;
		this.nodes.tabListElements.each(function(tab) {
			if(targetTab != tab && tab.style.display != 'none')
			{
				this.hideAllTabs = false;
				throw $break;
			}
		}.bind(this));

		if(this.hideAllTabs)
		{
			this.nodes.tabList.hide();
		}
	},

	/**
	 * Reset content related to a given tab. When tab will be activated content must
	 * be resent
	 */
	resetContent: function(tabObj)
	{
		if (!tabObj)
		{
			return false;
		}

		var id = this.idParserCallback(tabObj.id);
		this.loadedContents[this.urlParserCallback(tabObj.down('a').href) + id] = false;
		if ($(id))
		{
			$(id).update();
		}
	},

	reloadActiveTab: function()
	{
		this.resetContent(this.activeTab);
		this.activateTab(this.activeTab);
	},

	getActiveTab: function()
	{
		return this.activeTab;
	},

	setTabUrl: function(tabId, url)
	{
		$(tabId).url = url;
	},

	setCounter: function(tab, value, hashId)
	{
		if(!this.countersCache[hashId]) this.countersCache[hashId] = {};

		tab = $(tab);

		if(!tab) return; //throw new Error('Could not find tab!');

		var counter = tab.down('.tabCounter');
		if(false === value)
		{
			counter.update('');
			delete this.countersCache[hashId][tab.id];
		}
		else
		{
			if (null == value)
			{
				value = 0;
			}

			counter.update("(" + value + ")");
			this.countersCache[hashId][tab.id] = value;
		}
	},

	setAllCounters: function(counters, hashId)
	{
		var self = this;
		$H(counters).each(function(tab) {
			self.setCounter(tab[0], tab[1], hashId);
		});
	},

	restoreCounter: function(tab, hashId)
	{
		tab = $(tab);

		if(tab && this.countersCache[hashId][tab.id] !== undefined)
		{
			this.setCounter(tab.id, this.countersCache[hashId][tab.id]);
			return true;
		}

		return false;
	},

	restoreAllCounters: function(hashId)
	{
		var restored = false;
		if(this.countersCache[hashId])
		{
			$A(this.nodes.tabListElements).each(function(tab) {
				restored = this.restoreCounter(tab, hashId) ? true : restored;
			}.bind(this));
		}

		return restored;
	},

	getCounter: function(tab)
	{
		tab = $(tab);

		if(!tab) throw new Error('Could not find tab!');

		var counter = tab.down('.tabCounter');
		var match = counter.innerHTML.match(/\((\d+)\)/);
		return match ? parseInt(match[1]) : 0;
	},

	getTabUrl: function(url)
	{
		return url;
	},

	getContentTabId: function(id)
	{
		return id + 'Content';
	},

	addNewTab: function(title)
	{
		var
			id = ["tab",new Date().getTime(), Math.round(Math.random() * 100000000)].join(""),
			li = document.createElement('li'),
			div = document.createElement('div');

		this.nodes.tabList.appendChild(li);
		li.innerHTML = '<a href="#" class="li">'+title+'</a>';
		li.addClassName("tab inactive");
		this.nodes.sectionContainer.appendChild(div);
		div.id=this.getContentTabId(id);
		div.addClassName("tabPageContainer");
		li.id = id;
		this.__nodes__();
		this.__bind__();
		this.decorateTabs();
		this.activateTab(id);
		if(this.nodes.notabsContainer)
		{
			this.nodes.sectionContainer.show();
			this.nodes.notabsContainer.hide();
		}
		return id;
	},

	setTitle: function(id, title)
	{
		$(id).down("a").innerHTML = title;
	},

	removeTab: function(id)
	{
		var
			tab = $(id),
			content = $(this.getContentTabId(id)),
			newActiveTab = tab.previous();

		tab.parentNode.removeChild(tab);
		content.parentNode.removeChild(content);
		this.__nodes__();
		if(this.nodes.tabListElements.length == 0 && this.nodes.notabsContainer)
		{
			this.nodes.sectionContainer.hide();
			this.nodes.notabsContainer.show();
			return null;
		}
		else
		{
			this.activateTab(newActiveTab);
			return this.getActiveTab();
		}
	}
}



/***************************************************
 * library/ActiveList.js
 ***************************************************/

/**
 * ActiveList
 *
 * Sortable list
 *
 * @example
 * <code>
 * <ul id="specField_items_list" class="activeList_add_sort activeList_add_edit activeList_add_delete">
 *	<li id="specField_items_list_96" class="">Item 1</li>
 *	<li id="specField_items_list_95"  class="">Item 2</li>
 *	<li id="specField_items_list_100" class="activeList_remove_sort">Item 3</li>
 *	<li id="specField_items_list_101" class="">Item 4</li>
 *	<li id="specField_items_list_102" class="">Item 5</li>
 * </ul>
 *
 * <script type="text/javascript">
 *	 new ActiveList('specField_items_list', {
 *		 beforeEdit:	 function(li)
 *		 {
 *			 if(this.isContainerEmpty()) return 'edit.php?id='+this.getRecordId(li)
 *			 else his.toggleContainer()
 *		 },
 *		 beforeSort:	 function(li, order) { return 'sort.php?' + order },
 *		 beforeDelete:   function(li)
 *		 {
 *			 if(confirm('Are you sure you wish to remove record #' + this.getRecordId(li) + '?')) return 'delete.php?id='+this.getRecordId(li)
 *		 },
 *		 afterEdit:	  function(li, response) { this.getContainer(li, 'edit').innerHTML = response; this.toggleContainer();  },
 *		 afterSort:	  function(li, response) { alert( 'Record #' + this.getRecordId(li) + ' changed position'); },
 *		 afterDelete:	function(li, response)  { this.remove(li); }
 *	 });
 * </script>
 * </code>
 *
 * First argument passed to active list constructor is list id, and the second is hash object of callbacks
 * Events in active list will automatically call two actions one before ajax request to server and one after.
 * Those callbacks which are called before the request hase "before" prefix. Those which will be called after - "after".
 *
 * Functions which are called before request must return a link or a false value. If a link returned then
 * request to that link is made. On the other hand if false is returned then no request is send and "after" function
 * is not called. This is useful for caching.
 *
 * Note that there are some usefful function you can use inside your callbacks
 * this.isContainerEmpty() - Returns if container is empty
 * this.getRecordId(li) - Get real item's id (used to identify that item in database)
 * this.getContainer() - Get items container. Also every action has it's own container
 *
 * There are also some usefull variables available to you in callback
 * this - A reference to ActiveList object.
 * li - Current item
 * order - Serialized order
 * response - Ajax response text
 *
 * @author   Integry Systems
 *
 */
if (LiveCart == undefined)
{
	var LiveCart = {}
}

ActiveList = Class.create();
ActiveList.prototype = {
	/**
	 * Item icons which will apear in top left corner on each item of the list
	 *
	 * @var Hash
	 */
	icons: {
		'sort':	 "image/silk/arrow_switch.png",
		'edit':	 "image/silk/pencil.png",
		'delete':   "image/silk/cancel.png",
		'view':	 "image/silk/zoom.png",
		'progress': "image/indicator.gif"
	},

	/**
	 * User obligated to pass this callbacks to constructor when he creates
	 * new active list.
	 *
	 * @var array
	 */
	requiredCallbacks: [],

	/**
	 * When active list is created it depends on automatically generated html
	 * content.That means that active list uses class names to find icons and
	 * containers in list. Be sure you are using unique prefix
	 *
	 * @var string
	 */
	cssPrefix: 'activeList_',

	/**
	 * List order is send back only if last sort accured more then M milliseconds ago.
	 * M is that value
	 *
	 * @var int
	 */
	keyboardSortTimeout: 1000,

	/**
	 * Tab index of every active list element. Most of the time this value is not important
	 * so any would work fine
	 *
	 * @var int
	 */
	tabIndex: 666,

	/**
	 * The alpha level of menu when it is hidden
	 *
	 * @var double [0,1]
	 */
	visibleMenuOpacity: 1,

	/**
	 * The alpha level of menu when it is visible
	 *
	 * @var double [0,1]
	 */
	hiddenMenuOpacity: 0.15,

	activeListsUsers: {},

	messages: {},

	/**
	 * Constructor
	 *
	 * @param string|ElementUl ul List id field or an actual reference to list
	 * @param Hash callbacks Function which will be executed on various events (like sorting, deleting editing)
	 *
	 * @access public
	 */
	initialize: function(ul, callbacks, messages)
	{
		this.ul = $(ul);

		if(!this.ul)
		{
			throw Error('No list found');
			return false;
		}

		this.messages = messages;

		if (!this.ul.id)
		{
			Backend.setUniqueID(this.ul);
		}

		Element.addClassName(this.ul, this.ul.id);

		// Check if all required callbacks are passed
		var missedCallbacks = [];
		for(var i = 0; i < this.requiredCallbacks.length; i++)
		{
			var before = ('before-' + this.requiredCallbacks[i]).camelize();
			var after = ('after-' + this.requiredCallbacks[i]).camelize();

			if(!callbacks[before]) missedCallbacks[missedCallbacks.length] = before;
			if(!callbacks[after]) missedCallbacks[missedCallbacks.length] = after;
		}

		if(missedCallbacks.length > 0)
		{
				throw Error('Callback' + (missedCallbacks.length > 1 ? 's' : '') + ' are missing (' + missedCallbacks.join(', ') +')' );
				return false;
		}

		this.callbacks = callbacks;
		this.dragged = false;

		this.generateAcceptFromArray();
		this.createSortable();
		this.decorateItems();
	},

	/**
	 * Get active list singleton. If ul list is allready an ActiveList then use it's instance. In other case create new instance
	 *
	 * @param HTMLUlElement ul
	 * @param object callbacks
	 * @param object messages
	 */
	getInstance: function(ul, callbacks, messages)
	{
		var ulElement = $(ul);

		// fix list ID if it was set as numeric only
		if (!isNaN(parseInt(ulElement.id)))
		{
			var id = ulElement.id;
			Backend.setUniqueID(ulElement);
			ulElement.id += '_' + id;
		}

		if (!ulElement.id)
		{
			Backend.setUniqueID(ulElement);
		}

		if(!ActiveList.prototype.activeListsUsers[ulElement.id])
		{
			ActiveList.prototype.activeListsUsers[ulElement.id] = new ActiveList(ulElement.id, callbacks, messages);
		}

		return ActiveList.prototype.activeListsUsers[ulElement.id];
	},

	/**
	 * Destroy active list object associated with given list
	 *
	 * @param HTMLUlElement ul	destroy: function(ul)
	 */
	destroy: function(ul)
	{
	   var id = ul.id ? ul.id : ul;

	   if(ActiveList.prototype.activeListsUsers[id])
	   {
		   delete this.activeListsUsers[id];
	   }
	},

	destroySortable: function()
	{
	   if(this.isSortable)
	   {
		   Sortable.destroy(this.ul);
		   this.isSortable = false;
		   $A(this.acceptFromLists).each(function(ul)
		   {
			   if(ActiveList.prototype.activeListsUsers[ul.id])
			   {
				   ActiveList.prototype.activeListsUsers[ul.id].isSortable = false;
				   var s = Sortable.options(ul);

 				   if(s)
				   {
					  Draggables.removeObserver(s.element);
					  s.draggables.invoke('destroy');
				   }
			   }
		   });
	   }
	},

	makeStatic: function()
	{
	   Sortable.destroy(this.ul);
	   Element.removeClassName(this.ul, 'activeList_add_sort')
	   document.getElementsByClassName('activeList_icons', this.ul).each(function(iconContainer)
	   {
		   iconContainer.hide();
		   iconContainer.style.visibility = 'hidden';
	   });
	},


	makeActive: function()
	{
	   Sortable.create(this.ul);
	   Element.addClassName(this.ul, 'activeList_add_sort')
	   document.getElementsByClassName('activeList_icons', this.ul).each(function(iconContainer)
	   {
		   iconContainer.show();
		   iconContainer.style.visibility = 'visible';
	   });
	},


	/**
	 * Split list by odd and even active records by adding ActiveList_odd or ActiveList_even to each element
	 */
	colorizeItems: function()
	{
		var liArray = this.ul.getElementsByTagName("li");

		var k = 0;
		for(var i = 0; i < liArray.length; i++)
		{
			if(this.ul == liArray[i].parentNode && !Element.hasClassName(liArray[i], 'ignore') && !Element.hasClassName(liArray[i], 'dom_template'))
			{
				this.colorizeItem(liArray[i], k);
				k++;
			}
		}
	},

	/**
	 * Adds classes ActiveList_odd and ActiveList_even to separate odd elements from even
	 *
	 * @param HtmlElementLi A reference to item element. Default is current item
	 * @param {Object} position Element position in ActiveList
	 */
	colorizeItem: function(li, position)
	{
		Element.addClassName(li, 'activeList');

		if(position % 2 == 0)
		{
			Element.removeClassName(li, this.cssPrefix + "odd");
			Element.addClassName(li, this.cssPrefix + "even");
		}
		else
		{
			Element.removeClassName(li, this.cssPrefix + "even");
			Element.addClassName(li, this.cssPrefix + "odd");
		}
	},

	/**
	 * Toggle item container On/Off
	 *
	 * @param HtmlElementLi A reference to item element. Default is current item
	 * @param string action Every action has its own container. You could toggle another action container, but default is to toggle current action's container
	 *
	 * @access public
	 */
	toggleContainer: function(li, action, highlight)
	{
		var container = this.getContainer(li, action);

		if(container.style.display == 'none')
		{
			this.toggleContainerOn(container, highlight);
		}
		else
		{
			this.toggleContainerOff(container, highlight);
			Element.removeClassName(li, action + '_inProgress');
		}
	},

	/**
	 * Expand data container
	 *
	 * @param HTMLElementDiv container Reference to the container
	 */
	toggleContainerOn: function(container, highlight)
	{
		container = $(container);
		ActiveList.prototype.collapseAll();

		Sortable.destroy(this.ul);
		// Destroy parent sortable as well
		var parentList = this.ul.up(".activeList");
		if(parentList && ActiveList.prototype.activeListsUsers[parentList.id])
		{
		   ActiveList.prototype.activeListsUsers[parentList.id].destroySortable(true);
		}

		if(BrowserDetect.browser != 'Explorer')
		{
			Effect.BlindDown(container, { duration: 0.5 });
			Effect.Appear(container, { duration: 1.0 });
			setTimeout(function() {
				container.style.height = 'auto';
				container.style.display = 'block';

				if(highlight) this.highlight(container.up('li'), highlight);
			}.bind(this), 300);
		}
		else
		{
			container.style.display = 'block';
			if(highlight) this.highlight(container.up('li'), highlight);
		}

		Element.addClassName(container.up('li'), this.cssPrefix  + this.getContainerAction(container) + '_inProgress');
	},

	/**
	 * Collapse data container
	 *
	 * @param HTMLElementDiv container Reference to the container
	 */
	toggleContainerOff: function(container, highlight)
	{
		var container = $(container);
		this.createSortable(true);

		// Create parent sortable as well
		var parentList = this.ul.up(".activeList");
		if(parentList && ActiveList.prototype.activeListsUsers[parentList.id])
		{
		   ActiveList.prototype.activeListsUsers[parentList.id].createSortable(true);
		}

		if(BrowserDetect.browser != 'Explorer')
		{
			Effect.BlindUp(container, {duration: 0.2});
			setTimeout(function() {
				container.style.display = 'none';
				if(highlight) this.highlight(container.up('li'), highlight);
			}.bind(this), 40);
		}
		else
		{
			container.style.display = 'none';
			if(highlight) this.highlight(container.up('li'), highlight);
		}

		Element.removeClassName(container.up('li'), this.cssPrefix  + this.getContainerAction(container) + '_inProgress');
	},

	getContainerAction: function(container)
	{
		var matches = container.className.match(/activeList_(\w+)Container/);
		if (matches)
		{
			return matches[1];
		}
	},

	/**
	 * Check if item container is empty
	 *
	 * @param HtmlElementLi A reference to item element. Default is current item
	 * @param string action Every action has its own container. You could toggle another action container, but default is to toggle current action's container
	 *
	 * @access public
	 *
	 * @return bool
	 */
	isContainerEmpty: function(li, action)
	{
		return this.getContainer(li, action).firstChild ? false : true;
	},

	/**
	 * Get item container
	 *
	 * @param HtmlElementLi A reference to item element. Default is current item
	 * @param string action Every action has its own container. You could toggle another action container, but default is to toggle current action's container
	 *
	 * @access private
	 *
	 * @return ElementDiv A refference to container node
	 */
	getContainer: function(li, action)
	{
		if(!li) li = this._currentLi;

		return document.getElementsByClassName(this.cssPrefix + action + 'Container' , li)[0];
	},

	/**
	 * Get item's id. Not as a dom element but real id, which is used id database
	 *
	 * @param HtmlElementLi li A reference to item element
	 *
	 * @access public
	 *
	 * @return string element id
	 */
	getRecordId: function(li, level)
	{
		if(!level) level = 1;
		var matches = li.id.match(/_([a-zA-Z0-9]*)(?=(?:_|\b))/g);

		var id = matches[matches.length-level];
		return id ? id.substr(1) : false;
	},

	/**
	 * Rebind all icons in item
	 *
	 * @param HtmlElementLi li A reference to item element
	 *
	 * @access public
	 */
	rebindIcons: function(li)
	{
		var self = this;
		$A(this.ul.className.split(' ')).each(function(className)
		{
			//var container = document.getElementsByClassName(self.cssPrefix + 'icons', li)[0];
			var container = li.iconContainer;

			var regex = new RegExp('^' + self.cssPrefix + '(add|remove)_(\\w+)(_(before|after)_(\\w+))*');
			var tmp = regex.exec(className);

			if(!tmp) return;

			var icon = {};
			icon.type = tmp[1];
			icon.action = tmp[2];
			icon.image = self.icons[icon.action];
			icon.position = tmp[4];
			icon.sibling = tmp[5];

			if(icon.action != 'sort')
			{
				li[icon.action + 'Container'] = document.getElementsByClassName(self.cssPrefix + icon.action + 'Container', li)[0];
			}
		});

		li.prevParentId = this.ul.id;
	},

	/**
	 * Add new item to Active Record. You have 3 choices. Either to add whole element, add array of elements or add all elements
	 * inside given dom element
	 *
	 * @param int id Id of new element (Same ID which is stored in database)
	 * @param HTMLElement|array dom Any HTML Dom element or array array of Dom elements
	 * @param bool insights Use elements inside of given node
	 *
	 * @access public
	 *
	 * @return HTMLElementLi Reference to new active list record
	 */
	addRecord: function(id, dom, touch, noClone)
	{
		var li = document.createElement('li');
		li.id = this.ul.id + "_" + id;
		this.ul.appendChild(li);

		if(typeof dom == 'string')
		{
			li.update(dom);
		}
		else if (dom[0])
		{
			for(var i = 0; i < dom.length; i++)
			{
				var cloned_dom = dom[i].cloneNode(true);
				while(cloned_dom.childNodes.length > 0) li.appendChild(cloned_dom.childNodes[0]);
			}
		}
		else
		{
			var cloned_dom = noClone ? dom : dom.cloneNode(true);
			while(cloned_dom.childNodes.length > 0) li.appendChild(cloned_dom.childNodes[0]);
			li.className = dom.className;
		}

		this.decorateLi(li);
		this.colorizeItem(li, this.ul.childNodes.length);

		if(touch || touch === undefined)
		{
			this.highlight(li, 'yellow');
			this.touch(true);
		}

		return li;
	},

	updateRecord: function(oldLi, newLi)
	{
	  	oldLi.parentNode.replaceChild(newLi, oldLi);
		this.decorateLi(newLi);
		this.colorizeItem(newLi, this.ul.childNodes.length);
		this.rebindIcons(newLi);

		this.highlight(newLi, 'yellow');
		this.touch(true);
	},

	highlight: function(li, color)
	{
		if(!li) li = this._currentLi;
		li = $(li);

		switch(color)
		{
			case 'red':
				new Effect.Highlight(li, {startcolor:'#FFF1F1', endcolor:'#F5F5F5'});
				break;
			case 'pink':
				new Effect.Highlight(li, {startcolor:'#FFF7F7', endcolor:'#FBFBFB'});
				break;
			case 'yellow':
			default:
				new Effect.Highlight(li, {startcolor:'#FBFF85', endcolor:'#F5F5F5'});
				break;
		}

	   setTimeout(function(li)
	   {
		   var textInput = li.down("input[@type=text]");
		   if(textInput)
		   {
				try
				{
					textInput.focus();
				}
				catch (e)
				{
					return false;
				}
		   }
	   }.bind(this, li), 600);
	},

	getRecordById: function(id)
	{
		return this.ul.down('#' + this.ul.id + '_' + id);
	},

	/***************************************************************************
	 *		   Private methods											   *
	 ***************************************************************************/

	/**
	 * Go throug all list elements and decorate them with icons, containers, etc
	 *
	 * @access private
	 */
	decorateItems: function()
	{

		// This fixes some strange explorer bug/"my stypidity"
		// Basically, what is happening is thet when I push edit button (pencil)
		// on first element, everything just dissapears. All other elements
		// are fine though. To fix this I am adding an hidden first element
		var liArray = this.getChildList();
		for(var i = 0; i < liArray.length; i++)
		{
			this.decorateLi(liArray[i]);
			this.colorizeItem(liArray[i], i);
		}
	},

	/**
	 * Decorate list element with icons, progress bar, container, tabIndex, etc
	 *
	 * @param HtmlElementLi Element to decorate
	 *
	 * @access private
	 */
	decorateLi: function(li)
	{
		var self = this;

		// fix li ID if it was set as numeric only
		if (!isNaN(parseInt(li.id)))
		{
			li.id = li.parentNode.id + '_' + li.id;
		}

		// Bind events
		Event.observe(li, "mouseover", function(e) { self.showMenu(this) });
		Event.observe(li, "mouseout",  function(e) { self.hideMenu(this) });

		// Create icons container. All icons will be placed incide it
		if(!li.iconContainer)
		{
			var iconsDiv = document.createElement('span');
			Element.addClassName(iconsDiv, self.cssPrefix + 'icons');
			li.insertBefore(iconsDiv, li.firstChild);
			li.iconContainer = iconsDiv;

			// add all icons
			$A(this.ul.className.split(' ')).each(function(className)
			{
				// If icon is not progress and it was added to a whole list or only this item then put that icon into container
				self.addIconToContainer(li, className);
			});

			// progress is not a div like all other icons. It has no fixed size and is not clickable.
			// This is done to properly handle animated images because i am not sure if all browsers will
			// handle animated backgrounds in the same way. Also differently from icons progress icon
			// can vary in size while all other icons are always the same size
			iconProgress = document.createElement('img');
			iconProgress.src = this.icons.progress;

			if (this.messages && this.messages._activeList_progress)
			{
				iconImage.alt = this.messages._activeList_progress;
			}

			if (this.messages && this.messages._activeList_progress)
			{
				iconImage.title = iconImage.alt = this.messages._activeList_progress;
			}

			iconProgress.style.visibility = 'hidden';

			Element.addClassName(iconProgress, self.cssPrefix + 'progress');
			iconsDiv.appendChild(iconProgress);


			li.progress = iconProgress;
			li.prevParentId = this.ul.id;
		}
	},

	/**
	 * Add icon to container according to active list classes current record classes
	 *
	 * @param HtmlElementLi Element
	 * @param string className ActiveList(ul) classes separated by space
	 */
	addIconToContainer: function(li, className)
	{
		var container = li.iconContainer;

		var regex = new RegExp('^' + this.cssPrefix + '(add|remove)_(\\w+)(_(before|after)_(\\w+))*');
		var tmp = regex.exec(className);

		if(!tmp) return;

		var icon = {};

		icon.type = tmp[1];
		icon.action = tmp[2];
		icon.image = this.icons[icon.action];
		icon.position = tmp[4];
		icon.sibling = tmp[5];

		if(icon.action == 'accept') return true;

		if(icon.action != 'sort')
		{
			var iconImage = document.createElement('img');

			iconImage.src = icon.image;
			if(this.messages && this.messages['_activeList_' + icon.action])
			{
				iconImage.title = iconImage.alt = this.messages['_activeList_' + icon.action];
			}

			Element.addClassName(iconImage, this.cssPrefix + icon.action);
			Element.addClassName(iconImage, this.cssPrefix + 'icons_container');

			// If icon is removed from this item than do not display the icon
			if((Element.hasClassName(li, this.cssPrefix + 'remove_' + icon.action) || !Element.hasClassName(this.ul, this.cssPrefix + 'add_' + icon.action)) && !Element.hasClassName(li, this.cssPrefix + 'add_' + icon.action))
			{
				iconImage.style.display = 'none';
			}

			// Show icon
			container.appendChild(iconImage);
			iconImage.setOpacity(this.hiddenMenuOpacity);
			li[icon.action] = iconImage;

			Event.observe(iconImage, "mousedown", function(e) { Event.stop(e) }.bind(this));
			Event.observe(iconImage, "click", function() { this.bindAction(li, icon.action) }.bind(this));

			// Append content container
			if('delete' != icon.action && !this.getContainer(li, icon.action))
			{
				var contentContainer = document.createElement('div');
				contentContainer.style.display = 'none';
				Element.addClassName(contentContainer, this.cssPrefix + icon.action + 'Container');
				Element.addClassName(contentContainer, this.cssPrefix + 'container');
				contentContainer.id = this.cssPrefix + icon.action + 'Container_' + li.id;
				li.appendChild(contentContainer);
				li[icon.action + 'Container'] = contentContainer;
			}
		}
	},

	/**
	 * This function executes user specified callback. For example if action was
	 * 'delete' then the beforeDelete function will be called
	 * which should return a valud url adress. After that when AJAX response has
	 * arrived the afterDelete function will be called
	 *
	 * @param HtmlElementLi A reference to item element
	 * @param string action Action
	 *
	 * @access private
	 */
	bindAction: function(li, action)
	{
		this.rebindIcons(li);

		if(action != 'sort')
		{
			this._currentLi = li;

			Element.addClassName(li, this.cssPrefix  + action + '_inProgress');

			var url = this.callbacks[('before-'+action).camelize()].call(this, li);

			if(!url)
			{
				Element.removeClassName(li, this.cssPrefix  + action + '_inProgress');
				return false;
			}

			// display feedback
			this.onProgress(li);

			// execute the action
			new LiveCart.AjaxRequest(
				url,
				false,
				function(param)
				{
					this.callUserCallback(action, param, li);
				}.bind(this)
			);
		}
	},

	/**
	 * Toggle progress bar on list element
	 *
	 * @param HtmlElementLi A reference to item element
	 *
	 * @access private
	 */
	toggleProgress: function(li)
	{
		if(li.progress && li.progress.style.visibility == 'hidden')
		{
			this.onProgress(li);
		}
		else
		{
			this.offProgress(li);
		}
	},

	/**
	 * Toggle progress indicator off
	 *
	 * @param HtmlElementLi li A reference to item element
	 */
	offProgress: function(li)
	{
		if(li.progress) li.progress.style.visibility = 'hidden';
	},

	/**
	 * Toggle progress indicator on
	 *
	 * @param HtmlElementLi li A reference to item element
	 */
	onProgress: function(li)
	{
		if(li.progress) li.progress.style.visibility = 'visible';
	},

	/**
	 * Call a user defined callback function
	 *
	 * @param string action Action
	 * @param XMLHttpRequest response An AJAX response object
	 * @param HtmlElementLi A reference to item element. Default is current item
	 *
	 * @access private
	 */
	callUserCallback: function(action, response, li)
	{
		this._currentLi = li;

		if(action == 'delete')
		{
			var duration = 0.5;
			Effect.Fade(li, { duration: duration });
			setTimeout(
			function()
			{
				Element.remove(li);
				this.callbacks[('after-'+action).camelize()].call(this, li, response.responseText);
			}.bind(this), duration * 1000 );
		}
		else
		{
			this.callbacks[('after-'+action).camelize()].call(this, li, response.responseText);
		}


		//Element.removeClassName(li, this.cssPrefix  + action + '_inProgress');

		this.offProgress(li);
	},

	/**
	 * Generate array of elements from wich this active list can accept elements.
	 * This array is generated from class name. Example: If this ul had "aciveList_accept_otherALClass"
	 * then the list would accept elements from all active lists with class otherALClass
	 *
	 */
	generateAcceptFromArray: function()
	{
		var self = this;
		var regex = new RegExp('^' + self.cssPrefix + 'accept_(\\w+)');

		this.acceptFromLists = [this.ul];
		$A(this.ul.className.split(' ')).each(function(className)
		{
			var tmp = regex.exec(className);
			if(!tmp) return;
			var allowedClassName = tmp[1];

			self.acceptFromLists = $$('ul.' + allowedClassName);
		});
	},

	/**
	 * Initialize Scriptaculous Sortable on the list
	 *
	 * @access private
	 */
	createSortable: function (forse)
	{
		Element.addClassName(this.ul, this.cssPrefix.substr(0, this.cssPrefix.length-1));

		if(Element.hasClassName(this.ul, this.cssPrefix + 'add_sort') && (forse || !this.isSortable))
		{
			Sortable.create(this.ul.id,
			{
				dropOnEmpty:   true,
				containment:   this.acceptFromLists,
				onChange:	  function(elementObj)
				{
					this.dragged = elementObj;
				}.bind(this),
				onUpdate:	  function() {
					setTimeout(function() { this.saveSortOrder(); }.bind(this), 1);
				}.bind(this),

				starteffect: function(){ this.scrollStart() }.bind(this),
				endeffect: function(){ this.scrollEnd() }.bind(this)
			});

			// Undraggable items
			Sortable.options(this.ul).draggables.each(function(draggable)
			{
				if(draggable.element.hasClassName("activeList_remove_sort"))
				{
					draggable.destroy();
				}
			});


			this.isSortable = true;
			$A(this.acceptFromLists).each(function(ul)
			{
				if(ActiveList.prototype.activeListsUsers[ul.id])
				{
					ActiveList.prototype.activeListsUsers[ul.id].createSortable();
				}
			});
		}
	},

	getWindowScroll: function()
	{
		var T, L, W, H;

		if (w.document.document.document.documentElement && documentElement.scrollTop)
		{
			T = documentElement.scrollTop;
			L = documentElement.scrollLeft;
		}
		else if (w.document.body)
		{
			T = body.scrollTop;
			L = body.scrollLeft;
		}

		if (w.innerWidth)
		{
			W = w.innerWidth;
			H = w.innerHeight;
		}
		else if (w.document.documentElement && documentElement.clientWidth)
		{
			W = documentElement.clientWidth;
			H = documentElement.clientHeight;
		}
		else
		{
			W = body.offsetWidth;
			H = body.offsetHeight
		}

		return { top: T, left: L, width: W, height: H };
	},

	findTopY: function(obj)
	{
		var curtop = 0;
		if (obj.offsetParent)
		{
			while (obj.offsetParent)
			{
				curtop += obj.offsetTop;
				obj = obj.offsetParent;
			}
		}
		else if (obj.y)
		{
			curtop += obj.y;
		}

		return curtop;
	},

	findBottomY: function(obj)
	{
		return this.findTopY(obj) + obj.offsetHeight;
	},

	scrollSome: function()
	{
		var scroller = this.getWindowScroll();
		var yTop = this.findTopY(this.dragged);
		var yBottom = this.findBottomY(this.dragged);

		if (yBottom > scroller.top + scroller.height - 20)
		{
			window.scrollTo(0,scroller.top + 30);
		}
		else if (yTop < scroller.top + 20)
		{
			window.scrollTo(0,scroller.top - 30);
		}
	},

	scrollStart: function(e)
	{
		var $this = this;
		this.dragged = e;
	},

	scrollEnd: function(e)
	{
		clearInterval(this.scrollPoll);
	},

	/**
	 * Display list item's menu. Show all item icons except progress
	 *
	 * @param HtmlElementLi li A reference to item element
	 *
	 * @access private
	 */
	showMenu: function(li)
	{
		var self = this;

		$H(this.icons).each(function(icon)
		{
			if(!li[icon.key] || icon.key == 'progress') return;

			try {
				li[icon.key].setOpacity(self.visibleMenuOpacity);
			} catch(e) {
				li[icon.key].style.visibility = 'visible';
			}
		});
	},

	/**
	 * Hides list item's menu
	 *
	 * @param HtmlElementLi li A reference to item element
	 *
	 * @access private
	 */
	hideMenu: function(li)
	{
		var self = this;

		$H(this.icons).each(function(icon)
		{
			if(!li[icon.key] || icon.key == 'progress') return;

			try {
				li[icon.key].setOpacity(self.hiddenMenuOpacity);
			} catch(e) {
				li[icon.key].style.visibility = 'hidden';
			}
		});
	},

	/**
	 * Initiates item order (position) saving action
	 *
	 * @access private
	 */
	saveSortOrder: function()
	{
		var order = Sortable.serialize(this.ul.id);
		if(order)
		{
			// execute the action
			this._currentLi = this.dragged;
			var url = this.callbacks.beforeSort.call(this, this.dragged, order);


			if(url)
			{
				this.destroySortable();

				// Destroy parent sortable as well
				var parentList = this.ul.up(".activeList");
				if(parentList && ActiveList.prototype.activeListsUsers[parentList.id])
				{
					ActiveList.prototype.activeListsUsers[parentList.id].destroySortable(true);
				}

				// display feedback
				this.onProgress(this.dragged);

				new LiveCart.AjaxRequest(
					url + "&draggedID=" + this.dragged.id,
					false,
					// the object context mystically dissapears when onComplete function is called,
					// so the only way I could make it work is this
					function(param, uriObject)
					{
						this.restoreDraggedItem(param.responseText, $(uriObject.query.draggedID));
					}.bind(this)
				);
			}
		}
	},

	/**
	 * This function is called when sort response arives
	 *
	 * @param XMLHttpRequest originalRequest Ajax request object
	 *
	 * @access private
	 */
	restoreDraggedItem: function(item, li)
	{
		// if moving elements from one active list to another we should also change the id of the HTMLLElement
		if(li.prevParentId != li.parentNode.id && li.parentNode.id == this.ul.id)
		{
			li.id = li.parentNode.id + "_" + li.id.substring(li.prevParentId.length + 1);
		}

		this.rebindIcons(li);
		this.hideMenu(li);

		this._currentLi = li;

		if (this.callbacks.afterSort)
		{
			var success = this.callbacks.afterSort.call(this, li, item);
		}
		this.createSortable(true);

		// Recreate parent list sortable as well
		var parentList = this.ul.up(".activeList");
		if(parentList && ActiveList.prototype.activeListsUsers[parentList.id])
		{
			ActiveList.prototype.activeListsUsers[parentList.id].createSortable(true);
		}

		this.colorizeItems();
		li.prevParentId = this.ul.id;
		this.offProgress(li);

		if(success !== false && li.up('ul') == this.ul)
		{
			this.highlight(li, 'yellow');
		}

		this.dragged = false;
	},

	/**
	 * Keyboard access functionality
	 *	 - navigate list using up/down arrow keys
	 *	 - move items up/down using Shift + up/down arrow keys
	 *	 - delete items with Del key
	 *	 - drop focus ("exit" list) with Esc key
	 *
	 * @param KeyboardEvent keyboard KeyboardEvent object
	 * @param HtmlElementLi li A reference to item element
	 *
	 * @access private
	 *
	 * @todo Edit items with Enter key
	 */
	navigate: function(keyboard, li)
	{
		switch(keyboard.getKey())
		{
			case keyboard.KEY_UP: // sort/navigate up
				if (keyboard.isShift())
				{
					prev = this.getPrevSibling(li);

					prev = (prev == prev.parentNode.lastChild) ? null : prev;

					this.moveNode(li, prev);
				}
			break;

			case keyboard.KEY_DOWN: // sort/navigate down

				if (keyboard.isShift())
				{
					var next = this.getNextSibling(li);
					if (next != next.parentNode.firstChild) next = next.nextSibling;

					this.moveNode(li, next);
				}
			break;

			case keyboard.KEY_DEL: // delete
				if(this.icons['delete']) this.bindAction(li, 'delete');
			break;

			case keyboard.KEY_ESC:  // escape - lose focus
				li.blur();
			break;
		}
	},

	/**
	 * Moves list node
	 *
	 * @param HtmlElementLi li A reference to item element
	 * @param HtmlElementLi beforeNode A reference to item element
	 *
	 * @access private
	 */
	moveNode: function(li, beforeNode)
	{
		var self = this;

		this.dragged = li;

		li.parentNode.insertBefore(this.dragged, beforeNode);

		this.sortTimerStart = (new Date()).getTime();
		setTimeout(function(e)
		{
			if((new Date()).getTime() - self.sortTimerStart >= 1000)
			{
				self.saveSortOrder();
			}
		}, this.keyboardSortTimeout);
	},

	/**
	 * Gets next sibling for element in node list.
	 * If the element is the last node, the first node is being returned
	 *
	 * @param HtmlElementLi li A reference to item element
	 *
	 * @access private
	 *
	 * @return HtmlElementLi Next sibling
	 */
	getNextSibling: function(element)
	{
		return element.nextSibling ? element.nextSibling : element.parentNode.firstChild;
	},

	/**
	 * Gets previous sibling for element in node list.
	 * If the element is the first node, the last node is being returned
	 *
	 * @param HtmlElementLi li A reference to item element
	 *
	 * @access private
	 *
	 * @return Node Previous sibling
	 */
	getPrevSibling: function(element)
	{
		return !element.previousSibling ? element.parentNode.lastChild : element.previousSibling;
	},

	/**
	 * Remove record from active list
	 *
	 * @param HtmlElementLi li A reference to item element
	 */
	remove: function(li, touch)
	{
		if(touch !== false) touch = true;

		if(touch && BrowserDetect.browser != 'Explorer')
		{
			Effect.SwitchOff(li, {duration: 1});
			setTimeout(function() {
				if (li.parentNode)
				{
					Element.remove(li);
				}
			}, 10);
		}
		else
		{
			Element.remove(li);
		}
	},

	/**
	 * Collapse all opened records
	 *
	 * @param lists You can specify wich lists to collapse
	 */
	collapseAll: function()
	{
		var activeLists = {};

		if(!this.ul)
		{
			activeLists = ActiveList.prototype.activeListsUsers;
		}
		else
		{
			activeLists[this.ul.id] = true;
		}

		$H(activeLists).each(function(activeList)
		{
			if(!activeList.value.ul || 0 >= activeList.value.ul.offsetHeight) return; // if list is invisible there is no need to collapse it

			var containers = document.getElementsByClassName('activeList_container', activeList.value.ul);

			for(var i = 0; i < containers.length; i++)
			{
				if(0 >= containers[i].offsetHeight) continue;

				activeList.value.toggleContainerOff(containers[i]);
			}
		});
	},


	recreateVisibleLists: function()
	{
		$H(ActiveList.prototype.activeListsUsers).each(function(activeList)
		{
			if(!activeList.value.ul || 0 >= activeList.value.ul.offsetHeight) return; // if list is invisible there is no need to collapse it
			ActiveList.prototype.getInstance(activeList.value.ul).touch();
		});
	},

	/**
	 * Get list of references to all ActiveList ActiveRecords (li)
	 */
	getChildList: function()
	{

		var liArray = this.ul.getElementsByTagName("li");
		var childList = [];

		for(var i = 0; i < liArray.length; i++)
		{
			if(this.ul == liArray[i].parentNode && !Element.hasClassName(liArray[i], 'ignore') && !Element.hasClassName(liArray[i], 'dom_template'))
			{
				childList[childList.length] = liArray[i];
			}
		}

		return childList;
	},

	/**
	 * Make list work again
	 */
	touch: function(force)
	{
		this.generateAcceptFromArray(force);
		this.createSortable(force);
	}
}

ActiveList.CallbacksCommon = function() {}
ActiveList.CallbacksCommon.prototype =
{
	beforeDelete: function(li)
	{
		if(confirm(this.callbacks.deleteMessage))
		{
			return Backend.Router.createUrl(this.callbacks.controller, 'delete', {id: this.getRecordId(li)});
		}
	},

	beforeSort: function(li, order)
	{
		return Backend.Router.createUrl(this.callbacks.controller, 'sort', {target: li.parentNode.id}) + '&' + order;
	}
}


/***************************************************
 * library/rico/ricobase.js
 ***************************************************/


//-------------------- rico.js
var Rico = {
  Version: 'current_build-54'
}

Rico.Effect = {};

Rico.URL = Class.create();
Rico.URL.prototype = {
	initialize : function(url){ 
	  pair = url.split('?')
	  this.basePath =  pair[0];
	  this.params = this.extractParams(pair[1]);
	},
	extractParams: function (paramString) {
	  if (!paramString) return {};
	  return paramString.split('&').map(function(p){return p.split('amp;').last()});
	},
	getParamValue: function (name) {
	  var matchName = name
	  var param = $A(this.params).find(function(p){return matchName==p.split('=')[0]});
	  return param ? param.split('=')[1] : null;
	},
	addParam: function(name, value){
	  this.params.push(name +"="+ value)
	},
	setParam: function(name, value){
	  var matchName = name
	  this.params = $A(this.params).reject(function(p){return matchName==p.split('=')[0]});		
	  this.addParam(name,value);
	},
	toS: function(){
	  var paramString = this.params.join('&');
	  return this.basePath + ((paramString != "") ? ("?" + paramString) : "");
	}	
}



//Rico.layout = {
//  makeYClipping: function(element) {
//	element = $(element);
//	if (element._overflowY) return;
//	element._overflow = element.style.overflow;
//	if ((Element.getStyle(element, 'yoverflow') || 'visible') != 'hidden')
//	 ;
//	  element.style.overflow-y = 'hidden';
//  },
//  undoYClipping: function(element) {
//	element = $(element);
//	if (element._overflowY) return;
//	element.style.overflow = element._overflowY;
//	element._overflowY = undefined;
//  }
//}


var RicoUtil = {

   getElementsComputedStyle: function ( htmlElement, cssProperty, mozillaEquivalentCSS) {
	  if ( arguments.length == 2 )
		 mozillaEquivalentCSS = cssProperty;

	  var el = $(htmlElement);
	  if ( el.currentStyle )
		 return el.currentStyle[cssProperty];
	  else
		 return document.defaultView.getComputedStyle(el, null).getPropertyValue(mozillaEquivalentCSS);
   },
   createXmlDocument: function() {
	  if (document.implementation && document.implementation.createDocument) {
		 var doc = document.implementation.createDocument("", "", null);

		 if (doc.readyState == null) {
			doc.readyState = 1;
			doc.addEventListener("load", function () {
			   doc.readyState = 4;
			   if (typeof doc.onreadystatechange == "function")
				  doc.onreadystatechange();
			}, false);
		 }
		 return doc;
	  }
	  if (window.ActiveXObject)
		  return Try.these(
			function() { return new ActiveXObject('MSXML2.DomDocument')   },
			function() { return new ActiveXObject('Microsoft.DomDocument')},
			function() { return new ActiveXObject('MSXML.DomDocument')	},
			function() { return new ActiveXObject('MSXML3.DomDocument')   }
		  ) || false;

	  return null;
   },

   getContentAsString: function( parentNode ) {
	  return parentNode.xml != undefined ? 
		 this._getContentAsStringIE(parentNode) :
		 this._getContentAsStringMozilla(parentNode);
   },

  _getContentAsStringIE: function(parentNode) {
	 var contentStr = "";
	 for ( var i = 0 ; i < parentNode.childNodes.length ; i++ ) {
		 var n = parentNode.childNodes[i];
		 if (n.nodeType == 4) {
			 contentStr += n.nodeValue;
		 }
		 else {
		   contentStr += n.xml;
	   }
	 }
	 return contentStr;
  },

  _getContentAsStringMozilla: function(parentNode) {
	 var xmlSerializer = new XMLSerializer();
	 var contentStr = "";
	 for ( var i = 0 ; i < parentNode.childNodes.length ; i++ ) {
		  var n = parentNode.childNodes[i];
		  if (n.nodeType == 4) { // CDATA node
			  contentStr += n.nodeValue;
		  }
		  else {
			contentStr += xmlSerializer.serializeToString(n);
		}
	 }
	 return contentStr;
  },

   toViewportPosition: function(element) {
	  return this._toAbsolute(element,true);
   },

   toDocumentPosition: function(element) {
	  return this._toAbsolute(element,false);
   }
}

//-------------------- ricoAjaxEngine.js
Rico.AjaxEngine = Class.create();

Rico.AjaxEngine.prototype = {

   initialize: function() {
	  this.ajaxElements = new Array();
	  this.ajaxObjects  = new Array();
	  this.requestURLS  = new Array();
	  this.options = {};
   },

   registerAjaxElement: function( anId, anElement ) {
	  if ( !anElement )
		 anElement = $(anId);
	  this.ajaxElements[anId] = anElement;
   },

   registerAjaxObject: function( anId, anObject ) {
	  this.ajaxObjects[anId] = anObject;
   },

   registerRequest: function (requestLogicalName, requestURL) {
	  this.requestURLS[requestLogicalName] = requestURL;
   },

   sendRequest: function(requestName, options) {
	  // Allow for backwards Compatibility
	  if ( arguments.length >= 2 )
	   if (typeof arguments[1] == 'string')
		 options = {parameters: this._createQueryString(arguments, 1)};
	  this.sendRequestWithData(requestName, null, options);
   },

   sendRequestWithData: function(requestName, xmlDocument, options) {
	  var requestURL = this.requestURLS[requestName];
	  if ( requestURL == null )
		 return;

	  // Allow for backwards Compatibility
	  if ( arguments.length >= 3 )
		if (typeof arguments[2] == 'string')
		  options.parameters = this._createQueryString(arguments, 2);

	  new Ajax.Request(requestURL, this._requestOptions(options,xmlDocument));
   },

   sendRequestAndUpdate: function(requestName,container,options) {
	  // Allow for backwards Compatibility
	  if ( arguments.length >= 3 )
		if (typeof arguments[2] == 'string')
		  options.parameters = this._createQueryString(arguments, 2);

	  this.sendRequestWithDataAndUpdate(requestName, null, container, options);
   },

   sendRequestWithDataAndUpdate: function(requestName,xmlDocument,container,options) {
	  var requestURL = this.requestURLS[requestName];
	  if ( requestURL == null )
		 return;

	  // Allow for backwards Compatibility
	  if ( arguments.length >= 4 )
		if (typeof arguments[3] == 'string')
		  options.parameters = this._createQueryString(arguments, 3);

	  var updaterOptions = this._requestOptions(options,xmlDocument);

	  new Ajax.Updater(container, requestURL, updaterOptions);
   },

   // Private -- not part of intended engine API --------------------------------------------------------------------

   _requestOptions: function(options,xmlDoc) {
	  var requestHeaders = ['X-Rico-Version', Rico.Version ];
	  var sendMethod = 'post';
	  if ( xmlDoc == null )
		if (Rico.prototypeVersion < 1.4)
		requestHeaders.push( 'Content-type', 'text/xml' );
	  else
		  sendMethod = 'get';
	  (!options) ? options = {} : '';

	  if (!options._RicoOptionsProcessed){
	  // Check and keep any user onComplete functions
		if (options.onComplete)
			 options.onRicoComplete = options.onComplete;
		// Fix onComplete
		if (options.overrideOnComplete)
		  options.onComplete = options.overrideOnComplete;
		else
		  options.onComplete = this._onRequestComplete.bind(this);
		options._RicoOptionsProcessed = true;
	  }

	 // Set the default options and extend with any user options
	 this.options = {
					 requestHeaders: requestHeaders,
					 parameters:	 options.parameters,
					 postBody:	   xmlDoc,
					 method:		 sendMethod,
					 onComplete:	 options.onComplete
					};
	 // Set any user options:
	 Object.extend(this.options, options);
	 return this.options;
   },

   _createQueryString: function( theArgs, offset ) {
	  var queryString = ""
	  for ( var i = offset ; i < theArgs.length ; i++ ) {
		  if ( i != offset )
			queryString += "&";

		  var anArg = theArgs[i];

		  if ( anArg.name != undefined && anArg.value != undefined ) {
			queryString += anArg.name +  "=" + escape(anArg.value);
		  }
		  else {
			 var ePos  = anArg.indexOf('=');
			 var argName  = anArg.substring( 0, ePos );
			 var argValue = anArg.substring( ePos + 1 );
			 queryString += argName + "=" + escape(argValue);
		  }
	  }
	  return queryString;
   },

   _onRequestComplete : function(request) {

	  if(!request)
		  return;

	  // User can set an onFailure option - which will be called by prototype
	  if (request.status != 200)
		return;

//	  var response = request.responseXML.getElementsByTagName("ajax-response");
	  var response = eval('(' + request.responseText + ')');
	  if (response == null)
	  {
		 return;		
	  }
	  this._processAjaxResponse( response);
	  
	  // Check if user has set a onComplete function
	  var onRicoComplete = this.options.onRicoComplete;
	  if (onRicoComplete != null)
		  onRicoComplete();
   },

   _processAjaxResponse: function( xmlResponseElements ) {

	  for ( var i = 0 ; i < xmlResponseElements.length ; i++ ) {
		 var responseElement = xmlResponseElements[i];

		 // only process nodes of type element.....
		 if ( responseElement.nodeType != 1 )
			continue;

		 var responseType = responseElement.getAttribute("type");
		 var responseId   = responseElement.getAttribute("id");

		 if ( responseType == "object" )
			this._processAjaxObjectUpdate( this.ajaxObjects[ responseId ], responseElement );
		 else if ( responseType == "element" )
			this._processAjaxElementUpdate( this.ajaxElements[ responseId ], responseElement );
		 else
			alert('unrecognized AjaxResponse type : ' + responseType );
	  }
   },

   _processAjaxObjectUpdate: function( ajaxObject, responseElement ) {
	  ajaxObject.ajaxUpdate( responseElement );
   },

   _processAjaxElementUpdate: function( ajaxElement, responseElement ) {
	  ajaxElement.innerHTML = RicoUtil.getContentAsString(responseElement);
   }

}

var ajaxEngine = new Rico.AjaxEngine();





/***************************************************
 * library/rico/ricoLiveGrid.js
 ***************************************************/

// Rico.LiveGridMetaData -----------------------------------------------------

Rico.LiveGridMetaData = Class.create();

Rico.LiveGridMetaData.prototype = {

	initialize: function( pageSize, totalRows, columnCount, options ) {
		this.pageSize  = pageSize;
		this.totalRows = totalRows;
		this.setOptions(options);
		this.ArrowHeight = 16;
		this.columnCount = columnCount;
	},

	setOptions: function(options) {
		this.options = {
		 largeBufferSize	: 3.0,	// 3 pages
		 nearLimitFactor	: 0.3	// 30% of buffer
		};
		Object.extend(this.options, options || {});
	},

	getPageSize: function() {
		return this.pageSize;
	},

	getTotalRows: function() {
		return this.totalRows;
	},

	setTotalRows: function(n) {
		this.totalRows = n;
	},

	getLargeBufferSize: function() {
		return parseInt(this.options.largeBufferSize * this.pageSize);
	},

	getLimitTolerance: function() {
		return parseInt(this.getLargeBufferSize() * this.options.nearLimitFactor);
	}
};

// Rico.LiveGridScroller -----------------------------------------------------

Rico.LiveGridScroller = Class.create();

Rico.LiveGridScroller.prototype = {

	initialize: function(liveGrid, viewPort) {
		this.isIE = navigator.userAgent.toLowerCase().indexOf("msie") >= 0;
		this.liveGrid = liveGrid;
		this.liveGrid.scroller = this;
		this.metaData = liveGrid.metaData;
		this.createScrollBar();
		this.scrollTimeout = null;
		this.lastScrollPos = 0;
		this.viewPort = viewPort;
		this.rows = new Array();
	},

	isUnPlugged: function() {
		return this.scrollerDiv.onscroll == null;
	},

	plugin: function() {
		this.scrollerDiv.onscroll = this.handleScroll.bindAsEventListener(this);
	},

	unplug: function() {
		this.scrollerDiv.onscroll = null;
	},

	sizeIEHeaderHack: function() {
		if ( !this.isIE ) return;
		var headerTable = $(this.liveGrid.tableId + "_header");
		if ( headerTable )
		 headerTable.rows[0].cells[0].style.width =
			(headerTable.rows[0].cells[0].offsetWidth + 1) + "px";
	},

	createScrollBar: function() {
		var visibleHeight = this.liveGrid.viewPort.visibleHeight();
		// create the outer div...
		this.scrollerDiv  = document.createElement("div");
		this.scrollerDiv.className = 'activeGridScroller';

		var scrollerStyle = this.scrollerDiv.style;
		scrollerStyle.float	= "right";
		/*scrollerStyle.left		= this.isIE ? "-6px" : "-4px";*/
		/*scrollerStyle.width		 = "19px";*/
		scrollerStyle.height		= (visibleHeight - 30) + "px";

		// create the inner div...
		this.heightDiv = document.createElement("div");
		this.heightDiv.style.width  = "1px";

		this.heightDiv.style.height = (parseInt(visibleHeight *
						this.metaData.getTotalRows()/this.metaData.getPageSize()) - 3) + "px" ;

		this.scrollerDiv.appendChild(this.heightDiv);
		this.scrollerDiv.onscroll = this.handleScroll.bindAsEventListener(this);

	 var table = this.liveGrid.table;
	 table.parentNode.parentNode.insertBefore( this.scrollerDiv, table.parentNode.nextSibling );

		// mouse scroll
		var eventName = this.isIE ? "mousewheel" : "DOMMouseScroll";
		Event.observe(table, eventName,
					function(evt) {
						 if (evt.wheelDelta>=0 || evt.detail < 0) //wheel-up
							this.scrollerDiv.scrollTop -= (2*this.viewPort.rowHeight);
						 else
							this.scrollerDiv.scrollTop += (2*this.viewPort.rowHeight);
						 this.handleScroll(false);
					}.bindAsEventListener(this),
					false);

		// keyboard scroll
		table.tabIndex = 0;
		Event.observe(table.down('tbody'), 'click', table.focus.bind(table));
		Event.observe(table, 'keypress', this.handleKeyboardScroll.bind(this));
	 },

	handleKeyboardScroll: function(e)
	{
		if (e.keyCode == Event.KEY_UP)
		{
			this.scrollerDiv.scrollTop -= (2*this.viewPort.rowHeight);
		}
		else if (e.keyCode == Event.KEY_DOWN)
		{
			this.scrollerDiv.scrollTop += (2*this.viewPort.rowHeight);
		}

		this.handleScroll(false);
	},

	updateSize: function() {
		var table = this.liveGrid.table;
		var visibleHeight = this.viewPort.visibleHeight();
		this.heightDiv.style.height = parseInt(visibleHeight *
									this.metaData.getTotalRows()/this.metaData.getPageSize()) + "px";
	},

	rowToPixel: function(rowOffset) {
		return (rowOffset / this.metaData.getTotalRows()) * this.heightDiv.offsetHeight
	},

	moveScroll: function(rowOffset) {
		this.scrollerDiv.scrollTop = this.rowToPixel(rowOffset);
		if ( this.metaData.options.onscroll )
		 this.metaData.options.onscroll( this.liveGrid, rowOffset );
	},

	handleScroll: function(noRefresh) {

	if ( this.scrollTimeout )
		 clearTimeout( this.scrollTimeout );

	var scrollDiff = this.lastScrollPos-this.scrollerDiv.scrollTop;
	if (scrollDiff != 0.00) {
		 var r = this.scrollerDiv.scrollTop % this.viewPort.rowHeight;
		 if (r != 0) {
			this.unplug();
			if ( scrollDiff < 0 ) {
			 this.scrollerDiv.scrollTop += (this.viewPort.rowHeight-r);
			} else {
			 this.scrollerDiv.scrollTop -= r;
			}
			this.plugin();
		 }
	}
	var contentOffset = parseInt(this.scrollerDiv.scrollTop / this.viewPort.rowHeight);

	if (typeof(noRefresh) == 'object')
	{
		this.liveGrid.requestContentRefresh(contentOffset);
	}

	this.viewPort.scrollTo(this.scrollerDiv.scrollTop);

	if ( this.metaData.options.onscroll )
		 this.metaData.options.onscroll( this.liveGrid, contentOffset );

	this.scrollTimeout = setTimeout(this.scrollIdle.bind(this), 300 );
	this.lastScrollPos = this.scrollerDiv.scrollTop;

	},

	scrollIdle: function() {
		if ( this.metaData.options.onscrollidle )
		 this.metaData.options.onscrollidle();
	},

	getOffset: function()
	{
		return parseInt(this.scrollerDiv.scrollTop / this.viewPort.rowHeight);
	}
};

// Rico.LiveGridBuffer -----------------------------------------------------

Rico.LiveGridBuffer = Class.create();

Rico.LiveGridBuffer.prototype = {

	initialize: function(metaData, viewPort) {
		this.startPos = 0;
		this.size	 = 0;
		this.metaData = metaData;
		this.rows	 = new Array();
		this.rowCache = new Object();
		this.updateInProgress = false;
		this.viewPort = viewPort;
		this.maxBufferSize = metaData.getLargeBufferSize() * 2;
		this.maxFetchSize = metaData.getLargeBufferSize();
		this.lastOffset = 0;
	},

	getBlankRow: function() {
		if (!this.blankRow ) {
		 this.blankRow = new Array();
		 for ( var i=0; i < this.metaData.columnCount ; i++ )
			this.blankRow[i] = "&nbsp;";
	 }
	 return this.blankRow;
	},

	loadRows: function(data)
	{
		var data = this.viewPort.liveGrid.activeGrid.getRows(data);

		var newRows = data['data'];

		if ((data["totalCount"] != undefined) && (data["totalCount"] != null))
		{
			this.viewPort.liveGrid.setTotalRows(data["totalCount"]);
			this.size = data["totalCount"];
		}

		// Check if user has set a onRefreshComplete function
		var onRefreshComplete = this.viewPort.liveGrid.options.onRefreshComplete;
		if (onRefreshComplete != null)
		{
			onRefreshComplete();
		}

		return newRows;
	},

	update: function(ajaxResponse, start)
	{
		var newRows = this.loadRows(ajaxResponse);

		var bufferSize = this.metaData.getLargeBufferSize();

		var chunks = this.getChunkIDs(start);
		var chunk;

		if (newRows.length > bufferSize)
		{
			chunks[1]++;
		}

		for (k = 0; k <= 1; k++)
		{
			if ((1 == k) && (chunks[0] == chunks[1]))
			{
				continue;
			}

			if (!this.isCached(chunks[k]))
			{
				chunk = new Array();
				i = -1;
				for (c = (k * bufferSize); i <= bufferSize; c++)
				{
					if (!newRows[c])
					{
						break;
					}

					i++;
					chunk[i] = newRows[c];
				}

				if (chunk.length > bufferSize)
				{
					chunk = chunk.slice(0, bufferSize);
				}
				//chunk = newRows.slice((k * bufferSize), bufferSize);

				// do not store incomplete chunks
				if (0 == k || (chunk.length == bufferSize))
				{
					this.setCache(chunks[k], chunk);
				}
			}
		}

		this.startPos = 0;

		this.rows = this.getRows(start, this.viewPort.rows.length);
	},

	clear: function()
	{
		this.rows = new Array();
		this.rowCache = new Object();
		this.startPos = 0;
		this.size = 0;
	},

	isOverlapping: function(start, size) {
		return ((start < this.endPos()) && (this.startPos < start + size)) || (this.endPos() == 0)
	},

	isNearingTopLimit: function(position)
	{
		var chunks = getChunkIDs(position);
		return (this.isCached(chunks[0]) && this.isCached(chunks[1]));
	},

	endPos: function() {
		return this.startPos + this.rows.length;
	},

	isNearingBottomLimit: function(position) {
		return this.endPos() - (position + this.metaData.getPageSize()) < this.metaData.getLimitTolerance();
	},

	isAtTop: function() {
		return this.startPos == 0;
	},

	isAtBottom: function() {
		return this.endPos() == this.metaData.getTotalRows();
	},

	isNearingLimit: function(position) {
		return ( !this.isAtTop()	&& this.isNearingTopLimit(position)) ||
			 ( !this.isAtBottom() && this.isNearingBottomLimit(position) )
	},

	getFetchSize: function(offset)
	{
		// determine which chunks are required
		var chunks = this.getChunkIDs(offset);

		var bufferSize = this.metaData.getLargeBufferSize();

		var size = $H();

		for (k = 0; k <= 1; k++)
		{
			if (!this.isCached(chunks[k]))
			{
				size[chunks[k]] = bufferSize;
			}
		}

		var totalSize = 0;
		size.each(function(k)
		{
			totalSize += k.value;
		});

		return totalSize;
	},

	getFetchOffset: function(offset)
	{
		// determine which chunks are required
		var chunks = this.getChunkIDs(offset);

		// check if this offset hasn't been cached already
		offset = -1;

		// determine offset start
		for (k = 1; k >= 0; k--)
		{
			if (!this.isCached(chunks[k]))
			{
				offset = this.getChunkOffset(chunks[k]);
				if (this.size && (offset >= this.size))
				{
					offset = -1;
				}
			}
		}

		this.lastOffset = offset;
		return offset;
	},

	/**
	 *  Determine if the chunk has already been cached
	 */
	isCached: function(chunkID)
	{
		return (this.rowCache[chunkID] != undefined);
	},

	getChunkOffset: function(chunkID)
	{
		return chunkID * this.metaData.getLargeBufferSize();
	},

	/**
	 *  Get grid data chunk IDs by offset row ID
	 */
	getChunkIDs: function(offset)
	{
		if (offset >= this.size && this.size > 0)
		{
			offset = this.size - this.metaData.getPageSize() - 1;
		}

		var bufferSize = this.metaData.getLargeBufferSize();

		if (offset < 0)
		{
			offset = 0;
		}

		var startBufferId = Math.floor(offset / bufferSize);

		var endOffset = offset + this.metaData.getPageSize();

		if (endOffset > this.size)
		{
			endOffset = this.size - 1;
		}

		if (endOffset < 0)
		{
			endOffset = 0;
		}

		var endBufferId = Math.floor(endOffset / bufferSize);

		return new Array(startBufferId, endBufferId);
	},

	/**
	 *  Store chunk data to cache
	 */
	setCache: function(chunkID, rowData)
	{
		this.rowCache[chunkID] = rowData;
	},

	getChunk: function(chunkID)
	{
		return this.rowCache[chunkID];
	},

	getRows: function(start, count)
	{
		if (this.size <= start)
		{
			start = this.size - this.metaData.getLargeBufferSize();
			//start = start - this.metaData.getLargeBufferSize();
		}

		var chunks = this.getChunkIDs(start);

		// make sure the chunks are cached
		for (k = 0; k <= 1; k++)
		{
			if (!this.isCached(chunks[k]))
			{
				this.viewPort.liveGrid.requestContentRefresh(start);
				return new Array();
			}
		}

		var rows = $H();

		for (k = 0; k <= 1; k++)
		{
			var chunkOffset = start - this.getChunkOffset(chunks[k]);

			var chunk = this.getChunk(chunks[k]);

			if (chunkOffset >= 0)
			{
				rows[chunks[k]] = chunk.slice(chunkOffset);
			}
			else
			{
				rows[chunks[k]] = chunk.slice(0, 15 + chunkOffset);
			}
		}

		var allRows = new Array();
		rows.each(function(k)
		{
			allRows = allRows.concat(k.value);
		});

		return allRows;
	}
};


//Rico.GridViewPort --------------------------------------------------
Rico.GridViewPort = Class.create();

Rico.GridViewPort.prototype = {

	initialize: function(table, rowHeight, visibleRows, buffer, liveGrid) {
		this.lastDisplayedStartPos = 0;
		this.div = table.parentNode;
		this.table = table
		this.rowHeight = rowHeight;
		this.div.style.height = (this.rowHeight * visibleRows) + "px";
//		this.div.style.overflow = "hidden";
		this.buffer = buffer;
		this.buffer.viewPort = this;
		this.liveGrid = liveGrid;
		this.visibleRows = visibleRows + 1;
		this.lastPixelOffset = 0;
		this.startPos = 0;

		this.rows = this.table.down('tbody').getElementsByTagName('tr');
	},

	populateRow: function(htmlRow, row)
	{
		if (!htmlRow || !row)
		{
			return false;
		}

		if (!htmlRow.checkBox && row[0])
		{
			htmlRow.cells[0].innerHTML = row[0];
			htmlRow.checkBox = htmlRow.cells[0].down('input');
		}

		if (row[0] != '&nbsp;')
		{
			if (!htmlRow.cells[0].firstChild)
			{
				htmlRow.cells[0].appendChild(htmlRow.checkBox);
			}
		}
		else
		{
			htmlRow.cells[0].innerHTML = '';
		}

		for (var j=1; j < row.length; j++)
		{
			htmlRow.cells[j].innerHTML = row[j]
		}

		if (row.id)
		{
			htmlRow.recordId = row.id;
			htmlRow.checkBox.name = 'item[' + row.id + ']';
		}
	},

	bufferChanged: function() {
		this.refreshContents( parseInt(this.lastPixelOffset / this.rowHeight));
	},

	clearRows: function() {
		if (!this.isBlank) {
		 this.liveGrid.table.className = this.liveGrid.options.loadingClass;
		 for (var i=0; i < this.visibleRows; i++)
			this.populateRow(this.rows[i], this.buffer.getBlankRow());
		 this.isBlank = true;
		}
	},

	clearContents: function() {
		this.clearRows();
		this.scrollTo(0);
		this.startPos = 0;
		this.lastStartPos = -1;
	},

	refreshContents: function(startPos) {

		this.isBlank = false;
		var viewPrecedesBuffer = this.buffer.startPos > startPos
		var contentStartPos = viewPrecedesBuffer ? this.buffer.startPos: startPos;
		var contentEndPos = (this.buffer.startPos + this.buffer.size < startPos + this.visibleRows)
								 ? this.buffer.startPos + this.buffer.size
								 : startPos + this.visibleRows;
		var rowSize = contentEndPos - contentStartPos;
		var rows = this.buffer.getRows(contentStartPos, rowSize );
		var blankSize = this.visibleRows - rowSize;
		var blankOffset = viewPrecedesBuffer ? 0: rowSize;
		var contentOffset = viewPrecedesBuffer ? blankSize: 0;

		for (var i=0; i < rows.length; i++) {//initialize what we have
		this.populateRow(this.rows[i + contentOffset], rows[i]);
		}

		for (var i=0; (i < blankSize + 5) && (i < this.rows.length); i++) {// blank out the rest
		this.populateRow(this.rows[i + blankOffset], this.buffer.getBlankRow());
		}

		this.isPartialBlank = blankSize > 0;
		this.lastRowPos = startPos;

		 this.liveGrid.table.className = this.liveGrid.options.tableClass;
		 this.liveGrid.onUpdate();

		// there are some problems with cell content alignment in Firefox,
		// which can be fixed by redrawing the table
		this.rows[0].style.border = '3px solid grey;';
		this.rows[0].style.border = '';

	},

	scrollTo: function(pixelOffset) {
		if (this.lastPixelOffset == pixelOffset)
		 return;

		this.refreshContents(parseInt(pixelOffset / this.rowHeight))

		this.lastPixelOffset = pixelOffset;
	},

	visibleHeight: function() {
		return parseInt(RicoUtil.getElementsComputedStyle(this.div, 'height'));
	}

};


Rico.LiveGridRequest = Class.create();
Rico.LiveGridRequest.prototype = {
	initialize: function( requestOffset, options ) {
		this.requestOffset = requestOffset;
	}
};

// Rico.LiveGrid -----------------------------------------------------

Rico.LiveGrid = Class.create();

Rico.LiveGrid.prototype = {

	fetchRequests: new Object(),

	initialize: function( tableId, visibleRows, totalRows, url, options, ajaxOptions ) {

	 this.options = {
				tableClass:			 $(tableId).className,
				loadingClass:		 $(tableId).className,
				scrollerBorderRight: '1px solid #ababab',
				bufferTimeout:		20000,
				sortAscendImg:		'images/sort_asc.gif',
				sortDescendImg:		 'images/sort_desc.gif',
				ajaxSortURLParms:	 [],
				onRefreshComplete:	null,
				requestParameters:	null,
				inlineStyles:		 true
				};
		Object.extend(this.options, options || {});

		this.ajaxOptions = {parameters: null};
		Object.extend(this.ajaxOptions, ajaxOptions || {});

		this.sort = new Rico.LiveGridSort(tableId, this.options)

		this.tableId	 = tableId;
		this.table		 = $(tableId);

		this.addLiveGridHtml();

		var columnCount  = this.sort.headerTable.rows[0].cells.length;
		this.metaData	= new Rico.LiveGridMetaData(visibleRows, totalRows, columnCount, options);
		this.buffer		= new Rico.LiveGridBuffer(this.metaData);

		var rowCount = this.table.down('tbody').rows.length;
		this.viewPort =  new Rico.GridViewPort(this.table,
											'30',
											visibleRows,
											this.buffer, this);
		this.scroller	= new Rico.LiveGridScroller(this,this.viewPort);
		this.options.sortHandler = this.sortHandler.bind(this);

		this.processingRequest = null;
		this.unprocessedRequest = null;

		this.url = url;
	},

	init: function()
	{
		this.initAjax(this.url);
		if ( this.options.prefetchBuffer || this.options.prefetchOffset > 0) {
		 var offset = 0;
		 if (this.options.offset ) {
			offset = this.options.offset;
			this.scroller.moveScroll(offset);
			this.viewPort.scrollTo(this.scroller.rowToPixel(offset));
		 }
		 if (this.options.sortCol) {
			 this.sortCol = options.sortCol;
			 this.sortDir = options.sortDir;
		 }
		}
	},

	onUpdate: function()
	{
	},

	onBeginDataFetch: function()
	{
	},

	addLiveGridHtml: function() {

/*
	 // Check to see if need to create a header table.
	 if (this.table.getElementsByTagName("thead").length > 0 && !'this code sucks'){
		 // Create Table this.tableId+'_header'
		 var tableHeader = this.table.cloneNode(true);
		 tableHeader.setAttribute('id', this.tableId+'_header');
		 tableHeader.setAttribute('class', this.table.className+'_header');

		 // Clean up and insert
		 for( var i = 0; i < tableHeader.tBodies.length; i++ )
		 tableHeader.removeChild(tableHeader.tBodies[i]);
		 this.table.deleteTHead();
		 this.table.parentNode.insertBefore(tableHeader,this.table);
	 }
*/
	this.table.setAttribute('id', this.tableId+'_header');
	this.table.setAttribute('class', this.table.className+'_header');

	new Insertion.Before(this.table, "<div id='"+this.tableId+"_container'></div>");
	this.table.previousSibling.appendChild(this.table);
	new Insertion.Before(this.table,"<div id='"+this.tableId+"_viewport' class='activeGrid_viewport' style='float:left;'></div>");
	this.table.previousSibling.appendChild(this.table);
	},


	resetContents: function() {
		this.scroller.moveScroll(0);
		this.buffer.clear();
		this.viewPort.clearContents();
		this.fetchRequests = new Object()
	},

	sortHandler: function(column) {
		if(!column) return ;
		this.sortCol = column.name;
		this.sortDir = column.currentSort;

		$A(this.table.getElementsByClassName('sortedColumn')).each
		(
			function(element)
			{
				element.removeClassName('sortedColumn');
			}
		);

		var cells = $A(this.table.getElementsByClassName('cell_' + column.name.replace('.', '_')));
		var sortDirection = this.sortDir == 'ASC' ? 0 : cells.length;
		cells.each
		(
			function(element, index)
			{
				$A(element.className.match(/sort[0-9]+/g)).each
				(
					function(className)
					{
						element.removeClassName(className);
					}
				)

				element.addClassName('sortedColumn');
				element.addClassName('sort' + Math.abs(sortDirection - index));
			}
		);

		this.resetContents();
		this.requestContentRefresh(0)
	},

	adjustRowSize: function() {

	},

	setTotalRows: function( newTotalRows ) {
		this.metaData.setTotalRows(newTotalRows);
		this.resetContents();
		this.scroller.updateSize();
		this.scroller.handleScroll(true);
	},

	initAjax: function(url) {
		ajaxEngine.registerRequest( this.tableId + '_request', url );
		ajaxEngine.registerAjaxObject( this.tableId + '_updater', this );
	},

	invokeAjax: function() {
	},

	handleTimedOut: function() {
		//server did not respond in 4 seconds... assume that there could have been
		//an error or something, and allow requests to be processed again...
		this.processingRequest = null;
		//this.processQueuedRequest();
	},

	getQueryString: function(fetchSize, bufferStartPos)
	{
		var queryString = null;

		if (this.options.requestParameters)
		{
			queryString = this._createQueryString(this.options.requestParameters, 0);
		}

		queryString = (queryString == null) ? '' : queryString+'&';

		queryString = queryString+'id='+this.tableId;

		if (fetchSize)
		{
			queryString += '&page_size=' + fetchSize;
		}

		if (bufferStartPos)
		{
			queryString += '&offset=' + bufferStartPos;
		}

		if (this.sortCol)
		{
			queryString = queryString+'&sort_col='+escape(this.sortCol)+'&sort_dir='+this.sortDir;
		}

		return queryString;
	},

	fetchBuffer: function(offset)
	{
		var bufferStartPos = this.buffer.getFetchOffset(offset);

		if (bufferStartPos < 0)
		{
			return false;
		}

		if (this.fetchRequests[bufferStartPos])
		{
			return false;
		}

		var fetchSize = this.buffer.getFetchSize(offset);
		var partialLoaded = false;

		var queryString = this.getQueryString(fetchSize, bufferStartPos);

		if (fetchSize < 1)
		{
			return false;
		}

		this.ajaxOptions.parameters = queryString;
		this.ajaxOptions.method = 'post';

		var url = ajaxEngine.requestURLS[this.tableId + '_request'];

		this.fetchRequests[bufferStartPos] = new RicoGridUpdate(url, this, bufferStartPos);

		this.timeoutHandler = setTimeout( this.handleTimedOut.bind(this), this.options.bufferTimeout);
	},

	onRequestComplete: function(ajaxRequest, bufferStartPos)
	{
		this.fetchRequests[bufferStartPos] = 0;
		this.ajaxUpdate(ajaxRequest, bufferStartPos);
	},

	setRequestParams: function() {
		this.options.requestParameters = [];
		for ( var i=0 ; i < arguments.length ; i++ )
		 this.options.requestParameters[i] = arguments[i];
	},

	requestContentRefresh: function(contentOffset) {
		this.fetchBuffer(contentOffset);
	},

	ajaxUpdate: function(ajaxResponse, bufferStartPos) {
		try {
		 clearTimeout( this.timeoutHandler );
		 this.buffer.update(ajaxResponse.responseText, bufferStartPos);
		 this.viewPort.bufferChanged();
		}
		catch(err) {
		 //console. log(err);
		}
	},

	_createQueryString: function( theArgs, offset ) {
		var queryString = ""
		if (!theArgs)
			return queryString;

		for ( var i = offset ; i < theArgs.length ; i++ ) {
			if ( i != offset )
			queryString += "&";

			var anArg = theArgs[i];

			if ( anArg.name != undefined && anArg.value != undefined ) {
			queryString += anArg.name +  "=" + escape(anArg.value);
			}
			else {
			 var ePos  = anArg.indexOf('=');
			 var argName  = anArg.substring( 0, ePos );
			 var argValue = anArg.substring( ePos + 1 );
			 queryString += argName + "=" + escape(argValue);
			}
		}
		return queryString;
	}

};

//-------------------- ricoLiveGridSort.js
Rico.LiveGridSort = Class.create();

Rico.LiveGridSort.prototype = {

	initialize: function(headerTableId, options) {
		this.headerTableId = headerTableId;
		this.headerTable	= $(headerTableId);
		this.options = options;
		this.setOptions();
		this.applySortBehavior();

		if ( this.options.sortCol ) {
		 this.setSortUI( this.options.sortCol, this.options.sortDir );
		}
	},

	setSortUI: function( columnName, sortDirection ) {
		var cols = this.options.columns;
		for ( var i = 0 ; i < cols.length ; i++ ) {
		 if ( cols[i].name == columnName ) {
			this.setColumnSort(i, sortDirection);
			break;
		 }
		}
	},

	setOptions: function() {
		// preload the images...
		new Image().src = this.options.sortAscendImg;
		new Image().src = this.options.sortDescendImg;

		this.sort = this.options.sortHandler;
		if ( !this.options.columns )
		 this.options.columns = this.introspectForColumnInfo();
		else {
		 // allow client to pass { columns: [ ["a", true], ["b", false] ] }
		 // and convert to an array of Rico.TableColumn objs...
		 this.options.columns = this.convertToTableColumns(this.options.columns);
		}
	},

	applySortBehavior: function() {
		var headerRow	= this.headerTable.rows[0];
		var headerCells = headerRow.cells;
		for ( var i = 0 ; i < headerCells.length ; i++ ) {
		 this.addSortBehaviorToColumn( i, headerCells[i] );
		}
	},

	addSortBehaviorToColumn: function( n, cell ) {
		if ( this.options.columns[n].isSortable() ) {
		 cell.id			= this.headerTableId + '_' + n;
		 cell.style.cursor  = 'pointer';
		 cell.onclick		 = this.headerCellClicked.bindAsEventListener(this);
		 var sortImg = document.createElement('div');
		 sortImg.innerHTML = '<span class="sortImg" id="' + this.headerTableId + '_img_' + n + '"></span>';
		 cell.firstDescendant().appendChild(sortImg.firstChild);
		}
	},

	/**
	 *  Handles onclick event for header cell - triggers list sorting
	 */
	headerCellClicked: function(evt)
	{
		var eventTarget = Event.element(evt);
		while ('TH' != eventTarget.tagName)
		{
			eventTarget = eventTarget.parentNode;
		}

		var cellId = eventTarget.id;
		var columnNumber = parseInt(cellId.substring( cellId.lastIndexOf('_') + 1 ));
		var sortedColumnIndex = this.getSortedColumnIndex();

		if ( sortedColumnIndex != -1 )
		{
			if ( sortedColumnIndex != columnNumber )
			{
				this.removeColumnSort(sortedColumnIndex);
				this.setColumnSort(columnNumber, Rico.TableColumn.SORT_ASC);
			}
			else
			{
				this.toggleColumnSort(sortedColumnIndex);
			}
		}
		else
		{
			this.setColumnSort(columnNumber, Rico.TableColumn.SORT_ASC);
		}

		if (this.options.sortHandler)
		{
			this.options.sortHandler(this.options.columns[columnNumber]);
		}
	},

	removeColumnSort: function(n) {
		$(this.headerTableId + '_' + n).removeClassName('sorted');
		this.options.columns[n].setUnsorted();
		this.setSortImage(n);
	},

	setColumnSort: function(n, direction) {
		if(isNaN(n)) return ;
		$(this.headerTableId + '_' + n).addClassName('sorted');
		this.options.columns[n].setSorted(direction);
		this.setSortImage(n);
	},

	toggleColumnSort: function(n) {
		this.options.columns[n].toggleSort();
		this.setSortImage(n);
	},

	setSortImage: function(n) {
		var sortDirection = this.options.columns[n].getSortDirection();

		var sortImageSpan = $( this.headerTableId + '_img_' + n );
		if ( sortDirection == Rico.TableColumn.UNSORTED )
		 sortImageSpan.innerHTML = '';
		else if ( sortDirection == Rico.TableColumn.SORT_ASC )
		 sortImageSpan.innerHTML = '<img src="'	+ this.options.sortAscendImg + '"/>';
		else if ( sortDirection == Rico.TableColumn.SORT_DESC )
		 sortImageSpan.innerHTML = '<img src="'	+ this.options.sortDescendImg + '"/>';
	},

	getSortedColumnIndex: function() {
		var cols = this.options.columns;
		for ( var i = 0 ; i < cols.length ; i++ ) {
		 if ( cols[i].isSorted() )
			return i;
		}

		return -1;
	},

	introspectForColumnInfo: function() {
		var columns = new Array();
		var headerRow	= this.headerTable.rows[0];
		var headerCells = headerRow.cells;
		for ( var i = 0 ; i < headerCells.length ; i++ )
		 columns.push( new Rico.TableColumn( this.deriveColumnNameFromCell(headerCells[i],i), true ) );
		return columns;
	},

	convertToTableColumns: function(cols) {
		var columns = new Array();
		for ( var i = 0 ; i < cols.length ; i++ )
		 columns.push( new Rico.TableColumn( cols[i][0], cols[i][1] ) );
		return columns;
	},

	deriveColumnNameFromCell: function(cell,columnNumber) {
		if (document.getElementsByClassName('fieldName', cell).length > 0)
		{
			return document.getElementsByClassName('fieldName', cell)[0].firstChild.nodeValue;
		}
	}
};

Rico.TableColumn = Class.create();

Rico.TableColumn.UNSORTED  = 0;
Rico.TableColumn.SORT_ASC  = "ASC";
Rico.TableColumn.SORT_DESC = "DESC";

Rico.TableColumn.prototype = {
	initialize: function(name, sortable) {
		this.name		= name;
		this.sortable	= sortable;
		this.currentSort = Rico.TableColumn.UNSORTED;
	},

	isSortable: function() {
		return this.sortable;
	},

	isSorted: function() {
		return this.currentSort != Rico.TableColumn.UNSORTED;
	},

	getSortDirection: function() {
		return this.currentSort;
	},

	toggleSort: function() {
		if ( this.currentSort == Rico.TableColumn.UNSORTED || this.currentSort == Rico.TableColumn.SORT_DESC )
		 this.currentSort = Rico.TableColumn.SORT_ASC;
		else if ( this.currentSort == Rico.TableColumn.SORT_ASC )
		 this.currentSort = Rico.TableColumn.SORT_DESC;
	},

	setUnsorted: function(direction) {
		this.setSorted(Rico.TableColumn.UNSORTED);
	},

	setSorted: function(direction) {
		// direction must by one of Rico.TableColumn.UNSORTED, .SORT_ASC, or .SORT_DESC...
		this.currentSort = direction;
	}

};

/**
 *  Grid data download handler
 */
RicoGridUpdate = Class.create();
RicoGridUpdate.prototype =
{
	bufferStartPos: 0,

	grid: null,

	opts: null,

	url: '',

	/**
	 *  @todo	Instead of (or in addition of) using the timeout, check the mouse button click status.
	 *			As soon as the mouse button is released, it means (?) that the grid is no longer being scrolled
	 *			and the data download could start right away
	 */
	initialize: function(url, grid, bufferStartPos)
	{
		this.bufferStartPos = bufferStartPos;
		this.grid = grid;
		this.opts = grid.ajaxOptions;
		this.opts.onComplete = this.onComplete.bind(this);
		this.url = url;

		if (0 == bufferStartPos)
		{
			// initial load - without delay
			this.process();
		}
		else
		{
			// download the data after 0.3 seconds
			setTimeout(this.process.bind(this), 150);
		}
	},

	process: function()
	{
		var currentOffset = this.grid.buffer.getFetchOffset(this.grid.scroller.getOffset());
		var chunk1 = this.grid.buffer.getChunkIDs(currentOffset);
		var chunk2 = this.grid.buffer.getChunkIDs(this.bufferStartPos);

		// make sure the offset hasn't changed already
		if ((chunk1[0] == chunk2[0]) && (chunk1[1] == chunk2[1]))
		{
			this.grid.onBeginDataFetch();
			new Ajax.Request(this.url, this.opts);
		}
		else
		{
			this.grid.fetchRequests[this.bufferStartPos] = null;
		}
	},

	onComplete: function(ajaxRequest)
	{
		this.grid.onRequestComplete(ajaxRequest, this.bufferStartPos);
	}
}


/***************************************************
 * library/ActiveGrid.js
 ***************************************************/

/**
 *	@author Integry Systems
 */

/**
 *	Requires rico.js
 *
 */

ActiveGrid = Class.create();

ActiveGrid.prototype =
{
	/**
	 *	Data table element instance
	 */
	tableInstance: null,

	/**
	 *	Select All checkbox instance
	 */
	selectAllInstance: null,

	/**
	 *	Data feed URL
	 */
  	dataUrl: null,

	/**
	 *	Rico LiveGrid instance
	 */
	ricoGrid: null,

	/**
	 *	Array containing IDs of selected rows
	 */
	selectedRows: {},

	/**
	 *	Set to true when Select All is used (so all records are selected by default)
	 */
	inverseSelection: false,

	/**
	 *	Object that handles data transformation for presentation
	 */
	dataFormatter: null,

	filters: {},

	loadIndicator: null,

	rowCount: 15,

	quickEditUrlTemplate: null,

	quickEditIdToken : null,

	quickEditContainerState: "hidden",

	activeGridInstanceID : null,

	initialize: function(tableInstance, dataUrl, totalCount, loadIndicator, rowCount, filters)
	{
		this.tableInstance = tableInstance;
		this.activeGridInstanceID=this.tableInstance.id;
		this.tableInstance.gridInstance = this;
		this.dataUrl = dataUrl;
		this.setLoadIndicator(loadIndicator);
		this.filters = {};
		this.selectedRows = {};

		if (!rowCount)
		{
			rowCount = this.rowCount;
		}

		if (filters)
		{
			this.filters = filters;
		}

		this.ricoGrid = new Rico.LiveGrid(this.tableInstance.id, rowCount, totalCount, dataUrl,
								{
								  prefetchBuffer: true,
								  onscroll: this.onScroll.bind(this),
								  sortAscendImg: $("bullet_arrow_up").src,
								  sortDescendImg: $("bullet_arrow_down").src
								}
							);

		this.ricoGrid.activeGrid = this;

		var headerRow = this._getHeaderRow();
		this.selectAllInstance = headerRow.down('input');
		this.selectAllInstance.onclick = this.selectAll.bindAsEventListener(this);
		this.selectAllInstance.parentNode.onclick = function(e){Event.stop(e);}.bindAsEventListener(this);

		this.ricoGrid.onUpdate = this.onUpdate.bind(this);
		this.ricoGrid.onBeginDataFetch = this.showFetchIndicator.bind(this);
		this.ricoGrid.options.onRefreshComplete = this.hideFetchIndicator.bind(this);

		this.onScroll(this.ricoGrid, 0);

		this.setRequestParameters();
		this.ricoGrid.init();

		var rows = this.tableInstance.down('tbody').getElementsByTagName('tr');
		for (k = 0; k < rows.length; k++)
		{
			Event.observe(rows[k], 'click', this.selectRow.bindAsEventListener(this));

			var cells = rows[k].getElementsByTagName('td');
			for (i = 0; i < cells.length; i++)
			{
				Event.observe(cells[i], 'mouseover', this.highlightRow.bindAsEventListener(this));
			}

			Event.observe(rows[k], 'mouseout', this.removeRowHighlight.bindAsEventListener(this));
		}
	},

	initAdvancedSearch: function(id, availableColumns, advancedSearchColumns, properties)
	{
		this.advancedSearchHandler = new ActiveGridAdvancedSearch(id);
		this.advancedSearchHandler.createAvailableColumnConditions(advancedSearchColumns);
		this.advancedSearchHandler.createAvailableColumnConditions(availableColumns, properties);
		this.advancedSearchHandler.findNodes();
		this.advancedSearchHandler.bindEvents();
	},

	getAdvancedSearchHandler: function()
	{
		return this.advancedSearchHandler;
	},

	initQuickEdit: function(urlTemplate, idToken)
	{
		this.quickEditUrlTemplate = urlTemplate;
		this.quickEditIdToken = idToken;

		$A(this.tableInstance.down('tbody').getElementsByTagName('tr')).each(function(row)
		{
			Event.observe(row, 'mouseover',
				function(e)
				{
					window.lastQuickEditNode = Event.element(e);
					window.setTimeout(function() { this.quickEdit(e); }.bind(this), 200);
				}.bindAsEventListener(this) );
		}.bind(this));

		Event.observe(this.tableInstance.down('tbody'), 'mouseout', function() { window.lastQuickEditNode = null; } );
		Event.observe(document.body, 'mouseover', this.quickEditMouseover.bindAsEventListener(this) );
		Event.observe(this._getQuickEditContainer(), 'click', this.quickEditContainerClicked.bindAsEventListener(this) );
	},

	quickEdit: function(event)
	{
		var
			node = Event.element(event),
			recordID = null,
			m;

		if (window.lastQuickEditNode != node)
		{
			return;
		}

		if (this.activeRow)
		{
			this.activeRow.removeClassName('activeGrid_highlightQuickEdit');
		}

		if (node.tagName.toLowerCase != "tr")
		{
			node = node.up("tr");
		}

		do {
			input = node.down("input");
			if (input && input.name)
			{
				m = node.down("input").name.match(/item\[(\d+)\]/);
			}
			else
			{
				m = [];
			}
			if (m && m.length == 2)
			{
				recordID = m[1];
			}
			else
			{
				node=$(node.up("tr"));
			}
		} while(recordID == null && node);

		if (recordID == null)
		{
			return;
		}

		this.node = node;

		new LiveCart.AjaxRequest(
			this.quickEditUrlTemplate.replace(this.quickEditIdToken, recordID),
			null,
			function(transport)
			{
				var container = this._getQuickEditContainer();
				if(container)
				{
					container.innerHTML = transport.responseText;
					var pos = Position.cumulativeOffset(this.node);

					// translate from grid upper/left corner to page upper/left corner
					var offset = Position.cumulativeOffset(this.node.up(".activeGridContainer"));
					offset[0] *= -1;
					offset[1] *= -1;
					pos = [pos[0] + offset[0], pos[1] + offset[1]];
					container.style.left=(pos[0])+"px";
					container.style.top=(pos[1])+"px";
					container.show();
					node.addClassName('activeGrid_highlightQuickEdit');
					this.activeRow = node;

					if (this.quickEditContainerState == "hidden") // ignore "changed" state!
					{
						this.quickEditContainerState = "shown";
					}
				}

			}.bind(this)
		);
	},

	quickEditMouseover: function(event)
	{
		if (this.quickEditContainerState != "shown")
		{
			return;
		}
		element = Event.element(event);
		if(element.up(".activeGridContainer") == null)
		{
			this.hideQuickEditContainer();
		}
	},

	quickEditContainerClicked: function(event)
	{
		// any click (except on cancel link) in quick edit container set container to clicked state
		if (Event.element(event).hasClassName("cancel") == false)
		{
			this.quickEditContainerState = "clicked";
		}
		else
		{
			this.quickEditContainerState = "shown";
		}
	},

	hideQuickEditContainer : function()
	{
		var container = this._getQuickEditContainer();
		if (!container)
		{
			return;
		}

		if (this.activeRow)
		{
			this.activeRow.removeClassName('activeGrid_highlightQuickEdit');
		}

		container.innerHTML = "";
		container.hide();

		this.containerState = "hidden";
	},

	updateQuickEditGrid: function(jsonData)
	{
		var
			buffer = this.ricoGrid.buffer,
			i,
			rows,
			row,
			done = false;

		rows = this.getRows(jsonData);
		row = rows.data[0];

		for(i=0; i<buffer.rows.length; i++)
		{
			if(row.ID == buffer.rows[i].id)
			{
				buffer.rows[i] = row;
				break;
			}
		}
		for(page in buffer.rowCache)
		{
			if(done)
			{
				break;
			}
			for(rowNr in buffer.rowCache[page])
			{
				if("id" in buffer.rowCache[page][rowNr] == false)
				{
					continue;
				}
				if(done)
				{
					break;
				}

				if(buffer.rowCache[page][rowNr].id == row.id)
				{
					buffer.rowCache[page][rowNr] = row;
					done=true;
				}
			}
		}

		// redraw grid
		this.ricoGrid.viewPort.bufferChanged();
		this.ricoGrid.viewPort.refreshContents(this.ricoGrid.viewPort.lastRowPos);

		$A(document.getElementsByName("item["+row.id+"]")).each(function(input) {
			new Effect.Highlight($(input).up("tr"));
		});
	},

	_getQuickEditContainer: function()
	{
		var parent = $(this.tableInstance), node=null, i=0;

		while (i<25 && parent && parent.hasClassName("activeGridContainer") == false)
		{
			i++;
			parent = $(parent.up("div"));
		}
		if (parent)
		{
			node = parent.getElementsByClassName("quickEditContainer");
		}

		if(node == null || node.length!=1)
		{
			return null;
		}
		return $(node[0]);
	},

	setInitialData: function(data)
	{
		if (data)
		{
			this.ricoGrid.buffer.update(data, 0);
			this.ricoGrid.viewPort.bufferChanged();
			this.ricoGrid.viewPort.refreshContents(0);
		}
		else
		{
			this.ricoGrid.requestContentRefresh(0);
		}
	},

	getRows: function(data)
	{
		var HTML = '';
		var rowHTML = '';

		var data = eval('(' + data + ')');

		for(k = 0; k < data['data'].length; k++)
		{
			var id = data['data'][k][0];

			data['data'][k][0] = '<input type="checkbox" class="checkbox" name="item[' + id + ']" />';
			data['data'][k].id = id;

			if (this.dataFormatter)
			{
				for(i = 1; i < data['data'][k].length; i++)
				{
					if(i > 0)
					{
						data['data'][k][i] = stripHtml(data['data'][k][i]);
					}

					var filter = this.filters['filter_' + data['columns'][i]];
					if (filter && data['data'][k][i].replace)
					{
						data['data'][k][i] = data['data'][k][i].replace(new RegExp('(' + filter + ')', 'gi'), '<span class="activeGrid_searchHighlight">$1</span>');
					}

					var value = this.dataFormatter.formatValue(data['columns'][i], data['data'][k][i], id) || '';
					data['data'][k][i] = '<span>' + value + '</span>';
				}
			}
		}

		return data;
	},

	setDataFormatter: function(dataFormatterInstance)
	{
		this.dataFormatter = dataFormatterInstance;
	},

	setLoadIndicator: function(indicatorElement)
	{
		this.loadIndicator = $(indicatorElement);
	},

	onScroll: function(liveGrid, offset)
	{
		this.ricoGrid.onBeginDataFetch = this.showFetchIndicator.bind(this);

		this.updateHeader(offset);

		this._markSelectedRows();
	},

	updateHeader: function (offset)
	{
		var liveGrid = this.ricoGrid;

		var totalCount = liveGrid.metaData.getTotalRows();
		var from = offset + 1;
		var to = offset + liveGrid.metaData.getPageSize();

		if (to > totalCount)
		{
			to = totalCount;
		}

		if (!this.countElement)
		{
			this.countElement = this.loadIndicator.parentNode.up('div').down('.rangeCount');
			this.notFound = this.loadIndicator.parentNode.up('div').down('.notFound');
		}

		if (!this.countElement)
		{
			return false;
		}

		if (totalCount > 0)
		{
			if (!this.countElement.strTemplate)
			{
				this.countElement.strTemplate = this.countElement.innerHTML;
			}

			var str = this.countElement.strTemplate;
			str = str.replace(/\$from/, from);
			str = str.replace(/\$to/, to);
			str = str.replace(/\$count/, totalCount);

			this.countElement.innerHTML = str;
			this.notFound.style.display = 'none';
			this.countElement.style.display = '';
		}
		else
		{
			this.notFound.style.display = '';
			this.countElement.style.display = 'none';
		}
	},

	onUpdate: function()
	{
		this._markSelectedRows();
	},

	setRequestParameters: function()
	{
		this.ricoGrid.options.requestParameters = [];
		var i = 0;

		for (k in this.filters)
		{
			if (k.substr(0, 7) == 'filter_')
			{
				this.ricoGrid.options.requestParameters[i++] = 'filters[' + k.substr(7, 1000) + ']' + '=' + encodeURIComponent(this.filters[k]);
			}
		}
	},

	reloadGrid: function()
	{
		this.setRequestParameters();
		this.ricoGrid.buffer.clear();
		this.ricoGrid.resetContents();
		this.ricoGrid.requestContentRefresh(0, true);
		this.ricoGrid.fetchBuffer(0, false, true);

		this._markSelectedRows();
	},

	getFilters: function()
	{
		var res = {};

		for (k in this.filters)
		{
			if (k.substr(0, 7) == 'filter_')
			{
				res[k.substr(7, 1000)] = this.filters[k];
			}
		}

		return res;
	},

	getSelectedIDs: function()
	{
		var selected = [];

		for (k in this.selectedRows)
		{
			if (true == this.selectedRows[k])
			{
				selected[selected.length] = k;
			}
		}

		return selected;
	},

	isInverseSelection: function()
	{
		return this.inverseSelection;
	},

	/**
	 *	Select all rows
	 */
	selectAll: function(e)
	{
		this.selectedRows = new Object;
		this.inverseSelection = this.selectAllInstance.checked;
		this._markSelectedRows();

		e.stopPropagation();
	},

	/**
	 *	Mark rows checkbox when a row is clicked
	 */
	selectRow: function(e)
	{
		var row = this._getTargetRow(e);

		id = this._getRecordId(row);

		if (!this.selectedRows[id])
		{
			this.selectedRows[id] = 0;
		}

		this.selectedRows[id] = !this.selectedRows[id];

		this._selectRow(row);
	},

	/**
	 *	Highlight a row when moving a mouse over it
	 */
	highlightRow: function(event)
	{
		var cell = this._getTargetCell(event);
		var row = cell ? cell.parentNode : this._getTargetRow(event);
		Element.addClassName(row, 'activeGrid_highlight');

		if (cell)
		{
			var value = cell.down('span');
			if (value && value.offsetWidth > cell.offsetWidth)
			{
				if (!this.cellContentContainer)
				{
					var cont = cell.up('.activeGridContainer');
					this.cellContentContainer = cont.down('.activeGridCellContent');
				}

				var xPos = Event.pointerX(event) - 50 - window.scrollX;
				var yPos = Event.pointerY(event) + 25 - window.scrollY;
				this.cellContentContainer.innerHTML = value.innerHTML;

				// remove progress indicator
				var pI = this.cellContentContainer.down('.progressIndicator');
				if (pI)
				{
					pI.parentNode.removeChild(pI);
				}

				this.cellContentContainer.style.visibility = 'none';
				this.cellContentContainer.style.display = 'block';

				PopupMenuHandler.prototype.getByElement(this.cellContentContainer, xPos, yPos);

				this.cellContentContainer.style.visibility = 'visible';
			}
		}
	},

	/**
	 *	Remove row highlighting when mouse is moved out of the row
	 */
	removeRowHighlight: function(event)
	{
		if (this.cellContentContainer)
		{
			// hide() not used intentionally
			this.cellContentContainer.style.display = 'none';
		}

		Element.removeClassName(this._getTargetRow(event), 'activeGrid_highlight');
	},

	setFilterValue: function(key, value)
	{
		this.filters[key] = value;
	},

	getFilterValue: function(key)
	{
		return this.filters[key];
	},

	showFetchIndicator: function()
	{
		this.loadIndicator.style.display = '';
		this.loadIndicator.parentNode.up('div').down('.notFound').hide();
	},

	hideFetchIndicator: function()
	{
		this.loadIndicator.style.display = 'none';
	},

	resetSelection: function()
	{
		this.selectedRows = new Object;
		this.inverseSelection = false;
	},

	_markSelectedRows: function()
	{
		var rows = this.tableInstance.getElementsByTagName('tr');
		for (k = 0; k < rows.length; k++)
		{
			this._selectRow(rows[k]);
		}
	},

	_selectRow: function(rowInstance)
	{
		var id = this._getRecordId(rowInstance);

		if (!rowInstance.checkBox)
		{
			rowInstance.checkBox = rowInstance.down('input');
		}

		if (rowInstance.checkBox)
		{
			var checked = this.selectedRows[id];
			if (this.inverseSelection)
			{
				checked = !checked;
			}

			rowInstance.checkBox.checked = checked;

			if (checked)
			{
				rowInstance.addClassName('selected');
			}
			else
			{
				rowInstance.removeClassName('selected');
			}
		}
	},

	_getRecordId: function(rowInstance)
	{
		return rowInstance.recordId;
	},

	/**
	 *	Return event target row element
	 */
	_getTargetRow: function(event)
	{
		return Event.element(event).up('tr');
	},

	/**
	 *	Return event target cell element
	 */
	_getTargetCell: function(event)
	{
		return Event.element(event).up('td');
	},

	_getHeaderRow: function()
	{
		return this.tableInstance.down('tr');
	}
}

ActiveGridFilter = Class.create();

ActiveGridFilter.prototype =
{
	element: null,

	activeGridInstance: null,

	focusValue: null,

	initialize: function(element, activeGridInstance)
	{
		this.element = element;
		this.activeGridInstance = activeGridInstance;
		this.element.onclick = Event.stop.bindAsEventListener(this);
		this.element.onfocus = this.filterFocus.bindAsEventListener(this);
		this.element.onblur = this.filterBlur.bindAsEventListener(this);
		// this.element.onchange = this.setFilterValue.bindAsEventListener(this);
		this.element.onchange = this.filterOnChange.bindAsEventListener(this);
		this.element.onkeyup = this.checkExit.bindAsEventListener(this);

		this.element.filter = this;

   		Element.addClassName(this.element, 'activeGrid_filter_blur');

		this.element.columnName = this.element.value;
	},

	filterOnChange: function(e)
	{
		var
			element = Event.element(e),
			th = element.up("th"),
			drd = th.down(".dateRange")
		if (th.hasClassName("cellt_date"))
		{
			if("daterange" == element.value.substr(0, 9) && element.tagName.toLowerCase() == "select")
			{
				drd.show();
				return;
			}
			else
			{
				drd.hide();
			}

		}
		this.setFilterValue();
	},

	filterFocus: function(e)
	{
		if (this.element.value == this.element.columnName)
		{
			this.element.value = '';
		}

		this.focusValue = this.element.value;

  		Element.removeClassName(this.element, 'activeGrid_filter_blur');
		Element.addClassName(this.element, 'activeGrid_filter_select');

		Element.addClassName(this.element.up('th'), 'activeGrid_filter_select');

		Event.stop(e);
	},

	filterBlur: function()
	{
		if ('' == this.element.value.replace(/ /g, ''))
		{
			// only update filter value if it actually has changed
			if ('' != this.focusValue)
			{
				this.setFilterValue();
			}

			this.element.value = this.element.columnName;
		}

		if (this.element.value == this.element.columnName)
		{
			Element.addClassName(this.element, 'activeGrid_filter_blur');
			Element.removeClassName(this.element, 'activeGrid_filter_select');
			Element.removeClassName(this.element.up('th'), 'activeGrid_filter_select');
		}
	},

	/**
	 *  Clear filter value on ESC key
	 */
	checkExit: function(e)
	{
		if (27 == e.keyCode || (13 == e.keyCode && !this.element.value))
		{
			this.element.value = '';

			if (this.activeGridInstance.getFilterValue(this.getFilterName()))
			{
				this.setFilterValue();
				this.filterBlur();
			}

			this.element.blur();
		}

		else if (13 == e.keyCode)
		{
			this.filterBlur();
			this.setFilterValue();
		}
	},

	setFilterValue: function()
	{
		this.setFilterValueManualy(this.getFilterName(), this.element.value);
	},

	setFilterValueManualy: function(filterName, value)
	{
		this.activeGridInstance.setFilterValue(filterName, value);
		this.activeGridInstance.reloadGrid();
	},

	getFilterName: function()
	{
		return this.element.id.substr(0, this.element.id.indexOf('_', 7));
	},

	initFilter: function(e)
	{
		Event.stop(e);

		var element = Event.element(e);
		if ('LI' != element.tagName && element.up('li'))
		{
			element = element.up('li');
		}

		this.filterFocus(e);

		if (element.attributes.getNamedItem('symbol'))
		{
			this.element.value = element.attributes.getNamedItem('symbol').nodeValue;
		}

		// range fields
		var cont = element.up('th');
		var min = cont.down('.min');
		var max = cont.down('.max');

		// show/hide input fields
		if ('><' == this.element.value)
		{
			Element.hide(this.element);
			Element.show(this.element.next('div.rangeFilter'));
			min.focus();
		}
		else
		{
			Element.show(this.element);
			Element.hide(this.element.next('div.rangeFilter'));

			min.value = '';
			max.value = '';
			this.element.focus();

			if ('' == this.element.value)
			{
				this.element.blur();
				this.setFilterValue();
			}
		}

		// hide menu
		if (element.up('div.filterMenu'))
		{
			Element.hide(element.up('div.filterMenu'));
			window.setTimeout(function() { Element.show(this.up('div.filterMenu')); }.bind(element), 200);
		}
	},

	updateDateRangeFilter: function(element) // calendar does not generate event, therefore passing node
	{
		var
			element = $(element).up("div.dateRange"),
			// format: "daterange [<datefrom>] | [<dateto>]"
			queryValue = ["daterange", $(element.down(".min").id+"_real").value , "|", $(element.down(".max").id+"_real").value].join(" ").replace(/\s{2,}/, " "),
			select = element.up("th").down("select");

		// find option with value daterange.*, and set its value to queryValue
		$A(select.getElementsByTagName("option")).find(
			function(element)
			{
				return element.value.substr(0,9) == "daterange";
			}
		).value = queryValue;

		select.filter.setFilterValue();
	},

	updateRangeFilter: function(e)
	{
		var cont = Event.element(e).up('div.rangeFilter');
		var min = cont.down('.min');
		var max = cont.down('.max');

		if ((parseInt(min.value) > parseInt(max.value)) && max.value.length > 0)
		{
			var temp = min.value;
			min.value = max.value;
			max.value = temp;
		}

		this.element.value = (min.value.length > 0 ? '>=' + min.value + ' ' : '') + (max.value.length > 0 ? '<=' + max.value : '');

		this.element.filter.setFilterValue();

		if ('' == this.element.value)
		{
			this.initFilter(e);
		}
	}
}

ActiveGrid.MassActionHandler = Class.create();
ActiveGrid.MassActionHandler.prototype =
{
	handlerMenu: null,
	actionSelector: null,
	valueEntryContainer: null,
	form: null,
	button: null,
	cancelLink: null,
	cancelUrl: '',

	grid: null,
	pid: null,

	initialize: function(handlerMenu, activeGrid, params)
	{
		this.handlerMenu = handlerMenu;
		this.actionSelector = handlerMenu.down('select');
		this.valueEntryContainer = handlerMenu.down('.bulkValues');
		this.form = this.actionSelector.form;
		this.form.handler = this;
		this.button = this.form.down('.submit');

		Event.observe(this.actionSelector, 'change', this.actionSelectorChange.bind(this));
		Event.observe(this.actionSelector.form, 'submit', this.submit.bindAsEventListener(this));

		this.grid = activeGrid;
		this.params = params;
		this.paramz = params;
	},

	actionSelectorChange: function()
	{
		if (!this.valueEntryContainer)
		{
			return false;
		}

		for (k = 0; k < this.valueEntryContainer.childNodes.length; k++)
		{
			if (this.valueEntryContainer.childNodes[k].style)
			{
				Element.hide(this.valueEntryContainer.childNodes[k]);
			}
		}

		Element.show(this.valueEntryContainer);

		if (this.actionSelector.form.elements.namedItem(this.actionSelector.value))
		{
			var el = this.form.elements.namedItem(this.actionSelector.value);
			if (el)
			{
				Element.show(el);
				this.form.elements.namedItem(this.actionSelector.value).focus();
			}
		}
		else if (document.getElementsByClassName(this.actionSelector.value, this.handlerMenu))
		{
			var el = document.getElementsByClassName(this.actionSelector.value, this.handlerMenu)[0];
			if (el)
			{
				Element.show(el);
			}
		}
	},

	submit: function(e)
	{
		if (e)
		{
			Event.stop(e);
		}

		if ('delete' == this.actionSelector.value)
		{
			if (!confirm(this.deleteConfirmMessage))
			{
				return false;
			}
		}
		var filters = this.grid.getFilters();
		this.form.elements.namedItem('filters').value = filters ? Object.toJSON(filters) : '';
		this.form.elements.namedItem('selectedIDs').value = Object.toJSON(this.grid.getSelectedIDs());
		this.form.elements.namedItem('isInverse').value = this.grid.isInverseSelection() ? 1 : 0;

		if ((0 == this.grid.getSelectedIDs().length) && !this.grid.isInverseSelection())
		{
			this.blurButton();
			alert(this.nothingSelectedMessage);
			return false;
		}

		var indicator = this.handlerMenu.down('.massIndicator');
		if (!indicator)
		{
			indicator = this.handlerMenu.down('.progressIndicator');
		}

		this.formerLength = 0;

		if ('blank' == this.actionSelector.options[this.actionSelector.selectedIndex].getAttribute('rel'))
		{
			this.form.target = '_blank';
			this.form.submit();
			return;
		}

		this.request = new LiveCart.AjaxRequest(this.form, indicator , this.dataResponse.bind(this),  {onInteractive: function(func, arg) {window.setTimeout(func.bind(this, arg), 1000); }.bind(this, this.dataResponse.bind(this)) });

		this.progressBarContainer = this.handlerMenu.up('div').down('.activeGrid_massActionProgress');
		this.cancelLink = this.progressBarContainer.down('a.cancel');
		this.cancelUrl = this.cancelLink.href;
		this.cancelLink.onclick = this.cancel.bind(this);

		this.progressBarContainer.show();
		this.progressBar = new Backend.ProgressBar(this.progressBarContainer);

		this.grid.resetSelection();
	},

	dataResponse: function(originalRequest)
	{
		var response = originalRequest.responseText.substr(this.formerLength + 1);
		this.formerLength = originalRequest.responseText.length;
		var portions = response.split('|');

		for (var k = 0; k < portions.length; k++)
		{
			if (!portions[k])
			{
				continue;
			}
			if ('}' == portions[k].substr(-1))
			{
				if ('{' != portions[k].substr(0, 1))
				{
					portions[k] = '{' + portions[k];
				}

				this.submitCompleted(eval('(' + portions[k] + ')'));

				return;
			}

			response = eval('(' + decode64(portions[k]) + ')');

			// progress
			if (response.progress != undefined)
			{
				this.progressBar.update(response.progress, response.total);
				this.pid = response.pid;
			}
		}
	},

	cancel: function(e)
	{
		this.request.request.transport.abort();
		new LiveCart.AjaxRequest(Backend.Router.setUrlQueryParam(this.cancelUrl, 'pid', this.pid), null, this.completeCancel.bind(this));
		Event.stop(e);
	},

	completeCancel: function(originalRequest)
	{
		var resp = originalRequest.responseData;

		if (resp.isCancelled)
		{
			var progress = this.progressBar.getProgress();
			this.cancelLink.hide();
			this.progressBar.rewind(progress, this.progressBar.getTotal(), Math.round(progress/50), this.submitCompleted.bind(this));
		}
	},

	submitCompleted: function(responseData)
	{
		if (responseData)
		{
			this.request.showConfirmation(responseData);
		}

		this.progressBarContainer.hide();
		this.cancelLink.show();

		this.grid.reloadGrid();
		this.blurButton();

		if (this.params && this.params.onComplete)
		{
			this.params.onComplete();
		}

		if (this.customComplete)
		{
			this.customComplete();
		}
	},

	blurButton: function()
	{
		this.button.disable();
		this.button.enable();
	}
}

ActiveGrid.QuickEdit =
{
	onSubmit: function(obj)
	{
		var form;
		form = $(obj).up("form");
		if(validateForm(form))
		{
			new LiveCart.AjaxRequest(form, null, function(transport) {
				var response = eval( "("+transport.responseText + ")");
				if(response.status == "success")
				{
					this.instance._getGridInstaceFromControl(this.obj).updateQuickEditGrid(transport.responseText);
					this.instance.onCancel(this.obj);
				}
				else
				{
					ActiveForm.prototype.setErrorMessages(this.obj.up("form"), response.errors)
				}
			}.bind({instance: this, obj:obj}));
		}
		return false;
	},

	onCancel: function(obj)
	{
		var gridInstance = this._getGridInstaceFromControl(obj);
		gridInstance.hideQuickEditContainer();
		return false;
	},

	_getGridInstaceFromControl: function(control)
	{
		try {
			// up 3 div's, then get all elements with class name activeGrid,
			// first table should be grid instance.
			// This works for current uses, some future cases may require to rewrite this function.
			return $A($(control).up("div",3).getElementsByClassName("activeGrid")).find(
				function(node)
				{
					return node.tagName.toLowerCase() == "table";
				}
			).gridInstance;

		} catch(e) {
			return null;
		}
	}
}

ActiveGridAdvancedSearch = Class.create();
ActiveGridAdvancedSearch.prototype =
{
	addCondition: function(condition)
	{
		this.conditions[condition.getId()] = condition;
	},

	initialize: function(id)
	{
		this.id = id;
		this.conditions = $H({});
		this.filterString = "";
		if(ActiveGridAdvancedSearch.prototype.initCallbacks)
		{
			$A(ActiveGridAdvancedSearch.prototype.initCallbacks).each(
				function(callback)
				{
					callback(this);
				}.bind(this)
			);
		}
	},

	createAvailableColumnConditions: function(availableColumns, properties)
	{
		var
			conditionProperties;
		this.availableColumns = $H(availableColumns);
		this.availableColumns.each(function(item)
		{
			if (item[1].type == null || item[0] == 'hiddenType')
			{
				return;
			}
			conditionProperties = {type: item[1].type};
			if(conditionProperties.type == 'date')
			{
				// date type filter values (same as in ActiveGrid)
				conditionProperties.dateFilterValues = properties.dateFilterValues;
			}
			this.addCondition
			(
				new ActiveGridAdvancedSearchCondition(item[0], item[1].name, conditionProperties)
			);
		}.bind(this));
	},

	findNodes: function()
	{
		if (typeof this.nodes == "undefined")
		{
			this.nodes = {};
		}
		this.nodes.root = $(this.id + "_AdvancedSearch");
		this.nodes.queryContainer = this.nodes.root.down(".advancedSearchQueryContainer");
		this.nodes.searchLink = this.nodes.root.down(".advancedSearchLink");

		this.nodes.queryItems = this.nodes.root.down(".advancedQueryItems");
	},

	bindEvents: function()
	{
		Event.observe(this.nodes.searchLink, "click", this.linkClicked.bindAsEventListener(this));
		Event.observe(this.nodes.queryItems, "change", this.conditionItemChanged.bindAsEventListener(this));
		Event.observe(this.nodes.queryItems, "click", this.conditionItemClick.bindAsEventListener(this))
	},

	getCondition: function(id)
	{
		return typeof this.conditions[id] == "undefined"
			? null
			: this.conditions[id];
	},

	linkClicked: function()
	{
		this.appendCondition();
	},

	appendCondition: function()
	{
		var li = this.appendConditionPlaceholder();
		this.getCondition(li.down(".condition").value).draw(li);
	},

	conditionItemChanged: function(event)
	{
		var
			element = Event.element(event),
			condition = this.getCondition( element.up("li").down(".condition").value );
		if(element.hasClassName('condition'))
		{
			condition.draw(element.up("li"));
		}
		if(element.hasClassName('comparision'))
		{
			condition.comparisionChanged(element.up("li"));
		}
		this.appendConditionIfLastFilled(element);
		this.setActiveGridFilterValues();
	},

	conditionItemClick: function(event)
	{
		var element = Event.element(event);
		if(element.hasClassName("deleteCross"))
		{
			this.removeConditionPlaceholder(element);
		}
	},

	appendConditionIfLastFilled: function(element)
	{
		var
			container = element.up('li'),
			condition = this.getCondition(container.down('.condition').value);

		if(this.lastConditionContainer == container && condition.isFilled(container))
		{
			this.appendCondition();
		}
	},

	setActiveGridFilterValues: function()
	{
		var
			gridInstance = window.activeGrids[this.id],
			containers = $A(this.nodes.queryItems.getElementsByTagName("li")).findAll(function(itemContainer, item) { return itemContainer == item.parentNode; }.bind(this, this.nodes.queryItems)), // only 'top' level child nodes.
			condition,
			key, value, comparision,
			z = [];

		gridInstance.filters = {};

		while(container = $(containers.shift()))
		{
			condition = this.getCondition(container.down(".condition").value );
			if(condition && condition.isFilled(container))
			{
				key = 'filter_' + condition.getId();
				comparision = condition.getComparision(container);
				if(comparision == '><')
				{
					comparision = '';
				}
				value = comparision + condition.getValue(container);
				gridInstance.setFilterValue(key, value);
				z.push(key+'__'+value);
			}
		}

		// if something changed in filter, reload
		value = z.join('|');
		if(value != this.filterString)
		{
			gridInstance.reloadGrid();
			this.filterString = value
		}
	},

	appendConditionPlaceholder: function()
	{
		var
			li = document.createElement("li"),
			select = document.createElement("select"),
			a = document.createElement("a");
		this.nodes.queryItems.appendChild(li);
		li.appendChild(a);
		a.addClassName("deleteCross");
		a.href="javascript:void(0);";
		li.appendChild(select);

		this.conditions.each(
			function(select, item)
			{
				var condition = item[1];
				addOption(select, condition.getId(), condition.getName());
			}.bind(this, select)
		);
		select.addClassName("condition");
		this.lastConditionContainer = $(li);

		this.nodes.root.addClassName('hasConditions');

		return this.lastConditionContainer;
	},

	removeConditionPlaceholder: function(element)
	{
		if (element.up("ul").getElementsByTagName("li").length > 1)
		{
			this.nodes.root.addClassName('hasConditions');
		}
		else
		{
			this.nodes.root.removeClassName('hasConditions');
		}

		element.up("ul").removeChild(element.up("li"));
		this.setActiveGridFilterValues();
	},

	registerInitCallback: function(callback)
	{
		if(!ActiveGridAdvancedSearch.prototype.initCallbacks)
		{
			ActiveGridAdvancedSearch.prototype.initCallbacks = [];
		}
		ActiveGridAdvancedSearch.prototype.initCallbacks.push(callback);
	}
}

ActiveGridAdvancedSearchCondition = Class.create();
ActiveGridAdvancedSearchCondition.prototype =
{
	TEXT: 'text',
	NUMERIC: 'numeric',
	BOOL: 'bool',
	DATE: 'date',

	initialize: function(id, name, properties)
	{
		this.id = id;
		this.name = name;
		this.properties = properties;
	},

	getName: function()
	{
		return this.name;
	},

	getId: function()
	{
		return this.id;
	},

	getProperty: function(key)
	{
		if(typeof this.properties == "undefined")
		{
			this.properties = $H({});
		}
		if(key == 'type' && this.properties[key] == "number") // 'number' and 'numeric' means the same.
		{
			this.properties[key] = this.NUMERIC;
		}
		return typeof this.properties[key] == "undefined"
			? arguments.length <= 2 ? arguments[1] : null
			: this.properties[key];
	},

	setType: function(type)
	{
		if(this.getProperty('type') != type) // getProperty() also initializes this.properties to hashmap, if it is broken.
		{
			if(type == 'number')
			{
				type = this.NUMERIC;
			}
			this.properties['type'] = type;
		}
	},

	draw: function(container) // This drawing is for 'field value' conditions. Replace with custom draw.
	{
		this.container = container;
		var
			comparision = container.down(".comparision"),
			value = container.down(".value"),
			value2 = container.down(".value2"),
			type;
		if (comparision /* not found */) { } else
		{
			comparision = document.createElement('select');
			container.appendChild(comparision);
			comparision = $(comparision);
			comparision.addClassName('comparision');
			value = document.createElement('input');
			container.appendChild(value);
			value = $(value);
			value.addClassName('value');
			value2 = document.createElement('input');
			container.appendChild(value2);
			value2 = $(value2);
			value2.addClassName('value2');
		}

		// change comparision dropdown for this condition
		comparision.innerHTML = '';
		comparision.show();
		value.show();
		value2.hide();
		type = this.getProperty('type');
		if (type == 'text')
		{
			addOption(comparision, '=', $T("_grid_equals"));
			comparision.hide();
			value.focus();
		}
		else if(type == 'numeric')
		{
			value.show();
			addOption(comparision, '=',  $T("_grid_equals"));
			addOption(comparision, '<>', $T("_grid_not_equal"));
			addOption(comparision, '>',  $T("_grid_greater"));
			addOption(comparision, '<',  $T("_grid_less"));
			addOption(comparision, '>=', $T("_grid_greater_or_equal"));
			addOption(comparision, '<=', $T("_grid_less_or_equal"));
			addOption(comparision, '><', $T("_grid_range"));
			value.focus();
		}
		else if(type == 'bool')
		{
			addOption(comparision, '1', $T("_yes"));
			addOption(comparision, '0', $T("_no"));
			comparision.focus();
			value.hide();
		}
		else if(type == 'date')
		{
			$H(this.getProperty('dateFilterValues')).each(function(comparision, f) {
				var key = 0, value=1
				addOption(comparision, f[value], $T(f[key]));
			}.bind(this, comparision));
			comparision.focus();
			value.hide();
		}
	},

	comparisionChanged: function(container)
	{
		if(this.getComparision(container) == '><')
		{
			container.down(".value2").show();
		}
		else
		{
			container.down(".value2").hide();
		}
	},

	isFilled: function(container)
	{
		type = this.getProperty('type');

		// ???
		if(this.getComparision(container) == '><')
		{
			return !!container.down(".value").value &&  !!container.down(".value2").value;
		}
		// ???

		else if (type == this.TEXT || type == this.NUMERIC)
		{
			return !!container.down(".value").value;
		}
		else if(type == this.BOOL || type == this.DATE)
		{
			return true;
		}
	},

	getValue: function(container)
	{
		if(this.getComparision(container) == '><')
		{
			return '>=' + container.down(".value").value +' <=' +container.down(".value2").value;
		}
		else
		{
			return container.down(".value").value;
		}
	},

	getComparision: function(container)
	{
		var v = container.down(".comparision").value;
		if(v == '=')
		{
			v = '';
		}
		return v ? v : "";
	}
}

function $T()
{
	if(arguments.length == 2)
	{
		this[arguments[0]] = arguments[1];
	}
	else
	{
		return this[arguments[0]] ? this[arguments[0]] : arguments[0];
	}
}

function addOption(dropdown, value, text)
{
	var option = document.createElement('option');
	dropdown.appendChild(option);
	option.value = value;
	option.innerHTML = text;
	return option;
}

function RegexFilter(element, params)
{
	var regex = new RegExp(params['regex'], 'gi');
	element.value = element.value.replace(regex, '');
}

function stripHtml(value)
{
	if (!value || !value.replace)
	{
		return value;
	}

	return value.replace(/<[ \/]*?\w+((\s+\w+(\s*=\s*(?:".*?"|'.*?'|[^'">\s]+))?)+\s*|\s*)[ \/]*>/g, '');
}


/***************************************************
 * library/editarea/edit_area_full.js
 ***************************************************/

 function EAL(){var t=this;t.version="0.8.2";date=new Date();t.start_time=date.getTime();t.win="loading";t.error=false;t.baseURL="";t.template="";t.lang={};t.load_syntax={};t.syntax={};t.loadedFiles=[];t.waiting_loading={};t.scripts_to_load=[];t.sub_scripts_to_load=[];t.syntax_display_name={'basic':'Basic','brainfuck':'Brainfuck','c':'C','coldfusion':'Coldfusion','cpp':'CPP','css':'CSS','html':'HTML','java':'Java','js':'Javascript','pas':'Pascal','perl':'Perl','php':'Php','python':'Python','robotstxt':'Robots txt','ruby':'Ruby','sql':'SQL','tsql':'T-SQL','vb':'Visual Basic','xml':'XML'};t.resize=[];t.hidden={};t.default_settings={debug:false,smooth_selection:true,font_size:"10",font_family:"monospace",start_highlight:false,toolbar:"search,go_to_line,fullscreen,|,undo,redo,|,select_font,|,change_smooth_selection,highlight,reset_highlight,word_wrap,|,help",begin_toolbar:"",end_toolbar:"",is_multi_files:false,allow_resize:"both",show_line_colors:false,min_width:400,min_height:125,replace_tab_by_spaces:false,allow_toggle:true,language:"en",syntax:"",syntax_selection_allow:"basic,brainfuck,c,coldfusion,cpp,css,html,java,js,pas,perl,php,python,ruby,robotstxt,sql,tsql,vb,xml",display:"onload",max_undo:30,browsers:"known",plugins:"",gecko_spellcheck:false,fullscreen:false,is_editable:true,cursor_position:"begin",word_wrap:false,autocompletion:false,load_callback:"",save_callback:"",change_callback:"",submit_callback:"",EA_init_callback:"",EA_delete_callback:"",EA_load_callback:"",EA_unload_callback:"",EA_toggle_on_callback:"",EA_toggle_off_callback:"",EA_file_switch_on_callback:"",EA_file_switch_off_callback:"",EA_file_close_callback:""};t.advanced_buttons=[ ['new_document','newdocument.gif','new_document',false],['search','search.gif','show_search',false],['go_to_line','go_to_line.gif','go_to_line',false],['undo','undo.gif','undo',true],['redo','redo.gif','redo',true],['change_smooth_selection','smooth_selection.gif','change_smooth_selection_mode',true],['reset_highlight','reset_highlight.gif','resync_highlight',true],['highlight','highlight.gif','change_highlight',true],['help','help.gif','show_help',false],['save','save.gif','save',false],['load','load.gif','load',false],['fullscreen','fullscreen.gif','toggle_full_screen',false],['word_wrap','word_wrap.gif','toggle_word_wrap',true],['autocompletion','autocompletion.gif','toggle_autocompletion',true] ];t.set_browser_infos(t);if(t.isIE>=6||t.isGecko||(t.isWebKit&&!t.isSafari<3)||t.isOpera>=9||t.isCamino)t.isValidBrowser=true;
else t.isValidBrowser=false;t.set_base_url();for(var i=0;i<t.scripts_to_load.length;i++){setTimeout("eAL.load_script('"+t.baseURL+t.scripts_to_load[i]+".js');",1);t.waiting_loading[t.scripts_to_load[i]+".js"]=false;}t.add_event(window,"load",EAL.prototype.window_loaded);};EAL.prototype={has_error:function(){this.error=true;for(var i in EAL.prototype){EAL.prototype[i]=function(){};}},set_browser_infos:function(o){ua=navigator.userAgent;o.isWebKit=/WebKit/.test(ua);o.isGecko=!o.isWebKit&&/Gecko/.test(ua);o.isMac=/Mac/.test(ua);o.isIE=(navigator.appName=="Microsoft Internet Explorer");if(o.isIE){o.isIE=ua.replace(/^.*?MSIE\s+([0-9\.]+).*$/,"$1");if(o.isIE<6)o.has_error();}if(o.isOpera=(ua.indexOf('Opera')!=-1)){o.isOpera=ua.replace(/^.*?Opera.*?([0-9\.]+).*$/i,"$1");if(o.isOpera<9)o.has_error();o.isIE=false;}if(o.isFirefox=(ua.indexOf('Firefox')!=-1))o.isFirefox=ua.replace(/^.*?Firefox.*?([0-9\.]+).*$/i,"$1");if(ua.indexOf('Iceweasel')!=-1)o.isFirefox=ua.replace(/^.*?Iceweasel.*?([0-9\.]+).*$/i,"$1");if(ua.indexOf('GranParadiso')!=-1)o.isFirefox=ua.replace(/^.*?GranParadiso.*?([0-9\.]+).*$/i,"$1");if(ua.indexOf('BonEcho')!=-1)o.isFirefox=ua.replace(/^.*?BonEcho.*?([0-9\.]+).*$/i,"$1");if(ua.indexOf('SeaMonkey')!=-1)o.isFirefox=(ua.replace(/^.*?SeaMonkey.*?([0-9\.]+).*$/i,"$1"))+1;if(o.isCamino=(ua.indexOf('Camino')!=-1))o.isCamino=ua.replace(/^.*?Camino.*?([0-9\.]+).*$/i,"$1");if(o.isSafari=(ua.indexOf('Safari')!=-1))o.isSafari=ua.replace(/^.*?Version\/([0-9]+\.[0-9]+).*$/i,"$1");if(o.isChrome=(ua.indexOf('Chrome')!=-1)){o.isChrome=ua.replace(/^.*?Chrome.*?([0-9\.]+).*$/i,"$1");o.isSafari=false;}},window_loaded:function(){eAL.win="loaded";if(document.forms){for(var i=0;i<document.forms.length;i++){var form=document.forms[i];form.edit_area_replaced_submit=null;try{form.edit_area_replaced_submit=form.onsubmit;form.onsubmit="";}catch(e){}eAL.add_event(form,"submit",EAL.prototype.submit);eAL.add_event(form,"reset",EAL.prototype.reset);}}eAL.add_event(window,"unload",function(){for(var i in eAs){eAL.delete_instance(i);}});},init_ie_textarea:function(id){var a=document.getElementById(id);try{if(a&&typeof(a.focused)=="undefined"){a.focus();a.focused=true;a.selectionStart=a.selectionEnd=0;get_IE_selection(a);eAL.add_event(a,"focus",IE_textarea_focus);eAL.add_event(a,"blur",IE_textarea_blur);}}catch(ex){}},init:function(settings){var t=this,s=settings,i;if(!s["id"])t.has_error();if(t.error)return;if(eAs[s["id"]])t.delete_instance(s["id"]);for(i in t.default_settings){if(typeof(s[i])=="undefined")s[i]=t.default_settings[i];}if(s["browsers"]=="known"&&t.isValidBrowser==false){return;}if(s["begin_toolbar"].length>0)s["toolbar"]=s["begin_toolbar"]+","+s["toolbar"];if(s["end_toolbar"].length>0)s["toolbar"]=s["toolbar"]+","+s["end_toolbar"];s["tab_toolbar"]=s["toolbar"].replace(/ /g,"").split(",");s["plugins"]=s["plugins"].replace(/ /g,"").split(",");for(i=0;i<s["plugins"].length;i++){if(s["plugins"][i].length==0)s["plugins"].splice(i,1);}t.get_template();t.load_script(t.baseURL+"langs/"+s["language"]+".js");if(s["syntax"].length>0){s["syntax"]=s["syntax"].toLowerCase();t.load_script(t.baseURL+"reg_syntax/"+s["syntax"]+".js");}eAs[s["id"]]={"settings":s};eAs[s["id"]]["displayed"]=false;eAs[s["id"]]["hidden"]=false;t.start(s["id"]);},delete_instance:function(id){var d=document,fs=window.frames,span,iframe;eAL.execCommand(id,"EA_delete");if(fs["frame_"+id]&&fs["frame_"+id].editArea){if(eAs[id]["displayed"])eAL.toggle(id,"off");fs["frame_"+id].editArea.execCommand("EA_unload");}span=d.getElementById("EditAreaArroundInfos_"+id);if(span)span.parentNode.removeChild(span);iframe=d.getElementById("frame_"+id);if(iframe){iframe.parentNode.removeChild(iframe);try{delete fs["frame_"+id];}catch(e){}}delete eAs[id];},start:function(id){var t=this,d=document,f,span,father,next,html='',html_toolbar_content='',template,content,i;if(t.win!="loaded"){setTimeout("eAL.start('"+id+"');",50);return;}for(i in t.waiting_loading){if(t.waiting_loading[i]!="loaded"&&typeof(t.waiting_loading[i])!="function"){setTimeout("eAL.start('"+id+"');",50);return;}}if(!t.lang[eAs[id]["settings"]["language"]]||(eAs[id]["settings"]["syntax"].length>0&&!t.load_syntax[eAs[id]["settings"]["syntax"]])){setTimeout("eAL.start('"+id+"');",50);return;}if(eAs[id]["settings"]["syntax"].length>0)t.init_syntax_regexp();if(!d.getElementById("EditAreaArroundInfos_"+id)&&(eAs[id]["settings"]["debug"]||eAs[id]["settings"]["allow_toggle"])){span=d.createElement("span");span.id="EditAreaArroundInfos_"+id;if(eAs[id]["settings"]["allow_toggle"]){checked=(eAs[id]["settings"]["display"]=="onload")?"checked='checked'":"";html+="<div id='edit_area_toggle_"+i+"'>";html+="<input id='edit_area_toggle_checkbox_"+id+"' class='toggle_"+id+"' type='checkbox' onclick='eAL.toggle(\""+id+"\");' accesskey='e' "+checked+" />";html+="<label for='edit_area_toggle_checkbox_"+id+"'>{$toggle}</label></div>";}if(eAs[id]["settings"]["debug"])html+="<textarea id='edit_area_debug_"+id+"' spellcheck='off' style='z-index:20;width:100%;height:120px;overflow:auto;border:solid black 1px;'></textarea><br />";html=t.translate(html,eAs[id]["settings"]["language"]);span.innerHTML=html;father=d.getElementById(id).parentNode;next=d.getElementById(id).nextSibling;if(next==null)father.appendChild(span);
else father.insertBefore(span,next);}if(!eAs[id]["initialized"]){t.execCommand(id,"EA_init");if(eAs[id]["settings"]["display"]=="later"){eAs[id]["initialized"]=true;return;}}if(t.isIE){t.init_ie_textarea(id);}var area=eAs[id];for(i=0;i<area["settings"]["tab_toolbar"].length;i++){html_toolbar_content+=t.get_control_html(area["settings"]["tab_toolbar"][i],area["settings"]["language"]);}html_toolbar_content=t.translate(html_toolbar_content,area["settings"]["language"],"template");if(!t.iframe_script){t.iframe_script="";for(i=0;i<t.sub_scripts_to_load.length;i++)t.iframe_script+='<script language="javascript" type="text/javascript" src="'+t.baseURL+t.sub_scripts_to_load[i]+'.js"></script>';}for(i=0;i<area["settings"]["plugins"].length;i++){if(!t.all_plugins_loaded)t.iframe_script+='<script language="javascript" type="text/javascript" src="'+t.baseURL+'plugins/'+area["settings"]["plugins"][i]+'/'+area["settings"]["plugins"][i]+'.js"></script>';t.iframe_script+='<script language="javascript" type="text/javascript" src="'+t.baseURL+'plugins/'+area["settings"]["plugins"][i]+'/langs/'+area["settings"]["language"]+'.js"></script>';}if(!t.iframe_css){t.iframe_css="<link href='"+t.baseURL+"edit_area.css' rel='stylesheet' type='text/css' />";}template=t.template.replace(/\[__BASEURL__\]/g,t.baseURL);template=template.replace("[__TOOLBAR__]",html_toolbar_content);template=t.translate(template,area["settings"]["language"],"template");template=template.replace("[__CSSRULES__]",t.iframe_css);template=template.replace("[__JSCODE__]",t.iframe_script);template=template.replace("[__EA_VERSION__]",t.version);area.textarea=d.getElementById(area["settings"]["id"]);eAs[area["settings"]["id"]]["textarea"]=area.textarea;if(typeof(window.frames["frame_"+area["settings"]["id"]])!='undefined')delete window.frames["frame_"+area["settings"]["id"]];father=area.textarea.parentNode;content=d.createElement("iframe");content.name="frame_"+area["settings"]["id"];content.id="frame_"+area["settings"]["id"];content.style.borderWidth="0px";setAttribute(content,"frameBorder","0");content.style.overflow="hidden";content.style.display="none";next=area.textarea.nextSibling;if(next==null)father.appendChild(content);
else father.insertBefore(content,next);f=window.frames["frame_"+area["settings"]["id"]];f.document.open();f.eAs=eAs;f.area_id=area["settings"]["id"];f.document.area_id=area["settings"]["id"];f.document.write(template);f.document.close();},toggle:function(id,toggle_to){if(!toggle_to)toggle_to=(eAs[id]["displayed"]==true)?"off":"on";if(eAs[id]["displayed"]==true&&toggle_to=="off"){this.toggle_off(id);}
else if(eAs[id]["displayed"]==false&&toggle_to=="on"){this.toggle_on(id);}return false;},toggle_off:function(id){var fs=window.frames,f,t,parNod,nxtSib,selStart,selEnd,scrollTop,scrollLeft;if(fs["frame_"+id]){f=fs["frame_"+id];t=eAs[id]["textarea"];if(f.editArea.fullscreen['isFull'])f.editArea.toggle_full_screen(false);eAs[id]["displayed"]=false;t.wrap="off";setAttribute(t,"wrap","off");parNod=t.parentNode;nxtSib=t.nextSibling;parNod.removeChild(t);parNod.insertBefore(t,nxtSib);t.value=f.editArea.textarea.value;selStart=f.editArea.last_selection["selectionStart"];selEnd=f.editArea.last_selection["selectionEnd"];scrollTop=f.document.getElementById("result").scrollTop;scrollLeft=f.document.getElementById("result").scrollLeft;document.getElementById("frame_"+id).style.display='none';t.style.display="inline";try{t.focus();}catch(e){};if(this.isIE){t.selectionStart=selStart;t.selectionEnd=selEnd;t.focused=true;set_IE_selection(t);}
else{if(this.isOpera&&this.isOpera < 9.6){t.setSelectionRange(0,0);}try{t.setSelectionRange(selStart,selEnd);}catch(e){};}t.scrollTop=scrollTop;t.scrollLeft=scrollLeft;f.editArea.execCommand("toggle_off");}},toggle_on:function(id){var fs=window.frames,f,t,selStart=0,selEnd=0,scrollTop=0,scrollLeft=0,curPos,elem;if(fs["frame_"+id]){f=fs["frame_"+id];t=eAs[id]["textarea"];area=f.editArea;area.textarea.value=t.value;curPos=eAs[id]["settings"]["cursor_position"];if(t.use_last==true){selStart=t.last_selectionStart;selEnd=t.last_selectionEnd;scrollTop=t.last_scrollTop;scrollLeft=t.last_scrollLeft;t.use_last=false;}
else if(curPos=="auto"){try{selStart=t.selectionStart;selEnd=t.selectionEnd;scrollTop=t.scrollTop;scrollLeft=t.scrollLeft;}catch(ex){}}this.set_editarea_size_from_textarea(id,document.getElementById("frame_"+id));t.style.display="none";document.getElementById("frame_"+id).style.display="inline";area.execCommand("focus");eAs[id]["displayed"]=true;area.execCommand("update_size");f.document.getElementById("result").scrollTop=scrollTop;f.document.getElementById("result").scrollLeft=scrollLeft;area.area_select(selStart,selEnd-selStart);area.execCommand("toggle_on");}
else{elem=document.getElementById(id);elem.last_selectionStart=elem.selectionStart;elem.last_selectionEnd=elem.selectionEnd;elem.last_scrollTop=elem.scrollTop;elem.last_scrollLeft=elem.scrollLeft;elem.use_last=true;eAL.start(id);}},set_editarea_size_from_textarea:function(id,frame){var elem,width,height;elem=document.getElementById(id);width=Math.max(eAs[id]["settings"]["min_width"],elem.offsetWidth)+"px";height=Math.max(eAs[id]["settings"]["min_height"],elem.offsetHeight)+"px";if(elem.style.width.indexOf("%")!=-1)width=elem.style.width;if(elem.style.height.indexOf("%")!=-1)height=elem.style.height;frame.style.width=width;frame.style.height=height;},set_base_url:function(){var t=this,elems,i,docBasePath;if(!this.baseURL){elems=document.getElementsByTagName('script');for(i=0;i<elems.length;i++){if(elems[i].src&&elems[i].src.match(/edit_area_[^\\\/]*$/i)){var src=unescape(elems[i].src);src=src.substring(0,src.lastIndexOf('/'));this.baseURL=src;this.file_name=elems[i].src.substr(elems[i].src.lastIndexOf("/")+1);break;}}}docBasePath=document.location.href;if(docBasePath.indexOf('?')!=-1)docBasePath=docBasePath.substring(0,docBasePath.indexOf('?'));docBasePath=docBasePath.substring(0,docBasePath.lastIndexOf('/'));if(t.baseURL.indexOf('://')==-1&&t.baseURL.charAt(0)!='/'){t.baseURL=docBasePath+"/"+t.baseURL;}t.baseURL+="/";},get_button_html:function(id,img,exec,isFileSpecific,baseURL){var cmd,html;if(!baseURL)baseURL=this.baseURL;cmd='editArea.execCommand(\''+exec+'\')';html='<a id="a_'+id+'" href="javascript:'+cmd+'" onclick="'+cmd+';return false;" onmousedown="return false;" target="_self" fileSpecific="'+(isFileSpecific?'yes':'no')+'">';html+='<img id="'+id+'" src="'+baseURL+'images/'+img+'" title="{$'+id+'}" width="20" height="20" class="editAreaButtonNormal" onmouseover="editArea.switchClass(this,\'editAreaButtonOver\');" onmouseout="editArea.restoreClass(this);" onmousedown="editArea.restoreAndSwitchClass(this,\'editAreaButtonDown\');" /></a>';return html;},get_control_html:function(button_name,lang){var t=this,i,but,html,si;for(i=0;i<t.advanced_buttons.length;i++){but=t.advanced_buttons[i];if(but[0]==button_name){return t.get_button_html(but[0],but[1],but[2],but[3]);}}switch(button_name){case "*":case "return":return "<br />";case "|":case "separator":return '<img src="'+t.baseURL+'images/spacer.gif" width="1" height="15" class="editAreaSeparatorLine">';case "select_font":html="<select id='area_font_size' onchange='javascript:editArea.execCommand(\"change_font_size\")' fileSpecific='yes'>";html+="<option value='-1'>{$font_size}</option>";si=[8,9,10,11,12,14];for(i=0;i<si.length;i++){html+="<option value='"+si[i]+"'>"+si[i]+" pt</option>";}html+="</select>";return html;case "syntax_selection":html="<select id='syntax_selection' onchange='javascript:editArea.execCommand(\"change_syntax\",this.value)' fileSpecific='yes'>";html+="<option value='-1'>{$syntax_selection}</option>";html+="</select>";return html;}return "<span id='tmp_tool_"+button_name+"'>["+button_name+"]</span>";},get_template:function(){if(this.template==""){var xhr_object=null;if(window.XMLHttpRequest)xhr_object=new XMLHttpRequest();
else if(window.ActiveXObject)xhr_object=new ActiveXObject("Microsoft.XMLHTTP");
else{alert("XMLHTTPRequest not supported. EditArea not loaded");return;}xhr_object.open("GET",this.baseURL+"template.html",false);xhr_object.send(null);if(xhr_object.readyState==4)this.template=xhr_object.responseText;
else this.has_error();}},translate:function(text,lang,mode){if(mode=="word")text=eAL.get_word_translation(text,lang);
else if(mode="template"){eAL.current_language=lang;text=text.replace(/\{\$([^\}]+)\}/gm,eAL.translate_template);}return text;},translate_template:function(){return eAL.get_word_translation(EAL.prototype.translate_template.arguments[1],eAL.current_language);},get_word_translation:function(val,lang){var i;for(i in eAL.lang[lang]){if(i==val)return eAL.lang[lang][i];}return "_"+val;},load_script:function(url){var t=this,d=document,script,head;if(t.loadedFiles[url])return;try{script=d.createElement("script");script.type="text/javascript";script.src=url;script.charset="UTF-8";d.getElementsByTagName("head")[0].appendChild(script);}catch(e){d.write('<sc'+'ript language="javascript" type="text/javascript" src="'+url+'" charset="UTF-8"></sc'+'ript>');}t.loadedFiles[url]=true;},add_event:function(obj,name,handler){try{if(obj.attachEvent){obj.attachEvent("on"+name,handler);}
else{obj.addEventListener(name,handler,false);}}catch(e){}},remove_event:function(obj,name,handler){try{if(obj.detachEvent)obj.detachEvent("on"+name,handler);
else obj.removeEventListener(name,handler,false);}catch(e){}},reset:function(e){var formObj,is_child,i,x;formObj=eAL.isIE ? window.event.srcElement:e.target;if(formObj.tagName!='FORM')formObj=formObj.form;for(i in eAs){is_child=false;for(x=0;x<formObj.elements.length;x++){if(formObj.elements[x].id==i)is_child=true;}if(window.frames["frame_"+i]&&is_child&&eAs[i]["displayed"]==true){var exec='window.frames["frame_'+i+'"].editArea.textarea.value=document.getElementById("'+i+'").value;';exec+='window.frames["frame_'+i+'"].editArea.execCommand("focus");';exec+='window.frames["frame_'+i+'"].editArea.check_line_selection();';exec+='window.frames["frame_'+i+'"].editArea.execCommand("reset");';window.setTimeout(exec,10);}}return;},submit:function(e){var formObj,is_child,fs=window.frames,i,x;formObj=eAL.isIE ? window.event.srcElement:e.target;if(formObj.tagName!='FORM')formObj=formObj.form;for(i in eAs){is_child=false;for(x=0;x<formObj.elements.length;x++){if(formObj.elements[x].id==i)is_child=true;}if(is_child){if(fs["frame_"+i]&&eAs[i]["displayed"]==true)document.getElementById(i).value=fs["frame_"+i].editArea.textarea.value;eAL.execCommand(i,"EA_submit");}}if(typeof(formObj.edit_area_replaced_submit)=="function"){res=formObj.edit_area_replaced_submit();if(res==false){if(eAL.isIE)return false;
else e.preventDefault();}}return;},getValue:function(id){if(window.frames["frame_"+id]&&eAs[id]["displayed"]==true){return window.frames["frame_"+id].editArea.textarea.value;}
else if(elem=document.getElementById(id)){return elem.value;}return false;},setValue:function(id,new_val){var fs=window.frames;if((f=fs["frame_"+id])&&eAs[id]["displayed"]==true){f.editArea.textarea.value=new_val;f.editArea.execCommand("focus");f.editArea.check_line_selection(false);f.editArea.execCommand("onchange");}
else if(elem=document.getElementById(id)){elem.value=new_val;}},getSelectionRange:function(id){var sel,eA,fs=window.frames;sel={"start":0,"end":0};if(fs["frame_"+id]&&eAs[id]["displayed"]==true){eA=fs["frame_"+id].editArea;sel["start"]=eA.textarea.selectionStart;sel["end"]=eA.textarea.selectionEnd;}
else if(elem=document.getElementById(id)){sel=getSelectionRange(elem);}return sel;},setSelectionRange:function(id,new_start,new_end){var fs=window.frames;if(fs["frame_"+id]&&eAs[id]["displayed"]==true){fs["frame_"+id].editArea.area_select(new_start,new_end-new_start);if(!this.isIE){fs["frame_"+id].editArea.check_line_selection(false);fs["frame_"+id].editArea.scroll_to_view();}}
else if(elem=document.getElementById(id)){setSelectionRange(elem,new_start,new_end);}},getSelectedText:function(id){var sel=this.getSelectionRange(id);return this.getValue(id).substring(sel["start"],sel["end"]);},setSelectedText:function(id,new_val){var fs=window.frames,d=document,sel,text,scrollTop,scrollLeft,new_sel_end;new_val=new_val.replace(/\r/g,"");sel=this.getSelectionRange(id);text=this.getValue(id);if(fs["frame_"+id]&&eAs[id]["displayed"]==true){scrollTop=fs["frame_"+id].document.getElementById("result").scrollTop;scrollLeft=fs["frame_"+id].document.getElementById("result").scrollLeft;}
else{scrollTop=d.getElementById(id).scrollTop;scrollLeft=d.getElementById(id).scrollLeft;}text=text.substring(0,sel["start"])+new_val+text.substring(sel["end"]);this.setValue(id,text);new_sel_end=sel["start"]+new_val.length;this.setSelectionRange(id,sel["start"],new_sel_end);if(new_val !=this.getSelectedText(id).replace(/\r/g,"")){this.setSelectionRange(id,sel["start"],new_sel_end+new_val.split("\n").length-1);}if(fs["frame_"+id]&&eAs[id]["displayed"]==true){fs["frame_"+id].document.getElementById("result").scrollTop=scrollTop;fs["frame_"+id].document.getElementById("result").scrollLeft=scrollLeft;fs["frame_"+id].editArea.execCommand("onchange");}
else{d.getElementById(id).scrollTop=scrollTop;d.getElementById(id).scrollLeft=scrollLeft;}},insertTags:function(id,open_tag,close_tag){var old_sel,new_sel;old_sel=this.getSelectionRange(id);text=open_tag+this.getSelectedText(id)+close_tag;eAL.setSelectedText(id,text);new_sel=this.getSelectionRange(id);if(old_sel["end"] > old_sel["start"])this.setSelectionRange(id,new_sel["end"],new_sel["end"]);
else this.setSelectionRange(id,old_sel["start"]+open_tag.length,old_sel["start"]+open_tag.length);},hide:function(id){var fs=window.frames,d=document,t=this,scrollTop,scrollLeft,span;if(d.getElementById(id)&&!t.hidden[id]){t.hidden[id]={};t.hidden[id]["selectionRange"]=t.getSelectionRange(id);if(d.getElementById(id).style.display!="none"){t.hidden[id]["scrollTop"]=d.getElementById(id).scrollTop;t.hidden[id]["scrollLeft"]=d.getElementById(id).scrollLeft;}if(fs["frame_"+id]){t.hidden[id]["toggle"]=eAs[id]["displayed"];if(fs["frame_"+id]&&eAs[id]["displayed"]==true){scrollTop=fs["frame_"+id].document.getElementById("result").scrollTop;scrollLeft=fs["frame_"+id].document.getElementById("result").scrollLeft;}
else{scrollTop=d.getElementById(id).scrollTop;scrollLeft=d.getElementById(id).scrollLeft;}t.hidden[id]["scrollTop"]=scrollTop;t.hidden[id]["scrollLeft"]=scrollLeft;if(eAs[id]["displayed"]==true)eAL.toggle_off(id);}span=d.getElementById("EditAreaArroundInfos_"+id);if(span){span.style.display='none';}d.getElementById(id).style.display="none";}},show:function(id){var fs=window.frames,d=document,t=this,span;if((elem=d.getElementById(id))&&t.hidden[id]){elem.style.display="inline";elem.scrollTop=t.hidden[id]["scrollTop"];elem.scrollLeft=t.hidden[id]["scrollLeft"];span=d.getElementById("EditAreaArroundInfos_"+id);if(span){span.style.display='inline';}if(fs["frame_"+id]){elem.style.display="inline";if(t.hidden[id]["toggle"]==true)eAL.toggle_on(id);scrollTop=t.hidden[id]["scrollTop"];scrollLeft=t.hidden[id]["scrollLeft"];if(fs["frame_"+id]&&eAs[id]["displayed"]==true){fs["frame_"+id].document.getElementById("result").scrollTop=scrollTop;fs["frame_"+id].document.getElementById("result").scrollLeft=scrollLeft;}
else{elem.scrollTop=scrollTop;elem.scrollLeft=scrollLeft;}}sel=t.hidden[id]["selectionRange"];t.setSelectionRange(id,sel["start"],sel["end"]);delete t.hidden[id];}},getCurrentFile:function(id){return this.execCommand(id,'get_file',this.execCommand(id,'curr_file'));},getFile:function(id,file_id){return this.execCommand(id,'get_file',file_id);},getAllFiles:function(id){return this.execCommand(id,'get_all_files()');},openFile:function(id,file_infos){return this.execCommand(id,'open_file',file_infos);},closeFile:function(id,file_id){return this.execCommand(id,'close_file',file_id);},setFileEditedMode:function(id,file_id,to){var reg1,reg2;reg1=new RegExp('\\\\','g');reg2=new RegExp('"','g');return this.execCommand(id,'set_file_edited_mode("'+file_id.replace(reg1,'\\\\').replace(reg2,'\\"')+'",'+to+')');},execCommand:function(id,cmd,fct_param){switch(cmd){case "EA_init":if(eAs[id]['settings']["EA_init_callback"].length>0)eval(eAs[id]['settings']["EA_init_callback"]+"('"+id+"');");break;case "EA_delete":if(eAs[id]['settings']["EA_delete_callback"].length>0)eval(eAs[id]['settings']["EA_delete_callback"]+"('"+id+"');");break;case "EA_submit":if(eAs[id]['settings']["submit_callback"].length>0)eval(eAs[id]['settings']["submit_callback"]+"('"+id+"');");break;}if(window.frames["frame_"+id]&&window.frames["frame_"+id].editArea){if(fct_param!=undefined)return eval('window.frames["frame_'+id+'"].editArea.'+cmd+'(fct_param);');
else return eval('window.frames["frame_'+id+'"].editArea.'+cmd+';');}return false;}};var eAL=new EAL();var eAs={}; function getAttribute(elm,aName){var aValue,taName,i;try{aValue=elm.getAttribute(aName);}catch(exept){}if(! aValue){for(i=0;i < elm.attributes.length;i++){taName=elm.attributes[i] .name.toLowerCase();if(taName==aName){aValue=elm.attributes[i] .value;return aValue;}}}return aValue;};function setAttribute(elm,attr,val){if(attr=="class"){elm.setAttribute("className",val);elm.setAttribute("class",val);}
else{elm.setAttribute(attr,val);}};function getChildren(elem,elem_type,elem_attribute,elem_attribute_match,option,depth){if(!option)var option="single";if(!depth)var depth=-1;if(elem){var children=elem.childNodes;var result=null;var results=[];for(var x=0;x<children.length;x++){strTagName=new String(children[x].tagName);children_class="?";if(strTagName!="undefined"){child_attribute=getAttribute(children[x],elem_attribute);if((strTagName.toLowerCase()==elem_type.toLowerCase()||elem_type=="")&&(elem_attribute==""||child_attribute==elem_attribute_match)){if(option=="all"){results.push(children[x]);}
else{return children[x];}}if(depth!=0){result=getChildren(children[x],elem_type,elem_attribute,elem_attribute_match,option,depth-1);if(option=="all"){if(result.length>0){results=results.concat(result);}}
else if(result!=null){return result;}}}}if(option=="all")return results;}return null;};function isChildOf(elem,parent){if(elem){if(elem==parent)return true;while(elem.parentNode !='undefined'){return isChildOf(elem.parentNode,parent);}}return false;};function getMouseX(e){if(e!=null&&typeof(e.pageX)!="undefined"){return e.pageX;}
else{return(e!=null?e.x:event.x)+document.documentElement.scrollLeft;}};function getMouseY(e){if(e!=null&&typeof(e.pageY)!="undefined"){return e.pageY;}
else{return(e!=null?e.y:event.y)+document.documentElement.scrollTop;}};function calculeOffsetLeft(r){return calculeOffset(r,"offsetLeft")};function calculeOffsetTop(r){return calculeOffset(r,"offsetTop")};function calculeOffset(element,attr){var offset=0;while(element){offset+=element[attr];element=element.offsetParent}return offset;};function get_css_property(elem,prop){if(document.defaultView){return document.defaultView.getComputedStyle(elem,null).getPropertyValue(prop);}
else if(elem.currentStyle){var prop=prop.replace(/-\D/gi,function(sMatch){return sMatch.charAt(sMatch.length-1).toUpperCase();});return elem.currentStyle[prop];}
else return null;}var _mCE;function start_move_element(e,id,frame){var elem_id=(e.target||e.srcElement).id;if(id)elem_id=id;if(!frame)frame=window;if(frame.event)e=frame.event;_mCE=frame.document.getElementById(elem_id);_mCE.frame=frame;frame.document.onmousemove=move_element;frame.document.onmouseup=end_move_element;mouse_x=getMouseX(e);mouse_y=getMouseY(e);_mCE.start_pos_x=mouse_x-(_mCE.style.left.replace("px","")||calculeOffsetLeft(_mCE));_mCE.start_pos_y=mouse_y-(_mCE.style.top.replace("px","")||calculeOffsetTop(_mCE));return false;};function end_move_element(e){_mCE.frame.document.onmousemove="";_mCE.frame.document.onmouseup="";_mCE=null;};function move_element(e){var newTop,newLeft,maxLeft;if(_mCE.frame&&_mCE.frame.event)e=_mCE.frame.event;newTop=getMouseY(e)-_mCE.start_pos_y;newLeft=getMouseX(e)-_mCE.start_pos_x;maxLeft=_mCE.frame.document.body.offsetWidth-_mCE.offsetWidth;max_top=_mCE.frame.document.body.offsetHeight-_mCE.offsetHeight;newTop=Math.min(Math.max(0,newTop),max_top);newLeft=Math.min(Math.max(0,newLeft),maxLeft);_mCE.style.top=newTop+"px";_mCE.style.left=newLeft+"px";return false;};var nav=eAL.nav;function getSelectionRange(textarea){return{"start":textarea.selectionStart,"end":textarea.selectionEnd};};function setSelectionRange(t,start,end){t.focus();start=Math.max(0,Math.min(t.value.length,start));end=Math.max(start,Math.min(t.value.length,end));if(nav.isOpera&&nav.isOpera < 9.6){t.selectionEnd=1;t.selectionStart=0;t.selectionEnd=1;t.selectionStart=0;}t.selectionStart=start;t.selectionEnd=end;if(nav.isIE)set_IE_selection(t);};function get_IE_selection(t){var d=document,div,range,stored_range,elem,scrollTop,relative_top,line_start,line_nb,range_start,range_end,tab;if(t&&t.focused){if(!t.ea_line_height){div=d.createElement("div");div.style.fontFamily=get_css_property(t,"font-family");div.style.fontSize=get_css_property(t,"font-size");div.style.visibility="hidden";div.innerHTML="0";d.body.appendChild(div);t.ea_line_height=div.offsetHeight;d.body.removeChild(div);}range=d.selection.createRange();try{stored_range=range.duplicate();stored_range.moveToElementText(t);stored_range.setEndPoint('EndToEnd',range);if(stored_range.parentElement()==t){elem=t;scrollTop=0;while(elem.parentNode){scrollTop+=elem.scrollTop;elem=elem.parentNode;}relative_top=range.offsetTop-calculeOffsetTop(t)+scrollTop;line_start=Math.round((relative_top / t.ea_line_height)+1);line_nb=Math.round(range.boundingHeight / t.ea_line_height);range_start=stored_range.text.length-range.text.length;tab=t.value.substr(0,range_start).split("\n");range_start+=(line_start-tab.length)*2;t.selectionStart=range_start;range_end=t.selectionStart+range.text.length;tab=t.value.substr(0,range_start+range.text.length).split("\n");range_end+=(line_start+line_nb-1-tab.length)*2;t.selectionEnd=range_end;}}catch(e){}}if(t&&t.id){setTimeout("get_IE_selection(document.getElementById('"+t.id+"'));",50);}};function IE_textarea_focus(){event.srcElement.focused=true;}function IE_textarea_blur(){event.srcElement.focused=false;}function set_IE_selection(t){var nbLineStart,nbLineStart,nbLineEnd,range;if(!window.closed){nbLineStart=t.value.substr(0,t.selectionStart).split("\n").length-1;nbLineEnd=t.value.substr(0,t.selectionEnd).split("\n").length-1;try{range=document.selection.createRange();range.moveToElementText(t);range.setEndPoint('EndToStart',range);range.moveStart('character',t.selectionStart-nbLineStart);range.moveEnd('character',t.selectionEnd-nbLineEnd-(t.selectionStart-nbLineStart));range.select();}catch(e){}}};eAL.waiting_loading["elements_functions.js"]="loaded";
 EAL.prototype.start_resize_area=function(){var d=document,a,div,width,height,father;d.onmouseup=eAL.end_resize_area;d.onmousemove=eAL.resize_area;eAL.toggle(eAL.resize["id"]);a=eAs[eAL.resize["id"]]["textarea"];div=d.getElementById("edit_area_resize");if(!div){div=d.createElement("div");div.id="edit_area_resize";div.style.border="dashed #888888 1px";}width=a.offsetWidth-2;height=a.offsetHeight-2;div.style.display="block";div.style.width=width+"px";div.style.height=height+"px";father=a.parentNode;father.insertBefore(div,a);a.style.display="none";eAL.resize["start_top"]=calculeOffsetTop(div);eAL.resize["start_left"]=calculeOffsetLeft(div);};EAL.prototype.end_resize_area=function(e){var d=document,div,a,width,height;d.onmouseup="";d.onmousemove="";div=d.getElementById("edit_area_resize");a=eAs[eAL.resize["id"]]["textarea"];width=Math.max(eAs[eAL.resize["id"]]["settings"]["min_width"],div.offsetWidth-4);height=Math.max(eAs[eAL.resize["id"]]["settings"]["min_height"],div.offsetHeight-4);if(eAL.isIE==6){width-=2;height-=2;}a.style.width=width+"px";a.style.height=height+"px";div.style.display="none";a.style.display="inline";a.selectionStart=eAL.resize["selectionStart"];a.selectionEnd=eAL.resize["selectionEnd"];eAL.toggle(eAL.resize["id"]);return false;};EAL.prototype.resize_area=function(e){var allow,newHeight,newWidth;allow=eAs[eAL.resize["id"]]["settings"]["allow_resize"];if(allow=="both"||allow=="y"){newHeight=Math.max(20,getMouseY(e)-eAL.resize["start_top"]);document.getElementById("edit_area_resize").style.height=newHeight+"px";}if(allow=="both"||allow=="x"){newWidth=Math.max(20,getMouseX(e)-eAL.resize["start_left"]);document.getElementById("edit_area_resize").style.width=newWidth+"px";}return false;};eAL.waiting_loading["resize_area.js"]="loaded";
	EAL.prototype.get_regexp=function(text_array){res="(\\b)(";for(i=0;i<text_array.length;i++){if(i>0)res+="|";res+=this.get_escaped_regexp(text_array[i]);}res+=")(\\b)";reg=new RegExp(res);return res;};EAL.prototype.get_escaped_regexp=function(str){return str.toString().replace(/(\.|\?|\*|\+|\\|\(|\)|\[|\]|\}|\{|\$|\^|\|)/g,"\\$1");};EAL.prototype.init_syntax_regexp=function(){var lang_style={};for(var lang in this.load_syntax){if(!this.syntax[lang]){this.syntax[lang]={};this.syntax[lang]["keywords_reg_exp"]={};this.keywords_reg_exp_nb=0;if(this.load_syntax[lang]['KEYWORDS']){param="g";if(this.load_syntax[lang]['KEYWORD_CASE_SENSITIVE']===false)param+="i";for(var i in this.load_syntax[lang]['KEYWORDS']){if(typeof(this.load_syntax[lang]['KEYWORDS'][i])=="function")continue;this.syntax[lang]["keywords_reg_exp"][i]=new RegExp(this.get_regexp(this.load_syntax[lang]['KEYWORDS'][i]),param);this.keywords_reg_exp_nb++;}}if(this.load_syntax[lang]['OPERATORS']){var str="";var nb=0;for(var i in this.load_syntax[lang]['OPERATORS']){if(typeof(this.load_syntax[lang]['OPERATORS'][i])=="function")continue;if(nb>0)str+="|";str+=this.get_escaped_regexp(this.load_syntax[lang]['OPERATORS'][i]);nb++;}if(str.length>0)this.syntax[lang]["operators_reg_exp"]=new RegExp("("+str+")","g");}if(this.load_syntax[lang]['DELIMITERS']){var str="";var nb=0;for(var i in this.load_syntax[lang]['DELIMITERS']){if(typeof(this.load_syntax[lang]['DELIMITERS'][i])=="function")continue;if(nb>0)str+="|";str+=this.get_escaped_regexp(this.load_syntax[lang]['DELIMITERS'][i]);nb++;}if(str.length>0)this.syntax[lang]["delimiters_reg_exp"]=new RegExp("("+str+")","g");}var syntax_trace=[];this.syntax[lang]["quotes"]={};var quote_tab=[];if(this.load_syntax[lang]['QUOTEMARKS']){for(var i in this.load_syntax[lang]['QUOTEMARKS']){if(typeof(this.load_syntax[lang]['QUOTEMARKS'][i])=="function")continue;var x=this.get_escaped_regexp(this.load_syntax[lang]['QUOTEMARKS'][i]);this.syntax[lang]["quotes"][x]=x;quote_tab[quote_tab.length]="("+x+"(\\\\.|[^"+x+"])*(?:"+x+"|$))";syntax_trace.push(x);}}this.syntax[lang]["comments"]={};if(this.load_syntax[lang]['COMMENT_SINGLE']){for(var i in this.load_syntax[lang]['COMMENT_SINGLE']){if(typeof(this.load_syntax[lang]['COMMENT_SINGLE'][i])=="function")continue;var x=this.get_escaped_regexp(this.load_syntax[lang]['COMMENT_SINGLE'][i]);quote_tab[quote_tab.length]="("+x+"(.|\\r|\\t)*(\\n|$))";syntax_trace.push(x);this.syntax[lang]["comments"][x]="\n";}}if(this.load_syntax[lang]['COMMENT_MULTI']){for(var i in this.load_syntax[lang]['COMMENT_MULTI']){if(typeof(this.load_syntax[lang]['COMMENT_MULTI'][i])=="function")continue;var start=this.get_escaped_regexp(i);var end=this.get_escaped_regexp(this.load_syntax[lang]['COMMENT_MULTI'][i]);quote_tab[quote_tab.length]="("+start+"(.|\\n|\\r)*?("+end+"|$))";syntax_trace.push(start);syntax_trace.push(end);this.syntax[lang]["comments"][i]=this.load_syntax[lang]['COMMENT_MULTI'][i];}}if(quote_tab.length>0)this.syntax[lang]["comment_or_quote_reg_exp"]=new RegExp("("+quote_tab.join("|")+")","gi");if(syntax_trace.length>0)this.syntax[lang]["syntax_trace_regexp"]=new RegExp("((.|\n)*?)(\\\\*("+syntax_trace.join("|")+"|$))","gmi");if(this.load_syntax[lang]['SCRIPT_DELIMITERS']){this.syntax[lang]["script_delimiters"]={};for(var i in this.load_syntax[lang]['SCRIPT_DELIMITERS']){if(typeof(this.load_syntax[lang]['SCRIPT_DELIMITERS'][i])=="function")continue;this.syntax[lang]["script_delimiters"][i]=this.load_syntax[lang]['SCRIPT_DELIMITERS'];}}this.syntax[lang]["custom_regexp"]={};if(this.load_syntax[lang]['REGEXPS']){for(var i in this.load_syntax[lang]['REGEXPS']){if(typeof(this.load_syntax[lang]['REGEXPS'][i])=="function")continue;var val=this.load_syntax[lang]['REGEXPS'][i];if(!this.syntax[lang]["custom_regexp"][val['execute']])this.syntax[lang]["custom_regexp"][val['execute']]={};this.syntax[lang]["custom_regexp"][val['execute']][i]={'regexp':new RegExp(val['search'],val['modifiers']),'class':val['class']};}}if(this.load_syntax[lang]['STYLES']){lang_style[lang]={};for(var i in this.load_syntax[lang]['STYLES']){if(typeof(this.load_syntax[lang]['STYLES'][i])=="function")continue;if(typeof(this.load_syntax[lang]['STYLES'][i])!="string"){for(var j in this.load_syntax[lang]['STYLES'][i]){lang_style[lang][j]=this.load_syntax[lang]['STYLES'][i][j];}}
else{lang_style[lang][i]=this.load_syntax[lang]['STYLES'][i];}}}var style="";for(var i in lang_style[lang]){if(lang_style[lang][i].length>0){style+="."+lang+" ."+i.toLowerCase()+" span{"+lang_style[lang][i]+"}\n";style+="."+lang+" ."+i.toLowerCase()+"{"+lang_style[lang][i]+"}\n";}}this.syntax[lang]["styles"]=style;}}};eAL.waiting_loading["reg_syntax.js"]="loaded";
var editAreaLoader= eAL;var editAreas=eAs;EditAreaLoader=EAL;editAreaLoader.iframe_script= "<script type='text/javascript'> Ã EA(){var t=Á;t.error=Ì;t.inlinePopup=[{popup_id:\"area_search_replace\",icon_id:\"search\"},{popup_id:\"edit_area_help\",icon_id:\"help\"}];t.plugins={};t.line_number=0;È.eAL.set_browser_infos(t);if(t.isIE >=8)t.isIE=7;t.É={};t.last_text_to_highlight=\"\";t.last_hightlighted_text=\"\";t.syntax_list=[];t.allready_used_syntax={};t.check_line_selection_timer=50;t.ÂFocused=Ì;t.highlight_selection_line=null;t.previous=[];t.next=[];t.last_undo=\"\";t.files={};t.filesIdAssoc={};t.curr_file='';t.assocBracket={};t.revertAssocBracket={};t.assocBracket[\"(\"]=\")\";t.assocBracket[\"{\"]=\"}\";t.assocBracket[\"[\"]=\"]\";for(var index in t.assocBracket){t.revertAssocBracket[t.assocBracket[index]]=index;}t.is_editable=Ë;t.lineHeight=16;t.tab_nb_char=8;if(t.isOpera)t.tab_nb_char=6;t.is_tabbing=Ì;t.fullscreen={'isFull':Ì};t.isResizing=Ì;t.id=area_id;t.Å=eAs[t.id][\"Å\"];if((\"\"+t.Å['replace_tab_by_spaces']).match(/^[0-9]+$/)){t.tab_nb_char=t.Å['replace_tab_by_spaces'];t.tabulation=\"\";for(var i=0;i<t.tab_nb_char;i++)t.tabulation+=\" \";}\nelse{t.tabulation=\"\t\";}if(t.Å[\"syntax_selection_allow\"]&&t.Å[\"syntax_selection_allow\"].Æ>0)t.syntax_list=t.Å[\"syntax_selection_allow\"].replace(/ /g,\"\").split(\",\");if(t.Å['syntax'])t.allready_used_syntax[t.Å['syntax']]=Ë;};EA.Ä.init=Ã(){var t=Á,a,s=t.Å;t.Â=_$(\"Â\");t.container=_$(\"container\");t.result=_$(\"result\");t.content_highlight=_$(\"content_highlight\");t.selection_field=_$(\"selection_field\");t.selection_field_text=_$(\"selection_field_text\");t.processing_screen=_$(\"processing\");t.editor_area=_$(\"editor\");t.tab_browsing_area=_$(\"tab_browsing_area\");t.test_font_size=_$(\"test_font_size\");a=t.Â;if(!s['is_editable'])t.set_editable(Ì);t.set_show_line_colors(s['show_line_colors']);if(syntax_selec=_$(\"syntax_selection\")){for(var i=0;i<t.syntax_list.Æ;i++){var syntax=t.syntax_list[i];var option=document.createElement(\"option\");option.Ê=syntax;if(syntax==s['syntax'])option.selected=\"selected\";dispSyntax=È.eAL.syntax_display_name[ syntax ];option.innerHTML=typeof(dispSyntax)=='undefined' ? syntax.substring(0,1).toUpperCase()+syntax.substring(1):dispSyntax;syntax_selec.appendChild(option);}}spans=È.getChildren(_$(\"toolbar_1\"),\"span\",\"\",\"\",\"all\",-1);for(var i=0;i<spans.Æ;i++){id=spans[i].id.replace(/tmp_tool_(.*)/,\"$1\");if(id!=spans[i].id){for(var j in t.plugins){if(typeof(t.plugins[j].get_control_html)==\"Ã\"){html=t.plugins[j].get_control_html(id);if(html!=Ì){html=t.get_translation(html,\"template\");var new_span=document.createElement(\"span\");new_span.innerHTML=html;var father=spans[i].ÈNode;spans[i].ÈNode.replaceChild(new_span,spans[i]);break;}}}}}if(s[\"debug\"]){t.debug=È.document.getElementById(\"edit_area_debug_\"+t.id);}if(_$(\"redo\")!=null)t.switchClassSticky(_$(\"redo\"),'editAreaButtonDisabled',Ë);if(typeof(È.eAL.syntax[s[\"syntax\"]])!=\"undefined\"){for(var i in È.eAL.syntax){if(typeof(È.eAL.syntax[i][\"Çs\"])!=\"undefined\"){t.add_Ç(È.eAL.syntax[i][\"Çs\"]);}}}if(t.isOpera)_$(\"editor\").onkeypress=keyDown;\nelse _$(\"editor\").onkeydown=keyDown;for(var i=0;i<t.inlinePopup.Æ;i++){if(t.isOpera)_$(t.inlinePopup[i][\"popup_id\"]).onkeypress=keyDown;\nelse _$(t.inlinePopup[i][\"popup_id\"]).onkeydown=keyDown;}if(s[\"allow_resize\"]==\"both\"||s[\"allow_resize\"]==\"x\"||s[\"allow_resize\"]==\"y\")t.allow_resize(Ë);È.eAL.toggle(t.id,\"on\");t.change_smooth_selection_mode(eA.smooth_selection);t.execCommand(\"change_highlight\",s[\"start_highlight\"]);t.set_font(eA.Å[\"font_family\"],eA.Å[\"font_size\"]);children=È.getChildren(document.body,\"\",\"selec\",\"none\",\"all\",-1);for(var i=0;i<children.Æ;i++){if(t.isIE)children[i].unselectable=Ë;\nelse children[i].onmousedown=Ã(){return Ì};}a.spellcheck=s[\"gecko_spellcheck\"];if(t.isFirefox >='3'){t.content_highlight.Ç.paddingLeft=\"1px\";t.selection_field.Ç.paddingLeft=\"1px\";t.selection_field_text.Ç.paddingLeft=\"1px\";}if(t.isIE&&t.isIE < 8){a.Ç.marginTop=\"-1px\";}if(t.isSafari){t.editor_area.Ç.position=\"absolute\";a.Ç.marginLeft=\"-3px\";if(t.isSafari < 3.2)a.Ç.marginTop=\"1px\";}È.eAL.add_event(t.result,\"click\",Ã(e){if((e.target||e.srcElement)==eA.result){eA.area_select(eA.Â.Ê.Æ,0);}});if(s['is_multi_files']!=Ì)t.open_file({'id':t.curr_file,'text':''});t.set_word_wrap(s['word_wrap']);setTimeout(\"eA.focus();eA.manage_size();eA.execCommand('EA_load');\",10);t.check_undo();t.check_line_selection(Ë);t.scroll_to_view();for(var i in t.plugins){if(typeof(t.plugins[i].onload)==\"Ã\")t.plugins[i].onload();}if(s['fullscreen']==Ë)t.toggle_full_screen(Ë);È.eAL.add_event(window,\"resize\",eA.update_size);È.eAL.add_event(È.window,\"resize\",eA.update_size);È.eAL.add_event(top.window,\"resize\",eA.update_size);È.eAL.add_event(window,\"unload\",Ã(){if(È.eAL){È.eAL.remove_event(È.window,\"resize\",eA.update_size);È.eAL.remove_event(top.window,\"resize\",eA.update_size);}if(eAs[eA.id]&&eAs[eA.id][\"displayed\"]){eA.execCommand(\"EA_unload\");}});};EA.Ä.update_size=Ã(){var d=document,pd=È.document,height,width,popup,maxLeft,maxTop;if(typeof eAs !='undefined'&&eAs[eA.id]&&eAs[eA.id][\"displayed\"]==Ë){if(eA.fullscreen['isFull']){pd.getElementById(\"frame_\"+eA.id).Ç.width=pd.getElementsByTagName(\"html\")[0].clientWidth+\"px\";pd.getElementById(\"frame_\"+eA.id).Ç.height=pd.getElementsByTagName(\"html\")[0].clientHeight+\"px\";}if(eA.tab_browsing_area.Ç.display=='block'&&(!eA.isIE||eA.isIE >=8)){eA.tab_browsing_area.Ç.height=\"0px\";eA.tab_browsing_area.Ç.height=(eA.result.offsetTop-eA.tab_browsing_area.offsetTop-1)+\"px\";}height=d.body.offsetHeight-eA.get_all_toolbar_height()-4;eA.result.Ç.height=height+\"px\";width=d.body.offsetWidth-2;eA.result.Ç.width=width+\"px\";for(i=0;i < eA.inlinePopup.Æ;i++){popup=_$(eA.inlinePopup[i][\"popup_id\"]);maxLeft=d.body.offsetWidth-popup.offsetWidth;maxTop=d.body.offsetHeight-popup.offsetHeight;if(popup.offsetTop > maxTop)popup.Ç.top=maxTop+\"px\";if(popup.offsetLeft > maxLeft)popup.Ç.left=maxLeft+\"px\";}eA.manage_size(Ë);eA.fixLinesHeight(eA.Â.Ê,0,-1);}};EA.Ä.manage_size=Ã(onlyOneTime){if(!eAs[Á.id])return Ì;if(eAs[Á.id][\"displayed\"]==Ë&&Á.ÂFocused){var area_height,resized=Ì;if(!Á.Å['word_wrap']){var area_width=Á.Â.scrollWidth;area_height=Á.Â.scrollHeight;if(Á.isOpera&&Á.isOpera < 9.6){area_width=10000;}if(Á.Â.previous_scrollWidth!=area_width){Á.container.Ç.width=area_width+\"px\";Á.Â.Ç.width=area_width+\"px\";Á.content_highlight.Ç.width=area_width+\"px\";Á.Â.previous_scrollWidth=area_width;resized=Ë;}}if(Á.Å['word_wrap']){newW=Á.Â.offsetWidth;if(Á.isFirefox||Á.isIE)newW-=2;if(Á.isSafari)newW-=6;Á.content_highlight.Ç.width=Á.selection_field_text.Ç.width=Á.selection_field.Ç.width=Á.test_font_size.Ç.width=newW+\"px\";}if(Á.isOpera||Á.isFirefox||Á.isSafari){area_height=Á.getLinePosTop(Á.É[\"nb_line\"]+1);}\nelse{area_height=Á.Â.scrollHeight;}if(Á.Â.previous_scrollHeight!=area_height){Á.container.Ç.height=(area_height+2)+\"px\";Á.Â.Ç.height=area_height+\"px\";Á.content_highlight.Ç.height=area_height+\"px\";Á.Â.previous_scrollHeight=area_height;resized=Ë;}if(Á.É[\"nb_line\"] >=Á.line_number){var newLines='',destDiv=_$(\"line_number\"),start=Á.line_number,end=Á.É[\"nb_line\"]+100;for(i=start+1;i < end;i++){newLines+='<div id=\"line_'+i+'\">'+i+\"</div>\";Á.line_number++;}destDiv.innerHTML=destDiv.innerHTML+newLines;if(Á.Å['word_wrap']){Á.fixLinesHeight(Á.Â.Ê,start,-1);}}Á.Â.scrollTop=\"0px\";Á.Â.scrollLeft=\"0px\";if(resized==Ë){Á.scroll_to_view();}}if(!onlyOneTime)setTimeout(\"eA.manage_size();\",100);};EA.Ä.execCommand=Ã(cmd,param){for(var i in Á.plugins){if(typeof(Á.plugins[i].execCommand)==\"Ã\"){if(!Á.plugins[i].execCommand(cmd,param))return;}}switch(cmd){case \"save\":if(Á.Å[\"save_callback\"].Æ>0)eval(\"È.\"+Á.Å[\"save_callback\"]+\"('\"+Á.id+\"',eA.Â.Ê);\");break;case \"load\":if(Á.Å[\"load_callback\"].Æ>0)eval(\"È.\"+Á.Å[\"load_callback\"]+\"('\"+Á.id+\"');\");break;case \"onchange\":if(Á.Å[\"change_callback\"].Æ>0)eval(\"È.\"+Á.Å[\"change_callback\"]+\"('\"+Á.id+\"');\");break;case \"EA_load\":if(Á.Å[\"EA_load_callback\"].Æ>0)eval(\"È.\"+Á.Å[\"EA_load_callback\"]+\"('\"+Á.id+\"');\");break;case \"EA_unload\":if(Á.Å[\"EA_unload_callback\"].Æ>0)eval(\"È.\"+Á.Å[\"EA_unload_callback\"]+\"('\"+Á.id+\"');\");break;case \"toggle_on\":if(Á.Å[\"EA_toggle_on_callback\"].Æ>0)eval(\"È.\"+Á.Å[\"EA_toggle_on_callback\"]+\"('\"+Á.id+\"');\");break;case \"toggle_off\":if(Á.Å[\"EA_toggle_off_callback\"].Æ>0)eval(\"È.\"+Á.Å[\"EA_toggle_off_callback\"]+\"('\"+Á.id+\"');\");break;case \"re_sync\":if(!Á.do_highlight)break;case \"file_switch_on\":if(Á.Å[\"EA_file_switch_on_callback\"].Æ>0)eval(\"È.\"+Á.Å[\"EA_file_switch_on_callback\"]+\"(param);\");break;case \"file_switch_off\":if(Á.Å[\"EA_file_switch_off_callback\"].Æ>0)eval(\"È.\"+Á.Å[\"EA_file_switch_off_callback\"]+\"(param);\");break;case \"file_close\":if(Á.Å[\"EA_file_close_callback\"].Æ>0)return eval(\"È.\"+Á.Å[\"EA_file_close_callback\"]+\"(param);\");break;default:if(typeof(eval(\"eA.\"+cmd))==\"Ã\"){if(Á.Å[\"debug\"])eval(\"eA.\"+cmd+\"(param);\");\nelse try{eval(\"eA.\"+cmd+\"(param);\");}catch(e){};}}};EA.Ä.get_translation=Ã(word,mode){if(mode==\"template\")return È.eAL.translate(word,Á.Å[\"language\"],mode);\nelse return È.eAL.get_word_translation(word,Á.Å[\"language\"]);};EA.Ä.add_plugin=Ã(plug_name,plug_obj){for(var i=0;i<Á.Å[\"plugins\"].Æ;i++){if(Á.Å[\"plugins\"][i]==plug_name){Á.plugins[plug_name]=plug_obj;plug_obj.baseURL=È.eAL.baseURL+\"plugins/\"+plug_name+\"/\";if(typeof(plug_obj.init)==\"Ã\")plug_obj.init();}}};EA.Ä.load_css=Ã(url){try{link=document.createElement(\"link\");link.type=\"text/css\";link.rel=\"Çsheet\";link.media=\"all\";link.href=url;head=document.getElementsByTagName(\"head\");head[0].appendChild(link);}catch(e){document.write(\"<link href='\"+url+\"' rel='Çsheet' type='text/css' />\");}};EA.Ä.load_script=Ã(url){try{script=document.createElement(\"script\");script.type=\"text/javascript\";script.src=url;script.charset=\"UTF-8\";head=document.getElementsByTagName(\"head\");head[0].appendChild(script);}catch(e){document.write(\"<script type='text/javascript' src='\"+url+\"' charset=\\\"UTF-8\\\"><\"+\"/script>\");}};EA.Ä.add_lang=Ã(language,Ês){if(!È.eAL.lang[language])È.eAL.lang[language]={};for(var i in Ês)È.eAL.lang[language][i]=Ês[i];};Ã _$(id){return document.getElementById(id);};var eA=new EA();È.eAL.add_event(window,\"load\",init);Ã init(){setTimeout(\"eA.init();\",10);};	EA.Ä.focus=Ã(){Á.Â.focus();Á.ÂFocused=Ë;};EA.Ä.check_line_selection=Ã(timer_checkup){var changes,infos,new_top,new_width,i;var t1=t2=t2_1=t3=tLines=tend=new Date().getTime();if(!eAs[Á.id])return Ì;if(!Á.smooth_selection&&!Á.do_highlight){}\nelse if(Á.ÂFocused&&eAs[Á.id][\"displayed\"]==Ë&&Á.isResizing==Ì){infos=Á.get_selection_infos();changes=Á.checkTextEvolution(typeof(Á.É['full_text'])=='undefined' ? '':Á.É['full_text'],infos['full_text']);t2=new Date().getTime();if(Á.É[\"line_start\"] !=infos[\"line_start\"]||Á.É[\"line_nb\"] !=infos[\"line_nb\"]||infos[\"full_text\"] !=Á.É[\"full_text\"]||Á.reload_highlight||Á.É[\"selectionStart\"] !=infos[\"selectionStart\"]||Á.É[\"selectionEnd\"] !=infos[\"selectionEnd\"]||!timer_checkup){new_top=Á.getLinePosTop(infos[\"line_start\"]);new_width=Math.max(Á.Â.scrollWidth,Á.container.clientWidth-50);Á.selection_field.Ç.top=Á.selection_field_text.Ç.top=new_top+\"px\";if(!Á.Å['word_wrap']){Á.selection_field.Ç.width=Á.selection_field_text.Ç.width=Á.test_font_size.Ç.width=new_width+\"px\";}if(Á.do_highlight==Ë){var curr_text=infos[\"full_text\"].split(\"\\n\");var content=\"\";var start=Math.max(0,infos[\"line_start\"]-1);var end=Math.min(curr_text.Æ,infos[\"line_start\"]+infos[\"line_nb\"]-1);for(i=start;i< end;i++){content+=curr_text[i]+\"\\n\";}selLength=infos['selectionEnd']-infos['selectionStart'];content=content.substr(0,infos[\"curr_pos\"]-1)+\"\\r\\r\"+content.substr(infos[\"curr_pos\"]-1,selLength)+\"\\r\\r\"+content.substr(infos[\"curr_pos\"]-1+selLength);content='<span>'+content.replace(/&/g,\"&amp;\").replace(/</g,\"&lt;\").replace(/>/g,\"&gt;\").replace(\"\\r\\r\",'</span><strong>').replace(\"\\r\\r\",'</strong><span>')+'</span>';if(Á.isIE||(Á.isOpera&&Á.isOpera < 9.6)){Á.selection_field.innerHTML=\"<pre>\"+content.replace(/^\\r?\\n/,\"<br>\")+\"</pre>\";}\nelse{Á.selection_field.innerHTML=content;}Á.selection_field_text.innerHTML=Á.selection_field.innerHTML;t2_1=new Date().getTime();if(Á.reload_highlight||(infos[\"full_text\"] !=Á.last_text_to_highlight&&(Á.É[\"line_start\"]!=infos[\"line_start\"]||Á.show_line_colors||Á.Å['word_wrap']||Á.É[\"line_nb\"]!=infos[\"line_nb\"]||Á.É[\"nb_line\"]!=infos[\"nb_line\"]))){Á.maj_highlight(infos);}}}t3=new Date().getTime();if(Á.Å['word_wrap']&&infos[\"full_text\"] !=Á.É[\"full_text\"]){if(changes.newText.split(\"\\n\").Æ==1&&Á.É['nb_line']&&infos['nb_line']==Á.É['nb_line']){Á.fixLinesHeight(infos['full_text'],changes.lineStart,changes.lineStart);}\nelse{Á.fixLinesHeight(infos['full_text'],changes.lineStart,-1);}}tLines=new Date().getTime();if(infos[\"line_start\"] !=Á.É[\"line_start\"]||infos[\"curr_pos\"] !=Á.É[\"curr_pos\"]||infos[\"full_text\"].Æ!=Á.É[\"full_text\"].Æ||Á.reload_highlight||!timer_checkup){var selec_char=infos[\"curr_line\"].charAt(infos[\"curr_pos\"]-1);var no_real_move=Ë;if(infos[\"line_nb\"]==1&&(Á.assocBracket[selec_char]||Á.revertAssocBracket[selec_char])){no_real_move=Ì;if(Á.findEndBracket(infos,selec_char)===Ë){_$(\"end_bracket\").Ç.visibility=\"visible\";_$(\"cursor_pos\").Ç.visibility=\"visible\";_$(\"cursor_pos\").innerHTML=selec_char;_$(\"end_bracket\").innerHTML=(Á.assocBracket[selec_char]||Á.revertAssocBracket[selec_char]);}\nelse{_$(\"end_bracket\").Ç.visibility=\"hidden\";_$(\"cursor_pos\").Ç.visibility=\"hidden\";}}\nelse{_$(\"cursor_pos\").Ç.visibility=\"hidden\";_$(\"end_bracket\").Ç.visibility=\"hidden\";}Á.displayToCursorPosition(\"cursor_pos\",infos[\"line_start\"],infos[\"curr_pos\"]-1,infos[\"curr_line\"],no_real_move);if(infos[\"line_nb\"]==1&&infos[\"line_start\"]!=Á.É[\"line_start\"])Á.scroll_to_view();}Á.É=infos;}tend=new Date().getTime();if(timer_checkup){setTimeout(\"eA.check_line_selection(Ë)\",Á.check_line_selection_timer);}};EA.Ä.get_selection_infos=Ã(){var sel={},start,end,len,str;Á.getIESelection();start=Á.Â.selectionStart;end=Á.Â.selectionEnd;if(Á.É[\"selectionStart\"]==start&&Á.É[\"selectionEnd\"]==end&&Á.É[\"full_text\"]==Á.Â.Ê){return Á.É;}if(Á.tabulation!=\"\t\"&&Á.Â.Ê.indexOf(\"\t\")!=-1){len=Á.Â.Ê.Æ;Á.Â.Ê=Á.replace_tab(Á.Â.Ê);start=end=start+(Á.Â.Ê.Æ-len);Á.area_select(start,0);}sel[\"selectionStart\"]=start;sel[\"selectionEnd\"]=end;sel[\"full_text\"]=Á.Â.Ê;sel[\"line_start\"]=1;sel[\"line_nb\"]=1;sel[\"curr_pos\"]=0;sel[\"curr_line\"]=\"\";sel[\"indexOfCursor\"]=0;sel[\"selec_direction\"]=Á.É[\"selec_direction\"];var splitTab=sel[\"full_text\"].split(\"\\n\");var nbLine=Math.max(0,splitTab.Æ);var nbChar=Math.max(0,sel[\"full_text\"].Æ-(nbLine-1));if(sel[\"full_text\"].indexOf(\"\\r\")!=-1)nbChar=nbChar-(nbLine-1);sel[\"nb_line\"]=nbLine;sel[\"nb_char\"]=nbChar;if(start>0){str=sel[\"full_text\"].substr(0,start);sel[\"curr_pos\"]=start-str.lastIndexOf(\"\\n\");sel[\"line_start\"]=Math.max(1,str.split(\"\\n\").Æ);}\nelse{sel[\"curr_pos\"]=1;}if(end>start){sel[\"line_nb\"]=sel[\"full_text\"].substring(start,end).split(\"\\n\").Æ;}sel[\"indexOfCursor\"]=start;sel[\"curr_line\"]=splitTab[Math.max(0,sel[\"line_start\"]-1)];if(sel[\"selectionStart\"]==Á.É[\"selectionStart\"]){if(sel[\"selectionEnd\"]>Á.É[\"selectionEnd\"])sel[\"selec_direction\"]=\"down\";\nelse if(sel[\"selectionEnd\"]==Á.É[\"selectionStart\"])sel[\"selec_direction\"]=Á.É[\"selec_direction\"];}\nelse if(sel[\"selectionStart\"]==Á.É[\"selectionEnd\"]&&sel[\"selectionEnd\"]>Á.É[\"selectionEnd\"]){sel[\"selec_direction\"]=\"down\";}\nelse{sel[\"selec_direction\"]=\"up\";}_$(\"nbLine\").innerHTML=nbLine;_$(\"nbChar\").innerHTML=nbChar;_$(\"linePos\").innerHTML=sel[\"line_start\"];_$(\"currPos\").innerHTML=sel[\"curr_pos\"];return sel;};EA.Ä.getIESelection=Ã(){var selectionStart,selectionEnd,range,stored_range;if(!Á.isIE)return Ì;if(Á.Å['word_wrap'])Á.Â.wrap='off';try{range=document.selection.createRange();stored_range=range.duplicate();stored_range.moveToElementText(Á.Â);stored_range.setEndPoint('EndToEnd',range);if(stored_range.ÈElement()!=Á.Â)throw \"invalid focus\";var scrollTop=Á.result.scrollTop+document.body.scrollTop;var relative_top=range.offsetTop-È.calculeOffsetTop(Á.Â)+scrollTop;var line_start=Math.round((relative_top / Á.lineHeight)+1);var line_nb=Math.round(range.boundingHeight / Á.lineHeight);selectionStart=stored_range.text.Æ-range.text.Æ;selectionStart+=(line_start-Á.Â.Ê.substr(0,selectionStart).split(\"\\n\").Æ)*2;selectionStart-=(line_start-Á.Â.Ê.substr(0,selectionStart).split(\"\\n\").Æ)* 2;selectionEnd=selectionStart+range.text.Æ;selectionEnd+=(line_start+line_nb-1-Á.Â.Ê.substr(0,selectionEnd).split(\"\\n\").Æ)*2;Á.Â.selectionStart=selectionStart;Á.Â.selectionEnd=selectionEnd;}catch(e){}if(Á.Å['word_wrap'])Á.Â.wrap='soft';};EA.Ä.setIESelection=Ã(){var a=Á.Â,nbLineStart,nbLineEnd,range;if(!Á.isIE)return Ì;nbLineStart=a.Ê.substr(0,a.selectionStart).split(\"\\n\").Æ-1;nbLineEnd=a.Ê.substr(0,a.selectionEnd).split(\"\\n\").Æ-1;range=document.selection.createRange();range.moveToElementText(a);range.setEndPoint('EndToStart',range);range.moveStart('character',a.selectionStart-nbLineStart);range.moveEnd('character',a.selectionEnd-nbLineEnd-(a.selectionStart-nbLineStart));range.select();};EA.Ä.checkTextEvolution=Ã(lastText,newText){var ch={},baseStep=200,cpt=0,end,step,tStart=new Date().getTime();end=Math.min(newText.Æ,lastText.Æ);step=baseStep;while(cpt<end&&step>=1){if(lastText.substr(cpt,step)==newText.substr(cpt,step)){cpt+=step;}\nelse{step=Math.floor(step/2);}}ch.posStart=cpt;ch.lineStart=newText.substr(0,ch.posStart).split(\"\\n\").Æ-1;cpt_last=lastText.Æ;cpt=newText.Æ;step=baseStep;while(cpt>=0&&cpt_last>=0&&step>=1){if(lastText.substr(cpt_last-step,step)==newText.substr(cpt-step,step)){cpt-=step;cpt_last-=step;}\nelse{step=Math.floor(step/2);}}ch.posNewEnd=cpt;ch.posLastEnd=cpt_last;if(ch.posNewEnd<=ch.posStart){if(lastText.Æ < newText.Æ){ch.posNewEnd=ch.posStart+newText.Æ-lastText.Æ;ch.posLastEnd=ch.posStart;}\nelse{ch.posLastEnd=ch.posStart+lastText.Æ-newText.Æ;ch.posNewEnd=ch.posStart;}}ch.newText=newText.substring(ch.posStart,ch.posNewEnd);ch.lastText=lastText.substring(ch.posStart,ch.posLastEnd);ch.lineNewEnd=newText.substr(0,ch.posNewEnd).split(\"\\n\").Æ-1;ch.lineLastEnd=lastText.substr(0,ch.posLastEnd).split(\"\\n\").Æ-1;ch.newTextLine=newText.split(\"\\n\").slice(ch.lineStart,ch.lineNewEnd+1).join(\"\\n\");ch.lastTextLine=lastText.split(\"\\n\").slice(ch.lineStart,ch.lineLastEnd+1).join(\"\\n\");return ch;};EA.Ä.tab_selection=Ã(){if(Á.is_tabbing)return;Á.is_tabbing=Ë;Á.getIESelection();var start=Á.Â.selectionStart;var end=Á.Â.selectionEnd;var insText=Á.Â.Ê.substring(start,end);var pos_start=start;var pos_end=end;if(insText.Æ==0){Á.Â.Ê=Á.Â.Ê.substr(0,start)+Á.tabulation+Á.Â.Ê.substr(end);pos_start=start+Á.tabulation.Æ;pos_end=pos_start;}\nelse{start=Math.max(0,Á.Â.Ê.substr(0,start).lastIndexOf(\"\\n\")+1);endText=Á.Â.Ê.substr(end);startText=Á.Â.Ê.substr(0,start);tmp=Á.Â.Ê.substring(start,end).split(\"\\n\");insText=Á.tabulation+tmp.join(\"\\n\"+Á.tabulation);Á.Â.Ê=startText+insText+endText;pos_start=start;pos_end=Á.Â.Ê.indexOf(\"\\n\",startText.Æ+insText.Æ);if(pos_end==-1)pos_end=Á.Â.Ê.Æ;}Á.Â.selectionStart=pos_start;Á.Â.selectionEnd=pos_end;if(Á.isIE){Á.setIESelection();setTimeout(\"eA.is_tabbing=Ì;\",100);}\nelse{Á.is_tabbing=Ì;}};EA.Ä.invert_tab_selection=Ã(){var t=Á,a=Á.Â;if(t.is_tabbing)return;t.is_tabbing=Ë;t.getIESelection();var start=a.selectionStart;var end=a.selectionEnd;var insText=a.Ê.substring(start,end);var pos_start=start;var pos_end=end;if(insText.Æ==0){if(a.Ê.substring(start-t.tabulation.Æ,start)==t.tabulation){a.Ê=a.Ê.substr(0,start-t.tabulation.Æ)+a.Ê.substr(end);pos_start=Math.max(0,start-t.tabulation.Æ);pos_end=pos_start;}}\nelse{start=a.Ê.substr(0,start).lastIndexOf(\"\\n\")+1;endText=a.Ê.substr(end);startText=a.Ê.substr(0,start);tmp=a.Ê.substring(start,end).split(\"\\n\");insText=\"\";for(i=0;i<tmp.Æ;i++){for(j=0;j<t.tab_nb_char;j++){if(tmp[i].charAt(0)==\"\t\"){tmp[i]=tmp[i].substr(1);j=t.tab_nb_char;}\nelse if(tmp[i].charAt(0)==\" \")tmp[i]=tmp[i].substr(1);}insText+=tmp[i];if(i<tmp.Æ-1)insText+=\"\\n\";}a.Ê=startText+insText+endText;pos_start=start;pos_end=a.Ê.indexOf(\"\\n\",startText.Æ+insText.Æ);if(pos_end==-1)pos_end=a.Ê.Æ;}a.selectionStart=pos_start;a.selectionEnd=pos_end;if(t.isIE){t.setIESelection();setTimeout(\"eA.is_tabbing=Ì;\",100);}\nelse t.is_tabbing=Ì;};EA.Ä.press_enter=Ã(){if(!Á.smooth_selection)return Ì;Á.getIESelection();var scrollTop=Á.result.scrollTop;var scrollLeft=Á.result.scrollLeft;var start=Á.Â.selectionStart;var end=Á.Â.selectionEnd;var start_last_line=Math.max(0,Á.Â.Ê.substring(0,start).lastIndexOf(\"\\n\")+1);var begin_line=Á.Â.Ê.substring(start_last_line,start).replace(/^([ \t]*).*/gm,\"$1\");var lineStart=Á.Â.Ê.substring(0,start).split(\"\\n\").Æ;if(begin_line==\"\\n\"||begin_line==\"\\r\"||begin_line.Æ==0){return Ì;}if(Á.isIE||(Á.isOpera&&Á.isOpera < 9.6)){begin_line=\"\\r\\n\"+begin_line;}\nelse{begin_line=\"\\n\"+begin_line;}Á.Â.Ê=Á.Â.Ê.substring(0,start)+begin_line+Á.Â.Ê.substring(end);Á.area_select(start+begin_line.Æ,0);if(Á.isIE){Á.result.scrollTop=scrollTop;Á.result.scrollLeft=scrollLeft;}return Ë;};EA.Ä.findEndBracket=Ã(infos,bracket){var start=infos[\"indexOfCursor\"];var normal_order=Ë;if(Á.assocBracket[bracket])endBracket=Á.assocBracket[bracket];\nelse if(Á.revertAssocBracket[bracket]){endBracket=Á.revertAssocBracket[bracket];normal_order=Ì;}var end=-1;var nbBracketOpen=0;for(var i=start;i<infos[\"full_text\"].Æ&&i>=0;){if(infos[\"full_text\"].charAt(i)==endBracket){nbBracketOpen--;if(nbBracketOpen<=0){end=i;break;}}\nelse if(infos[\"full_text\"].charAt(i)==bracket)nbBracketOpen++;if(normal_order)i++;\nelse i--;}if(end==-1)return Ì;var endLastLine=infos[\"full_text\"].substr(0,end).lastIndexOf(\"\\n\");if(endLastLine==-1)line=1;\nelse line=infos[\"full_text\"].substr(0,endLastLine).split(\"\\n\").Æ+1;var curPos=end-endLastLine-1;var endLineLength=infos[\"full_text\"].substring(end).split(\"\\n\")[0].Æ;Á.displayToCursorPosition(\"end_bracket\",line,curPos,infos[\"full_text\"].substring(endLastLine+1,end+endLineLength));return Ë;};EA.Ä.displayToCursorPosition=Ã(id,start_line,cur_pos,lineContent,no_real_move){var elem,dest,content,posLeft=0,posTop,fixPadding,topOffset,endElem;elem=Á.test_font_size;dest=_$(id);content=\"<span id='test_font_size_inner'>\"+lineContent.substr(0,cur_pos).replace(/&/g,\"&amp;\").replace(/</g,\"&lt;\")+\"</span><span id='endTestFont'>\"+lineContent.substr(cur_pos).replace(/&/g,\"&amp;\").replace(/</g,\"&lt;\")+\"</span>\";if(Á.isIE||(Á.isOpera&&Á.isOpera < 9.6)){elem.innerHTML=\"<pre>\"+content.replace(/^\\r?\\n/,\"<br>\")+\"</pre>\";}\nelse{elem.innerHTML=content;}endElem=_$('endTestFont');topOffset=endElem.offsetTop;fixPadding=parseInt(Á.content_highlight.Ç.paddingLeft.replace(\"px\",\"\"));posLeft=45+endElem.offsetLeft+(!isNaN(fixPadding)&&topOffset > 0 ? fixPadding:0);posTop=Á.getLinePosTop(start_line)+topOffset;if(Á.isIE&&cur_pos > 0&&endElem.offsetLeft==0){posTop+=Á.lineHeight;}if(no_real_move!=Ë){dest.Ç.top=posTop+\"px\";dest.Ç.left=posLeft+\"px\";}dest.cursor_top=posTop;dest.cursor_left=posLeft;};EA.Ä.getLinePosTop=Ã(start_line){var elem=_$('line_'+start_line),posTop=0;if(elem)posTop=elem.offsetTop;\nelse posTop=Á.lineHeight *(start_line-1);return posTop;};EA.Ä.getTextHeight=Ã(text){var t=Á,elem,height;elem=t.test_font_size;content=text.replace(/&/g,\"&amp;\").replace(/</g,\"&lt;\");if(t.isIE||(Á.isOpera&&Á.isOpera < 9.6)){elem.innerHTML=\"<pre>\"+content.replace(/^\\r?\\n/,\"<br>\")+\"</pre>\";}\nelse{elem.innerHTML=content;}height=elem.offsetHeight;height=Math.max(1,Math.floor(elem.offsetHeight / Á.lineHeight))* Á.lineHeight;return height;};EA.Ä.fixLinesHeight=Ã(textValue,lineStart,lineEnd){var aText=textValue.split(\"\\n\");if(lineEnd==-1)lineEnd=aText.Æ-1;for(var i=Math.max(0,lineStart);i <=lineEnd;i++){if(elem=_$('line_'+(i+1))){elem.Ç.height=typeof(aText[i])!=\"undefined\" ? Á.getTextHeight(aText[i])+\"px\":Á.lineHeight;}}};EA.Ä.area_select=Ã(start,Æ){Á.Â.focus();start=Math.max(0,Math.min(Á.Â.Ê.Æ,start));end=Math.max(start,Math.min(Á.Â.Ê.Æ,start+Æ));if(Á.isIE){Á.Â.selectionStart=start;Á.Â.selectionEnd=end;Á.setIESelection();}\nelse{if(Á.isOpera&&Á.isOpera < 9.6){Á.Â.setSelectionRange(0,0);}Á.Â.setSelectionRange(start,end);}Á.check_line_selection();};EA.Ä.area_get_selection=Ã(){var text=\"\";if(document.selection){var range=document.selection.createRange();text=range.text;}\nelse{text=Á.Â.Ê.substring(Á.Â.selectionStart,Á.Â.selectionEnd);}return text;}; EA.Ä.replace_tab=Ã(text){return text.replace(/((\\n?)([^\t\\n]*)\t)/gi,eA.smartTab);};EA.Ä.smartTab=Ã(){val=\"                   \";return EA.Ä.smartTab.arguments[2]+EA.Ä.smartTab.arguments[3]+val.substr(0,eA.tab_nb_char-(EA.Ä.smartTab.arguments[3].Æ)%eA.tab_nb_char);};EA.Ä.show_waiting_screen=Ã(){width=Á.editor_area.offsetWidth;height=Á.editor_area.offsetHeight;if(!(Á.isIE&&Á.isIE<6)){width-=2;height-=2;}Á.processing_screen.Ç.display=\"block\";Á.processing_screen.Ç.width=width+\"px\";Á.processing_screen.Ç.height=height+\"px\";Á.waiting_screen_displayed=Ë;};EA.Ä.hide_waiting_screen=Ã(){Á.processing_screen.Ç.display=\"none\";Á.waiting_screen_displayed=Ì;};EA.Ä.add_Ç=Ã(Çs){if(Çs.Æ>0){newcss=document.createElement(\"Ç\");newcss.type=\"text/css\";newcss.media=\"all\";if(newcss.ÇSheet){newcss.ÇSheet.cssText=Çs;}\nelse{newcss.appendChild(document.createTextNode(Çs));}document.getElementsByTagName(\"head\")[0].appendChild(newcss);}};EA.Ä.set_font=Ã(family,size){var t=Á,a=Á.Â,s=Á.Å,elem_font,i,elem;var elems=[\"Â\",\"content_highlight\",\"cursor_pos\",\"end_bracket\",\"selection_field\",\"selection_field_text\",\"line_number\"];if(family&&family!=\"\")s[\"font_family\"]=family;if(size&&size>0)s[\"font_size\"]=size;if(t.isOpera&&t.isOpera < 9.6)s['font_family']=\"monospace\";if(elem_font=_$(\"area_font_size\")){for(i=0;i < elem_font.Æ;i++){if(elem_font.options[i].Ê&&elem_font.options[i].Ê==s[\"font_size\"])elem_font.options[i].selected=Ë;}}if(t.isFirefox){var nbTry=3;do{var div1=document.createElement('div'),text1=document.createElement('Â');var Çs={width:'40px',overflow:'scroll',zIndex:50,visibility:'hidden',fontFamily:s[\"font_family\"],fontSize:s[\"font_size\"]+\"pt\",lineHeight:t.lineHeight+\"px\",padding:'0',margin:'0',border:'none',whiteSpace:'nowrap'};var diff,changed=Ì;for(i in Çs){div1.Ç[ i ]=Çs[i];text1.Ç[ i ]=Çs[i];}text1.wrap='off';text1.setAttribute('wrap','off');t.container.appendChild(div1);t.container.appendChild(text1);div1.innerHTML=text1.Ê='azertyuiopqsdfghjklm';div1.innerHTML=text1.Ê=text1.Ê+'wxcvbn^p*ù$!:;,,';diff=text1.scrollWidth-div1.scrollWidth;if(Math.abs(diff)>=2){s[\"font_size\"]++;changed=Ë;}t.container.removeChild(div1);t.container.removeChild(text1);nbTry--;}while(changed&&nbTry > 0);}elem=t.test_font_size;elem.Ç.fontFamily=\"\"+s[\"font_family\"];elem.Ç.fontSize=s[\"font_size\"]+\"pt\";elem.innerHTML=\"0\";t.lineHeight=elem.offsetHeight;for(i=0;i<elems.Æ;i++){elem=_$(elems[i]);elem.Ç.fontFamily=s[\"font_family\"];elem.Ç.fontSize=s[\"font_size\"]+\"pt\";elem.Ç.lineHeight=t.lineHeight+\"px\";}t.add_Ç(\"pre{font-family:\"+s[\"font_family\"]+\"}\");if((t.isOpera&&t.isOpera < 9.6)||t.isIE >=8){var parNod=a.ÈNode,nxtSib=a.nextSibling,start=a.selectionStart,end=a.selectionEnd;parNod.removeChild(a);parNod.insertBefore(a,nxtSib);t.area_select(start,end-start);}Á.focus();Á.update_size();Á.check_line_selection();};EA.Ä.change_font_size=Ã(){var size=_$(\"area_font_size\").Ê;if(size>0)Á.set_font(\"\",size);};EA.Ä.open_inline_popup=Ã(popup_id){Á.close_all_inline_popup();var popup=_$(popup_id);var editor=_$(\"editor\");for(var i=0;i<Á.inlinePopup.Æ;i++){if(Á.inlinePopup[i][\"popup_id\"]==popup_id){var icon=_$(Á.inlinePopup[i][\"icon_id\"]);if(icon){Á.switchClassSticky(icon,'editAreaButtonSelected',Ë);break;}}}popup.Ç.height=\"auto\";popup.Ç.overflow=\"visible\";if(document.body.offsetHeight< popup.offsetHeight){popup.Ç.height=(document.body.offsetHeight-10)+\"px\";popup.Ç.overflow=\"auto\";}if(!popup.positionned){var new_left=editor.offsetWidth /2-popup.offsetWidth /2;var new_top=editor.offsetHeight /2-popup.offsetHeight /2;popup.Ç.left=new_left+\"px\";popup.Ç.top=new_top+\"px\";popup.positionned=Ë;}popup.Ç.visibility=\"visible\";};EA.Ä.close_inline_popup=Ã(popup_id){var popup=_$(popup_id);for(var i=0;i<Á.inlinePopup.Æ;i++){if(Á.inlinePopup[i][\"popup_id\"]==popup_id){var icon=_$(Á.inlinePopup[i][\"icon_id\"]);if(icon){Á.switchClassSticky(icon,'editAreaButtonNormal',Ì);break;}}}popup.Ç.visibility=\"hidden\";};EA.Ä.close_all_inline_popup=Ã(e){for(var i=0;i<Á.inlinePopup.Æ;i++){Á.close_inline_popup(Á.inlinePopup[i][\"popup_id\"]);}Á.Â.focus();};EA.Ä.show_help=Ã(){Á.open_inline_popup(\"edit_area_help\");};EA.Ä.new_document=Ã(){Á.Â.Ê=\"\";Á.area_select(0,0);};EA.Ä.get_all_toolbar_height=Ã(){var area=_$(\"editor\");var results=È.getChildren(area,\"div\",\"class\",\"area_toolbar\",\"all\",\"0\");var height=0;for(var i=0;i<results.Æ;i++){height+=results[i].offsetHeight;}return height;};EA.Ä.go_to_line=Ã(line){if(!line){var icon=_$(\"go_to_line\");if(icon !=null){Á.restoreClass(icon);Á.switchClassSticky(icon,'editAreaButtonSelected',Ë);}line=prompt(Á.get_translation(\"go_to_line_prompt\"));if(icon !=null)Á.switchClassSticky(icon,'editAreaButtonNormal',Ì);}if(line&&line!=null&&line.search(/^[0-9]+$/)!=-1){var start=0;var lines=Á.Â.Ê.split(\"\\n\");if(line > lines.Æ)start=Á.Â.Ê.Æ;\nelse{for(var i=0;i<Math.min(line-1,lines.Æ);i++)start+=lines[i].Æ+1;}Á.area_select(start,0);}};EA.Ä.change_smooth_selection_mode=Ã(setTo){if(Á.do_highlight)return;if(setTo !=null){if(setTo===Ì)Á.smooth_selection=Ë;\nelse Á.smooth_selection=Ì;}var icon=_$(\"change_smooth_selection\");Á.Â.focus();if(Á.smooth_selection===Ë){Á.switchClassSticky(icon,'editAreaButtonNormal',Ì);Á.smooth_selection=Ì;Á.selection_field.Ç.display=\"none\";_$(\"cursor_pos\").Ç.display=\"none\";_$(\"end_bracket\").Ç.display=\"none\";}\nelse{Á.switchClassSticky(icon,'editAreaButtonSelected',Ì);Á.smooth_selection=Ë;Á.selection_field.Ç.display=\"block\";_$(\"cursor_pos\").Ç.display=\"block\";_$(\"end_bracket\").Ç.display=\"block\";}};EA.Ä.scroll_to_view=Ã(show){var zone,lineElem;if(!Á.smooth_selection)return;zone=_$(\"result\");var cursor_pos_top=_$(\"cursor_pos\").cursor_top;if(show==\"bottom\"){cursor_pos_top+=Á.getLinePosTop(Á.É['line_start']+Á.É['line_nb']-1);}var max_height_visible=zone.clientHeight+zone.scrollTop;var miss_top=cursor_pos_top+Á.lineHeight-max_height_visible;if(miss_top>0){zone.scrollTop=zone.scrollTop+miss_top;}\nelse if(zone.scrollTop > cursor_pos_top){zone.scrollTop=cursor_pos_top;}var cursor_pos_left=_$(\"cursor_pos\").cursor_left;var max_width_visible=zone.clientWidth+zone.scrollLeft;var miss_left=cursor_pos_left+10-max_width_visible;if(miss_left>0){zone.scrollLeft=zone.scrollLeft+miss_left+50;}\nelse if(zone.scrollLeft > cursor_pos_left){zone.scrollLeft=cursor_pos_left;}\nelse if(zone.scrollLeft==45){zone.scrollLeft=0;}};EA.Ä.check_undo=Ã(only_once){if(!eAs[Á.id])return Ì;if(Á.ÂFocused&&eAs[Á.id][\"displayed\"]==Ë){var text=Á.Â.Ê;if(Á.previous.Æ<=1)Á.switchClassSticky(_$(\"undo\"),'editAreaButtonDisabled',Ë);if(!Á.previous[Á.previous.Æ-1]||Á.previous[Á.previous.Æ-1][\"text\"] !=text){Á.previous.push({\"text\":text,\"selStart\":Á.Â.selectionStart,\"selEnd\":Á.Â.selectionEnd});if(Á.previous.Æ > Á.Å[\"max_undo\"]+1)Á.previous.shift();}if(Á.previous.Æ >=2)Á.switchClassSticky(_$(\"undo\"),'editAreaButtonNormal',Ì);}if(!only_once)setTimeout(\"eA.check_undo()\",3000);};EA.Ä.undo=Ã(){if(Á.previous.Æ > 0){Á.getIESelection();Á.next.push({\"text\":Á.Â.Ê,\"selStart\":Á.Â.selectionStart,\"selEnd\":Á.Â.selectionEnd});var prev=Á.previous.pop();if(prev[\"text\"]==Á.Â.Ê&&Á.previous.Æ > 0)prev=Á.previous.pop();Á.Â.Ê=prev[\"text\"];Á.last_undo=prev[\"text\"];Á.area_select(prev[\"selStart\"],prev[\"selEnd\"]-prev[\"selStart\"]);Á.switchClassSticky(_$(\"redo\"),'editAreaButtonNormal',Ì);Á.resync_highlight(Ë);Á.check_file_changes();}};EA.Ä.redo=Ã(){if(Á.next.Æ > 0){var next=Á.next.pop();Á.previous.push(next);Á.Â.Ê=next[\"text\"];Á.last_undo=next[\"text\"];Á.area_select(next[\"selStart\"],next[\"selEnd\"]-next[\"selStart\"]);Á.switchClassSticky(_$(\"undo\"),'editAreaButtonNormal',Ì);Á.resync_highlight(Ë);Á.check_file_changes();}if(Á.next.Æ==0)Á.switchClassSticky(_$(\"redo\"),'editAreaButtonDisabled',Ë);};EA.Ä.check_redo=Ã(){if(eA.next.Æ==0||eA.Â.Ê!=eA.last_undo){eA.next=[];eA.switchClassSticky(_$(\"redo\"),'editAreaButtonDisabled',Ë);}\nelse{Á.switchClassSticky(_$(\"redo\"),'editAreaButtonNormal',Ì);}};EA.Ä.switchClass=Ã(element,class_name,lock_state){var lockChanged=Ì;if(typeof(lock_state)!=\"undefined\"&&element !=null){element.classLock=lock_state;lockChanged=Ë;}if(element !=null&&(lockChanged||!element.classLock)){element.oldClassName=element.className;element.className=class_name;}};EA.Ä.restoreAndSwitchClass=Ã(element,class_name){if(element !=null&&!element.classLock){Á.restoreClass(element);Á.switchClass(element,class_name);}};EA.Ä.restoreClass=Ã(element){if(element !=null&&element.oldClassName&&!element.classLock){element.className=element.oldClassName;element.oldClassName=null;}};EA.Ä.setClassLock=Ã(element,lock_state){if(element !=null)element.classLock=lock_state;};EA.Ä.switchClassSticky=Ã(element,class_name,lock_state){var lockChanged=Ì;if(typeof(lock_state)!=\"undefined\"&&element !=null){element.classLock=lock_state;lockChanged=Ë;}if(element !=null&&(lockChanged||!element.classLock)){element.className=class_name;element.oldClassName=class_name;}};EA.Ä.scroll_page=Ã(params){var dir=params[\"dir\"],shift_pressed=params[\"shift\"];var lines=Á.Â.Ê.split(\"\\n\");var new_pos=0,Æ=0,char_left=0,line_nb=0,curLine=0;var toScrollAmount=_$(\"result\").clientHeight-30;var nbLineToScroll=0,diff=0;if(dir==\"up\"){nbLineToScroll=Math.ceil(toScrollAmount / Á.lineHeight);for(i=Á.É[\"line_start\"];i-diff > Á.É[\"line_start\"]-nbLineToScroll;i--){if(elem=_$('line_'+i)){diff+=Math.floor((elem.offsetHeight-1)/ Á.lineHeight);}}nbLineToScroll-=diff;if(Á.É[\"selec_direction\"]==\"up\"){for(line_nb=0;line_nb< Math.min(Á.É[\"line_start\"]-nbLineToScroll,lines.Æ);line_nb++){new_pos+=lines[line_nb].Æ+1;}char_left=Math.min(lines[Math.min(lines.Æ-1,line_nb)].Æ,Á.É[\"curr_pos\"]-1);if(shift_pressed)Æ=Á.É[\"selectionEnd\"]-new_pos-char_left;Á.area_select(new_pos+char_left,Æ);view=\"top\";}\nelse{view=\"bottom\";for(line_nb=0;line_nb< Math.min(Á.É[\"line_start\"]+Á.É[\"line_nb\"]-1-nbLineToScroll,lines.Æ);line_nb++){new_pos+=lines[line_nb].Æ+1;}char_left=Math.min(lines[Math.min(lines.Æ-1,line_nb)].Æ,Á.É[\"curr_pos\"]-1);if(shift_pressed){start=Math.min(Á.É[\"selectionStart\"],new_pos+char_left);Æ=Math.max(new_pos+char_left,Á.É[\"selectionStart\"])-start;if(new_pos+char_left < Á.É[\"selectionStart\"])view=\"top\";}\nelse start=new_pos+char_left;Á.area_select(start,Æ);}}\nelse{var nbLineToScroll=Math.floor(toScrollAmount / Á.lineHeight);for(i=Á.É[\"line_start\"];i+diff < Á.É[\"line_start\"]+nbLineToScroll;i++){if(elem=_$('line_'+i)){diff+=Math.floor((elem.offsetHeight-1)/ Á.lineHeight);}}nbLineToScroll-=diff;if(Á.É[\"selec_direction\"]==\"down\"){view=\"bottom\";for(line_nb=0;line_nb< Math.min(Á.É[\"line_start\"]+Á.É[\"line_nb\"]-2+nbLineToScroll,lines.Æ);line_nb++){if(line_nb==Á.É[\"line_start\"]-1)char_left=Á.É[\"selectionStart\"]-new_pos;new_pos+=lines[line_nb].Æ+1;}if(shift_pressed){Æ=Math.abs(Á.É[\"selectionStart\"]-new_pos);Æ+=Math.min(lines[Math.min(lines.Æ-1,line_nb)].Æ,Á.É[\"curr_pos\"]);Á.area_select(Math.min(Á.É[\"selectionStart\"],new_pos),Æ);}\nelse{Á.area_select(new_pos+char_left,0);}}\nelse{view=\"top\";for(line_nb=0;line_nb< Math.min(Á.É[\"line_start\"]+nbLineToScroll-1,lines.Æ,lines.Æ);line_nb++){if(line_nb==Á.É[\"line_start\"]-1)char_left=Á.É[\"selectionStart\"]-new_pos;new_pos+=lines[line_nb].Æ+1;}if(shift_pressed){Æ=Math.abs(Á.É[\"selectionEnd\"]-new_pos-char_left);Æ+=Math.min(lines[Math.min(lines.Æ-1,line_nb)].Æ,Á.É[\"curr_pos\"])-char_left-1;Á.area_select(Math.min(Á.É[\"selectionEnd\"],new_pos+char_left),Æ);if(new_pos+char_left > Á.É[\"selectionEnd\"])view=\"bottom\";}\nelse{Á.area_select(new_pos+char_left,0);}}}Á.check_line_selection();Á.scroll_to_view(view);};EA.Ä.start_resize=Ã(e){È.eAL.resize[\"id\"]=eA.id;È.eAL.resize[\"start_x\"]=(e)? e.pageX:event.x+document.body.scrollLeft;È.eAL.resize[\"start_y\"]=(e)? e.pageY:event.y+document.body.scrollTop;if(eA.isIE){eA.Â.focus();eA.getIESelection();}È.eAL.resize[\"selectionStart\"]=eA.Â.selectionStart;È.eAL.resize[\"selectionEnd\"]=eA.Â.selectionEnd;È.eAL.start_resize_area();};EA.Ä.toggle_full_screen=Ã(to){var t=Á,p=È,a=t.Â,html,frame,selStart,selEnd,old,icon;if(typeof(to)==\"undefined\")to=!t.fullscreen['isFull'];old=t.fullscreen['isFull'];t.fullscreen['isFull']=to;icon=_$(\"fullscreen\");selStart=t.Â.selectionStart;selEnd=t.Â.selectionEnd;html=p.document.getElementsByTagName(\"html\")[0];frame=p.document.getElementById(\"frame_\"+t.id);if(to&&to!=old){t.fullscreen['old_overflow']=p.get_css_property(html,\"overflow\");t.fullscreen['old_height']=p.get_css_property(html,\"height\");t.fullscreen['old_width']=p.get_css_property(html,\"width\");t.fullscreen['old_scrollTop']=html.scrollTop;t.fullscreen['old_scrollLeft']=html.scrollLeft;t.fullscreen['old_zIndex']=p.get_css_property(frame,\"z-index\");if(t.isOpera){html.Ç.height=\"100%\";html.Ç.width=\"100%\";}html.Ç.overflow=\"hidden\";html.scrollTop=0;html.scrollLeft=0;frame.Ç.position=\"absolute\";frame.Ç.width=html.clientWidth+\"px\";frame.Ç.height=html.clientHeight+\"px\";frame.Ç.display=\"block\";frame.Ç.zIndex=\"999999\";frame.Ç.top=\"0px\";frame.Ç.left=\"0px\";frame.Ç.top=\"-\"+p.calculeOffsetTop(frame)+\"px\";frame.Ç.left=\"-\"+p.calculeOffsetLeft(frame)+\"px\";t.switchClassSticky(icon,'editAreaButtonSelected',Ì);t.fullscreen['allow_resize']=t.resize_allowed;t.allow_resize(Ì);if(t.isFirefox){p.eAL.execCommand(t.id,\"update_size();\");t.area_select(selStart,selEnd-selStart);t.scroll_to_view();t.focus();}\nelse{setTimeout(\"È.eAL.execCommand('\"+t.id+\"','update_size();');eA.focus();\",10);}}\nelse if(to!=old){frame.Ç.position=\"static\";frame.Ç.zIndex=t.fullscreen['old_zIndex'];if(t.isOpera){html.Ç.height=\"auto\";html.Ç.width=\"auto\";html.Ç.overflow=\"auto\";}\nelse if(t.isIE&&p!=top){html.Ç.overflow=\"auto\";}\nelse{html.Ç.overflow=t.fullscreen['old_overflow'];}html.scrollTop=t.fullscreen['old_scrollTop'];html.scrollLeft=t.fullscreen['old_scrollLeft'];p.eAL.hide(t.id);p.eAL.show(t.id);t.switchClassSticky(icon,'editAreaButtonNormal',Ì);if(t.fullscreen['allow_resize'])t.allow_resize(t.fullscreen['allow_resize']);if(t.isFirefox){t.area_select(selStart,selEnd-selStart);setTimeout(\"eA.scroll_to_view();\",10);}}};EA.Ä.allow_resize=Ã(allow){var resize=_$(\"resize_area\");if(allow){resize.Ç.visibility=\"visible\";È.eAL.add_event(resize,\"mouseup\",eA.start_resize);}\nelse{resize.Ç.visibility=\"hidden\";È.eAL.remove_event(resize,\"mouseup\",eA.start_resize);}Á.resize_allowed=allow;};EA.Ä.change_syntax=Ã(new_syntax,is_waiting){if(new_syntax==Á.Å['syntax'])return Ë;var founded=Ì;for(var i=0;i<Á.syntax_list.Æ;i++){if(Á.syntax_list[i]==new_syntax)founded=Ë;}if(founded==Ë){if(!È.eAL.load_syntax[new_syntax]){if(!is_waiting)È.eAL.load_script(È.eAL.baseURL+\"reg_syntax/\"+new_syntax+\".js\");setTimeout(\"eA.change_syntax('\"+new_syntax+\"',Ë);\",100);Á.show_waiting_screen();}\nelse{if(!Á.allready_used_syntax[new_syntax]){È.eAL.init_syntax_regexp();Á.add_Ç(È.eAL.syntax[new_syntax][\"Çs\"]);Á.allready_used_syntax[new_syntax]=Ë;}var sel=_$(\"syntax_selection\");if(sel&&sel.Ê!=new_syntax){for(var i=0;i<sel.Æ;i++){if(sel.options[i].Ê&&sel.options[i].Ê==new_syntax)sel.options[i].selected=Ë;}}Á.Å['syntax']=new_syntax;Á.resync_highlight(Ë);Á.hide_waiting_screen();return Ë;}}return Ì;};EA.Ä.set_editable=Ã(is_editable){if(is_editable){document.body.className=\"\";Á.Â.readOnly=Ì;Á.is_editable=Ë;}\nelse{document.body.className=\"non_editable\";Á.Â.readOnly=Ë;Á.is_editable=Ì;}if(eAs[Á.id][\"displayed\"]==Ë)Á.update_size();};EA.Ä.toggle_word_wrap=Ã(){Á.set_word_wrap(!Á.Å['word_wrap']);};EA.Ä.set_word_wrap=Ã(to){var t=Á,a=t.Â;if(t.isOpera&&t.isOpera < 9.8){Á.Å['word_wrap']=Ì;t.switchClassSticky(_$(\"word_wrap\"),'editAreaButtonDisabled',Ë);return Ì;}if(to){wrap_mode='soft';Á.container.className+=' word_wrap';Á.container.Ç.width=\"\";Á.content_highlight.Ç.width=\"\";a.Ç.width=\"100%\";if(t.isIE&&t.isIE < 7){a.Ç.width=(a.offsetWidth-5)+\"px\";}t.switchClassSticky(_$(\"word_wrap\"),'editAreaButtonSelected',Ì);}\nelse{wrap_mode='off';Á.container.className=Á.container.className.replace(/word_wrap/g,'');t.switchClassSticky(_$(\"word_wrap\"),'editAreaButtonNormal',Ë);}Á.Â.previous_scrollWidth='';Á.Â.previous_scrollHeight='';a.wrap=wrap_mode;a.setAttribute('wrap',wrap_mode);if(!Á.isIE){var start=a.selectionStart,end=a.selectionEnd;var parNod=a.ÈNode,nxtSib=a.nextSibling;parNod.removeChild(a);parNod.insertBefore(a,nxtSib);Á.area_select(start,end-start);}Á.Å['word_wrap']=to;Á.focus();Á.update_size();Á.check_line_selection();};EA.Ä.open_file=Ã(Å){if(Å['id']!=\"undefined\"){var id=Å['id'];var new_file={};new_file['id']=id;new_file['title']=id;new_file['text']=\"\";new_file['É']=\"\";new_file['last_text_to_highlight']=\"\";new_file['last_hightlighted_text']=\"\";new_file['previous']=[];new_file['next']=[];new_file['last_undo']=\"\";new_file['smooth_selection']=Á.Å['smooth_selection'];new_file['do_highlight']=Á.Å['start_highlight'];new_file['syntax']=Á.Å['syntax'];new_file['scroll_top']=0;new_file['scroll_left']=0;new_file['selection_start']=0;new_file['selection_end']=0;new_file['edited']=Ì;new_file['font_size']=Á.Å[\"font_size\"];new_file['font_family']=Á.Å[\"font_family\"];new_file['word_wrap']=Á.Å[\"word_wrap\"];new_file['toolbar']={'links':{},'selects':{}};new_file['compare_edited_text']=new_file['text'];Á.files[id]=new_file;Á.update_file(id,Å);Á.files[id]['compare_edited_text']=Á.files[id]['text'];var html_id='tab_file_'+encodeURIComponent(id);Á.filesIdAssoc[html_id]=id;Á.files[id]['html_id']=html_id;if(!_$(Á.files[id]['html_id'])&&id!=\"\"){Á.tab_browsing_area.Ç.display=\"block\";var elem=document.createElement('li');elem.id=Á.files[id]['html_id'];var close=\"<img src=\\\"\"+È.eAL.baseURL+\"images/close.gif\\\" title=\\\"\"+Á.get_translation('close_tab','word')+\"\\\" onclick=\\\"eA.execCommand('close_file',eA.filesIdAssoc['\"+html_id+\"']);return Ì;\\\" class=\\\"hidden\\\" onmouseover=\\\"Á.className=''\\\" onmouseout=\\\"Á.className='hidden'\\\" />\";elem.innerHTML=\"<a onclick=\\\"javascript:eA.execCommand('switch_to_file',eA.filesIdAssoc['\"+html_id+\"']);\\\" selec=\\\"none\\\"><b><span><strong class=\\\"edited\\\">*</strong>\"+Á.files[id]['title']+close+\"</span></b></a>\";_$('tab_browsing_list').appendChild(elem);var elem=document.createElement('text');Á.update_size();}if(id!=\"\")Á.execCommand('file_open',Á.files[id]);Á.switch_to_file(id,Ë);return Ë;}\nelse return Ì;};EA.Ä.close_file=Ã(id){if(Á.files[id]){Á.save_file(id);if(Á.execCommand('file_close',Á.files[id])!==Ì){var li=_$(Á.files[id]['html_id']);li.ÈNode.removeChild(li);if(id==Á.curr_file){var next_file=\"\";var is_next=Ì;for(var i in Á.files){if(is_next){next_file=i;break;}\nelse if(i==id)is_next=Ë;\nelse next_file=i;}Á.switch_to_file(next_file);}delete(Á.files[id]);Á.update_size();}}};EA.Ä.save_file=Ã(id){var t=Á,save,a_links,a_selects,save_butt,img,i;if(t.files[id]){var save=t.files[id];save['É']=t.É;save['last_text_to_highlight']=t.last_text_to_highlight;save['last_hightlighted_text']=t.last_hightlighted_text;save['previous']=t.previous;save['next']=t.next;save['last_undo']=t.last_undo;save['smooth_selection']=t.smooth_selection;save['do_highlight']=t.do_highlight;save['syntax']=t.Å['syntax'];save['text']=t.Â.Ê;save['scroll_top']=t.result.scrollTop;save['scroll_left']=t.result.scrollLeft;save['selection_start']=t.É[\"selectionStart\"];save['selection_end']=t.É[\"selectionEnd\"];save['font_size']=t.Å[\"font_size\"];save['font_family']=t.Å[\"font_family\"];save['word_wrap']=t.Å[\"word_wrap\"];save['toolbar']={'links':{},'selects':{}};a_links=_$(\"toolbar_1\").getElementsByTagName(\"a\");for(i=0;i<a_links.Æ;i++){if(a_links[i].getAttribute('fileSpecific')=='yes'){save_butt={};img=a_links[i].getElementsByTagName('img')[0];save_butt['classLock']=img.classLock;save_butt['className']=img.className;save_butt['oldClassName']=img.oldClassName;save['toolbar']['links'][a_links[i].id]=save_butt;}}a_selects=_$(\"toolbar_1\").getElementsByTagName(\"select\");for(i=0;i<a_selects.Æ;i++){if(a_selects[i].getAttribute('fileSpecific')=='yes'){save['toolbar']['selects'][a_selects[i].id]=a_selects[i].Ê;}}t.files[id]=save;return save;}return Ì;};EA.Ä.update_file=Ã(id,new_Ês){for(var i in new_Ês){Á.files[id][i]=new_Ês[i];}};EA.Ä.display_file=Ã(id){var t=Á,a=t.Â,new_file,a_lis,a_selects,a_links,a_options,i,j;if(id==''){a.readOnly=Ë;t.tab_browsing_area.Ç.display=\"none\";_$(\"no_file_selected\").Ç.display=\"block\";t.result.className=\"empty\";if(!t.files['']){t.open_file({id:''});}}\nelse if(typeof(t.files[id])=='undefined'){return Ì;}\nelse{t.result.className=\"\";a.readOnly=!t.is_editable;_$(\"no_file_selected\").Ç.display=\"none\";t.tab_browsing_area.Ç.display=\"block\";}t.check_redo(Ë);t.check_undo(Ë);t.curr_file=id;a_lis=t.tab_browsing_area.getElementsByTagName('li');for(i=0;i<a_lis.Æ;i++){if(a_lis[i].id==t.files[id]['html_id'])a_lis[i].className='selected';\nelse a_lis[i].className='';}new_file=t.files[id];a.Ê=new_file['text'];t.set_font(new_file['font_family'],new_file['font_size']);t.area_select(new_file['selection_start'],new_file['selection_end']-new_file['selection_start']);t.manage_size(Ë);t.result.scrollTop=new_file['scroll_top'];t.result.scrollLeft=new_file['scroll_left'];t.previous=new_file['previous'];t.next=new_file['next'];t.last_undo=new_file['last_undo'];t.check_redo(Ë);t.check_undo(Ë);t.execCommand(\"change_highlight\",new_file['do_highlight']);t.execCommand(\"change_syntax\",new_file['syntax']);t.execCommand(\"change_smooth_selection_mode\",new_file['smooth_selection']);t.execCommand(\"set_word_wrap\",new_file['word_wrap']);a_links=new_file['toolbar']['links'];for(i in a_links){if(img=_$(i).getElementsByTagName('img')[0]){img.classLock=a_links[i]['classLock'];img.className=a_links[i]['className'];img.oldClassName=a_links[i]['oldClassName'];}}a_selects=new_file['toolbar']['selects'];for(i in a_selects){a_options=_$(i).options;for(j=0;j<a_options.Æ;j++){if(a_options[j].Ê==a_selects[i])_$(i).options[j].selected=Ë;}}};EA.Ä.switch_to_file=Ã(file_to_show,force_refresh){if(file_to_show!=Á.curr_file||force_refresh){Á.save_file(Á.curr_file);if(Á.curr_file!='')Á.execCommand('file_switch_off',Á.files[Á.curr_file]);Á.display_file(file_to_show);if(file_to_show!='')Á.execCommand('file_switch_on',Á.files[file_to_show]);}};EA.Ä.get_file=Ã(id){if(id==Á.curr_file)Á.save_file(id);return Á.files[id];};EA.Ä.get_all_files=Ã(){tmp_files=Á.files;Á.save_file(Á.curr_file);if(tmp_files[''])delete(Á.files['']);return tmp_files;};EA.Ä.check_file_changes=Ã(){var id=Á.curr_file;if(Á.files[id]&&Á.files[id]['compare_edited_text']!=undefined){if(Á.files[id]['compare_edited_text'].Æ==Á.Â.Ê.Æ&&Á.files[id]['compare_edited_text']==Á.Â.Ê){if(Á.files[id]['edited']!=Ì)Á.set_file_edited_mode(id,Ì);}\nelse{if(Á.files[id]['edited']!=Ë)Á.set_file_edited_mode(id,Ë);}}};EA.Ä.set_file_edited_mode=Ã(id,to){if(Á.files[id]&&_$(Á.files[id]['html_id'])){var link=_$(Á.files[id]['html_id']).getElementsByTagName('a')[0];if(to==Ë){link.className='edited';}\nelse{link.className='';if(id==Á.curr_file)text=Á.Â.Ê;\nelse text=Á.files[id]['text'];Á.files[id]['compare_edited_text']=text;}Á.files[id]['edited']=to;}};EA.Ä.set_show_line_colors=Ã(new_Ê){Á.show_line_colors=new_Ê;if(new_Ê)Á.selection_field.className+=' show_colors';\nelse Á.selection_field.className=Á.selection_field.className.replace(/ show_colors/g,'');};var EA_keys={8:\"Retour arriere\",9:\"Tabulation\",12:\"Milieu(pave numerique)\",13:\"Entrer\",16:\"Shift\",17:\"Ctrl\",18:\"Alt\",19:\"Pause\",20:\"Verr Maj\",27:\"Esc\",32:\"Space\",33:\"Page up\",34:\"Page down\",35:\"End\",36:\"Begin\",37:\"Left\",38:\"Up\",39:\"Right\",40:\"Down\",44:\"Impr ecran\",45:\"Inser\",46:\"Suppr\",91:\"Menu Demarrer Windows / touche pomme Mac\",92:\"Menu Demarrer Windows\",93:\"Menu contextuel Windows\",112:\"F1\",113:\"F2\",114:\"F3\",115:\"F4\",116:\"F5\",117:\"F6\",118:\"F7\",119:\"F8\",120:\"F9\",121:\"F10\",122:\"F11\",123:\"F12\",144:\"Verr Num\",145:\"Arret defil\"};Ã keyDown(e){if(!e){e=event;}for(var i in eA.plugins){if(typeof(eA.plugins[i].onkeydown)==\"Ã\"){if(eA.plugins[i].onkeydown(e)===Ì){if(eA.isIE)e.keyCode=0;return Ì;}}}var target_id=(e.target||e.srcElement).id;var use=Ì;if(EA_keys[e.keyCode])letter=EA_keys[e.keyCode];\nelse letter=String.fromCharCode(e.keyCode);var low_letter=letter.toLowerCase();if(letter==\"Page up\"&&!AltPressed(e)&&!eA.isOpera){eA.execCommand(\"scroll_page\",{\"dir\":\"up\",\"shift\":ShiftPressed(e)});use=Ë;}\nelse if(letter==\"Page down\"&&!AltPressed(e)&&!eA.isOpera){eA.execCommand(\"scroll_page\",{\"dir\":\"down\",\"shift\":ShiftPressed(e)});use=Ë;}\nelse if(eA.is_editable==Ì){return Ë;}\nelse if(letter==\"Tabulation\"&&target_id==\"Â\"&&!CtrlPressed(e)&&!AltPressed(e)){if(ShiftPressed(e))eA.execCommand(\"invert_tab_selection\");\nelse eA.execCommand(\"tab_selection\");use=Ë;if(eA.isOpera||(eA.isFirefox&&eA.isMac))setTimeout(\"eA.execCommand('focus');\",1);}\nelse if(letter==\"Entrer\"&&target_id==\"Â\"){if(eA.press_enter())use=Ë;}\nelse if(letter==\"Entrer\"&&target_id==\"area_search\"){eA.execCommand(\"area_search\");use=Ë;}\nelse  if(letter==\"Esc\"){eA.execCommand(\"close_all_inline_popup\",e);use=Ë;}\nelse if(CtrlPressed(e)&&!AltPressed(e)&&!ShiftPressed(e)){switch(low_letter){case \"f\":eA.execCommand(\"area_search\");use=Ë;break;case \"r\":eA.execCommand(\"area_replace\");use=Ë;break;case \"q\":eA.execCommand(\"close_all_inline_popup\",e);use=Ë;break;case \"h\":eA.execCommand(\"change_highlight\");use=Ë;break;case \"g\":setTimeout(\"eA.execCommand('go_to_line');\",5);use=Ë;break;case \"e\":eA.execCommand(\"show_help\");use=Ë;break;case \"z\":use=Ë;eA.execCommand(\"undo\");break;case \"y\":use=Ë;eA.execCommand(\"redo\");break;default:break;}}if(eA.next.Æ > 0){setTimeout(\"eA.check_redo();\",10);}setTimeout(\"eA.check_file_changes();\",10);if(use){if(eA.isIE)e.keyCode=0;return Ì;}return Ë;};Ã AltPressed(e){if(window.event){return(window.event.altKey);}\nelse{if(e.modifiers)return(e.altKey||(e.modifiers % 2));\nelse return e.altKey;}};Ã CtrlPressed(e){if(window.event){return(window.event.ctrlKey);}\nelse{return(e.ctrlKey||(e.modifiers==2)||(e.modifiers==3)||(e.modifiers>5));}};Ã ShiftPressed(e){if(window.event){return(window.event.shiftKey);}\nelse{return(e.shiftKey||(e.modifiers>3));}};	EA.Ä.show_search=Ã(){if(_$(\"area_search_replace\").Ç.visibility==\"visible\"){Á.hidden_search();}\nelse{Á.open_inline_popup(\"area_search_replace\");var text=Á.area_get_selection();var search=text.split(\"\\n\")[0];_$(\"area_search\").Ê=search;_$(\"area_search\").focus();}};EA.Ä.hidden_search=Ã(){Á.close_inline_popup(\"area_search_replace\");};EA.Ä.area_search=Ã(mode){if(!mode)mode=\"search\";_$(\"area_search_msg\").innerHTML=\"\";var search=_$(\"area_search\").Ê;Á.Â.focus();Á.Â.ÂFocused=Ë;var infos=Á.get_selection_infos();var start=infos[\"selectionStart\"];var pos=-1;var pos_begin=-1;var Æ=search.Æ;if(_$(\"area_search_replace\").Ç.visibility!=\"visible\"){Á.show_search();return;}if(search.Æ==0){_$(\"area_search_msg\").innerHTML=Á.get_translation(\"search_field_empty\");return;}if(mode!=\"replace\"){if(_$(\"area_search_reg_exp\").checked)start++;\nelse start+=search.Æ;}if(_$(\"area_search_reg_exp\").checked){var opt=\"m\";if(!_$(\"area_search_match_case\").checked)opt+=\"i\";var reg=new RegExp(search,opt);pos=infos[\"full_text\"].substr(start).search(reg);pos_begin=infos[\"full_text\"].search(reg);if(pos!=-1){pos+=start;Æ=infos[\"full_text\"].substr(start).match(reg)[0].Æ;}\nelse if(pos_begin!=-1){Æ=infos[\"full_text\"].match(reg)[0].Æ;}}\nelse{if(_$(\"area_search_match_case\").checked){pos=infos[\"full_text\"].indexOf(search,start);pos_begin=infos[\"full_text\"].indexOf(search);}\nelse{pos=infos[\"full_text\"].toLowerCase().indexOf(search.toLowerCase(),start);pos_begin=infos[\"full_text\"].toLowerCase().indexOf(search.toLowerCase());}}if(pos==-1&&pos_begin==-1){_$(\"area_search_msg\").innerHTML=\"<strong>\"+search+\"</strong> \"+Á.get_translation(\"not_found\");return;}\nelse if(pos==-1&&pos_begin !=-1){begin=pos_begin;_$(\"area_search_msg\").innerHTML=Á.get_translation(\"restart_search_at_begin\");}\nelse begin=pos;if(mode==\"replace\"&&pos==infos[\"indexOfCursor\"]){var replace=_$(\"area_replace\").Ê;var new_text=\"\";if(_$(\"area_search_reg_exp\").checked){var opt=\"m\";if(!_$(\"area_search_match_case\").checked)opt+=\"i\";var reg=new RegExp(search,opt);new_text=infos[\"full_text\"].substr(0,begin)+infos[\"full_text\"].substr(start).replace(reg,replace);}\nelse{new_text=infos[\"full_text\"].substr(0,begin)+replace+infos[\"full_text\"].substr(begin+Æ);}Á.Â.Ê=new_text;Á.area_select(begin,Æ);Á.area_search();}\nelse Á.area_select(begin,Æ);};EA.Ä.area_replace=Ã(){Á.area_search(\"replace\");};EA.Ä.area_replace_all=Ã(){var base_text=Á.Â.Ê;var search=_$(\"area_search\").Ê;var replace=_$(\"area_replace\").Ê;if(search.Æ==0){_$(\"area_search_msg\").innerHTML=Á.get_translation(\"search_field_empty\");return;}var new_text=\"\";var nb_change=0;if(_$(\"area_search_reg_exp\").checked){var opt=\"mg\";if(!_$(\"area_search_match_case\").checked)opt+=\"i\";var reg=new RegExp(search,opt);nb_change=infos[\"full_text\"].match(reg).Æ;new_text=infos[\"full_text\"].replace(reg,replace);}\nelse{if(_$(\"area_search_match_case\").checked){var tmp_tab=base_text.split(search);nb_change=tmp_tab.Æ-1;new_text=tmp_tab.join(replace);}\nelse{var lower_Ê=base_text.toLowerCase();var lower_search=search.toLowerCase();var start=0;var pos=lower_Ê.indexOf(lower_search);while(pos!=-1){nb_change++;new_text+=Á.Â.Ê.substring(start,pos)+replace;start=pos+search.Æ;pos=lower_Ê.indexOf(lower_search,pos+1);}new_text+=Á.Â.Ê.substring(start);}}if(new_text==base_text){_$(\"area_search_msg\").innerHTML=\"<strong>\"+search+\"</strong> \"+Á.get_translation(\"not_found\");}\nelse{Á.Â.Ê=new_text;_$(\"area_search_msg\").innerHTML=\"<strong>\"+nb_change+\"</strong> \"+Á.get_translation(\"occurrence_replaced\");setTimeout(\"eA.Â.focus();eA.Â.ÂFocused=Ë;\",100);}}; EA.Ä.change_highlight=Ã(change_to){if(Á.Å[\"syntax\"].Æ==0&&change_to==Ì){Á.switchClassSticky(_$(\"highlight\"),'editAreaButtonDisabled',Ë);Á.switchClassSticky(_$(\"reset_highlight\"),'editAreaButtonDisabled',Ë);return Ì;}if(Á.do_highlight==change_to)return Ì;Á.getIESelection();var pos_start=Á.Â.selectionStart;var pos_end=Á.Â.selectionEnd;if(Á.do_highlight===Ë||change_to==Ì)Á.disable_highlight();\nelse Á.enable_highlight();Á.Â.focus();Á.Â.selectionStart=pos_start;Á.Â.selectionEnd=pos_end;Á.setIESelection();};EA.Ä.disable_highlight=Ã(displayOnly){var t=Á,a=t.Â,new_Obj,old_class,new_class;t.selection_field.innerHTML=\"\";t.selection_field_text.innerHTML=\"\";t.content_highlight.Ç.visibility=\"hidden\";new_Obj=t.content_highlight.cloneNode(Ì);new_Obj.innerHTML=\"\";t.content_highlight.ÈNode.insertBefore(new_Obj,t.content_highlight);t.content_highlight.ÈNode.removeChild(t.content_highlight);t.content_highlight=new_Obj;old_class=È.getAttribute(a,\"class\");if(old_class){new_class=old_class.replace(\"hidden\",\"\");È.setAttribute(a,\"class\",new_class);}a.Ç.backgroundColor=\"transÈ\";t.switchClassSticky(_$(\"highlight\"),'editAreaButtonNormal',Ë);t.switchClassSticky(_$(\"reset_highlight\"),'editAreaButtonDisabled',Ë);t.do_highlight=Ì;t.switchClassSticky(_$(\"change_smooth_selection\"),'editAreaButtonSelected',Ë);if(typeof(t.smooth_selection_before_highlight)!=\"undefined\"&&t.smooth_selection_before_highlight===Ì){t.change_smooth_selection_mode(Ì);}};EA.Ä.enable_highlight=Ã(){var t=Á,a=t.Â,new_class;t.show_waiting_screen();t.content_highlight.Ç.visibility=\"visible\";new_class=È.getAttribute(a,\"class\")+\" hidden\";È.setAttribute(a,\"class\",new_class);if(t.isIE)a.Ç.backgroundColor=\"#FFFFFF\";t.switchClassSticky(_$(\"highlight\"),'editAreaButtonSelected',Ì);t.switchClassSticky(_$(\"reset_highlight\"),'editAreaButtonNormal',Ì);t.smooth_selection_before_highlight=t.smooth_selection;if(!t.smooth_selection)t.change_smooth_selection_mode(Ë);t.switchClassSticky(_$(\"change_smooth_selection\"),'editAreaButtonDisabled',Ë);t.do_highlight=Ë;t.resync_highlight();t.hide_waiting_screen();};EA.Ä.maj_highlight=Ã(infos){var debug_opti=\"\",tps_start=new Date().getTime(),tps_middle_opti=new Date().getTime();var t=Á,hightlighted_text,updated_highlight;var textToHighlight=infos[\"full_text\"],doSyntaxOpti=Ì,doHtmlOpti=Ì,stay_begin=\"\",stay_end=\"\",trace_new,trace_last;if(t.last_text_to_highlight==infos[\"full_text\"]&&t.resync_highlight!==Ë)return;if(t.reload_highlight===Ë){t.reload_highlight=Ì;}\nelse if(textToHighlight.Æ==0){textToHighlight=\"\\n \";}\nelse{changes=t.checkTextEvolution(t.last_text_to_highlight,textToHighlight);trace_new=t.get_syntax_trace(changes.newTextLine).replace(/\\r/g,'');trace_last=t.get_syntax_trace(changes.lastTextLine).replace(/\\r/g,'');doSyntaxOpti=(trace_new==trace_last);if(!doSyntaxOpti&&trace_new==\"\\n\"+trace_last&&/^[ \t\s]*\\n[ \t\s]*$/.test(changes.newText.replace(/\\r/g,''))&&changes.lastText==\"\"){doSyntaxOpti=Ë;}if(doSyntaxOpti){tps_middle_opti=new Date().getTime();stay_begin=t.last_hightlighted_text.split(\"\\n\").slice(0,changes.lineStart).join(\"\\n\");if(changes.lineStart>0)stay_begin+=\"\\n\";stay_end=t.last_hightlighted_text.split(\"\\n\").slice(changes.lineLastEnd+1).join(\"\\n\");if(stay_end.Æ>0)stay_end=\"\\n\"+stay_end;if(stay_begin.split('<span').Æ !=stay_begin.split('</span').Æ||stay_end.split('<span').Æ !=stay_end.split('</span').Æ){doSyntaxOpti=Ì;stay_end='';stay_begin='';}\nelse{if(stay_begin.Æ==0&&changes.posLastEnd==-1)changes.newTextLine+=\"\\n\";textToHighlight=changes.newTextLine;}}if(t.Å[\"debug\"]){var ch=changes;debug_opti=(doSyntaxOpti?\"Optimisation\":\"No optimisation\")+\" start:\"+ch.posStart+\"(\"+ch.lineStart+\")\"+\" end_new:\"+ch.posNewEnd+\"(\"+ch.lineNewEnd+\")\"+\" end_last:\"+ch.posLastEnd+\"(\"+ch.lineLastEnd+\")\"+\"\\nchanged_text:\"+ch.newText+\"=> trace:\"+trace_new+\"\\nchanged_last_text:\"+ch.lastText+\"=> trace:\"+trace_last+\"\\nchanged_line:\"+ch.newTextLine+\"\\nlast_changed_line:\"+ch.lastTextLine+\"\\nstay_begin:\"+stay_begin.slice(-100)+\"\\nstay_end:\"+stay_end.substr(0,100);+\"\\n\";}}tps_end_opti=new Date().getTime();updated_highlight=t.colorize_text(textToHighlight);tpsAfterReg=new Date().getTime();doSyntaxOpti=doHtmlOpti=Ì;if(doSyntaxOpti){try{var replacedBloc,i,nbStart='',nbEnd='',newHtml,ÆOld,ÆNew;replacedBloc=t.last_hightlighted_text.substring(stay_begin.Æ,t.last_hightlighted_text.Æ-stay_end.Æ);ÆOld=replacedBloc.Æ;ÆNew=updated_highlight.Æ;for(i=0;i < ÆOld&&i < ÆNew&&replacedBloc.charAt(i)==updated_highlight.charAt(i);i++){}nbStart=i;for(i=0;i+nbStart < ÆOld&&i+nbStart < ÆNew&&replacedBloc.charAt(ÆOld-i-1)==updated_highlight.charAt(ÆNew-i-1);i++){}nbEnd=i;lastHtml=replacedBloc.substring(nbStart,ÆOld-nbEnd);newHtml=updated_highlight.substring(nbStart,ÆNew-nbEnd);if(newHtml.indexOf('<span')==-1&&newHtml.indexOf('</span')==-1&&lastHtml.indexOf('<span')==-1&&lastHtml.indexOf('</span')==-1){var beginStr,nbOpendedSpan,nbClosedSpan,nbUnchangedChars,span,textNode;doHtmlOpti=Ë;beginStr=t.last_hightlighted_text.substr(0,stay_begin.Æ+nbStart);newHtml=newHtml.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');nbOpendedSpan=beginStr.split('<span').Æ-1;nbClosedSpan=beginStr.split('</span').Æ-1;span=t.content_highlight.getElementsByTagName('span')[ nbOpendedSpan ];ÈSpan=span;maxStartOffset=maxEndOffset=0;if(nbOpendedSpan==nbClosedSpan){while(ÈSpan.ÈNode !=t.content_highlight&&ÈSpan.ÈNode.tagName !='PRE'){ÈSpan=ÈSpan.ÈNode;}}\nelse{maxStartOffset=maxEndOffset=beginStr.Æ+1;nbClosed=beginStr.substr(Math.max(0,beginStr.lastIndexOf('<span',maxStartOffset-1))).split('</span').Æ-1;while(nbClosed > 0){nbClosed--;ÈSpan=ÈSpan.ÈNode;}while(ÈSpan.ÈNode !=t.content_highlight&&ÈSpan.ÈNode.tagName !='PRE'&&(tmpMaxStartOffset=Math.max(0,beginStr.lastIndexOf('<span',maxStartOffset-1)))<(tmpMaxEndOffset=Math.max(0,beginStr.lastIndexOf('</span',maxEndOffset-1)))){maxStartOffset=tmpMaxStartOffset;maxEndOffset=tmpMaxEndOffset;}}if(ÈSpan.ÈNode==t.content_highlight||ÈSpan.ÈNode.tagName=='PRE'){maxStartOffset=Math.max(0,beginStr.indexOf('<span'));}if(maxStartOffset==beginStr.Æ){nbSubSpanBefore=0;}\nelse{lastEndPos=Math.max(0,beginStr.lastIndexOf('>',maxStartOffset));nbSubSpanBefore=beginStr.substr(lastEndPos).split('<span').Æ-1;}if(nbSubSpanBefore==0){textNode=ÈSpan.firstChild;}\nelse{lastSubSpan=ÈSpan.getElementsByTagName('span')[ nbSubSpanBefore-1 ];while(lastSubSpan.ÈNode !=ÈSpan){lastSubSpan=lastSubSpan.ÈNode;}if(lastSubSpan.nextSibling==null||lastSubSpan.nextSibling.nodeType !=3){textNode=document.createTextNode('');lastSubSpan.ÈNode.insertBefore(textNode,lastSubSpan.nextSibling);}\nelse{textNode=lastSubSpan.nextSibling;}}if((lastIndex=beginStr.lastIndexOf('>'))==-1){nbUnchangedChars=beginStr.Æ;}\nelse{nbUnchangedChars=beginStr.substr(lastIndex+1).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').Æ;}if(t.isIE){nbUnchangedChars-=(beginStr.substr(beginStr.Æ-nbUnchangedChars).split(\"\\n\").Æ-1);textNode.replaceData(nbUnchangedChars,lastHtml.replace(/\\n/g,'').Æ,newHtml.replace(/\\n/g,''));}\nelse{textNode.replaceData(nbUnchangedChars,lastHtml.Æ,newHtml);}}}catch(e){doHtmlOpti=Ì;}}tpsAfterOpti2=new Date().getTime();hightlighted_text=stay_begin+updated_highlight+stay_end;if(!doHtmlOpti){var new_Obj=t.content_highlight.cloneNode(Ì);if((t.isIE&&t.isIE < 8)||(t.isOpera&&t.isOpera < 9.6))new_Obj.innerHTML=\"<pre><span class='\"+t.Å[\"syntax\"]+\"'>\"+hightlighted_text+\"</span></pre>\";\nelse new_Obj.innerHTML=\"<span class='\"+t.Å[\"syntax\"]+\"'>\"+hightlighted_text+\"</span>\";t.content_highlight.ÈNode.replaceChild(new_Obj,t.content_highlight);t.content_highlight=new_Obj;}t.last_text_to_highlight=infos[\"full_text\"];t.last_hightlighted_text=hightlighted_text;tps3=new Date().getTime();if(t.Å[\"debug\"]){t.debug.Ê=\"Tps optimisation \"+(tps_end_opti-tps_start)+\" | tps reg exp:\"+(tpsAfterReg-tps_end_opti)+\" | tps opti HTML:\"+(tpsAfterOpti2-tpsAfterReg)+' '+(doHtmlOpti ? 'yes':'no')+\" | tps update highlight content:\"+(tps3-tpsAfterOpti2)+\" | tpsTotal:\"+(tps3-tps_start)+\"(\"+tps3+\")\\n\"+debug_opti;}};EA.Ä.resync_highlight=Ã(reload_now){Á.reload_highlight=Ë;Á.last_text_to_highlight=\"\";Á.focus();if(reload_now)Á.check_line_selection(Ì);}; EA.Ä.comment_or_quote=Ã(){var new_class=\"\",close_tag=\"\",sy,arg,i;sy=È.eAL.syntax[eA.current_code_lang];arg=EA.Ä.comment_or_quote.arguments[0];for(i in sy[\"quotes\"]){if(arg.indexOf(i)==0){new_class=\"quotesmarks\";close_tag=sy[\"quotes\"][i];}}if(new_class.Æ==0){for(var i in sy[\"comments\"]){if(arg.indexOf(i)==0){new_class=\"comments\";close_tag=sy[\"comments\"][i];}}}if(close_tag==\"\\n\"){return \"µ__\"+new_class+\"__µ\"+arg.replace(/(\\r?\\n)?$/m,\"µ_END_µ$1\");}\nelse{reg=new RegExp(È.eAL.get_escaped_regexp(close_tag)+\"$\",\"m\");if(arg.search(reg)!=-1)return \"µ__\"+new_class+\"__µ\"+arg+\"µ_END_µ\";\nelse return \"µ__\"+new_class+\"__µ\"+arg;}};EA.Ä.get_syntax_trace=Ã(text){if(Á.Å[\"syntax\"].Æ>0&&È.eAL.syntax[Á.Å[\"syntax\"]][\"syntax_trace_regexp\"])return text.replace(È.eAL.syntax[Á.Å[\"syntax\"]][\"syntax_trace_regexp\"],\"$3\");};EA.Ä.colorize_text=Ã(text){text=\" \"+text;if(Á.Å[\"syntax\"].Æ>0)text=Á.apply_syntax(text,Á.Å[\"syntax\"]);return text.substr(1).replace(/&/g,\"&amp;\").replace(/</g,\"&lt;\").replace(/>/g,\"&gt;\").replace(/µ_END_µ/g,\"</span>\").replace(/µ__([a-zA-Z0-9]+)__µ/g,\"<span class='$1'>\");};EA.Ä.apply_syntax=Ã(text,lang){var sy;Á.current_code_lang=lang;if(!È.eAL.syntax[lang])return text;sy=È.eAL.syntax[lang];if(sy[\"custom_regexp\"]['before']){for(var i in sy[\"custom_regexp\"]['before']){var convert=\"$1µ__\"+sy[\"custom_regexp\"]['before'][i]['class']+\"__µ$2µ_END_µ$3\";text=text.replace(sy[\"custom_regexp\"]['before'][i]['regexp'],convert);}}if(sy[\"comment_or_quote_reg_exp\"]){text=text.replace(sy[\"comment_or_quote_reg_exp\"],Á.comment_or_quote);}if(sy[\"keywords_reg_exp\"]){for(var i in sy[\"keywords_reg_exp\"]){text=text.replace(sy[\"keywords_reg_exp\"][i],'µ__'+i+'__µ$2µ_END_µ');}}if(sy[\"delimiters_reg_exp\"]){text=text.replace(sy[\"delimiters_reg_exp\"],'µ__delimiters__µ$1µ_END_µ');}if(sy[\"operators_reg_exp\"]){text=text.replace(sy[\"operators_reg_exp\"],'µ__operators__µ$1µ_END_µ');}if(sy[\"custom_regexp\"]['after']){for(var i in sy[\"custom_regexp\"]['after']){var convert=\"$1µ__\"+sy[\"custom_regexp\"]['after'][i]['class']+\"__µ$2µ_END_µ$3\";text=text.replace(sy[\"custom_regexp\"]['after'][i]['regexp'],convert);}}return text;};var editArea= eA;EditArea=EA;</script>".replace(/Á/g,'this').replace(/Â/g,'textarea').replace(/Ã/g,'function').replace(/Ä/g,'prototype').replace(/Å/g,'settings').replace(/Æ/g,'length').replace(/Ç/g,'style').replace(/È/g,'parent').replace(/É/g,'last_selection').replace(/Ê/g,'value').replace(/Ë/g,'true').replace(/Ì/g,'false');
editAreaLoader.template= "<?xml version=\"1.0\" encoding=\"UTF-8\"?> <!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.1//EN\" \"http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd\"> <html xmlns=\"http://www.w3.org/1999/xhtml\" xml:lang=\"en\" > <head> <title>EditArea</title> <meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\" /> <meta http-equiv=\"X-UA-Compatible\" content=\"IE=EmulateIE7\"/> [__CSSRULES__] [__JSCODE__] </head> <body> <div id='editor'> <div class='area_toolbar' id='toolbar_1'>[__TOOLBAR__]</div> <div class='area_toolbar' id='tab_browsing_area'><ul id='tab_browsing_list' class='menu'> <li> </li> </ul></div> <div id='result'> <div id='no_file_selected'></div> <div id='container'> <div id='cursor_pos' class='edit_area_cursor'>&nbsp;</div> <div id='end_bracket' class='edit_area_cursor'>&nbsp;</div> <div id='selection_field'></div> <div id='line_number' selec='none'></div> <div id='content_highlight'></div> <div id='test_font_size'></div> <div id='selection_field_text'></div> <textarea id='textarea' wrap='off' onchange='editArea.execCommand(\"onchange\");' onfocus='javascript:editArea.textareaFocused=true;' onblur='javascript:editArea.textareaFocused=false;'> </textarea> </div> </div> <div class='area_toolbar' id='toolbar_2'> <table class='statusbar' cellspacing='0' cellpadding='0'> <tr> <td class='total' selec='none'>{$position}:</td> <td class='infos' selec='none'> {$line_abbr} <span  id='linePos'>0</span>, {$char_abbr} <span id='currPos'>0</span> </td> <td class='total' selec='none'>{$total}:</td> <td class='infos' selec='none'> {$line_abbr} <span id='nbLine'>0</span>, {$char_abbr} <span id='nbChar'>0</span> </td> <td class='resize'> <span id='resize_area'><img src='[__BASEURL__]images/statusbar_resize.gif' alt='resize' selec='none'></span> </td> </tr> </table> </div> </div> <div id='processing'> <div id='processing_text'> {$processing} </div> </div> <div id='area_search_replace' class='editarea_popup'> <table cellspacing='2' cellpadding='0' style='width: 100%'> <tr> <td selec='none'>{$search}</td> <td><input type='text' id='area_search' /></td> <td id='close_area_search_replace'> <a onclick='Javascript:editArea.execCommand(\"hidden_search\")'><img selec='none' src='[__BASEURL__]images/close.gif' alt='{$close_popup}' title='{$close_popup}' /></a><br /> </tr><tr> <td selec='none'>{$replace}</td> <td><input type='text' id='area_replace' /></td> <td><img id='move_area_search_replace' onmousedown='return parent.start_move_element(event,\"area_search_replace\", parent.frames[\"frame_\"+editArea.id]);'  src='[__BASEURL__]images/move.gif' alt='{$move_popup}' title='{$move_popup}' /></td> </tr> </table> <div class='button'> <input type='checkbox' id='area_search_match_case' /><label for='area_search_match_case' selec='none'>{$match_case}</label> <input type='checkbox' id='area_search_reg_exp' /><label for='area_search_reg_exp' selec='none'>{$reg_exp}</label> <br /> <a onclick='Javascript:editArea.execCommand(\"area_search\")' selec='none'>{$find_next}</a> <a onclick='Javascript:editArea.execCommand(\"area_replace\")' selec='none'>{$replace}</a> <a onclick='Javascript:editArea.execCommand(\"area_replace_all\")' selec='none'>{$replace_all}</a><br /> </div> <div id='area_search_msg' selec='none'></div> </div> <div id='edit_area_help' class='editarea_popup'> <div class='close_popup'> <a onclick='Javascript:editArea.execCommand(\"close_all_inline_popup\")'><img src='[__BASEURL__]images/close.gif' alt='{$close_popup}' title='{$close_popup}' /></a> </div> <div><h2>Editarea [__EA_VERSION__]</h2><br /> <h3>{$shortcuts}:</h3> {$tab}: {$add_tab}<br /> {$shift}+{$tab}: {$remove_tab}<br /> {$ctrl}+f: {$search_command}<br /> {$ctrl}+r: {$replace_command}<br /> {$ctrl}+h: {$highlight}<br /> {$ctrl}+g: {$go_to_line}<br /> {$ctrl}+z: {$undo}<br /> {$ctrl}+y: {$redo}<br /> {$ctrl}+e: {$help}<br /> {$ctrl}+q, {$esc}: {$close_popup}<br /> {$accesskey} E: {$toggle}<br /> <br /> <em>{$about_notice}</em> <br /><div class='copyright'>&copy; Christophe Dolivet 2007-2010</div> </div> </div> </body> </html> ";
editAreaLoader.iframe_css= "<style>body,html{margin:0;padding:0;height:100%;border:none;overflow:hidden;background-color:#FFF;}body,html,table,form,textarea{font:12px monospace,sans-serif;}#editor{border:solid #888 1px;overflow:hidden;}#result{z-index:4;overflow-x:auto;overflow-y:scroll;border-top:solid #888 1px;border-bottom:solid #888 1px;position:relative;clear:both;}#result.empty{overflow:hidden;}#container{overflow:hidden;border:solid blue 0;position:relative;z-index:10;padding:0 5px 0 45px;}#textarea{position:relative;top:0;left:0;margin:0;padding:0;width:100%;height:100%;overflow:hidden;z-index:7;border-width:0;background-color:transparent;resize:none;}#textarea,#textarea:hover{outline:none;}#content_highlight{white-space:pre;margin:0;padding:0;position:absolute;z-index:4;overflow:visible;}#selection_field,#selection_field_text{margin:0;background-color:#E1F2F9;position:absolute;z-index:5;top:-100px;padding:0;white-space:pre;overflow:hidden;}#selection_field.show_colors {z-index:3;background-color:#EDF9FC;}#selection_field strong{font-weight:normal;}#selection_field.show_colors *,#selection_field_text * {visibility:hidden;}#selection_field_text{background-color:transparent;}#selection_field_text strong{font-weight:normal;background-color:#3399FE;color:#FFF;visibility:visible;}#container.word_wrap #content_highlight,#container.word_wrap #selection_field,#container.word_wrap #selection_field_text,#container.word_wrap #test_font_size{white-space:pre-wrap;white-space:-moz-pre-wrap !important;white-space:-pre-wrap;white-space:-o-pre-wrap;word-wrap:break-word;width:99%;}#line_number{position:absolute;overflow:hidden;border-right:solid black 1px;z-index:8;width:38px;padding:0 5px 0 0;margin:0 0 0 -45px;text-align:right;color:#AAAAAA;}#test_font_size{padding:0;margin:0;visibility:hidden;position:absolute;white-space:pre;}pre{margin:0;padding:0;}.hidden{opacity:0.2;filter:alpha(opacity=20);}#result .edit_area_cursor{position:absolute;z-index:6;background-color:#FF6633;top:-100px;margin:0;}#result .edit_area_selection_field .overline{background-color:#996600;}.editarea_popup{border:solid 1px #888888;background-color:#ECE9D8;width:250px;padding:4px;position:absolute;visibility:hidden;z-index:15;top:-500px;}.editarea_popup,.editarea_popup table{font-family:sans-serif;font-size:10pt;}.editarea_popup img{border:0;}.editarea_popup .close_popup{float:right;line-height:16px;border:0;padding:0;}.editarea_popup h1,.editarea_popup h2,.editarea_popup h3,.editarea_popup h4,.editarea_popup h5,.editarea_popup h6{margin:0;padding:0;}.editarea_popup .copyright{text-align:right;}div#area_search_replace{}div#area_search_replace img{border:0;}div#area_search_replace div.button{text-align:center;line-height:1.7em;}div#area_search_replace .button a{cursor:pointer;border:solid 1px #888888;background-color:#DEDEDE;text-decoration:none;padding:0 2px;color:#000000;white-space:nowrap;}div#area_search_replace a:hover{background-color:#EDEDED;}div#area_search_replace  #move_area_search_replace{cursor:move;border:solid 1px #888;}div#area_search_replace  #close_area_search_replace{text-align:right;vertical-align:top;white-space:nowrap;}div#area_search_replace  #area_search_msg{height:18px;overflow:hidden;border-top:solid 1px #888;margin-top:3px;}#edit_area_help{width:350px;}#edit_area_help div.close_popup{float:right;}.area_toolbar{width:100%;margin:0;padding:0;background-color:#ECE9D8;text-align:center;}.area_toolbar,.area_toolbar table{font:11px sans-serif;}.area_toolbar img{border:0;vertical-align:middle;}.area_toolbar input{margin:0;padding:0;}.area_toolbar select{font-family:'MS Sans Serif',sans-serif,Verdana,Arial;font-size:7pt;font-weight:normal;margin:2px 0 0 0 ;padding:0;vertical-align:top;background-color:#F0F0EE;}table.statusbar{width:100%;}.area_toolbar td.infos{text-align:center;width:130px;border-right:solid 1px #888;border-width:0 1px 0 0;padding:0;}.area_toolbar td.total{text-align:right;width:50px;padding:0;}.area_toolbar td.resize{text-align:right;}.area_toolbar span#resize_area{cursor:nw-resize;visibility:hidden;}.editAreaButtonNormal,.editAreaButtonOver,.editAreaButtonDown,.editAreaSeparator,.editAreaSeparatorLine,.editAreaButtonDisabled,.editAreaButtonSelected {border:0; margin:0; padding:0; background:transparent;margin-top:0;margin-left:1px;padding:0;}.editAreaButtonNormal {border:1px solid #ECE9D8 !important;cursor:pointer;}.editAreaButtonOver {border:1px solid #0A246A !important;cursor:pointer;background-color:#B6BDD2;}.editAreaButtonDown {cursor:pointer;border:1px solid #0A246A !important;background-color:#8592B5;}.editAreaButtonSelected {border:1px solid #C0C0BB !important;cursor:pointer;background-color:#F4F2E8;}.editAreaButtonDisabled {filter:progid:DXImageTransform.Microsoft.Alpha(opacity=30);-moz-opacity:0.3;opacity:0.3;border:1px solid #F0F0EE !important;cursor:pointer;}.editAreaSeparatorLine {margin:1px 2px;background-color:#C0C0BB;width:2px;height:18px;}#processing{display:none;background-color:#ECE9D8;border:solid #888 1px;position:absolute;top:0;left:0;width:100%;height:100%;z-index:100;text-align:center;}#processing_text{position:absolute;left:50%;top:50%;width:200px;height:20px;margin-left:-100px;margin-top:-10px;text-align:center;}#tab_browsing_area{display:none;background-color:#CCC9A8;border-top:1px solid #888;text-align:left;margin:0;}#tab_browsing_list {padding:0;margin:0;list-style-type:none;white-space:nowrap;}#tab_browsing_list li {float:left;margin:-1px;}#tab_browsing_list a {position:relative;display:block;text-decoration:none;float:left;cursor:pointer;line-height:14px;}#tab_browsing_list a span {display:block;color:#000;background:#ECE9D8;border:1px solid #888;border-width:1px 1px 0;text-align:center;padding:2px 2px 1px 4px;position:relative;}#tab_browsing_list a b {display:block;border-bottom:2px solid #617994;}#tab_browsing_list a .edited {display:none;}#tab_browsing_list a.edited .edited {display:inline;}#tab_browsing_list a img{margin-left:7px;}#tab_browsing_list a.edited img{margin-left:3px;}#tab_browsing_list a:hover span {background:#F4F2E8;border-color:#0A246A;}#tab_browsing_list .selected a span{background:#046380;color:#FFF;}#no_file_selected{height:100%;width:150%;background:#CCC;display:none;z-index:20;position:absolute;}.non_editable #editor{border-width:0 1px;}.non_editable .area_toolbar{display:none;}#auto_completion_area{background:#FFF;border:solid 1px #888;position:absolute;z-index:15;width:280px;height:180px;overflow:auto;display:none;}#auto_completion_area a,#auto_completion_area a:visited{display:block;padding:0 2px 1px;color:#000;text-decoration:none;}#auto_completion_area a:hover,#auto_completion_area a:focus,#auto_completion_area a.focus{background:#D6E1FE;text-decoration:none;}#auto_completion_area ul{margin:0;padding:0;list-style:none inside;}#auto_completion_area li{padding:0;}#auto_completion_area .prefix{font-style:italic;padding:0 3px;}</style>";



/***************************************************
 * backend/Newsletter.js
 ***************************************************/

/**
 *	@author Integry Systems
 */

Backend.Newsletter =
{
	formUrl: false,

	addUrl: false,

	statusUrl: false,

	productTabCopy: null,

	formTabCopy: null,

	initialize: function()
	{

	},

	getTabUrl: function(url)
	{
		return url;
	},

	getContentTabId: function(id)
	{
		return id + 'Content';
	},

	showAddForm: function(caller)
	{
		var container = $('addMessageContainer');

		// product form has already been downloaded
		if (this.formTabCopy)
		{
			container.update('');
			container.appendChild(this.formTabCopy);
			this.initAddForm();
		}

		// retrieve product form
		else
		{
			var url = Backend.Newsletter.links.add;
			new LiveCart.AjaxUpdater(url, container, caller.up('.menu').down('.progressIndicator'));
		}
	},

	hideAddForm: function()
	{
		if ($('addMessageContainer'))
		{
			Element.hide($('addMessageContainer'));
		}

		if ($('newsletterTabContainer'))
		{
			Element.show($('newsletterTabContainer'));
		}
	},

	cancelAdd: function(noHide)
	{
		container = $('addMessageContainer');

		if (!noHide)
		{
			Element.hide(container);
			Element.show($('newsletterTabContainer'));
		}

		ActiveForm.prototype.destroyTinyMceFields(container);
		this.formTabCopy = container.down('.productForm');
	},

	resetAddForm: function(form)
	{
		ActiveForm.prototype.resetTinyMceFields(form);
	},

	initAddForm: function()
	{
		container = $('addMessageContainer');

		Element.hide($('newsletterTabContainer'));
		Element.show(container);

		if (window.tinyMCE)
		{
			tinyMCE.idCounter = 0;
		}

		ActiveForm.prototype.initTinyMceFields(container);

		this.reInitAddForm();

		ActiveForm.prototype.resetErrorMessages(container.down('form'));

		this.nodes = {};
		this.nodes.format = $("newsletter__format");
		this.nodes.form = $("newsletter__format").up("form");
		this.nodes.mceID = $(this.nodes.form).getElementsBySelector('textarea.tinyMCE')[0].id;
		this.nodes.shortdes = $($A(this.nodes.form.getElementsByClassName("textarea")).pop()).down("textarea");

		self = this;
		Event.observe(this.nodes.format, 'change', function(e) { Event.stop(e); self.formatChanged();});
		Event.observe(this.nodes.shortdes, 'change', function(e) { 
			if(self.nodes.format.value==1)
			{
				Event.stop(e);
				self.nodes.format.value=2;
				self.formatChanged();
			}
		});
		this.tinyMCEChanged=Backend.Newsletter.Commons.tinyMCEChanged.bind({
			nodes: {
				format: this.nodes.format,
				shortdes: this.nodes.shortdes,
				form:this.nodes.form
			}
		});
		this.formatChanged = Backend.Newsletter.Commons.formatChanged.bind({
			nodes: {
				form: this.nodes.form,
				format: this.nodes.format
			},
			tinyMCEChanged:this.tinyMCEChanged,
			id:this.id
		});
		
		Backend.Newsletter.Commons.reconfigureTinyMCE(this);
	},

	reInitAddForm: function()
	{
		// focus title field
		$('addMessageContainer').down('form').elements.namedItem('subject').focus();
	},

	saveForm: function(form)
	{
		var saveHandler = new Backend.Newsletter.saveHandler(form);
		this.request = new LiveCart.AjaxRequest(form, null, saveHandler.saveComplete.bind(saveHandler),  {onInteractive: saveHandler.saveComplete.bind(saveHandler) });
	},

	openNewsletter: function(id, e, onComplete)
	{
		if ($('newsletterIndicator_' + id))
		{
			Element.show($('newsletterIndicator_' + id));
		}

		Backend.Newsletter.Editor.prototype.setCurrentId(id);

		var tabControl = TabControl.prototype.getInstance('newsletterManagerContainer', Backend.Newsletter.Editor.prototype.craftUrl, Backend.Newsletter.Editor.prototype.craftId);

		tabControl.activateTab(null, function(response)
		{
			var inst = Backend.Newsletter.Editor.prototype.getInstance(id);

			if(onComplete)
			{
				onComplete(response);
			}

			inst.hideMainContainer();

			//Backend.ajaxNav.add("#product_" + id);
		}.bind(this));

		if(Backend.Newsletter.Editor.prototype.hasInstance(id))
		{
			Backend.Newsletter.Editor.prototype.getInstance(id);
		}

		if (e)
		{
			Event.stop(e);
		}
	 },

	initForm: function(container)
	{
		$A(container.getElementsByTagName('textarea')).each(function(textarea)
		{
			editAreaLoader.init({
				id : textarea.id,		// textarea id
				syntax: "html",			// syntax to be uses for highgliting
				start_highlight: true,	// to display with highlight mode on start-up
				allow_toggle: false,
				allow_resize: true
				}
			);
		});
	},

	setPath: function(path)
	{
		this.categoryPaths = path;
	},

	resetEditors: function()
	{
		Backend.Newsletter.productTabCopy = null;
		Backend.Newsletter.formTabCopy = null;
		Backend.Newsletter.Editor.prototype.__instances__ = {};
		Backend.Newsletter.Editor.prototype.__currentId__ = null;

		$('newsletterManagerContainer').down('.sectionContainer').innerHTML = '';

		TabControl.prototype.__instances__ = {};
	},

	reloadGrid: function()
	{
		var table = $('newsletters_0');

		if (!table && Backend.Newsletter.productTabCopy)
		{
			table = Backend.Newsletter.productTabCopy.getElementsByTagName('table')[0];
		}

		if (table)
		{
			table.gridInstance.reloadGrid();
		}
	},

	updateRecipientCount: function(element)
	{
		var form = element.form;
		var container = form.down('.recipientCount');
		$("userGroupIDs").value = $A($(form).getElementsByClassName("userGroupCheckbox")).inject([], function(r, item) {
			var v;
			if(item.checked)
			{
				v = item.name.split("_").pop();
				r.push(v ? v : "null");
			}
			return r;
		}).join(",");

		new LiveCart.AjaxRequest(Backend.Newsletter.links.recipientCount, container.down('.progressIndicator'),
			function(originalRequest)
			{
				container.innerHTML = originalRequest.responseText;
			},
			{ parameters: Form.serialize(form) });
	},

	cancel: function(element)
	{
		this.request.request.transport.abort();
		element.up('form').down('.sendProgress').hide();
	}
}

Backend.Newsletter.saveHandler = Class.create();
Backend.Newsletter.saveHandler.prototype =
{
	formerLength: 0,

  	initialize: function(form)
  	{
		this.form = form;
	},

	saveComplete: function(originalRequest)
	{
	  	ActiveForm.prototype.resetErrorMessages(this.form);

		if (originalRequest.responseData)
		{
			var response = originalRequest.responseData;
		}

		if (response && response.errors)
		{
			ActiveForm.prototype.setErrorMessages(this.form, response.errors);
		}
		else if (response && response.ID)
		{
			Backend.Newsletter.reloadGrid();

			if (!this.form.elements.namedItem('id'))
			{
				// continue to edit the newly added message
				Element.show($('loadingNewsletter'));
				Backend.Newsletter.openNewsletter(response.ID,
											null,
											function()
											{
												Element.hide($('loadingNewsletter'));
												Backend.Newsletter.cancelAdd();
												this.form.reset();
												new Backend.SaveConfirmationMessage($('tabMessageInfo_' + response.ID + 'Content').down('.confirmations').down('.messageSaved'));
											}.bind(this)
											);
			}
			else
			{
				// show save confirmation
				new Backend.SaveConfirmationMessage(this.form.up('.tabPageContainer').down('.confirmations').down('.messageSaved'));
			}
 		}
		else
		{
			if (!this.progressBar)
			{
				var cont = this.form.down('.sendProgress');
				cont.show();
				this.progressBar = new Backend.ProgressBar(cont);

				this.sentCount = this.form.down('.sentCount');
				this.initialSentCount = parseFloat(this.sentCount.innerHTML);

				this.form.down('.statusString').innerHTML = this.form.down('.statusPartial').innerHTML;
			}

			var response = originalRequest.responseText.substr(this.formerLength + 1);
			this.formerLength = originalRequest.responseText.length;

			var portions = response.split('|');

			for (var k = 0; k < portions.length; k++)
			{
				response = eval('(' + decode64(portions[k]) + ')');

				// progress
				if (response.progress != undefined)
				{
					this.setProgress(response);
				}
			}
		}
	},

	setProgress: function(response)
	{
		if (response.progress > 0)
		{
			this.progressBar.update(response.progress, response.total);
			this.sentCount.innerHTML = this.initialSentCount + response.progress;
		}
		else
		{
			this.sentCount.innerHTML = this.initialSentCount + response.total;
			this.form.down('.statusString').innerHTML = this.form.down('.statusSent').innerHTML;
			this.form.down('.sendProgress').hide();
/*
			li.removeClassName('inProgress');
			li.addClassName('completed');
			li.down('.progressCount').update(response.total);
			li.down('.progressBarIndicator').hide();
			li.down('.cancel').hide();
*/
			new Backend.SaveConfirmationMessage(this.form.down('.messageComplete'));
			Backend.Newsletter.reloadGrid();
		}
	},
}

Backend.Newsletter.Editor = Class.create();
Backend.Newsletter.Editor.prototype =
{
	__currentId__: null,
	__instances__: {},

	initialize: function(id, path)
  	{
		this.id = id;

		this.path = path;

		this.__nodes__();
		this.__bind__();

		Form.State.backup(this.nodes.form);

		var self = this;

	},

	__nodes__: function()
	{
		this.nodes = {};
		this.nodes.parent = $("tabMessageInfo_" + this.id + "Content");
		this.nodes.form = this.nodes.parent.down("form");
		this.nodes.cancel = this.nodes.form.down('a.cancel');
		this.nodes.submit = this.nodes.form.down('input.submit');

		this.nodes.format = $("newsletter_"+this.id+"_format");
		this.nodes.mceID = $(this.nodes.form).getElementsBySelector('textarea.tinyMCE')[0].id;
		this.nodes.shortdes = $($A(this.nodes.form.getElementsByClassName("textarea")).pop()).down("textarea");
	},

	__bind__: function(args)
	{
		var self = this;

		Event.observe(this.nodes.cancel, 'click', function(e) { Event.stop(e); self.cancelForm()});
		Event.observe(this.nodes.format, 'change', function(e) { Event.stop(e); self.formatChanged();});
		Event.observe(this.nodes.shortdes, 'change', function(e) { 
			if(self.nodes.format.value==1)
			{
				Event.stop(e);
				self.nodes.format.value=2;
				self.formatChanged();
			}
		});
		this.tinyMCEChanged=Backend.Newsletter.Commons.tinyMCEChanged.bind({
			nodes: {
				format: this.nodes.format,
				shortdes: this.nodes.shortdes,
				form:this.nodes.form
			}
		});
		this.formatChanged = Backend.Newsletter.Commons.formatChanged.bind({
			nodes: {
				form: this.nodes.form,
				format: this.nodes.format
			},
			tinyMCEChanged:this.tinyMCEChanged,
			id:this.id
		});
	},

	__init__: function(tabs)
	{
		Backend.Newsletter.Editor.prototype.setCurrentId(this.id);
		if ($('newsletterIndicator_' + this.id))
		{
			Element.hide($('newsletterIndicator_' + this.id));
		}
		this.showProductForm();
		this.tabControl = TabControl.prototype.getInstance("newsletterManagerContainer", false);
		this.setPath();
		this.addTinyMce();
		this.formatChanged(); // update visibility
	},

	setPath: function() {
/*
		Backend.Breadcrumb.display(
			this.path,
			this.nodes.form.elements.namedItem("name").value
		);
*/
	},

	craftUrl: function(url)
	{
		return url.replace(/_id_/, Backend.Newsletter.Editor.prototype.getCurrentId());
	},

	craftId: function(tabId)
	{
		return tabId + '_' +  Backend.Newsletter.Editor.prototype.getCurrentId() + 'Content'
	},

	getCurrentId: function()
	{
		return Backend.Newsletter.Editor.prototype.__currentId__;
	},

	setCurrentId: function(id)
	{
		Backend.Newsletter.Editor.prototype.__currentId__ = id;
	},

	getInstance: function(id, doInit, path, tabs)
	{
		if(!Backend.Newsletter.Editor.prototype.__instances__[id])
		{
			Backend.Newsletter.Editor.prototype.__instances__[id] = new Backend.Newsletter.Editor(id, path);
		}

		if(doInit !== false)
		{
			Backend.Newsletter.Editor.prototype.__instances__[id].__init__(tabs);
		}

		return Backend.Newsletter.Editor.prototype.__instances__[id];
	},

	hasInstance: function(id)
	{
		return this.__instances__[id] ? true : false;
	},

	showProductForm: function(args)
	{
		this.hideMainContainer();
	},

	cancelForm: function()
	{
		ActiveForm.prototype.resetErrorMessages(this.nodes.form);
		Form.restore(this.nodes.form);
		ActiveForm.prototype.resetTinyMceFields(this.nodes.form);
		this.showMainContainer();
	},

	submitForm: function()
	{
		new LiveCart.AjaxRequest(this.nodes.form, null, this.formSaved.bind(this));
	},

	formSaved: function(responseJSON)
	{
		ActiveForm.prototype.resetErrorMessages(this.nodes.form);
		var responseObject = eval("(" + responseJSON.responseText + ")");
		this.afterSubmitForm(responseObject);
	},

	afterSubmitForm: function(response)
	{
		if(!response.errors || 0 == response.errors.length)
		{
			//Form.State.backup(this.nodes.form);
		}
		else
		{
			ActiveForm.prototype.setErrorMessages(this.nodes.form, response.errors)
		}
	},

	hideMainContainer: function(args)
	{
		Element.hide($("newsletterTabContainer"));
		Element.show($("newsletterManagerContainer"));
	},

	showMainContainer: function(args)
	{
		Element.hide($("newsletterManagerContainer"));
		Element.show($("newsletterTabContainer"));

		// container element height may not be reduced automatically when closing a longer product form,
		// so sometimes extra whitespace remains below the product list
		Backend.LayoutManager.prototype.collapseAll($('pageContentInnerContainer'));
	},

	removeTinyMce: function()
	{
		ActiveForm.prototype.destroyTinyMceFields(this.nodes.parent);
	},

	addTinyMce: function()
	{
		ActiveForm.prototype.initTinyMceFields(this.nodes.parent);
		Backend.Newsletter.Commons.reconfigureTinyMCE(this);
		this.formatChanged(); // update visibility
	}
}

Backend.Newsletter.GridFormatter =
{
	url: '',

	getClassName: function(field, value)
	{

	},

	formatValue: function(field, value, id)
	{
		if ('NewsletterMessage.subject' == field)
		{
			value = '<span>' +
						'<span class="progressIndicator" id="newsletterIndicator_' + id + '" style="display: none;"></span>' +
					'</span>' +
					'<a href="#newsletter_' + id + '" id="newsletter_' + id + '" onclick="Backend.Newsletter.openNewsletter(' + id + ', event); return false;">' +
						value +
					'</a>';
		}

		if ('NewsletterMessage.status' == field)
		{
			value = Backend.getTranslation('_status_' + value);
		}

		return value;
	}
}


Backend.Newsletter.Commons =
{
	formatChanged: function()
	{
		// this.nodes.form
		// this.nodes.format
		// this.tinyMCEChanged
		// this.id

		var
			blocks = $(this.nodes.form).getElementsByClassName("textarea"),
			HTML = 0,
			TEXT = 1,
			i,
			toggleFieldAndLabel = function(block, method)
			{
				block[method]();
				$(block.previous())[method]();
			}

		for (i = 0; i<2; i++)
		{
			blocks[i] = $(blocks[i]);
		}

		switch(parseInt(this.nodes.format.value,10))
		{
			case 1:
				toggleFieldAndLabel(blocks[HTML], "show");
				toggleFieldAndLabel(blocks[TEXT], "show");
				this.tinyMCEChanged({}, {content: tinyMCE.getInstanceById("newsletter__"+this.id+"_html").getContent()}); 				// trigger change event with fake arguments
				break;
				
			case 2:
				toggleFieldAndLabel(blocks[HTML], "show");
				toggleFieldAndLabel(blocks[TEXT], "show");
				break;

			case 3:  // html only
				toggleFieldAndLabel(blocks[HTML], "show");
				toggleFieldAndLabel(blocks[TEXT], "hide");
				break;

			case 4: // plaintext only
				toggleFieldAndLabel(blocks[HTML], "hide");
				toggleFieldAndLabel(blocks[TEXT], "show");
				break;
		}
	},

	tinyMCEChanged: function(ed, l)
	{
		// this.nodes.format
		// this.nodes.shortdes
		// this.nodes.form
		if(parseInt(this.nodes.format.value,10) == 1)
		{
			$(this.nodes.form).getElementsByClassName("tinyMCE")[0].value = l.content;
			new LiveCart.AjaxRequest(Backend.Newsletter.links.plaintext, null,function(transport) {
				var
					responseObject = eval("(" + transport.responseText + ")");
				this.nodes.shortdes.value=responseObject.plaintext;
				}.bind(this),
				{parameters: Form.serialize(this.nodes.form)}
			);
		}
	},

	reconfigureTinyMCE: function(obj)
	{
		var addOnchangeEvent = function()
		{
			mce = tinyMCE.getInstanceById(this.nodes.mceID);
			if(mce)
			{
				mce.onChange.add(this.tinyMCEChanged.bind(this));
				mce.settings.relative_urls = false;
				mce.settings.convert_urls = false;
			}
			else
			{
				window.setTimeout(addOnchangeEvent.bind(this), 1000);
			}
		}.bind(obj);
		
		addOnchangeEvent();
	}
}


/***************************************************
 * library/dhtmlCalendar/calendar.js
 ***************************************************/

/*  Copyright Mihai Bazon, 2002-2005  |  www.bazon.net/mishoo
 * -----------------------------------------------------------
 *
 * The DHTML Calendar, version 1.0 "It is happening again"
 *
 * Details and latest version at:
 * www.dynarch.com/projects/calendar
 *
 * This script is developed by Dynarch.com.  Visit us at www.dynarch.com.
 *
 * This script is distributed under the GNU Lesser General Public License.
 * Read the entire license text here: http://www.gnu.org/licenses/lgpl.html
 */

// $Id: calendar.js,v 1.51 2005/03/07 16:44:31 mishoo Exp $

/** The Calendar object constructor. */
Calendar = function (firstDayOfWeek, dateStr, onSelected, onClose) {
	// member variables
	this.activeDiv = null;
	this.currentDateEl = null;
	this.getDateStatus = null;
	this.getDateToolTip = null;
	this.getDateText = null;
	this.timeout = null;
	this.onSelected = onSelected || null;
	this.onClose = onClose || null;
	this.dragging = false;
	this.hidden = false;
	this.minYear = 1970;
	this.maxYear = 2050;
	this.dateFormat = Calendar._TT["DEF_DATE_FORMAT"];
	this.ttDateFormat = Calendar._TT["TT_DATE_FORMAT"];
	this.isPopup = true;
	this.weekNumbers = true;
	this.firstDayOfWeek = typeof firstDayOfWeek == "number" ? firstDayOfWeek : Calendar._FD; // 0 for Sunday, 1 for Monday, etc.
	this.showsOtherMonths = false;
	this.dateStr = dateStr;
	this.ar_days = null;
	this.showsTime = false;
	this.time24 = true;
	this.yearStep = 2;
	this.hiliteToday = true;
	this.multiple = null;
	// HTML elements
	this.table = null;
	this.element = null;
	this.tbody = null;
	this.firstdayname = null;
	// Combo boxes
	this.monthsCombo = null;
	this.yearsCombo = null;
	this.hilitedMonth = null;
	this.activeMonth = null;
	this.hilitedYear = null;
	this.activeYear = null;
	// Information
	this.dateClicked = false;

	// one-time initializations
	if (typeof Calendar._SDN == "undefined") {
		// table of short day names
		if (typeof Calendar._SDN_len == "undefined")
			Calendar._SDN_len = 3;
		var ar = new Array();
		for (var i = 8; i > 0;) {
			ar[--i] = Calendar._DN[i].substr(0, Calendar._SDN_len);
		}
		Calendar._SDN = ar;
		// table of short month names
		if (typeof Calendar._SMN_len == "undefined")
			Calendar._SMN_len = 3;
		ar = new Array();
		for (var i = 12; i > 0;) {
			ar[--i] = Calendar._MN[i].substr(0, Calendar._SMN_len);
		}
		Calendar._SMN = ar;
	}
};

// ** constants

/// "static", needed for event handlers.
Calendar._C = null;

/// detect a special case of "web browser"
Calendar.is_ie = ( /msie/i.test(navigator.userAgent) &&
		   !/opera/i.test(navigator.userAgent) );

Calendar.is_ie5 = ( Calendar.is_ie && /msie 5\.0/i.test(navigator.userAgent) );

/// detect Opera browser
Calendar.is_opera = /opera/i.test(navigator.userAgent);

/// detect KHTML-based browsers
Calendar.is_khtml = /Konqueror|Safari|KHTML/i.test(navigator.userAgent);

// BEGIN: UTILITY FUNCTIONS; beware that these might be moved into a separate
//		library, at some point.

Calendar.getAbsolutePos = function(el) {
	var SL = 0, ST = 0;
	var is_div = /^div$/i.test(el.tagName);
	if (is_div && el.scrollLeft)
		SL = el.scrollLeft;
	if (is_div && el.scrollTop)
		ST = el.scrollTop;
	var r = { x: el.offsetLeft - SL, y: el.offsetTop - ST };
	if (el.offsetParent) {
		var tmp = this.getAbsolutePos(el.offsetParent);
		r.x += tmp.x;
		r.y += tmp.y;
	}
	return r;
};

Calendar.isRelated = function (el, evt) {
	var related = evt.relatedTarget;
	if (!related) {
		var type = evt.type;
		if (type == "mouseover") {
			related = evt.fromElement;
		} else if (type == "mouseout") {
			related = evt.toElement;
		}
	}
	while (related) {
		if (related == el) {
			return true;
		}
		related = related.parentNode;
	}
	return false;
};

Calendar.removeClass = function(el, className) {
	if (!(el && el.className)) {
		return;
	}
	var cls = el.className.split(" ");
	var ar = new Array();
	for (var i = cls.length; i > 0;) {
		if (cls[--i] != className) {
			ar[ar.length] = cls[i];
		}
	}
	el.className = ar.join(" ");
};

Calendar.addClass = function(el, className) {
	Calendar.removeClass(el, className);
	el.className += " " + className;
};

// FIXME: the following 2 functions totally suck, are useless and should be replaced immediately.
Calendar.getElement = function(ev) {
	var f = Calendar.is_ie ? window.event.srcElement : ev.currentTarget;
	while (f.nodeType != 1 || /^div$/i.test(f.tagName))
		f = f.parentNode;
	return f;
};

Calendar.getTargetElement = function(ev) {
	var f = Calendar.is_ie ? window.event.srcElement : ev.target;
	while (f.nodeType != 1)
		f = f.parentNode;
	return f;
};

Calendar.stopEvent = function(ev) {
	ev || (ev = window.event);
	if (Calendar.is_ie) {
		ev.cancelBubble = true;
		ev.returnValue = false;
	} else {
		ev.preventDefault();
		ev.stopPropagation();
	}
	return false;
};

Calendar.addEvent = function(el, evname, func) {
	if (el.attachEvent) { // IE
		el.attachEvent("on" + evname, func);
	} else if (el.addEventListener) { // Gecko / W3C
		el.addEventListener(evname, func, true);
	} else {
		el["on" + evname] = func;
	}
};

Calendar.removeEvent = function(el, evname, func) {
	if (el.detachEvent) { // IE
		el.detachEvent("on" + evname, func);
	} else if (el.removeEventListener) { // Gecko / W3C
		el.removeEventListener(evname, func, true);
	} else {
		el["on" + evname] = null;
	}
};

Calendar.createElement = function(type, parent) {
	var el = null;
	if (document.createElementNS) {
		// use the XHTML namespace; IE won't normally get here unless
		// _they_ "fix" the DOM2 implementation.
		el = document.createElementNS("http://www.w3.org/1999/xhtml", type);
	} else {
		el = document.createElement(type);
	}
	if (typeof parent != "undefined") {
		parent.appendChild(el);
	}
	return el;
};

// END: UTILITY FUNCTIONS

// BEGIN: CALENDAR STATIC FUNCTIONS

/** Internal -- adds a set of events to make some element behave like a button. */
Calendar._add_evs = function(el) {
	with (Calendar) {
		addEvent(el, "mouseover", dayMouseOver);
		addEvent(el, "mousedown", dayMouseDown);
		addEvent(el, "mouseout", dayMouseOut);
		if (is_ie) {
			addEvent(el, "dblclick", dayMouseDblClick);
			el.setAttribute("unselectable", true);
		}
	}
};

Calendar.findMonth = function(el) {
	if (typeof el.month != "undefined") {
		return el;
	} else if (typeof el.parentNode.month != "undefined") {
		return el.parentNode;
	}
	return null;
};

Calendar.findYear = function(el) {
	if (typeof el.year != "undefined") {
		return el;
	} else if (typeof el.parentNode.year != "undefined") {
		return el.parentNode;
	}
	return null;
};

Calendar.showMonthsCombo = function () {
	var cal = Calendar._C;
	if (!cal) {
		return false;
	}
	var cal = cal;
	var cd = cal.activeDiv;
	var mc = cal.monthsCombo;
	if (cal.hilitedMonth) {
		Calendar.removeClass(cal.hilitedMonth, "hilite");
	}
	if (cal.activeMonth) {
		Calendar.removeClass(cal.activeMonth, "active");
	}
	var mon = cal.monthsCombo.getElementsByTagName("div")[cal.date.getMonth()];
	Calendar.addClass(mon, "active");
	cal.activeMonth = mon;
	var s = mc.style;
	s.display = "block";
	if (cd.navtype < 0)
		s.left = cd.offsetLeft + "px";
	else {
		var mcw = mc.offsetWidth;
		if (typeof mcw == "undefined")
			// Konqueror brain-dead techniques
			mcw = 50;
		s.left = (cd.offsetLeft + cd.offsetWidth - mcw) + "px";
	}
	s.top = (cd.offsetTop + cd.offsetHeight) + "px";
};

Calendar.showYearsCombo = function (fwd) {
	var cal = Calendar._C;
	if (!cal) {
		return false;
	}
	var cal = cal;
	var cd = cal.activeDiv;
	var yc = cal.yearsCombo;
	if (cal.hilitedYear) {
		Calendar.removeClass(cal.hilitedYear, "hilite");
	}
	if (cal.activeYear) {
		Calendar.removeClass(cal.activeYear, "active");
	}
	cal.activeYear = null;
	var Y = cal.date.getFullYear() + (fwd ? 1 : -1);
	var yr = yc.firstChild;
	var show = false;
	for (var i = 12; i > 0; --i) {
		if (Y >= cal.minYear && Y <= cal.maxYear) {
			yr.innerHTML = Y;
			yr.year = Y;
			yr.style.display = "block";
			show = true;
		} else {
			yr.style.display = "none";
		}
		yr = yr.nextSibling;
		Y += fwd ? cal.yearStep : -cal.yearStep;
	}
	if (show) {
		var s = yc.style;
		s.display = "block";
		if (cd.navtype < 0)
			s.left = cd.offsetLeft + "px";
		else {
			var ycw = yc.offsetWidth;
			if (typeof ycw == "undefined")
				// Konqueror brain-dead techniques
				ycw = 50;
			s.left = (cd.offsetLeft + cd.offsetWidth - ycw) + "px";
		}
		s.top = (cd.offsetTop + cd.offsetHeight) + "px";
	}
};

// event handlers

Calendar.tableMouseUp = function(ev) {
	var cal = Calendar._C;
	if (!cal) {
		return false;
	}
	if (cal.timeout) {
		clearTimeout(cal.timeout);
	}
	var el = cal.activeDiv;
	if (!el) {
		return false;
	}
	var target = Calendar.getTargetElement(ev);
	ev || (ev = window.event);
	Calendar.removeClass(el, "active");
	if (target == el || target.parentNode == el) {
		Calendar.cellClick(el, ev);
	}
	var mon = Calendar.findMonth(target);
	var date = null;
	if (mon) {
		date = new Date(cal.date);
		if (mon.month != date.getMonth()) {
			date.setMonth(mon.month);
			cal.setDate(date);
			cal.dateClicked = false;
			cal.callHandler();
		}
	} else {
		var year = Calendar.findYear(target);
		if (year) {
			date = new Date(cal.date);
			if (year.year != date.getFullYear()) {
				date.setFullYear(year.year);
				cal.setDate(date);
				cal.dateClicked = false;
				cal.callHandler();
			}
		}
	}
	with (Calendar) {
		removeEvent(document, "mouseup", tableMouseUp);
		removeEvent(document, "mouseover", tableMouseOver);
		removeEvent(document, "mousemove", tableMouseOver);
		cal._hideCombos();
		_C = null;
		return stopEvent(ev);
	}
};

Calendar.tableMouseOver = function (ev) {
	var cal = Calendar._C;
	if (!cal) {
		return;
	}
	var el = cal.activeDiv;
	var target = Calendar.getTargetElement(ev);
	if (target == el || target.parentNode == el) {
		Calendar.addClass(el, "hilite active");
		Calendar.addClass(el.parentNode, "rowhilite");
	} else {
		if (typeof el.navtype == "undefined" || (el.navtype != 50 && (el.navtype == 0 || Math.abs(el.navtype) > 2)))
			Calendar.removeClass(el, "active");
		Calendar.removeClass(el, "hilite");
		Calendar.removeClass(el.parentNode, "rowhilite");
	}
	ev || (ev = window.event);
	if (el.navtype == 50 && target != el) {
		var pos = Calendar.getAbsolutePos(el);
		var w = el.offsetWidth;
		var x = ev.clientX;
		var dx;
		var decrease = true;
		if (x > pos.x + w) {
			dx = x - pos.x - w;
			decrease = false;
		} else
			dx = pos.x - x;

		if (dx < 0) dx = 0;
		var range = el._range;
		var current = el._current;
		var count = Math.floor(dx / 10) % range.length;
		for (var i = range.length; --i >= 0;)
			if (range[i] == current)
				break;
		while (count-- > 0)
			if (decrease) {
				if (--i < 0)
					i = range.length - 1;
			} else if ( ++i >= range.length )
				i = 0;
		var newval = range[i];
		el.innerHTML = newval;

		cal.onUpdateTime();
	}
	var mon = Calendar.findMonth(target);
	if (mon) {
		if (mon.month != cal.date.getMonth()) {
			if (cal.hilitedMonth) {
				Calendar.removeClass(cal.hilitedMonth, "hilite");
			}
			Calendar.addClass(mon, "hilite");
			cal.hilitedMonth = mon;
		} else if (cal.hilitedMonth) {
			Calendar.removeClass(cal.hilitedMonth, "hilite");
		}
	} else {
		if (cal.hilitedMonth) {
			Calendar.removeClass(cal.hilitedMonth, "hilite");
		}
		var year = Calendar.findYear(target);
		if (year) {
			if (year.year != cal.date.getFullYear()) {
				if (cal.hilitedYear) {
					Calendar.removeClass(cal.hilitedYear, "hilite");
				}
				Calendar.addClass(year, "hilite");
				cal.hilitedYear = year;
			} else if (cal.hilitedYear) {
				Calendar.removeClass(cal.hilitedYear, "hilite");
			}
		} else if (cal.hilitedYear) {
			Calendar.removeClass(cal.hilitedYear, "hilite");
		}
	}
	return Calendar.stopEvent(ev);
};

Calendar.tableMouseDown = function (ev) {
	if (Calendar.getTargetElement(ev) == Calendar.getElement(ev)) {
		return Calendar.stopEvent(ev);
	}
};

Calendar.calDragIt = function (ev) {
	var cal = Calendar._C;
	if (!(cal && cal.dragging)) {
		return false;
	}
	var posX;
	var posY;
	if (Calendar.is_ie) {
		posY = window.event.clientY + document.body.scrollTop;
		posX = window.event.clientX + document.body.scrollLeft;
	} else {
		posX = ev.pageX;
		posY = ev.pageY;
	}
	cal.hideShowCovered();
	var st = cal.element.style;
	st.left = (posX - cal.xOffs) + "px";
	st.top = (posY - cal.yOffs) + "px";
	return Calendar.stopEvent(ev);
};

Calendar.calDragEnd = function (ev) {
	var cal = Calendar._C;
	if (!cal) {
		return false;
	}
	cal.dragging = false;
	with (Calendar) {
		removeEvent(document, "mousemove", calDragIt);
		removeEvent(document, "mouseup", calDragEnd);
		tableMouseUp(ev);
	}
	cal.hideShowCovered();
};

Calendar.dayMouseDown = function(ev) {
	var el = Calendar.getElement(ev);
	if (el.disabled) {
		return false;
	}
	var cal = el.calendar;
	cal.activeDiv = el;
	Calendar._C = cal;
	if (el.navtype != 300) with (Calendar) {
		if (el.navtype == 50) {
			el._current = el.innerHTML;
			addEvent(document, "mousemove", tableMouseOver);
		} else
			addEvent(document, Calendar.is_ie5 ? "mousemove" : "mouseover", tableMouseOver);
		addClass(el, "hilite active");
		addEvent(document, "mouseup", tableMouseUp);
	} else if (cal.isPopup) {
		cal._dragStart(ev);
	}
	if (el.navtype == -1 || el.navtype == 1) {
		if (cal.timeout) clearTimeout(cal.timeout);
		cal.timeout = setTimeout("Calendar.showMonthsCombo()", 250);
	} else if (el.navtype == -2 || el.navtype == 2) {
		if (cal.timeout) clearTimeout(cal.timeout);
		cal.timeout = setTimeout((el.navtype > 0) ? "Calendar.showYearsCombo(true)" : "Calendar.showYearsCombo(false)", 250);
	} else {
		cal.timeout = null;
	}
	return Calendar.stopEvent(ev);
};

Calendar.dayMouseDblClick = function(ev) {
	Calendar.cellClick(Calendar.getElement(ev), ev || window.event);
	if (Calendar.is_ie) {
		document.selection.empty();
	}
};

Calendar.dayMouseOver = function(ev) {
	var el = Calendar.getElement(ev);
	if (Calendar.isRelated(el, ev) || Calendar._C || el.disabled) {
		return false;
	}
	if (el.ttip) {
		if (el.ttip.substr(0, 1) == "_") {
			el.ttip = el.caldate.print(el.calendar.ttDateFormat) + el.ttip.substr(1);
		}
		el.calendar.tooltips.innerHTML = el.ttip;
	}
	if (el.navtype != 300) {
		Calendar.addClass(el, "hilite");
		if (el.caldate) {
			Calendar.addClass(el.parentNode, "rowhilite");
		}
	}
	return Calendar.stopEvent(ev);
};

Calendar.dayMouseOut = function(ev) {
	with (Calendar) {
		var el = getElement(ev);
		if (isRelated(el, ev) || _C || el.disabled)
			return false;
		removeClass(el, "hilite");
		if (el.caldate)
			removeClass(el.parentNode, "rowhilite");
		if (el.calendar)
			el.calendar.tooltips.innerHTML = _TT["SEL_DATE"];
		return stopEvent(ev);
	}
};

/**
 *  A generic "click" handler :) handles all types of buttons defined in this
 *  calendar.
 */
Calendar.cellClick = function(el, ev) {
	var cal = el.calendar;
	var closing = false;
	var newdate = false;
	var date = null;
	if (typeof el.navtype == "undefined") {
		if (cal.currentDateEl) {
			Calendar.removeClass(cal.currentDateEl, "selected");
			Calendar.addClass(el, "selected");
			closing = (cal.currentDateEl == el);
			if (!closing) {
				cal.currentDateEl = el;
			}
		}
		cal.date.setDateOnly(el.caldate);
		date = cal.date;
		var other_month = !(cal.dateClicked = !el.otherMonth);
		if (!other_month && !cal.currentDateEl)
			cal._toggleMultipleDate(new Date(date));
		else
			newdate = !el.disabled;
		// a date was clicked
		if (other_month)
			cal._init(cal.firstDayOfWeek, date);
	} else {
		if (el.navtype == 200) {
			Calendar.removeClass(el, "hilite");
			cal.callCloseHandler();
			return;
		}
		date = new Date(cal.date);
		if (el.navtype == 0)
			date.setDateOnly(new Date()); // TODAY
		// unless "today" was clicked, we assume no date was clicked so
		// the selected handler will know not to close the calenar when
		// in single-click mode.
		// cal.dateClicked = (el.navtype == 0);
		cal.dateClicked = false;
		var year = date.getFullYear();
		var mon = date.getMonth();
		function setMonth(m) {
			var day = date.getDate();
			var max = date.getMonthDays(m);
			if (day > max) {
				date.setDate(max);
			}
			date.setMonth(m);
		};
		switch (el.navtype) {
			case 400:
			Calendar.removeClass(el, "hilite");
			var text = Calendar._TT["ABOUT"];
			if (typeof text != "undefined") {
				text += cal.showsTime ? Calendar._TT["ABOUT_TIME"] : "";
			} else {
				// FIXME: this should be removed as soon as lang files get updated!
				text = "Help and about box text is not translated into this language.\n" +
					"If you know this language and you feel generous please update\n" +
					"the corresponding file in \"lang\" subdir to match calendar-en.js\n" +
					"and send it back to <mihai_bazon@yahoo.com> to get it into the distribution  ;-)\n\n" +
					"Thank you!\n" +
					"http://dynarch.com/mishoo/calendar.epl\n";
			}
			alert(text);
			return;
			case -2:
			if (year > cal.minYear) {
				date.setFullYear(year - 1);
			}
			break;
			case -1:
			if (mon > 0) {
				setMonth(mon - 1);
			} else if (year-- > cal.minYear) {
				date.setFullYear(year);
				setMonth(11);
			}
			break;
			case 1:
			if (mon < 11) {
				setMonth(mon + 1);
			} else if (year < cal.maxYear) {
				date.setFullYear(year + 1);
				setMonth(0);
			}
			break;
			case 2:
			if (year < cal.maxYear) {
				date.setFullYear(year + 1);
			}
			break;
			case 100:
			cal.setFirstDayOfWeek(el.fdow);
			return;
			case 50:
			var range = el._range;
			var current = el.innerHTML;
			for (var i = range.length; --i >= 0;)
				if (range[i] == current)
					break;
			if (ev && ev.shiftKey) {
				if (--i < 0)
					i = range.length - 1;
			} else if ( ++i >= range.length )
				i = 0;
			var newval = range[i];
			el.innerHTML = newval;
			cal.onUpdateTime();
			return;
			case 0:
			// TODAY will bring us here
			if ((typeof cal.getDateStatus == "function") &&
				cal.getDateStatus(date, date.getFullYear(), date.getMonth(), date.getDate())) {
				return false;
			}
			break;
		}
		if (!date.equalsTo(cal.date)) {
			cal.setDate(date);
			newdate = true;
		} else if (el.navtype == 0)
			newdate = closing = true;
	}
	if (newdate) {
		ev && cal.callHandler();
	}
	if (closing) {
		Calendar.removeClass(el, "hilite");
		ev && cal.callCloseHandler();
	}
};

// END: CALENDAR STATIC FUNCTIONS

// BEGIN: CALENDAR OBJECT FUNCTIONS

/**
 *  This function creates the calendar inside the given parent.  If _par is
 *  null than it creates a popup calendar inside the BODY element.  If _par is
 *  an element, be it BODY, then it creates a non-popup calendar (still
 *  hidden).  Some properties need to be set before calling this function.
 */
Calendar.prototype.create = function (_par) {
	var parent = null;
	if (! _par) {
		// default parent is the document body, in which case we create
		// a popup calendar.
		parent = document.getElementsByTagName("body")[0];
		this.isPopup = true;
	} else {
		parent = _par;
		this.isPopup = false;
	}
	this.date = this.dateStr ? new Date(this.dateStr) : new Date();

	var table = Calendar.createElement("table");
	this.table = table;
	table.cellSpacing = 0;
	table.cellPadding = 0;
	table.calendar = this;
	Calendar.addEvent(table, "mousedown", Calendar.tableMouseDown);

	var div = Calendar.createElement("div");
	this.element = div;
	div.className = "calendar";
	if (this.isPopup) {
		div.style.position = "absolute";
		div.style.display = "none";
	}
	div.appendChild(table);

	var thead = Calendar.createElement("thead", table);
	var cell = null;
	var row = null;

	var cal = this;
	var hh = function (text, cs, navtype) {
		cell = Calendar.createElement("td", row);
		cell.colSpan = cs;
		cell.className = "button";
		if (navtype != 0 && Math.abs(navtype) <= 2)
			cell.className += " nav";
		Calendar._add_evs(cell);
		cell.calendar = cal;
		cell.navtype = navtype;
		cell.innerHTML = "<div unselectable='on'>" + text + "</div>";
		return cell;
	};

	row = Calendar.createElement("tr", thead);
	var title_length = 6;
	(this.isPopup) && --title_length;
	(this.weekNumbers) && ++title_length;

	hh("?", 1, 400).ttip = Calendar._TT["INFO"];
	this.title = hh("", title_length, 300);
	this.title.className = "title";
	if (this.isPopup) {
		this.title.ttip = Calendar._TT["DRAG_TO_MOVE"];
		this.title.style.cursor = "move";
		hh("&#x00d7;", 1, 200).ttip = Calendar._TT["CLOSE"];
	}

	row = Calendar.createElement("tr", thead);
	row.className = "headrow";

	this._nav_py = hh("&#x00ab;", 1, -2);
	this._nav_py.ttip = Calendar._TT["PREV_YEAR"];

	this._nav_pm = hh("&#x2039;", 1, -1);
	this._nav_pm.ttip = Calendar._TT["PREV_MONTH"];

	this._nav_now = hh(Calendar._TT["TODAY"], this.weekNumbers ? 4 : 3, 0);
	this._nav_now.ttip = Calendar._TT["GO_TODAY"];

	this._nav_nm = hh("&#x203a;", 1, 1);
	this._nav_nm.ttip = Calendar._TT["NEXT_MONTH"];

	this._nav_ny = hh("&#x00bb;", 1, 2);
	this._nav_ny.ttip = Calendar._TT["NEXT_YEAR"];

	// day names
	row = Calendar.createElement("tr", thead);
	row.className = "daynames";
	if (this.weekNumbers) {
		cell = Calendar.createElement("td", row);
		cell.className = "name wn";
		cell.innerHTML = Calendar._TT["WK"];
	}
	for (var i = 7; i > 0; --i) {
		cell = Calendar.createElement("td", row);
		if (!i) {
			cell.navtype = 100;
			cell.calendar = this;
			Calendar._add_evs(cell);
		}
	}
	this.firstdayname = (this.weekNumbers) ? row.firstChild.nextSibling : row.firstChild;
	this._displayWeekdays();

	var tbody = Calendar.createElement("tbody", table);
	this.tbody = tbody;

	for (i = 6; i > 0; --i) {
		row = Calendar.createElement("tr", tbody);
		if (this.weekNumbers) {
			cell = Calendar.createElement("td", row);
		}
		for (var j = 7; j > 0; --j) {
			cell = Calendar.createElement("td", row);
			cell.calendar = this;
			Calendar._add_evs(cell);
		}
	}

	if (this.showsTime) {
		row = Calendar.createElement("tr", tbody);
		row.className = "time";

		cell = Calendar.createElement("td", row);
		cell.className = "time";
		cell.colSpan = 2;
		cell.innerHTML = Calendar._TT["TIME"] || "&nbsp;";

		cell = Calendar.createElement("td", row);
		cell.className = "time";
		cell.colSpan = this.weekNumbers ? 4 : 3;

		(function(){
			function makeTimePart(className, init, range_start, range_end) {
				var part = Calendar.createElement("span", cell);
				part.className = className;
				part.innerHTML = init;
				part.calendar = cal;
				part.ttip = Calendar._TT["TIME_PART"];
				part.navtype = 50;
				part._range = [];
				if (typeof range_start != "number")
					part._range = range_start;
				else {
					for (var i = range_start; i <= range_end; ++i) {
						var txt;
						if (i < 10 && range_end >= 10) txt = '0' + i;
						else txt = '' + i;
						part._range[part._range.length] = txt;
					}
				}
				Calendar._add_evs(part);
				return part;
			};
			var hrs = cal.date.getHours();
			var mins = cal.date.getMinutes();
			var t12 = !cal.time24;
			var pm = (hrs > 12);
			if (t12 && pm) hrs -= 12;
			var H = makeTimePart("hour", hrs, t12 ? 1 : 0, t12 ? 12 : 23);
			var span = Calendar.createElement("span", cell);
			span.innerHTML = ":";
			span.className = "colon";
			var M = makeTimePart("minute", mins, 0, 59);
			var AP = null;
			cell = Calendar.createElement("td", row);
			cell.className = "time";
			cell.colSpan = 2;
			if (t12)
				AP = makeTimePart("ampm", pm ? "pm" : "am", ["am", "pm"]);
			else
				cell.innerHTML = "&nbsp;";

			cal.onSetTime = function() {
				var pm, hrs = this.date.getHours(),
					mins = this.date.getMinutes();
				if (t12) {
					pm = (hrs >= 12);
					if (pm) hrs -= 12;
					if (hrs == 0) hrs = 12;
					AP.innerHTML = pm ? "pm" : "am";
				}
				H.innerHTML = (hrs < 10) ? ("0" + hrs) : hrs;
				M.innerHTML = (mins < 10) ? ("0" + mins) : mins;
			};

			cal.onUpdateTime = function() {
				var date = this.date;
				var h = parseInt(H.innerHTML, 10);
				if (t12) {
					if (/pm/i.test(AP.innerHTML) && h < 12)
						h += 12;
					else if (/am/i.test(AP.innerHTML) && h == 12)
						h = 0;
				}
				var d = date.getDate();
				var m = date.getMonth();
				var y = date.getFullYear();
				date.setHours(h);
				date.setMinutes(parseInt(M.innerHTML, 10));
				date.setFullYear(y);
				date.setMonth(m);
				date.setDate(d);
				this.dateClicked = false;
				this.callHandler();
			};
		})();
	} else {
		this.onSetTime = this.onUpdateTime = function() {};
	}

	var tfoot = Calendar.createElement("tfoot", table);

	row = Calendar.createElement("tr", tfoot);
	row.className = "footrow";

	cell = hh(Calendar._TT["SEL_DATE"], this.weekNumbers ? 8 : 7, 300);
	cell.className = "ttip";
	if (this.isPopup) {
		cell.ttip = Calendar._TT["DRAG_TO_MOVE"];
		cell.style.cursor = "move";
	}
	this.tooltips = cell;

	div = Calendar.createElement("div", this.element);
	this.monthsCombo = div;
	div.className = "combo";
	for (i = 0; i < Calendar._MN.length; ++i) {
		var mn = Calendar.createElement("div");
		mn.className = Calendar.is_ie ? "label-IEfix" : "label";
		mn.month = i;
		mn.innerHTML = Calendar._SMN[i];
		div.appendChild(mn);
	}

	div = Calendar.createElement("div", this.element);
	this.yearsCombo = div;
	div.className = "combo";
	for (i = 12; i > 0; --i) {
		var yr = Calendar.createElement("div");
		yr.className = Calendar.is_ie ? "label-IEfix" : "label";
		div.appendChild(yr);
	}

	this._init(this.firstDayOfWeek, this.date);
	parent.appendChild(this.element);
};

/** keyboard navigation, only for popup calendars */
Calendar._keyEvent = function(ev) {
	var cal = window._dynarch_popupCalendar;
	if (!cal || cal.multiple)
		return false;
	(Calendar.is_ie) && (ev = window.event);
	var act = (Calendar.is_ie || ev.type == "keypress"),
		K = ev.keyCode;
	if (ev.ctrlKey) {
		switch (K) {
			case 37: // KEY left
			act && Calendar.cellClick(cal._nav_pm);
			break;
			case 38: // KEY up
			act && Calendar.cellClick(cal._nav_py);
			break;
			case 39: // KEY right
			act && Calendar.cellClick(cal._nav_nm);
			break;
			case 40: // KEY down
			act && Calendar.cellClick(cal._nav_ny);
			break;
			default:
			return false;
		}
	} else switch (K) {
		case 32: // KEY space (now)
		Calendar.cellClick(cal._nav_now);
		break;
		case 27: // KEY esc
		act && cal.callCloseHandler();
		break;
		case 37: // KEY left
		case 38: // KEY up
		case 39: // KEY right
		case 40: // KEY down
		if (act) {
			var prev, x, y, ne, el, step;
			prev = K == 37 || K == 38;
			step = (K == 37 || K == 39) ? 1 : 7;
			function setVars() {
				el = cal.currentDateEl;
				var p = el.pos;
				x = p & 15;
				y = p >> 4;
				ne = cal.ar_days[y][x];
			};setVars();
			function prevMonth() {
				var date = new Date(cal.date);
				date.setDate(date.getDate() - step);
				cal.setDate(date);
			};
			function nextMonth() {
				var date = new Date(cal.date);
				date.setDate(date.getDate() + step);
				cal.setDate(date);
			};
			while (1) {
				switch (K) {
					case 37: // KEY left
					if (--x >= 0)
						ne = cal.ar_days[y][x];
					else {
						x = 6;
						K = 38;
						continue;
					}
					break;
					case 38: // KEY up
					if (--y >= 0)
						ne = cal.ar_days[y][x];
					else {
						prevMonth();
						setVars();
					}
					break;
					case 39: // KEY right
					if (++x < 7)
						ne = cal.ar_days[y][x];
					else {
						x = 0;
						K = 40;
						continue;
					}
					break;
					case 40: // KEY down
					if (++y < cal.ar_days.length)
						ne = cal.ar_days[y][x];
					else {
						nextMonth();
						setVars();
					}
					break;
				}
				break;
			}
			if (ne) {
				if (!ne.disabled)
					Calendar.cellClick(ne);
				else if (prev)
					prevMonth();
				else
					nextMonth();
			}
		}
		break;
		case 13: // KEY enter
		if (act)
			Calendar.cellClick(cal.currentDateEl, ev);
		break;
		default:
		return false;
	}
	return Calendar.stopEvent(ev);
};

/**
 *  (RE)Initializes the calendar to the given date and firstDayOfWeek
 */
Calendar.prototype._init = function (firstDayOfWeek, date) {
	var today = new Date(),
		TY = today.getFullYear(),
		TM = today.getMonth(),
		TD = today.getDate();
	this.table.style.visibility = "hidden";
	var year = date.getFullYear();
	if (year < this.minYear) {
		year = this.minYear;
		date.setFullYear(year);
	} else if (year > this.maxYear) {
		year = this.maxYear;
		date.setFullYear(year);
	}
	this.firstDayOfWeek = firstDayOfWeek;
	this.date = new Date(date);
	var month = date.getMonth();
	var mday = date.getDate();
	var no_days = date.getMonthDays();

	// calendar voodoo for computing the first day that would actually be
	// displayed in the calendar, even if it's from the previous month.
	// WARNING: this is magic. ;-)
	date.setDate(1);
	var day1 = (date.getDay() - this.firstDayOfWeek) % 7;
	if (day1 < 0)
		day1 += 7;
	date.setDate(-day1);
	date.setDate(date.getDate() + 1);

	var row = this.tbody.firstChild;
	var MN = Calendar._SMN[month];
	var ar_days = this.ar_days = new Array();
	var weekend = Calendar._TT["WEEKEND"];
	var dates = this.multiple ? (this.datesCells = {}) : null;
	for (var i = 0; i < 6; ++i, row = row.nextSibling) {
		var cell = row.firstChild;
		if (this.weekNumbers) {
			cell.className = "day wn";
			cell.innerHTML = date.getWeekNumber();
			cell = cell.nextSibling;
		}
		row.className = "daysrow";
		var hasdays = false, iday, dpos = ar_days[i] = [];
		for (var j = 0; j < 7; ++j, cell = cell.nextSibling, date.setDate(iday + 1)) {
			iday = date.getDate();
			var wday = date.getDay();
			cell.className = "day";
			cell.pos = i << 4 | j;
			dpos[j] = cell;
			var current_month = (date.getMonth() == month);
			if (!current_month) {
				if (this.showsOtherMonths) {
					cell.className += " othermonth";
					cell.otherMonth = true;
				} else {
					cell.className = "emptycell";
					cell.innerHTML = "&nbsp;";
					cell.disabled = true;
					continue;
				}
			} else {
				cell.otherMonth = false;
				hasdays = true;
			}
			cell.disabled = false;
			cell.innerHTML = this.getDateText ? this.getDateText(date, iday) : iday;
			if (dates)
				dates[date.print("%Y%m%d")] = cell;
			if (this.getDateStatus) {
				var status = this.getDateStatus(date, year, month, iday);
				if (this.getDateToolTip) {
					var toolTip = this.getDateToolTip(date, year, month, iday);
					if (toolTip)
						cell.title = toolTip;
				}
				if (status === true) {
					cell.className += " disabled";
					cell.disabled = true;
				} else {
					if (/disabled/i.test(status))
						cell.disabled = true;
					cell.className += " " + status;
				}
			}
			if (!cell.disabled) {
				cell.caldate = new Date(date);
				cell.ttip = "_";
				if (!this.multiple && current_month
					&& iday == mday && this.hiliteToday) {
					cell.className += " selected";
					this.currentDateEl = cell;
				}
				if (date.getFullYear() == TY &&
					date.getMonth() == TM &&
					iday == TD) {
					cell.className += " today";
					cell.ttip += Calendar._TT["PART_TODAY"];
				}
				if (weekend.indexOf(wday.toString()) != -1)
					cell.className += cell.otherMonth ? " oweekend" : " weekend";
			}
		}
		if (!(hasdays || this.showsOtherMonths))
			row.className = "emptyrow";
	}
	this.title.innerHTML = Calendar._MN[month] + ", " + year;
	this.onSetTime();
	this.table.style.visibility = "visible";
	this._initMultipleDates();
	// PROFILE
	// this.tooltips.innerHTML = "Generated in " + ((new Date()) - today) + " ms";
};

Calendar.prototype._initMultipleDates = function() {
	if (this.multiple) {
		for (var i in this.multiple) {
			var cell = this.datesCells[i];
			var d = this.multiple[i];
			if (!d)
				continue;
			if (cell)
				cell.className += " selected";
		}
	}
};

Calendar.prototype._toggleMultipleDate = function(date) {
	if (this.multiple) {
		var ds = date.print("%Y%m%d");
		var cell = this.datesCells[ds];
		if (cell) {
			var d = this.multiple[ds];
			if (!d) {
				Calendar.addClass(cell, "selected");
				this.multiple[ds] = date;
			} else {
				Calendar.removeClass(cell, "selected");
				delete this.multiple[ds];
			}
		}
	}
};

Calendar.prototype.setDateToolTipHandler = function (unaryFunction) {
	this.getDateToolTip = unaryFunction;
};

/**
 *  Calls _init function above for going to a certain date (but only if the
 *  date is different than the currently selected one).
 */
Calendar.prototype.setDate = function (date) {
	if (!date.equalsTo(this.date)) {
		this._init(this.firstDayOfWeek, date);
	}
};

/**
 *  Refreshes the calendar.  Useful if the "disabledHandler" function is
 *  dynamic, meaning that the list of disabled date can change at runtime.
 *  Just * call this function if you think that the list of disabled dates
 *  should * change.
 */
Calendar.prototype.refresh = function () {
	this._init(this.firstDayOfWeek, this.date);
};

/** Modifies the "firstDayOfWeek" parameter (pass 0 for Synday, 1 for Monday, etc.). */
Calendar.prototype.setFirstDayOfWeek = function (firstDayOfWeek) {
	this._init(firstDayOfWeek, this.date);
	this._displayWeekdays();
};

/**
 *  Allows customization of what dates are enabled.  The "unaryFunction"
 *  parameter must be a function object that receives the date (as a JS Date
 *  object) and returns a boolean value.  If the returned value is true then
 *  the passed date will be marked as disabled.
 */
Calendar.prototype.setDateStatusHandler = Calendar.prototype.setDisabledHandler = function (unaryFunction) {
	this.getDateStatus = unaryFunction;
};

/** Customization of allowed year range for the calendar. */
Calendar.prototype.setRange = function (a, z) {
	this.minYear = a;
	this.maxYear = z;
};

/** Calls the first user handler (selectedHandler). */
Calendar.prototype.callHandler = function () {
	if (this.onSelected) {
		this.onSelected(this, this.date.print(this.dateFormat));
	}
};

/** Calls the second user handler (closeHandler). */
Calendar.prototype.callCloseHandler = function () {
	if (this.onClose) {
		this.onClose(this);
	}
	this.hideShowCovered();
};

/** Removes the calendar object from the DOM tree and destroys it. */
Calendar.prototype.destroy = function () {
	var el = this.element.parentNode;
	el.removeChild(this.element);
	Calendar._C = null;
	window._dynarch_popupCalendar = null;
};

/**
 *  Moves the calendar element to a different section in the DOM tree (changes
 *  its parent).
 */
Calendar.prototype.reparent = function (new_parent) {
	var el = this.element;
	el.parentNode.removeChild(el);
	new_parent.appendChild(el);
};

// This gets called when the user presses a mouse button anywhere in the
// document, if the calendar is shown.  If the click was outside the open
// calendar this function closes it.
Calendar._checkCalendar = function(ev) {
	var calendar = window._dynarch_popupCalendar;
	if (!calendar) {
		return false;
	}
	var el = Calendar.is_ie ? Calendar.getElement(ev) : Calendar.getTargetElement(ev);
	for (; el != null && el != calendar.element; el = el.parentNode);
	if (el == null) {
		// calls closeHandler which should hide the calendar.
		window._dynarch_popupCalendar.callCloseHandler();
		return Calendar.stopEvent(ev);
	}
};

/** Shows the calendar. */
Calendar.prototype.show = function () {
	var rows = this.table.getElementsByTagName("tr");
	for (var i = rows.length; i > 0;) {
		var row = rows[--i];
		Calendar.removeClass(row, "rowhilite");
		var cells = row.getElementsByTagName("td");
		for (var j = cells.length; j > 0;) {
			var cell = cells[--j];
			Calendar.removeClass(cell, "hilite");
			Calendar.removeClass(cell, "active");
		}
	}
	this.element.style.display = "block";
	this.hidden = false;
	if (this.isPopup) {
		window._dynarch_popupCalendar = this;
		Calendar.addEvent(document, "keydown", Calendar._keyEvent);
		Calendar.addEvent(document, "keypress", Calendar._keyEvent);
		Calendar.addEvent(document, "mousedown", Calendar._checkCalendar);
	}
	this.hideShowCovered();
};

/**
 *  Hides the calendar.  Also removes any "hilite" from the class of any TD
 *  element.
 */
Calendar.prototype.hide = function () {
	if (this.isPopup) {
		Calendar.removeEvent(document, "keydown", Calendar._keyEvent);
		Calendar.removeEvent(document, "keypress", Calendar._keyEvent);
		Calendar.removeEvent(document, "mousedown", Calendar._checkCalendar);
	}
	this.element.style.display = "none";
	this.hidden = true;
	this.hideShowCovered();
};

/**
 *  Shows the calendar at a given absolute position (beware that, depending on
 *  the calendar element style -- position property -- this might be relative
 *  to the parent's containing rectangle).
 */
Calendar.prototype.showAt = function (x, y) {
	var s = this.element.style;
	s.left = x + "px";
	s.top = y + "px";
	this.show();
};

/** Shows the calendar near a given element. */
Calendar.prototype.showAtElement = function (el, opts) {
	var self = this;
	var p = Calendar.getAbsolutePos(el);
	if (!opts || typeof opts != "string") {
		this.showAt(p.x, p.y + el.offsetHeight);
		return true;
	}
	function fixPosition(box) {
		if (box.x < 0)
			box.x = 0;
		if (box.y < 0)
			box.y = 0;
		var cp = document.createElement("div");
		var s = cp.style;
		s.position = "absolute";
		s.right = s.bottom = s.width = s.height = "0px";
		document.body.appendChild(cp);
		var br = Calendar.getAbsolutePos(cp);
		document.body.removeChild(cp);
		if (Calendar.is_ie) {
			br.y += document.body.scrollTop;
			br.x += document.body.scrollLeft;
		} else {
			br.y += window.pageYOffset;
			br.x += window.pageXOffset;
		}
		
		var tmp = box.x + box.width - br.x;
		if (tmp > 0) box.x -= tmp;
		tmp = box.y + box.height - br.y;
		if (tmp > 0) box.y -= tmp;
	};
	this.element.style.display = "block";
	Calendar.continuation_for_the_fucking_khtml_browser = function() {
		var w = self.element.offsetWidth;
		var h = self.element.offsetHeight;
		self.element.style.display = "none";
		var valign = opts.substr(0, 1);
		var halign = "l";
		if (opts.length > 1) {
			halign = opts.substr(1, 1);
		}
		// vertical alignment
		switch (valign) {
			case "T": p.y -= h; break;
			case "B": p.y += el.offsetHeight; break;
			case "C": p.y += (el.offsetHeight - h) / 2; break;
			case "t": p.y += el.offsetHeight - h; break;
			case "b": break; // already there
		}
		// horizontal alignment
		switch (halign) {
			case "L": p.x -= w; break;
			case "R": p.x += el.offsetWidth; break;
			case "C": p.x += (el.offsetWidth - w) / 2; break;
			case "l": p.x += el.offsetWidth - w; break;
			case "r": break; // already there
		}
		p.width = w;
		p.height = h + 40;
		self.monthsCombo.style.display = "none";
		fixPosition(p);
		self.showAt(p.x, p.y);
	};
	if (Calendar.is_khtml)
		setTimeout("Calendar.continuation_for_the_fucking_khtml_browser()", 10);
	else
		Calendar.continuation_for_the_fucking_khtml_browser();
};

/** Customizes the date format. */
Calendar.prototype.setDateFormat = function (str) {
	this.dateFormat = str;
};

/** Customizes the tooltip date format. */
Calendar.prototype.setTtDateFormat = function (str) {
	this.ttDateFormat = str;
};

/**
 *  Tries to identify the date represented in a string.  If successful it also
 *  calls this.setDate which moves the calendar to the given date.
 */
Calendar.prototype.parseDate = function(str, fmt) {
	if (!fmt)
		fmt = this.dateFormat;
	this.setDate(Date.parseDate(str, fmt));
};

Calendar.prototype.hideShowCovered = function () {
	if (!Calendar.is_ie && !Calendar.is_opera)
		return;
	function getVisib(obj){
		var value = obj.style.visibility;
		if (!value) {
			if (document.defaultView && typeof (document.defaultView.getComputedStyle) == "function") { // Gecko, W3C
				if (!Calendar.is_khtml)
					value = document.defaultView.
						getComputedStyle(obj, "").getPropertyValue("visibility");
				else
					value = '';
			} else if (obj.currentStyle) { // IE
				value = obj.currentStyle.visibility;
			} else
				value = '';
		}
		return value;
	};

	var tags = new Array("applet", "iframe", "select");
	var el = this.element;

	var p = Calendar.getAbsolutePos(el);
	var EX1 = p.x;
	var EX2 = el.offsetWidth + EX1;
	var EY1 = p.y;
	var EY2 = el.offsetHeight + EY1;

	for (var k = tags.length; k > 0; ) {
		var ar = document.getElementsByTagName(tags[--k]);
		var cc = null;

		for (var i = ar.length; i > 0;) {
			cc = ar[--i];

			p = Calendar.getAbsolutePos(cc);
			var CX1 = p.x;
			var CX2 = cc.offsetWidth + CX1;
			var CY1 = p.y;
			var CY2 = cc.offsetHeight + CY1;

			if (this.hidden || (CX1 > EX2) || (CX2 < EX1) || (CY1 > EY2) || (CY2 < EY1)) {
				if (!cc.__msh_save_visibility) {
					cc.__msh_save_visibility = getVisib(cc);
				}
				cc.style.visibility = cc.__msh_save_visibility;
			} else {
				if (!cc.__msh_save_visibility) {
					cc.__msh_save_visibility = getVisib(cc);
				}
				cc.style.visibility = "hidden";
			}
		}
	}
};

/** Internal function; it displays the bar with the names of the weekday. */
Calendar.prototype._displayWeekdays = function () {
	var fdow = this.firstDayOfWeek;
	var cell = this.firstdayname;
	var weekend = Calendar._TT["WEEKEND"];
	for (var i = 0; i < 7; ++i) {
		cell.className = "day name";
		var realday = (i + fdow) % 7;
		if (i) {
			cell.ttip = Calendar._TT["DAY_FIRST"].replace("%s", Calendar._DN[realday]);
			cell.navtype = 100;
			cell.calendar = this;
			cell.fdow = realday;
			Calendar._add_evs(cell);
		}
		if (weekend.indexOf(realday.toString()) != -1) {
			Calendar.addClass(cell, "weekend");
		}
		cell.innerHTML = Calendar._SDN[(i + fdow) % 7];
		cell = cell.nextSibling;
	}
};

/** Internal function.  Hides all combo boxes that might be displayed. */
Calendar.prototype._hideCombos = function () {
	this.monthsCombo.style.display = "none";
	this.yearsCombo.style.display = "none";
};

/** Internal function.  Starts dragging the element. */
Calendar.prototype._dragStart = function (ev) {
	if (this.dragging) {
		return;
	}
	this.dragging = true;
	var posX;
	var posY;
	if (Calendar.is_ie) {
		posY = window.event.clientY + document.body.scrollTop;
		posX = window.event.clientX + document.body.scrollLeft;
	} else {
		posY = ev.clientY + window.scrollY;
		posX = ev.clientX + window.scrollX;
	}
	var st = this.element.style;
	this.xOffs = posX - parseInt(st.left);
	this.yOffs = posY - parseInt(st.top);
	with (Calendar) {
		addEvent(document, "mousemove", calDragIt);
		addEvent(document, "mouseup", calDragEnd);
	}
};

// BEGIN: DATE OBJECT PATCHES

/** Adds the number of days array to the Date object. */
Date._MD = new Array(31,28,31,30,31,30,31,31,30,31,30,31);

/** Constants used for time computations */
Date.SECOND = 1000 /* milliseconds */;
Date.MINUTE = 60 * Date.SECOND;
Date.HOUR   = 60 * Date.MINUTE;
Date.DAY	= 24 * Date.HOUR;
Date.WEEK   =  7 * Date.DAY;

Date.parseDate = function(str, fmt) {
	var today = new Date();
	var y = 0;
	var m = -1;
	var d = 0;
	var a = str.split(/\W+/);
	var b = fmt.match(/%./g);
	var i = 0, j = 0;
	var hr = 0;
	var min = 0;
	for (i = 0; i < a.length; ++i) {
		if (!a[i])
			continue;
		switch (b[i]) {
			case "%d":
			case "%e":
			d = parseInt(a[i], 10);
			break;

			case "%m":
			m = parseInt(a[i], 10) - 1;
			break;

			case "%Y":
			case "%y":
			y = parseInt(a[i], 10);
			(y < 100) && (y += (y > 29) ? 1900 : 2000);
			break;

			case "%b":
			case "%B":
			for (j = 0; j < 12; ++j) {
				if (Calendar._MN[j].substr(0, a[i].length).toLowerCase() == a[i].toLowerCase()) { m = j; break; }
			}
			break;

			case "%H":
			case "%I":
			case "%k":
			case "%l":
			hr = parseInt(a[i], 10);
			break;

			case "%P":
			case "%p":
			if (/pm/i.test(a[i]) && hr < 12)
				hr += 12;
			else if (/am/i.test(a[i]) && hr >= 12)
				hr -= 12;
			break;

			case "%M":
			min = parseInt(a[i], 10);
			break;
		}
	}
	if (isNaN(y)) y = today.getFullYear();
	if (isNaN(m)) m = today.getMonth();
	if (isNaN(d)) d = today.getDate();
	if (isNaN(hr)) hr = today.getHours();
	if (isNaN(min)) min = today.getMinutes();
	if (y != 0 && m != -1 && d != 0)
		return new Date(y, m, d, hr, min, 0);
	y = 0; m = -1; d = 0;
	for (i = 0; i < a.length; ++i) {
		if (a[i].search(/[a-zA-Z]+/) != -1) {
			var t = -1;
			for (j = 0; j < 12; ++j) {
				if (Calendar._MN[j].substr(0, a[i].length).toLowerCase() == a[i].toLowerCase()) { t = j; break; }
			}
			if (t != -1) {
				if (m != -1) {
					d = m+1;
				}
				m = t;
			}
		} else if (parseInt(a[i], 10) <= 12 && m == -1) {
			m = a[i]-1;
		} else if (parseInt(a[i], 10) > 31 && y == 0) {
			y = parseInt(a[i], 10);
			(y < 100) && (y += (y > 29) ? 1900 : 2000);
		} else if (d == 0) {
			d = a[i];
		}
	}
	if (y == 0)
		y = today.getFullYear();
	if (m != -1 && d != 0)
		return new Date(y, m, d, hr, min, 0);
	return today;
};

/** Returns the number of days in the current month */
Date.prototype.getMonthDays = function(month) {
	var year = this.getFullYear();
	if (typeof month == "undefined") {
		month = this.getMonth();
	}
	if (((0 == (year%4)) && ( (0 != (year%100)) || (0 == (year%400)))) && month == 1) {
		return 29;
	} else {
		return Date._MD[month];
	}
};

/** Returns the number of day in the year. */
Date.prototype.getDayOfYear = function() {
	var now = new Date(this.getFullYear(), this.getMonth(), this.getDate(), 0, 0, 0);
	var then = new Date(this.getFullYear(), 0, 0, 0, 0, 0);
	var time = now - then;
	return Math.floor(time / Date.DAY);
};

/** Returns the number of the week in year, as defined in ISO 8601. */
Date.prototype.getWeekNumber = function() {
	var d = new Date(this.getFullYear(), this.getMonth(), this.getDate(), 0, 0, 0);
	var DoW = d.getDay();
	d.setDate(d.getDate() - (DoW + 6) % 7 + 3); // Nearest Thu
	var ms = d.valueOf(); // GMT
	d.setMonth(0);
	d.setDate(4); // Thu in Week 1
	return Math.round((ms - d.valueOf()) / (7 * 864e5)) + 1;
};

/** Checks date and time equality */
Date.prototype.equalsTo = function(date) {
	return ((this.getFullYear() == date.getFullYear()) &&
		(this.getMonth() == date.getMonth()) &&
		(this.getDate() == date.getDate()) &&
		(this.getHours() == date.getHours()) &&
		(this.getMinutes() == date.getMinutes()));
};

/** Set only the year, month, date parts (keep existing time) */
Date.prototype.setDateOnly = function(date) {
	var tmp = new Date(date);
	this.setDate(1);
	this.setFullYear(tmp.getFullYear());
	this.setMonth(tmp.getMonth());
	this.setDate(tmp.getDate());
};

/** Prints the date in a string according to the given format. */
Date.prototype.print = function (str) {
	var m = this.getMonth();
	var d = this.getDate();
	var y = this.getFullYear();
	var wn = this.getWeekNumber();
	var w = this.getDay();
	var s = {};
	var hr = this.getHours();
	var pm = (hr >= 12);
	var ir = (pm) ? (hr - 12) : hr;
	var dy = this.getDayOfYear();
	if (ir == 0)
		ir = 12;
	var min = this.getMinutes();
	var sec = this.getSeconds();
	s["%a"] = Calendar._SDN[w]; // abbreviated weekday name [FIXME: I18N]
	s["%A"] = Calendar._DN[w]; // full weekday name
	s["%b"] = Calendar._SMN[m]; // abbreviated month name [FIXME: I18N]
	s["%B"] = Calendar._MN[m]; // full month name
	// FIXME: %c : preferred date and time representation for the current locale
	s["%C"] = 1 + Math.floor(y / 100); // the century number
	s["%d"] = (d < 10) ? ("0" + d) : d; // the day of the month (range 01 to 31)
	s["%e"] = d; // the day of the month (range 1 to 31)
	// FIXME: %D : american date style: %m/%d/%y
	// FIXME: %E, %F, %G, %g, %h (man strftime)
	s["%H"] = (hr < 10) ? ("0" + hr) : hr; // hour, range 00 to 23 (24h format)
	s["%I"] = (ir < 10) ? ("0" + ir) : ir; // hour, range 01 to 12 (12h format)
	s["%j"] = (dy < 100) ? ((dy < 10) ? ("00" + dy) : ("0" + dy)) : dy; // day of the year (range 001 to 366)
	s["%k"] = hr;		// hour, range 0 to 23 (24h format)
	s["%l"] = ir;		// hour, range 1 to 12 (12h format)
	s["%m"] = (m < 9) ? ("0" + (1+m)) : (1+m); // month, range 01 to 12
	s["%M"] = (min < 10) ? ("0" + min) : min; // minute, range 00 to 59
	s["%n"] = "\n";		// a newline character
	s["%p"] = pm ? "PM" : "AM";
	s["%P"] = pm ? "pm" : "am";
	// FIXME: %r : the time in am/pm notation %I:%M:%S %p
	// FIXME: %R : the time in 24-hour notation %H:%M
	s["%s"] = Math.floor(this.getTime() / 1000);
	s["%S"] = (sec < 10) ? ("0" + sec) : sec; // seconds, range 00 to 59
	s["%t"] = "\t";		// a tab character
	// FIXME: %T : the time in 24-hour notation (%H:%M:%S)
	s["%U"] = s["%W"] = s["%V"] = (wn < 10) ? ("0" + wn) : wn;
	s["%u"] = w + 1;	// the day of the week (range 1 to 7, 1 = MON)
	s["%w"] = w;		// the day of the week (range 0 to 6, 0 = SUN)
	// FIXME: %x : preferred date representation for the current locale without the time
	// FIXME: %X : preferred time representation for the current locale without the date
	s["%y"] = ('' + y).substr(2, 2); // year without the century (range 00 to 99)
	s["%Y"] = y;		// year with the century
	s["%%"] = "%";		// a literal '%' character

	var re = /%./g;
	if (!Calendar.is_ie5 && !Calendar.is_khtml)
		return str.replace(re, function (par) { return s[par] || par; });

	var a = str.match(re);
	for (var i = 0; i < a.length; i++) {
		var tmp = s[a[i]];
		if (tmp) {
			re = new RegExp(a[i], 'g');
			str = str.replace(re, tmp);
		}
	}

	return str;
};

Date.prototype.__msh_oldSetFullYear = Date.prototype.setFullYear;
Date.prototype.setFullYear = function(y) {
	var d = new Date(this);
	d.__msh_oldSetFullYear(y);
	if (d.getMonth() != this.getMonth())
		this.setDate(28);
	this.__msh_oldSetFullYear(y);
};

// END: DATE OBJECT PATCHES


// global object that remembers the calendar
window._dynarch_popupCalendar = null;



/***************************************************
 * library/dhtmlCalendar/lang/calendar-en.js
 ***************************************************/

// ** I18N

// Calendar EN language
// Author: Mihai Bazon, <mihai_bazon@yahoo.com>
// Encoding: any
// Distributed under the same terms as the calendar itself.

// For translators: please use UTF-8 if possible.  We strongly believe that
// Unicode is the answer to a real internationalized world.  Also please
// include your contact information in the header, as can be seen above.

// full day names
Calendar._DN = new Array
("Sunday",
 "Monday",
 "Tuesday",
 "Wednesday",
 "Thursday",
 "Friday",
 "Saturday",
 "Sunday");

// Please note that the following array of short day names (and the same goes
// for short month names, _SMN) isn't absolutely necessary.  We give it here
// for exemplification on how one can customize the short day names, but if
// they are simply the first N letters of the full name you can simply say:
//
//   Calendar._SDN_len = N; // short day name length
//   Calendar._SMN_len = N; // short month name length
//
// If N = 3 then this is not needed either since we assume a value of 3 if not
// present, to be compatible with translation files that were written before
// this feature.

// short day names
Calendar._SDN = new Array
("Sun",
 "Mon",
 "Tue",
 "Wed",
 "Thu",
 "Fri",
 "Sat",
 "Sun");

// First day of the week. "0" means display Sunday first, "1" means display
// Monday first, etc.
Calendar._FD = 0;

// full month names
Calendar._MN = new Array
("January",
 "February",
 "March",
 "April",
 "May",
 "June",
 "July",
 "August",
 "September",
 "October",
 "November",
 "December");

// short month names
Calendar._SMN = new Array
("Jan",
 "Feb",
 "Mar",
 "Apr",
 "May",
 "Jun",
 "Jul",
 "Aug",
 "Sep",
 "Oct",
 "Nov",
 "Dec");

// tooltips
Calendar._TT = {};
Calendar._TT["INFO"] = "About the calendar";

Calendar._TT["ABOUT"] =
"DHTML Date/Time Selector\n" +
"(c) dynarch.com 2002-2005 / Author: Mihai Bazon\n" + // don't translate this this ;-)
"For latest version visit: http://www.dynarch.com/projects/calendar/\n" +
"Distributed under GNU LGPL.  See http://gnu.org/licenses/lgpl.html for details." +
"\n\n" +
"Date selection:\n" +
"- Use the \xab, \xbb buttons to select year\n" +
"- Use the " + String.fromCharCode(0x2039) + ", " + String.fromCharCode(0x203a) + " buttons to select month\n" +
"- Hold mouse button on any of the above buttons for faster selection.";
Calendar._TT["ABOUT_TIME"] = "\n\n" +
"Time selection:\n" +
"- Click on any of the time parts to increase it\n" +
"- or Shift-click to decrease it\n" +
"- or click and drag for faster selection.";

Calendar._TT["PREV_YEAR"] = "Prev. year (hold for menu)";
Calendar._TT["PREV_MONTH"] = "Prev. month (hold for menu)";
Calendar._TT["GO_TODAY"] = "Go Today";
Calendar._TT["NEXT_MONTH"] = "Next month (hold for menu)";
Calendar._TT["NEXT_YEAR"] = "Next year (hold for menu)";
Calendar._TT["SEL_DATE"] = "Select date";
Calendar._TT["DRAG_TO_MOVE"] = "Drag to move";
Calendar._TT["PART_TODAY"] = " (today)";

// the following is to inform that "%s" is to be the first day of week
// %s will be replaced with the day name.
Calendar._TT["DAY_FIRST"] = "Display %s first";

// This may be locale-dependent.  It specifies the week-end days, as an array
// of comma-separated numbers.  The numbers are from 0 to 6: 0 means Sunday, 1
// means Monday, etc.
Calendar._TT["WEEKEND"] = "0,6";

Calendar._TT["CLOSE"] = "Close";
Calendar._TT["TODAY"] = "Today";
Calendar._TT["TIME_PART"] = "(Shift-)Click or drag to change value";

// date formats
Calendar._TT["DEF_DATE_FORMAT"] = "%Y-%m-%d";
Calendar._TT["TT_DATE_FORMAT"] = "%a, %b %e";

Calendar._TT["WK"] = "wk";
Calendar._TT["TIME"] = "Time:";



/***************************************************
 * library/dhtmlCalendar/calendar-setup.js
 ***************************************************/

/*  Copyright Mihai Bazon, 2002, 2003  |  http://dynarch.com/mishoo/
 * ---------------------------------------------------------------------------
 *
 * The DHTML Calendar
 *
 * Details and latest version at:
 * http://dynarch.com/mishoo/calendar.epl
 *
 * This script is distributed under the GNU Lesser General Public License.
 * Read the entire license text here: http://www.gnu.org/licenses/lgpl.html
 *
 * This file defines helper functions for setting up the calendar.  They are
 * intended to help non-programmers get a working calendar on their site
 * quickly.  This script should not be seen as part of the calendar.  It just
 * shows you what one can do with the calendar, while in the same time
 * providing a quick and simple method for setting it up.  If you need
 * exhaustive customization of the calendar creation process feel free to
 * modify this code to suit your needs (this is recommended and much better
 * than modifying calendar.js itself).
 */

// $Id: calendar-setup.js,v 1.25 2005/03/07 09:51:33 mishoo Exp $

/**
 *  This function "patches" an input field (or other element) to use a calendar
 *  widget for date selection.
 *
 *  The "params" is a single object that can have the following properties:
 *
 *	prop. name	| description
 *  -------------------------------------------------------------------------------------------------
 *   inputField	 | the ID of an input field to store the date
 *   inputFieldReal | the ID of an input field where real date is stored (real date can be used later to insert into ex. Mysql database). The difference between it and inputField is that input field is formated in current locale while inputFieldReal is always formated in en default locale
 *   displayArea	| the ID of a DIV or other element to show the date
 *   button		 | ID of a button or other element that will trigger the calendar
 *   eventName	  | event that will trigger the calendar, without the "on" prefix (default: "click")
 *   ifFormat	   | date format that will be stored in the input field
 *   daFormat	   | the date format that will be used to display the date in displayArea
 *   singleClick	| (true/false) wether the calendar is in single click mode or not (default: true)
 *   firstDay	   | numeric: 0 to 6.  "0" means display Sunday first, "1" means display Monday first, etc.
 *   align		  | alignment (default: "Br"); if you don't know what's this see the calendar documentation
 *   range		  | array with 2 elements.  Default: [1900, 2999] -- the range of years available
 *   weekNumbers	| (true/false) if it's true (default) the calendar will display week numbers
 *   flat		   | null or element ID; if not null the calendar will be a flat calendar having the parent with the given ID
 *   flatCallback   | function that receives a JS Date object and returns an URL to point the browser to (for flat calendar)
 *   disableFunc	| function that receives a JS Date object and should return true if that date has to be disabled in the calendar
 *   onSelect	   | function that gets called when a date is selected.  You don't _have_ to supply this (the default is generally okay)
 *   onClose		| function that gets called when the calendar is closed.  [default]
 *   onUpdate	   | function that gets called after the date is updated in the input field.  Receives a reference to the calendar.
 *   date		   | the date that the calendar will be initially displayed to
 *   showsTime	  | default: false; if true the calendar will include a time selector
 *   timeFormat	 | the time format; can be "12" or "24", default is "12"
 *   electric	   | if true (default) then given fields/date areas are updated for each move; otherwise they're updated only on close
 *   step		   | configures the step of the years in drop-down boxes; default: 2
 *   position	   | configures the calendar absolute position; default: null
 *   cache		  | if "true" (but default: "false") it will reuse the same calendar object, where possible
 *   showOthers	 | if "true" (but default: "false") it will show days from other months too
 *
 *  None of them is required, they all have default values.  However, if you
 *  pass none of "inputField", "displayArea" or "button" you'll get a warning
 *  saying "nothing to setup".
 */
Calendar.setup = function (params) {
	function param_default(pname, def) { if (typeof params[pname] == "undefined") { params[pname] = def; } };

	param_default("inputField",	 null);
	param_default("inputFieldReal", null);
	param_default("displayArea",	null);
	param_default("button",		 null);
	param_default("eventName",	  "click");
	param_default("ifFormat",	   "%Y/%m/%d");
	param_default("daFormat",	   "%Y/%m/%d");
	param_default("singleClick",	true);
	param_default("disableFunc",	null);
	param_default("dateStatusFunc", params["disableFunc"]);	// takes precedence if both are defined
	param_default("dateText",	   null);
	param_default("firstDay",	   null);
	param_default("align",		  "BR");
	param_default("range",		  [1900, 2999]);
	param_default("weekNumbers",	true);
	param_default("flat",		   null);
	param_default("flatCallback",   null);
	param_default("onSelect",	   null);
	param_default("onClose",		null);
	param_default("onUpdate",	   null);
	param_default("date",		   null);
	param_default("showsTime",	  false);
	param_default("timeFormat",	 "24");
	param_default("electric",	   true);
	param_default("step",		   2);
	param_default("position",	   null);
	param_default("cache",		  false);
	param_default("showOthers",	 false);
	param_default("multiple",	   null);

	var tmp = ["inputField", "displayArea", "button", "inputFieldReal"];
	for (var i in tmp) {
		if (typeof params[tmp[i]] == "string") {
			params[tmp[i]] = document.getElementById(params[tmp[i]]);
		}
	}
	if (!(params.flat || params.multiple || params.inputField || params.displayArea || params.button)) {
		alert("Calendar.setup:\n  Nothing to setup (no fields found).  Please check your code");
		return false;
	}

	function onSelect(cal) {
		var p = cal.params;
		var update = (cal.dateClicked || p.electric);
		if (update && p.inputField) {			
			p.inputField.value = cal.date.print(p.ifFormat);
			if(p.inputFieldReal) p.inputFieldReal.value = cal.date.getFullYear() + "-" + (cal.date.getMonth() + 1) + "-" + cal.date.getDate();
			if (typeof p.inputField.onchange == "function")
				p.inputField.onchange();
		}
		if (update && p.displayArea)
			p.displayArea.innerHTML = cal.date.print(p.daFormat);
		if (update && typeof p.onUpdate == "function")
			p.onUpdate(cal);
		if (update && p.flat) {
			if (typeof p.flatCallback == "function")
				p.flatCallback(cal);
		}
		if (update && p.singleClick && cal.dateClicked)
			cal.callCloseHandler();
	};

	if (params.flat != null) {
		if (typeof params.flat == "string")
			params.flat = document.getElementById(params.flat);
		if (!params.flat) {
			alert("Calendar.setup:\n  Flat specified but can't find parent.");
			return false;
		}
		var cal = new Calendar(params.firstDay, params.date, params.onSelect || onSelect);
		cal.showsOtherMonths = params.showOthers;
		cal.showsTime = params.showsTime;
		cal.time24 = (params.timeFormat == "24");
		cal.params = params;
		cal.weekNumbers = params.weekNumbers;
		cal.setRange(params.range[0], params.range[1]);
		cal.setDateStatusHandler(params.dateStatusFunc);
		cal.getDateText = params.dateText;
		if (params.ifFormat) {
			cal.setDateFormat(params.ifFormat);
		}
		if (params.inputField && typeof params.inputField.value == "string") {
			cal.parseDate(params.inputField.value);
			params.inputField.value = cal.date.print(cal.params.ifFormat);
		}
		cal.create(params.flat);
		cal.show();
		return false;
	}

	var triggerEl = params.button || params.displayArea || params.inputField;
	
	if(params.button && params.inputField)
	{
		Event.observe(params.button, "click", function() { params.inputField.focus(); });
	}
	
	triggerEl["on" + params.eventName] = function() {
		var dateEl = params.inputField || params.displayArea;
		var dateFmt = params.inputField ? params.ifFormat : params.daFormat;
		var mustCreate = false;
		var cal = window.calendar;
		
		var real = document.getElementById(dateEl.id + "_real");
		var realValue = real ? real.value : false;
		if (dateEl)
		{
			var curentDate = params.date ? params.date.print("%y-%m-%d") : '';
			params.date = Date.parseDate(dateEl.value || dateEl.innerHTML || realValue || curentDate, dateFmt);
		}
			 
		if (!(cal && params.cache)) {
			window.calendar = cal = new Calendar(params.firstDay,
								 params.date,
								 params.onSelect || onSelect,
								 params.onClose || function(cal) { cal.hide(); });
			cal.showsTime = params.showsTime;
			cal.time24 = (params.timeFormat == "24");
			cal.weekNumbers = params.weekNumbers;
			mustCreate = true;
		} else {
			if (params.date)
				cal.setDate(params.date);
			cal.hide();
		}
		if (params.multiple) {
			cal.multiple = {};
			for (var i = params.multiple.length; --i >= 0;) {
				var d = params.multiple[i];
				var ds = d.print("%Y%m%d");
				cal.multiple[ds] = d;
			}
		}
		cal.showsOtherMonths = params.showOthers;
		cal.yearStep = params.step;
		cal.setRange(params.range[0], params.range[1]);
		cal.params = params;
		cal.setDateStatusHandler(params.dateStatusFunc);
		cal.getDateText = params.dateText;
		cal.setDateFormat(dateFmt);
		if (mustCreate)
			cal.create();
		cal.refresh();
		if (!params.position)
			cal.showAtElement(params.button || params.displayArea || params.inputField, params.align);
		else
			cal.showAt(params.position[0], params.position[1]);
		return false;
	};


	if(!cal)
	{
		if(params.inputFieldReal.value == '0000-00-00') params.inputFieldReal.value = '';
		if(params.inputField.value == '0000-00-00') params.inputField.value = '';
		
		cal = new Calendar();
		cal.create();
		cal.setDateFormat(params.ifFormat);
		cal.parseDate(params.inputFieldReal.value);
		
		if(params.inputFieldReal.value)
		{
			params.inputField.value = cal.date.print(params.ifFormat);

			if(params.inputFieldReal) 
			{
				params.inputFieldReal.value = cal.date.getFullYear() + "-" + (cal.date.getMonth() + 1) + "-" + cal.date.getDate();
			}
		}

	}

	return cal;
};

Calendar.updateDate = function(e) 
{ 
	if(this.showInput.value != "")
	{
		this.realInput.value =  Date.parseDate(this.showInput.value, "%d-%b-%Y").print("%Y-%m-%d"); 
	}
}



/***************************************************
 * backend/QuickSearch.js
 ***************************************************/

/**
 *
 * @author Integry Systems
 */

window.quickSearchInstances = {};

Backend.QuickSearch = Class.create();
Backend.QuickSearch.prototype = {
	// timeout values
	TIMEOUT_WHEN_WAITING : 500,
	TIMEOUT_WHEN_TYPING : 1000,

	// --
	query : "",
	previousQuery: null,
	timer : {typing: null, waiting:null},
	popupHideObserved: false,
	nodes : null,
	hasResponse : false,
	prefix: null,
	defaultOptions:{},

	initialize: function(prefix, options)
	{
		if(options)
		{
			this.defaultOptions = options;
		}
		this.prefix = prefix;
		this.initNodes();
		Event.observe(this.nodes.Query, "keyup", this.onKeyUp.bindAsEventListener(this));
		Event.observe(this.nodes.Query, 'focus', this.onFocus.bindAsEventListener(this));
		Event.observe(this.nodes.Query, 'blur', this.onBlur.bindAsEventListener(this));
	},

	initNodes : function()
	{
		if(this.nodes == null)
		{
			this.nodes = {};
			$A([
				"Class",
				"From",
				"To",
				"Direction",
				"Form",
				"Query",
				"Result",
				"Container"
			]).each(
				function(id)
				{
					this.nodes[id]=$(this.prefix + id);
				}.bind(this)
			);

			this.nodes.Result = this.nodes.Result.parentNode;
		}
	},

	onFocus: function(event)
	{
		var obj = Event.element(event);
		if (obj.hint == undefined)
		{
			obj.hint = obj.value;
		}

		if (obj.value == obj.hint)
		{
			obj.value = '';
			obj.removeClassName('hasHint');
		}
	},

	onBlur: function(event)
	{
		var obj = Event.element(event);

		if (!obj.value)
		{
			obj.value = obj.hint;
			obj.addClassName('hasHint');
		}
	},

	onKeyUp:function(event)
	{
		var obj = Event.element(event);
		this.query=obj.value;

		// instant requests
		if(this.TIMEOUT_WHEN_TYPING == 0)
		{
			this.doRequest();
			return;
		}

		// When stop typing make request after TIMEOUT_WHEN_WAITING.
		if(this.timer.waiting)
		{
			window.clearTimeout(this.timer.waiting);
		}
		this.timer.waiting = window.setTimeout(this.doRequest.bind(this), this.TIMEOUT_WHEN_WAITING);

		// When typing make requests every TIMEOUT_WHEN_TYPING.
		if(this.timer.typing == null)
		{
			// using setTimeout instead of setInterval allows to restart interval
			// and make request every time user start typing after pause.
			this.timer.typing = window.setTimeout(
				function()
				{
					if(this.timer.typing)
					{
						window.clearTimeout(this.timer.typing);
						this.timer.typing = null;
					}
				}.bind(this),
				this.TIMEOUT_WHEN_TYPING
			);
			this.doRequest();
		}
	},

	doRequest: function(t)
	{
		if(this.query.length < 3)
		{
			return;
		}

		this.initNodes(); // move to 'constructor'

		if(this.query != this.previousQuery)
		{
			this._setFormOptions(this.defaultOptions);
			new LiveCart.AjaxRequest(
				this.nodes.Form,
				this.nodes.Query,
				this.onResponse.bind(this)
			);
			this.previousQuery = this.query;
		}
	},

	onResponse: function(transport)
	{
		this.initNodes(); // move to 'constructor'
		this.nodes.Result.innerHTML = transport.responseText;
		this.hasResponse = true; // flag needed to allow reopen closed result popup when clicking on search query input field.
		this.showResultContainer();
	},

	showResultContainer: function()
	{
		if(this.hasResponse == false)
		{
			return;
		}
		this.initNodes();
		this.nodes.Result.show();
		if(this.popupHideObserved == false)
		{
			Event.observe(document, 'click', this.hideResultContainer.bindAsEventListener(this));
			Event.observe(this.nodes.Container, 'click',
				function(event)
				{
					var element = Event.element(event);
					if(element.tagName.toLowerCase() != "a" || element.hasClassName("qsNext") || element.hasClassName("qsPrevious"))
					{
						Event.stop(event);
					}
				}
			);
			Event.observe(this.nodes.Query, 'focus', this.showResultContainer.bindAsEventListener(this));
			this.popupHideObserved = true;
		}

		if (this.callbacks && this.callbacks.showResultContainer && typeof this.callbacks.showResultContainer == "function")
		{
			this.callbacks.showResultContainer(this);
		}
	},

	onShowResultContainer: function(callback)
	{
		if (typeof this.callbacks == "undefined")
		{
			this.callbacks = {};
		}
		this.callbacks.showResultContainer = callback;
	},

	hideResultContainer: function()
	{
		this.initNodes();
		this.nodes.Result.hide();
	},

	next: function(obj, cn)
	{
		this.changePage(obj, cn, 'next');
	},

	previous: function(obj, cn)
	{
		this.changePage(obj, cn, 'previous');
	},

	changePage: function(obj, cn, direction)
	{
		var
			container = $(obj).up("div")
			from = parseInt($A(container.getElementsByClassName("qsFromCount"))[0].innerHTML, 10);
			to = parseInt($A(container.getElementsByClassName("qsToCount"))[0].innerHTML, 10);

		this.initNodes();
		this._setFormOptions({
			cn:cn,
			from:from,
			to:to,
			direction:direction
		});
		new LiveCart.AjaxRequest(
			this.nodes.Form,
			this.nodes.Query,
			function(classContainer, transport)
			{
				classContainer.innerHTML = transport.responseText;
				// also trigger onShowResultContainer callback, because common use for this callback is position result and this can change result container size.
				if (this.callbacks && this.callbacks.showResultContainer && typeof this.callbacks.showResultContainer == "function")
				{
					this.callbacks.showResultContainer(this);
				}
			}.bind(this, container.up("div"))
		);
	},

	_setFormOptions: function(options)
	{
		this.nodes.Class.value=options.cn ? options.cn : "";
		this.nodes.From.value=options.from ? options.from : "";
		this.nodes.To.value=options.to ? options.to: "";
		this.nodes.Direction.value=options.direction ? options.direction : "";
	}
}

Backend.QuickSearch.createInstance = function(name, enabledClassNames)
{
	window.quickSearchInstances[name] = new Backend.QuickSearch(name, enabledClassNames);
	return window.quickSearchInstances[name];
}

Backend.QuickSearch.getInstance = function(obj)
{
	var
		i = 0,
		id;
	obj = $(obj);

	// quick search container div has id <instance name>Container
	// remove Container and get instance name.
	while(obj.id.match(/ResultOuterContainer$/) == null)
	{
		if(i>10)
		{
			throw "Can't find QuickSearch instance from passed node";
		}
		obj = obj.up("div");
	}
	id = obj.id.replace(/ResultOuterContainer$/, '');

	if(typeof window.quickSearchInstances[id] == "undefined")
	{
		throw "Can't find QuickSearch instance, probably not initalized";
	}
	return window.quickSearchInstances[id];
}



/***************************************************
 * library/dhtmlHistory/dhtmlHistory.js
 ***************************************************/

/**
   Copyright (c) 2005, Brad Neuberg, bkn3@columbia.edu
   http://codinginparadise.org

   Permission is hereby granted, free of charge, to any person obtaining
   a copy of this software and associated documentation files (the "Software"),
   to deal in the Software without restriction, including without limitation
   the rights to use, copy, modify, merge, publish, distribute, sublicense,
   and/or sell copies of the Software, and to permit persons to whom the
   Software is furnished to do so, subject to the following conditions:

   The above copyright notice and this permission notice shall be
   included in all copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
   EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
   OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
   IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
   CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT
   OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR
   THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/** An object that provides DHTML history, history data, and bookmarking
	for AJAX applications. */
window.dhtmlHistory = {
   /** Initializes our DHTML history. You should
	   call this after the page is finished loading. */
   /** public */ initialize: function() {
	  // only Internet Explorer needs to be explicitly initialized;
	  // other browsers don't have its particular behaviors.
	  // Basicly, IE doesn't autofill form data until the page
	  // is finished loading, which means historyStorage won't
	  // work until onload has been fired.
	  if (this.isInternetExplorer() == false) {
		 return;
	  }

	  // if this is the first time this page has loaded...
	  if (historyStorage.hasKey("DhtmlHistory_pageLoaded") == false) {
		 this.fireOnNewListener = false;
		 this.firstLoad = true;
		 historyStorage.put("DhtmlHistory_pageLoaded", true);
	  }
	  // else if this is a fake onload event
	  else {
		 this.fireOnNewListener = true;
		 this.firstLoad = false;
	  }
   },

   /** Adds a history change listener. Note that
	   only one listener is supported at this
	   time. */
   /** public */ addListener: function(callback) {
	  this.listener = callback;

	  // if the page was just loaded and we
	  // should not ignore it, fire an event
	  // to our new listener now
	  if (this.fireOnNewListener == true) {
		 //this.fireHistoryEvent(this.currentLocation);
		 //this.fireOnNewListener = false;
	  }
   },

	/**
	 * @author Integry Systems
	 */
	handleBookmark: function()
	{
		hash = window.location.hash.substr(1);
		if(window.historyStorage.hasKey(hash))
		{
			this.fireHistoryEvent(hash);
		}
		else
		{
			Backend.ajaxNav.handle(hash);
		}
	},

   /** public */ add: function(newLocation, historyData) {
	  // most browsers require that we wait a certain amount of time before changing the
	  // location, such as 200 milliseconds; rather than forcing external callers to use
	  // window.setTimeout to account for this to prevent bugs, we internally handle this
	  // detail by using a 'currentWaitTime' variable and have requests wait in line
	  var self = this;
	  var addImpl = function() {
		 // indicate that the current wait time is now less
		 if (self.currentWaitTime > 0)
			self.currentWaitTime = self.currentWaitTime - self.WAIT_TIME;

		 // remove any leading hash symbols on newLocation
		 newLocation = self.removeHash(newLocation);

		 // IE has a strange bug; if the newLocation
		 // is the same as _any_ preexisting id in the
		 // document, then the history action gets recorded
		 // twice; throw a programmer exception if there is
		 // an element with this ID
		 var idCheck = document.getElementById(newLocation);
		 if (idCheck != undefined || idCheck != null) {
			var message =
			   "Exception: History locations can not have "
			   + "the same value as _any_ id's "
			   + "that might be in the document, "
			   + "due to a bug in Internet "
			   + "Explorer; please ask the "
			   + "developer to choose a history "
			   + "location that does not match "
			   + "any HTML id's in this "
			   + "document. The following ID "
			   + "is already taken and can not "
			   + "be a location: "
			   + newLocation;

			throw message;
		 }

		 // store the history data into history storage
		 historyStorage.put(newLocation, historyData);

		 // indicate to the browser to ignore this upcomming
		 // location change
		 self.ignoreLocationChange = true;

		 // indicate to IE that this is an atomic location change
		 // block
		 this.ieAtomicLocationChange = true;

		 // save this as our current location
		 self.currentLocation = newLocation;

		 // change the browser location
		 window.location.hash = newLocation;

		 // change the hidden iframe's location if on IE
		 if (self.isInternetExplorer())
			self.iframe.src = "javascript/library/dhtmlhistory/history.php?" + newLocation;

		 // end of atomic location change block
		 // for IE
		 this.ieAtomicLocationChange = false;
	  };

	  // now execute this add request after waiting a certain amount of time, so as to
	  // queue up requests
	  window.setTimeout(addImpl, this.currentWaitTime);

	  // indicate that the next request will have to wait for awhile
	  this.currentWaitTime = this.currentWaitTime + this.WAIT_TIME;
   },

   /** public */ isFirstLoad: function() {
	  if (this.firstLoad == true) {
		 return true;
	  }
	  else {
		 return false;
	  }
   },

   /** public */ isInternational: function() {
	  return false;
   },

   /** public */ getVersion: function() {
	  return "0.05";
   },

   /** Gets the current hash value that is in the browser's
	   location bar, removing leading # symbols if they are present. */
   /** public */ getCurrentLocation: function() {
	  var currentLocation = this.removeHash(window.location.hash);

	  return currentLocation;
   },





   /** Our current hash location, without the "#" symbol. */
   /** private */ currentLocation: null,

   /** Our history change listener. */
   /** private */ listener: null,

   /** A hidden IFrame we use in Internet Explorer to detect history
	   changes. */
   /** private */ iframe: null,

   /** Indicates to the browser whether to ignore location changes. */
   /** private */ ignoreLocationChange: null,

   /** The amount of time in milliseconds that we should wait between add requests.
	   Firefox is okay with 200 ms, but Internet Explorer needs 400. */
   /** private */ WAIT_TIME: 1000,

   /** The amount of time in milliseconds an add request has to wait in line before being
	   run on a window.setTimeout. */
   /** private */ currentWaitTime: 0,

   /** A flag that indicates that we should fire a history change event
	   when we are ready, i.e. after we are initialized and
	   we have a history change listener. This is needed due to
	   an edge case in browsers other than Internet Explorer; if
	   you leave a page entirely then return, we must fire this
	   as a history change event. Unfortunately, we have lost
	   all references to listeners from earlier, because JavaScript
	   clears out. */
   /** private */ fireOnNewListener: null,

   /** A variable that indicates whether this is the first time
	   this page has been loaded. If you go to a web page, leave
	   it for another one, and then return, the page's onload
	   listener fires again. We need a way to differentiate
	   between the first page load and subsequent ones.
	   This variable works hand in hand with the pageLoaded
	   variable we store into historyStorage.*/
   /** private */ firstLoad: null,

   /** A variable to handle an important edge case in Internet
	   Explorer. In IE, if a user manually types an address into
	   their browser's location bar, we must intercept this by
	   continiously checking the location bar with an timer
	   interval. However, if we manually change the location
	   bar ourselves programmatically, when using our hidden
	   iframe, we need to ignore these changes. Unfortunately,
	   these changes are not atomic, so we surround them with
	   the variable 'ieAtomicLocationChange', that if true,
	   means we are programmatically setting the location and
	   should ignore this atomic chunked change. */
   /** private */ ieAtomicLocationChange: null,

   /** Creates the DHTML history infrastructure. */
   /** private */ create: function() {
	  // get our initial location
	  var initialHash = this.getCurrentLocation();

	  // save this as our current location
	  this.currentLocation = initialHash;

	  // write out a hidden iframe for IE and
	  // set the amount of time to wait between add() requests
	  if (this.isInternetExplorer()) {
		 document.write("<iframe style='border: 0px; width: 200px;"
							   + "height: 100px; position: absolute; top: 0px; "
							   + "left: 500px; z-index: 50000; visibility: visible; display: none;' "
							   + "name='DhtmlHistoryFrame' id='DhtmlHistoryFrame'  onload='window.dhtmlHistory.frameLoad(this);' "
							   + "src='javascript/library/dhtmlhistory/history.php?" + initialHash + "'>"
							   + "</iframe>");
		 // wait 400 milliseconds between history
		 // updates on IE, versus 200 on Firefox
		 this.WAIT_TIME = 400;
	  }

	  // add an unload listener for the page; this is
	  // needed for Firefox 1.5+ because this browser caches all
	  // dynamic updates to the page, which can break some of our
	  // logic related to testing whether this is the first instance
	  // a page has loaded or whether it is being pulled from the cache
	  //var self = this;
	  //window.onunload = function() {
	  //   self.firstLoad = null;
	  //};

	  // determine if this is our first page load;
	  // for Internet Explorer, we do this in
	  // this.iframeLoaded(), which is fired on
	  // page load. We do it there because
	  // we have no historyStorage at this point
	  // in IE, which only exists after the page
	  // is finished loading for that browser
	  if (this.isInternetExplorer() == false) {
		 if (historyStorage.hasKey("DhtmlHistory_pageLoaded") == false) {
			this.ignoreLocationChange = true;
			this.firstLoad = true;
			historyStorage.put("DhtmlHistory_pageLoaded", true);
		 }
		 else {
			// indicate that we want to pay attention
			// to this location change
			this.ignoreLocationChange = false;
			// For browser's other than IE, fire
			// a history change event; on IE,
			// the event will be thrown automatically
			// when it's hidden iframe reloads
			// on page load.
			// Unfortunately, we don't have any
			// listeners yet; indicate that we want
			// to fire an event when a listener
			// is added.
			this.fireOnNewListener = true;
		 }
	  }
	  else { // Internet Explorer
		 // the iframe will get loaded on page
		 // load, and we want to ignore this fact
		 this.ignoreLocationChange = true;
	  }

	  if (this.isInternetExplorer()) {
			this.iframe = document.getElementById("DhtmlHistoryFrame");
	  }

	  // other browsers can use a location handler that checks
	  // at regular intervals as their primary mechanism;
	  // we use it for Internet Explorer as well to handle
	  // an important edge case; see checkLocation() for
	  // details
	  var self = this;
	  var locationHandler = function() {
		 self.checkLocation();
	  };
	  setInterval(locationHandler, 1000);
   },

   /** Notify the listener of new history changes. */
   /** private */ fireHistoryEvent: function(newHash) {
	  // extract the value from our history storage for
	  // this hash
	  var historyData = historyStorage.get(newHash);

	  // call our listener
	  if (this.listener)
	  {
		  this.listener(newHash, historyData);
	  }
   },

	  /**
	   * @author Integry Systems
	   */
	  frameLoad: function(frame)
	  {
		  var hash = window.frames[frame.id].document.body.firstChild.nodeValue;
		  if (window.location.hash == '#' + hash)
		  {
  		  	  return false;
		  }
//		  addlog(hash);
		  window.dhtmlHistory.fireHistoryEvent(hash);
	  },

   /** Sees if the browsers has changed location.  This is the primary history mechanism
	   for Firefox. For Internet Explorer, we use this to handle an important edge case:
	   if a user manually types in a new hash value into their Internet Explorer location
	   bar and press enter, we want to intercept this and notify any history listener. */
   /** private */ checkLocation: function() {
	  // ignore any location changes that we made ourselves
	  // for browsers other than Internet Explorer
	  if (this.isInternetExplorer() == false
		 && this.ignoreLocationChange == true) {
		 this.ignoreLocationChange = false;
		 return;
	  }

	  // if we are dealing with Internet Explorer
	  // and we are in the middle of making a location
	  // change from an iframe, ignore it
	  if (this.isInternetExplorer() == false
		  && this.ieAtomicLocationChange == true) {
		 return;
	  }

	  // get hash location
	  var hash = this.getCurrentLocation();

	  // see if there has been a change
	  if (hash == this.currentLocation)
		 return;

	  // on Internet Explorer, we need to intercept users manually
	  // entering locations into the browser; we do this by comparing
	  // the browsers location against the iframes location; if they
	  // differ, we are dealing with a manual event and need to
	  // place it inside our history, otherwise we can return
	  this.ieAtomicLocationChange = true;

	  if (this.isInternetExplorer()
		  && this.getIFrameHash() != hash) {
		 this.iframe.src = "javascript/library/dhtmlhistory/history.php?" + hash;
	  }
	  else if (this.isInternetExplorer()) {
		 // the iframe is unchanged
		 return;
	  }

	  // save this new location
	  this.currentLocation = hash;

	  this.ieAtomicLocationChange = false;

	  // notify listeners of the change
	  this.fireHistoryEvent(hash);
   },

   /** Gets the current location of the hidden IFrames
	   that is stored as history. For Internet Explorer. */
   /** private */ getIFrameHash: function() {
	  // get the new location
	  var historyFrame = document.getElementById("DhtmlHistoryFrame");
	  var doc = historyFrame.contentWindow.document;
	  var hash = new String(doc.location.search);

	  if (hash.length == 1 && hash.charAt(0) == "?")
		 hash = "";
	  else if (hash.length >= 2 && hash.charAt(0) == "?")
		 hash = hash.substring(1);


	  return hash;
   },

   /** Removes any leading hash that might be on a location. */
   /** private */ removeHash: function(hashValue) {
	  if (hashValue == null || hashValue == undefined)
		 return null;
	  else if (hashValue == "")
		 return "";
	  else if (hashValue.length == 1 && hashValue.charAt(0) == "#")
		 return "";
	  else if (hashValue.length > 1 && hashValue.charAt(0) == "#")
		 return hashValue.substring(1);
	  else
		 return hashValue;
   },

   /** For IE, says when the hidden iframe has finished loading. */
   /** private */ iframeLoaded: function(newLocation) {
	  // ignore any location changes that we made ourselves
	  if (this.ignoreLocationChange == true) {
		 this.ignoreLocationChange = false;
		 return;
	  }

	  // get the new location
	  var hash = new String(newLocation.search);
	  if (hash.length == 1 && hash.charAt(0) == "?")
		 hash = "";
	  else if (hash.length >= 2 && hash.charAt(0) == "?")
		 hash = hash.substring(1);

	  // move to this location in the browser location bar
	  // if we are not dealing with a page load event
	  if (this.pageLoadEvent != true) {
		 window.location.hash = hash;
	  }

	  // notify listeners of the change
	  this.fireHistoryEvent(hash);
   },

   /** Determines if this is Internet Explorer. */
   /** private */ isInternetExplorer: function() {
	  return false;
	  var userAgent = navigator.userAgent.toLowerCase();
	  if (document.all && userAgent.indexOf('msie')!=-1) {
		 return true;
	  }
	  else {
		 return false;
	  }
   }
};












/** An object that uses a hidden form to store history state
	across page loads. The chief mechanism for doing so is using
	the fact that browser's save the text in form data for the
	life of the browser and cache, which means the text is still
	there when the user navigates back to the page. See
	http://codinginparadise.org/weblog/2005/08/ajax-tutorial-saving-session-across.html
	for full details. */
window.historyStorage = {
   /** If true, we are debugging and show the storage textfield. */
   /** public */ debugging: false,

   /** Our hash of key name/values. */
   /** private */ storageHash: {},

   /** If true, we have loaded our hash table out of the storage form. */
   /** private */ hashLoaded: false,

   /** public */ put: function(key, value) {
	   this.assertValidKey(key);

	   // if we already have a value for this,
	   // remove the value before adding the
	   // new one
	   if (this.hasKey(key)) {
		 this.remove(key);
	   }

	   if (!this.storageHash)
	   {
			this.storageHash = {};
	   }

	   // store this new key
	   this.storageHash[key] = value;

	   // save and serialize the hashtable into the form
	   this.saveHashTable();
   },

   /** public */ get: function(key) {
	  this.assertValidKey(key);

	  // make sure the hash table has been loaded
	  // from the form
	  this.loadHashTable();

	  var value = this.storageHash[key];

	  if (value == undefined)
		 return null;
	  else
		 return value;
   },

   /** public */ remove: function(key) {
	  this.assertValidKey(key);

	  // make sure the hash table has been loaded
	  // from the form
	  this.loadHashTable();

	  // delete the value
	  delete this.storageHash[key];

	  // serialize and save the hash table into the
	  // form
	  this.saveHashTable();
   },

   /** Clears out all saved data. */
   /** public */ reset: function() {
	  this.storageField.value = "";
	  this.storageHash = new Object();
   },

   /** public */ hasKey: function(key) {
	  this.assertValidKey(key);

	  // make sure the hash table has been loaded
	  // from the form
	  this.loadHashTable();

	  if (!this.storageHash || !this.storageHash[key])
		 return false;
	  else
		 return true;
   },

   /** Determines whether the key given is valid;
	   keys can only have letters, numbers, the dash,
	   underscore, spaces, or one of the
	   following characters:
	   !@#$%^&*()+=:;,./?|\~{}[] */
   /** public */ isValidKey: function(key) {
	  // allow all strings, since we don't use XML serialization
	  // format anymore
	  return (typeof key == "string");

	  /*
	  if (typeof key != "string")
		 key = key.toString();


	  var matcher =
		 /^[a-zA-Z0-9_ \!\@\#\$\%\^\&\*\(\)\+\=\:\;\,\.\/\?\|\\\~\{\}\[\]]*$/;

	  return matcher.test(key);*/
   },




   /** A reference to our textarea field. */
   /** private */ storageField: null,

   /** private */ init: function() {
	  // write a hidden form into the page
	  var styleValue = "position: absolute; top: -1000px; left: -1000px;";
	  if (this.debugging == true) {
		 styleValue = "width: 30em; height: 30em;";
	  }

	  var newContent =
		 "<form id='historyStorageForm' "
			   + "method='GET' "
			   + "style='" + styleValue + "'>"
			+ "<textarea id='historyStorageField' "
					  + "style='" + styleValue + "'"
							  + "left: -1000px;' "
					  + "name='historyStorageField'></textarea>"
		 + "</form>";
	  document.write(newContent);

	  this.storageField = document.getElementById("historyStorageField");
   },

   /** Asserts that a key is valid, throwing
	   an exception if it is not. */
   /** private */ assertValidKey: function(key) {
	  if (this.isValidKey(key) == false) {
		 throw "Please provide a valid key for "
			   + "window.historyStorage, key= "
			   + key;
	   }
   },

   /** Loads the hash table up from the form. */
   /** private */ loadHashTable: function() {
	  if (this.hashLoaded == false) {
		 // get the hash table as a serialized
		 // string
		 var serializedHashTable = this.storageField.value;

		 if (serializedHashTable != "" &&
			 serializedHashTable != null) {
			// destringify the content back into a
			// real JavaScript object
			this.storageHash = eval('(' + serializedHashTable + ')');
		 }

		 this.hashLoaded = true;
	  }
   },

   /** Saves the hash table into the form. */
   /** private */ saveHashTable: function() {
	  this.loadHashTable();

	  // serialized the hash table
	  var serializedHashTable = Object.toJSON(this.storageHash);

	  // save this value
	  this.storageField.value = serializedHashTable;
   }
};


/***************************************************
 * backend/BackendToolbar.js
 ***************************************************/

var BackendToolbar = Class.create();
BackendToolbar.prototype = {

	isBackend: true,

	nodes: function()
	{
		this.nodes.lastviewed = this.nodes.root.down(".lastviewed");
		this.nodes.lastViewedIndicator = $("lastViewedIndicator");
		this.nodes.quickSearchResult = $("TBQuickSearchResultOuterContainer");
		this.nodes.quickSearchQuery = $("TBQuickSearchQuery");
	},

	afterInit: function()
	{
		// remove button from toolbar, if it is droped outside any droppable area
		Droppables.add($(document.body), {
			onDrop: function(from, to, event) {
				from = $(from);
				if (from.hasClassName("dropButton"))
				{
					this.removeIcon(from);
				}
			}.bind(this)
		});
		// --

		$A($("navContainer").getElementsByTagName("li")).each(
			function(element)
			{
				element = $(element);
				var
					a = element.down("a"),
					menuItem = this.getMenuItem(a.id);
				if (!menuItem || typeof menuItem.url == "undefined" || menuItem.url == "")
				{
					return; // menu items without url are not draggable!
				}
				Event.observe(a, "click", this.cancelClickEventOnDrag.bindAsEventListener(this));
				new Draggable(element,
					{
						onStart: function(inst)
						{
							var
								element = $(inst.element),
								ul = element.up("ul");
							this.draggingItem = true;
							if (ul)
							{
								ul.addClassName("importantVisible"); // make sure draggable item stay visible while dragging.
							}
						}.bind(this),

						onEnd: function(inst, event)
						{
							var
								element = $(inst.element),
								ul = element.up("ul");
							if (ul)
							{
								ul.removeClassName("importantVisible");
							}
						},
						ghosting:true,
						revert:true,
						zindex:9999
					}
				);
			}.bind(this)
		);

		// init unitialized drop buttons
		dropButtons = $A(this.nodes.mainpanel.getElementsByClassName("uninitializedDropButton"));
		dropButtons.each(this.fillDropButtonWithData.bind(this));
		this.updateDroppables();

		// -- last viewed
		this.adjustPanel(this.nodes.lastviewed);
		Event.observe(window, "resize", function()
			{
				this.adjustPanel(this.nodes.lastviewed);
			}.bind(this)
		);
		Event.observe(document.body, "click",this.hideLastViewedMenu.bind(this));
		Event.observe(this.nodes.lastviewed.down("a"), "click", function(event) {
			Event.stop(event);
			this[["hideLastViewedMenu", "openLastViewedMenu"][this.nodes.lastviewed.down("a").hasClassName("active")?0:1]]();
		}.bindAsEventListener(this));

		// quick search result bottom relative to toolbar
		Backend.QuickSearch.getInstance(this.nodes.quickSearchResult).onShowResultContainer(this.adjustQuickSearchResult.bind(this));

		Event.observe(this.nodes.quickSearchQuery, "focus", this.hideLastViewedMenu.bind(this));
	},

	openLastViewedMenu: function()
	{
		this.nodes.quickSearchResult.hide();
		if (this.nodes.lastviewed.hasClassName("invalid"))
		{
			$A(this.nodes.lastviewed.getElementsBySelector("ul li")).each(Element.remove);
			this.adjustPanel(this.nodes.lastviewed);
			this.nodes.lastViewedIndicator.show();
			this.nodes.lastViewedIndicator.addClassName("progressIndicator");
			new LiveCart.AjaxUpdater(
				this.getPorperty("lastViewed"),
				this.nodes.lastviewed.down("ul"),
				this.nodes.lastViewedIndicator,
				false,
				function() {
					this.nodes.lastviewed.removeClassName("invalid");
					this.adjustPanel(this.nodes.lastviewed);
				}.bind(this)
			);
		}

		var a = this.nodes.lastviewed.down("a");
		a.addClassName("active");
		this.getSubPanels(this.nodes.lastviewed).each(
			function(subpanel) {
				$(subpanel).addClassName("importantVisible");
			}
		);
	},
	
	
	hideLastViewedMenu: function()
	{
		if(this.isBackend == false)
		{
			return;
		}
		var a = this.nodes.lastviewed.down("a");
		a.removeClassName("active");
		this.getSubPanels(this.nodes.lastviewed).each(
			function(subpanel) {
				$(subpanel).removeClassName("importantVisible");
			}
		);
	},

	fillDropButtonWithData: function(node)
	{
		var
			menuItem = this.getMenuItem(node.id),
			a = node.down("a"),
			node = $(node);

		a.href = menuItem.url;
		a.down("small").innerHTML = menuItem.title;
		a.innerHTML = menuItem.title + a.innerHTML;
		a.style.background = "url(" +menuItem.icon+") no-repeat center center";
		node.removeClassName("uninitializedDropButton");
		node.addClassName("dropButton");

		Event.observe(node.down("a"), "click", this.cancelClickEventOnDrag.bindAsEventListener(this));
		new Draggable(node, {
			ghosting:true,
			revert:true,
			onStart: function(inst)
			{
				this.draggingItem = true;
			}.bind(this)
		});
		node.show();
	},

	updateDroppables: function()
	{
		var droppTargets = $A(this.nodes.mainpanel.getElementsByClassName("dropButton")); // all buttons
		droppTargets.push(this.nodes.mainpanel) // + mainpanel (ul tag), if dropped outside button
		droppTargets.each(function(element){
			element = $(element);
			if(element.hasClassName("droppable"))
			{
				return;
			}

			Droppables.add(
				element,
				{
					onDrop: function(from, to, event)
					{
						from = $(from);
						if (from.hasClassName("dropButton"))
						{
							// dragging button,
							this.sortIcons(from, to);
						}
						else
						{
							this.addIcon(from, to);
						}
					}.bind(this)
				}
			);
			element.addClassName("droppable");
		}.bind(this));
	},

	getButtonPosition: function(node)
	{
		var position;

		$A($(node).up("ul").getElementsByClassName("dropButton")).find(
			function(item,i)
			{
				position = i;
				return node == item;
			}
		);
		return position;
	},

	addIcon: function(li, insertBeforeLi)
	{
		// 1. add icon
		// 2. send ajax update
		// 3. if adding icon failed -remove

		if ($('noToolbarButtons'))
		{
			$('noToolbarButtons').hide();
		}

		node = $("dropButtonTemplate").cloneNode(true);
		node.id="button"+$(li).down("a").id;
		if ($(insertBeforeLi).hasClassName("dropButton"))
		{
			this.nodes.mainpanel.insertBefore(node, insertBeforeLi);
		}
		else
		{
			this.nodes.mainpanel.appendChild(node);
		}
		this.fillDropButtonWithData(node);
		this.updateDroppables();
		new LiveCart.AjaxRequest(
			this.getPorperty("addIcon").replace("_id_", node.id.replace("button", "")).replace("_position_",this.getButtonPosition(node)),
			null,
			function(node, transport)
			{
				var responseData = eval("(" + transport.responseText + ")");
				if (responseData.status != "success")
				{
					node.parentNode.removeChild(node);
				}
			}.bind(this, node)
		);
	},

	removeIcon: function(node)
	{
		// todo: stop observing
		node = $(node);
		if (node.tagName.toLowerCase() != "li")
		{
			node = node.up("li");
		}

		var
			id = node.id.replace("button", ""),
			menuItem = this.getMenuItem(id);

		new LiveCart.AjaxRequest
		(
			this.getPorperty("removeIcon").replace("_id_", id).replace("_position_",this.getButtonPosition(node)),
			null,
			function(node, transport)
			{
				var responseData = eval("(" + transport.responseText + ")");
				if (responseData.status == "success")
				{
					node.parentNode.removeChild(node);
				}
			}.bind(this, node)
		);
	},

	getMenuItem: function(id)
	{
		if (id.length == 0)
		{
			return null;
		}

		// window.menuArray;
		chunks = id.split("_");
		item = window.menuArray[chunks[1]];
		if(chunks.length == 3)
		{
			item = item.items[chunks[2]];
		}
		return item;
	},

	sortIcons: function(li, sortBefore)
	{
		if ($(sortBefore).hasClassName("dropButton"))
		{
			this.nodes.mainpanel.insertBefore(li, sortBefore);
		}
		else
		{
			this.nodes.mainpanel.appendChild(li); // move to end
		}
		r = $A(this.nodes.mainpanel.getElementsByClassName("dropButton")).inject([], function(r, item) {
			r.push(item.id.replace("button", ""));
			return r;
		});
		new LiveCart.AjaxRequest(this.getPorperty("sortIcons").replace('_order_', r.join(",")), null);
	},

	adjustQuickSearchResult: function(quickSearch)
	{
		var height = quickSearch.nodes.Result.getHeight();
		quickSearch.nodes.Result.style.marginTop = "-" + (height + 40) + "px";
	},

	// footerToolbar.invalidateLastViewed();
	invalidateLastViewed: function()
	{
		this.nodes.lastviewed.addClassName("invalid");
	}
}

BackendToolbar.prototype = Object.extend(FooterToolbar.prototype, BackendToolbar.prototype);
