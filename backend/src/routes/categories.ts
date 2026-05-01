import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticateToken } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { categorySchema, categoryUpdateSchema } from '../utils/schemas';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller';

const router = Router();
router.use(authenticateToken);
router.get('/', asyncHandler(getCategories));
router.post('/', validateBody(categorySchema), asyncHandler(createCategory));
router.put('/:id', validateBody(categoryUpdateSchema), asyncHandler(updateCategory));
router.delete('/:id', asyncHandler(deleteCategory));

export default router;
