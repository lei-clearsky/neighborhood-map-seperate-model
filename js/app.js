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
			disableDefaultUI: true,
			zoom: 15
		};
		map = new google.maps.Map(document.querySelector('#myMap'), mapOptions);
	};

	initializeMap();
};

// initialize the MapViewModel binding
$(function() {
  ko.applyBindings(new MapViewModel());
});