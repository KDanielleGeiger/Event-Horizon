# Event Horizon

This application allows users to search for upcoming events in their area and view them on a map. Users can view event and venue information and be redirected to purchase tickets or get directions if desired. Several filtering options are also available. The map and event data are provided by Google and Ticketmaster respectively.

## Features
 
* Search for events by city name
* Filter by date range
* Filter by radius (25, 50, 100, 200 miles)
* Optionally filter by event type (Music, Sports, Arts & Theater, Film, Other)
* Display photo, name, local start date, local start time, and venue for each event
* Link provided to get directions to each event
* Link provided to purchase tickets for each event
* Venues marked on map
* Click map markers to filter by venue

## Limitations

* Search restricted to US events only
* Returns a maximum of 100 events per search for fast response time (configurable in config.js)

## How to Use

This application requires API keys from the following sources:
* [Google Maps Platform](https://cloud.google.com/maps-platform)
  * Key must be able to call Maps JavaScript API, Places API, Geocoding API, and Time Zone API. 
* [Ticketmaster Developer Portal](https://developer.ticketmaster.com/)

Then, simply add your API keys in config.js and run the application in browser. This application has been tested in Google Chrome, Firefox, and Microsoft Edge.

## Quick Demo

![demo](./demo.gif)