import { Router } from 'express';

import { getCustomRepository } from 'typeorm';
import multer from 'multer';
import TransactionsRepository from '../repositories/TransactionsRepository';
import CreateTransactionService from '../services/CreateTransactionService';
import DeleteTransactionService from '../services/DeleteTransactionService';
import uploadConfig from '../config/upload';
import ImportTransactionsService from '../services/ImportTransactionsService';

const transactionsRouter = Router();
const upload = multer(uploadConfig);

transactionsRouter.get('/', async (request, response) => {
  const transactionsRepository = getCustomRepository(TransactionsRepository);

  const transactionsWithBalance = {
    transactions: await transactionsRepository.find({
      relations: ['category'],
    }),
    balance: await transactionsRepository.getBalance(),
  };

  return response.json(transactionsWithBalance);
});

transactionsRouter.post('/', async (request, response) => {
  const { title, value, category, type } = request.body;
  const createTransaction = new CreateTransactionService();

  const transaction = await createTransaction.execute({
    title,
    value,
    category,
    type,
  });

  return response.status(201).json(transaction);
});

transactionsRouter.delete('/:id', async (request, response) => {
  const { id } = request.params;
  const deleteTransaction = new DeleteTransactionService();

  await deleteTransaction.execute({ id });

  return response.status(204).send();
});

transactionsRouter.post(
  '/import',
  upload.single('file'),
  async (request, response) => {
    const importTrasactions = new ImportTransactionsService();
    const importedTransactions = await importTrasactions.execute({
      filename: request.file.filename,
    });

    return response.json(importedTransactions);
  },
);

export default transactionsRouter;
