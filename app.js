'use strict';

window.onload = function () {
    var audioContext = new AudioContext();
    var analyser = null;
    var bufLen = 4096;
    var buffer = new Float32Array(bufLen);

    var noteEl = document.querySelector('#note');
    var lastNoteEl = document.querySelector('#last-note');
    var playedNoteEl = document.querySelector('#played-note');
    var responseTimeEl = document.querySelector('#response-time');
    var correctScoreEl = document.querySelector('#correct-score');
    var wrongScoreEl = document.querySelector('#wrong-score');

    var noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

    var noteCheckInterval = 50;
    var nextNoteString = generateNote();
    var startTime = Date.now();
    var newNoteTimeout = null;
    var correctScore = 0;
    var wrongScore = 0;

    navigator
        .mediaDevices.getUserMedia({audio: true})
        .then(mediaStreamResolved)
        .catch(function (err) {
            console.error(err);
        });

    function checkNote() {
        var currentNote = getNote();
        var currentNoteString = noteStrings[currentNote % noteStrings.length];
        if (!newNoteTimeout) {
            updateResponseTime();
        }
        if (currentNote && !newNoteTimeout) {
            noteEl.classList.add('pulse');
            if (currentNoteString === nextNoteString) {
                noteEl.classList.add('green');
                correctScore++;
            } else {
                noteEl.classList.add('red');
                wrongScore++;
            }
            updateScore();
            updateNoteInfo(nextNoteString, currentNoteString);
            newNoteTimeout = setTimeout(newNote, 1000);
        }
    }

    function updateNoteInfo(lastNote, playedNote) {
        lastNoteEl.innerHTML = lastNote;
        playedNoteEl.innerHTML = playedNote;
    }

    function updateScore() {
        correctScoreEl.innerHTML = correctScore;
        wrongScoreEl.innerHTML = wrongScore;
    }

    function updateResponseTime() {
        responseTimeEl.innerHTML = deltaSeconds(startTime).toFixed(1) + 's';
    }

    function deltaSeconds(starTime) {
        return (Date.now() - starTime) / 1000;
    }

    function newNote() {
        removePulseClasses();
        nextNoteString = generateNote();
        startTime = Date.now();
        newNoteTimeout = null;
    }

    function removePulseClasses() {
        noteEl.classList.remove('pulse');
        noteEl.classList.remove('red');
        noteEl.classList.remove('green');
    }

    // TODO: wtf
    // function removePulseClasses() {
    //     ['pulse-green', 'pulse-red'].forEach((class) => noteEl.classList.remove(class));
    //     // ['pulse-green', 'pulse-red'].forEach(function(class) {
    //     //     noteEl.classList.remove(class);
    //     // });
    // }

    function mediaStreamResolved(mediaStream) {
        var mediaStreamSource = audioContext.createMediaStreamSource(mediaStream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 4096;
        mediaStreamSource.connect(analyser);

        setInterval(checkNote, noteCheckInterval);
    }

    function getNote() {
        if (!analyser) {
            return null;
        }
        analyser.getFloatTimeDomainData(buffer);
        var autoCorrelation = autoCorrelate(buffer, audioContext.sampleRate);
        return noteFromPitch(autoCorrelation);
    }

    function generateNote() {
        var note = noteStrings[random(noteStrings.length - 1)];
        noteEl.innerHTML = note;
        return note;
    }

    function noteFromPitch( frequency ) {
        var noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
        return Math.round( noteNum ) + 69;
    }

    function autoCorrelate( buf, sampleRate ) {
        // Implements the zigzag algorithm by Antonis Dalatsis, University of the Aegean
        var SIZE = buf.length;
        var rms = 0;

        for (var i=0;i<SIZE;i++) {
            var val = buf[i];
            rms += val*val;
        }
        rms = Math.sqrt(rms/SIZE);
        if (rms<0.01) // not enough signal
            return -1;

        var r1=0, r2=SIZE-1, thres=0.2;
        for (i=0; i<SIZE/2; i++)
            if (Math.abs(buf[i])<thres) { r1=i; break; }
        for (i=1; i<SIZE/2; i++)
            if (Math.abs(buf[SIZE-i])<thres) { r2=SIZE-i; break; }

        buf = buf.slice(r1,r2);
        SIZE = buf.length;

        var c = new Array(SIZE).fill(0);
        for (i=0; i<SIZE; i++)
            for (var j=0; j<SIZE-i; j++)
                c[i] = c[i] + buf[j]*buf[j+i];

        var d=0; while (c[d]>c[d+1]) d++;
        var maxval=-1, maxpos=-1;
        for (i=d; i<SIZE; i++) {
            if (c[i] > maxval) {
                maxval = c[i];
                maxpos = i;
            }
        }
        var T0 = maxpos;

        var x1=c[T0-1], x2=c[T0], x3=c[T0+1];
        var a = (x1 + x3 - 2*x2)/2;
        var b = (x3 - x1)/2;
        if (a) T0 = T0 - b/(2*a);

        return sampleRate/T0;
    }

    function random(max) {
        return Math.floor(Math.random() * (max + 1));
    }
};