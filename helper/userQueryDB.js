class ApiFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  /**
   * GLOBAL SEARCH
   * Works with multiple fields
   */
  search(fields = []) {
    if (this.queryString.search && fields.length) {
      const keyword = this.queryString.search;

      const searchQuery = fields.map((field) => ({
        [field]: { $regex: keyword, $options: "i" }
      }));

      this.query = this.query.find({ $or: searchQuery });
    }

    return this;
  }

  /**
   * ADVANCED FILTERING
   * Supports gte, lte, gt, lt
   */
  filter() {
    const queryObj = { ...this.queryString };

    const excluded = ["page", "limit", "sort", "fields", "search", "cursor"];

    excluded.forEach((el) => delete queryObj[el]);

    let queryStr = JSON.stringify(queryObj);

    queryStr = queryStr.replace(
      /\b(gt|gte|lt|lte)\b/g,
      (match) => `$${match}`
    );

    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  /**
   * SORTING
   */
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(",").join(" ");
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort("-createdAt");
    }

    return this;
  }

  /**
   * FIELD LIMITING
   */
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select(
        "-password -otp -passwordResetToken -__v"
      );
    }

    return this;
  }

  /**
   * CURSOR PAGINATION (FAST)
   */
  cursorPaginate() {
    const limit = parseInt(this.queryString.limit) || 10;

    if (this.queryString.cursor) {
      this.query = this.query.find({
        _id: { $gt: this.queryString.cursor }
      });
    }

    this.query = this.query.limit(limit);

    this.pagination = { limit };

    return this;
  }

  /**
   * AUTO POPULATION
   */
  populate(fields = []) {
    fields.forEach((field) => {
      this.query = this.query.populate(field);
    });

    return this;
  }
}

module.exports = ApiFeatures;