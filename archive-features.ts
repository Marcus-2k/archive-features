



export class ArchiveFeatures {

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
