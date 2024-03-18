  public async deleteStores(): Promise<any> {
    const ids: number[] = [
      20107, 11292, 12369, 3604, 3544, 20284, 11535, 11799, 11693, 14686, 3995,
      3530, 20239, 11829, 3758, 9431, 13828, 5012, 3829, 20268, 20401, 20402,
      3765, 11175, 20154, 20264,
    ];

    const stores = await this.repository.find({
      where: { id: In(ids) },
      relations: { seo: true, tariff: true, orders: true },
    });

    console.log(stores);

    for (let idx = 0; idx < stores.length; idx++) {
      const store: Store = stores[idx];

      const products = await Product.find({
        where: { storeId: store.id },
        relations: { variants: true },
      });

      const productIds = products.map((item) => item.id);

      await Variant.delete({ productId: In(productIds) });

      await Product.delete({ storeId: store.id });

      await AdditionalProduct.delete({ storeId: store.id });

      await DeliveryPrice.delete({ storeId: store.id });

      await Store.delete({ id: store.id });

      if (store.seoId !== null) {
        await Seo.delete({ id: store.seoId });
      }

      await Tariff.delete({ id: store.tariffId });

      console.log("FINISH IDX", idx + 1, "/", stores.length);
    }
  }

  public async transfterOrdersFromStoreToStore(): Promise<any> {
    const ids: number[] = [
      20107, 11292, 12369, 3604, 3544, 20284, 11535, 11799, 11693, 14686, 3995,
      3530, 20239, 11829, 3758, 9431, 13828, 5012, 3829, 20268, 20401, 20402,
      3765, 11175, 20154, 20264,
    ]; // 26 stores

    const value: { to: number; from: number[] }[] = [
      { to: 20400, from: [20401, 20402] }, // "Milano"
      { to: 1, from: [20239, 11829] }, // "Hashve flowers"
      { to: 1, from: [11799] }, // "Flowernet"
      { to: 1, from: [12369] }, // "Bass Ramat ishai"
      { to: 1, from: [11292] }, // "Ariel"
      { to: 1, from: [3758] }, // "Ifat flowers"
      { to: 3721, from: [20268] }, // "Wonderland"
      { to: 11346, from: [20284, 3544] }, // "Efrat" "efrat flowers"
      { to: 1, from: [3765] }, // "Medabrim Beprachim"
      { to: 1, from: [3829] }, // "Zameret"
      { to: 11391, from: [3995] }, // "hadasa"
      { to: 4155, from: [20107] }, // "Alona flowers"
      { to: 11768, from: [9431] }, // "Ilanit "
      { to: 1, from: [3604] }, // "Donna Roza"
      { to: 11216, from: [11693, 20154] }, // "Flowers LaFlor"
      { to: 11223, from: [5012] }, // "Regalo"
      { to: 1, from: [11535] }, // "Eliya Market"
      { to: 1, from: [3530] }, // "Hakfar Flowers"
      { to: 1, from: [14686, 20264] }, // "flowers tivon"
      { to: 12428, from: [13828] }, // "Luxury Flowers"
      { to: 1, from: [11175] }, // "test"
    ]; // 26 stores

    const stores = await this.repository.find({
      where: { id: In(ids) },
      relations: { seo: true, tariff: true, orders: true },
    });

    console.log(stores);

    for (let idx = 0; idx < stores.length; idx++) {
      const store = stores[idx];

      console.log("Length orders:", store.orders.length, "NAME:", store.name);
    }

    for (let idx = 0; idx < value.length; idx++) {
      const item = value[idx];
      await Order.update({ storeId: In(item.from) }, { storeId: item.to });
    }
  }
