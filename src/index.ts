import HDRViewer from './HDRViewer';
import hdrUrl from '../hdr/100x100.hdr';

const hdrViewer = new HDRViewer();
Promise.all([
  fetch(hdrUrl).then(r => r.arrayBuffer()),
  hdrViewer.readyPromise,
]).then(([ arrayBuffer ]) => {
  hdrViewer
    .readBuffer(new Uint8Array(arrayBuffer))
    .render();
});

const input = document.createElement('input');
input.setAttribute('accept', '.hdr')
input.setAttribute('type', 'file');
input.addEventListener('input', e => {
  const hdrFile: File | null = input.files && input.files[0];
  if (!hdrFile) {
    return;
  }

  hdrViewer
    .readFile(hdrFile)
    .then(() => {
      hdrViewer.render();
    })
    .catch(e => {
      alert(e);
    });
});
document.body.appendChild(input);
