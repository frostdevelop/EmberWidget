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
class EmberSystem{
    constructor(element){
        this.element = element;
        this.song = [];
        this.time = 0;
        this.titleElement = element.getElementsByClassName('ember-title')[0];
        this.artistElement = element.getElementsByClassName('ember-artist')[0];
        this.albumElement = element.getElementsByClassName('ember-album')[0];
        this.coverArtElement = element.getElementsByClassName('ember-coverart-image')[0];
        this.progressTimeElement = element.getElementsByClassName('ember-progress-time')[0];
        this.progressDurationElement = element.getElementsByClassName('ember-progress-duration')[0];
        this.progressBarElement = element.getElementsByClassName('ember-progress')[0];
        this.dateElement = element.getElementsByClassName('ember-date')[0];
        this.systemMessageElement = element.getElementsByClassName('ember-system-message')[0];
        this.systemHeaderElement = this.systemMessageElement.getElementsByClassName('ember-system-header')[0];
        this.systemBodyElement = this.systemMessageElement.getElementsByClassName('ember-system-body')[0];
    }
    showSystemMessage(header, body) {
        this.systemHeaderElement.textContent = header ?? '';
        this.systemBodyElement.textContent = body ?? '';
        this.systemMessageElement.classList.add('visible');
    }
    hideSystemMessage() {
        this.systemMessageElement.classList.remove('visible');
    }
    updateSong(song){
        this.song = song;
        /*
        song[0] = title
        song[1] = artist
        song[2] = album
        song[3] = cover
        song[4] = release date
        song[5] = duration
        */
        if(this.coverArtElement.src !== song[3]){
            this.coverArtElement.src = song[3];
        }
        if(this.titleElement.textContent !== song[0]){
            this.titleElement.textContent = song[0];
        }
        if(this.artistElement.textContent !== song[1]){
            this.artistElement.textContent = song[1];
        }
        if(this.albumElement.textContent !== song[2]){
            this.albumElement.textContent = song[2];
        }
        if(this.dateElement.textContent !== song[4]){
            this.dateElement.textContent = song[4].split('T')[0];
        }
        const minutes = Math.floor(song[5] / 60);
        const seconds = Math.floor(song[5] % 60);
        this.progressDurationElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        this.progressBarElement.max = song[5];
    }
    updateProgress(progress) {
        this.time = progress % this.song[5];

        const minutes = Math.floor(progress / 60);
        const seconds = Math.floor(progress % 60);
        this.progressTimeElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        this.progressBarElement.value = progress;
    }
}

const emberSystems = [];
for(const emberContainer of document.getElementsByClassName('ember-container')){
    emberSystems.push(new EmberSystem(emberContainer));
}

const feed = new EventSource(location.protocol + '//' + location.host + '/feed');
let messageTimeout = null;
//let progressInterval = null;
let prevTime = null;
let isPaused = false;
function animateProgress(){
    const delta = (Date.now()-prevTime)/1000;
    prevTime = Date.now();
    for (const ember of emberSystems) {
        ember.updateProgress(ember.time+delta);
    }
    (!isPaused) && window.requestAnimationFrame(animateProgress);
}

feed.onopen = () => {
    for (const ember of emberSystems) {
        ember.showSystemMessage('Connected', 'Connected to the Ember server!');
    }

    messageTimeout = setTimeout(() => {
        for (const ember of emberSystems) {
            ember.hideSystemMessage && ember.hideSystemMessage();
        }
    }, 5000);
};

feed.onmessage = e=>{
    try {
        const payload = JSON.parse(e.data);
        if (!Array.isArray(payload) || payload.length < 3) {console.error('[SSE] Invalid event data:',payload);return};

        const [ver, type, data] = payload;
        switch(type) {
            case 0:
                for (const ember of emberSystems) {
                    ember.updateSong(data);
                }
                break;
            case 1:
                initialTime = data[0];
                for (const ember of emberSystems) {
                    ember.updateProgress(initialTime);
                }
                //progressInterval && clearInterval(progressInterval);
                isPaused = data[1]; //i'm such a lil cheat :3
                switch(data[1]){
                    case 0:
                        prevTime = Date.now();
                        animateProgress();
                        /*
                        progressInterval = setInterval(()=>{
                            for (const ember of emberSystems) {
                                ember.updateProgress(ember.time+1);
                            }
                        },1000);
                        */
                        break;
                }
                break;
        }
    } catch (err) {
        console.error('[SSE] Error on feed:',err);
    }
};

feed.onerror = e=>{
    for (const ember of emberSystems) {
        ember.showSystemMessage('Disconnected', 'Could not connect to the Ember server. Waiting for reconnection...');
        messageTimeout && clearTimeout(messageTimeout);
    }
};
