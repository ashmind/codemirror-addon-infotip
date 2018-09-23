(function(mod) {
  if (typeof exports === "object" && typeof module === "object") // CommonJS
    mod(require("codemirror"));
  else if (typeof define === "function" && define.amd) // AMD
    define(["codemirror"], mod);
  else // Plain browser env
    mod(window.CodeMirror);
})(function(CodeMirror) {
  "use strict";

  var CLASS = "CodeMirror-infotip";
  var CLASS_HIDDEN = "CodeMirror-infotip-hidden";

  var tooltip = (function() {
    var element;

    var ensureElement = function() {
      if (element)
        return;
      element = document.createElement("div");
      element.className = CLASS + " " + CLASS_HIDDEN + " cm-s-default"; // TODO: dynamic theme based on current cm
      element.setAttribute("hidden", "hidden");
      CodeMirror.on(element, "click", function() { tooltip.hide(); });
      document.getElementsByTagName("body")[0].appendChild(element);

      element.addEventListener("transitionend", function(e) {
        if (e.propertyName === "opacity" && !tooltip.active) {
          element.setAttribute("hidden", "hidden");
        }
      });
    };

    return {
      show: function(render, info, left, top, altBottom) {
        if (!this.active)
          ensureElement();

        while (element.firstChild) {
          element.removeChild(element.firstChild);
        }
        render(element, info.data);
        element.style.top = top + "px";
        element.style.left = left + "px";
        if (!this.active) {
          this.active = true;
          element.removeAttribute("hidden");
          element.classList.remove(CLASS_HIDDEN);
          // Note: we have to show it *before* we check for a better position
          // otherwise we can't calculate the size
        }

        var rect = element.getBoundingClientRect();
        var betterLeft = (rect.right <= window.innerWidth) ? left : (left - (rect.right - window.innerWidth));
        var betterTop = (rect.bottom <= window.innerHeight) ? top : (altBottom - rect.height);
        if (betterLeft !== left || betterTop !== top) {
            element.style.top = betterTop + "px";
            element.style.left = betterLeft + "px";
        }

        this.info = info;
      },

      hide: function() {
        if (!this.active || !element)
          return;

        element.classList.add(CLASS_HIDDEN);
        this.active = false;
      }
    };
  })();

  var mode = "hover";

  function mousemove(e) {
    /* eslint-disable no-invalid-this */
    delayedInteraction(this.CodeMirror, e.pageX, e.pageY);
  }

  function mouseout(e) {
    /* eslint-disable no-invalid-this */
    var cm = this.CodeMirror;
    if (e.target !== cm.getWrapperElement())
      return;
    hideAndClear(this.CodeMirror);
  }

  function touchstart(e) {
    /* eslint-disable no-invalid-this */
    mode = "touch";
    delayedInteraction(this.CodeMirror, e.touches[0].pageX, e.touches[0].pageY);
  }

  function click(e) {
    /* eslint-disable no-invalid-this */
    if (mode === "hover") {
      hideAndClear(this.CodeMirror);
      return;
    }

    immediateInteraction(this.CodeMirror, e.pageX, e.pageY);
  }

  function keyup() {
    /* eslint-disable no-invalid-this */
    hideAndClear(this.CodeMirror);
  }

  function updatePointer(cm, x, y) {
    var pointer = cm.state.infotip.pointer;
    pointer.x = x;
    pointer.y = y;
  }

  function delayedInteraction(cm, x, y) {
    updatePointer(cm, x, y);
    delayedHide(cm);
    delayedGetInfoAndUpdate(cm);
  }

  function immediateInteraction(cm, x, y) {
    updatePointer(cm, x, y);
    getInfoAndUpdate(cm);
  }

  var hideTimeout;
  function delayedHide(cm) {
    if (hideTimeout || !tooltip.active) {
      return;
    }
    hideTimeout = setTimeout(function() {
      try {
        var next = getStateForNextActionOrHide(cm);
        if (next && next.async)
          hideIfNotInRange(next.coords);
      }
      finally {
        hideTimeout = null;
      }
    }, 100);
  }

  var showTimeout;
  function delayedGetInfoAndUpdate(cm) {
    if (showTimeout) {
      clearTimeout(showTimeout);
    }

    showTimeout = setTimeout(function() {
      getInfoAndUpdate(cm);
      showTimeout = null;
    }, cm.state.infotip.delay);
  }

  function getInfoAndUpdate(cm) {
    var next = getStateForNextActionOrHide(cm);
    if (!next)
      return;

    var getInfo = next.getInfo;
    cm.state.infotip.lastCoords = next.coords;

    if (next.async) {
      getInfo(cm, next.coords, cm.state.infotip.update);
      return;
    }

    var info = getInfo(cm, next.coords);
    if (info) {
      show(cm, info);
    }
    else {
      tooltip.hide();
    }
  }

  function getStateForNextActionOrHide(cm) {
    var coords = getPointerCoords(cm);
    if (coordsAreSameAsLast(cm, coords))
      return null;

    var helper = cm.getHelper(coords, "infotip") || {};
    var getInfo = helper.getInfo || cm.state.infotip.getInfo;
    if (!getInfo) {
      hideAndClear(cm);
      return null;
    }

    return {
      coords: coords,
      getInfo: getInfo,
      async: helper.async !== undefined ? helper.async : cm.state.infotip.async
    };
  }

  function hideIfNotInRange(coords) {
    if (tooltip.active && !isInRange(coords, tooltip.info.range))
      tooltip.hide();
  }

  function coordsAreSameAsLast(cm, coords) {
    return cm.state.infotip.lastCoords && coordsEqual(coords, cm.state.infotip.lastCoords);
  }

  function getPointerCoords(cm) {
    var pointer = cm.state.infotip.pointer;
    return cm.coordsChar({ left: pointer.x, top: pointer.y });
  }

  function hideAndClear(cm) {
    cm.state.infotip.lastCoords = null;
    tooltip.hide();
  }

  function update(cm, info) {
    var coords = getPointerCoords(cm);
    if (info && !isInRange(coords, info.range)) // mouse has moved before we got an async update
      return;

    if (info === null) {
      tooltip.hide();
      return;
    }

    show(cm, info);
  }

  function show(cm, info) {
    if (tooltip.active && rangesEqual(info.range, tooltip.info.range))
      return;

    var showAt = cm.cursorCoords(CodeMirror.Pos(info.range.from.line, info.range.from.ch));
    var render = info.render || cm.state.infotip.render || renderDataAsText;
    tooltip.show(render, info, showAt.left, showAt.bottom, showAt.top);
  }

  function renderDataAsText(element, data) {
    element.textContent = data;
  }

  function coordsEqual(coords, other) {
    return coords.line === other.line
        && coords.ch === other.ch;
  }

  function rangesEqual(range, other) {
    return coordsEqual(range.from, other.from)
        && coordsEqual(range.to, other.to);
  }

  function isInRange(position, range) {
    if (position.line < range.from.line)
      return false;
    if (position.line === range.from.line && position.ch < range.from.ch)
      return false;
    if (position.line > range.to.line)
      return false;
    if (position.line === range.to.line && position.ch > range.to.ch)
      return false;
    return true;
  }

  CodeMirror.defineExtension("infotipUpdate", function(info) {
    /* eslint-disable no-invalid-this */
    update(this, info);
  });

  CodeMirror.defineExtension("infotipIsActive", function() {
    return tooltip.active;
  });

  CodeMirror.defineOption("infotip", null, function(cm, options, old) {
    var wrapper = cm.getWrapperElement();
    var state = cm.state.infotip;
    if (old && old !== CodeMirror.Init && state) {
      CodeMirror.off(wrapper, "click",      click);
      CodeMirror.off(wrapper, "touchstart", touchstart);
      CodeMirror.off(wrapper, "mousemove",  mousemove);
      CodeMirror.off(wrapper, "mouseout",   mouseout);
      CodeMirror.off(wrapper, "keyup",      keyup);
      delete cm.state.infotip;
    }

    if (!options)
      return;

    if (options.delay && options.delay < 100)
      throw new Error("Delay can't be less than 100ms.");

    state = {
      async: options.async,
      getInfo: options.getInfo,
      delay: options.delay || 300,
      render: options.render,
      pointer: {},
      update: function(info) { update(cm, info); }
    };
    cm.state.infotip = state;
    CodeMirror.on(wrapper, "click",      click);
    CodeMirror.on(wrapper, "touchstart", touchstart);
    CodeMirror.on(wrapper, "mousemove",  mousemove);
    CodeMirror.on(wrapper, "mouseout",   mouseout);
    CodeMirror.on(wrapper, "keyup",      keyup);
  });
});