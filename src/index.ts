import HDRViewer from './HDRViewer';

const input = document.createElement('input');
input.setAttribute('accept', '.hdr')
input.setAttribute('type', 'file');
document.body.appendChild(input);

const hdrViewer = new HDRViewer();

input.addEventListener('input', e => {
  const hdrFile: File | null = input.files && input.files[0];
  if (!hdrFile) {
    return;
  }

  readFileAsArrayBuffer(hdrFile).then((arrayBuffer: ArrayBuffer) => {
    hdrViewer
      .readHdr(new Uint8Array(arrayBuffer))
      .render();
  }).catch(e => {
    alert(e);
  });
});

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  let resolve, reject;
  const promise: Promise<ArrayBuffer> = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  const reader = new FileReader();
  reader.readAsArrayBuffer(new Blob([ file ]));
  reader.onload = function() {
    if (reader.readyState === FileReader.DONE) {
      const arrayBuffer = reader.result as ArrayBuffer;
      resolve(arrayBuffer);
    }
  };
  reader.onerror = e => {
    reject(e);
  }
  return promise;
}
