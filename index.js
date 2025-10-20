/*
Hey :D looks like ur looking at our code! 
If you'd like to join our cool (awesome) software organization, 
contact us via email: 
frost@frostco.org

Or you can contact me via:
Email: sky@frostco.org
Discord: pacifiky
Instagram: pacifiky
*/
//In future, we can make a music visualizer through forwarding the stream to clients and extracting audio data
const http = require("http");
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const path = require("path");
const fs = require('fs');
//const socket = require('ws');

console.log('Welcome to Ember.\nA software by Frostbyte.\nThe code is licensed under AGPLv3.\n\nYou are running version 1.0');
const tagError = '\x1B[4;1;41m[!]\x1B[0m ';
const tagPuppet = '\x1B[3;1;45m[PUPPET]\x1B[0m ';
const tagHttp = '\x1B[3;1;44m[HTTP]\x1B[0m ';
/*
const wss = new socket.Server({noServer:true});
wss.on('connection',(ws,req)=>{
	console.log(tagSocket+'Client connection from '+req.ip);
});
*/
let videoData = null;
let feedClients = new Set();
//let closing = false;

(async () => {
	let browser = await puppeteer.launch({headless:false});
	console.log(tagPuppet+'Browser launched.');
	let pg = (await browser.pages())[0];
	await pg.goto('https://www.youtube.com/');
	console.log(tagPuppet+'Page opened, binding events...');
	await pg.exposeFunction('puppetChange', async()=>{
        try {
			const txt = await pg.$eval('#microformat script', e => e.textContent);
			videoData = JSON.parse(txt);
			console.log(tagPuppet+'Opened video: '+videoData.name+' by '+videoData.author);
			for(const client of feedClients){
				client.write('data:'+JSON.stringify([0,0,[videoData.name,videoData.author,'',videoData.thumbnailUrl[0],videoData.uploadDate,parseInt(videoData.duration.substr(2))]])+'\n\n');
			}
		} catch (e) {
			console.log(tagPuppet+'Invalid JSON');
			return;
		}
    });
	await pg.exposeFunction('puppetPlay', async(time,type)=>{
		console.log(tagPuppet+'Video '+(type ? 'Paused' : 'Playing')+' at '+time.toString());
		for(const client of feedClients){
			client.write('data:'+JSON.stringify([0,1,[Math.floor(time),type]])+'\n\n');
		}
    });
	await pg.waitForSelector('#microformat');
	await pg.waitForSelector('.video-stream');
	await pg.evaluate(()=>{
		const stream = document.getElementsByClassName('video-stream')[0];
		stream.addEventListener('play',()=>{puppetPlay(stream.currentTime,0)});
		stream.addEventListener('pause',()=>{puppetPlay(stream.currentTime,1)});
		const FormatObserver = new MutationObserver(puppetChange);
		FormatObserver.observe(document.getElementById('microformat'),{subtree:true,childList:true});
	});
	/*
	pg.on('framenavigated', async ()=>{
		console.log(tagPuppet+'Navigation');
		if(pg.url().split('/')[3].startsWith('watch')){
			const title = await pg.title();
			if(title != previousTitle){
				previousTitle = title;
				try {
					const txt = await pg.evaluate(e=>e.textContent,await pg.waitForSelector('#microformat script', {timeout: 5000})); //await pg.$eval('#microformat script', e => e.textContent)
					videoData = JSON.parse(txt);
					/*
					wss.clients.forEach(function each(client) {
						if (client.readyState === WebSocket.OPEN) {
						client.send(data, { binary: isBinary });
						}
					});
					//
					console.log(tagPuppet+'Video data updated');
					for(const client of feedClients){
						client.write('data:'+JSON.stringify([0,0,[videoData.name,videoData.author,'',videoData.thumbnailUrl[0],videoData.uploadDate,parseInt(videoData.duration.substr(2))]])+'\n\n');
					}
				} catch (e) {
					console.log('Invalid JSON');
					return;
				}
			}
		}
	});
	*/
	console.log(tagPuppet+'Event bind success!');
	const server = http.createServer(async (req, res) => {
		if(req.method=='GET'){
			switch(req.url){
				case '/feed':
					//if(closing){res.writeHead(204).end();return;}
					res.setHeader('Content-Type','text/event-stream');
					res.setHeader('Cache-Control','no-cache');
					res.setHeader('Connection','keep-alive');
					res.setHeader('Access-Control-Allow-Origin','*');
					videoData && res.write('data:'+JSON.stringify([0,0,[videoData.name,videoData.author,'',videoData.thumbnailUrl[0],videoData.uploadDate,parseInt(videoData.duration.substr(2))]])+'\n\n'); //videoData?.name ?? 'Waiting for video data...'
					pg.evaluate(()=>{
						const stream = document.getElementsByClassName('video-stream')[0];
						return [stream.currentTime,+stream.paused];
					}).then((t)=>{res.write('data:'+JSON.stringify([0,1,[Math.floor(t[0]),t[1]]])+'\n\n');});
					console.log(tagHttp+'Feed client connected: '+req.socket.remoteAddress);
					feedClients.add(res);
					req.on('close',()=>{
						console.log(tagHttp+'Feed client disconnected: '+req.socket.remoteAddress);
						feedClients.delete(res);
					});
					break;
				default:
					fs.readFile(path.join(__dirname,'/widget',(req.url === '/' ? 'index.html' : req.url)), (e,d) => {
						if(e){
							console.error(tagError+tagHttp+'Fetch file failed on '+req.url);
							res.writeHead(404).end('404 NOT FOUND');
						}else{
							res.writeHead(200).end(d.toString());
						}
					});
					break;
			}
		}else{
			res.writeHead(405).end('405 METHOD NOT ALLOWED');
		}
	});
	/*
	server.on('upgrade',(req,soc,head)=>{
		wss.handleUpgrade(req,soc,head,(ws)=>{
			wss.emit('connection',ws,req);
		});
	});
	*/
	server.listen(7000,()=>{console.log(tagHttp+'Ember successfully launched at http://127.0.0.1:7000/');});
	browser.on('disconnected', () => {
		console.log(tagPuppet+'Browser closed.');
		//closing = true;
		for(const client of feedClients){
			client.end();
		}
		server.close(()=>{
			console.log(tagHttp+'Server closed.\nThanks for using Ember!')
		});
	});
})();

