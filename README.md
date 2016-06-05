# Description and Use

Wowstream is a set of experimental visualizations for
[Acquia's Logstreaming API](https://github.com/acquia/logstream). It intends to
abstractly visualize log data in a way that's nice-looking and accurate.

This is a demo tool, and is not intended to be run on a production site or to
be publicly accessible.

# Stack Ring Demo

This is the default demo, and should appear at the base of your site.

When a request log is received, it is shown on the outside layer of the stack.
It then travels towards the center of the stack until the request is
terminated, usually either at Varnish, Apache, or Drupal.

You can use the pause button to stop streaming, which allows you to click
individual requests and see the full log message from Logstream.

The cache statistic in the upper-right hand corner of the screen only
represents the ratio between Balancer/Varnish vs. Apache/Drupal
requests. This does not take into account browser cache, Memcache, or Drupal's
internal cache. Don't get worked up if the percentage is low.

# Heat Map Demo

If you visit /map, you should see a demo of all the current Apache requests to
your site, rendered as a heatmap. In addition to the map, the top five
locations (global cities) will also be listed in the bottom-right hand corner
of your screen. Requests are mapped to locations with a local GeoIP database.

# Filtering Logs

If you find that there are too many requests on screen to track, you can pass
in a regular expression that all incoming logs must pass to be displayed. ex:

Show requests from a specific IP - localhost:8080/map?123.4.5.6

Exclude requests to file directories - localhost:8080?^((?!/sites/.*/files).)*$

# Installation

1. Install Node and the Node Package Manager (NPM).
2. Run `npm install` from the wowstream directory.
3. Copy "config_example.json" to "config.json" and edit the placeholders based
on the "Configuration" documentation below.
4. Run `npm start` to start the web application.
5. Visit `localhost:8080` in your web browser to start Logstreaming.

# Configuration

These are the configuration keys represented in your config.json file:

* username
 * Your CloudAPI e-mail [(see doc for info)](https://docs.acquia.com/cloud/api/auth)
* secret
 * Your CloudAPI private key [(see doc for info)](https://docs.acquia.com/cloud/api/auth)
* http_username
 * A username to use in Wowstream to protect your logs.
* http_password
 * A password to use in Wowstream to protect your logs.
* site
 * Your site name, i.e. prod:sitegroup or devcloud:sitegroup.
* environment
 * Your environment's machine name, i.e. dev, stage, or prod.
* port
 * The port Wowstream should run on. By default "8080" is used.
