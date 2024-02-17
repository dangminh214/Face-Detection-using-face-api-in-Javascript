const video = document.getElementById('videoElm');
let faceMatcher;

const uploadMsg = document.getElementById('uploadMessage');
uploadMsg.addEventListener('submit', function(event) {
    uploadMsg.style.display = 'block';
    event.preventDefault();
});

async function setupFaceAPI() {
    await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
    await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('./models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('./models');
    await faceapi.nets.faceExpressionNet.loadFromUri('./models');
}

const loadFaceAPI = async() => {
    await setupFaceAPI();
    const trainingData = await loadTrainingData();
    faceMatcher = new faceapi.FaceMatcher(trainingData, 0.6);
    getCameraStream();
}

function getCameraStream () {
    if (navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({video: {
            width: { ideal: 1600 },
            height: { ideal: 900 }
        }})
        .then(stream => {
            video.srcObject = stream;
            video.style.transform = 'scaleX(-1)';
        })
        .catch(error => {
            console.log('Error access camera', error);
        })
    }
}

async function loadTrainingData() {
    const labels = ['Dang Minh', 'Hien Anh','BoCau','Rina Ishihara','Takizawa Laura', 'Yua Mikami'];
    const faceDescriptors = [];
    for (const label of labels) {
        const descriptors = [];
        for (let i = 1; i<= 4; i++) {
            const image = await faceapi.fetchImage(`/data/${label}/${i}.jpeg`);
            const detection = await faceapi.detectSingleFace(image).withFaceLandmarks().withFaceDescriptor();
            
            if (detection) {
                descriptors.push(detection.descriptor);
            }
            else {
                console.log(`No face detected in ${label}/${i}.jpeg`);
            }
        }

        faceDescriptors.push(new faceapi.LabeledFaceDescriptors(label, descriptors))
    }
    return faceDescriptors;
}

function uploadImages() {
    const fileInput = document.querySelector('input[type="file"]');
    const nameInput = document.getElementById('name');
    const name = nameInput.value;
    const formData = new FormData();
    let i=1;
    for (const file of fileInput.files) {
        const renamedFile = new File([file], `${i}.jpeg`, { type: file.type });
        formData.append('images', renamedFile);
        i++;        
        console.log('new file to add to data: ', renamedFile, 'and name: ', name);
            
    }
}

/* document.getElementById('uploadForm').addEventListener('submit', function(event) {
    const fileInput = document.querySelector('input[type="file"]');
    const fileNames = Array.from(fileInput.files).map(file => file.name);
    console.log(fileNames);
    const fileList = document.createElement('ul');
    fileNames.forEach(fileName => {
        const listItem = document.createElement('li');
        listItem.textContent = fileName;
        fileList.appendChild(listItem);
    });

    // Display the list of file names
    const uploadMessage = document.getElementById('uploadMessage');
    //uploadMessage.style.display = 'block';
    uploadMessage.innerHTML = 'Upload Success. Selected images:';
    uploadMessage.appendChild(fileList);
}); */



video.addEventListener('playing', async () => {
    const videoCanvas = faceapi.createCanvasFromMedia(video);
    document.body.append(videoCanvas);

    const textCanvas = faceapi.createCanvasFromMedia(video);
    document.body.append(textCanvas);

    const displaySize = {
        width: video.videoWidth,
        height: video.videoHeight
    };

    videoCanvas.style.transform = video.style.transform;

    setInterval(async () => {
        const detects = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptors()
            .withFaceExpressions();
        
        const resizedDetects = faceapi.resizeResults(detects, displaySize);
        videoCanvas.getContext('2d').clearRect(0, 0, displaySize.width, displaySize.height);
        textCanvas.getContext('2d').clearRect(0, 0, displaySize.width, displaySize.height);
        
        for (const detection of resizedDetects) {
            const box = detection.detection.box;
            const label = faceMatcher.findBestMatch(detection.descriptor).label;

            // Draw the face detection box on the video canvas
            const drawOptions = {
            };
            const drawBox = new faceapi.draw.DrawBox(box, drawOptions);
            drawBox.draw(videoCanvas);

            const nameLabel = new faceapi.draw.DrawTextField([label], { x: -(box.right)+1425, y: box.bottom }, drawOptions);
            nameLabel.draw(textCanvas);
        }
    }, 100);
});

loadFaceAPI();

