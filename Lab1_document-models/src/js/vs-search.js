const searchForm = document.getElementById('vs_search');
const queryInput = document.getElementById('searchInput');
const searchHeading = document.getElementById('searchHeading');
const searchList = document.getElementById('searchList');

searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  let res = await fetch(`/api/vector-space/search?${queryInput.name}=${queryInput.value}`, {
    method: "GET"
  });
  const foundData = await res.json();
  searchHeading.innerHTML = `Search results (similarity >= 0.2): <strong>${foundData.foundDocuments.length}</strong>`;
  searchList.innerHTML = '';
  foundData.foundDocuments.sort((a, b) => foundData.foundSimilarity[b] - foundData.foundSimilarity[a]);
  foundData.foundDocuments.forEach((doc) => {
    const listItem = document.createElement('li');
    let docSimilarity = foundData.foundSimilarity[doc];
    listItem.innerHTML = `${doc} [[Similarity = ${docSimilarity} = ${(docSimilarity * 100).toFixed(1)}%]]`;
    searchList.appendChild(listItem);
  });
  // const foundDocumentsInfo = res.json(); // a JS object?
});