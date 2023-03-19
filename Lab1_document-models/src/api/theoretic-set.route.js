import express from "express"
import Controller from "../api/Controller.js"
import multer from "multer"

const termsStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './src/json/uploads/terms/');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const documentsStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './src/json/uploads/documents/');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const jsonTermsUpload = multer({ storage: termsStorage});
const jsonDocumentsUpload = multer({ storage: documentsStorage});

const ts_router = express.Router();

ts_router.route('/terms/new').post(jsonTermsUpload.fields([{name: 'file-terms[]'}, {name: 'text-terms[]'}]), Controller.apiCreateIndexTerms);

ts_router.route('/terms').get(Controller.apiGetAllTerms)

ts_router.route('/documents/new').post(jsonDocumentsUpload.fields([{name: 'file-documents[]'}, {name: 'text-documents[]'}]), Controller.apiCreateDocuments);

ts_router.route('/search').get(Controller.apiTsSearchDocuments);



export default ts_router;