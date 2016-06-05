/*jslint browser: true*/
/*global WebSocket, console*/
var ws_logstream = (function () {
  'use strict';

  function Logstream(renderer) {
    this.renderer = renderer;
  }

  Logstream.prototype.startStreaming = function () {
    var httpRequest = new XMLHttpRequest();
    httpRequest.open('GET', '/websocket', true);
    httpRequest.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

    httpRequest.onload = function () {
      var data, websocket;
      if (httpRequest.status >= 200 && httpRequest.status < 400) {
        data = JSON.parse(httpRequest.responseText);
      } else {
        return;
      }

      websocket = new WebSocket(data.url);

      websocket.onopen = function () {
        websocket.send(data.msg);
      };

      websocket.onmessage = this.handleMessage.bind(this);

      this.websocket = websocket;
    }.bind(this);

    httpRequest.send();
  };

  Logstream.prototype.handleMessage = function (message) {
    var data = JSON.parse(message.data), pattern, href, anchor, request_id;
    switch (data.cmd) {
    case 'error':
      console.log('Logstream error: ' + data.code + ' - ' + data.description);
      break;
    case 'available':
      // If we're tracking this log type, enable streaming.
      if (this.renderer.isSupportedType(data.type)) {
        this.websocket.send(JSON.stringify({
          cmd: 'enable',
          type: data.type,
          server: data.server
        }));
      }
      break;
    case 'line':
      // Check to see if the log text passes the search.
      pattern = new RegExp(window.location.search.slice(1));
      if (!pattern.test(data.text) || !this.renderer.isPlaying()) {
        break;
      }

      // Normalize the request path between log types to accurately
      // display requests.
      switch (data.log_type) {
      case 'bal-request':
        href = data.text.match(/http_host=\S*/)[0].replace('http_host=', '');
        href += data.text.split(' ')[6];
        break;
      case 'apache-request':
        href = data.text.match(/host=\S*/)[0].replace('host=', '');
        href += data.text.split(' ')[6];
        break;
      case 'varnish-request':
        href = data.text.split(' ')[6];
        break;
      case 'drupal-request':
        href = data.text.split(' ')[2] + data.text.split(' ')[4];
        break;
      }
      // We prepend a protocol here so that the DOM's built in anchor
      // parsing will return an appropriate hostname.
      if (href.indexOf('://') === -1) {
        href = 'http://' + href;
      }
      // The request ID is sometimes undefined, not sure why.
      data.request_id = data.request_id || Math.random().toString(36).substr(2, 24);
      anchor = document.createElement('a');
      anchor.href = href;
      request_id = data.request_id + '_' + anchor.hostname + '_' + anchor.pathname;
      this.renderer.handleRequest(request_id, data);
      break;
    }
  };

  return Logstream;
}());
