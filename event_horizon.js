var map;
var events = [];
var markers = [];
var lookup = [];
var activeInfoWindow;

//From config.js
var googleMapsKey = config.GOOGLE_MAPS_KEY;
var ticketmasterKey = config.TICKETMASTER_KEY;
var maxEvents = config.MAX_EVENTS;

//Initialize JS Maps API and Places API
function initialize() {
	initMap();
	initPlaces();
}

function initMap() {
	map = new google.maps.Map(document.getElementById('map'), {
		zoom: 4,
    minZoom: 4,
		center: {lat: 37.0902, lng: -95.7129},
		streetViewControl: false,
		zoomControlOptions: {
			position: google.maps.ControlPosition.TOP_RIGHT
		},
		fullscreenControlOptions: {
			position: google.maps.ControlPosition.BOTTOM_RIGHT
		},
    styles: [{"featureType":"landscape.natural","elementType":"geometry.fill","stylers":[{"visibility":"on"},{"color":"#e0efef"}]},{"featureType":"poi","elementType":"geometry.fill","stylers":[{"visibility":"on"},{"hue":"#1900ff"},{"color":"#c0e8e8"}]},{"featureType":"road","elementType":"geometry","stylers":[{"lightness":100},{"visibility":"simplified"}]},{"featureType":"road","elementType":"labels","stylers":[{"visibility":"off"}]},{"featureType":"transit.line","elementType":"geometry","stylers":[{"visibility":"on"},{"lightness":700}]},{"featureType":"water","elementType":"all","stylers":[{"color":"#7dcdcd"}]}],
    restriction: {
      latLngBounds: {
        north: 81,
        south: -81,
        east: 180,
        west: -180
      }
    }
	});
}

function initPlaces() {
  //Restrict valid place input to US cities
	var options = {
		types: ['(cities)'],
		componentRestrictions: {country: "us"},
	};
	var input = document.getElementById("location");
	new google.maps.places.Autocomplete(input, options);
}

//Gather inputs, geocode location, and create event URL
function search() {
  //Remove old events and markers
	clearEvents();
	clearMarkers();
  
  //Display event box even if empty
	var eventBox = document.getElementById("event_box");
	if (eventBox.style.display === "none") {
		event_box.style.display = "block";
	}
  
  //If search query is empty, display no results found
  if (document.getElementById('location').value.length == 0) {
    displayNoEvents();
    return;
  }
	
  //Get inputs
	var radiusInput = document.getElementById('radius').value;
	var typeInput = document.getElementById('type').value;
	var typeInputFormatted = "[" + typeInput + "]";
	var startDate = convertSearchDate(document.getElementById('dateStart').value.replace(" ", ""));
	var endDate = convertSearchDate(document.getElementById('dateEnd').value.replace(" ", ""));
  
	geocodeCity(document.getElementById('location').value, function(lat, lng) {
		var coordinates = (lat + "," + lng);
		map.panTo({lat: lat, lng: lng});
		
    //Zoom out as radius increases
		if (radiusInput == "25") {
			map.setZoom(11);
		} else if (radiusInput == "50") {
			map.setZoom(10);
		} else if (radiusInput == "100") {
			map.setZoom(8);
		} else {
			map.setZoom(6);
		}
		
    //Create event URLs
		if (typeInput == "All Event Types") {
			getEvents("https://app.ticketmaster.com/discovery/v2/events.json?apikey="+ticketmasterKey+"&radius="+radiusInput+"&latlong="+coordinates+"&startDateTime="+startDate+"&endDateTime="+endDate+"&size="+maxEvents);
		} else {
			getEvents("https://app.ticketmaster.com/discovery/v2/events.json?apikey="+ticketmasterKey+"&radius="+radiusInput+"&latlong="+coordinates+"&startDateTime="+startDate+"&endDateTime="+endDate+"&segmentName="+typeInputFormatted+"&size="+maxEvents);
		}
	});
}

//Convert city name to latitude and longitude
function geocodeCity(city, callback) {
  var geocoder = new google.maps.Geocoder();
  geocoder.geocode({
    'address': city
  }, function(results, status) {
    if (status == google.maps.GeocoderStatus.OK) {
      var lat = results[0].geometry.location.lat();
      var lng = results[0].geometry.location.lng();
      callback(lat, lng);
    } else {
      displayNoEvents();
    }
  });
}

//Fetch events
function getEvents(url) {
	$.ajax({
    type: "GET",
    url: url,
    async: true,
    dataType: "json",
    success: function(json) {
      console.log(json);
      displayEvents(json);
    },
    error: function(xhr, status, err) {
      console.log(err);
    }
  });
}

//Prepare event to be added to box and map
function displayEvents(json) {
  try {
    events = json._embedded.events;
  } catch (error) {
    displayNoEvents();
    return;
  }
  
	for(var i = 0; i < json.page.totalElements; i++) {
    var eventName, venueName, startDate, address, ticketUrl, imageUrl, latitude, longitude;
    var startTimeRaw, url;
    
    try {
      latitude = Number(events[i]._embedded.venues[0].location.latitude, 10);
      longitude = Number(events[i]._embedded.venues[0].location.longitude, 10);
	    eventName = events[i].name;
      venueName = events[i]._embedded.venues[0].name;
      startDate = convertEventDate(events[i].dates.start.localDate);
      startTimeRaw = events[i].dates.start.dateTime;
      address = events[i]._embedded.venues[0].address;
      ticketUrl = events[i].url;
      imageUrl = events[i].images[0].url;
      
      //Get Time Zone API request URL
      var secondsSince = Date.parse(startTimeRaw)/1000;
      url = "https://maps.googleapis.com/maps/api/timezone/json?location="+latitude+","+longitude+"&timestamp="+secondsSince+"&key="+googleMapsKey;
	  } catch(error) {
	 	  continue;
		}
      
    //Nested async callback function; All variables used as addEvent/addMarker arguments must be passed for persistence
    convertTime(latitude, longitude, eventName, venueName, startDate, startTimeRaw, address, ticketUrl, imageUrl, url,
      function(latitude, longitude, eventName, venueName, startDate, startTime, address, ticketUrl, imageUrl) {
	  	  addEvent(eventName, venueName, startDate, startTime, address, ticketUrl, imageUrl);
	  	  addMarker(venueName, latitude, longitude);
    });
  }
}

//Output if no events are found
function displayNoEvents() {
  var table = document.getElementById("event_list");
  var row = table.insertRow(-1);
	var cell1 = row.insertCell(0);
  cell1.className = "error";
  cell1.innerHTML = "No results found :(";
}

//Display event in box
function addEvent(eventName, venueName, startDate, startTime, address, ticketUrl, imageUrl) {
	var table = document.getElementById("event_list");
	var eventImage = "<img src='" + imageUrl + "'></img>";
  
  //Remove illegal url characters
  var urlVenueName = venueName.replace(/ /g, "+").replace(/[^a-zA-Z0-9-_+]/g, "");
	
  //Shorten names if necessary for display
	if (eventName.length > 16) {
    if (eventName[15] = " ") {
      eventName = eventName.substring(0,15) + "...";
    } else {
      eventName = eventName.substring(0,16) + "...";
    }
	}
	if (venueName.length > 20) {
    if (venueName[19] = " ") {
      venueName = venueName.substring(0,19) + "...";
    } else {
      venueName = venueName.substring(0,20) + "...";
    }
	}
  
  //Format event string
	var eventInfo = "<b>" + eventName + "</b>";
	eventInfo += "<br>" + startDate + " · " + startTime;
	eventInfo += "<br>" + venueName;
	eventInfo += "<br>" + "<a href='#' onclick='getDirections(\"" + urlVenueName + "\")'>Directions</a> · <a href='" + ticketUrl + "' target='_blank'>Tickets</a>";
	
  //Add new row with new event information
	var row = table.insertRow(-1);
	var cell1 = row.insertCell(0);
	var cell2 = row.insertCell(1);
	cell1.className = "td_left";
	cell2.className = "td_right";
	cell1.innerHTML = eventImage;
	cell2.innerHTML = eventInfo;
}

//Open new tab for directions to venue with empty/current location starting point
function getDirections(venueName) {
  var url = "https://www.google.com/maps/dir/?api=1&destination="+venueName;
  window.open(url, "_blank");
}

//Display event on map
function addMarker(name, latitude, longitude) {
  //Check if marker already exists
  if (!isLocationFree(latitude, longitude)) {
    return;
  }
  
	var coordinates = {lat: latitude, lng: longitude};
	var marker = new google.maps.Marker({
		position: coordinates, 
		map: map,
		label:{
			text: name,
			color: '#000',
      fontFamily: 'Arial',
			fontSize: '16px'
		},
		icon: {
			labelOrigin: new google.maps.Point(16,40),
			url: "http://www.google.com/intl/en_us/mapfiles/ms/micons/red-dot.png"
		}
	});
  
  //Filter by venue when marker is clicked 
  marker.addListener("click", () => {
    var result = filterByVenue(name);
  
    //Close any other infoWindows
    try {
      activeInfoWindow.close()
    } catch(error) { }
    
    //Create information box above selected marker
    var infoWindow = new google.maps.InfoWindow({
      content: result[0] + " results found."
    });
    infoWindow.open(map, marker);
    activeInfoWindow = infoWindow;
    
    //Unfilter event list when infoWindow is closed
    google.maps.event.addListener(infoWindow, 'closeclick', function() {
      clearEventBox();
      
      for (var i = 0; i < events.length; i++) {
        var eventName, venueName, startDate, address, ticketUrl, imageUrl, latitude, longitude;
        var startTimeRaw, url;
    
        try {
          latitude = Number(events[i]._embedded.venues[0].location.latitude, 10);
          longitude = Number(events[i]._embedded.venues[0].location.longitude, 10);
	        eventName = events[i].name;
          venueName = events[i]._embedded.venues[0].name;
          startDate = convertEventDate(events[i].dates.start.localDate);
          startTimeRaw = events[i].dates.start.dateTime;
          address = events[i]._embedded.venues[0].address;
          ticketUrl = events[i].url;
          imageUrl = events[i].images[0].url;
      
          //Get Time Zone API request URL
          var secondsSince = Date.parse(startTimeRaw)/1000;
          url = "https://maps.googleapis.com/maps/api/timezone/json?location="+latitude+","+longitude+"&timestamp="+secondsSince+"&key="+googleMapsKey;
        } catch(error) {
          continue;
        }
	
        //Nested async callback function; All variables used as addEvent arguments must be passed for persistence
        convertTimeEventOnly(eventName, venueName, startDate, startTimeRaw, address, ticketUrl, imageUrl, url,
          function(eventName, venueName, startDate, startTime, address, ticketUrl, imageUrl) {
	      	  addEvent(eventName, venueName, startDate, startTime, address, ticketUrl, imageUrl);
        });
      }
    });
    
    //Replace contents of event box
    clearEventBox();
    for (var i = 0; i < result[1].length; i++) {
      var latitude = Number(result[1][i]._embedded.venues[0].location.latitude, 10);
      var longitude = Number(result[1][i]._embedded.venues[0].location.longitude, 10);
      var eventName = result[1][i].name;
      var venueName = result[1][i]._embedded.venues[0].name;
      var startDate = convertEventDate(result[1][i].dates.start.localDate);
      var startTimeRaw = result[1][i].dates.start.dateTime;
      var address = result[1][i]._embedded.venues[0].address;
      var ticketUrl = result[1][i].url;
      var imageUrl = result[1][i].images[0].url;
      
      var secondsSince = Date.parse(startTimeRaw)/1000;
      url = "https://maps.googleapis.com/maps/api/timezone/json?location="+latitude+","+longitude+"&timestamp="+secondsSince+"&key="+googleMapsKey;
      
      //Nested async callback function; All variables used as addEvent arguments must be passed for persistence
      convertTimeEventOnly(eventName, venueName, startDate, startTimeRaw, address, ticketUrl, imageUrl, url,
        function(eventName, venueName, startDate, startTime, address, ticketUrl, imageUrl) {
	      	addEvent(eventName, venueName, startDate, startTime, address, ticketUrl, imageUrl);
      });
    }
  });
  
  //Keep reference to marker
	markers.push(marker);
  
  //Add new latitude and longitude object to lookup
  lookup.push([latitude, longitude]);
}

//Compare latitude and longitude to lookup
function isLocationFree(latitude, longitude) {
  for (var i = 0, n = lookup.length; i < n; i++) {
    if ((lookup[i][0] === latitude) && (lookup[i][1] === longitude)) {
      return false;
    }
  }
  return true;
}

//Retrieve events at a certain venue
function filterByVenue(venueName) {
  var numEvents = 0;
  var eventsByVenue = [];
  
  for (var i = 0; i < events.length; i++) {
    if (venueName == events[i]._embedded.venues[0].name) {
      numEvents++;
      eventsByVenue.push(events[i]);
    }
  }
  
  return [numEvents, eventsByVenue];
}

//Clear event box only
function clearEventBox() {
  var table = document.getElementById("event_list");
	table.innerHTML = "";
}

//These functions clear all event information for new search
function clearEvents() {
	var table = document.getElementById("event_list");
	table.innerHTML = "";
	events = [];
}

function clearMarkers() {
	for (i = 0; i < markers.length; i++) {
		markers[i].setMap(null);
	}
	markers = [];
  lookup = [];
}

//Conversion functions
function convertSearchDate(date) {
	var dateArray = date.split("/");
	var newDate = dateArray[2] + "-" + dateArray[0] + "-" + dateArray[1] + "T00:00:00Z";
	return newDate;
}

function convertEventDate(date) {
  date = date.split("-");
  var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (date[1].charAt(0) === '0') {
    var month = months[date[1].substring(1) - 1];
  } else {
    var month = months[date[1] - 1];
  }
	
  var day;
	if ((date[2] == "10") || (date[2] == "20") || (date[2] == "30")) {
		day = date[2];
	} else {
		day = date[2].replace("0", "");
	}
	
	return (month + " " + day);
}

function convertTime(latitude, longitude, eventName, venueName, startDate, time, address, ticketUrl, imageUrl, url, callback) {
  return new $.ajax({
    type: "GET",
    url: url,
    async: true,
    dataType: "json",
    data: {"latitude":latitude,"longitude":longitude,"eventName":eventName,"venueName":venueName,"startDate":startDate,"time":time,"address":address,"ticketUrl":ticketUrl,"imageUrl":imageUrl},
    success: function(json) {
      var result;
      var totalOffsetHrs = (json.rawOffset + json.dstOffset)/3600;
      
      time = time.replace("Z", "").split("T");
      time = time[1];
      var newHour = parseInt(time.slice(0,2)) + totalOffsetHrs;
      
      if (newHour < 0) {
        newHour += 12;
        result = (newHour + time.slice(2,5) + " PM");
      } else if (newHour == 0) {
        newHour += 12;
        result = (newHour + time.slice(2,5) + " AM");
      } else if (newHour == 12) {
        result = (newHour + time.slice(2,5) + " PM");
      } else if (newHour > 12) {
        newHour -= 12;
        result = (newHour + time.slice(2,5) + " PM");
      } else {
        result = (newHour + time.slice(2,5) + " AM");
      }
      
      callback(latitude, longitude, eventName, venueName, startDate, result, address, ticketUrl, imageUrl);
    },
    error: function(xhr, status, err) {
    }
  });
}

function convertTimeEventOnly(eventName, venueName, startDate, time, address, ticketUrl, imageUrl, url, callback) {
  return new $.ajax({
    type: "GET",
    url: url,
    async: true,
    dataType: "json",
    data: {"eventName":eventName,"venueName":venueName,"startDate":startDate,"time":time,"address":address,"ticketUrl":ticketUrl,"imageUrl":imageUrl},
    success: function(json) {
      var result;
      var totalOffsetHrs = (json.rawOffset + json.dstOffset)/3600;
      
      time = time.replace("Z", "").split("T");
      time = time[1];
      var newHour = parseInt(time.slice(0,2)) + totalOffsetHrs;
      
      if (newHour < 0) {
        newHour += 12;
        result = (newHour + time.slice(2,5) + " PM");
      } else if (newHour == 0) {
        newHour += 12;
        result = (newHour + time.slice(2,5) + " AM");
      } else if (newHour == 12) {
        result = (newHour + time.slice(2,5) + " PM");
      } else if (newHour > 12) {
        newHour -= 12;
        result = (newHour + time.slice(2,5) + " PM");
      } else {
        result = (newHour + time.slice(2,5) + " AM");
      }
      
      callback(eventName, venueName, startDate, result, address, ticketUrl, imageUrl);
    },
    error: function(xhr, status, err) {
    }
  });
}
