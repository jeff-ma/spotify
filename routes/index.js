var express = require('express');
var router = express.Router();
var request = require('request');
var querystring = require('querystring');
var fs = require('fs');
var _ = require('lodash');

// Spotify api credentials
var client_id = '0e6b8173420443949c114aa8a34de2ad';
var client_secret = '2709930d286b469e8850b96aae7180e8';
var redirect_uri = 'http://localhost:3000/callback';

// Spotify api endpoints
var authorizeUrl = 'https://accounts.spotify.com/authorize?';
var tokenUrl = 'https://accounts.spotify.com/api/token';
var userUrl = 'https://api.spotify.com/v1/me';
var searchUrl = 'https://api.spotify.com/v1/search?type=track&limit=50&query=';
var albumUrl = 'https://api.spotify.com/v1/albums/';

// Get no more than 18 albums without duplicates that are unique
var processAlbums = function(albums) {
  if(albums.tracks.items && albums.tracks.items.length > 0) {
    albums = _.filter(albums.tracks.items, function(item) {
      return !_.isNil(item.preview_url);
    });
    albums = _.uniqBy(albums, function(album) {
      return album.album.id;
    });
    albums = _.take(albums, 18);
  }
  return albums;
};

// Home page
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Enter The DJ' });
});

// Visit this route first!!! Login to Spotify once with credentials and app will refresh without needing to login again
router.get('/login', function(req, res, next) {
  var query = querystring.stringify({
    response_type: 'code',
    client_id: client_id,
    redirect_uri: redirect_uri
  });
  res.redirect(authorizeUrl + query);
});

// Spotify calls back this route after authenticating
router.get('/callback', function(req, res, next) {
  var authOptions = {
    url: tokenUrl,
    form: {
      code: req.query.code,
      redirect_uri: redirect_uri,
      grant_type: 'authorization_code'
    },
    headers: {'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))},
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var accessToken = body.access_token;
      var refreshToken = body.refresh_token;

      // Save token to file
      fs.writeFileSync('accessToken.txt', accessToken, 'utf8');
      fs.writeFileSync('refreshToken.txt', refreshToken, 'utf8');

      // After token is saved redirect to home page
      res.redirect('/');
    } else {
      res.redirect('/#' + querystring.stringify({error: 'invalid_token'}));
    }
  });
});

router.post('/search', function(req, res, next) {
  var accessToken = fs.readFileSync('accessToken.txt', 'utf8');
  var refreshToken = fs.readFileSync('refreshToken.txt', 'utf8');
  var options = {
    method: 'GET',
    url: searchUrl + req.body.search,
    headers: {'Authorization': 'Bearer ' + accessToken},
    json: true
  };

  // Get albums to send back to client or get new access token 
  request.get(options, function(error, response, body) {
    if(!error && response.statusCode === 200) {
      var albums = processAlbums(body);
      res.status(200).send(processAlbums(body));
    } else {
      // Token needs refreshing 
      console.log("token needs refreshing");
      var authOptions = {
        url: tokenUrl,
        form: {
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        },
        headers: {
          'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
        },
        json: true
      };

      // Get new access token by sending api request with refresh token
      request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
          var accessToken = body.access_token;
          var options = {
            method: 'GET',
            url: searchUrl + req.body.search,
            headers: {'Authorization': 'Bearer ' + accessToken},
            json: true
          };

          // Save new access token to file
          fs.writeFileSync('accessToken.txt', accessToken, 'utf8');
          
          request.get(options, function(error, response, body) {
            if(!error && response.statusCode === 200) {
              res.status(200).send(processAlbums(body));
            } else {
              res.status(500).send(error);
            }
          });
        } else {
          res.status(500).send(error);
        }
      });
    }
  });
});

// Get tracks for the album
router.post('/tracks', function(req, res, next) {
  var albumId = req.body.albumId;
  var access = fs.readFileSync('accessToken.txt', 'utf8');
  var options = {
    method: 'GET',
    url: albumUrl + albumId,
    headers: {'Authorization': 'Bearer ' + access},
    json: true
  };

  request.get(options, function(error, response, body) {
    if(!error && response.statusCode === 200) {
      res.status(200).send(body);
    } else {
      res.status(500).send(error);
    }
  });
});

module.exports = router;
