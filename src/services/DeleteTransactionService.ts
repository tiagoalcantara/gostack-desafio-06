import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  id: string;
}

class DeleteTransactionService {
  public async execute({ id }: Request): Promise<void> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const transactionToDelete = await transactionsRepository.findOne(id);

    if (!transactionToDelete) {
      throw new AppError('Transaction not found', 404);
    }

    await transactionsRepository.remove(transactionToDelete);
  }
}

export default DeleteTransactionService;
