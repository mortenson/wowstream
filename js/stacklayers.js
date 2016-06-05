/*jslint browser: true*/
/*jslint plusplus: true */
/*jslint nomen: true */
/*global Two*/

var ws_stackrings = (function () {
  'use strict';

  function StackRings(elem, layers) {
    // Add required elements to the parent element.
    elem.innerHTML = '<div id="request-info" tabindex="-1"><div class="triangle"></div><p></p></div>';

    // When we lose focus on the tooltip, close it.
    document.getElementById('request-info').addEventListener('blur', function (e) {
      e.target.style.display = 'none';
    });

    // Initialize two.js.
    this.two = new Two({width: window.innerWidth - 20, height: window.innerHeight - 20}).appendTo(elem);
    // Add helper properties to reduce a common calculation.
    this.two.middle_x = this.two.width / 2;
    this.two.middle_y = this.two.height / 2;
    // Contains metadata and two.js objects for each request.
    this.requests = {};
    // A kind-of-arbitrary limit for how many requests can be shown.
    this.max_requests = 50;
    // More helper variables to quickly calculate layer order and count.
    this.log_types = [];
    this.log_count = {total: 0};

    // Render the layers before starting the app.
    var layer_line_width = 5, initial_radius, i, radius;
    initial_radius = this.two.width < this.two.height ? this.two.width / 2.5 : this.two.height / 2.5;
    initial_radius -= layer_line_width;
    for (i in layers) {
      if (layers.hasOwnProperty(i)) {
        // Fill our helper variables for future use.
        this.log_types.push(layers[i].type);
        this.log_count[layers[i].type] = 0;

        radius = initial_radius - ((initial_radius / layers.length) * i);
        this.renderCircle(radius, layer_line_width, layers[i]);
        // The center circle should have its text centered.
        if (layers.length - 1 === parseInt(i, 10)) {
          layers[i].label.translation.y = this.two.middle_y;
        }
      }
    }
    this.layers = layers;

    // Add a cache health text.
    this.renderCacheText();

    // Add the pause/play button.
    this.renderPauseButton();

    // Main render loop. Moves requests towards their target layer.
    this.two.bind('update', this.update.bind(this)).play();
  }

  StackRings.prototype.update = function () {
    var i, request, j, layer, dx, dy, dist, filter_layers, point, pdx,
      pdy, pdist, cache_ratio;

    filter_layers = function (value) {
      /*jshint validthis: true */
      return value.type === this.type;
    };

    for (i in this.requests) {
      if (this.requests.hasOwnProperty(i)) {
        request = this.requests[i];

        // Bounds checking.
        for (j in this.layers) {
          if (this.layers.hasOwnProperty(j)) {
            layer = this.layers[j];
            dx = request.shape.translation.x - this.two.middle_x;
            dy = request.shape.translation.y - this.two.middle_y;
            dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= layer.shape.radius) {
              request.intersecting = layer.type;
              if (layer.shape.opacity < 1) {
                layer.shape.opacity += 0.03;
              }
            }
          }
        }

        if (request.life <= 0) {
          ++this.log_count[request.type];
          ++this.log_count.total;
          this.two.remove(request.shape);
          delete this.requests[i];
        } else {
          layer = this.layers.filter(filter_layers, request).pop();

          // Bounds checking.
          if (request.intersecting === layer.type || request.point_index >= request.points.length) {
            --this.requests[i].life;
            request.shape.opacity = request.life / 30;
          } else {
            // Animate movement.
            point = request.points[request.point_index];
            pdx = point.x - this.two.middle_x;
            pdy = point.y - this.two.middle_y;
            pdist = Math.sqrt(pdx * pdx + pdy * pdy);
            // We're about to move past the edge of the circle, move to the
            // closest point instead.
            if (pdist < layer.shape.radius) {
              point.x = this.two.middle_x + dx / dist * layer.shape.radius;
              point.y = this.two.middle_y + dy / dist * layer.shape.radius;
            }
            request.shape.translation.set(point.x, point.y);
            ++request.point_index;
          }
        }
      }
    }

    for (i in this.layers) {
      if (this.layers.hasOwnProperty(i)) {
        if (this.layers[i].shape && this.layers[i].shape.opacity > 0.5) {
          this.layers[i].shape.opacity -= 0.01;
        }
      }
    }

    // Update our cache statistics.
    if (this.log_count.total > 0) {
      cache_ratio = (this.log_count['bal-request'] + this.log_count['varnish-request']) / this.log_count.total;
      this.cache_text.value = Math.floor(cache_ratio * 100);
      this.cache_text.value += '%';
    }
  };

  StackRings.prototype.renderPauseButton = function () {
    var line1 = this.two.makeRectangle(20, 30, 10, 30),
      line2 = this.two.makeRectangle(40, 30, 10, 30),
      pause = this.two.makeGroup(line1, line2),
      play = this.two.makePolygon(25, 30, 20),
      button = this.two.makeRectangle(30, 30, 50, 50);
    pause.opacity = 1;
    play.rotation = Math.PI / 2;
    play.opacity = 0;
    line2.fill = line1.fill = play.fill = 'white';
    button.fill = button.stroke = 'transparent';

    // When the pause/play button is clicked, pause the two.js scene.
    this.two.update();
    this.pause_button = pause;
    this.play_button = play;
    button._renderer.elem.onclick = this.onButtonClick.bind(this);
  };

  StackRings.prototype.onButtonClick = function () {
    // Toggle visibility.
    this.play_button.opacity = 1 - this.play_button.opacity;
    this.pause_button.opacity = 1 - this.pause_button.opacity;
    if (this.pause_button.opacity) {
      this.two.play();
    } else {
      this.two.update();
      this.two.pause();
    }
    document.getElementById('request-info').style.display = 'none';
  };

  StackRings.prototype.renderCacheText = function () {
    this.cache_text = this.two.makeText('100%', this.two.width - 40, 30);
    this.cache_text.size = 30;
    var cache_help_text = this.two.makeText('Cached hits', this.two.width - 40, 50);
    this.cache_text.fill = cache_help_text.fill = 'white';
  };

  StackRings.prototype.renderCircle = function (radius, layer_line_width, layer) {
    var circle = this.two.makeCircle(this.two.middle_x, this.two.middle_y, radius),
      y = this.two.middle_y + (radius - (layer_line_width * 4)),
      text = this.two.makeText(layer.label, this.two.middle_x, y);
    circle.fill = 'transparent';
    circle.stroke = layer.stroke;
    circle.linewidth = layer_line_width;
    circle.opacity = 0.5;
    circle.radius = radius;

    text.fill = 'white';

    layer.shape = circle;
    layer.label = text;
  };

  StackRings.prototype.handleRequest = function (request_id, data) {
    var type = data.log_type, shape, request, radius, angle, center_x,
      center_y, points;
    if (this.requests.hasOwnProperty(request_id)) {
      request = this.requests[request_id];
      // Return early if we're getting requests out of order.
      if (this.log_types.indexOf(request.type) > this.log_types.indexOf(type)) {
        return;
      }
      shape = request.shape;
    } else {
      // Check to see if we have two many requests on screen already.
      if (Object.keys(this.requests).length >= this.max_requests) {
        return;
      }
      shape = this.two.makeCircle(0, this.two.middle_y, 10);
      shape.linewidth = 1;
      shape.stroke = '#B7B7B7';
      // Choose an arbitrary position to start the request.
      radius = this.two.width < this.two.height ? this.two.middle_x : this.two.middle_y;
      angle = Math.random() * Math.PI * 2;
      shape.translation.x = this.two.middle_x + (Math.cos(angle) * radius);
      shape.translation.y = this.two.middle_y + (Math.sin(angle) * radius);
    }

    center_x = (shape.translation.x + this.two.middle_x) / 2;
    center_y = (shape.translation.y + this.two.middle_y) / 2;
    // Randomize a bezier curve to give the requests some individuality.
    center_x += (Math.round(Math.random()) * 2 - 1) * Math.floor(Math.random() * 50) + 50;
    center_y += (Math.round(Math.random()) * 2 - 1) * Math.floor(Math.random() * 50) + 50;
    points = Two.Utils.subdivide(shape.translation.x, shape.translation.y, center_x, center_y, center_x, center_y, this.two.middle_x, this.two.middle_y, 24);

    this.requests[request_id] = {
      type: type,
      life: 30,
      shape: shape,
      points: points,
      point_index: 0,
      data: data.text
    };

    // We have to render now to bind the click event, as the element does
    // not currently exist.
    this.two.update();

    shape._renderer.elem.setAttribute('data-request-id', request_id);
    shape._renderer.elem.onclick = this.onRequestClick.bind(this);
  };

  StackRings.prototype.onRequestClick = function (e) {
    var request_id, request, popup;
    // When a request is clicked, display the tooltip.
    if (!this.two.playing) {
      request_id = e.target.getAttribute('data-request-id');
      request = this.requests[request_id];
      popup = document.getElementById('request-info');
      popup.children[1].innerHTML = request.data;
      popup.style.maxWidth = this.two.width;
      popup.style.maxHeight = this.two.height - request.shape.translation.y;
      popup.style.top = request.shape.translation.y + 20;
      popup.children[0].style.left = request.shape.translation.x - 1;
      popup.style.display = 'block';
      popup.focus();
    }
  };

  StackRings.prototype.isPlaying = function () {
    return this.two.playing;
  };

  StackRings.prototype.isSupportedType = function (type) {
    return this.log_types.indexOf(type) !== -1;
  };

  return StackRings;
}());
