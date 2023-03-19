import express from "express"
import Controller from "../api/Controller.js"
import multer from "multer"

const documentsStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './src/json/uploads/documents/');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});
const jsonDocumentsUpload = multer({ storage: documentsStorage});

const vs_router = express.Router();

vs_router.route('/documents/new').post(jsonDocumentsUpload.fields([{name: 'file-documents[]'}, {name: 'text-documents[]'}]), Controller.apiCreateDocuments);

vs_router.route('/search').get(Controller.apiVsSearchDocuments);

export default vs_router;