import express from 'express';
// import validateRequest from '../../middlewares/validateRequest';
import ClientController from './client.controller';
// import ClientValidation from './client.validation';

const router = express.Router();

router.get('/', ClientController.GetCounselorClients);

export const ClientRoutes = router;
