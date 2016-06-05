/*jslint node: true*/
/*jslint nomen: true */
/*jslint unparam: true */
/*jslint plusplus: true */

'use strict';

var auth = require('basic-auth');
var config = require('./config.json');
var express = require('express');
var body_parser = require('body-parser');
var path = require('path');
var request = require('request');

var app = express();

// This middleware is required to parse JSON request bodies.
app.use(body_parser.json());

// Add basic authentication to the app, to protect log data and keep the real
// CloudAPI credentials server-side.
app.use(function (req, res, next) {
  var credentials = auth(req);

  if (!credentials || credentials.name !== config.http_username || credentials.pass !== config.http_password) {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', 'Basic realm="Wowstream"');
    res.end('Access denied');
  } else {
    next();
  }
});

// These middlewares expose specific static file directories publically.
app.use('/css', express.static(__dirname + '/css'));
app.use('/js', express.static(__dirname + '/js'));
app.use('/js', express.static(__dirname + '/node_modules/two.js/build'));
app.use('/js', express.static(__dirname + '/node_modules/heatmap.js/plugins'));
app.use('/js', express.static(__dirname + '/node_modules/heatmap.js/build'));
app.use(['/js', '/css'], express.static(__dirname + '/node_modules/leaflet/dist'));

// Expose our visualizations by simply delivering the relevant HTML file.
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname + '/stacklayers.html'));
});

app.get('/map', function (req, res) {
  res.sendFile(path.join(__dirname + '/map.html'));
});

// POST callback to map IPs in the request Body to geodata. 
// This is used in our Leaflet map, but the route is simple enough to be used
// in any situation where you need to use a geoip lookup.
app.post('/geoip', function (req, res) {
  var geoip = require('geoip-lite'), geodata = {}, i, ip, result;

  if (Array.isArray(req.body)) {
    for (i in req.body) {
      if (req.body.hasOwnProperty(i)) {
        ip = req.body[i];
        if (geodata.hasOwnProperty(ip)) {
          ++geodata[ip].count;
        } else {
          result = geoip.lookup(ip);
          if (result) {
            result.lat = result.ll[0];
            result.lng = result.ll[1];
            result.count = 1;
            geodata[ip] = result;
          }
        }
      }
    }
  }

  res.send(geodata);
});

// GET callback grab the websocket information required to start logstreaming.
// This actually makes another request to CloudAPI and pipes the result to the
// user, as the only reason this is not done directly is CORS protection.
app.get('/websocket', function (req, res) {
  var url = 'https://cloudapi.acquia.com/v1/sites/' + config.site + '/envs/' + config.environment + '/logstream.json';
  req.pipe(request({
    url: url,
    headers : {
      'Authorization' : 'Basic ' + new Buffer(config.username + ':' + config.secret).toString('base64')
    }
  })).pipe(res);
});

// Start the app.
app.listen(config.port || 8080);
