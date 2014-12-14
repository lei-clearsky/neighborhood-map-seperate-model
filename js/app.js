function MapViewModel() {

	var self = this;
	var map; 
	var mapOptions;
	var venuesOnMap = [];
	var VenuesOnList = [];
	var venueLat;
	var venueLon;
	var venueName;
	var bounds = window.mapBounds;
	var service;
	var marker;
	var infoWinder;
	var defaultExploreKeyword = 'bestnearby';
	var defaultNeighborhood = 'new york';

	self.exploreKeyword = ko.observable('');
	self.neighborhood = ko.observable('');
	self.topPicks = ko.observableArray('');

	// function that initializes the map
	function initializeMap() {
		mapOptions = {
			center: { lat: -34.397, lng: 150.644},
			zoom: 8,
			disableDefaultUI: true
		};
		map = new google.maps.Map(document.getElementById('#map-canvas'), mapOptions);
	};

	initializeMap();
};

// initialize the MapViewModel binding
$(function() {
  ko.applyBindings(new MapViewModel());
});