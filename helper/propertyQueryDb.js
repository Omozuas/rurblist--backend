// utils/propertySearch.js

class PropertySearch {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
    this.pipeline = [];
    this.baseFilter = query.getQuery(); // ✅ capture initial filter
    this.pagination = {
      limit: Math.min(parseInt(queryString.limit) || 12, 50),
      sort: queryString.sort || '-createdAt',
      sortField: (queryString.sort || '-createdAt').split(',')[0].replace('-', ''),
      hasNextPage: false,
    };
  }

  /**
   * GLOBAL TEXT SEARCH
   * Supports title, description, city, state
   */
  search() {
    if (this.queryString.search) {
      const keyword = this.queryString.search;

      this.query = this.query.find({
        // ...this.baseFilter,
        $or: [
          { title: { $regex: keyword, $options: 'i' } },
          { description: { $regex: keyword, $options: 'i' } },
          { 'location.city': { $regex: keyword, $options: 'i' } },
          { 'location.state': { $regex: keyword, $options: 'i' } },
        ],
      });
    }
    if (process.env.DEBUG_QUERIES === 'true') console.log(`search:${this.query}`);
    return this;
  }

  /**
   * ADVANCED FILTERING
   * price[gte]=100000
   */
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

    // Handle minPrice / maxPrice
    if (this.queryString.minPrice || this.queryString.maxPrice) {
      queryObj.price = {};

      if (this.queryString.minPrice) {
        queryObj.price.$gte = Number(this.queryString.minPrice);
      }

      if (this.queryString.maxPrice) {
        queryObj.price.$lte = Number(this.queryString.maxPrice);
      }
    }

    let queryStr = JSON.stringify(queryObj);

    // convert gte -> $gte etc
    queryStr = queryStr.replace(/\b(?<!\$)(gt|gte|lt|lte|in)\b/g, (match) => `$${match}`);

    let parsedQuery = JSON.parse(queryStr);

    // numeric fields
    const numericFields = ['price', 'bedrooms', 'bathrooms', 'size', 'agentFee'];

    numericFields.forEach((field) => {
      if (parsedQuery[field]) {
        if (typeof parsedQuery[field] === 'object') {
          Object.keys(parsedQuery[field]).forEach((operator) => {
            parsedQuery[field][operator] = Number(parsedQuery[field][operator]);
          });
        } else {
          parsedQuery[field] = Number(parsedQuery[field]);
        }
      }
    });

    this.query = this.query.find({
      // ...this.baseFilter, // ✅ PRESERVE owner filter
      ...parsedQuery,
    });

    if (process.env.DEBUG_QUERIES === 'true') console.log(`filter:${this.query}`);

    return this;
  }

  /**
   * GEO RADIUS SEARCH
   */
  geoSearch() {
    const { lat, lng, radius } = this.queryString;

    if (lat && lng && radius) {
      const earthRadius = 6378.1; // km

      this.query = this.query.find({
        'location.coordinates': {
          $geoWithin: {
            $centerSphere: [[Number(lng), Number(lat)], Number(radius) / earthRadius],
          },
        },
      });
    }
    if (process.env.DEBUG_QUERIES === 'true') console.log(`geo:${this.query}`);
    return this;
  }

  /**
   * SORTING
   */
  sort() {
    let sortOption = '-createdAt';

    if (this.queryString.sort) {
      sortOption = this.queryString.sort.split(',').join(' ');
    } else {
      // Default: priority first, then trending, then newest
      sortOption = '-priorityLevel -trendingScore -createdAt';
    }

    this.query = this.query.sort(sortOption);
    if (process.env.DEBUG_QUERIES === 'true') console.log(`sort:${this.query}`);
    return this;
  }

  /**
   * FIELD LIMITING
   */
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

  /**
   * CURSOR PAGINATION (FAST)
   */
  cursorPaginate() {
    const sort = this.queryString.sort || '-createdAt';
    const sortField = sort.split(',')[0].replace('-', '');
    const isDesc = sort.startsWith('-');

    this.pagination.limit = Math.min(parseInt(this.queryString.limit) || 12, 50);
    this.pagination.sort = sort;
    this.pagination.sortField = sortField;

    const cursor = this.queryString.cursor;

    if (cursor) {
      try {
        const parsed = JSON.parse(cursor);

        this.query = this.query.find({
          // ...this.baseFilter, // ✅ PRESERVE owner filter
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
      } catch (err) {
        console.error('Invalid cursor:', cursor);
      }
    }

    this.query = this.query.sort(sort).limit(this.pagination.limit + 1);
    if (process.env.DEBUG_QUERIES === 'true') console.log(`cursorPaginate:${this.query}`);
    return this;
  }

  /**
   * PAGE PAGINATION (fallback)
   */
  paginate() {
    const page = parseInt(this.queryString.page) || 1;
    const limit = parseInt(this.queryString.limit) || 12;

    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    if (process.env.DEBUG_QUERIES === 'true') console.log(`paginated:${this.query}`);
    return this;
  }

  /**
   * AUTO POPULATE
   */
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

