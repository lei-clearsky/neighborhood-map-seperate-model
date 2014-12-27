function AppViewModel() {

	var self = this;
	var map; 
	var mapOptions;
	var venueMarkers = [];
	var VenuesOnList = [];
	var venueLat;
	var venueLon;
	var venueName;
	var bounds;
	var service;
	var marker;
	var infoWindow;
	var defaultExploreKeyword = 'best nearby';
	var defaultNeighborhood = 'new york';
	var newNeighborhood;
	var currentLat;
	var currentLon;

	self.exploreKeyword = ko.observable('');
	self.neighborhood = ko.observable(defaultNeighborhood);
	self.formattedAddress = ko.observable('');
	self.topPicks = ko.observableArray('');
	self.dailyForecasts = ko.observableArray('');
	self.currentlyForecasts = ko.observable('');
	self.currentlySkyicon = ko.observable('');
	self.photosAPIurl = ko.observableArray('');
	self.selectedVenue = ko.observable('');

  	var days = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

	var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

	Date.prototype.getMonthName = function() {
		return months[ this.getMonth() ];
	};

	Date.prototype.getDayName = function() {
		return days[ this.getDay() ];
	};

  	self.computedDailyForecasts = ko.computed(function(){

  		var newDailyForecasts = self.dailyForecasts();
  		for (var i in newDailyForecasts) {
  			var date = new Date(newDailyForecasts[i].time * 1000);
  			// var formatedTime = days[date.getDay()] + ', ' + months[date.getMonth()] + ' ' + date.getDate();
  			// var formatedTime = date.getDayName() + ', ' + date.getMonthName() + ' ' + date.getDate();
  			var formatedTime = date.getDayName();

  			newDailyForecasts[i]['formatedTime'] = formatedTime;
  		}

  		return newDailyForecasts;
  	});

  	self.computedTopPicks = ko.computed(function(){
  		var tempTopPicks = self.topPicks();

  		for (var i in tempTopPicks) {

  			var photoPrefix = 'https://irs0.4sqi.net/img/general/';
  			var photoFullURL = 'http://placehold.it/100x100';

  			if (!tempTopPicks[i].venue.contact.formattedPhone){
  				tempTopPicks[i].formatedContact = 'No contact available';
  			}else{
  				tempTopPicks[i].formatedContact = tempTopPicks[i].venue.contact.formattedPhone;
  			}

  			if (!tempTopPicks[i].tips){
  				tempTopPicks[i].formatedTip = 'No reviews available';
  			}else{
  				tempTopPicks[i].formatedTip = tempTopPicks[i].tips[0].text;
  			}

  			if (!tempTopPicks[i].venue.url){
  				tempTopPicks[i].formatedUrl = 'No website available';
  			}else{
  				tempTopPicks[i].formatedUrl = tempTopPicks[i].venue.url;
  			}

  			if (!tempTopPicks[i].venue.rating){
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

  	self.skycons = function() {
  		var icons = new Skycons(),
          	list  = [
						"clear-day", "clear-night", "partly-cloudy-day",
						"partly-cloudy-night", "cloudy", "rain", "sleet", 
						"snow", "wind", "fog"
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
	
  	ko.bindingHandlers.afterHtmlRender = {
		update: function(el, va, ab){
			ab().html && va()(ab().html);
		}
	}

	// showhide functions
	// display neighborhood info
	self.displayForecastsList = ko.observable('false');

	// update venues on the list display
	self.displayVenuesList = ko.observable('false');

	self.updateFObservable = function(){
		self.displayForecastsList(!self.displayForecastsList());
	}
	self.updateVObservable = function(){
		self.displayVenuesList(!self.displayVenuesList());
	}


	self.computedNeighborhood = function() {
		if (self.neighborhood() != '') {
			if (venueMarkers.length > 0)
				removeVenueMarkers();
			getNeighborhood(self.neighborhood());
		}	
	};

	self.neighborhood.subscribe(self.computedNeighborhood);	

	self.exploreKeyword.subscribe(self.computedNeighborhood);


	self.panToMarker = function(venue) {
		var venueInfo = setVenueInfowindow(venue.venue);

		for (var i in venueMarkers) {
			if (venueMarkers[i].title === venueInfo.venueName) {
				// google.maps.event.trigger(venueMarkers[i], 'click');
				self.selectedVenue(venueInfo.venueID);
				infowindow.setContent(venueInfo.contentString);
				infowindow.open(map, venueMarkers[i]);
				map.panTo(venueMarkers[i].position);
			}
		}
	}


	function removeVenueMarkers() {
	    for (var i = 0; i < venueMarkers.length; i++) {

    		venueMarkers[i].setMap(null);

		}

		venueMarkers = [];
	}


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

		venueMarkers.push(marker);

	}

	// set neighborhood marker on the map 
	// get best nearby venues from foursquare API
	function getNeighborhoodVenues(venueData) {

		infowindow = new google.maps.InfoWindow();
		venueLat = venueData.geometry.location.k;
		venueLon = venueData.geometry.location.D;
		currentLat = venueLat;
		currentLon = venueLon;
		venueName = venueData.name;
		var formattedVenueAddress = venueData.formatted_address; 
		self.formattedAddress(formattedVenueAddress);
		newNeighborhood = new google.maps.LatLng(venueLat, venueLon);
		map.setCenter(newNeighborhood);

		createNeighborhoodMarker(venueData);

		// get nearby venues based on neighborhood  
		getFoursquareData(); 	

		// get forecast data
		getForecastData();

	};


	function getFoursquareData() {
		var foursquareBaseURL = 'https://api.foursquare.com/v2/venues/explore?';
  		var foursquareID = 'client_id=T3VKC34CMHTDB5YPR3TRA044A51EHCMPBJII433EB1TXWH1A&client_secret=XTWLWF52NASGLCULU0MF1YV1300CC0IDLW4DQXV2I3ROVDOC';
  		var neighborhoodLL = '&ll=' + venueLat + ',' + venueLon;
  		var query = '&query=' + self.exploreKeyword();
  		var foursquareURL = foursquareBaseURL + foursquareID + '&v=20130815&venuePhotos=1' + neighborhoodLL + query;
  		$.ajax({
  			url: foursquareURL, 
  			dataType:'jsonp',
  			success: function(data) {
  				self.topPicks(data.response.groups[0].items);
  				// create venues photos
				var venueImgsURLlist = [];
				var venueIDlist = [];
				for(var i in self.topPicks()){
					var baseImgsURL = 'https://api.foursquare.com/v2/venues/';
					var venueID = self.topPicks()[i].venue.id;
					var venueName = self.topPicks()[i].venue.name;
					var venueImgsURL = baseImgsURL + venueID + '/photos?' + foursquareID + '&v=20130815';
					venueImgsURLlist.push(venueImgsURL);
					venueIDlist.push(venueID);
				}

	      		function get2DArray(size) {
				    size = size > 0 ? size : 0;
				    var arr = [];
				    while(size--) {
				        arr.push([]);
				    }
				    return arr;
				}

				var venuesPhotos = get2DArray(venueIDlist.length);
				setPhotosGroups(venuesPhotos, venueIDlist, venueImgsURLlist);

	      		// create markers
	      		for (var i in self.topPicks()) {

	        		createVenueMarker(self.topPicks()[i].venue);
	      		}

	      		// bounds
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


	function setPhotosGroups (venuesPhotos, venueIDlist, venueImgsURLlist){
		var baseImgURL = 'https://irs3.4sqi.net/img/general/';

		for (var i in venueImgsURLlist){
			(function(i){
      			$.ajax({
      				url: venueImgsURLlist[i],
      				dataType: 'jsonp',
      				success: function(data){

      					var imgItems = data.response.photos.items;

      					for (var j in imgItems){
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
      		
  			$(venueIDphotos).click(function( e ) {
  				e.preventDefault();
  				var venueIDlistIndex = venueIDlist.indexOf(event.target.id);
  				$.swipebox(venuesPhotos[venueIDlistIndex]);
  			});
		}
	}


	function getForecastData() {
		
      	var forecastBaseURL = 'https://api.forecast.io/forecast/';
		var forecastAPIkey = '96556a5d8a419fc71902643785e74d30';
		var formattedLL = '/'+ currentLat + ',' + currentLon;
		var forecastURL = forecastBaseURL + forecastAPIkey + formattedLL;

		$.ajax({
			url: forecastURL,
			dataType: 'jsonp',
			success: function(data){
				self.dailyForecasts(data.daily.data);
				self.currentlyForecasts(data.currently);
				self.currentlySkyicon(data.currently.icon);
			}
		});
	}


	function setVenueInfowindow(venue){
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

	function createVenueMarker(venue) {

		var venueInfo = setVenueInfowindow(venue);
		// marker of a popular place
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
			map.panTo(venueInfo.venuePosition);
		});

		venueMarkers.push(venueMarker);

	}


	
	function neighborhoodVenuesCallback(results, status) {

	    if (status == google.maps.places.PlacesServiceStatus.OK) {

	      	getNeighborhoodVenues(results[0]);

	    }
	}


	function getNeighborhood(neighborhood) {

		var request = {
			query: neighborhood
		};

		service = new google.maps.places.PlacesService(map);
		service.textSearch(request, neighborhoodVenuesCallback);

	}

	function initializeNeighborhood(neighborhood){
		getNeighborhood(neighborhood);
	}

	// initializes the map
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
    initializeNeighborhood('New York');

    window.addEventListener('resize', function(e) {
    	
    	map.fitBounds(bounds);
    	
    	$('#map-canvas').height($(window).height());
  	});

};

// initialize AppViewModel 
$(function() {

	ko.applyBindings(new AppViewModel());


});