public async dublicateProductToSelectStores(): Promise<any> {
    console.log("START Dublicate Product To All Stores");
    console.log(new Date());

    const GENERAL: Store = await this.repository.findOne({
      where: { id: 20389 },
      relations: {
        products: { variants: true, categories: true },
        additionalProducts: true,
      },
    });

    console.log(GENERAL);

    const stores: Store[] = await Store.findBy({
      id: In([3551, 20390, 20395, 20391, 11252, 20396, 20392, 12919]),
    });

    for (let j = 0; j < stores.length; j++) {
      const ADDITIONAL_ID: { originalId: number; newId: number }[] = [];

      for (let l = 0; l < GENERAL.additionalProducts.length; l++) {
        const additional: AdditionalProduct = GENERAL.additionalProducts[l];

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
        }).save();

        ADDITIONAL_ID.push({
          originalId: additional.id,
          newId: newAdditional.id,
        });
      }
      console.log(
        "FINISH DUBLICATE ALL ADDITIONAL PRODUCTS TO STORE",
        stores[j].name
      );

      for (let idx = 0; idx < GENERAL.products.length; idx++) {
        let seo: Seo | null = null;
        if (GENERAL.products[idx].seoId) {
          const findSeo = await Seo.findOne({
            where: { id: GENERAL.products[idx].seoId },
          });
          seo = await Seo.create({
            h1: findSeo.h1,
            title: findSeo.title,
            keywords: findSeo.keywords,
            description: findSeo.description,
          }).save();
        }

        const newProduct = await Product.create({
          storeId: stores[j].id,
          seoId: seo ? seo.id : null,
          name: GENERAL.products[idx].name,
          pictures: GENERAL.products[idx].pictures,
          keywords: [],
          inStock: GENERAL.products[idx].inStock,
          deliverToday: GENERAL.products[idx].deliverToday,
          recommended: Math.random() < 0.5,
          comercialPurpose: false,
          description: GENERAL.products[idx].description,
        }).save();

        for (let k = 0; k < GENERAL.products[idx].variants.length; k++) {
          const variant = GENERAL.products[idx].variants[k];

          await Variant.create({
            productId: newProduct.id,
            price: variant.price,
            discountPrice: variant.discountPrice,
            realPrice: variant.price,
            realDiscountPrice: variant.discountPrice,
          }).save();
        }

        const PRODUCT = await Product.findOne({
          where: { id: GENERAL.products[idx].id },
          relations: { additionalProducts: true },
        });

        GENERAL.products[idx].additionalProducts = PRODUCT.additionalProducts;
        for (
          let l = 0;
          l < GENERAL.products[idx].additionalProducts.length;
          l++
        ) {
          const result = await Product.createQueryBuilder("product")
            .relation(Product, "additionalProducts")
            .of(newProduct.id)
            .add(
              ADDITIONAL_ID.find(
                (elem) =>
                  elem.originalId ===
                  GENERAL.products[idx].additionalProducts[l].id
              ).newId
            )
            .catch(() => null);

          if (result === null) {
            console.log(result);
          }
        }

        for (let l = 0; l < GENERAL.products[idx].categories.length; l++) {
          const result = await Product.createQueryBuilder("product")
            .relation(Product, "categories")
            .of(newProduct.id)
            .add(GENERAL.products[idx].categories[l].id)
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