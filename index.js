/*
=-=-=-=-=-=-=-=-=-=-=-=-
Album Art Search
=-=-=-=-=-=-=-=-=-=-=-=-
Student ID: 23651127
Comment (Required): This is a webserver that allows user to search for album art based on artist name input.
Each URL reaching the site is parsed and enables the site to respond with the following data:
	* serve the homepage html file
	* serve the favicon for the site
	* serve the banner.jpg image for homepage
	* serve album art as .jpg from folder ./album-art/
	* serve html and path to ./mages/404.gif for wrong directory i.e localhost:3000/catsMeow/how/meow.mp3
	* serve html for image not found in album-art  i.e localhost:3000/album-art/ZeusSelfieFails.jpg
	* serve html with image tags as result of artist name search performed by user.
	* serve html and none.gif case search for album has no reslts, i.e artist=./';,,\
	
	NOTE: For the bonus, I decided to also cache the result of searches and make them valid for 30 days. This way, 
	when a user searches for a term already searched in the last 30 days, the program retrieves the cached album art file names for the 
	album art in question. If the search occurred more than 30 days ago, a new search is performed and file names are rewritten
	into file and expiration set to 30 days from search. In the steps below, pound sign (#) mark tasks relevant to the bonus question.
	For more detailed information, please refer to the file 'Performance Improvements' in this same directory.
	
	
	The searches are performed through the Spotify API.
	
		* Serve homepage to user and parse artist input
		# Case artist was searched for in the last 30 days
			# Retrieve the file names in cache and add them to img tags, serve html file to user
		# Otherwise continue to perform a new search
		* If there is not a credential file with token for the Spotify API
			* POST request to Spotify API a new access token, store it in credential file.
		* Else then the credential file exists
			* Cached token expiration is checked
				* Case token is valid, perform GET request for artist with cached token.
				* Case token is expired, POST request from Spotify API a new access token, store response in credential file
					* Perform GET request for artist with newly issued token.
		* Parse album object received from Spotify to get the image array path relevant to user search
			# Write image names to ./cache/ to cache file names for the search result, set expiration to 30 days
		* Perform a GET request to download all images in those paths and save them to album-art folder
		* Send user a html file with <img> sources which get processed by the server and pictures are finally piped into user page 

=-=-=-=-=-=-=-=-=-=-=-=-

Vagner

*/

const http = require('http');
const https = require('https');
const port = 3000;
const server = http.createServer();
const fs = require("fs");
const url = require("url");
const credentials = require('./auth/credentials.json');
let downloadedImages = 0; //tracker for downloaded images. 
let serverAddress; //helps for testing in mobile in local network

//handles request
server.on("request", connection_handler);

//parses the requests and responds to them as described below
function connection_handler(req, res){
	console.log(`New Request for ${req.url} from ${req.socket.remoteAddress}`);
	
    //request for the homepage: respond with homepage html file	
	if(req.url === "/")
	{
		//downloadedImages = 0;
		const main = fs.createReadStream('html/main.html');
		res.writeHead(200, {'Content-Type':'text/html'});
		main.pipe(res);
	}
	//request for the favicon for the page: respond with favicon for the page
	else if (req.url === "/favicon.ico")
	{
		const icon = fs.createReadStream("images/favicon.ico");
		res.writeHead(200, {"Content-Type":"image/x-icon"});
		icon.pipe(res);
	}
	//request for the homepage banner: respond with the homepage banner
	else if(req.url === "/images/banner.jpg" )
	{
		const banner = fs.createReadStream("images/banner.jpg");
		res.writeHead(200, {"Content-Type":"image/jpeg"});
		banner.pipe(res);
	}
	//request for resources in album-art folder: use the req.url to pipe those resources to user
	else if(req.url.startsWith("/album-art/") && !req.url.endsWith("notFound.jpg"))
	{
		//create a stream with requested url
		let image_stream = fs.createReadStream(`.${req.url}`);
		
		//event for stream error
		image_stream.on("error", function(err)
		{   
			res.writeHead(404, {"Content-Type":"text/html"});
			res.write("<h1 style='text-align: center; padding: 10px; '>Image Not Found </h1>"+
			"<img style='display: block; border: 5px solid black; margin-left: auto; " +
			"margin-right: auto;' src=images/notFound.jpg height=500 width=600 />" +
			"<a href='http://localhost:3000'><p style='text-align:center;'>HOMEPAGE</p></a>")
			res.end();
		});
		//event for image ready to stream
		image_stream.on("ready", function()
		{
			res.writeHead(200, {"Content-Type":"image/jpeg"});
			image_stream.pipe(res);
		});
	}
	
	//request for search for artist follows the steps below
	else if(req.url.startsWith("/search?artist="))
	{
		downloadedImages = 0; //downloaded images total
		//artist name is parsed
		let object = url.parse(req.url, true);
		let user_input = req.url.replace("artist","q");
		object = object.query.artist;
		let invalidRemoved = (object.trim()).replace(/[\\\/\^:\*?"<>.|]/g, "%#%");
		//look for cached search before anything. Decided to keep it for 30 days for submission, changed to 3000 so forks canuse cache to test.
		let validSearch = false;
		if(fs.existsSync("./cache/".concat(invalidRemoved.toLowerCase() + ".json")))
		{
			let cachedSearch = require("./cache/" + invalidRemoved.toLowerCase());
			//if cache is still valid (3000 days so you can test cache, see line 300-305)
			let now = new Date();
			let future = new Date(cachedSearch.expire);
			//console.log("Timing: ", Number(future) > Number(now));
			if(Number(future) > Number(now))
			{
				console.log("Serving Cached Search Results");
				generateWebpage(cachedSearch.art, res, object);
				validSearch = true;
			}
		}
		//case the cached search is expired	
		if(!validSearch)
		{
			//case there is not input from user
			if(object === '')
			{
				res.writeHead(404, {"Content-Type":"text/html"});
				res.write("<h1 style='text-align: center; padding: 10px; '>Artist Not Found </h1>"+
				"<img style='display: block; border: 5px solid black; margin-left: auto; " +
				"margin-right: auto;' src=images/notFound.jpg height=500 width=600 />" +
				"<a href='http://localhost:3000'><p style='text-align:center;'>HOMEPAGE</p></a>")
				res.end();
			}
			/*
			//initiate base 64 transformation of client credential and secret
			let post_data = {"grant_type":"client_credentials"};
			const client_id = credentials.client_id;
			const client_secret = credentials.client_secret;
			let base64data = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
			let base = `Basic ${base64data}`;
			//console.log(base);  //prints the slient credential and secret in base 64
			
			//form post request 
			let headers = {"Content-Type":"application/x-www-form-urlencoded", "Authorization": base}
			const querystring = require('querystring');
			post_data = querystring.stringify(post_data);
			let options = {"method":"POST", "headers":headers};*/
			
			//verify cached authorization token
			let cache_valid = false;
			let cached_auth;
			
			//case file with authentication exists
			if(fs.existsSync('./auth/authentication-res.json'))
			{
				cached_auth = require('./auth/authentication-res.json');
				//case expired token
				if(Date.now() > cached_auth.expiration)
					console.log("Cached Token Expired");
				//case valid token
				else
				{
					cache_valid = true;
					console.log("Cached Token Valid");
				}
			}
			//if cached token is valid, GET search for artist usign the cached token.
			if(cache_valid)
			{
				create_search_req(cached_auth.access_token, user_input, res, object );
				//console.log("Creating a new search with old token");
			}
			//POST a request for new credential token
			else
			{
				//initiate base 64 transformation of client credential and secret
				let post_data = {"grant_type":"client_credentials"};
				const client_id = credentials.client_id;
				const client_secret = credentials.client_secret;
				let base64data = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
				let base = `Basic ${base64data}`;
				//console.log(base);  //prints the slient credential and secret in base 64
				
				//form post request with headers and options
				let headers = {"Content-Type":"application/x-www-form-urlencoded", "Authorization": base}
				const querystring = require('querystring');
				post_data = querystring.stringify(post_data);
				let options = {"method":"POST", "headers":headers};
			
				//send request to endpoint
				const token_endpoint = "https://accounts.spotify.com/api/token";
				let auth_sent_time = new Date();
				console.log("Performing HTTPS POST request for new Token from Spotify API");
				let authentication_req = https.request(token_endpoint, options, function (authentication_res) {
					received_authentication(authentication_res,user_input, auth_sent_time, res, object);
					});
				authentication_req.on("error", function(err){console.error("Error while requesting a new Token from Spotify");});
				authentication_req.end(post_data);	
			}
		}
	}
	//serves a gif for invalid directory
	else if(req.url.endsWith("images/404.gif"))
	{
		const err = fs.createReadStream("images/404.gif");
		res.writeHead(200, {"Content-Type":"image/jpeg"});
		err.pipe(res);
	}
	//serves a gif for no album found for artist
	else if(req.url.endsWith("images/none.gif"))
	{
		const none = fs.createReadStream("images/none.gif");
		res.writeHead(200, {"Content-Type":"image/jpeg"});
		none.pipe(res);
	}
	//serve the image for image not found in album-art
	else if(req.url.endsWith("images/notFound.jpg"))
	{
		const notFound = fs.createReadStream("images/notFound.jpg");
		res.writeHead(200, {"Content-Type":"image/jpeg"});
		notFound.pipe(res);
	}
	//catch all: serves html and gif path to invalid directories
	else
	{
		res.writeHead(404, {"Content-Type":"text/html"});
		res.end("<h1 style='text-align: center; padding: 10px; '>Invalid Directory </h1>"+
		"<img style='display: block; border: 5px solid black; margin-left: auto; " +
		"margin-right: auto; ' height= 400 width=600 src=images/404.gif />" +
		"<a href='http://localhost:3000'><p style='text-align:center;'>HOMEPAGE</p></a>");
	}
}

//server listeners for listening and error. Initialize the listening process on port 3000
server.on("listening", listening_handler);
server.on("error", (err) => {console.log("SERVER ERROR")});
server.listen(port);

//prints the listening port
function listening_handler()
{
	console.log(`Now Listening on Port ${port}`);
}

//process the response to POST request for a new credential token
const received_authentication = function(authentication_res, user_input, auth_sent_time, res, artistName)
{
	
	authentication_res.setEncoding("utf8");
	let body = "";
	//append data from Spotify API
	authentication_res.on("data", function(chunk){body += chunk;});
	
	//when data is done,parse and process it
	authentication_res.on("end", function()
	{
		//set expiration date
		let spotify_auth = JSON.parse(body);
		let before = auth_sent_time.getTime();
		spotify_auth.expiration = (auth_sent_time.setHours(auth_sent_time.getHours()+ (spotify_auth.expires_in / 3600)));
		let after = auth_sent_time.getTime();
		//console.log("Token valid for", (after - before) / 60000, "minutes.");
		//console.log("Received:\n", spotify_auth);
		
		//cache the token
		create_acess_token_cache(spotify_auth);
		//console.log("Creting search after new Token issued");
		//perform artist search with new token
	    create_search_req(spotify_auth.access_token, user_input,res, artistName);
	});
}

//processes the new credential token by writing access token and expiration to file.
const create_acess_token_cache = function(spotify_auth)
{
	fs.writeFile('./auth/authentication-res.json', JSON.stringify(spotify_auth), function(err)
	{
		if(err)
			console.log("Error Writing Spotify API Token to Cache");
		else
			console.log("New Spotify API Token Written to Cache Successfully");
	});
};

//cache the result from a search, valid for 3000 days so can be run for test with cached terms, lower to desired range. 
const cacheSearchResults = function(artistName, imageArray)
{
	let invalidRemoved = (artistName.trim()).replace(/[\\\/\^:\*?"<>.|]/g, "%#%");
	var date = new Date();
	date.setDate(date.getDate() + 3000);
	let result = {"expire": date, "art":imageArray}
	let path = './cache/' + invalidRemoved.toLowerCase() +'.json';
	fs.writeFile(path, JSON.stringify(result), function(err)
	{
		if(err)
			console.log("Error Writing Search Results to Cache");
		else
			console.log("Search Results Written to Cache");
	});
};

//performs the search for artist name using GET
const create_search_req = function(spotify_auth, user_input,userPipe, artistName)
{
	console.log("Performing HTTPS GET request to Spotify API for artist information.")
	const options = "https://api.spotify.com/v1".concat(user_input).concat("&type=album").concat("&access_token=").concat(String(spotify_auth));
	let data = "";
	let req = https.request(options, (res) =>
	{
		//console.log("RESPONSE CODE:", res.statusCode);
		//listen for data requested
		res.on("data", (d) => {
			data += d;
		});
		         
		//process requested data to get image array path
		res.on("end", () => 
		{
			let parsedRes = JSON.parse(data);
			
			//case ERROR response display a special page.
			if(Number(res.statusCode) !== Number(200))
			{
				let msg = "<h1 style='text-align:center;'> Album Art Not Available For '" + artistName + "'</h1>" + 
				"<img style='display: block; border: 5px solid black; margin-left: auto;  vertical-align: middle; " +
				"margin-right: auto;  heigth: 40%; width: 40%;' src=images/none.gif height=400 width=400 /></h1>" +
				"<a href='http://localhost:3000'><p style='text-align:center;'>HOMEPAGE</p></a>"
				userPipe.end(msg);	
			}
			//case valid response 
			else
			{
				let len = parsedRes.albums.items.length;
				//console.log(parsedRes.albums.items)
				//case successful response but no albums, display special page
				if(len === 0)
				{
					let msg = "<h1 style='text-align:center;'> Album Art Not Available For '" + artistName + "'</h1>" + 
					"<img style='display: block; border: 5px solid black; margin-left: auto;  vertical-align: middle; " +
					"margin-right: auto;  heigth: 40%; width: 40%;' src=images/none.gif height=400 width=400 /></h1>" +
					"<a href='http://localhost:3000'><p style='text-align:center;'>HOMEPAGE</p></a>"
					userPipe.end(msg);
				}
				//otherwise, parse data reeived to extract album art paths
				let arr = parsedRes.albums.items;
				let i = 0;
				let path = "./album-art/";
				let imageArray = [];
				for(i in arr)
				{
					//parse informationa and check if image is cached
					let fileName =  parsedRes.albums.items[i].images[0].url;
					let imageName = fileName.substring(fileName.lastIndexOf("/") + 1).concat(".jpeg");
					
					//if image already exists in album-art, do not download it
					if(fs.existsSync(path.concat(imageName)))
					{
						downloadedImages++;
						imageArray.push(imageName);
						//console.log("Image in Cache:", path.concat(imageName));

						//if all images are available to generate site, generate website, cache search results
						if(downloadedImages == len)
						{
							generateWebpage(imageArray,userPipe, artistName);
							cacheSearchResults(artistName, imageArray);
						}
					}
					else //download image if it does not exist in album-art
						downloadImages(imageArray, path, fileName, i, len, userPipe, artistName);
				}
			}	
		});
	});
	
	//error listener for the request
	req.on("error", (error) =>
	{
		console.log("Error Requesting Artist Information From Spotify.");
	});
	req.end();
};

//uses GET to request an image asset from spotify and save it to album-art directory, when all images downloaded, generateWebpage and cache search result
const downloadImages = function(imageArray, destPath, imagePath, counter, len, userPipe, artistName)
{
	//request an image at path parsed
	let image_req = https.get(imagePath, function(image_res)
	{
		console.log("Performing HTTPS GET request to Spotify for ", imagePath);
		//process image and write to album-art
		let url = new URL(imagePath);
		url = url.pathname.replace("/image/","");
		imageArray.push(url.concat(".jpeg"));
		destPath = destPath.concat(url + ".jpeg")
			
		//stream the image to destination
		let new_img = fs.createWriteStream(destPath, {"encoding" :null});
		image_res.pipe(new_img);
		//console.log("Downloading to:", destPath);
		//when all images are downloaded, generate webpage
		new_img.on("finish", function()
		{	
			downloadedImages++; //activates the generateWebpage by downloaded images cont
			counter++; // not needed actually
			
			//if all images are available, generate site, cache searh resuls
			if(downloadedImages === len)
			{
				generateWebpage(imageArray,userPipe, artistName);
				cacheSearchResults(artistName, imageArray);
			}
		});
		new_img.on("error", function(err){console.log(err);});
	});
	image_req.on("error", function (err) {console.log("Error Requestin to Downloading Images")});
}

//uses the image file array (just paths) to create and html message and send it to user
let generateWebpage = (imageArray, userPipe, artistName) =>
{
	userPipe.writeHead(200, {'Content-Type':'text/html'});
	//append a html message
	let msg = "<head> <meta name='viewport' content='width=device-width, autoRotate:disabled, initial-scale=1.0 '><title>Enjoy the Art</title></head>";
	msg += "<div style=\"background:linear-gradient(to right, #339933 0%, #ffffff 100%); " + 
		"padding:10px;\"><h1 style=\"text-align:center;\"> Album Art for '" + artistName + "' </h1> </div>" +
	    "<a href='http://localhost:3000'> <p style='text-align: center'> SEARCH AGAIN </p> </a>";
	let i = 0;	
	//console.log(imageArray.length, "Album Art Found for '", artistName,"'");
	//add image sources to html messages
	for(i in imageArray)
		msg += "<img style='padding: 15px;' src=album-art/"+imageArray[i] + " height=340 width=340/>";
	//send message to user.
	userPipe.write(msg);
	userPipe.end();
}



