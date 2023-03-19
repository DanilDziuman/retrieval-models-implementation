// import JSON or path, to operate with files from this data access object
import fs from 'fs'
const nonTermTokens = new Set(['OR', 'AND', 'NOT', '(', ')']); // from theoretic-set
let initialTermsVector = []; // vs, defines the dimensions of weightMap vectors
const weightMapPath = './src/json/documentsWeightMap.json';
const similarityBottomLimit = 0.2;

export default class DocumentsDAO {
  static async insertDocuments(textDocuments, fileDocuments, jsonPath) {
    let finalDocuments = [] // main JSON data file is always overwritten by this

    if (textDocuments) {
      console.log('in textDocuments "if"');
      finalDocuments.push(...textDocuments);
    }
    
    if (fileDocuments) {
      console.log("in fileDocuments 'if'");
      fileDocuments
      .map(file => {
        try {
          let document = JSON.parse(fs.readFileSync(file.path));
          return document.trim(); 
        } catch(e) {
          console.log(e);
          return file;
        }
      })
      .forEach(document => {
        finalDocuments.push(document);
      });
    }

    // new documents may not be unique + appending all documents (to save state between pages)
    let currentDocuments = JSON.parse(fs.readFileSync(jsonPath));
    currentDocuments.push(...finalDocuments);
    console.log("jsonPath: ");
    console.log(jsonPath);
    console.log(jsonPath.includes('vs_documents.json'));
    if (jsonPath.includes('vs_documents.json')) {
      await this.updateVectorSpace(currentDocuments);
    }
    fs.writeFile(jsonPath, JSON.stringify(currentDocuments, null, 2), (err) => {
      if (err) throw err;
    });
  }
  
  // Theoretic-set methods:
  static async findTsDocuments(searchQuery, mode, jsonPath) { 
    let allDocuments = JSON.parse(fs.readFileSync(jsonPath));
    let found = [];
    if (!searchQuery) return found;
    const tokens = this.parseTokens(searchQuery);
    console.log('tokens before searching:');
    console.log(tokens);
    let termsDocumentsMap;
    if (mode == 'conjunctive') {
      let openedDisjunctions = this.distributeNormalFormParts(tokens, 'AND', 'OR');
      openedDisjunctions = this.mapTermsWithDocuments(openedDisjunctions, allDocuments);
      found = this.resolveNormalForm(openedDisjunctions, intersect, unionWithDuplicates);
    } else {
      let openedConjunctions = this.distributeNormalFormParts(tokens, 'OR', 'AND');
      openedConjunctions = this.mapTermsWithDocuments(openedConjunctions, allDocuments);
      console.log(openedConjunctions);
      found = this.resolveNormalForm(openedConjunctions, unionWithDuplicates, intersect);
      // work with disjunctive query with terms
    }
    console.log(found);
    return found;
  }
  
  static distributeNormalFormParts(tokens, outerOperator, innerOperator) {
    let negated = false;
    const distributedForm = tokens.reduce((acum, current) => {
      // each term literal will look like object{negated: true, term: 'term1'};
     if (current === outerOperator) { // 'AND' or 'OR'
       acum.push([]);
     } else if (current === 'NOT') {
       negated = true;
     } else if (current === innerOperator) {
      console.log("acum:");
      console.log(acum);
       acum[acum.length - 1].push(current);
       console.log('test acum after .at(-1)');
     } else { // term + '()' case
       acum[acum.length - 1].push({negated: negated, term: current});
       negated = false;
     }
     return acum;
   }, [[]]);
    distributedForm.forEach((clause) => { // open the '(' and ')'
    clause.pop(); 
    clause.shift();
    });
    return distributedForm;
  }
  
  static mapTermsWithDocuments(distributedForm, allDocuments) {
    const termDocumentMap = new Map();
    const normalizedDocuments = this.normalizeDocuments(allDocuments);
    console.log('distributedForm Before mapping:');
    console.log(distributedForm);
    distributedForm = distributedForm.map((clause) => clause.map(token => {
      if (typeof token !== 'object') return token;
      const termKey = JSON.stringify(token);
      if (!termDocumentMap.has(termKey)) {
        termDocumentMap.set(termKey, this.findDocumentSet(token, normalizedDocuments, allDocuments));
      }
      return termDocumentMap.get(termKey);
    }));
    console.log(`distributedFormAfter mapping:`);
    console.log(distributedForm);
    return distributedForm;
  }
  
  static normalizeDocuments(allDocuments) {
    const normalizedDocuments = allDocuments.map(document => {
      return document.toLowerCase().replace(/[^\w]+|_+/g, ' ').trim().split(' ');
    });
    return normalizedDocuments;
  }
  
  static findDocumentSet(token, normalizedDocuments, allDocuments) {
    const normalizedToken = token.term.split(' ');
    if (!token.negated) {
      return allDocuments.filter((document, id) => {
        const booleanResult = this.adjacentContains(normalizedDocuments[id], normalizedToken);
        console.log(booleanResult);
        return booleanResult;
      });
    } else {
      return allDocuments.filter((document, id) => {
        return !this.adjacentContains(normalizedDocuments[id], normalizedToken);
      });
    }
  }
  
  static adjacentContains(normalizedDocument, normalizedToken) {
    let currentCheckingIndex = 0;
    console.log(normalizedDocument);
    console.log(normalizedToken);
    return normalizedDocument.reduce((isContained, documentPart) => {
      console.log('inside reduce()');
      if (documentPart === normalizedToken[currentCheckingIndex]) {
        currentCheckingIndex++;
      } else {
        currentCheckingIndex = 0;
      }
      console.log('normalizedToken value: ', {normalizedToken});
      if (currentCheckingIndex === normalizedToken.length) {
        isContained = true;
      }
      console.log('before returning isCOntained');
      return isContained;
    }, false);
  }
  
  static resolveNormalForm(documentForm, outerMethod, innerMethod) {
    // documentForm levels:
    // 1 level: an array of clauses / a normal form
    // 2 level: a clause like <doc> v <doc> v <doc>. (<doc> corresponds to the matched term's doc set)
    // 3 level: each <doc> is an array like ["what about this!", "he said: - ok", ...]
    console.log('entered resolving method');
    return outerMethod(documentForm.map(clause => {
      console.log('inner clause:');
      console.log(clause); // inner clause
      return innerMethod(clause.filter(token => Array.isArray(token)));
    }));
  }
  
  static parseTokens(searchQuery) {
    let isTermPart = false;
    let fullTerm = '';
    return searchQuery.split(' ').reduce((parsedTokens, currentToken) => {
      if (nonTermTokens.has(currentToken)) {
        if (isTermPart) {
          isTermPart = false;
          parsedTokens.push(fullTerm.trimStart());
          fullTerm = '';
        }
        parsedTokens.push(currentToken);
      } else {
        fullTerm = fullTerm.concat(` ${currentToken}`);
        isTermPart = true;
      }
      return parsedTokens;
    }, []);
  }

  // Vector-space methods:
  static async updateVectorSpace(updatedDocuments) { // is called everytime new document is inserted
    // let currentWeightMap = new Map(Object.entries(JSON.parse(fs.readFileSync(weightMapPath))));
    let currentWeightMap = this.jsonToWeightMap(fs.readFileSync(weightMapPath));
    let updatedWeightMap = new Map();
    // if !currentWeightMap.has(updatedDocuments[=
  // [a, b, c, d, f] // terms
  // [a b b b b, c c c, d]
  //     []
    console.log('before defining normalizedDocuments');
    const normalizedDocuments = this.normalizeDocuments(updatedDocuments); // ["doc1 ..blabla", "doc2"] => [["doc1", "blabla"], ["doc2"]]
    initialTermsVector = normalizedDocuments.reduce((allTerms, innerTerms) => {
      allTerms.push(...innerTerms);
      return allTerms;
    }, []).sort((a, b) => a.localeCompare(b)); // alphabetic-ordered initial vector of terms
    initialTermsVector = [...new Set(initialTermsVector)]; // remove duplicates
    console.log('after defining initialTermsVector');

    updatedDocuments.forEach((document, index) => {
      if (currentWeightMap.has(document) && !updatedWeightMap.has(document)) {
        const currentTermsWeightVector = currentWeightMap.get(document); // map(term1: {tf: ...},...)
        updatedWeightMap.set(document, initialTermsVector.reduce((termsWeightVector, term) => {
          let updatedTermWeightObject = {tf: 0, idf: 0, weight: 0}; // atomic value, one dimension from weight vector
          if (currentTermsWeightVector.has(term)) {
            let currentTermWeightObject = currentTermsWeightVector.get(term);
            updatedTermWeightObject.tf = currentTermWeightObject.tf;
            updatedTermWeightObject.idf = this.computeIDF(normalizedDocuments, term); // = 1
            updatedTermWeightObject.weight = updatedTermWeightObject.tf * updatedTermWeightObject.idf;
          } else {
            updatedTermWeightObject.tf = 0;
            updatedTermWeightObject.idf = this.computeIDF(normalizedDocuments, term);
            updatedTermWeightObject.weight = 0;
          }
          termsWeightVector.set(term, updatedTermWeightObject);
          return termsWeightVector;
        }, new Map()));
      } else if (!currentWeightMap.has(document) && !updatedWeightMap.has(document)) { // new document / modified existing document
        updatedWeightMap.set(document, initialTermsVector.reduce((termsWeightVector, term) => {
          let updatedTermWeightObject = {
            tf: this.computeTF(normalizedDocuments[index], term), // index from the top-most .forEach()
            idf: this.computeIDF(normalizedDocuments, term),
            weight: 0
          };
          updatedTermWeightObject.weight = updatedTermWeightObject.tf * updatedTermWeightObject.idf;
          termsWeightVector.set(term, updatedTermWeightObject);
          return termsWeightVector;
        }, new Map()));
      }
      // duplicate documents do not appear in weight maps and are not being overriden
    });
    console.log(weightMapPath);
    console.log(updatedWeightMap);
    console.log('after "stringify" method: ');
    console.log(this.weightMapToJSON(updatedWeightMap));
    fs.writeFile(weightMapPath, this.weightMapToJSON(updatedWeightMap), (err) => {
      if (err) throw err;
    });
  }

  static async findVsDocuments(searchQuery, jsonPath) {
    let allDocuments = JSON.parse(fs.readFileSync(jsonPath));
    let currentWeightMap = this.jsonToWeightMap(fs.readFileSync(weightMapPath));
    let normalizedQuery = this.normalizeDocuments([searchQuery])[0];
    let queryWeightVector = new Map();
    let found = [];
    let foundSimilarity = {};

    for (let [document, weightVector] of currentWeightMap) {
      if (queryWeightVector.size < weightVector.size) { // initializing 'queryWeightVector'
        for (let [term, weightObject] of weightVector) {
          let queryTermWeightObject = {
            tf: this.computeTF(normalizedQuery, term),
            idf: weightObject.idf,
            weight: 0
          };
          queryTermWeightObject.weight = queryTermWeightObject.tf * queryTermWeightObject.idf;
          queryWeightVector.set(term, queryTermWeightObject);
        }
      }
      // weightVector for document;
      // already initialized queryWeightVector.
      // now it's time to compute cosine similarity between each of document's weightVector and query vector
      const cosineSimilarity = this.computeCosineSimilarity(weightVector, queryWeightVector);
      if (cosineSimilarity >= similarityBottomLimit) {
        found.push(...allDocuments.filter(doc => doc === document)); // taking all duplicates
        foundSimilarity[document] = cosineSimilarity;
      }
    }

    return [found, foundSimilarity];
  }

  static computeTF(normalizedDocument, term) { // normalized = ["term1", "term1", "term2", ...]
    let bareFrequency = normalizedDocument.reduce((freq, currentTerm) => {
      if (currentTerm === term) {
        freq++;
      }
      return freq;
    }, 0);
    let tf = Number((bareFrequency / normalizedDocument.length).toFixed(3));
    return tf;
  }

  static computeIDF(normalizedDocuments, term) {
    // weighting model is TF-IDF     ( here terms are in alphabetical order for each document )
    // "here is my word" (key/document) : map('here': {tf: 0.64, idf: 1, weight: 0.64}, 'is': {tf: 0.62, idf: 1, weight:  0.62}, ...);
    return 1; // ignoring the IDF part (6 variant)
  }

  static computeCosineSimilarity(weightVectorA, weightVectorB) { // method works only in this implemention of VS model
    let dot_product = 0 // скалярний добуток
    let magnitudeA = 0; // довжини
    let magnitudeB = 0;
    for (let [term, weightObjectA] of weightVectorA) {
      let weightObjectB = weightVectorB.get(term);
      dot_product += weightObjectA.weight * weightObjectB.weight;
      magnitudeA += Math.pow(weightObjectA.weight, 2);
      magnitudeB += Math.pow(weightObjectB.weight, 2);
    }
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    const cosineSimilarity = Number((dot_product / (magnitudeA * magnitudeB)).toFixed(3));
    return cosineSimilarity; // the greater (-> 1), the more similar vectors are (the lower theta-angle)
  }

  static jsonToWeightMap(jsonString) { 
    // string -> plain object -> map
    const weightMapObject = JSON.parse(jsonString);
    let weightMap = new Map();
    for (let document in weightMapObject) {
      let weightVector = new Map();
      for (let termKey in weightMapObject[document]) {
        weightVector.set(termKey, weightMapObject[document][termKey]);
      }
      weightMap.set(document, weightVector);
    }
    return weightMap;
  }

  static weightMapToJSON(weightMap) {
    // map -> plain object -> string
    let weightMapObject = {};
    for (let [document, weightVector] of weightMap) {
      let weightVectorObject = {};
      for (let [term, weightObject] of weightVector) {
        weightVectorObject[term] = weightObject;
      }
      weightMapObject[document] = weightVectorObject;
    }
    return JSON.stringify(weightMapObject, null, 2);
  }
}


function intersect(clause) { // AND-clause: [["doc1", "doc2"] AND ["doc2", "doc4"]]
  return clause.reduce((accumulatedDocuments, currentDocuments) => {
    accumulatedDocuments = accumulatedDocuments.filter(document => currentDocuments.includes(document));
    console.log('current intersect acum: ');
    console.log(clause);
    return accumulatedDocuments;
  });
}

function unionWithDuplicates(clause) { // OR-clase: [["doc1", "doc2", "doc2"] OR ["doc2", "doc2", "doc3"]]

  const clauseDocumentsAsObjects = clause.map((documentArray) => {
    return documentArray.reduce((accumulatedDocumentsObject, currentDocument) => {
      if (currentDocument in accumulatedDocumentsObject) {
        accumulatedDocumentsObject[currentDocument]++;
      } else {
        accumulatedDocumentsObject[currentDocument] = 1;
      }
      return accumulatedDocumentsObject;
    }, {});
  });
  console.log('clauseDocumentsAsObjects: ');
  console.log(clauseDocumentsAsObjects);

  const mergedDocumentObject = clauseDocumentsAsObjects.reduce((mergedObject, documentsObject) => {
    for (const [document, counter] of Object.entries(documentsObject)) {
      mergedObject[document] = counter;
    }
    return mergedObject;
  }, {});

  let unitedDocuments = [];
  for (const [document, counter] of Object.entries(mergedDocumentObject)) {
    for (let i = 0; i < counter; i++) {
      unitedDocuments.push(document);
    }
  }
  
  return unitedDocuments;
}
