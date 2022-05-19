import h from './helpers.js';

window.addEventListener('load', () => {
    const room = h.getQString(location.href, 'room');
    const username = sessionStorage.getItem('username');

    if (!room) {
        document.querySelector('#room-create').attributes.removeNamedItem('hidden');
    } else if (!username) {
        document.querySelector('#username-set').attributes.removeNamedItem('hidden');
    } else {
        let commElem = document.getElementsByClassName('room-comm');

        for (let i = 0; i < commElem.length; i++) {
            commElem[i].attributes.removeNamedItem('hidden');
        }

        var pc = [];

        let socket = io('/stream');

        var socketId = '';
        var randomNumber = `__${h.generateRandomString()}__${h.generateRandomString()}__`;
        var myStream = '';
        var screen = '';
        var recordedStream = [];
        var mediaRecorder = '';

        //Lấy video người dừng mặc định
        getAndSetUserStream();


        socket.on('connect', () => {
            //set socketId
            socketId = socket.io.engine.id;
            document.getElementById('randomNumber').innerText = randomNumber;


            socket.emit('subscribe', {
                room: room,
                socketId: socketId
            });


            socket.on('new user', (data) => {
                socket.emit('newUserStart', { to: data.socketId, sender: socketId });
                pc.push(data.socketId);
                init(true, data.socketId);
            });


            socket.on('newUserStart', (data) => {
                pc.push(data.sender);
                init(false, data.sender);
            });


            socket.on('ice candidates', async(data) => {
                data.candidate ? await pc[data.sender].addIceCandidate(new RTCIceCandidate(data.candidate)) : '';
            });


            socket.on('sdp', async(data) => {
                if (data.description.type === 'offer') {
                    data.description ? await pc[data.sender].setRemoteDescription(new RTCSessionDescription(data.description)) : '';

                    h.getUserFullMedia().then(async(stream) => {
                        if (!document.getElementById('local').srcObject) {
                            h.setLocalStream(stream);
                        }

                        //lưu stream
                        myStream = stream;

                        stream.getTracks().forEach((track) => {
                            pc[data.sender].addTrack(track, stream);
                        });

                        let answer = await pc[data.sender].createAnswer();

                        await pc[data.sender].setLocalDescription(answer);

                        socket.emit('sdp', { description: pc[data.sender].localDescription, to: data.sender, sender: socketId });
                    }).catch((e) => {
                        console.error(e);
                    });
                } else if (data.description.type === 'answer') {
                    await pc[data.sender].setRemoteDescription(new RTCSessionDescription(data.description));
                }
            });


            socket.on('chat', (data) => {
                h.addChat(data, 'remote');
            });
        });


        function getAndSetUserStream() {
            h.getUserFullMedia().then((stream) => {
                //lưu stream 
                myStream = stream;

                h.setLocalStream(stream);
            }).catch((e) => {
                console.error(`stream error: ${ e }`);
            });
        }

        function init(createOffer, partnerName) {
            pc[partnerName] = new RTCPeerConnection(h.getIceServer());

            if (screen && screen.getTracks().length) {
                screen.getTracks().forEach((track) => {
                    pc[partnerName].addTrack(track, screen); //Kích hoạt sự kiện cần thỏa thuận
                });
            } else if (myStream) {
                myStream.getTracks().forEach((track) => {
                    pc[partnerName].addTrack(track, myStream); //Kích hoạt sự kiện cần thỏa thuận
                });
            } else {
                h.getUserFullMedia().then((stream) => {
                    //lưu stream
                    myStream = stream;

                    stream.getTracks().forEach((track) => {
                        pc[partnerName].addTrack(track, stream); //Kích hoạt sự kiện cần thỏa thuận
                    });

                    h.setLocalStream(stream);
                }).catch((e) => {
                    console.error(`stream error: ${ e }`);
                });
            }



            //create offer
            if (createOffer) {
                pc[partnerName].onnegotiationneeded = async() => {
                    let offer = await pc[partnerName].createOffer();

                    await pc[partnerName].setLocalDescription(offer);

                    socket.emit('sdp', { description: pc[partnerName].localDescription, to: partnerName, sender: socketId });
                };
            }



            //Gửi ICE candidate cho partnerNames
            pc[partnerName].onicecandidate = ({ candidate }) => {
                socket.emit('ice candidates', { candidate: candidate, to: partnerName, sender: socketId });
            };



            //add
            pc[partnerName].ontrack = (e) => {
                let str = e.streams[0];
                if (document.getElementById(`${ partnerName }-video`)) {
                    document.getElementById(`${ partnerName }-video`).srcObject = str;
                } else {
                    //Thuộc tính video
                    let newVid = document.createElement('video');
                    newVid.id = `${ partnerName }-video`;
                    newVid.srcObject = str;
                    newVid.autoplay = true;
                    newVid.className = 'remote-video';

                    //video controls elements
                    let controlDiv = document.createElement('div');
                    controlDiv.className = 'remote-video-controls';
                    controlDiv.innerHTML = `<i class="fa fa-microphone text-white pr-3 mute-remote-mic" title="Mute"></i>
                        <i class="fa fa-expand text-white expand-remote-video" title="Expand"></i>`;

                    //create a new div for card
                    let cardDiv = document.createElement('div');
                    cardDiv.className = 'card card-sm';
                    cardDiv.id = partnerName;
                    cardDiv.appendChild(newVid);
                    cardDiv.appendChild(controlDiv);

                    //put div in main-section elem
                    document.getElementById('videos').appendChild(cardDiv);

                    h.adjustVideoElemSize();
                }
            };



            pc[partnerName].onconnectionstatechange = (d) => {
                switch (pc[partnerName].iceConnectionState) {
                    case 'disconnected':
                    case 'failed':
                        h.closeVideo(partnerName);
                        break;

                    case 'closed':
                        h.closeVideo(partnerName);
                        break;
                }
            };



            pc[partnerName].onsignalingstatechange = (d) => {
                switch (pc[partnerName].signalingState) {
                    case 'closed':
                        console.log("Signalling state is 'closed'");
                        h.closeVideo(partnerName);
                        break;
                }
            };
        }



        function shareScreen() {
            h.shareScreen().then((stream) => {
                h.toggleShareIcons(true);

                //Tắt btn Video khi đang share màn hình đảm bảo không ảnh hưởng đến chia sẻ màn hình
                // btn Video sẽ được mở lại sau khi share màn hình xong
                h.toggleVideoBtnDisabled(true);

                //lưu màn hình stream
                screen = stream;

                //share màn hình với mọi người
                broadcastNewTracks(stream, 'video', false);

                //Click btn "Share sceen" dừng chia sẻ màn hình 
                screen.getVideoTracks()[0].addEventListener('ended', () => {
                    stopSharingScreen();
                });
            }).catch((e) => {
                console.error(e);
            });
        }



        function stopSharingScreen() {
            //bật btn icon Video
            h.toggleVideoBtnDisabled(false);

            return new Promise((res, rej) => {
                screen.getTracks().length ? screen.getTracks().forEach(track => track.stop()) : '';

                res();
            }).then(() => {
                h.toggleShareIcons(false);
                broadcastNewTracks(myStream, 'video');
            }).catch((e) => {
                console.error(e);
            });
        }



        function broadcastNewTracks(stream, type, mirrorMode = true) {
            h.setLocalStream(stream, mirrorMode);

            let track = type == 'audio' ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0];

            for (let p in pc) {
                let pName = pc[p];

                if (typeof pc[pName] == 'object') {
                    h.replaceTrack(track, pc[pName]);
                }
            }
        }


        function toggleRecordingIcons(isRecording) {
            let e = document.getElementById('record');

            if (isRecording) {
                e.setAttribute('title', 'Stop recording');
                e.children[0].classList.add('text-danger');
                e.children[0].classList.remove('text-white');
            } else {
                e.setAttribute('title', 'Record');
                e.children[0].classList.add('text-white');
                e.children[0].classList.remove('text-danger');
            }
        }


        function startRecording(stream) {
            mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9'
            });

            mediaRecorder.start(1000);
            toggleRecordingIcons(true);

            mediaRecorder.ondataavailable = function(e) {
                recordedStream.push(e.data);
            };

            mediaRecorder.onstop = function() {
                toggleRecordingIcons(false);

                h.saveRecordedStream(recordedStream, username);

                setTimeout(() => {
                    recordedStream = [];
                }, 3000);
            };

            mediaRecorder.onerror = function(e) {
                console.error(e);
            };
        }


        //Click vào icon Video
        document.getElementById('toggle-video').addEventListener('click', (e) => {
            e.preventDefault();

            let elem = document.getElementById('toggle-video');

            if (myStream.getVideoTracks()[0].enabled) {
                e.target.classList.remove('fa-video');
                e.target.classList.add('fa-video-slash');
                elem.setAttribute('title', 'Show Video');

                myStream.getVideoTracks()[0].enabled = false;
            } else {
                e.target.classList.remove('fa-video-slash');
                e.target.classList.add('fa-video');
                elem.setAttribute('title', 'Hide Video');

                myStream.getVideoTracks()[0].enabled = true;
            }

            broadcastNewTracks(myStream, 'video');
        });


        //Click vào icon mute mic
        document.getElementById('toggle-mute').addEventListener('click', (e) => {
            e.preventDefault();

            let elem = document.getElementById('toggle-mute');

            if (myStream.getAudioTracks()[0].enabled) {
                e.target.classList.remove('fa-microphone-alt');
                e.target.classList.add('fa-microphone-alt-slash');
                elem.setAttribute('title', 'Unmute');

                myStream.getAudioTracks()[0].enabled = false;
            } else {
                e.target.classList.remove('fa-microphone-alt-slash');
                e.target.classList.add('fa-microphone-alt');
                elem.setAttribute('title', 'Mute');

                myStream.getAudioTracks()[0].enabled = true;
            }

            broadcastNewTracks(myStream, 'audio');
        });


        //Khi click icon 'Share screen'
        document.getElementById('share-screen').addEventListener('click', (e) => {
            e.preventDefault();

            if (screen && screen.getVideoTracks().length && screen.getVideoTracks()[0].readyState != 'ended') {
                stopSharingScreen();
            } else {
                shareScreen();
            }
        });


        //Khi click vào icon "record"
        document.getElementById('record').addEventListener('click', (e) => {
            // Show tùy chọn user muốn record
            // Nhận luồng của tùy chọn đó và bắt đầu record
            
            if (!mediaRecorder || mediaRecorder.state == 'inactive') {
                h.toggleModal('recording-options-modal', true);
            } else if (mediaRecorder.state == 'paused') {
                mediaRecorder.resume();
            } else if (mediaRecorder.state == 'recording') {
                mediaRecorder.stop();
            }
        });


        //Khi user chọn record screen
        document.getElementById('record-screen').addEventListener('click', () => {
            h.toggleModal('recording-options-modal', false);

            if (screen && screen.getVideoTracks().length) {
                startRecording(screen);
            } else {
                h.shareScreen().then((screenStream) => {
                    startRecording(screenStream);
                }).catch(() => {});
            }
        });


        //Khi user chọn record video của họ
        document.getElementById('record-video').addEventListener('click', () => {
            h.toggleModal('recording-options-modal', false);

            if (myStream && myStream.getTracks().length) {
                startRecording(myStream);
            } else {
                h.getUserFullMedia().then((videoStream) => {
                    startRecording(videoStream);
                }).catch(() => {});
            }
        });
    }
});