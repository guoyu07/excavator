angular.module('excavator.i18n', [
  'excavator.i18n.dictionary'
]).

service('i18n.linguist', [
  '$http',
  '$rootScope',
  'func.localstorage.load',
  'func.localstorage.save',
  'i18n.dictionary',
  function ($http, $rootScope, load, save, dictionary) {
    this._setLang = function (langcode) {
      this.lang = langcode;
      this.dict = dictionary(this.lang);
      $http.defaults.headers.common.Lang = this.lang;
    };

    this._setLang(load('lang') || 'zh');

    this.langs = {
      'en': 'EN',
      'zh': '中'
    };

    this.setLang = function (langcode) {
      this._setLang(langcode);
      save('lang', this.lang);
      $rootScope.$broadcast('language change');
    };

    this.transform = function (text, scope) {
      if (!scope) return text;
      return text.replace(/!!(.+?)!!/g, function (p0, p1) {
        if (!scope.$i18nWatch) {
          var unwatch = scope.$watch(p1, function () {
            scope.$emit('language change');
          });
          scope.$i18nWatch = true;
          scope.$on('$destroy', function () {
            unwatch();
          });
        }
        return scope.$eval(p1);
      });
    };

    this.translate = function (src, scope) {
      if (!angular.isString(src)) return '(undefined)';
      src = src.replace(/[\n\s]{1,}/g, ' ');
      var parts = src.split('::');
      var l = parts.length;
      var def = this.transform(parts[l - 1], scope);
      var current = this.dict;
      for (var i = 0; i < l + 1; i++) {
        if (angular.isUndefined(current)) return def;
        if (angular.isString(current)) {
          return this.transform(current, scope) || def;
        }
        if (i === l) return def;
        current = current[parts[i]];
      }
    };
  }
]).

factory('i18n.translate', [
  '$interpolate',
  'i18n.linguist',
  function ($interpolate, linguist) {
    return function (string, context, options) {
      if (angular.isObject(options)) {
        if (options.fake) {
          return string;
        }
      }
      var translated = linguist.translate(string);
      if (context) {
        translated = $interpolate(translated)(context);
      }
      return translated;
    };
  }
]).

directive('i18n', [
  'i18n.linguist',
  function (linguist) {
    return {
      link: function ($scope, $element, $attrs) {
        $scope.$on('language change', onLanguageChange);
        $scope.$emit('language change');
        function onLanguageChange () {
          var attr = $attrs.i18n.trim();
          if (attr[0] === '{') {
            var assigns;
            try {
              assigns = $scope.$eval(attr);
            } catch (e) {}
          } else {
            assigns = { text: attr };
          }
          if (!angular.isObject(assigns)) return;
          for (var key in assigns) {
            var translated = linguist.translate(assigns[key], $scope);
            var keys = key.split(',');
            for (var i = 0; i < keys.length; i++) {
              var key = keys[i].trim();
              if (key === 'text') {
                $element.text(translated);
                continue;
              } else if (key) {
                $element.attr(key, translated);
              }
            }
          }
        }
      }
    };
  }
]);
