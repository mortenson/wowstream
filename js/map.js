/*jslint browser: true*/
/*jslint plusplus: true */
/*global L, HeatmapOverlay*/
var ws_map = (function () {
  'use strict';

  function Map(elem) {
    this.queue = [];
    elem.innerHTML = '<div id="map-rankings-wrapper"><p>Top locations - Map updates every five seconds</p><ul id="map-rankings"></ul></div><div id="map"></div>';
    this.map = L.map('map').setView([45.5231, -122.6765], 4);

    L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
    }).addTo(this.map);

    this.heatmap = new HeatmapOverlay({
      radius: 2,
      maxOpacity: 0.8,
      scaleRadius: true,
      valueField: 'count'
    }).addTo(this.map);

    setInterval(this.processQueue.bind(this), 5000);
  }

  Map.prototype.processQueue = function () {
    if (this.queue.length) {
      var httpRequest = new XMLHttpRequest();
      httpRequest.open('POST', '/geoip', true);
      httpRequest.setRequestHeader('Content-Type', 'application/json');

      httpRequest.onload = function () {
        var data, data_array, i, j, data_sorted, data_index,
          rankings, location_string;
        if (httpRequest.status >= 200 && httpRequest.status < 400) {
          data = JSON.parse(httpRequest.responseText);
        } else {
          return;
        }

        // Flatten the response from our geoip endpoint. 
        // We could have the server do this logic for us, but I wanted to keep
        // the endpoint renderer-agnostic.
        function find_index(current) {
          /*jshint validthis: true */
          return this.ll.join(',') === current.ll.join(',');
        }
        data_array = [];
        for (i in data) {
          if (data.hasOwnProperty(i)) {
            data_index = data_array.findIndex(find_index, data[i]);
            if (data_index !== -1) {
              data_array[data_index].count += data[i].count;
            } else {
              data_array.push(data[i]);
            }
          }
        }

        this.heatmap.setData({
          data: data_array
        });

        // Display the top five locations.
        data_sorted = data_array.sort(function (a, b) {
          return b.count - a.count;
        });

        rankings = '';
        for (j = 0; (j < 5) && (j < data_sorted.length); ++j) {
          location_string = data_sorted[j].city + ' ' + data_sorted[j].region + ', ' + data_sorted[j].country;
          rankings += '<li>' + location_string + ' (' + data_sorted[j].count + ' hits)</li>';
        }
        document.getElementById('map-rankings').innerHTML = rankings;
      }.bind(this);

      httpRequest.send(JSON.stringify(this.queue));
      this.queue = [];
    }
  };

  Map.prototype.isPlaying = function () {
    return true;
  };

  Map.prototype.isSupportedType = function (type) {
    return type === 'apache-request';
  };

  /*jslint unparam: true */
  Map.prototype.handleRequest = function (request_id, data) {
    var ip = data.text.split(' ')[0];
    this.queue.push(ip);
  };

  return Map;
}());
