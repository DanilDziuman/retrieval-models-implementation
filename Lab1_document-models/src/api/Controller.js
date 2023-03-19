import TermsDAO from "../dao/termsDAO.js"
import DocumentsDAO from "../dao/documentsDAO.js"

function getActiveDocumentsLocation(referer) {
  const refererEndpoint = (new URL(referer)).pathname;
  let documentsFolderPath;
  let redirectionEndpoint;
  if (refererEndpoint.includes('theoretic-set')) {
    documentsFolderPath = './src/json/ts_documents.json';
    redirectionEndpoint = '/theoretic-set/search';
  } else {
    documentsFolderPath = './src/json/vs_documents.json';
    redirectionEndpoint = '/vector-space/search';
  }
  return [documentsFolderPath, redirectionEndpoint];
}

export default class Controller {
  static async apiCreateIndexTerms(req, res, next) { 
    try { // 2 steps for DAO: 1) merge all textual terms, 2) merge all json files from multer()
      const textTerms = req.body['text-terms'];
      const fileTerms = req.files['file-terms[]']; // file objects, use 'path' to get full path
      console.log(req.body);
      console.log(req.files);
      console.log(textTerms);
      console.log(fileTerms);
      await TermsDAO.insertIndexTerms(textTerms, fileTerms);
      res.redirect('/theoretic-set/documents');
    } catch(e) {
      console.log(`api error: ${e}`);
      res.status(500).json({
        error: e
      });
    }
  }

  static async apiGetAllTerms(req, res, next) {
    try {
      const terms = await TermsDAO.getAllIndexTermsJSON();
      res.json(terms);
    } catch(e) {
      console.log(`api error: ${e}`);
      res.status(500).json({
        error: e
      });
    }
  }
  
  static async apiCreateDocuments(req, res, next) {
    try {
      const textDocuments = req.body['text-documents'];
      const fileDocuments = req.files['file-documents[]']; // file objects, use 'path' to get full path
      const referer = req.get('Referer');
      let [documentsFolderPath, redirectionEndpoint] = getActiveDocumentsLocation(referer);
      await DocumentsDAO.insertDocuments(textDocuments, fileDocuments, documentsFolderPath);
      console.log('after insert');
      res.redirect(redirectionEndpoint);
    } catch(e) {
      console.log(`api, ${e}`);
      res.status(500).json({
        error: e
      });
    }
  }

  static async apiTsSearchDocuments(req, res, next) {
    try {
      const referer = req.get('Referer');
      let [documentsFolderPath, redirectionEndpoint] = getActiveDocumentsLocation(referer);
      const searchMode = req.query.mode; // 1 of 2 possible forms
      const searchQuery = req.query.query;
      console.log('before find');
      const foundData = await DocumentsDAO.findTsDocuments(searchQuery, searchMode, documentsFolderPath); // check out later (why taking path from referer HERE?)
      console.log('after find');
      res.json(foundData);
    } catch(e) {
      console.log(`api, ${e}`);
      res.status(500).json({
        error: e
      });
    }
  }

  static async apiVsSearchDocuments(req, res, net) {
    try {
      const searchQuery = req.query.query;
      console.log('before find (vector-space)');
      const [found, foundSimilarity] = await DocumentsDAO.findVsDocuments(searchQuery, './src/json/vs_documents.json');
      console.log('after find (vector-space)');
      const response = {
        foundDocuments: found,
        foundSimilarity: foundSimilarity
      };
      res.json(response);
    } catch(e) {
      console.log(`api, ${e}`);
      res.status(500).json({
        error: e
      });
    }
  }
}