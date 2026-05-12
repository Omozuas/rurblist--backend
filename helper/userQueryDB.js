const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class ApiFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
    this.pagination = {
      limit: Math.min(parseInt(queryString.limit) || 20, 100),
      sort: queryString.sort || '-createdAt',
      sortField: (queryString.sort || '-createdAt').split(',')[0].replace('-', ''),
    };
  }

  search(fields = []) {
    if (this.queryString.search && fields.length) {
      const keyword = escapeRegex(String(this.queryString.search).trim().slice(0, 80));

      if (keyword) {
        const searchQuery = fields.map((field) => ({
          [field]: { $regex: keyword, $options: 'i' },
        }));

        this.query = this.query.find({ $or: searchQuery });
      }
    }

    return this;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excluded = ['page', 'limit', 'sort', 'fields', 'search', 'cursor'];

    excluded.forEach((el) => delete queryObj[el]);

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(?<!\$)(gt|gte|lt|lte)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  sort() {
    const sortOption = this.queryString.sort
      ? this.queryString.sort.split(',').join(' ')
      : '-createdAt';

    this.query = this.query.sort(sortOption);
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-password -otp -passwordResetToken -refreshToken -__v');
    }

    return this;
  }

  cursorPaginate() {
    const sort = this.queryString.sort || '-createdAt';
    const sortField = sort.split(',')[0].replace('-', '');
    const isDesc = sort.startsWith('-');

    this.pagination.limit = Math.min(parseInt(this.queryString.limit) || 20, 100);
    this.pagination.sort = sort;
    this.pagination.sortField = sortField;

    if (this.queryString.cursor) {
      try {
        const parsed = JSON.parse(this.queryString.cursor);

        this.query = this.query.find({
          $or: [
            {
              [sortField]: isDesc ? { $lt: parsed.value } : { $gt: parsed.value },
            },
            {
              [sortField]: parsed.value,
              _id: isDesc ? { $lt: parsed.id } : { $gt: parsed.id },
            },
          ],
        });
      } catch {
        const error = new Error('Invalid cursor format');
        error.statusCode = 400;
        throw error;
      }
    }

    this.query = this.query.sort(sort).limit(this.pagination.limit + 1);
    return this;
  }

  populate(fields = []) {
    fields.forEach((field) => {
      this.query = this.query.populate(field);
    });

    return this;
  }
}

module.exports = ApiFeatures;
