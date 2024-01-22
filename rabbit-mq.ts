@MessagePattern("KORA_ORDER")
public async createOrderFromKora(
  @Body() body: any,
  @Ctx() context: RmqContext
) {
  const channel = context.getChannelRef();
  const originalMsg = context.getMessage();

  const check: Order | null = await Order.findOneBy({ koraId: body._id });

  if (check) {
    console.log("FIND Order ID: ", body._id);
    return;
  }

  // Customer ====================================================================================================
  if (!body.customer) {
    console.log("Incorrect customer");
    console.log("body = ", body);
    return;
  }

  const customerMobile: string = body.customer.phone.replace(/[^0-9]/g, "");

  let customer: Customer | null = await Customer.findOneBy({
    phone: customerMobile,
  });

  if (customer === null) {
    customer = await Customer.create({
      fullName: body.customer.fullName,
      phone: customerMobile,
      email: body.customer.email,
      birthday: null,
      vip: false,
    }).save();
    console.log("Customer = ", customer);
  }

  // Recipient ====================================================================================================
  const recipientMobile: string =
    "0" + body.recipient.phone.replace(/[^0-9]/g, "");

  let recipient: Recipient | null = null;

  recipient = await Recipient.findOneBy({
    phone: recipientMobile,
  });

  if (recipient === null) {
    recipient = await Recipient.create({
      fullName: body.recipient.fullname,
      phone: recipientMobile,
    }).save();

    console.log("Recipient = ", recipient);
  }

  // City ====================================================================================================
  let city: City | null = null;

  if (body.store !== null && body.store.city !== null) {
    city = await City.findOneBy({
      koraId: body.store.city._id,
    });

    if (city === null) {
      city = await City.create({
        koraId: body.store.city._id,
        seoId: null,
        name: {
          en: body.store.city.name.en,
          heb: body.store.city.name.heb,
        },
        images: [],
        description: { en: null, heb: null },
      }).save();
    }
  }

  if (body.deliveryInformation.deliveryAddress.city._id) {
    city = await City.findOneBy({
      koraId: body.deliveryInformation.deliveryAddress.city._id,
    });

    if (city === null) {
      city = await City.create({
        koraId: body.deliveryInformation.deliveryAddress.city._id,
        seoId: null,
        name: {
          en: body.deliveryInformation.deliveryAddress.city.name.en,
          heb: body.deliveryInformation.deliveryAddress.city.name.heb,
        },
        images: [],
        description: { en: null, heb: null },
      }).save();
    }
  }

  // Address ====================================================================================================
  let address: Address | null = await Address.findOneBy({
    koraId: body.deliveryInformation.deliveryAddress._id,
  });

  if (address === null) {
    let destinationType: number = 0;

    let companyName: string =
      body.deliveryInformation.deliveryAddress.companyName;
    if (typeof companyName === "string" && companyName.length > 0) {
      destinationType = 1;
    } else {
      companyName = null;
      destinationType = 0;
    }

    let address2: string | null = null;
    if (
      typeof body.deliveryInformation.deliveryAddress.address2 === "string" &&
      body.deliveryInformation.deliveryAddress.address2.length > 0
    ) {
      address2 = body.deliveryInformation.deliveryAddress.address2;
    }

    address = await Address.create({
      koraId: body.deliveryInformation.deliveryAddress._id,
      cityId: city.id,
      street: null,
      companyName: companyName,
      destinationType: destinationType,
      address1: body.deliveryInformation.deliveryAddress.address1,
      address2: address2,
    }).save();

    console.log(
      "NEW Address ID: ",
      body.deliveryInformation.deliveryAddress._id
    );
  }

  // Delivery Information ====================================================================================================
  let deliveryInformation: DeliveryInformation | null =
    await DeliveryInformation.findOneBy({
      koraId: body.deliveryInformation._id,
    });

  if (deliveryInformation === null) {
    let deliveryDate: Date | null = null;

    function isValidDate(dateStr: string): boolean {
      const date = new Date(dateStr);
      return !isNaN(date.getTime());
    }

    const validDate: boolean = isValidDate(
      body.deliveryInformation.deliveryDate
    );

    if (validDate) {
      deliveryDate = new Date(body.deliveryInformation.deliveryDate);
    }

    const deliveryPrice: number =
      body.deliveryInformation.deliveryPrice >= 0
        ? body.deliveryInformation.deliveryPrice
        : 0;

    let deliveryType: number = 0;

    if (
      body.deliveryInformation.deliveryType >= 0 &&
      body.deliveryInformation.deliveryType <= 2
    ) {
      deliveryType = body.deliveryInformation.deliveryType;
    }

    deliveryInformation = await DeliveryInformation.create({
      koraId: body.deliveryInformation._id,
      addressId: address.id,
      deliveryDate: deliveryDate,
      deliveryPrice: deliveryPrice,
      deliveryTime: body.deliveryInformation.deliveryTime,
      deliveryType: deliveryType,
    }).save();

    console.log(
      "NEW DeliveryInformation ID: ",
      body.deliveryInformation.deliveryAddress._id
    );
  }

  // Items ====================================================================================================
  const items: Item[] = [];

  for (let idx = 0; idx < body.items.length; idx++) {
    let sourceId: string | null = null;
    if (typeof body.items[idx].sourceId === "string") {
      sourceId = body.items[idx].sourceId;
    }

    let image: string = null;
    if (typeof body.items[idx].image === "string") {
      image = body.items[idx].image;
    }

    const item: Item = Item.create({
      sourceId: sourceId,
      name: body.items[idx].name,
      count: body.items[idx].count,
      price: body.items[idx].price,
      image: image,
      apiUrl: body.items[idx].apiUrl,
    });

    items.push(item);
  }

  // Type of event
  let typeOfEvent: number = 0;
  if (body.typeOfEvent >= 0 && body.typeOfEvent <= 9) {
    typeOfEvent = body.typeOfEvent;
  }

  // Blessing
  let blessing: string = body.blessing;

  // Pictures
  let pictures: string = body.picture;

  // Description
  let description: string = body.orderItemsDescription;

  // Price
  let price: number =
    Number(body.orderPrice) > 0 ? Number(body.orderPrice) : 0;

  // Source
  let source: EnumOrderSource = 0;
  if (body.source >= 0 && body.source <= 3) {
    source = body.source;
  }

  // Domain
  let domain: string = body.domain;

  // Notes
  let notes: string = body.notice;

  // Status
  let status: number = 0;
  if (body.status >= 0 && body.status <= 6) {
    status = body.status;
  }

  // Store
  let store: Store | null = null;
  if (body.store === null) {
    await Store.findOneBy({
      id: 1,
    });
  } else {
    store = await Store.findOneBy({
      koraId: body.store._id,
    });
  }

  if (store === null) {
    if (body.store === null) {
      store = await Store.findOneBy({ id: 1 });

      console.log("Unknown Store = ", store.id);
    } else {
      let cityIdStore: City | null = null;

      if (body.store.city === null) {
        cityIdStore = await City.findOneBy({
          id: 1,
        });

        console.log("Store City ID: ", 1);
      } else {
        cityIdStore = await City.findOneBy({
          koraId: body.store.city._id,
        });
      }

      let lat: number | null = null;
      let lng: number | null = null;
      if (body.store.storeLocation) {
        if (body.store.storeLocation.lat >= 0) {
          lat = body.store.storeLocation.lat;
        }
        if (body.store.storeLocation.lng >= 0) {
          lng = body.store.storeLocation.lng;
        }
      }

      store = await Store.create({
        // id
        koraId: body.store._id,
        // managers categories products additionalProducts
        userId: 4,
        // user
        cityId: cityIdStore.id,
        // city seoId seo
        name: { en: body.store.name.en, heb: body.store.name.heb },
        pictures: body.store.pic,
        mail: body.store.mail,
        tel: body.store.tel,
        mobile: body.store.mobile,
        fax: body.store.fax,
        // workingHours
        address: { en: body.store.address.en, heb: body.store.address.heb },
        storeLocation: { lat: lat, lng: lng },
        averageCheck: 2,
        deliveryType: [EnumDeliveryTypeStore.TODAY_TO_TODAY],
        standardDelivery: null,
        isActive: true,
        crmToken: body.store.crmToken,
        rules: { en: null, heb: null },
        description: { en: null, heb: null },
      }).save();

      console.log("NEW Store = ", store.id);
    }
  } else {
    console.log("FIND Store = ", store.id);
  }

  const order: Order = await Order.create({
    koraId: body._id,
    items: items,
    customerId: customer.id,
    recipientId: recipient.id,
    deliveryInformationId: deliveryInformation.id,
    storeId: store.id,
    status: status,
    typeOfEvent: typeOfEvent,
    blessing: blessing,
    pictures: pictures,
    description: description,
    price: price,
    source: source,
    domain: domain,
    notes: notes,
  }).save();

  console.log("NEW Order = ", order.id);

  return;
  // channel.ack(originalMsg);
}

@MessagePattern("HASHVE_ORDER")
public async createOrderFromHashve(
  @Body() body: any,
  @Ctx() context: RmqContext
) {
  try {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    const check: Order | null = await Order.findOneBy({ hashveId: body._id });

    if (check) {
      console.log("FIND Order ID: ", body._id);
      return;
    }

    if (
      body.deliveryInformation.deliveryAddress.hasOwnProperty("city") ===
      false
    ) {
      console.log("address = ", body);
      return;
    }

    // Customer ====================================================================================================
    if (!body.customer) {
      console.log("Incorrect customer");
      console.log("body = ", body);
      return;
    }

    const customerMobile: string = body.customer.mobile.replace(
      /[^0-9]/g,
      ""
    );

    let customer: Customer | null = await Customer.findOneBy({
      phone: customerMobile,
    });

    if (customer === null) {
      customer = await Customer.create({
        fullName: body.customer.fullName,
        phone: customerMobile,
        email: body.customer.email,
        birthday: null,
        vip: false,
      }).save();
      console.log("Customer = ", customer);
    }

    // Recipient ====================================================================================================
    const recipientMobile: string =
      "0" + body.recipient.mobile.replace(/[^0-9]/g, "");

    let recipient: Recipient | null = null;

    recipient = await Recipient.findOneBy({
      phone: recipientMobile,
    });

    if (recipient === null) {
      recipient = await Recipient.create({
        fullName: body.recipient.fullName,
        phone: recipientMobile,
      }).save();

      console.log("Recipient = ", recipient);
    }

    // City ====================================================================================================
    let city: City | null = null;

    if (body.store !== null && body.store.city !== null) {
      city = await City.findOneBy({
        hashveId: body.store.city._id,
      });

      if (city === null) {
        city = await City.create({
          hashveId: body.store.city._id,
          seoId: null,
          name: {
            en: body.store.city.name.en,
            heb: body.store.city.name.heb,
          },
          images: [],
          description: { en: null, heb: null },
        }).save();
      }
    }

    if (body.deliveryInformation.deliveryAddress.city === null) {
      city = await City.findOneBy({
        id: 1,
      });
    } else {
      if (body.deliveryInformation.deliveryAddress.city._id) {
        city = await City.findOneBy({
          hashveId: body.deliveryInformation.deliveryAddress.city._id,
        });

        if (city === null) {
          city = await City.create({
            hashveId: body.deliveryInformation.deliveryAddress.city._id,
            seoId: null,
            name: {
              en: body.deliveryInformation.deliveryAddress.city.name.en,
              heb: body.deliveryInformation.deliveryAddress.city.name.heb,
            },
            images: [],
            description: { en: null, heb: null },
          }).save();
        }
      }
    }

    // Address ====================================================================================================
    let address: Address | null = await Address.findOneBy({
      hashveId: body.deliveryInformation.deliveryAddress._id,
    });

    if (address === null) {
      let destinationType: number = 0;

      let companyName: string =
        body.deliveryInformation.deliveryAddress.companyName;
      if (typeof companyName === "string" && companyName.length > 0) {
        destinationType = 1;
      } else {
        companyName = null;
        destinationType = 0;
      }

      let address2: string | null = null;
      if (
        typeof body.deliveryInformation.deliveryAddress.address2 ===
          "string" &&
        body.deliveryInformation.deliveryAddress.address2.length > 0
      ) {
        address2 = body.deliveryInformation.deliveryAddress.address2;
      }

      address = await Address.create({
        hashveId: body.deliveryInformation.deliveryAddress._id,
        cityId: city.id,
        street: body.deliveryInformation.deliveryAddress.street,
        companyName: companyName,
        destinationType: destinationType,
        address1: body.deliveryInformation.deliveryAddress.address1,
        address2: address2,
      }).save();

      console.log(
        "NEW Address ID: ",
        body.deliveryInformation.deliveryAddress._id
      );
    }

    // Delivery Information ====================================================================================================
    let deliveryInformation: DeliveryInformation | null =
      await DeliveryInformation.findOneBy({
        hashveId: body.deliveryInformation._id,
      });

    if (deliveryInformation === null) {
      let deliveryDate: Date | null = null;

      function isValidDate(dateStr: string): boolean {
        const date = new Date(dateStr);
        return !isNaN(date.getTime());
      }

      const validDate: boolean = isValidDate(
        body.deliveryInformation.deliveryDate
      );

      if (validDate) {
        deliveryDate = new Date(body.deliveryInformation.deliveryDate);
      }

      const deliveryPrice: number =
        body.deliveryInformation.deliveryPrice >= 0
          ? body.deliveryInformation.deliveryPrice
          : 0;

      let deliveryType: number = 0;

      if (
        body.deliveryInformation.deliveryType >= 0 &&
        body.deliveryInformation.deliveryType <= 2
      ) {
        deliveryType = body.deliveryInformation.deliveryType;
      }

      deliveryInformation = await DeliveryInformation.create({
        hashveId: body.deliveryInformation._id,
        addressId: address.id,
        deliveryDate: deliveryDate,
        deliveryPrice: deliveryPrice,
        deliveryTime: body.deliveryInformation.deliveryTime,
        deliveryType: deliveryType,
      }).save();

      console.log(
        "NEW DeliveryInformation ID: ",
        body.deliveryInformation.deliveryAddress._id
      );
    }

    // Items ====================================================================================================
    const items: Item[] = [];

    for (let idx = 0; idx < body.items.length; idx++) {
      let sourceId: string | null = null;
      if (typeof body.items[idx].sourceId === "string") {
        sourceId = body.items[idx].sourceId;
      }

      let image: string = null;
      if (typeof body.items[idx].image === "string") {
        image = body.items[idx].image;
      }

      const item: Item = Item.create({
        sourceId: sourceId,
        name: body.items[idx].name,
        count: body.items[idx].count,
        price: body.items[idx].price,
        image: image,
        apiUrl: body.items[idx].apiUrl,
      });

      items.push(item);
    }

    // Type of event
    let typeOfEvent: number = 0;
    if (body.typeOfEvent >= 0 && body.typeOfEvent <= 9) {
      typeOfEvent = body.typeOfEvent;
    }

    // Blessing
    let blessing: string = body.blessing;

    // Pictures
    let pictures: string = body.picture;

    // Description
    let description: string = body.orderItemsDescription;

    // Price
    let price: number =
      Number(body.orderPrice) > 0 ? Number(body.orderPrice) : 0;

    // Source
    let source: EnumOrderSource = 0;
    if (body.source >= 0 && body.source <= 3) {
      source = body.source;
    }

    // Domain
    let domain: string = body.domain;

    // Notes
    let notes: string = body.notice;

    // Status
    let status: number = 6;

    // Store
    let store: Store | null = null;
    if (body.store === null) {
      store = await Store.findOneBy({
        id: 1,
      });
    } else {
      store = await Store.findOneBy({
        hashveId: body.store._id,
      });
    }

    if (store === null) {
      if (body.store === null) {
        store = await Store.findOneBy({ id: 1 });

        console.log("Unknown Store = ", store.id);
      } else {
        let cityIdStore: City | null = null;

        if (body.store.city === null) {
          cityIdStore = await City.findOneBy({
            id: 1,
          });

          console.log("Store City ID: ", 1);
        } else {
          cityIdStore = await City.findOneBy({
            hashveId: body.store.city._id,
          });
        }

        let lat: number | null = null;
        let lng: number | null = null;
        if (body.store.storeLocation) {
          if (body.store.storeLocation.lat >= 0) {
            lat = body.store.storeLocation.lat;
          }
          if (body.store.storeLocation.lng >= 0) {
            lng = body.store.storeLocation.lng;
          }
        }

        store = await Store.create({
          // id
          hashveId: body.store._id,
          // managers categories products additionalProducts
          userId: 4,
          // user
          cityId: cityIdStore.id,
          // city seoId seo
          name: { en: body.store.name.en, heb: body.store.name.heb },
          pictures: body.store.pic,
          mail: body.store.mail,
          tel: body.store.tel,
          mobile: body.store.mobile,
          fax: body.store.fax,
          // workingHours
          address: { en: body.store.address.en, heb: body.store.address.heb },
          storeLocation: { lat: lat, lng: lng },
          averageCheck: 2,
          deliveryType: [EnumDeliveryTypeStore.TODAY_TO_TODAY],
          standardDelivery: null,
          isActive: true,
          crmToken: body.store.crmToken,
          rules: { en: null, heb: null },
          description: { en: null, heb: null },
        }).save();

        console.log("NEW Store = ", store.id);
      }
    } else {
      console.log("FIND Store = ", store.id);
    }

    const order: Order = await Order.create({
      hashveId: body._id,
      items: items,
      customerId: customer.id,
      recipientId: recipient.id,
      deliveryInformationId: deliveryInformation.id,
      storeId: store.id,
      peymentId: null,
      status: status,
      typeOfEvent: typeOfEvent,
      blessing: blessing,
      pictures: pictures,
      description: description,
      price: price,
      source: source,
      domain: domain,
      notes: notes,
    }).save();

    console.log("NEW Order = ", order.id);

    return;
    // channel.ack(originalMsg);
  } catch (error) {
    console.log(error);

    console.error("body = ", body);
    return;
  }
}