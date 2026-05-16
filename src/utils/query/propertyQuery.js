const AppError = require('../AppError');

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toPositiveInt = (value, fallback, max) => {
  const parsed = Number.parseInt(value, 10);
  const safeValue = Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  return Math.min(safeValue, max);
};

const toFiniteNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const pruneInvalidNumbers = (query, numericFields) => {
  numericFields.forEach((field) => {
    if (query[field] === undefined) {
      return;
    }

    if (typeof query[field] === 'object' && query[field] !== null && !Array.isArray(query[field])) {
      Object.keys(query[field]).forEach((operator) => {
        const parsed = toFiniteNumber(query[field][operator]);

        if (parsed === undefined) {
          delete query[field][operator];
        } else {
          query[field][operator] = parsed;
        }
      });

      if (Object.keys(query[field]).length === 0) {
        delete query[field];
      }

      return;
    }

    const parsed = toFiniteNumber(query[field]);

    if (parsed === undefined) {
      delete query[field];
    } else {
      query[field] = parsed;
    }
  });
};

class PropertySearch {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString || {};
    this.pipeline = [];
    this.baseFilter = query.getQuery();
    this.pagination = {
      limit: toPositiveInt(this.queryString.limit, 12, 50),
      sort: this.queryString.sort || '-createdAt',
      sortField: (this.queryString.sort || '-createdAt').split(',')[0].replace('-', ''),
      hasNextPage: false,
    };
  }

  search() {
    if (this.queryString.search) {
      const keyword = escapeRegex(String(this.queryString.search).trim().slice(0, 80));

      if (keyword) {
        this.query = this.query.find({
          $or: [
            { title: { $regex: keyword, $options: 'i' } },
            { description: { $regex: keyword, $options: 'i' } },
            { 'location.city': { $regex: keyword, $options: 'i' } },
            { 'location.state': { $regex: keyword, $options: 'i' } },
          ],
        });
      }
    }

    if (process.env.DEBUG_QUERIES === 'true') console.log(`search:${this.query}`);
    return this;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excluded = [
      'page',
      'limit',
      'sort',
      'fields',
      'search',
      'cursor',
      'lat',
      'lng',
      'radius',
      'minPrice',
      'maxPrice',
    ];

    excluded.forEach((el) => delete queryObj[el]);

    const minPrice = toFiniteNumber(this.queryString.minPrice);
    const maxPrice = toFiniteNumber(this.queryString.maxPrice);

    if (minPrice !== undefined || maxPrice !== undefined) {
      queryObj.price = {};

      if (minPrice !== undefined) {
        queryObj.price.$gte = minPrice;
      }

      if (maxPrice !== undefined) {
        queryObj.price.$lte = maxPrice;
      }
    }

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(?<!\$)(gt|gte|lt|lte|in)\b/g, (match) => `$${match}`);

    const parsedQuery = JSON.parse(queryStr);
    pruneInvalidNumbers(parsedQuery, ['price', 'bedrooms', 'bathrooms', 'size', 'agentFee']);

    this.query = this.query.find({
      ...parsedQuery,
    });

    if (process.env.DEBUG_QUERIES === 'true') console.log(`filter:${this.query}`);
    return this;
  }

  geoSearch() {
    const lat = toFiniteNumber(this.queryString.lat);
    const lng = toFiniteNumber(this.queryString.lng);
    const radius = toFiniteNumber(this.queryString.radius);

    if (lat !== undefined && lng !== undefined && radius !== undefined && radius > 0) {
      const earthRadius = 6378.1;

      this.query = this.query.find({
        'location.coordinates': {
          $geoWithin: {
            $centerSphere: [[lng, lat], radius / earthRadius],
          },
        },
      });
    }

    if (process.env.DEBUG_QUERIES === 'true') console.log(`geo:${this.query}`);
    return this;
  }

  sort() {
    const sortOption = this.queryString.sort
      ? this.queryString.sort.split(',').join(' ')
      : '-priorityLevel -trendingScore -createdAt';

    this.query = this.query.sort(sortOption);

    if (process.env.DEBUG_QUERIES === 'true') console.log(`sort:${this.query}`);
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }

    if (process.env.DEBUG_QUERIES === 'true') console.log(`limited:${this.query}`);
    return this;
  }

  cursorPaginate() {
    const sort = this.queryString.sort || '-createdAt';
    const sortField = sort.split(',')[0].replace('-', '');
    const isDesc = sort.startsWith('-');

    this.pagination.limit = toPositiveInt(this.queryString.limit, 12, 50);
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
        throw new AppError('Invalid cursor format', 400);
      }
    }

    this.query = this.query.sort(sort).limit(this.pagination.limit + 1);

    if (process.env.DEBUG_QUERIES === 'true') console.log(`cursorPaginate:${this.query}`);
    return this;
  }

  paginate() {
    const page = toPositiveInt(this.queryString.page, 1, Number.MAX_SAFE_INTEGER);
    const limit = toPositiveInt(this.queryString.limit, 12, 50);
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    if (process.env.DEBUG_QUERIES === 'true') console.log(`paginated:${this.query}`);
    return this;
  }

  populate(fields = []) {
    fields.forEach((field) => {
      if (typeof field === 'string') {
        const parts = field.split(' ');
        const path = parts[0];
        const select = parts.slice(1).join(' ');

        this.query = this.query.populate({
          path,
          select,
        });
      } else {
        this.query = this.query.populate(field);
      }
    });

    if (process.env.DEBUG_QUERIES === 'true') console.log(`populate:${this.query}`);
    return this;
  }
}

module.exports = PropertySearch;
