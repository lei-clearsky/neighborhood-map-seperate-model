/**
 * @fileoverview View Model for neighborhood map application
 * @author sportzhulei@gmail.com (Lei Zhu)
 */

function AppViewModel() {

	var self = this;
	var map,
		mapOptions,
		placeLat,
		placeLon,
		venueName,
		bounds,
		service,
		marker,
		newNeighborhood,
		infowindow;

	var venueMarkers = [];
	var defaultExploreKeyword = 'best nearby';
	var defaultNeighborhood = 'new york';
	var days = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
	var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

	self.exploreKeyword = ko.observable(''); // explore neighborhood keywords
	self.neighborhood = ko.observable(defaultNeighborhood);	// neighborhood location
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

  	// format and return most popular venues data 
  	// error handlings if no data is found
  	self.computedTopPicks = ko.computed(function() {
  		var tempTopPicks = self.topPicks();

  		for (var i in tempTopPicks) {

  			var photoPrefix = 'https://irs0.4sqi.net/img/general/';
  			var photoFullURL = 'http://placehold.it/100x100';

  			if (!tempTopPicks[i].venue.contact.formattedPhone) {
  				tempTopPicks[i].formatedContact = 'No contact available';
  			}else{
  				tempTopPicks[i].formatedContact = tempTopPicks[i].venue.contact.formattedPhone;
  			}

  			if (!tempTopPicks[i].tips) {
  				tempTopPicks[i].formatedTip = 'No reviews available';
  			}else{
  				tempTopPicks[i].formatedTip = tempTopPicks[i].tips[0].text;
  			}

  			if (!tempTopPicks[i].venue.url) {
  				tempTopPicks[i].formatedUrl = 'No website available';
  			}else{
  				tempTopPicks[i].formatedUrl = tempTopPicks[i].venue.url;
  			}

  			if (!tempTopPicks[i].venue.rating) {
  				tempTopPicks[i].venue.formatedRating = '0.0';
  			}else{
  				tempTopPicks[i].venue.formatedRating = tempTopPicks[i].venue.rating;
  			}

  			if (tempTopPicks[i].venue.featuredPhotos){
  				var photoSuffix = tempTopPicks[i].venue.featuredPhotos.items[0].suffix;
  				photoFullURL = photoPrefix + 'width100' + photoSuffix;
  			}
 						
  			tempTopPicks[i]['photoFullURL'] = photoFullURL;

  		}
  		return tempTopPicks;
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
		if (self.neighborhood() != '') {
			if (venueMarkers.length > 0)
				removeVenueMarkers();
			getNeighborhood(self.neighborhood());
		}	
	};

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
		var venueInfo = setVenueInfowindow(venue.venue);

		for (var i in venueMarkers) {
			if (venueMarkers[i].title === venueInfo.venueName) {
				self.chosenMarker(venueMarkers[i]);
				self.selectedVenue(venueInfo.venueID);
				infowindow.setContent(venueInfo.contentString);
				infowindow.open(map, venueMarkers[i]);
				map.panTo(venueMarkers[i].position);
				selectedMarkerBounce(venueMarkers[i]);
			}
		}
	}

	// empty venuMarkers array, remove all venue markers on map
	// this function gets called once neighborhood keywords or address is updated
	function removeVenueMarkers() {
	    for (var i = 0; i < venueMarkers.length; i++) {

    		venueMarkers[i].setMap(null);

		}

		venueMarkers = [];
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

		venueMarkers.push(marker); // push this marker to venueMarker array

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
		venueName = place.name;
		var formattedVenueAddress = place.formatted_address; 
		self.formattedAddress(formattedVenueAddress);
		newNeighborhood = new google.maps.LatLng(placeLat, placeLon);
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
  			dataType:'jsonp',
  			success: function(data) {
  				self.topPicks(data.response.groups[0].items);
				var venueImgsURLlist = []; // keep a list of all venues photo urls
				var venueIDlist = []; // keep a list of all venues ID

				// retrieve and set venue photo url to get photos for each venue
				for(var i in self.topPicks()) {
					var baseImgsURL = 'https://api.foursquare.com/v2/venues/';
					var venueID = self.topPicks()[i].venue.id;
					var venueName = self.topPicks()[i].venue.name;
					var venueImgsURL = baseImgsURL + venueID + '/photos?' + foursquareID + '&v=20130815';
					venueImgsURLlist.push(venueImgsURL);
					venueIDlist.push(venueID);
				}

				// create empty 2D array to store foursquare venue photos data 
	      		function get2DArray(size) {
				    size = size > 0 ? size : 0;
				    var arr = [];
				    while(size--) {
				        arr.push([]);
				    }
				    return arr;
				}

				var venuesPhotos = get2DArray(venueIDlist.length);

				// set venue photos groups for swipebox lightbox display
				setPhotosGroups(venuesPhotos, venueIDlist, venueImgsURLlist);

	      		// create venue markers
	      		for (var i in self.topPicks()) {

	        		createVenueMarker(self.topPicks()[i].venue);
	      		}

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
	function setPhotosGroups (venuesPhotos, venueIDlist, venueImgsURLlist) {

		var baseImgURL = 'https://irs3.4sqi.net/img/general/'; // base url to retrieve venue photos

		// store venue photos data in 2D array
		// use closure to keep i index in venuePhotos 2D array
		for (var i in venueImgsURLlist) {
			(function(i){
      			$.ajax({
      				url: venueImgsURLlist[i],
      				dataType: 'jsonp',
      				success: function(data) {

      					var imgItems = data.response.photos.items;

      					for (var j in imgItems) {
      						var venueImgURL = baseImgURL + 'width800' + imgItems[j].suffix;
      						var venueImgObj = {
      							href: venueImgURL,
      							title: venueName
      						};
      						venuesPhotos[i].push(venueImgObj);
      					}
      				}
      			});

      		})(i);

      		var venueIDphotos = '#' + venueIDlist[i];
      		
      		// setup swipebox photo groups click function
  			$(venueIDphotos).click(function( e ) {
  				e.preventDefault();
  				var venueIDlistIndex = venueIDlist.indexOf(event.target.id);
  				$.swipebox(venuesPhotos[venueIDlistIndex]);
  			});
		}
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
	function setVenueInfowindow(venue) {
		var lat = venue.location.lat;
		var lng = venue.location.lng;
		var venueName = venue.name;
		var venueID = venue.id;
		var venueCategory = venue.categories[0].name;
		var venuePosition = new google.maps.LatLng(lat, lng);
		var venueAddress = venue.location.formattedAddress;
		var venueContact = venue.contact.formattedPhone;
		var foursquareUrl = "https://foursquare.com/v/" + venue.id;
		var venueRating = venue.rating;
		var venueUrl = venue.url;

		if (!venueContact)
			venueContact = 'Contact not available';
		if (!venueUrl)
			venueUrl = 'Website not available';
		if (!venueRating)
			venueRating = '0.0';


		var contentString = '<div class="venue-infowindow">' 
							+ '<div class="venue-name">'
							+ '<a href ="' + foursquareUrl + '">'
							+ venueName
							+ '</a>'
							+ '<span class="venue-rating badge">'
							+ venueRating
							+ '</span>'
							+ '</div>'
							+ '<div class="venue-category"><span class="glyphicon glyphicon-tag"></span>'
							+ venueCategory
							+ '</div>'
							+ '<div class="venue-address"><span class="glyphicon glyphicon-home"></span>'
							+ venueAddress
							+ '</div>'
							+ '<div class="venue-contact"><span class="glyphicon glyphicon-earphone"></span>'
							+ venueContact
							+ '</div>'  
							+ '<div class="venue-url"><span class="glyphicon glyphicon-globe"></span>'
							+ venueUrl
							+ '</div>'  						    						    						
							+ '</div>';
		return	{
					'venueName': venueName,
					'contentString': contentString,
					'venueID': venueID,
					'venuePosition': venuePosition
				}

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

		var venueInfo = setVenueInfowindow(venue);

		var venueMarker = new google.maps.Marker({
		  	map: map,
		  	position: venueInfo.venuePosition,
		  	title: venueInfo.venueName
		});
	    
		google.maps.event.addListener(venueMarker, 'click', function() {
	    	
			document.getElementById(venueInfo.venueID).scrollIntoView();
			var clickEvent = jQuery.Event('click');
			clickEvent.stopPropagation();
			$('#' + venueInfo.venueID).closest(".venue-listing-item").trigger('clickEvent');
			self.selectedVenue(venueInfo.venueID);
			infowindow.setContent(venueInfo.contentString);
			infowindow.open(map, venueMarker);
			selectedMarkerBounce(venueMarker);
			map.panTo(venueInfo.venuePosition);
		});

		venueMarkers.push(venueMarker);

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
			venueMarkers.forEach(function(marker) {
				marker.setAnimation(null);
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