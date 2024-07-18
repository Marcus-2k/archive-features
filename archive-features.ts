export class ArchiveFeatures {
  // ==========================

    private async debugSortingProducts(products: Product[]) {
    for (let idx = 0; idx < products.length; idx++) {
      const product = products[idx];

      await product.store.getDeliveryPrices();

      const min_delivery_price: number = product.store.deliveryPrices.reduce(
        (min, item) => (item.price < min ? item.price : min),
        product.store.deliveryPrices[0].price,
      );
      const min_delivery_time: null | number =
        product.store.deliveryPrices.reduce((min: number | null, item) => {
          if (item.estimated_time === null) {
            return min;
          }
          if (min === null) {
            return item.estimated_time.from;
          }
          return item.estimated_time.from < min
            ? item.estimated_time.from
            : min;
        }, null);
      const thirtyDaysAgo: Date = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const is_recent: boolean = product.createdAt >= thirtyDaysAgo;

      console.log(
        "========================================",
        idx + 1,
        "/",
        products.length,
      );
      console.log("        STORE NAME:", product.store.name.en);
      console.log("      PRODUCT NAME:", product.name.en);
      console.log("       RECOMMENDED:", product.recommended);
      console.log("        BESTSELLER:", product.bestseller);
      console.log("       NEW PRODUCT:", is_recent, product.createdAt);
      console.log("            RATING:", product.store.averageRating);
      console.log(" MIN PRODUCT PRICE:", product.minPrice);
      console.log(" MAX PRODUCT PRICE:", product.maxPrice);
      console.log(" MIN DELIVERY TIME:", min_delivery_time);
      console.log("MIN DELIVERY PRICE:", min_delivery_price);
    }
    console.log("========================================");
    console.log("            LENGTH:", products.length);
  }
  
  // ==========================
    public async recalcAverateRatingStore() {
    await new Promise((res, rej) => {
      const interval = setInterval(() => {
        res(undefined);
        clearInterval(interval);
      }, 20);
    });

    console.log("START recalcAverateRatingStore");

    const stores = await this.repository
      .createQueryBuilder("store")
      .leftJoinAndSelect(
        "store.feedbacks",
        "feedback",
        "feedback.approved = true",
      )
      .getMany();

    for (let idx = 0; idx < stores.length; idx++) {
      const store = stores[idx];

      let averageRating: number = 9.8;

      if (store.feedbacks.length > 0) {
        averageRating = Number(
          (
            store.feedbacks.reduce((acc, curr) => acc + curr.rate, 0) /
            store.feedbacks.length
          ).toFixed(1),
        );
      }

      await this.repository.update(
        { id: store.id },
        { averageRating: averageRating },
      );
    }

    console.log("FINISH recalcAverateRatingStore");
  }
  // ==========================
  
  // ==========================
  public async syncOrderEventTypes(): Promise<void> {
    const orders = await this.repository.find({
      where: { hashveId: Not(IsNull()), typeOfEvent: EnumTypeOfEvent.NONE },
    });

    let updatedOrder: number = 0;
    let notUpdatedOrder: number = 0;
    let notFind: number = 0;

    for (let idx = 0; idx < orders.length; idx++) {
      const order = orders[idx];

      const oldOrder = await this.getOrderFromOldServer(order.hashveId);

      if (
        oldOrder &&
        oldOrder.deliveryDetails &&
        oldOrder.deliveryDetails.eventType
      ) {
        let newEventType: EnumTypeOfEvent = EnumTypeOfEvent.NONE;

        const eventType = oldOrder.deliveryDetails.eventType;

        if (eventType === "birthday") {
          newEventType = EnumTypeOfEvent.BIRTHDAY;
        }
        if (eventType === "anniversary") {
          newEventType = EnumTypeOfEvent.ANNIVERSARY;
        }
        if (eventType === "babyWasBorn") {
          newEventType = EnumTypeOfEvent.CHILD_BORN;
        }
        if (eventType === "wedding") {
          newEventType = EnumTypeOfEvent.BRIDAL;
        }
        if (eventType === "mourning") {
          newEventType = EnumTypeOfEvent.BUT;
        }
        if (eventType === "thanks") {
          newEventType = EnumTypeOfEvent.THANK;
        }
        if (eventType === "holiday") {
          newEventType = EnumTypeOfEvent.HOLIDAY;
        }
        if (eventType === "newHouse") {
          newEventType = EnumTypeOfEvent.NEW_HOUSE;
        }
        if (eventType === "newJob") {
          newEventType = EnumTypeOfEvent.NEW_WORK;
        }

        if (newEventType !== EnumTypeOfEvent.NONE) {
          await this.updateOrderById(order.id, { typeOfEvent: newEventType });

          console.log("BEFORE", EnumTypeOfEvent[order.typeOfEvent]);
          console.log("AFTER", EnumTypeOfEvent[newEventType]);

          updatedOrder = updatedOrder + 1;
        } else {
          notUpdatedOrder = notUpdatedOrder + 1;
        }
      } else {
        notFind = notFind + 1;
      }

      console.log("FINISH IDX", idx + 1, "/", orders.length);
    }

    console.log("     UPDATED ORDER", updatedOrder);
    console.log(" NOT UPDATED ORDER", notUpdatedOrder);
    console.log("NOT FIND EVENT TYPE", notFind);
  }

  private async getOrderFromOldServer(orderId: string): Promise<any> {
    return await new Promise((res, rej) => {
      const url = `https://backend.hashve.co.il/api/v1/order/${orderId}`;

      console.log(url);

      const destroy$: Subject<void> = new Subject();

      this.http
        .get(url)
        .pipe(takeUntil(destroy$))
        .subscribe({
          next: (response) => {
            res(response.data);
          },
          error: (error) => {
            res(null);
          },
          complete: () => {
            // console.log("COMPLETE GET ORDER FROM OLD HASHVE");
          },
        });
    });
  }
  // ==========================

  // ==========================
  public async downloadTableAsJSON() {
    await new Promise((res, rej) => {
      const interval = setInterval(() => {
        res(undefined);
        clearInterval(interval);
      }, 20);
    });

    console.log("START TEST");

    const stores = await Store.find({ relations: { seo: true } });
    const categories = await Category.find({ relations: { seo: true } });
    const cities = await City.find({ relations: { seo: true } });
    const products = await Product.find({ relations: { seo: true } });

    writeFile("stores.json", JSON.stringify(stores, null, 2), (result) => {
      console.log(result);
    });
    writeFile(
      "categories.json",
      JSON.stringify(categories, null, 2),
      (result) => {
        console.log(result);
      },
    );
    writeFile("cities.json", JSON.stringify(cities, null, 2), (result) => {
      console.log(result);
    });
    writeFile("products.json", JSON.stringify(products, null, 2), (result) => {
      console.log(result);
    });

    console.log("FINISH TEST");
  }
// ==========================

    
// ==========================
    public async calcMinAndMaxPriceForProduct() {
    const products = await Product.createQueryBuilder("product")
      .innerJoinAndSelect("product.variants", "variant")
      .where("(product.minPrice IS NULL OR product.maxPrice IS NULL)")
      .getMany();

    console.log("products.length", products.length);

    for (let idx = 0; idx < products.length; idx++) {
      const item = products[idx];

      const minPrice: number = this.findMinPrice(item.variants);
      const maxPrice: number = this.findMaxPrice(item.variants);

      await Product.update({ id: item.id }, { minPrice, maxPrice });

      console.log("FINISH IDX", idx, "/", products.length);
    }

    await this.calcMinAndMaxPriceForStore();
  }

  public async calcMinAndMaxPriceForStore() {
    const stores = await Store.createQueryBuilder("store")
      .innerJoinAndSelect("store.deliveryPrices", "deliveryPrice")
      .where(
        "(store.minDeliveryPrice IS NULL OR store.maxDeliveryPrice IS NULL)",
      )
      .getMany();

    console.log("stores.length", stores.length);

    for (let idx = 0; idx < stores.length; idx++) {
      const item = stores[idx];

      const minPrice: number = this.findMinDeliveryPrice(item.deliveryPrices);
      const maxPrice: number = this.findMaxDeliveryPrice(item.deliveryPrices);

      await Store.update(
        { id: item.id },
        { minDeliveryPrice: minPrice, maxDeliveryPrice: maxPrice },
      );

      console.log("FINISH IDX", idx, "/", stores.length);
    }
  }

  public getEffectivePrice(item: Variant) {
    return item.discountPrice !== null ? item.discountPrice : item.price;
  }

  public findMinPrice(items: Variant[]) {
    return items.reduce((min, item) => {
      const effectivePrice = this.getEffectivePrice(item);
      return effectivePrice < min ? effectivePrice : min;
    }, this.getEffectivePrice(items[0]));
  }

  public findMaxPrice(items: Variant[]) {
    return items.reduce((max, item) => {
      const effectivePrice = this.getEffectivePrice(item);
      return effectivePrice > max ? effectivePrice : max;
    }, this.getEffectivePrice(items[0]));
  }

  public findMinDeliveryPrice(items: DeliveryPrice[]) {
    return items.reduce((min, item) => {
      return item.price < min ? item.price : min;
    }, items[0].price);
  }

  public findMaxDeliveryPrice(items: DeliveryPrice[]) {
    return items.reduce((max, item) => {
      return item.price > max ? item.price : max;
    }, items[0].price);
  }
// ==========================
  
// ==========================
  public async clearSeoTable(): Promise<void> {
    const seoList = await Seo.find();

    let deleted: number = 0;

    for (let idx = 0; idx < seoList.length; idx++) {
      const seo = seoList[idx];

      try {
        const result = await Seo.delete({ id: seo.id });

        if (result) {
          deleted = deleted + 1;
        }
      } catch (error) {}

      console.log("DELETE SEO FINISH IDX", idx, "/", seoList.length);
    }

    console.log("DELETED", deleted);

    await this.createSeoForStores();
    await this.createSeoForCategories();
    await this.createSeoForCities();
    await this.createSeoForProducts();
  }

  public async createSeoForStores(): Promise<void> {
    const values = await Store.find({ where: { seoId: IsNull() } });

    console.log("STORES LENGTH WITHOUT SEO", values.length);

    for (let idx = 0; idx < values.length; idx++) {
      const element = values[idx];

      const seo = await Seo.create({
        h1: { en: null, heb: null },
        title: { en: element.name.en, heb: element.name.heb },
        keywords: { en: null, heb: null },
        description: {
          en: element.description.en,
          heb: element.description.heb,
        },
      }).save();

      console.log("STORE FINISH IDX", idx, "/", values.length);

      await Store.update({ id: element.id }, { seoId: seo.id });
    }
  }

  public async createSeoForCategories(): Promise<void> {
    const values = await Category.find({ where: { seoId: IsNull() } });

    for (let idx = 0; idx < values.length; idx++) {
      const element = values[idx];

      const seo = await Seo.create({
        h1: { en: null, heb: null },
        title: { en: element.name.en, heb: element.name.heb },
        keywords: { en: null, heb: null },
        description: {
          en: element.description.en,
          heb: element.description.heb,
        },
      }).save();

      await Category.update({ id: element.id }, { seoId: seo.id });

      console.log("CATEGORY FINISH IDX", idx, "/", values.length);
    }

    console.log("CATEGORIES LENGTH WITHOUT SEO", values.length);
  }

  public async createSeoForCities(): Promise<void> {
    const values = await City.find({ where: { seoId: IsNull() } });

    for (let idx = 0; idx < values.length; idx++) {
      const element = values[idx];

      const seo = await Seo.create({
        h1: { en: null, heb: null },
        title: { en: element.name.en, heb: element.name.heb },
        keywords: { en: null, heb: null },
        description: {
          en: element.description.en,
          heb: element.description.heb,
        },
      }).save();

      await City.update({ id: element.id }, { seoId: seo.id });

      console.log("CITY FINISH IDX", idx, "/", values.length);
    }

    console.log("CITIES LENGTH WITHOUT SEO", values.length);
  }

  public async createSeoForProducts(): Promise<void> {
    const values = await Product.find({ where: { seoId: IsNull() } });

    for (let idx = 0; idx < values.length; idx++) {
      const element = values[idx];

      const seo = await Seo.create({
        h1: { en: null, heb: null },
        title: { en: element.name.en, heb: element.name.heb },
        keywords: { en: null, heb: null },
        description: {
          en: element.description.en,
          heb: element.description.heb,
        },
      }).save();

      await Product.update({ id: element.id }, { seoId: seo.id });

      console.log("PRODUCT FINISH IDX", idx, "/", values.length);
    }

    console.log("PRODUCTS LENGTH WITHOUT SEO", values.length);
  }
// ==========================

// ==========================
  public async downloadDbLikeJson() {
    const products = await Product.find();
    const stores = await Store.find();
    const cities = await City.find();
    const categories = await Category.find();
    const seo = await Seo.find();

    writeFile("products.json", JSON.stringify(products, null, 2), (err) => {
      console.log(err);
    });
    writeFile("stores.json", JSON.stringify(stores, null, 2), (err) => {
      console.log(err);
    });
    writeFile("cities.json", JSON.stringify(cities, null, 2), (err) => {
      console.log(err);
    });
    writeFile("categories.json", JSON.stringify(categories, null, 2), (err) => {
      console.log(err);
    });
    writeFile("seo.json", JSON.stringify(seo, null, 2), (err) => {
      console.log(err);
    });
  }
// ==========================

  public async transferReviewsFromFile(): Promise<void> {
    await new Promise((res, rej) => {
      const interval = setInterval(() => {
        res(undefined);
        clearInterval(interval);
      }, 20);
    });

    const reviews = RATES;
    const stores = STORES;

    for (let idx = 0; idx < stores.length; idx++) {
      const storeHashve = stores[idx];

      for (let k = 0; k < storeHashve.rate.length; k++) {
        const StoreRate = storeHashve.rate[k];

        const rate = reviews.find((item) => item._id.$oid === StoreRate.$oid);

        const storeGeneral = await this.repository
          .createQueryBuilder("store")
          .where("(store.koraId = :id OR store.hashveId = :id)", {
            id: storeHashve._id.$oid,
          })
          .getOne();

        if (storeGeneral) {
          const feedback: DeepPartial<FeedbackStore> = {
            storeId: storeGeneral.id,
            anonymous: false,
            approved: rate.approved ? true : false,
            fullName: rate.fullName,
            rate: rate.rate,
            feedback: rate.feedback,
            status: rate.approved
              ? EnumFeedbackStatus.APPROVE
              : EnumFeedbackStatus.DECLINE,
            createdAt: new Date(rate.createdAt.$date),
            updatedAt: new Date(rate.updatedAt.$date),
          };

          await this.feedbackStoreRepository.create(feedback).save();
        }
      }

      console.log("FINISH STORE IDX", idx, "/", stores.length);
    }
  }
  
  public generateMialWithCoupon() {
      if (query.type_coupon === CouponTypeEnum.DELIVERY) {
      html = this.mailBuilderService.getMailCouponDelivery({
        coupon_code: coupon.couponName,
        customer_name: userName,
      });
    }
    if (query.type_coupon === CouponTypeEnum.FIX_SALE) {
      html = this.mailBuilderService.getMailCouponFixSale({
        coupon_code: coupon.couponName,
        customer_name: userName,
      });
    }
    if (query.type_coupon === CouponTypeEnum.PERCENT_SALE) {
      html = this.mailBuilderService.getMailCouponPercentage({
        coupon_code: coupon.couponName,
        customer_name: userName,
      });
    }
  }
  
  public async testCheckCorrectDublicate(): Promise<void> {
    const stores = await Store.find();

    console.log(stores);

    for (let idx = 0; idx < stores.length; idx++) {
      // console.log(stores[idx]);

      const store = await Store.findOne({
        where: { id: stores[idx].id },
        relations: {
          products: true,
          additionalProducts: true,
        },
      });

      console.log("name:", store.name);
      console.log("products:", store.products.length);
      console.log("additionalProducts:", store.additionalProducts.length);

      console.log(
        "====================================================================================",
        idx
      );
    }
  }

  public async dublicateProductToAllStores(): Promise<void> {
    console.log("START Dublicate Product To All Stores");
    console.log(new Date());

    const STORE_ONE = await Store.findOne({
      where: { id: 11192 },
      relations: {
        products: { variants: true, categories: true },
        additionalProducts: true,
      },
    });

    console.log(STORE_ONE);

    // const result = await Variant.delete({ product: { storeId: Not(11192) } });

    // const products = await Product.createQueryBuilder("product")
    //   .where("product.storeId != :storeId AND product.id IS NOT NULL", {
    //     storeId: 11192,
    //   })
    //   .leftJoinAndSelect("product.variants", "variant")
    //   .getMany();
    // const additionals = await AdditionalProduct.createQueryBuilder("additional")
    //   .where("additional.storeId != :storeId AND additional.id IS NOT NULL", {
    //     storeId: 11192,
    //   })
    //   .getMany();

    // const stores = await Store.findBy({ id: Not(11192) });

    // for (let j = 0; j < stores.length; j++) {
    //   // const products = await Product.find({
    //   //   where: { storeId: stores[j].id },
    //   //   relations: { variants: true },
    //   // });
    //   // console.log("result products", products.length);

    //   // const additionals = await AdditionalProduct.find({
    //   //   where: { storeId: stores[j].id },
    //   // });
    //   // console.log("result additionals", additionals.length);
    //   // for (let idx = 0; idx < additionals.length; idx++) {
    //   //   await AdditionalProduct.delete({ id: additionals[idx].id });
    //   // }

    //   console.log("FINISH STORE IDX", j, "=====================");
    // }

    // console.log("result", additionals.length);

    // ==================================================================================
    const stores = await Store.findBy({ id: Not(11192) });

    for (let j = 0; j < stores.length; j++) {
      const ADDITIONAL_ID: { originalId: number; newId: number }[] = [];

      for (let l = 0; l < STORE_ONE.additionalProducts.length; l++) {
        const additional = STORE_ONE.additionalProducts[l];
        const newAdditional = await AdditionalProduct.create({
          storeId: stores[j].id,
          inStock: additional.inStock,
          comercialPurpose: false,
          name: additional.name,
          pictures: additional.pictures,
          price: additional.price,
          discountPrice: additional.discountPrice,
          description: additional.description,
        } as DeepPartial<AdditionalProduct>).save();

        ADDITIONAL_ID.push({
          originalId: additional.id,
          newId: newAdditional.id,
        });
      }
      console.log(
        "FINISH DUBLICATE ALL ADDITIONAL PRODUCTS TO STORE",
        stores[j].name
      );

      //

      for (let idx = 0; idx < STORE_ONE.products.length; idx++) {
        let seo: Seo | null = null;
        if (STORE_ONE.products[idx].seoId) {
          const findSeo = await Seo.findOne({
            where: { id: STORE_ONE.products[idx].seoId },
          });
          seo = await Seo.create({
            h1: findSeo.h1,
            title: findSeo.title,
            keywords: findSeo.keywords,
            description: findSeo.description,
          } as DeepPartial<Seo>).save();
        }

        const newProduct = await Product.create({
          storeId: stores[j].id,
          seoId: seo ? seo.id : null,
          // variants additionalProducts categories
          name: STORE_ONE.products[idx].name,
          pictures: STORE_ONE.products[idx].pictures,
          keywords: [],
          inStock: STORE_ONE.products[idx].inStock,
          deliverToday: STORE_ONE.products[idx].deliverToday,
          recommended: Math.random() < 0.5,
          comercialPurpose: false,
          description: STORE_ONE.products[idx].description,
        } as DeepPartial<Product>).save();

        for (let k = 0; k < STORE_ONE.products[idx].variants.length; k++) {
          const variant = STORE_ONE.products[idx].variants[k];

          await Variant.create({
            productId: newProduct.id,
            price: variant.price,
            discountPrice: variant.discountPrice,
          }).save();
        }

        const PRODUCT = await Product.findOne({
          where: { id: STORE_ONE.products[idx].id },
          relations: { additionalProducts: true },
        });
        STORE_ONE.products[idx].additionalProducts = PRODUCT.additionalProducts;
        for (
          let l = 0;
          l < STORE_ONE.products[idx].additionalProducts.length;
          l++
        ) {
          const result = await Product.createQueryBuilder("product")
            .relation(Product, "additionalProducts")
            .of(newProduct.id)
            .add(
              ADDITIONAL_ID.find(
                (elem) =>
                  elem.originalId ===
                  STORE_ONE.products[idx].additionalProducts[l].id
              ).newId
            )
            .catch(() => null);

          if (result === null) {
            console.log(result);
          }
        }

        for (let l = 0; l < STORE_ONE.products[idx].categories.length; l++) {
          const result = await Product.createQueryBuilder("product")
            .relation(Product, "categories")
            .of(newProduct.id)
            .add(STORE_ONE.products[idx].categories[l].id)
            .catch(() => null);
          if (result === null) {
            console.log(result);
          }
        }
      }
      console.log("FINISH DUBLICATE ALL PRODUCTS TO STORE", stores[j].name);

      console.log(
        "===================================================================================="
      );
    }

    console.log("FINISH Dublicate Product To All Stores");
    console.log(new Date());
  }

  public async readCsvFileWithProduct(): Promise<void> {
    let idx: number = 0;

    let noFindCount = 0;
    fs.createReadStream("W:/call_center/server/private/products.csv")
      .pipe(csv())
      .on("data", async (row) => {
        console.log(row);
        const pictures: string[] = [
          (row.pictures + ".jpg").replace(/\s+/g, ""),
        ];

        const navigate_links: string[] = row.categories.split(",");

        const query: SelectQueryBuilder<Category> =
          Category.createQueryBuilder("category");

        const categories: Category[] = [];

        for (let i = 0; i < navigate_links.length; i++) {
          const category: Category = await query
            .where("category.navigate_link->>'en' = :navigate_link", {
              navigate_link: navigate_links[i],
            })
            .getOne();
          if (category) {
            categories.push(category);
          } else {
            console.log("NOT FOUND CATEGORY: ", navigate_links[i]);
          }
        }

        if (categories.length !== navigate_links.length) {
          noFindCount += 1;

          console.log(
            "=============================================================="
          );
          console.log(
            "=============================================================="
          );
          console.log(navigate_links);
          console.log(
            "=============================================================="
          );
          console.log(
            "=============================================================="
          );
        }

        const body: DeepPartial<Product> = {
          storeId: null,
          name: { en: row.name_en, heb: row.name_heb },
          pictures: pictures,
          keywords: [],
          categories: categories,
          inStock: true,
          deliverToday: true,
          recommended: false,
          comercialPurpose: true,
          description: { en: row.description_en, heb: row.description_heb },
        };

        const newProduct = await this.repository.create(body).save();
        console.log(newProduct);

        console.log(body);

        if (row.variant_1 !== "NULL") {
          const variant: DeepPartial<Variant> = {
            productId: newProduct.id,
            price: row.variant_1,
            discountPrice: null,
          };
          await Variant.create(variant).save();
        }
        if (row.variant_2 !== "NULL") {
          const variant: DeepPartial<Variant> = {
            productId: newProduct.id,
            price: row.variant_2,
            discountPrice: null,
          };
          await Variant.create(variant).save();
        }
        if (row.variant_3 !== "NULL") {
          const variant: DeepPartial<Variant> = {
            productId: newProduct.id,
            price: row.variant_3,
            discountPrice: null,
          };
          await Variant.create(variant).save();
        }
        if (row.variant_4 !== "NULL") {
          const variant: DeepPartial<Variant> = {
            productId: newProduct.id,
            price: row.variant_4,
            discountPrice: null,
          };
          await Variant.create(variant).save();
        }

        idx += 1;
        console.log("FINISH", idx + 1, "/", 142);
      })
      .on("end", async () => {
        console.log("CSV file successfully processed");
        console.log("noFindCount", noFindCount);
      });
  }
}

  public async clearSelectStore(): Promise<void> {
    console.log("START");

    // 11192 - flower store
    // 20389 - fruit store

    const clearStores: Store[] = await this.repository.find({
      where: { id: Not(In([20389, 11192])) },
    });

    for (let idx = 0; idx < clearStores.length; idx++) {
      const store: Store = await this.repository.findOne({
        where: { id: clearStores[idx].id },
        relations: { products: { variants: true }, additionalProducts: true },
      });

      console.log("DELETE ALL PRODUCTS FROM", store.name);
      for (let i = 0; i < store.products.length; i++) {
        for (
          let index = 0;
          index < store.products[i].variants.length;
          index++
        ) {
          await Variant.delete({ id: store.products[i].variants[index].id });
        }

        await Product.delete({ id: store.products[i].id });
      }

      console.log("DELETE ALL ADDITIONAL PRODUCTS FROM", store.name);
      for (let i = 0; i < store.additionalProducts.length; i++) {
        await AdditionalProduct.delete({ id: store.additionalProducts[i].id });
      }

      console.log("FINISH IDX", idx, "/", clearStores.length);
    }

    console.log("FINISH");
  }

  public async clearMerchandise() {
    const resultProduct = await Product.update(
      { comercialPurpose: true },
      { comercialPurpose: false }
    );

    console.log(resultProduct);

    const resultAdditionalProduct = await AdditionalProduct.update(
      { comercialPurpose: true },
      { comercialPurpose: false }
    );

    console.log(resultAdditionalProduct);

    const products = await Product.find({
      where: { storeId: IsNull() },
      relations: { variants: true },
    });

    console.log("DELETE ALL PRODUCTS FROM MERCHANDISE");
    for (let idx = 0; idx < products.length; idx++) {
      for (let index = 0; index < products[idx].variants.length; index++) {
        await Variant.delete({ id: products[idx].variants[index].id });
      }

      await Product.delete({ id: products[idx].id });
    }

    const additionalProducts = await AdditionalProduct.find({
      where: { storeId: IsNull() },
    });

    console.log("DELETE ALL ADDITIONAL PRODUCTS FROM MERCHANDISE");
    for (let i = 0; i < additionalProducts.length; i++) {
      await AdditionalProduct.delete({ id: additionalProducts[i].id });
    }
  }

  public async dublicateProductToMerchandise(): Promise<void> {
    const stores: Store[] = await this.repository.find({
      where: { id: In([11192]) },
      relations: {
        products: { variants: true, categories: true },
        additionalProducts: true,
      },
    });

    for (let idx = 0; idx < stores.length; idx++) {
      const store = stores[idx];

      for (let i = 0; i < store.products.length; i++) {
        const product: Product = store.products[i];

        let seo: Seo | null = null;
        if (store.seoId) {
          const findSeo = await Seo.findOne({ where: { id: product.seoId } });

          seo = await Seo.create({
            h1: findSeo.h1,
            title: findSeo.title,
            keywords: findSeo.keywords,
            description: findSeo.description,
          }).save();
        }

        const partialProduct: Product = await Product.create({
          storeId: null,
          seoId: seo ? seo.id : null,
          categories: product.categories,
          name: product.name,
          pictures: product.pictures,
          keywords: [],
          inStock: product.inStock,
          deliverToday: product.deliverToday,
          recommended: false,
          comercialPurpose: true,
          description: product.description,
        }).save();

        for (let k = 0; k < product.variants.length; k++) {
          const variant: Variant = product.variants[k];

          await Variant.create({
            productId: partialProduct.id,
            price: variant.price,
            discountPrice: variant.discountPrice,
            realPrice: variant.price,
            realDiscountPrice: variant.discountPrice,
          }).save();
        }
      }

      for (let i = 0; i < store.additionalProducts.length; i++) {
        const additional: AdditionalProduct = store.additionalProducts[i];

        const partialAdditional: AdditionalProduct =
          await AdditionalProduct.create({
            storeId: null,
            inStock: true,
            comercialPurpose: true,
            name: additional.name,
            pictures: additional.pictures,
            price: additional.price,
            discountPrice: additional.discountPrice,
            realPrice: additional.realPrice,
            realDiscountPrice: additional.realDiscountPrice,
            description: additional.description,
          }).save();
      }

      console.log("FINISH", idx);
    }
  }

  public async dublicateProductToAllStores(): Promise<any> {
    console.log("START Dublicate Product To All Stores");
    console.log(new Date());

    const STORE_ONE: Store = await this.repository.findOne({
      where: { id: 11192 },
      relations: {
        products: { variants: true, categories: true },
        additionalProducts: true,
      },
    });

    console.log(STORE_ONE);

    const stores = await Store.findBy({
      id: Not(
        In([
          3551, 20390, 20395, 20391, 11252, 20396, 20392, 20389, 12919, 11192,
        ])
      ),
    });

    for (let j = 0; j < stores.length; j++) {
      const ADDITIONAL_ID: { originalId: number; newId: number }[] = [];

      for (let l = 0; l < STORE_ONE.additionalProducts.length; l++) {
        const additional = STORE_ONE.additionalProducts[l];
        const newAdditional = await AdditionalProduct.create({
          storeId: stores[j].id,
          inStock: additional.inStock,
          comercialPurpose: false,
          name: additional.name,
          pictures: additional.pictures,
          price: additional.price,
          discountPrice: additional.discountPrice,
          realPrice: additional.price,
          realDiscountPrice: additional.discountPrice,
          description: additional.description,
        } as DeepPartial<AdditionalProduct>).save();

        ADDITIONAL_ID.push({
          originalId: additional.id,
          newId: newAdditional.id,
        });
      }
      console.log(
        "FINISH DUBLICATE ALL ADDITIONAL PRODUCTS TO STORE",
        stores[j].name
      );

      for (let idx = 0; idx < STORE_ONE.products.length; idx++) {
        let seo: Seo | null = null;
        if (STORE_ONE.products[idx].seoId) {
          const findSeo = await Seo.findOne({
            where: { id: STORE_ONE.products[idx].seoId },
          });
          seo = await Seo.create({
            h1: findSeo.h1,
            title: findSeo.title,
            keywords: findSeo.keywords,
            description: findSeo.description,
          } as DeepPartial<Seo>).save();
        }

        const newProduct = await Product.create({
          storeId: stores[j].id,
          seoId: seo ? seo.id : null,
          name: STORE_ONE.products[idx].name,
          pictures: STORE_ONE.products[idx].pictures,
          keywords: [],
          inStock: STORE_ONE.products[idx].inStock,
          deliverToday: STORE_ONE.products[idx].deliverToday,
          recommended: Math.random() < 0.5,
          comercialPurpose: false,
          description: STORE_ONE.products[idx].description,
        } as DeepPartial<Product>).save();

        for (let k = 0; k < STORE_ONE.products[idx].variants.length; k++) {
          const variant = STORE_ONE.products[idx].variants[k];

          await Variant.create({
            productId: newProduct.id,
            price: variant.price,
            discountPrice: variant.discountPrice,
            realPrice: variant.price,
            realDiscountPrice: variant.discountPrice,
          }).save();
        }

        const PRODUCT = await Product.findOne({
          where: { id: STORE_ONE.products[idx].id },
          relations: { additionalProducts: true },
        });
        STORE_ONE.products[idx].additionalProducts = PRODUCT.additionalProducts;
        for (
          let l = 0;
          l < STORE_ONE.products[idx].additionalProducts.length;
          l++
        ) {
          const result = await Product.createQueryBuilder("product")
            .relation(Product, "additionalProducts")
            .of(newProduct.id)
            .add(
              ADDITIONAL_ID.find(
                (elem) =>
                  elem.originalId ===
                  STORE_ONE.products[idx].additionalProducts[l].id
              ).newId
            )
            .catch(() => null);

          if (result === null) {
            console.log(result);
          }
        }

        for (let l = 0; l < STORE_ONE.products[idx].categories.length; l++) {
          const result = await Product.createQueryBuilder("product")
            .relation(Product, "categories")
            .of(newProduct.id)
            .add(STORE_ONE.products[idx].categories[l].id)
            .catch(() => null);
          if (result === null) {
            console.log(result);
          }
        }
      }
      console.log("FINISH DUBLICATE ALL PRODUCTS TO STORE", stores[j].name);

      console.log(
        "===================================================================================="
      );
    }

    console.log("FINISH Dublicate Product To All Stores");
    console.log(new Date());
  }
