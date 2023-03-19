// import JSON or path, to operate with files from this data access object
import fs from 'fs'
const jsonPath = './src/json/terms.json';

export default class TermsDAO {
  static async insertIndexTerms(textTerms, fileTerms) {
    console.log(textTerms);
    let finalTerms = [] // main JSON data file is always overwritten by this
    let accumulatedTerms = [];
    if (textTerms) {
      accumulatedTerms.push(...textTerms);
    }
    // textTerms = textTerms.map(term => term.trim().toLowerCase()).filter(term => term);
    
    if (fileTerms) {
      accumulatedTerms.push(...fileTerms.reduce((acum, fileObj) => {
        let jsonTermArray;
        try {
          jsonTermArray = JSON.parse(fs.readFileSync(fileObj.path));
        }
        catch(e) {
          return acum;
        }
        // if (!Array.isArray(jsonTermArray)) return acum;
        // jsonTermArray = jsonTermArray
        // .filter(term => typeof term == 'string' && term)
        // .map(term => term.trim().toLowerCase())
        // .filter(term => term);
        acum.push(...jsonTermArray);
        return acum;
      }, []));
    }

    // add all the terms to the Set, that makes all them unique
    finalTerms = [...new Set([...accumulatedTerms])];
    fs.writeFile(jsonPath, JSON.stringify(finalTerms), (err) => {
      if (err) {
        console.log(err);
      }
    });
  }

  static async getAllIndexTermsJSON() {
    return JSON.parse(fs.readFileSync(jsonPath));
  }
}