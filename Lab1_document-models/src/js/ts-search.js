const searchForm = document.getElementById('ts_search');
const termSelect = document.getElementById('term-select');
const termInput = document.getElementById('search-input');
const radioModeGroup = Array.from(document.getElementsByName('mode'));
const notButton = document.getElementById('logicalNOT');
const andButton = document.getElementById('logicalAND');
const orButton = document.getElementById('logicalOR');
const removeButton = document.getElementById('remove');
const submitButton = document.querySelector('button[type="submit"]');
const listHeading = document.getElementById('searchHeading');
const resultsList = document.getElementById('searchList');
let waitingOperand = true;
let tokens = [];
tokens.toString = function() {
  return this.join(' ');
};

async function initTermOptions() {
  const response = await fetch('/api/theoretic-set/terms', {
    method: "GET"
  });
  const terms = await response.json();
  terms.forEach(term => {
    const termOption = document.createElement('option');
    termOption.value = term;
    termOption.innerHTML = `${term}`;
    termSelect.appendChild(termOption);
  });
}

initTermOptions();

radioModeGroup.forEach(radio => {
  radio.addEventListener('change', (event) => {
    tokens.splice(0, tokens.length);
    updateInputValue('');
    waitingOperand = true;
    termSelect.disabled = false;
  })
})

termSelect.addEventListener('change', (event) => {
  console.log('change triggered');
  if (!waitingOperand) return;
  const selectedTermIndex = event.target.selectedIndex;
  const selectedTerm = event.target.options[selectedTermIndex].value;
  event.target.selectedIndex = 0; 
  if (tokens.at(-1) !== ')') {
    tokens.push('(', `${selectedTerm}`, ')');
  } else {
    tokens.splice(-1, 0, `${selectedTerm}`);
  }
  updateInputValue(tokens.toString());
  waitingOperand = false;
  termSelect.disabled = true;
});

notButton.addEventListener('click', (event) => {
  if (waitingOperand) return;
  if (tokens.at(-3) === 'NOT') {
    tokens.splice(-3, 1);
  } else {
    tokens.splice(-2, 0, 'NOT');
  }
  updateInputValue(tokens.toString());
});

andButton.addEventListener('click', (event) => {
  if (waitingOperand) return;
  const activeMode = radioModeGroup.find(radio => radio.checked).value;
  if (activeMode === 'disjunctive') {
    tokens.splice(-1, 0, 'AND');
  } else { // conjunctive
    tokens.push('AND');
  }
  updateInputValue(tokens.toString());
  waitingOperand = true;
  termSelect.disabled = false;
});

orButton.addEventListener('click', (event) => {
  if (waitingOperand) return;
  const activeMode = radioModeGroup.find(radio => radio.checked).value;
  if (activeMode === 'disjunctive') {
    tokens.push('OR');
  } else { // conjunctive
    tokens.splice(-1, 0, 'OR');
  }
  updateInputValue(tokens.toString());
  waitingOperand = true;
  termSelect.disabled = false;
});

removeButton.addEventListener('click', (event) => {
  if (!termInput.value) return; // empty-case
  if (waitingOperand) {
    if (tokens.at(-1) === ')') { // (...AND )-case
      tokens.splice(-2, 1);
    } else { // (...) AND-case
      tokens.splice(-1, 1);
    }
    waitingOperand = false;
    termSelect.disabled = true;
  } else {
    const lastClauseStart = tokens.lastIndexOf('(') - tokens.length;
    if (lastClauseStart >= -4) { // (term) / (not term)-case
      tokens.splice(lastClauseStart, -lastClauseStart); // (term1 AND <...>) / (term1 AND NOT <...>)-case
    } else {
      tokens.splice(-2, 1);
    }
    if (tokens.at(-2) === 'NOT') {
      tokens.splice(-2, 1);
    }
    waitingOperand = true;
    termSelect.disabled = false;
  }
  updateInputValue(tokens.toString());
});

function updateInputValue(newValue) {
  termInput.value = newValue;
  if (termInput.scrollWidth > termInput.clientWidth) {
    termInput.scrollLeft = termInput.scrollWidth - termInput.clientWidth;
  }
}

searchForm.addEventListener('submit',  async (event) => {
  event.preventDefault();
  if (waitingOperand) {
    alert("Please, input the operand or remove the 'AND'/'OR' operator");
    return;
  }
  const activeMode = radioModeGroup.find(radio => radio.checked).value;
  const query = tokens.toString();
  const res = await fetch(`/api/theoretic-set/search?mode=${activeMode}&query=${query}`, {
    method: "GET"
  });
  const foundDocuments = await res.json();
  listHeading.innerText = `Search results: ${foundDocuments.length} documents found`;
  resultsList.innerHTML = '';
  foundDocuments.forEach((value, index) => {
    const listItem = document.createElement('li');
    listItem.className = 'document-item';
    listItem.innerHTML = `${value}`;
    resultsList.appendChild(listItem);
  });
})