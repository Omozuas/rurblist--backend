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
          { title: { $regex: keyword, $options: "i" } },
          { description: { $regex: keyword, $options: "i" } },
          { "location.city": { $regex: keyword, $options: "i" } },
          { "location.state": { $regex: keyword, $options: "i" } }
        ]
      });
    }

    return this;
  }

  /**
   * ADVANCED FILTERING
   * price[gte]=100000
   */
  filter() {
    const queryObj = { ...this.queryString };

    const excluded = [
      "page",
      "limit",
      "sort",
      "fields",
      "search",
      "cursor",
      "lat",
      "lng",
      "radius"
    ];

    excluded.forEach((el) => delete queryObj[el]);

    let queryStr = JSON.stringify(queryObj);

    queryStr = queryStr.replace(
      /\b(gt|gte|lt|lte|in)\b/g,
      (match) => `$${match}`
    );

    this.query = this.query.find(JSON.parse(queryStr));

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
        "location.coordinates": {
          $geoWithin: {
            $centerSphere: [
              [Number(lng), Number(lat)],
              Number(radius) / earthRadius
            ]
          }
        }
      });
    }

    return this;
  }

  /**
   * SORTING
   */
  sort() {
    let sortOption = "-createdAt";

    if (this.queryString.sort) {
      sortOption = this.queryString.sort.split(",").join(" ");
    } else {
      // Default: priority first, then trending, then newest
      sortOption = "-priorityLevel -trendingScore -createdAt";
    }

    this.query = this.query.sort(sortOption);

    return this;
  }

  /**
   * FIELD LIMITING
   */
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    }

    return this;
  }

  /**
   * CURSOR PAGINATION (FAST)
   */
  cursorPaginate() {
    const limit = parseInt(this.queryString.limit) || 12;

    if (this.queryString.cursor) {
      this.query = this.query.find({
        _id: { $gt: this.queryString.cursor }
      });
    }

    this.query = this.query.limit(limit);

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

    return this;
  }

  /**
   * AUTO POPULATE
   */
  populate(fields = []) {
    fields.forEach((field) => {
      this.query = this.query.populate(field);
    });

    return this;
  }
}

module.exports = PropertySearch;