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
	// var neighborhood;

	self.exploreKeyword = ko.observable('');
	self.neighborhood = ko.observable('');
	self.formattedAddress = ko.observable('');
	self.topPicks = ko.observableArray('');

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
			console.log('test1');
			removeVenueMarkers();
			requestNeighborhood(self.neighborhood());
		}	
	};

	self.neighborhood.subscribe(self.computedNeighborhood);

	function removeVenueMarkers() {
		console.log('remove markers');
	    for (var i = 0; i < venueMarkers.length; i++) {
    		venueMarkers[i].setMap(null);
  		}
	}

	// set neighborhood marker on the map 
	// get best nearby venues from foursquare API
	function getNeighborhoodVenues(venueData) {
		venueLat = venueData.geometry.location.k;
		venueLon = venueData.geometry.location.D;
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
      		for (var i in self.topPicks()) {
        		createMarkers(self.topPicks()[i].venue);
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
    	console.log(name);
    	console.log(lat);
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
	      getNeighborhoodVenues(results[0])
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