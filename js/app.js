/**
 * @fileoverview View Model for neighborhood map application
 * @author sportzhulei@gmail.com (Lei Zhu)
 */

var Venue = function( data, foursquareID ) {
	var that = this;
	// data that is always defined or need no formatting
	this.id = data.venue.id;
	this.name = data.venue.name;
	this.lat = data.venue.location.lat;
	this.lon = data.venue.location.lng;
	this.tips = data.tips[0].text;
	this.formattedAddress = data.venue.location.formattedAddress;
	this.categories = data.venue.categories[0].name;
	this.foursquareUrl = "https://foursquare.com/v/" + this.id;
	this.photoAlbumn = [];
	this.marker = {};
	var photoPrefix = 'https://irs0.4sqi.net/img/general/';
	var photoPlaceHolder = 'http://placehold.it/100x100';
	var photoSuffix;
	var basePhotoAlbumnURL = 'https://api.foursquare.com/v2/venues/';

	var getPhotoAlbumnURL = function ( foursquareID )	{
		return basePhotoAlbumnURL + that.id + '/photos?' + foursquareID + '&v=20130815';
	};

	var getFormattedPhone = function(){
		if (!data.venue.contact.formattedPhone)
			return 'Phone Number Not Available';
		else
			return data.venue.contact.formattedPhone;
	}

	var getUrl = function() {
		if (!data.venue.url)
			return 'Website Not Available';
		else
			return data.venue.url;
	}

	var getRating = function() {
		if (!data.venue.rating)
			return '0.0';
		else
			return data.venue.rating;
	}

	var getFeaturedPhoto = function() {
		if (!data.venue.featuredPhotos)
			return photoPlaceHolder;
		else {
			photoSuffix = data.venue.featuredPhotos.items[0].suffix;
  			return photoPrefix + 'width100' + photoSuffix;
		}
	}
	// data that may be undefined or need formatting
	this.photoAlbumnURL = getPhotoAlbumnURL ( foursquareID );

	this.formattedPhone = getFormattedPhone();

	this.url = getUrl();

	this.rating = getRating();

	this.featuredPhoto = getFeaturedPhoto();

}
/*
var Forecast = function(data) {
	var date = new Date(data.time * 1000);
  	this.formatedTime = date.getDayName();
  	this.temperatureMin = data.temperatureMin;
  	this.temperatureMax = data.temperatureMax;
  	this.summary = data.summary;
}
*/

function AppViewModel() {

	var self = this;
	var map,
		mapOptions,
		placeLat,
		placeLon,
		bounds,
		service,
		marker,
		infowindow;

	var venueMarkers = [];
	var defaultExploreKeyword = 'best nearby';
	var defaultNeighborhood = 'new york';
	var days = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
	var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

	self.exploreKeyword = ko.observable(''); // explore neighborhood keywords
	self.neighborhood = ko.observable(defaultNeighborhood);	// neighborhood location
	self.currentNeighborhoodMarker = ko.observable('');
	self.formattedAddress = ko.observable('');	// formatted neighborhood location address
	self.topPicks = ko.observableArray('');	// most popular foursquare picks depending on neighborhood keywords and location
	self.dailyForecasts = ko.observableArray(''); // one week daily forecasts depeding on neighborhood location
	self.currentlyForecasts = ko.observable(''); // current weather forecast
	self.currentlySkyicon = ko.observable(''); // current weather skycon
	self.photosAPIurl = ko.observableArray(''); // foursquare photos urls
	self.selectedVenue = ko.observable(''); // selected venue info
	self.chosenMarker = ko.observable(''); // selected marker info
	self.displayForecastsList = ko.observable('false'); // boolean value for forecast list display
	self.displayVenuesList = ko.observable('false'); // boolean value fore venues list display

	/**
 	 * Get month name according to javascript getMonth() method return value
 	 * @return {string}
 	 */
	Date.prototype.getMonthName = function() {
		return months[ this.getMonth() ];
	};

	/**
 	 * Get day name according to javascript getDay() method return value
 	 * @return {string}
 	 */
	Date.prototype.getDayName = function() {
		return days[ this.getDay() ];
	};

	// work on forecast model later
	// format and return one week daily forecasts data 
  	self.computedDailyForecasts = ko.computed(function(){

  		var tempDailyForecasts = self.dailyForecasts();
  		for (var i in tempDailyForecasts) {
  			var date = new Date(tempDailyForecasts[i].time * 1000);
  			// var formatedTime = days[date.getDay()] + ', ' + months[date.getMonth()] + ' ' + date.getDate();
  			// var formatedTime = date.getDayName() + ', ' + date.getMonthName() + ' ' + date.getDate();
  			var formatedTime = date.getDayName();

  			tempDailyForecasts[i]['formatedTime'] = formatedTime;
  		}

  		return tempDailyForecasts;
  	});

	// setup and initialize skycons canvas display
  	self.skycons = function() {
  		var icons = new Skycons(),
          	list  = ["clear-day", "clear-night", "partly-cloudy-day", "partly-cloudy-night", "cloudy", "rain", "sleet", "snow", "wind", "fog"];
		
		for(var i = list.length; i--; ) {
			var weatherType = list[i],
			elements = document.getElementsByClassName( weatherType );

			for (e = elements.length; e--;) {
			    icons.set( elements[e], weatherType );
			}
		}

		icons.play();
  	}
	
	// custom binding handler that tracks html binding changes 
	// and fires callback when value is updated
	// reference: http://stackoverflow.com/questions/16250594/afterrender-for-html-binding
  	ko.bindingHandlers.afterHtmlRender = {
		update: function(el, va, ab) {
			ab().html && va()(ab().html);
		}
	}

	// update function for forecasts list display
	self.updateFObservable = function() {
		self.displayForecastsList(!self.displayForecastsList());
	}

	// update function for venues list display
	self.updateVObservable = function() {
		self.displayVenuesList(!self.displayVenuesList());
	}

	// takes user's input in neighborhood address
	// update displays for map, weather forecasts and popular venues
	self.computedNeighborhood = function() {
		if (!isEmpty(self.neighborhood())) {
			removeVenueMarkers();
			self.topPicks([]);
			getNeighborhood(self.neighborhood());		
		} // add
		
	};

	// check if user's input string is blank or contains only white-space
	var isEmpty = function ( input ) {
		return (input.length === 0 || !input.trim());
	}

	// when user update neighborhood address in input bar,
	// update displays for map, weather forecasts and popular venues
	self.neighborhood.subscribe(self.computedNeighborhood);	

	// when user update explore keyword in input bar,
	// update displays for map, weather forecasts and popular venues
	self.exploreKeyword.subscribe(self.computedNeighborhood);

	/**
 	 * When venue item is clicked in venues listing,
 	 * panto the venue marker on map, display infowindow, 
 	 * start marker bounce animation
 	 * @param {Object} venue A clicked venue object in venues list
 	 * @return {void}
 	 */ 
	self.panToMarker = function(venue) {

		var venueInfowindowStr = setVenueInfowindowStr(venue);
		var venuePosition = new google.maps.LatLng(venue.lat, venue.lon);

		self.chosenMarker(venue.marker);
		self.selectedVenue(venue.id);
		infowindow.setContent(venueInfowindowStr);
		infowindow.open(map, venue.marker);
		map.panTo(venuePosition);
		selectedMarkerBounce(venue.marker);

	}

	// empty venuMarkers array, remove all venue markers on map
	// this function gets called once neighborhood keywords or address is updated
	function removeVenueMarkers() {

		self.currentNeighborhoodMarker.setMap(null);

		self.topPicks().forEach(function(venueItem){
			venueItem.marker.setMap(null);
			venueItem.marker = {};
		});

	}


	/**
 	 * Create a neighborhood marker in a shape of start in black color
 	 * for neighborhood address user input in the address input bar
 	 * @param {Object} place A place object returned by Google Map place callback
 	 * @return {void}
 	 */ 
	function createNeighborhoodMarker(place) {

		var placeName = place.name;

		var blackStar = {
		    path: 'M 125,5 155,90 245,90 175,145 200,230 125,180 50,230 75,145 5,90 95,90 z',
		    fillColor: 'black',
		    fillOpacity: 1,
		    scale: 0.2
		};

		var marker = new google.maps.Marker({
			map: map,
			position: place.geometry.location,
			title: placeName,
			icon: blackStar
		});

		google.maps.event.addListener(marker, 'click', function() {
			infowindow.setContent(placeName);
			infowindow.open(map, marker);
		});

		self.currentNeighborhoodMarker = marker; 
		console.log(self.currentNeighborhoodMarker);		

	}

	/**
 	 * Get best nearby neighborhood venues data from foursquare API,
 	 * get forecasts data from forecast.io API
 	 * create venues markers on map
 	 * @param {Object} place A place object returned by Google Map place callback
 	 * @return {void}
 	 */
	function getNeighborhoodVenues(place) {
		infowindow = new google.maps.InfoWindow();
		placeLat = place.geometry.location.k;
		placeLon = place.geometry.location.D;
		// venueName = place.name;
		self.formattedAddress(place.formatted_address);
		var newNeighborhood = new google.maps.LatLng(placeLat, placeLon);
		map.setCenter(newNeighborhood);

		// create one marker for neighborhood address user input
		createNeighborhoodMarker(place);

		// get nearby venues based on explore keywords and neighborhood address
		getFoursquareData(); 	

		// get forecast data
		getForecastData();

		// disable marker animation when infowindow is closed
		google.maps.event.addListener(infowindow, 'closeclick', function() {  
    		self.chosenMarker().setAnimation(null); 
		});

	};

	/**
 	 * Get best nearby neighborhood venues data from foursquare API,
 	 * retrieve foursquare venue photos
 	 * create 2D array to store foursquare venue photos data
 	 * set venue photos groups for swipebox lightbox display
 	 * create venues markers on map
 	 * @return {void}
 	 */
 	function getFoursquareData() {
		var foursquareBaseURL = 'https://api.foursquare.com/v2/venues/explore?';
  		var foursquareID = 'client_id=T3VKC34CMHTDB5YPR3TRA044A51EHCMPBJII433EB1TXWH1A&client_secret=XTWLWF52NASGLCULU0MF1YV1300CC0IDLW4DQXV2I3ROVDOC';
  		var neighborhoodLL = '&ll=' + placeLat + ',' + placeLon;
  		var query = '&query=' + self.exploreKeyword();
  		var foursquareURL = foursquareBaseURL + foursquareID + '&v=20130815&venuePhotos=1' + neighborhoodLL + query;
  		$.ajax({
  			url: foursquareURL, 
  			//dataType:'jsonp',
  			success: function(data) {

  				var initialFoursquareData = data.response.groups[0].items;
  				initialFoursquareData.forEach(function(venueItem) {
  					self.topPicks.push( new Venue(venueItem, foursquareID) );
  				});

  				console.log(self.topPicks());
  				//console.log('photo albumn url: ' + self.topPicks()[0].photoAlbumnURL);
  				
	      		self.topPicks().forEach(function(venueItem) { // add
	      			setPhotoAlbumns(venueItem);
	      			createVenueMarker(venueItem);
	      		});

	      		// set bounds according to suggestedBounds from foursquare data resonse
	      		var tempBounds = data.response.suggestedBounds;
		      	if (tempBounds != undefined) {
			        bounds = new google.maps.LatLngBounds(
			        	new google.maps.LatLng(tempBounds.sw.lat, tempBounds.sw.lng),
			        	new google.maps.LatLng(tempBounds.ne.lat, tempBounds.ne.lng));
			        map.fitBounds(bounds);
		      	}
      		}	     		
      	});
	}
 
	/**
 	 * set venue photos groups for swipebox lightbox display
 	 * create venues markers on map
 	 * @param {Array.<Object>} venuesPhotos A Empty 2D array to keep track of venue photos data
 	 * @param {Array.<Object>} venueIDlist An array to keep a list of all venues IDs
 	 * @param {Array.<Object>} venueImgsURLlist A array to keep a list of all venues photo urls
 	 * @return {void}
 	 */
 	 function setPhotoAlbumns (venueItem) {

		var baseImgURL = 'https://irs3.4sqi.net/img/general/'; // base url to retrieve venue photos

		$.ajax({
			url: venueItem.photoAlbumnURL,
			dataType: 'jsonp',
			success: function(data) {

				var imgItems = data.response.photos.items;

				for (var i in imgItems) {
					var venueImgURL = baseImgURL + 'width800' + imgItems[i].suffix;
					var venueImgObj = {
						href: venueImgURL,
						title: venueItem.name
					};

					venueItem.photoAlbumn.push(venueImgObj);
				}
			}
		});

  		var venueAlbumnID = '#' + venueItem.id;
  		
  		// setup swipebox photo groups click function
		$(venueAlbumnID).click(function( e ) {
			e.preventDefault();
			$.swipebox(venueItem.photoAlbumn);
		});
	}

	// get forecasts data from forecast.io API ajax call
	// use jsonp data type to avoid cross domain error
	function getForecastData() {
		
      	var forecastBaseURL = 'https://api.forecast.io/forecast/';
		var forecastAPIkey = '96556a5d8a419fc71902643785e74d30';
		var formattedLL = '/'+ placeLat + ',' + placeLon;
		var forecastURL = forecastBaseURL + forecastAPIkey + formattedLL;

		$.ajax({
			url: forecastURL,
			dataType: 'jsonp',
			success: function(data) {
				self.dailyForecasts(data.daily.data);
				self.currentlyForecasts(data.currently);
				self.currentlySkyicon(data.currently.icon);
			}
		});
	}

	/**
 	 * set a venue's marker infowindow
 	 * error handlings if no data is found
	 * @param {Object} venue A venue object 
 	 * @return {void}
 	 */
	function setVenueInfowindowStr(venue) {

		var contentString = '<div class="venue-infowindow">' 
							+ '<div class="venue-name">'
							+ '<a href ="' + venue.foursquareUrl + '">'
							+ venue.name
							+ '</a>'
							+ '<span class="venue-rating badge">'
							+ venue.rating
							+ '</span>'
							+ '</div>'
							+ '<div class="venue-category"><span class="glyphicon glyphicon-tag"></span>'
							+ venue.categories
							+ '</div>'
							+ '<div class="venue-address"><span class="glyphicon glyphicon-home"></span>'
							+ venue.formattedAddress
							+ '</div>'
							+ '<div class="venue-contact"><span class="glyphicon glyphicon-earphone"></span>'
							+ venue.formattedPhone
							+ '</div>'  
							+ '<div class="venue-url"><span class="glyphicon glyphicon-globe"></span>'
							+ venue.url
							+ '</div>'  						    						    						
							+ '</div>';

		return	contentString;

	}

	/**
 	 * create a venue marker on map
 	 * when this venue marker is clicked on map, 
 	 * open marker infowindow, set marker bounce animation
 	 * scroll to this venue item on venues list,
 	 * panto this marker on map
	 * @param {Object} venue A venue object 
 	 * @return {void}
 	 */
	function createVenueMarker(venue) {

		var venueInfowindowStr = setVenueInfowindowStr(venue);

		var venuePosition = new google.maps.LatLng(venue.lat, venue.lon);

		var venueMarker = new google.maps.Marker({
		  	map: map,
		  	position: venuePosition,
		  	title: venue.name
		});
	    
		google.maps.event.addListener(venueMarker, 'click', function() {
	    	
			document.getElementById(venue.id).scrollIntoView();
			var clickEvent = jQuery.Event('click');
			clickEvent.stopPropagation();
			$('#' + venue.id).closest(".venue-listing-item").trigger('clickEvent');
			self.selectedVenue(venue.id);
			infowindow.setContent(venueInfowindowStr);
			infowindow.open(map, venueMarker);
			selectedMarkerBounce(venueMarker);
			map.panTo(venuePosition);
		});

		venue.marker = venueMarker;
		console.log(venue.marker);

	}

	/**
 	 * if this marker has no animation, disable other marker's animation
 	 * set this marker's animation to bounce
	 * @param {Object} venueMarker A venue marker object 
 	 * @return {void}
 	 */
	function selectedMarkerBounce(venueMarker) {
		if (venueMarker.getAnimation() == null) {
			self.chosenMarker(venueMarker);
			self.topPicks().forEach(function(venue) {
				venue.marker.setAnimation(null);
			});
			
			venueMarker.setAnimation(google.maps.Animation.BOUNCE);
		}
	}

	// callback(results, status) makes sure the search returned results for a location.
	// if so, get and update neighborhood venues 
	function getNeighborhoodCallback(results, status) {

	    if (status == google.maps.places.PlacesServiceStatus.OK) {

	      	getNeighborhoodVenues(results[0]);

	    }
	}

	/**
 	 * get neighborhood data for the app
 	 * this function gets called when explore keywords or 
 	 * neighborhood location gets updates
	 * @param {string} neighborhood A neighborhood location retrieved from user input
 	 * @return {void}
 	 */
	function getNeighborhood(neighborhood) {

		// the search request object
		var request = {
			query: neighborhood
		};

		// creates a Google place search service object. 
		// PlacesService does the work of searching for location data.
		service = new google.maps.places.PlacesService(map);
		// searches the Google Maps API for location data and runs the callback 
      	// function with the search results after each search.
		service.textSearch(request, getNeighborhoodCallback);

	}

	// initliaze neighborhood data when application is load
	function initializeNeighborhood(neighborhood) {
		getNeighborhood(neighborhood);
	}

	// function that initializes the application map
	function initializeMap() {
		mapOptions = {
			zoom: 15,
			disableDefaultUI: true
		};

		map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
		
		$('#map-canvas').height($(window).height());
	};

	// initialize map
	initializeMap();

	// initialize neighborhood
	initializeNeighborhood(defaultNeighborhood);

	// the map bounds is updated when page resizes
	window.addEventListener('resize', function(e) {
    	
		map.fitBounds(bounds);
    	
		$('#map-canvas').height($(window).height());
	});

};

// initialize AppViewModel 
$(function() {

	ko.applyBindings(new AppViewModel());


});

