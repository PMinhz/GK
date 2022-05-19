import helpers from './helpers.js';

window.addEventListener('load', () => {


    //Double click để di chuyển màn hình video của bản thân ( picture-in-picture )
    document.getElementById('local').addEventListener('click', () => {
        if (!document.pictureInPictureElement) {
            document.getElementById('local').requestPictureInPicture()
                .catch(error => {
                    // Video failed to enter Picture-in-Picture mode.
                    console.error(error);
                });
        } else {
            document.exitPictureInPicture()
                .catch(error => {
                    // Video failed to leave Picture-in-Picture mode.
                    console.error(error);
                });
        }
    });


    //Khi click vào 'Tạo"
    document.getElementById('create-room').addEventListener('click', (e) => {
        e.preventDefault();

        let roomName = document.querySelector('#room-name').value;
        let yourName = document.querySelector('#your-name').value;

        if (roomName && yourName) {
            //xóa error message nếu có
            document.querySelector('#err-msg').innerText = "";

            //Lưu user's name sessionStorage
            sessionStorage.setItem('username', yourName);

            //Tạo link truy cập room
            let roomLink = `${ location.origin }?room=${ roomName.trim().replace( ' ', '_' ) }_${ helpers.generateRandomString() }`;

            //Show link truy cập
            document.querySelector('#room-created').innerHTML = `Tạo phòng thành công nhấn <a id="linknay" href='${ roomLink }'>link này</a> để tham gia. 
                Copy link trên cho những người muốn tham gia.`;

            //Làm trống dữ liệu sau khi xuất hiện link truy cập
            document.querySelector('#room-name').value = '';
            document.querySelector('#your-name').value = '';
        } else {
            document.querySelector('#err-msg').innerText = "Vui lòng nhập đủ thông tin";
        }
    });


    //Khi click 'Tham gia cuộc họp'
    document.getElementById('enter-room').addEventListener('click', (e) => {
        e.preventDefault();

        let name = document.querySelector('#username').value;

        if (name) {
            //xóa error message nếu có
            document.querySelector('#err-msg-username').innerText = "";

            //Lưu user's name in sessionStorage
            sessionStorage.setItem('username', name);

            //tải room
            location.reload();
        } else {
            document.querySelector('#err-msg-username').innerText = "Vui lòng nhập tên";
        }
    });

    //tùy chọn on/off mở rộng màn hình video user và on/off mic
    document.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('expand-remote-video')) {
            helpers.maximiseStream(e);
        } else if (e.target && e.target.classList.contains('mute-remote-mic')) {
            helpers.singleStreamToggleMute(e);
        }
    });


    document.getElementById('closeModal').addEventListener('click', () => {
        helpers.toggleModal('recording-options-modal', false);
    });
});