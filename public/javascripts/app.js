var app = angular.module('app', []);
var controller = app.controller('controller', function($scope, $http) {
  $scope.audioObject = {};
  $scope.getAlbums = function() {
    // Show loader while waiting for response
    $("#loader").fadeIn(1000);

    // Stop any songs that are still playing
    if($scope.audioObject && $scope.audioObject.pause != undefined) {
      $scope.audioObject.pause();
    }
    $scope.tracks = null;

    // Make ajax request 
    $http({
      method: 'POST',
      url: '/search',
      data: {search: $scope.track}
    })
    .then(function(albums) {
      // Hide loader 
      $("#loader").fadeOut(1000);

      if(_.isArray(albums.data) && albums.data.length > 0) {
        $scope.albums = albums.data;
      } else {
        $scope.albums = [];
        $scope.tracks = null;
      }
    });
  };

  // Play or stop song and retreive album information 
  $scope.play = function(song, albumId, refresh) {
    if(song != null && $scope.currentSong == song) {
      $scope.audioObject.pause();
      $scope.currentSong = null;
      return;
    } else {
      if($scope.audioObject.pause != undefined) {
        $scope.audioObject.pause();
      }
        $scope.audioObject = new Audio(song);
        $scope.audioObject.play();
        $scope.currentSong = song;
        $scope.currentAlbum = albumId;
      if(refresh && !$scope.albumId || refresh && $scope.albumId != albumId) {
        $http({
          method: 'POST',
          url: '/tracks',
          data: {albumId: albumId}
        })
        .then(function(response) {
          $scope.tracks = response.data.tracks.items;
          $scope.albumId = response.data.id;
          $scope.albumName = response.data.name;
        });
      }
    }
  };

  // Converts milliseconds to minutes:seconds time format
  $scope.millisecondsToTime = function(ms) {
    var minutes = Math.floor(ms / 60000);
    var seconds = ((ms % 60000) / 1000).toFixed(0);
    if (seconds == 60) {
      minutes = minutes + 1;
      seconds = 0;
    }
    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
  };
});

// Add tool tips to anything with a title property
$('body').tooltip({
    selector: '[title]'
});

// Fade in the web page
$(document).ready(function() {
  $('body').css('opacity', '0').fadeTo(1500, 1,'swing');
});
