const form = document.getElementById('terms');
const buttonAddTextInput = document.getElementById('addTextualInput');
const buttonAddFileInput = document.getElementById('addFileInput');
const submitInput = document.querySelector('input[type="submit"]');
let validFileTermsMap = new Map();

buttonAddTextInput.onclick = addTextInput;
const addFileInput = makeFileInputGenerator();
buttonAddFileInput.onclick = addFileInput;

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData();

  const textInputs = document.querySelectorAll('input[type="text"]');
  textInputs.forEach((input) => {
    const term = input.value.trim().toLowerCase();
    formData.append('text-terms[]', term);
  });

  for (const [id, terms] of validFileTermsMap) {
    const inputElement = document.getElementById(id);
    const inputFile = inputElement.files[0];
    if (terms.length > 0) {
      const updatedBlob = new Blob([JSON.stringify(terms)], { type: inputFile.type });
      formData.append('file-terms[]', updatedBlob, inputFile.name);
    }
  }

  if (formData.has('file-terms[]') || formData.has('text-terms[]')) {
    console.log('before fetch');
    const res = await fetch('/api/theoretic-set/terms/new', {
      method: 'POST',
      body: formData
    });
    if (res.redirected) {
      window.location.href = res.url;
    }
  } else {
    alert('Please, input at least 1 valid term');
  }
});

function makeFileInputGenerator() {
  let counter = 0;
  function addFileInput() {
    counter++;
    // define custom containers:
    const divOverride = document.createElement('div');
    const spanFileSelect = document.createElement('span');
    const spanFileInfo = document.createElement('span');
    divOverride.className = 'file-override';
    spanFileSelect.className = 'file-select';
    spanFileInfo.className = 'file-info';
    spanFileSelect.innerHTML = 'Select a file with valid JSON with terms';
    // spanFileInfo to be defined (selected + valid terms number)
    spanFileInfo.innerHTML = '<strong>0</strong> selected';

    const input = document.createElement('input');
    input.type = 'file';
    input.name = 'file-terms[]';
    input.className = 'file-term';
    input.accept = '.json';
    input.id = `input_file${counter}`;
    input.title = 'JSON Array must include alphanumeric [A-Z,a-z,0-9], may be SPACE-separated terms';

    divOverride.addEventListener('click', function (event) {
      input.click();
    })

    input.addEventListener('change', async function(event) {
      // validate inner terms inside file
      const selectedFile = event.target.files[0];
      const fileName = selectedFile.name;
      const validTerms = await validateTermsFile(selectedFile);
      spanFileSelect.innerHTML = `<strong>${fileName}</strong>`;
      spanFileInfo.innerHTML = `<strong>${validTerms.length}</strong> valid`;
      validFileTermsMap.set(event.target.id, validTerms);
    });

    async function validateTermsFile(selectedFile) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const validTerms = [];
        reader.onload = () => {
          const fileContent = JSON.parse(reader.result);
          if (Array.isArray(fileContent)) {
            validTerms
            .push(...fileContent
              .filter(term => typeof term === 'string')
              .map(term => term.replace(/[^\w\s]+|_/g, '').replace(/\s+/g, ' ').toLowerCase().trim())
              .filter(term => term));
          }
          resolve(validTerms);
        }
        reader.onerror = () => {
          resolve(validTerms);
        }
        reader.readAsText(selectedFile);
      });
    }

    divOverride.appendChild(input);
    divOverride.appendChild(spanFileSelect);
    divOverride.appendChild(spanFileInfo);
    form.appendChild(divOverride);
    form.appendChild(submitInput);
  }
  return addFileInput;
}

function addTextInput() {
  const input = document.createElement('input');
  input.type = 'text';
  input.name = 'text-terms[]';
  input.placeholder = 'Enter a new term...';
  input.className = 'text-term';
  input.required = true;
  input.title = 'Must be alphanumeric [A-Z,a-z,0-9], may be SPACE-separated';
  input.addEventListener("input", onInputValidate);
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

function onInputValidate(event) { // alphanumeric \ '_' , spaces in-between
  const inputValue = event.target.value.trim();
  const validPattern = /^[A-Za-z0-9]+(?:\s[A-Za-z0-9]+)*$/;
  if (!validPattern.test(inputValue)) {
    console.log('invalid: ' + inputValue);
    event.target.value = inputValue.replace(/[^\w\s]+|_/g, '').replace(/\s+/g, ' ');
  } 
}