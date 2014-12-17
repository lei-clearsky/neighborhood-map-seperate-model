function MapViewModel() {

	var self = this;
	var map; 
	var mapOptions;
	var venueMarkers = [];
	var VenuesOnList = [];
	var venueLat;
	var venueLon;
	var venueName;
	var bounds = window.mapBounds;
	var service;
	var marker;
	var infoWindow;
	var defaultExploreKeyword = 'bestnearby';
	var defaultNeighborhood = 'new york';
	var newNeighborhood;
	var currentLat;
	var currentLon;

	
	// var neighborhood;


	self.exploreKeyword = ko.observable('');
	self.neighborhood = ko.observable('');
	self.formattedAddress = ko.observable('');
	self.topPicks = ko.observableArray('');
	self.dailyForecasts = ko.observableArray('');
	self.currentlyForecasts = ko.observable('');
	self.currentlySkyicon = ko.observable('');
/*
	self.displaySkyicon = ko.computed(function() {
		var currentlyIcon = self.currentlyForecasts().icon;

		var skyIconCanvas = ko.observable('');
		skyIconCanvas = '<canvas id="clear-night" width="50" height="50"></canvas>';
	});
*/
  	// skycons
  	// http://stackoverflow.com/questions/847185/convert-a-unix-timestamp-to-time-in-javascript
  	self.computedDailyForecasts = ko.computed(function(){
  		var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  		var newDailyForecasts = [];
  		for (var i = 0; i < self.dailyForecasts.length; i++) {
  			var date = new Date(self.dailyForecasts[i].time * 1000);
  			var formatedTime = months[date.getMonth()] + ' ' + date.getDate();
  			newDailyForecasts[i] = {

  			}
  		}
  		return newDailyForecasts;
  	});


/*
  	self.skycons = function() {
  		var icons = new Skycons(),
          	list  = [
            "clear-day", "clear-night", "partly-cloudy-day",
            "partly-cloudy-night", "cloudy", "rain", "sleet", "snow", "wind",
            "fog"
          	];
      	for(var i = list.length; i--; )
        	icons.set(list[i], list[i]);
      	icons.play();
      	console.log(icons);
  	}
  	// skycons();
*/

  	self.skycons = function() {
  		var icons = new Skycons(),
          	list  = [
            "clear-day", "clear-night", "partly-cloudy-day",
            "partly-cloudy-night", "cloudy", "rain", "sleet", "snow", "wind",
            "fog"
          	];
      	for(var i = list.length; i--; ){
      		var weatherType = list[i],
        	elements = document.getElementsByClassName( weatherType );
		    for (e = elements.length; e--;){
		        icons.set( elements[e], weatherType );
		    }
      	}
      	icons.play();
  	}

  	// http://stackoverflow.com/questions/16250594/afterrender-for-html-binding
  	
  	ko.bindingHandlers.afterHtmlRender = {
    	update: function(el, va, ab){
        	ab().html && va()(ab().html);
    	}
	}
	
	// display neighborhood info
	self.displayNeighborhood = ko.computed(function() {

	});

	// update venues on the list display
	self.displayVenuesList = ko.computed(function(){

	});
/*
	self.computedNeighborhood = ko.computed(function() {
		if (self.neighborhood() != '') {
			console.log('test1');
			removeVenueMarkers();
			requestNeighborhood(self.neighborhood());
		}	
	});
*/

	self.computedNeighborhood = function() {
		if (self.neighborhood() != '') {
			removeVenueMarkers();
			requestNeighborhood(self.neighborhood());
		}	
	};

	self.exploreKeyword.subscribe(self.computedNeighborhood);
	self.neighborhood.subscribe(self.computedNeighborhood);
	// test weather
	// self.neighborhood.subscribe(self.getWeather);
/*
	var getWeather = function() {
		var forecastBaseURL = 'https://api.forecast.io/forecast/';
		var forecastAPIkey = '96556a5d8a419fc71902643785e74d30';
		var formattedLL = '/'+ currentLat + ',' + currentLon;
		var forecastURL = forecastBaseURL + forecastAPIkey + formattedLL;

		$.getJSON(forecastURL, function(data) {
			self.forecasts(data);
		});
	}
*/
	function removeVenueMarkers() {
	    for (var i = 0; i < venueMarkers.length; i++) {
    		venueMarkers[i].marker.setMap(null);
    		venueMarkers[i].marker = null;
  		}

  		// fastest solution to clear an array
  		// http://stackoverflow.com/questions/1232040/empty-an-array-in-javascript
  		while(venueMarkers.length > 0){
  			venueMarkers.pop();
  		}
	}

	// set neighborhood marker on the map 
	// get best nearby venues from foursquare API
	function getNeighborhoodVenues(venueData) {
		venueLat = venueData.geometry.location.k;
		venueLon = venueData.geometry.location.D;
		currentLat = venueLat;
		currentLon = venueLon;
		venueName = venueData.name;
		var formattedVenueAddress = venueData.formatted_address; 
		self.formattedAddress(formattedVenueAddress);
		newNeighborhood = new google.maps.LatLng(venueLat, venueLon);
		map.setCenter(newNeighborhood);

		var blackStar = {
		    path: 'M 125,5 155,90 245,90 175,145 200,230 125,180 50,230 75,145 5,90 95,90 z',
		    fillColor: 'black',
		    fillOpacity: 1,
		    scale: 0.2
		};

		// marker
		marker = new google.maps.Marker({
      		map: map,
      		position: venueData.geometry.location,
      		title: venueName,
      		icon: blackStar
    	});
    	venueMarkers.push(marker);

    	infoWindow = new google.maps.InfoWindow({
    		content: venueName
    	});

    	google.maps.event.addListener(marker, 'click', function() {
    		infoWindow.open(map, marker);
    	});
    	// get nearby venues based on neighborhood
    	
    	var foursquareBaseURL = 'https://api.foursquare.com/v2/venues/explore?';
  		var foursquareID = 'client_id=T3VKC34CMHTDB5YPR3TRA044A51EHCMPBJII433EB1TXWH1A&client_secret=XTWLWF52NASGLCULU0MF1YV1300CC0IDLW4DQXV2I3ROVDOC';
  		var neighborhoodLL = '&ll=' + venueLat + ',' + venueLon;
  		var query = '&query=' + self.exploreKeyword();
  		var foursquareURL = foursquareBaseURL + foursquareID + '&v=20130815' + neighborhoodLL + query;

  		$.getJSON(foursquareURL, function(data) {
      		self.topPicks(data.response.groups[0].items);
      		// imageJSON: https://api.foursquare.com/v2/venues/4bcf9774a8b3a5939497625f/photos?client_id=T3VKC34CMHTDB5YPR3TRA044A51EHCMPBJII433EB1TXWH1A&client_secret=XTWLWF52NASGLCULU0MF1YV1300CC0IDLW4DQXV2I3ROVDOC&v=20140806
      		// image: https://irs3.4sqi.net/img/general/width100/2017397_09ITdxhLFkJbkviObrYIo8TRYgpecX91UOzrO0a89gA.jpg
      		/*
      		for(var i in self.topPicks()){
      			var baseImgURL = 'https://api.foursquare.com/v2/venues/';
      			var venueID = self.topPicks()[i].venue.id;
      			var venueImgURL = baseImgURL + venueID + '/photos?' + foursquareID + '&v=20130815';
      			self.topPicks()[i].displayPhoto = 
      		}
      		*/
      		for (var i in self.topPicks()) {
        		createMarkers(self.topPicks()[i].venue);
      		}
      		
      	});
		// http://stackoverflow.com/questions/16050652/how-do-i-assign-a-json-response-from-this-api-im-using-to-elements-on-my-page
      	var forecastBaseURL = 'https://api.forecast.io/forecast/';
		var forecastAPIkey = '96556a5d8a419fc71902643785e74d30';
		var formattedLL = '/'+ currentLat + ',' + currentLon;
		var forecastURL = forecastBaseURL + forecastAPIkey + formattedLL;

		$.ajax({
			url: forecastURL,
			dataType: 'jsonp',
			success: function(data){
				// var JSONdata = JSON.parse(JSON.stringify(data));
				self.dailyForecasts(data.daily.data);
				self.currentlyForecasts(data.currently);
				self.currentlySkyicon(data.currently.icon);
			}
		});

	};

	function createMarkers(venue) {
    	var lat = venue.location.lat;
    	var lng = venue.location.lng;
    	var name = venue.name;
    	// var photos = venue.photos;
    	var category = venue.categories[0].name;
    	var position = new google.maps.LatLng(lat, lng);
    	var address = venue.location.formattedAddress;
    	var contact = venue.contact.formattedPhone;
    	var foursquareUrl = "https://foursquare.com/v/" + venue.id;
    	var rating = venue.rating;
    	var url = venue.url;

    	// console.log(photos);
	    // marker of a popular place
	    var venueMarker = new google.maps.Marker({
	      map: map,
	      position: position,
	      title: name
	       //icon: photos[0].getUrl({'maxWidth': 35, 'maxHeight': 35})
	    });
	    
	    google.maps.event.addListener(venueMarker, 'click', function() {
	      infoWindow.open(map, venueMarker);
	    });
		
  	}

	// callback method for neighborhood location
	function neighborhoodVenuesCallback(results, status) {
	    if (status == google.maps.places.PlacesServiceStatus.OK) {
	      getNeighborhoodVenues(results[0]);
	    }
	}

	function requestNeighborhood(neighborhood) {
	    var request = {
	      query: neighborhood
	    };
	    service = new google.maps.places.PlacesService(map);
	    service.textSearch(request, neighborhoodVenuesCallback);
	}

	// function that initializes the map
	function initializeMap() {
		mapOptions = {
			// center: { lat: -34.397, lng: 150.644},
			zoom: 15,
			disableDefaultUI: true
		};
		map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
		$('#map-canvas').height($(window).height());
	};

	google.maps.event.addDomListener(window, "load", initializeMap);

	window.addEventListener('resize', function(e) {
    	// map.fitBounds(mapBounds);
    	$('#map-canvas').height($(window).height());
  	});


};

// initialize the MapViewModel binding
$(function() {
  ko.applyBindings(new MapViewModel());

});