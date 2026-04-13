// utils/propertySearch.js

class PropertySearch {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
    this.pipeline = [];
  }

  /**
   * GLOBAL TEXT SEARCH
   * Supports title, description, city, state
   */
  search() {
    if (this.queryString.search) {
      const keyword = this.queryString.search;

      this.query = this.query.find({
        $or: [
          { title: { $regex: keyword, $options: 'i' } },
          { description: { $regex: keyword, $options: 'i' } },
          { 'location.city': { $regex: keyword, $options: 'i' } },
          { 'location.state': { $regex: keyword, $options: 'i' } },
        ],
      });
    }
    console.log(`search:${this.query}`);
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

    this.query = this.query.find(parsedQuery);

    console.log(`filter:${this.query}`);

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
    console.log(`geo:${this.query}`);
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
    console.log(`sort:${this.query}`);
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
    console.log(`limited:${this.query}`);
    return this;
  }

  /**
   * CURSOR PAGINATION (FAST)
   */
  cursorPaginate() {
    const limit = Math.min(parseInt(this.queryString.limit) || 12, 50);

    const sort = this.queryString.sort || '-createdAt';
    const sortField = sort.replace('-', '');
    const isDesc = sort.startsWith('-');

    const cursor = this.queryString.cursor;

    if (cursor) {
      try {
        const parsed = JSON.parse(cursor);

        this.query = this.query.find({
          $or: [
            {
              [sortField]: isDesc ? { $lt: parsed.value } : { $gt: parsed.value },
            },
            {
              [sortField]: parsed.value,
              _id: { $gt: parsed.id },
            },
          ],
        });
      } catch (err) {
        console.error('Invalid cursor:', cursor);
      }
    }

    this.query = this.query.sort(sort).limit(limit);
    console.log(`cursorPaginate:${this.query}`);
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
    console.log(`psgenated:${this.query}`);
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
    console.log(`populate:${this.query}`);
    return this;
  }
}

module.exports = PropertySearch;
