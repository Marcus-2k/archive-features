  public async createCallOrderFromMaskyo() {
    let calls = [];
    readFile("./calls.json", (err, value) => {
      console.log(err);

      calls = JSON.parse(value.toString());
    });

    await new Promise((res, rej) => {
      const interval = setTimeout(() => {
        console.log("setTimeout");

        res(undefined);
        clearInterval(interval);
      }, 10000);
    });

    console.log(calls);

    let exist = 0;

    for (let idx = 0; idx < calls.length; idx++) {
      console.log(idx, "/", calls.length);

      const body = calls[idx];

      try {
        const call = await this.repository.findOneBy({ koraId: body._id.$oid });

        if (call) {
          exist = exist + 1;
          continue;
        }

        let user: User | null = null;

        if (body.user !== null) {
          user = await User.findOneBy({ koraId: body.user.$oid });
        }

        const partial: DeepPartial<CallOrder> = {
          userId: user ? user.id : null,
          koraId: body._id.$oid,
          callId: body.id,
          start_call: body.start_call.$date,
          end_call: body.end_call.$date,
          call_duration: body.call_duration,
          cdr_ani: body.cdr_ani,
          cdr_ddi: body.cdr_ddi,
          onetouch: body.onetouch,
          user_phone: body.user_phone,
          user_name: body.user_name,
          cdr_uniqueid: body.cdr_uniqueid,
          call_status: body.call_status,
          description: body.description,
          call_sum: body.call_sum,
          status: body.status,
          mp3: body.mp3,
          customerName: body.customerName,
          deliveryAddress: body.deliveryAddress,
          deliveryDate: body.deliveryDate,
        };

        await this.repository.create(partial).save();
      } catch (error) {
        console.log(error);

        console.log(body);
      }
    }

    console.log("exist", exist);
  }
