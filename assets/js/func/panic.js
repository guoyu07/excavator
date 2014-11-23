angular.module('excavator.func.panic', []).

factory('func.panic', [
  '$modal',
  function ($modal) {
    return function (err) {
      var details;
      var errorMsg;
      var errorMsgs;
      if (angular.isString(err)) {
        errorMsg = err;
      } else {
        if (angular.isObject(err)) details = err.data;
        if (details) {
          errorMsg = details.message;
          errorMsgs = details.messages;
        } else {
          if (err.status === 0) {
            errorMsg = 'Unable to access network. Check your network settings.';
          } else {
            errorMsg = 'Unexpected error was encountered.';
          }
        }
      }
      var modal = $modal({
        title: 'Error',
        content: errorMsg,
        template: '/panic.html'
      });
      modal.$scope.modalType = 'danger';
      modal.$scope.errorMsgs = errorMsgs;
    };
  }
]).

factory('func.panic.alert', [
  '$location',
  '$modal',
  '$timeout',
  function ($location, $modal, $timeout) {
    /**
     * show an alert modal window
     * @param  {string}   content  the body of the alert window
     * @param  {string}   title    the title of the alert window
     * @param  {str/func} hide     function to be executed after modal window
     *                             is hidden, if this is a URI string, it will
     *                             go to this location
     * @return {undefined}         this function returns nothing
     */
    return function (content, title, hide) {
      var modal = $modal({
        title: title || 'Info',
        content: content,
        template: '/panic.html'
      });
      modal.$scope.modalType = 'info';
      var hideEvent;
      if (angular.isString(hide)) {
        hideEvent = function () {
          $location.path(hide);
        };
      } else if (angular.isFunction(hide)) {
        hideEvent = hide;
      }
      if (angular.isFunction(hideEvent)) {
        modal.$scope.$on('modal.hide', function () {
          $timeout(hideEvent);
        });
      }
    };
  }
]).

factory('func.panic.confirm', [
  '$modal',
  '$q',
  function ($modal, $q) {
    /**
     * show a confirm modal window
     * @param  {string}   content  the body of the confirm window
     * @param  {string}   title    the title of the confirm window
     * @return {undefined}         this function returns nothing
     */
    return function (content, title, btnYes, btnNo) {
      var deferred = $q.defer();
      var modal = $modal({
        title: title || 'Confirm',
        content: content,
        template: '/panic.html'
      });
      modal.$scope.modalType = 'info';
      modal.$scope.yes = function () {
        deferred.resolve();
        deferred = undefined;
        modal.$scope.$hide();
      };
      modal.$scope.buttons = [
        angular.extend({ text: 'Yes' }, btnYes, { click: modal.$scope.yes }),
        angular.extend({ text: 'No'  }, btnNo,  { click: modal.$scope.$hide })
      ];
      modal.$scope.$on('modal.hide', function () {
        if (deferred) deferred.reject();
      });
      return deferred.promise;
    };
  }
]);
