import { getRepository, getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    category,
    title,
    type,
    value,
  }: Request): Promise<Transaction> {
    const categoriesRepository = getRepository(Category);
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const { total } = await transactionsRepository.getBalance();

    if (type === 'outcome' && value > total) {
      throw new AppError('Insufficient funds');
    }

    let accessCategory = await categoriesRepository.findOne({
      where: { title: category },
    });

    if (!accessCategory) {
      const newCategory = categoriesRepository.create({
        title: category,
      });

      accessCategory = newCategory;
      await categoriesRepository.save(newCategory);
    }

    const transaction = transactionsRepository.create({
      title,
      type,
      value,
      category_id: accessCategory.id,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
