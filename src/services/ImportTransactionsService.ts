import csvParse from 'csv-parse';
import fs from 'fs';
import path from 'path';
import { getCustomRepository, getRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import uploadConfig from '../config/upload';
import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface Request {
  filename: string;
}

interface TransactionCSV {
  title: string;
  category: string;
  value: number;
  type: 'income' | 'outcome';
}

interface CategoryForInsertion {
  title: string;
}

class ImportTransactionsService {
  async execute({ filename }: Request): Promise<Transaction[]> {
    const csvFilePath = path.join(uploadConfig.directory, filename);
    const validFilePath = await fs.promises.stat(csvFilePath);

    if (!validFilePath) {
      throw new AppError('Failed to upload file.');
    }

    const readCSVStream = fs.createReadStream(csvFilePath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
      columns: ['title', 'type', 'value', 'category'],
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    const transactionsLines: TransactionCSV[] = [];

    parseCSV.on('data', transactionLine => {
      transactionsLines.push(transactionLine);
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    await fs.promises.unlink(csvFilePath);

    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    let categoriesThatAlreadyExist = await categoriesRepository.find();
    const unfilteredCategories = transactionsLines.reduce(
      (accumulator: CategoryForInsertion[], transactionLine) => {
        if (
          !accumulator.find(
            category => category.title === transactionLine.category,
          )
        ) {
          accumulator.push({ title: transactionLine.category });
        }

        return accumulator;
      },
      [],
    );

    const categoriesToInsert = unfilteredCategories.filter(category => {
      const searchCategory = categoriesThatAlreadyExist.find(
        categoryThatExists => categoryThatExists.title === category.title,
      );

      return !searchCategory;
    });

    if (categoriesToInsert.length) {
      const insertedCategories = categoriesRepository.create(
        categoriesToInsert,
      );

      await categoriesRepository.save(insertedCategories);

      categoriesThatAlreadyExist = categoriesThatAlreadyExist.concat(
        insertedCategories,
      );
    }

    const transactionsToInsert = transactionsLines.map(transaction => {
      const { title, type, value, category } = transaction;
      const categoryWithId = categoriesThatAlreadyExist.find(
        categoryThatExists => categoryThatExists.title === category,
      );

      if (!categoryWithId) {
        throw new AppError('Category not found', 404);
      }

      return {
        title,
        type,
        value,
        category_id: categoryWithId.id,
      };
    });

    const insertedTransactions = transactionsRepository.create(
      transactionsToInsert,
    );

    await transactionsRepository.save(insertedTransactions);

    return insertedTransactions;
  }
}

export default ImportTransactionsService;
