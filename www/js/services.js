angular.module('songhop.services', ['ionic.utils'])

    .factory('User', function($http, $q, $localstorage, SERVER) {
        var user = {
            favorites: [],
            newFavorites: 0,
            username: false,
            session_id: false
        }

        // set session data
        user.setSession = function(username, session_id, favorites) {
            if (username) user.username = username;
            if (session_id) user.session_id = session_id;
            if (favorites) user.favorites = favorites;

            // set data in localstorage object
            $localstorage.setObject('user', { username: username, session_id: session_id });
        }

        user.addSongToFavorites = function(song) {
            // make sure there's a song to add
            if (!song) return false;

            // add to favorites array
            user.favorites.unshift(song);
            user.newFavorites++;

            // persist this to the server
            return $http.post(SERVER.url + '/favorites', {session_id: o.session_id, song_id:song.song_id });
        }

        user.removeSongFromFavorites = function(song, index) {
            // make sure there's a song to add
            if (!song) return false;

            // add to favorites array
            user.favorites.splice(index, 1);

            return $http({
                method: 'DELETE',
                url: SERVER.url + '/favorites',
                params: { session_id: o.session_id, song_id:song.song_id }
              });

        }

        user.favoriteCount = function() {
            return user.newFavorites;
        }

        user.auth = function(username, signingUp) {

            var authRoute;

            if (signingUp) {
              authRoute = 'signup';
            } else {
              authRoute = 'login'
            }

            return $http.post(SERVER.url + '/' + authRoute, {
                username: username
            }).success(function(data) {
                user.setSession(data.username, data.session_id, data.favorites);
            });
        }

        // gets the entire list of this user's favs from server
        user.populateFavorites = function() {
            return $http({
            method: 'GET',
            url: SERVER.url + '/favorites',
            params: { session_id: o.session_id }
            }).success(function(data){
            // merge data into the queue
            o.favorites = data;
            });
        }

        // check if there's a user session present
        user.checkSession = function() {
        var defer = $q.defer();

        if (user.session_id) {
            // if this session is already initialized in the service
            defer.resolve(true);

        } else {
            // detect if there's a session in localstorage from previous use.
            // if it is, pull into our service
            var user = $localstorage.getObject('user');

            if (user.username) {
            // if there's a user, lets grab their favorites from the server
            user.setSession(user.username, user.session_id);
            user.populateFavorites().then(function() {
                defer.resolve(true);
            });

            } else {
            // no user info in localstorage, reject
            defer.resolve(false);
            }

        }

    return defer.promise;
    }

        return user;
    })

.factory('Recommendations', function($http, SERVER, $q) {
    var media;
    var recommendations = {
        queue: []
    };

    recommendations.getNextSongs = function() {
        return $http({
          method: 'GET',
          url: SERVER.url + '/recommendations'
        }).success(function(data){
          // merge data into the queue
          recommendations.queue = recommendations.queue.concat(data);
        });
      }

      recommendations.nextSong = function() {
          recommendations.queue.shift();

          recommendations.haltAudio();

          //get new songs if queue low
          if(recommendations.queue.length <= 3) {
            recommendations.getNextSongs();
          }
      }

      recommendations.playCurrentSong = function() {
        var defer = $q.defer();

        // play the current song's preview
        media = new Audio(recommendations.queue[0].preview_url);

        // when song loaded, resolve the promise to let controller know.
        media.addEventListener("loadeddata", function() {
          defer.resolve();
        });

        media.play();

        return defer.promise;
      }

      // used when switching to favorites tab
      recommendations.haltAudio = function() {
        if (media) media.pause();
      }

      recommendations.init = function() {
        if (recommendations.queue.length === 0) {
            // if there's nothing in the queue, fill it.
            // this also means that this is the first call of init.
            return recommendations.getNextSongs();

          } else {
            // otherwise, play the current song
            return recommendations.playCurrentSong();
          }
      }

    return recommendations;
})
