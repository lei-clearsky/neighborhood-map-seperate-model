function MapViewModel() {

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
	// var venuesPhotos = [];
	var tempVenuePhotos = [];
	self.photosAPIurl = ko.observableArray('');
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
  		//var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  		//var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  		var newDailyForecasts = self.dailyForecasts();
  		for (var i in newDailyForecasts) {
  			var date = new Date(newDailyForecasts[i].time * 1000);
  			//var formatedTime = days[date.getDay()] + ', ' + months[date.getMonth()] + ' ' + date.getDate();
  			var formatedTime = date.getDayName() + ', ' + date.getMonthName() + ' ' + date.getDate();

  			newDailyForecasts[i]['formatedTime'] = formatedTime;
  		}

  		return newDailyForecasts;
  	});

  	self.computedTopPicks = ko.computed(function(){
  		var newTopPicks = self.topPicks();
  		for (var i in newTopPicks) {

  			var photoPrefix = 'https://irs0.4sqi.net/img/general/';
  			var photoSuffix = newTopPicks[i].venue.featuredPhotos.items[0].suffix;
  			var photoFullURL = photoPrefix + 'width100' + photoSuffix;			

  			newTopPicks[i]['photoFullURL'] = photoFullURL;
  		}
  		return newTopPicks;
  	});

	// http://stackoverflow.com/questions/24572100/skycons-cant-display-the-same-icon-twice
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

		infowindow = new google.maps.InfoWindow();

    	google.maps.event.addListener(marker, 'click', function() {
    		infowindow.setContent(placeName);
    		infoWindow.open(map, marker);
    	});

    	// venueMarkers.push(marker);
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
/*
		var blackStar = {
		    path: 'M 125,5 155,90 245,90 175,145 200,230 125,180 50,230 75,145 5,90 95,90 z',
		    fillColor: 'black',
		    fillOpacity: 1,
		    scale: 0.2
		};

		marker = new google.maps.Marker({
      		map: map,
      		position: venueData.geometry.location,
      		title: venueName,
      		icon: blackStar
    	});

    	// venueMarkers.push(marker);

    	infoWindow = new google.maps.InfoWindow({
    		content: venueName
    	});

    	google.maps.event.addListener(marker, 'click', function() {
    		infoWindow.open(map, marker);
    	});
*/
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
  				//venuesPhotos.length = 0;
      			self.topPicks(data.response.groups[0].items);
	      		// imageJSON: https://api.foursquare.com/v2/venues/4bcf9774a8b3a5939497625f/photos?client_id=T3VKC34CMHTDB5YPR3TRA044A51EHCMPBJII433EB1TXWH1A&client_secret=XTWLWF52NASGLCULU0MF1YV1300CC0IDLW4DQXV2I3ROVDOC&v=20140806
	      		// image: https://irs3.4sqi.net/img/general/width100/2017397_09ITdxhLFkJbkviObrYIo8TRYgpecX91UOzrO0a89gA.jpg
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
	        		createMarkers(self.topPicks()[i].venue);
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
      		// http://stackoverflow.com/questions/48239/getting-the-id-of-the-element-that-fired-an-event-using-jquery
  			$(venueIDphotos).click(function( e ) {
  				e.preventDefault();
  				var venueIDlistIndex = venueIDlist.indexOf(event.target.id);
  				$.swipebox(venuesPhotos[venueIDlistIndex]);
  			});
		}
	}

	function getForecastData() {
		// http://stackoverflow.com/questions/16050652/how-do-i-assign-a-json-response-from-this-api-im-using-to-elements-on-my-page
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

	// http://stackoverflow.com/questions/4822852/how-to-get-the-day-of-week-and-the-month-of-the-year
  	var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    Date.prototype.getMonthName = function() {
        return months[ this.getMonth() ];
    };

    Date.prototype.getDayName = function() {
        return days[ this.getDay() ];
    };

};

// initialize the MapViewModel binding
$(function() {
  ko.applyBindings(new MapViewModel());

});