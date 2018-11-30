/*
 *
 * https://github.com/fatlinesofcode/ngDraggable
 */
'use strict';

// polyfill
function polyfill() {
  // aliases
  var w = window;
  var d = document;

  // return if scroll behavior is supported and polyfill is not forced
  if (
    'scrollBehavior' in d.documentElement.style &&
    w.__forceSmoothScrollPolyfill__ !== true
  ) {
    return;
  }

  // globals
  var Element = w.HTMLElement || w.Element;
  var SCROLL_TIME = 468;

  // object gathering original scroll methods
  var original = {
    scroll: w.scroll || w.scrollTo,
    scrollBy: w.scrollBy,
    elementScroll: Element.prototype.scroll || scrollElement,
    scrollIntoView: Element.prototype.scrollIntoView
  };

  // define timing method
  var now =
    w.performance && w.performance.now
      ? w.performance.now.bind(w.performance)
      : Date.now;

  /**
   * indicates if a the current browser is made by Microsoft
   * @method isMicrosoftBrowser
   * @param {String} userAgent
   * @returns {Boolean}
   */
  function isMicrosoftBrowser(userAgent) {
    var userAgentPatterns = ['MSIE ', 'Trident/', 'Edge/'];

    return new RegExp(userAgentPatterns.join('|')).test(userAgent);
  }

  /*
   * IE has rounding bug rounding down clientHeight and clientWidth and
   * rounding up scrollHeight and scrollWidth causing false positives
   * on hasScrollableSpace
   */
  var ROUNDING_TOLERANCE = isMicrosoftBrowser(w.navigator.userAgent) ? 1 : 0;

  /**
   * changes scroll position inside an element
   * @method scrollElement
   * @param {Number} x
   * @param {Number} y
   * @returns {undefined}
   */
  function scrollElement(x, y) {
    this.scrollLeft = x;
    this.scrollTop = y;
  }

  /**
   * returns result of applying ease math function to a number
   * @method ease
   * @param {Number} k
   * @returns {Number}
   */
  function ease(k) {
    return 0.5 * (1 - Math.cos(Math.PI * k));
  }

  /**
   * indicates if a smooth behavior should be applied
   * @method shouldBailOut
   * @param {Number|Object} firstArg
   * @returns {Boolean}
   */
  function shouldBailOut(firstArg) {
    if (
      firstArg === null ||
      typeof firstArg !== 'object' ||
      firstArg.behavior === undefined ||
      firstArg.behavior === 'auto' ||
      firstArg.behavior === 'instant'
    ) {
      // first argument is not an object/null
      // or behavior is auto, instant or undefined
      return true;
    }

    if (typeof firstArg === 'object' && firstArg.behavior === 'smooth') {
      // first argument is an object and behavior is smooth
      return false;
    }

    // throw error when behavior is not supported
    throw new TypeError(
      'behavior member of ScrollOptions ' +
        firstArg.behavior +
        ' is not a valid value for enumeration ScrollBehavior.'
    );
  }

  /**
   * indicates if an element has scrollable space in the provided axis
   * @method hasScrollableSpace
   * @param {Node} el
   * @param {String} axis
   * @returns {Boolean}
   */
  function hasScrollableSpace(el, axis) {
    if (axis === 'Y') {
      return el.clientHeight + ROUNDING_TOLERANCE < el.scrollHeight;
    }

    if (axis === 'X') {
      return el.clientWidth + ROUNDING_TOLERANCE < el.scrollWidth;
    }
  }

  /**
   * indicates if an element has a scrollable overflow property in the axis
   * @method canOverflow
   * @param {Node} el
   * @param {String} axis
   * @returns {Boolean}
   */
  function canOverflow(el, axis) {
    var overflowValue = w.getComputedStyle(el, null)['overflow' + axis];

    return overflowValue === 'auto' || overflowValue === 'scroll';
  }

  /**
   * indicates if an element can be scrolled in either axis
   * @method isScrollable
   * @param {Node} el
   * @param {String} axis
   * @returns {Boolean}
   */
  function isScrollable(el) {
    var isScrollableY = hasScrollableSpace(el, 'Y') && canOverflow(el, 'Y');
    var isScrollableX = hasScrollableSpace(el, 'X') && canOverflow(el, 'X');

    return isScrollableY || isScrollableX;
  }

  /**
   * finds scrollable parent of an element
   * @method findScrollableParent
   * @param {Node} el
   * @returns {Node} el
   */
  function findScrollableParent(el) {
    var isBody;

    do {
      el = el.parentNode;

      isBody = el === d.body;
    } while (isBody === false && isScrollable(el) === false);

    isBody = null;

    return el;
  }

  /**
   * self invoked function that, given a context, steps through scrolling
   * @method step
   * @param {Object} context
   * @returns {undefined}
   */
  function step(context) {
    var time = now();
    var value;
    var currentX;
    var currentY;
    var elapsed = (time - context.startTime) / SCROLL_TIME;

    // avoid elapsed times higher than one
    elapsed = elapsed > 1 ? 1 : elapsed;

    // apply easing to elapsed time
    value = ease(elapsed);

    currentX = context.startX + (context.x - context.startX) * value;
    currentY = context.startY + (context.y - context.startY) * value;

    context.method.call(context.scrollable, currentX, currentY);

    // scroll more if we have not reached our destination
    if (currentX !== context.x || currentY !== context.y) {
      w.requestAnimationFrame(step.bind(w, context));
    }
  }

  /**
   * scrolls window or element with a smooth behavior
   * @method smoothScroll
   * @param {Object|Node} el
   * @param {Number} x
   * @param {Number} y
   * @returns {undefined}
   */
  function smoothScroll(el, x, y) {
    var scrollable;
    var startX;
    var startY;
    var method;
    var startTime = now();

    // define scroll context
    if (el === d.body) {
      scrollable = w;
      startX = w.scrollX || w.pageXOffset;
      startY = w.scrollY || w.pageYOffset;
      method = original.scroll;
    } else {
      scrollable = el;
      startX = el.scrollLeft;
      startY = el.scrollTop;
      method = scrollElement;
    }

    // scroll looping over a frame
    step({
      scrollable: scrollable,
      method: method,
      startTime: startTime,
      startX: startX,
      startY: startY,
      x: x,
      y: y
    });
  }

  // ORIGINAL METHODS OVERRIDES
  // w.scroll and w.scrollTo
  w.scroll = w.scrollTo = function() {
    // avoid action when no arguments are passed
    if (arguments[0] === undefined) {
      return;
    }

    // avoid smooth behavior if not required
    if (shouldBailOut(arguments[0]) === true) {
      original.scroll.call(
        w,
        arguments[0].left !== undefined
          ? arguments[0].left
          : typeof arguments[0] !== 'object'
            ? arguments[0]
            : w.scrollX || w.pageXOffset,
        // use top prop, second argument if present or fallback to scrollY
        arguments[0].top !== undefined
          ? arguments[0].top
          : arguments[1] !== undefined
            ? arguments[1]
            : w.scrollY || w.pageYOffset
      );

      return;
    }

    // LET THE SMOOTHNESS BEGIN!
    smoothScroll.call(
      w,
      d.body,
      arguments[0].left !== undefined
        ? ~~arguments[0].left
        : w.scrollX || w.pageXOffset,
      arguments[0].top !== undefined
        ? ~~arguments[0].top
        : w.scrollY || w.pageYOffset
    );
  };

  // w.scrollBy
  w.scrollBy = function() {
    // avoid action when no arguments are passed
    if (arguments[0] === undefined) {
      return;
    }

    // avoid smooth behavior if not required
    if (shouldBailOut(arguments[0])) {
      original.scrollBy.call(
        w,
        arguments[0].left !== undefined
          ? arguments[0].left
          : typeof arguments[0] !== 'object' ? arguments[0] : 0,
        arguments[0].top !== undefined
          ? arguments[0].top
          : arguments[1] !== undefined ? arguments[1] : 0
      );

      return;
    }

    // LET THE SMOOTHNESS BEGIN!
    smoothScroll.call(
      w,
      d.body,
      ~~arguments[0].left + (w.scrollX || w.pageXOffset),
      ~~arguments[0].top + (w.scrollY || w.pageYOffset)
    );
  };

  // Element.prototype.scroll and Element.prototype.scrollTo
  Element.prototype.scroll = Element.prototype.scrollTo = function() {
    // avoid action when no arguments are passed
    if (arguments[0] === undefined) {
      return;
    }

    // avoid smooth behavior if not required
    if (shouldBailOut(arguments[0]) === true) {
      // if one number is passed, throw error to match Firefox implementation
      if (typeof arguments[0] === 'number' && arguments[1] === undefined) {
        throw new SyntaxError('Value could not be converted');
      }

      original.elementScroll.call(
        this,
        // use left prop, first number argument or fallback to scrollLeft
        arguments[0].left !== undefined
          ? ~~arguments[0].left
          : typeof arguments[0] !== 'object' ? ~~arguments[0] : this.scrollLeft,
        // use top prop, second argument or fallback to scrollTop
        arguments[0].top !== undefined
          ? ~~arguments[0].top
          : arguments[1] !== undefined ? ~~arguments[1] : this.scrollTop
      );

      return;
    }

    var left = arguments[0].left;
    var top = arguments[0].top;

    // LET THE SMOOTHNESS BEGIN!
    smoothScroll.call(
      this,
      this,
      typeof left === 'undefined' ? this.scrollLeft : ~~left,
      typeof top === 'undefined' ? this.scrollTop : ~~top
    );
  };

  // Element.prototype.scrollBy
  Element.prototype.scrollBy = function() {
    // avoid action when no arguments are passed
    if (arguments[0] === undefined) {
      return;
    }

    // avoid smooth behavior if not required
    if (shouldBailOut(arguments[0]) === true) {
      original.elementScroll.call(
        this,
        arguments[0].left !== undefined
          ? ~~arguments[0].left + this.scrollLeft
          : ~~arguments[0] + this.scrollLeft,
        arguments[0].top !== undefined
          ? ~~arguments[0].top + this.scrollTop
          : ~~arguments[1] + this.scrollTop
      );

      return;
    }

    this.scroll({
      left: ~~arguments[0].left + this.scrollLeft,
      top: ~~arguments[0].top + this.scrollTop,
      behavior: arguments[0].behavior
    });
  };

  // Element.prototype.scrollIntoView
  Element.prototype.scrollIntoView = function() {
    // avoid smooth behavior if not required
    if (shouldBailOut(arguments[0]) === true) {
      original.scrollIntoView.call(
        this,
        arguments[0] === undefined ? true : arguments[0]
      );

      return;
    }

    // LET THE SMOOTHNESS BEGIN!
    var scrollableParent = findScrollableParent(this);
    var parentRects = scrollableParent.getBoundingClientRect();
    var clientRects = this.getBoundingClientRect();

    if (scrollableParent !== d.body) {
      // reveal element inside parent
      smoothScroll.call(
        this,
        scrollableParent,
        scrollableParent.scrollLeft + clientRects.left - parentRects.left,
        scrollableParent.scrollTop + clientRects.top - parentRects.top
      );

      // reveal parent in viewport unless is fixed
      if (w.getComputedStyle(scrollableParent).position !== 'fixed') {
        w.scrollBy({
          left: parentRects.left,
          top: parentRects.top,
          behavior: 'smooth'
        });
      }
    } else {
      // reveal element in viewport
      w.scrollBy({
        left: clientRects.left,
        top: clientRects.top,
        behavior: 'smooth'
      });
    }
  };
}

if (typeof exports === 'object' && typeof module !== 'undefined') {
  // commonjs
  module.exports = { polyfill: polyfill };
} else {
  // global
  polyfill();
}

angular.module("ngDraggable", [])
    .service('ngDraggable', [function() {


        var scope = this;
        scope.inputEvent = function(event) {
            if (angular.isDefined(event.touches)) {
                return event.touches[0];
            }
            //Checking both is not redundent. If only check if touches isDefined, angularjs isDefnied will return error and stop the remaining scripty if event.originalEvent is not defined.
            else if (angular.isDefined(event.originalEvent) && angular.isDefined(event.originalEvent.touches)) {
                return event.originalEvent.touches[0];
            }
            return event;
        };

        scope.touchTimeout = 100;

    }])
    .directive('ngDrag', ['$rootScope', '$parse', '$document', '$window', 'ngDraggable', function ($rootScope, $parse, $document, $window, ngDraggable) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                scope.value = attrs.ngDrag;
                var offset,_centerAnchor=false,_mx,_my,_tx,_ty,_mrx,_mry;
                var _hasTouch = ('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch;
                var _pressEvents = 'touchstart mousedown';
                var _moveEvents = 'touchmove mousemove';
                var _releaseEvents = 'touchend mouseup';
                var _dragHandle;

                // to identify the element in order to prevent getting superflous events when a single element has both drag and drop directives on it.
                var _myid = scope.$id;
                var _data = null;

                var _dragOffset = null;

                var _dragEnabled = false;

                var _pressTimer = null;
                var width = element[0].getBoundingClientRect().width;
                var onDragStartCallback = $parse(attrs.ngDragStart) || null;
                var onDragStopCallback = $parse(attrs.ngDragStop) || null;
                var onDragSuccessCallback = $parse(attrs.ngDragSuccess) || null;
                var dragLimitContainerClass = attrs.dragContainer || null;
                var dragLimitContainer = dragLimitContainerClass ? document.getElementsByClassName( dragLimitContainerClass )[0] : null;
                var allowTransform = angular.isDefined(attrs.allowTransform) ? scope.$eval(attrs.allowTransform) : true;

                var getDragData = $parse(attrs.ngDragData);

                // deregistration function for mouse move events in $rootScope triggered by jqLite trigger handler
                var _deregisterRootMoveListener = angular.noop;

                var initialize = function () {
                    element.attr('draggable', 'false'); // prevent native drag
                    // check to see if drag handle(s) was specified
                    // if querySelectorAll is available, we use this instead of find
                    // as JQLite find is limited to tagnames
                    if (element[0].querySelectorAll) {
                        var dragHandles = angular.element(element[0].querySelectorAll('[ng-drag-handle]'));
                    } else {
                        var dragHandles = element.find('[ng-drag-handle]');
                    }
                    if (dragHandles.length) {
                        _dragHandle = dragHandles;
                    }
                    toggleListeners(true);
                };

                var toggleListeners = function (enable) {
                    if (!enable)return;
                    // add listeners.

                    scope.$on('$destroy', onDestroy);
                    scope.$watch(attrs.ngDrag, onEnableChange);
                    scope.$watch(attrs.ngCenterAnchor, onCenterAnchor);
                    // wire up touch events
                    if (_dragHandle) {
                        // handle(s) specified, use those to initiate drag
                        _dragHandle.on(_pressEvents, onpress);
                    } else {
                        // no handle(s) specified, use the element as the handle
                        element.on(_pressEvents, onpress);
                    }
                    // if(! _hasTouch && element[0].nodeName.toLowerCase() == "img"){
                    if( element[0].nodeName.toLowerCase() == "img"){
                        element.on('mousedown', function(){ return false;}); // prevent native drag for images
                    }
                };
                var onDestroy = function (enable) {
                    toggleListeners(false);
                };
                var onEnableChange = function (newVal, oldVal) {
                    _dragEnabled = (newVal);
                };
                var onCenterAnchor = function (newVal, oldVal) {
                    if(angular.isDefined(newVal))
                        _centerAnchor = (newVal || 'true');
                };

                var isClickableElement = function (evt) {
                    return (
                        angular.isDefined(angular.element(evt.target).attr("ng-cancel-drag"))
                    );
                };
                /*
                 * When the element is clicked start the drag behaviour
                 * On touch devices as a small delay so as not to prevent native window scrolling
                 */
                var onpress = function(evt) {
                    // console.log("110"+" onpress: "+Math.random()+" "+ evt.type);
                    if(! _dragEnabled)return;

                    if (isClickableElement(evt)) {
                        return;
                    }

                    if (evt.type == "mousedown" && evt.button != 0) {
                        // Do not start dragging on right-click
                        return;
                    }

                    var useTouch = evt.type === 'touchstart' ? true : false;


                    if(useTouch){
                        cancelPress();
                        _pressTimer = setTimeout(function(){
                            cancelPress();
                            onlongpress(evt);
                            onmove(evt);
                        },ngDraggable.touchTimeout);
                        $document.on(_moveEvents, cancelPress);
                        $document.on(_releaseEvents, cancelPress);
                    }else{
                        onlongpress(evt);
                    }
                    evt.stopPropagation();
                };

                var cancelPress = function() {
                    clearTimeout(_pressTimer);
                    $document.off(_moveEvents, cancelPress);
                    $document.off(_releaseEvents, cancelPress);
                };

                var onlongpress = function(evt) {
                    if(! _dragEnabled)return;
                    evt.preventDefault();

                    offset = element[0].getBoundingClientRect();
                    if(allowTransform)
                        _dragOffset = offset;
                    else{
                        _dragOffset = {left:document.body.scrollLeft, top:document.body.scrollTop};
                    }


                    element.centerX = element[0].offsetWidth / 2;
                    element.centerY = element[0].offsetHeight / 2;

                    _mx = ngDraggable.inputEvent(evt).pageX;//ngDraggable.getEventProp(evt, 'pageX');
                    _my = ngDraggable.inputEvent(evt).pageY;//ngDraggable.getEventProp(evt, 'pageY');
                    _mrx = _mx - offset.left;
                    _mry = _my - offset.top;
                    if (_centerAnchor) {
                        _tx = _mx - element.centerX - $window.pageXOffset;
                        _ty = _my - element.centerY - $window.pageYOffset;
                    } else {
                        _tx = _mx - _mrx - $window.pageXOffset;
                        _ty = _my - _mry - $window.pageYOffset;
                    }

                    $document.on(_moveEvents, onmove);
                    $document.on(_releaseEvents, onrelease);
                    // This event is used to receive manually triggered mouse move events
                    // jqLite unfortunately only supports triggerHandler(...)
                    // See http://api.jquery.com/triggerHandler/
                    // _deregisterRootMoveListener = $rootScope.$on('draggable:_triggerHandlerMove', onmove);
                    _deregisterRootMoveListener = $rootScope.$on('draggable:_triggerHandlerMove', function(event, origEvent) {
                        onmove(origEvent);
                    });
                    evt.stopPropagation();
                };

                var onmove = function (evt) {
                    if (!_dragEnabled)return;
                    evt.preventDefault();

                    if (!element.hasClass('dragging')) {
                        _data = getDragData(scope);
                        element.addClass('dragging');
                        $rootScope.$broadcast('draggable:start', {x:_mx, y:_my, tx:_tx, ty:_ty, event:evt, element:element, data:_data});

                        if (onDragStartCallback ){
                            scope.$apply(function () {
                                onDragStartCallback(scope, {$data: _data, $event: evt});
                            });
                        }
                    }

                    _mx = ngDraggable.inputEvent(evt).pageX;//ngDraggable.getEventProp(evt, 'pageX');
                    _my = ngDraggable.inputEvent(evt).pageY;//ngDraggable.getEventProp(evt, 'pageY');

                    if (_centerAnchor) {
                        _tx = _mx - element.centerX - _dragOffset.left;
                        _ty = _my - element.centerY - _dragOffset.top;
                    } else {
                        _tx = _mx - _mrx - _dragOffset.left;
                        _ty = _my - _mry - _dragOffset.top;
                    }

                    moveElement(_tx, _ty);

                    $rootScope.$broadcast('draggable:move', { x: _mx, y: _my, tx: _tx, ty: _ty, event: evt, element: element, data: _data, uid: _myid, dragOffset: _dragOffset });
                    evt.stopPropagation();
                };

                var onrelease = function(evt) {
                    if (!_dragEnabled)
                        return;
                    evt.preventDefault();
                    $rootScope.$broadcast('draggable:end', {x:_mx, y:_my, tx:_tx, ty:_ty, event:evt, element:element, data:_data, callback:onDragComplete, uid: _myid});
                    element.removeClass('dragging');
                    element.parent().find('.drag-enter').removeClass('drag-enter');
                    reset();
                    $document.off(_moveEvents, onmove);
                    $document.off(_releaseEvents, onrelease);

                    if (onDragStopCallback ){
                        scope.$apply(function () {
                            onDragStopCallback(scope, {$data: _data, $event: evt});
                        });
                    }

                    _deregisterRootMoveListener();
                    evt.stopPropagation();
                };

                var onDragComplete = function(evt) {


                    if (!onDragSuccessCallback )return;

                    scope.$apply(function () {
                        onDragSuccessCallback(scope, {$data: _data, $event: evt});
                    });
                    // evt.stopPropagation();
                };

                var reset = function() {
                    if(allowTransform)
                        element.css({transform:'', 'z-index':'', '-webkit-transform':'', '-ms-transform':''});
                    else
                        element.css({'position':'',top:'',left:''});
                };

                var scrollBuffer = 20;
                var scrollBy = 50;
                var moveElement = function (x, y) {
                    if( dragLimitContainer ) {
                        var domElBounds = element[0].getBoundingClientRect();
                        containerBounds = dragLimitContainer.getBoundingClientRect();
                        if( domElBounds.left < containerBounds.left ){
                            x = containerBounds.x;
                        }

                        if( domElBounds.bottom > containerBounds.bottom - scrollBuffer ) {
                            dragLimitContainer.scrollBy({top: scrollBy, left: 0, behavior: 'instant'});
                        }

                        if( domElBounds.top < containerBounds.top + scrollBuffer ) {
                            dragLimitContainer.scrollBy({top: -1 * scrollBy, left: 0, behavior: 'instant'});
                        }
                    }
                    if(allowTransform) {
                        element.css({
                            transform: 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, ' + x + ', ' + y + ', 0, 1)',
                            'z-index': 99999,
                            '-webkit-transform': 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, ' + x + ', ' + y + ', 0, 1)',
                            '-ms-transform': 'matrix(1, 0, 0, 1, ' + x + ', ' + y + ')'
                        });
                    }else{
                        
                        element.css({'left':x+'px','top':y+'px', 'position':'fixed', width: width + 'px'});
                    }
                };
                initialize();
            }
        };
    }])

    .directive('ngDrop', ['$parse', '$timeout', '$window', '$document', 'ngDraggable', function ($parse, $timeout, $window, $document, ngDraggable) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                scope.value = attrs.ngDrop;
                scope.isTouching = false;

                var _lastDropTouch=null;

                var _myid = scope.$id;

                var _dropEnabled=false;

                var onDropCallback = $parse(attrs.ngDropSuccess);// || function(){};

                var onDragStartCallback = $parse(attrs.ngDragStart);
                var onDragStopCallback = $parse(attrs.ngDragStop);
                var onDragMoveCallback = $parse(attrs.ngDragMove);

                var initialize = function () {
                    toggleListeners(true);
                };

                var toggleListeners = function (enable) {
                    // remove listeners

                    if (!enable)return;
                    // add listeners.
                    scope.$watch(attrs.ngDrop, onEnableChange);
                    scope.$on('$destroy', onDestroy);
                    scope.$on('draggable:start', onDragStart);
                    scope.$on('draggable:move', onDragMove);
                    scope.$on('draggable:end', onDragEnd);
                };

                var onDestroy = function (enable) {
                    toggleListeners(false);
                };
                var onEnableChange = function (newVal, oldVal) {
                    _dropEnabled=newVal;
                };
                var onDragStart = function(evt, obj) {
                    if(! _dropEnabled)return;
                    isTouching(obj.x,obj.y,obj.element);

                    if (attrs.ngDragStart) {
                        $timeout(function(){
                            onDragStartCallback(scope, {$data: obj.data, $event: obj});
                        });
                    }
                };
                var onDragMove = function(evt, obj) {
                    if(! _dropEnabled)return;
                    isTouching(obj.x,obj.y,obj.element);

                    if (attrs.ngDragMove) {
                        $timeout(function(){
                            onDragMoveCallback(scope, {$data: obj.data, $event: obj});
                        });
                    }
                };

                var onDragEnd = function (evt, obj) {

                    // don't listen to drop events if this is the element being dragged
                    // only update the styles and return
                    if (!_dropEnabled || _myid === obj.uid) {
                        updateDragStyles(false, obj.element);
                        return;
                    }
                    if (isTouching(obj.x, obj.y, obj.element)) {
                        // call the ngDraggable ngDragSuccess element callback
                        if(obj.callback){
                            obj.callback(obj);
                        }

                        if (attrs.ngDropSuccess) {
                            $timeout(function(){
                                onDropCallback(scope, {$data: obj.data, $event: obj, $target: scope.$eval(scope.value)});
                            });
                        }
                    }

                    if (attrs.ngDragStop) {
                        $timeout(function(){
                            onDragStopCallback(scope, {$data: obj.data, $event: obj});
                        });
                    }

                    updateDragStyles(false, obj.element);
                };

                var isTouching = function(mouseX, mouseY, dragElement) {
                    var touching= hitTest(mouseX, mouseY);
                    scope.isTouching = touching;
                    if(touching){
                        _lastDropTouch = element;
                    }
                    updateDragStyles(touching, dragElement);
                    return touching;
                };

                var updateDragStyles = function(touching, dragElement) {
                    if(touching){
                        element.addClass('drag-enter');
                        dragElement.addClass('drag-over');
                    }else if(_lastDropTouch == element){
                        _lastDropTouch=null;
                        element.removeClass('drag-enter');
                        dragElement.removeClass('drag-over');
                    }
                };

                var hitTest = function(x, y) {
                    var bounds = element[0].getBoundingClientRect();// ngDraggable.getPrivOffset(element);
                    x -= $document[0].body.scrollLeft + $document[0].documentElement.scrollLeft;
                    y -= $document[0].body.scrollTop + $document[0].documentElement.scrollTop;
                    return  x >= bounds.left
                        && x <= bounds.right
                        && y <= bounds.bottom
                        && y >= bounds.top;
                };

                initialize();
            }
        };
    }])
    .directive('ngDragClone', ['$parse', '$timeout', 'ngDraggable', function ($parse, $timeout, ngDraggable) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                var img, _allowClone=true;
                var _dragOffset = null;
                scope.clonedData = {};
                var initialize = function () {

                    img = element.find('img');
                    element.attr('draggable', 'false');
                    img.attr('draggable', 'false');
                    reset();
                    toggleListeners(true);
                };


                var toggleListeners = function (enable) {
                    // remove listeners

                    if (!enable)return;
                    // add listeners.
                    scope.$on('draggable:start', onDragStart);
                    scope.$on('draggable:move', onDragMove);
                    scope.$on('draggable:end', onDragEnd);
                    preventContextMenu();

                };
                var preventContextMenu = function() {
                    //  element.off('mousedown touchstart touchmove touchend touchcancel', absorbEvent_);
                    img.off('mousedown touchstart touchmove touchend touchcancel', absorbEvent_);
                    //  element.on('mousedown touchstart touchmove touchend touchcancel', absorbEvent_);
                    img.on('mousedown touchstart touchmove touchend touchcancel', absorbEvent_);
                };
                var onDragStart = function(evt, obj, elm) {
                    _allowClone=true;
                    if(angular.isDefined(obj.data.allowClone)){
                        _allowClone=obj.data.allowClone;
                    }
                    if(_allowClone) {
                        scope.$apply(function () {
                            scope.clonedData = obj.data;
                        });
                        element.css('width', obj.element[0].offsetWidth);
                        element.css('height', obj.element[0].offsetHeight);

                        moveElement(obj.tx, obj.ty);
                    }

                };
                var onDragMove = function(evt, obj) {
                    if(_allowClone) {

                        _tx = obj.tx + obj.dragOffset.left;
                        _ty = obj.ty + obj.dragOffset.top;

                        moveElement(_tx, _ty);
                    }
                };
                var onDragEnd = function(evt, obj) {
                    //moveElement(obj.tx,obj.ty);
                    if(_allowClone) {
                        reset();
                    }
                };

                var reset = function() {
                    element.css({left:0,top:0, position:'fixed', 'z-index':-1, visibility:'hidden'});
                };
                var moveElement = function(x,y) {
                    element.css({
                        transform: 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, '+x+', '+y+', 0, 1)', 'z-index': 99999, 'visibility': 'visible',
                        '-webkit-transform': 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, '+x+', '+y+', 0, 1)',
                        '-ms-transform': 'matrix(1, 0, 0, 1, '+x+', '+y+')'
                        //,margin: '0'  don't monkey with the margin,
                    });
                };

                var absorbEvent_ = function (event) {
                    var e = event;//.originalEvent;
                    e.preventDefault && e.preventDefault();
                    e.stopPropagation && e.stopPropagation();
                    e.cancelBubble = true;
                    e.returnValue = false;
                    return false;
                };

                initialize();
            }
        };
    }])
    .directive('ngPreventDrag', ['$parse', '$timeout', function ($parse, $timeout) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                var initialize = function () {

                    element.attr('draggable', 'false');
                    toggleListeners(true);
                };


                var toggleListeners = function (enable) {
                    // remove listeners

                    if (!enable)return;
                    // add listeners.
                    element.on('mousedown touchstart touchmove touchend touchcancel', absorbEvent_);
                };


                var absorbEvent_ = function (event) {
                    var e = event.originalEvent;
                    e.preventDefault && e.preventDefault();
                    e.stopPropagation && e.stopPropagation();
                    e.cancelBubble = true;
                    e.returnValue = false;
                    return false;
                };

                initialize();
            }
        };
    }])
    .directive('ngCancelDrag', [function () {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                element.find('*').attr('ng-cancel-drag', 'ng-cancel-drag');
            }
        };
    }])
    .directive('ngDragScroll', ['$window', '$interval', '$timeout', '$document', '$rootScope', function($window, $interval, $timeout, $document, $rootScope) {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                var intervalPromise = null;
                var lastMouseEvent = null;

                var config = {
                    verticalScroll: attrs.verticalScroll || true,
                    horizontalScroll: attrs.horizontalScroll || true,
                    activationDistance: attrs.activationDistance || 75,
                    scrollDistance: attrs.scrollDistance || 15
                };


                var reqAnimFrame = (function() {
                    return window.requestAnimationFrame ||
                        window.webkitRequestAnimationFrame ||
                        window.mozRequestAnimationFrame ||
                        window.oRequestAnimationFrame ||
                        window.msRequestAnimationFrame ||
                        function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element ) {
                            window.setTimeout(callback, 1000 / 60);
                        };
                })();

                var animationIsOn = false;
                var createInterval = function() {
                    animationIsOn = true;

                    function nextFrame(callback) {
                        var args = Array.prototype.slice.call(arguments);
                        if(animationIsOn) {
                            reqAnimFrame(function () {
                                $rootScope.$apply(function () {
                                    callback.apply(null, args);
                                    nextFrame(callback);
                                });
                            })
                        }
                    }

                    nextFrame(function() {
                        if (!lastMouseEvent) return;

                        var viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
                        var viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

                        var scrollX = 0;
                        var scrollY = 0;

                        if (config.horizontalScroll) {
                            // If horizontal scrolling is active.
                            if (lastMouseEvent.clientX < config.activationDistance) {
                                // If the mouse is on the left of the viewport within the activation distance.
                                scrollX = -config.scrollDistance;
                            }
                            else if (lastMouseEvent.clientX > viewportWidth - config.activationDistance) {
                                // If the mouse is on the right of the viewport within the activation distance.
                                scrollX = config.scrollDistance;
                            }
                        }

                        if (config.verticalScroll) {
                            // If vertical scrolling is active.
                            if (lastMouseEvent.clientY < config.activationDistance) {
                                // If the mouse is on the top of the viewport within the activation distance.
                                scrollY = -config.scrollDistance;
                            }
                            else if (lastMouseEvent.clientY > viewportHeight - config.activationDistance) {
                                // If the mouse is on the bottom of the viewport within the activation distance.
                                scrollY = config.scrollDistance;
                            }
                        }



                        if (scrollX !== 0 || scrollY !== 0) {
                            // Record the current scroll position.
                            var currentScrollLeft = ($window.pageXOffset || $document[0].documentElement.scrollLeft);
                            var currentScrollTop = ($window.pageYOffset || $document[0].documentElement.scrollTop);

                            // Remove the transformation from the element, scroll the window by the scroll distance
                            // record how far we scrolled, then reapply the element transformation.
                            var elementTransform = element.css('transform');
                            element.css('transform', 'initial');

                            $window.scrollBy(scrollX, scrollY);

                            var horizontalScrollAmount = ($window.pageXOffset || $document[0].documentElement.scrollLeft) - currentScrollLeft;
                            var verticalScrollAmount =  ($window.pageYOffset || $document[0].documentElement.scrollTop) - currentScrollTop;

                            element.css('transform', elementTransform);

                            lastMouseEvent.pageX += horizontalScrollAmount;
                            lastMouseEvent.pageY += verticalScrollAmount;

                            $rootScope.$emit('draggable:_triggerHandlerMove', lastMouseEvent);
                        }

                    });
                };

                var clearInterval = function() {
                    animationIsOn = false;
                };

                scope.$on('draggable:start', function(event, obj) {
                    // Ignore this event if it's not for this element.
                    if (obj.element[0] !== element[0]) return;

                    if (!animationIsOn) createInterval();
                });

                scope.$on('draggable:end', function(event, obj) {
                    // Ignore this event if it's not for this element.
                    if (obj.element[0] !== element[0]) return;

                    if (animationIsOn) clearInterval();
                });

                scope.$on('draggable:move', function(event, obj) {
                    // Ignore this event if it's not for this element.
                    if (obj.element[0] !== element[0]) return;

                    lastMouseEvent = obj.event;
                });
            }
        };
    }]);
