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
    updatePointer(this.CodeMirror, e.pageX, e.pageY);
    delayedInteraction(this.CodeMirror);
  }

  function mouseout(e) {
    /* eslint-disable no-invalid-this */
    var cm = this.CodeMirror;
    if (e.target !== cm.getWrapperElement())
      return;
    tooltip.hide();
  }

  function touchstart(e) {
    /* eslint-disable no-invalid-this */
    mode = "touch";
    updatePointer(this.CodeMirror, e.touches[0].pageX, e.touches[0].pageY);
    delayedInteraction(this.CodeMirror);
  }

  function click(e) {
    /* eslint-disable no-invalid-this */
    if (mode === "hover") {
      clear(this.CodeMirror);
      return;
    }

    updatePointer(this.CodeMirror, e.pageX, e.pageY);
    interaction(this.CodeMirror);
  }

  function keyup() {
    /* eslint-disable no-invalid-this */
    clear(this.CodeMirror);
  }

  function updatePointer(cm, x, y) {
    var pointer = cm.state.infotip.pointer;
    pointer.x = x;
    pointer.y = y;
  }

  var activeTimeout;
  function delayedInteraction(cm) {
    /* eslint-disable no-invalid-this */
    if (activeTimeout) {
      clearTimeout(activeTimeout);
    }

    activeTimeout = setTimeout(function() {
      interaction(cm);
      activeTimeout = null;
    }, 100);
  }

  function interaction(cm) {
    var coords = getPointerCoords(cm);
    if (cm.state.infotip.lastCoords && coordsEqual(coords, cm.state.infotip.lastCoords))
      return;

    var getInfo = cm.getHelper(coords, "infotip") || cm.state.infotip.getInfo;

    cm.state.infotip.lastCoords = coords;
    if (cm.state.infotip.async || getInfo.async) {
      if (tooltip.active && !isInRange(coords, tooltip.info.range))
        tooltip.hide();
      getInfo(cm, coords, cm.state.infotip.update);
    }
    else {
      showOrHide(cm, getInfo(cm, coords));
    }
  }

  function getPointerCoords(cm) {
    var pointer = cm.state.infotip.pointer;
    return cm.coordsChar({ left: pointer.x, top: pointer.y });
  }

  function clear(cm) {
    cm.state.infotip.lastCoords = null;
    showOrHide(cm, null);
  }

  function update(cm, info) {
    var coords = getPointerCoords(cm);
    if (info && !isInRange(coords, info.range)) // mouse has moved before we got an async update
      return;

    showOrHide(cm, info);
  }

  function showOrHide(cm, info) {
    if (info == null) {
      tooltip.hide();
      return;
    }

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
    if (position.line === range.from.line)
      return position.ch >= range.from.ch;
    if (position.line === range.to.line)
      return position.ch <= range.to.ch;
    return position.line > range.from.line
        && position.line < range.to.line
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

    state = {
      async: options.async,
      getInfo: options.getInfo,
      render: options.render,
      pointer: {}
    };
    cm.state.infotip = state;
    CodeMirror.on(wrapper, "click",      click);
    CodeMirror.on(wrapper, "touchstart", touchstart);
    CodeMirror.on(wrapper, "mousemove",  mousemove);
    CodeMirror.on(wrapper, "mouseout",   mouseout);
    CodeMirror.on(wrapper, "keyup",      keyup);
  });
});