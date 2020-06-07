# NodeJS-SpotifyAPIrequests

---

This is a web server that allows user to search for album art based on artist name input.    
Each URL reaching the site is parsed and enables the site to respond with the following data:    
* serve the homepage html file
* serve the favicon for the site
* serve the banner.jpg image for homepage
* serve album art as .jpg from folder ./album-art/
* serve html and path to ./mages/404.gif for wrong directory i.e localhost:3000/catsMeow/how/meow.mp3
* serve html for image not found in album-art  i.e localhost:3000/album-art/ZeusSelfieFails.jpg
* serve html with image tags as result of artist name search performed by user.
* serve html and none.gif case search for album has no reslts, i.e artist=./';,,\
	
**NOTE:** For the bonus, I decided to also cache the result of searches and make them valid for 30 days. This way, when a user searches for a term already searched in the last 30 days, the program retrieves the cached album art file names for the album art in question. If the search occurred more than 30 days ago, a new search is performed and file names are rewritten into file and expiration set to 30 days from search. The steps needed to accomplish the bonus part are included below.   
For more detailed information, please refer to the file 'Performance Improvements' in this same directory.   

The searches are performed through the Spotify API.

* Serve homepage to user and parse artist input
* Case artist was searched for in the last 30 days (changed to 3000 on github so forks can use cache to test)
	* Retrieve the file names in cache and add them to img tags, serve html file to user
* Otherwise continue to perform a new search
* If there is not a credential file with token for the Spotify API
	* POST request to Spotify API a new access token, store it in credential file.
* Else then the credential file exists
	* Cached token expiration is checked
		* Case token is valid, perform GET request for artist with cached token.
		* Case token is expired, POST request from Spotify API a new access token, store response in credential file
			* Perform GET request for artist with newly issued token.
* Parse album object received from Spotify to get the image array path relevant to user search
	* Write image names to ./cache/ to cache file names for the search result, set expiration to 30 days
* Perform a GET request to download all images in those paths and save them to album-art folder
* Send user a html file with <img> sources which get processed by the server and pictures are finally piped into user page 

**Note**  Get a client id and client secret from Spotify and place them into auth/credentials in order to use thi sservice and run your own searches. See line 300-305 to set the cache expiration length.   

*Vagner*
