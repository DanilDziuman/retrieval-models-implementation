const TS_URL = '/theoretic-set/documents';
const VS_URL = '/vector-space/documents';
const linkToSearch = document.getElementById('linkToSearch');
let postURL;
if (window.location.href.includes(TS_URL)) {
  linkToSearch.href = '/theoretic-set/search';
  postURL = '/api/theoretic-set/documents/new';
} else {
  linkToSearch.href = '/vector-space/search';
  postURL = '/api/vector-space/documents/new';
}

const form = document.getElementById('documents');
const buttonAddTextInput = document.getElementById('addTextualInput');
const buttonAddFileInput = document.getElementById('addFileInput');
const submitInput = document.querySelector('input[type="submit"]');
const validFilesMap = new Map();



buttonAddTextInput.onclick = addTextInput;
const addFileInput = makeFileInputGenerator();
buttonAddFileInput.onclick = addFileInput;

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData();  
  for (const [id, files] of validFilesMap) {
    for (const validFile of files) {
      formData.append('file-documents[]', validFile);
    }
  }

  const textInputs = form.querySelectorAll('input[type="text"]');
  textInputs.forEach(input => {
    const document = input.value.trim();
    formData.append('text-documents[]', document);
  });

  if (formData.has('file-documents[]') || formData.has('text-documents[]')) {
    console.log('before fetch');
    const res = await fetch(postURL, {
      method: 'POST',
      body: formData
    });
    if (res.redirected) {
      window.location.href = res.url;
    }
  } else {
    alert('Please, input at least 1 valid document');
  }
});

function makeFileInputGenerator() {
  let counter = 0;
  function addFileInput() {
    counter++;
    // define containers:
    const divOverride = document.createElement('div');
    const spanFileSelect = document.createElement('span');
    const spanFileInfo = document.createElement('span');
    divOverride.className = 'file-override';
    spanFileSelect.className = 'file-select';
    spanFileInfo.className = 'file-info';
    spanFileSelect.innerHTML = 'Select a folder with valid JSON documents';
    // actual spanFileInfo.innerHTML to be defined;
    spanFileInfo.innerHTML = '<strong>0</strong> selected'

    const input = document.createElement('input');
    input.type = 'file';
    input.name = 'file-documents[]';
    input.className = 'file-document';
    input.accept = 'application/json';
    input.id = `input_file${counter}`;
    input.multiple = true;
    input.webkitdirectory = true;
    
    divOverride.addEventListener('click', function(event) {
      input.click();
    });
    
    input.addEventListener('change', async function(event) {
      // validate files
      const selectedFiles = event.target.files;
      const directoryName = selectedFiles[0].webkitRelativePath.split('/')[0];
      const validFiles = [];
      console.log(selectedFiles);
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const isValid = await validateDocumentFile(file);
        if (isValid) {
          validFiles.push(file);
        }
        console.log(file);
      }
      // update the view
      spanFileSelect.innerHTML = `<strong>${directoryName}</strong>`;
      spanFileInfo.innerHTML = `<strong>${selectedFiles.length}</strong> selected, <strong>${validFiles.length}</strong> valid`;
      // save validated files to access later in the map
      validFilesMap.set(event.target.id, validFiles);
      function validateDocumentFile(file) { // file is valid if it includes at least 1 valid document
        return new Promise((resolve, reject) => {
          let isValid = false;
          if (file.type !== 'application/json') {
            resolve(isValid);
            return;
          }
          console.log(file.type);
          const reader = new FileReader();
          reader.onload = () => {
            const fileContent = JSON.parse(reader.result);
            console.log(fileContent);
            if (typeof fileContent === 'string' && isValidDocument(fileContent)) {
              isValid = true;
              console.log('before isValid is resolved after type .json');
            }
            resolve(isValid);
          }
          reader.onerror = () => {
            resolve(isValid);
          }
          reader.readAsText(file);
        });
      }
    });

    divOverride.appendChild(input);
    divOverride.appendChild(spanFileSelect);
    divOverride.appendChild(spanFileInfo);
    form.appendChild(divOverride);
    form.appendChild(submitInput);
  }
  return addFileInput;
}

function addTextInput() {
  const input = document.createElement('input')
  input.type = 'text';
  input.name = 'text-documents[]';
  input.placeholder = 'Enter a new document...';
  input.className = 'text-document';
  input.pattern = ".*[a-zA-Z0-9]+.*"; // copies regex.test() behaviour
  input.title = 'Must include alphanumeric symbols: [a-z,A-Z,0-9]+';
  input.required = true;
  const inputContainer = document.createElement('div');
  inputContainer.className = "flex-sides";
  const removeTextButton = document.createElement('button');
  removeTextButton.type = "button";
  removeTextButton.className = "button";
  removeTextButton.innerText = "Remove";
  removeTextButton.addEventListener('click', (event) => {
    form.removeChild(inputContainer);
  });

  inputContainer.appendChild(input);
  inputContainer.appendChild(removeTextButton);
  form.appendChild(inputContainer);
  form.appendChild(submitInput);
}

function isValidDocument(document) {
  const regexContainsAlphanumeric = /[a-zA-Z0-9]+/;
  return regexContainsAlphanumeric.test(document);
}