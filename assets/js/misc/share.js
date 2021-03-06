angular.module('excavator.misc.share', []).

run([
  '$templateCache',
  function ($templateCache) {
    $templateCache.put('share-qrcode', [
      '<div class="modal" tabindex="-1" role="dialog" style="z-index: 3333">',
        '<div class="modal-dialog" style="width: 310px; ',
          'margin-left: auto; margin-right: auto;">',
          '<div class="modal-content">',
            '<div class="modal-body">',
              '<qrcode text="{{url}}" width="280"></qrcode>',
            '</div>',
          '</div>',
        '</div>',
      '</div>'
    ].join(''));
  }
]).

directive('qrcode', [
  'misc.async',
  function (async) {
    return {
      restrict: 'E',
      link: function ($scope, $element, $attrs) {
        async([
          'qrcode'
        ]).then(function (QRCode) {
          var qrcode = new QRCode($element[0], {
            text: $attrs.text || '',
            width: +$attrs.width || 200,
            height: +$attrs.width || 200
          });
          qrcode._el.title = '';
          $attrs.$observe('text', function (text) {
            qrcode.clear();
            qrcode.makeCode(text || '');
          });
        });
      }
    };
  }
]).

directive('shareTo', [
  '$modal',
  '$window',
  function ($modal, $window) {
    return {
      link: function ($scope, $element, $attrs) {
        var type = $attrs.shareTo;
        switch (type) {
        case 'weibo':
          $element.attr('target', '_blank');
          $attrs.$observe('weiboContent', function (text) {
            var url = 'http://service.weibo.com/share/share.php';
            url += '?url=' + encodeURIComponent($window.location.href);
            url += '&appkey=' + ($attrs.weiboAppkey || '');
            if ($attrs.weiboPhoto) {
              var photo = $window.location.origin + $attrs.weiboPhoto;
              url += '&pic=' + encodeURIComponent(photo);
            }
            url += '&title=' + encodeURIComponent(text);
            $element.attr('href', url);
          });
          break;
        case 'wechat':
          $element.on('click', function () {
            var modal = $modal({
              template: 'share-qrcode'
            });
            modal.$scope.$on('modal.show', function () {
              var sibling = angular.element(modal.$element[0].nextSibling);
              if (sibling && sibling.hasClass('modal-backdrop')) {
                sibling.css('z-index', +modal.$element.css('z-index') - 10);
              }
            });
            modal.$scope.url = $window.location.href;
          });
          break;
        }
      }
    };
  }
]);
